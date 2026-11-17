// API phía người chơi: đăng ký (CN-10), kiểm tra mã (CN-11), gửi điểm (CN-12).
'use strict';

const crypto = require('node:crypto');
const db = require('./db');
const { kiemTraDangKy, kiemTraDiem } = require('./kiem-tra');
const { LoiHttp, docJson, json, ipCua, taoGioiHan } = require('./tien-ich');

const gioiHanDangKy = taoGioiHan(10, 60_000);
const bam = (ma) => crypto.createHash('sha256').update(ma).digest('hex');

function maTuHeader(req) {
  const h = req.headers.authorization || '';
  const m = /^Bearer\s+([A-Za-z0-9_-]{20,100})$/.exec(h);
  return m ? m[1] : null;
}

async function dangKy(req, res) {
  const ip = ipCua(req);
  if (gioiHanDangKy.vuot(ip)) return json(res, 429, { loiChung: 'Bạn gửi quá nhiều lần, thử lại sau 1 phút' });
  gioiHanDangKy.ghi(ip);

  const { duLieu, loi } = kiemTraDangKy(await docJson(req));
  if (Object.keys(loi).length) return json(res, 400, { loi });

  const ma = crypto.randomBytes(24).toString('base64url');
  try {
    await db.query(
      `INSERT INTO nguoi_choi (ho_ten, email, so_dien_thoai, dong_y, ma_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [duLieu.hoTen, duLieu.email, duLieu.soDienThoai, true, bam(ma)],
    );
  } catch (err) {
    if (err.code === '23505') {                    // vi phạm ràng buộc duy nhất
      const loiTrung = {};
      if (err.constraint === 'nguoi_choi_email_key') loiTrung.email = 'Email này đã được đăng ký';
      else if (err.constraint === 'nguoi_choi_sdt_key') loiTrung.soDienThoai = 'Số điện thoại này đã được đăng ký';
      else throw err;
      return json(res, 409, { loi: loiTrung });
    }
    throw err;
  }
  console.log(`[dang-ky] người chơi mới: ${duLieu.email}`);
  return json(res, 201, { ma, hoTen: duLieu.hoTen });
}

async function toi(req, res) {
  const ma = maTuHeader(req);
  if (!ma) return json(res, 401, { loiChung: 'Chưa đăng ký' });
  const { rows } = await db.query(
    'SELECT ho_ten, diem_cao_nhat FROM nguoi_choi WHERE ma_hash = $1', [bam(ma)]);
  if (!rows.length) return json(res, 401, { loiChung: 'Người chơi không còn tồn tại' });
  return json(res, 200, { hoTen: rows[0].ho_ten, diemCaoNhat: rows[0].diem_cao_nhat });
}

async function guiDiem(req, res) {
  const ma = maTuHeader(req);
  if (!ma) return json(res, 401, { loiChung: 'Chưa đăng ký' });
  const body = await docJson(req);
  if (!kiemTraDiem(body.diem)) throw new LoiHttp(400, 'Điểm không hợp lệ');
  const { rows } = await db.query(
    `UPDATE nguoi_choi
        SET diem_cao_nhat = GREATEST(diem_cao_nhat, $2),
            so_luot = so_luot + 1,
            lan_choi_cuoi = now()
      WHERE ma_hash = $1
      RETURNING diem_cao_nhat, so_luot`,
    [bam(ma), body.diem],
  );
  if (!rows.length) return json(res, 401, { loiChung: 'Người chơi không còn tồn tại' });
  return json(res, 200, { diemCaoNhat: rows[0].diem_cao_nhat, soLuot: rows[0].so_luot });
}

module.exports = { dangKy, toi, guiDiem };
