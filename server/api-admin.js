// API trang admin
// v1.1: đăng nhập (CN-13), xem & tìm (CN-14), xoá (CN-15), xuất CSV (CN-16)
// v1.2: nhiều tài khoản admin, đổi mật khẩu, sắp xếp theo cột, xoá nhiều (CN-17 → CN-20)
'use strict';

const crypto = require('node:crypto');
const db = require('./db');
const qt = require('./quan-tri');
const { LoiHttp, docJson, json, docCookie, ipCua, taoGioiHan } = require('./tien-ich');

const TEN_COOKIE = 'dc_admin';
const THOI_HAN_PHIEN = 8 * 60 * 60 * 1000; // 8 giờ
const phien = new Map();                     // mã phiên → { id, hetHan }
const gioiHanSai = taoGioiHan(5, 60_000);

/* ---------- Phiên ---------- */
/** Trả về tài khoản đang đăng nhập (đã kiểm tra còn trong DB) hoặc null. */
async function adminHienTai(req) {
  const ma = docCookie(req, TEN_COOKIE);
  if (!ma) return null;
  const p = phien.get(ma);
  if (!p || p.hetHan < Date.now()) { phien.delete(ma); return null; }
  const tk = await qt.layTheoId(p.id);
  if (!tk) { phien.delete(ma); return null; }   // tài khoản đã bị xoá
  return tk;
}
const cookiePhien = (ma, giay) => `${TEN_COOKIE}=${ma}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${giay}`;
const huyPhienCua = (id, triMa) => { for (const [k, p] of phien) if (p.id === id && k !== triMa) phien.delete(k); };
setInterval(() => { const now = Date.now(); for (const [k, p] of phien) if (p.hetHan < now) phien.delete(k); }, 10 * 60_000).unref();

async function dangNhap(req, res) {
  const ip = ipCua(req);
  if (gioiHanSai.vuot(ip)) return json(res, 429, { loiChung: 'Sai quá nhiều lần, thử lại sau 1 phút' });
  const body = await docJson(req);
  const tk = await qt.xacThuc(body.tenDangNhap, body.matKhau);
  if (!tk) {
    gioiHanSai.ghi(ip);
    console.log(`[admin] đăng nhập sai từ ${ip}`);
    return json(res, 401, { loiChung: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  gioiHanSai.xoa(ip);
  const ma = crypto.randomBytes(32).toString('base64url');
  phien.set(ma, { id: tk.id, hetHan: Date.now() + THOI_HAN_PHIEN });
  console.log(`[admin] "${tk.tenDangNhap}" đăng nhập từ ${ip}`);
  return json(res, 200, { ok: true }, { 'Set-Cookie': cookiePhien(ma, THOI_HAN_PHIEN / 1000) });
}

function dangXuat(req, res) {
  const ma = docCookie(req, TEN_COOKIE);
  if (ma) phien.delete(ma);
  res.writeHead(204, { 'Set-Cookie': cookiePhien('', 0) }).end();
}

function toi(req, res, tk) { return json(res, 200, tk); }

async function doiMatKhau(req, res, tk) {
  const body = await docJson(req);
  const moi = typeof body.matKhauMoi === 'string' ? body.matKhauMoi : '';
  const { rows } = await db.query('SELECT mat_khau_hash FROM quan_tri WHERE id = $1', [tk.id]);
  if (!rows[0] || !(await qt.khopMatKhau(body.matKhauCu || '', rows[0].mat_khau_hash))) {
    return json(res, 400, { loi: { matKhauCu: 'Mật khẩu hiện tại không đúng' } });
  }
  if (moi.length < 8 || moi.length > 200) return json(res, 400, { loi: { matKhauMoi: 'Mật khẩu mới tối thiểu 8 ký tự' } });
  await db.query('UPDATE quan_tri SET mat_khau_hash = $2 WHERE id = $1', [tk.id, await qt.bamMatKhau(moi)]);
  huyPhienCua(tk.id, docCookie(req, TEN_COOKIE));      // đăng xuất các máy khác
  console.log(`[admin] "${tk.tenDangNhap}" đã đổi mật khẩu`);
  res.writeHead(204).end();
}

/* ---------- Tài khoản admin (CN-17) ---------- */
async function dsTaiKhoan(req, res, tk) {
  const { rows } = await db.query(
    `SELECT id, ten_dang_nhap, ten_hien_thi, to_char(tao_luc AT TIME ZONE 'Asia/Ho_Chi_Minh', 'DD/MM/YYYY HH24:MI') AS tao_luc
       FROM quan_tri ORDER BY id`);
  return json(res, 200, {
    taiKhoan: rows.map((r) => ({ id: Number(r.id), tenDangNhap: r.ten_dang_nhap, tenHienThi: r.ten_hien_thi, taoLuc: r.tao_luc, laToi: Number(r.id) === tk.id })),
  });
}

async function taoTaiKhoan(req, res) {
  const b = await docJson(req);
  const ten = String(b.tenDangNhap || '').trim().toLowerCase();
  const hienThi = String(b.tenHienThi || '').trim().replace(/\s+/g, ' ');
  const mk = typeof b.matKhau === 'string' ? b.matKhau : '';
  const loi = {};
  if (!qt.TEN_RE.test(ten)) loi.tenDangNhap = '3–32 ký tự: chữ thường không dấu, số, . _ -';
  if (!hienThi || hienThi.length > 60 || /[<>]/.test(hienThi)) loi.tenHienThi = 'Nhập tên hiển thị (tối đa 60 ký tự)';
  if (mk.length < 8 || mk.length > 200) loi.matKhau = 'Mật khẩu tối thiểu 8 ký tự';
  if (Object.keys(loi).length) return json(res, 400, { loi });
  try {
    const { rows } = await db.query(
      'INSERT INTO quan_tri (ten_dang_nhap, ten_hien_thi, mat_khau_hash) VALUES ($1, $2, $3) RETURNING id',
      [ten, hienThi, await qt.bamMatKhau(mk)]);
    console.log(`[admin] tạo tài khoản admin "${ten}"`);
    return json(res, 201, { id: Number(rows[0].id) });
  } catch (err) {
    if (err.code === '23505') return json(res, 409, { loi: { tenDangNhap: 'Tên đăng nhập đã tồn tại' } });
    throw err;
  }
}

async function xoaTaiKhoan(req, res, tk, id) {
  if (Number(id) === tk.id) return json(res, 400, { loiChung: 'Không thể xoá tài khoản đang đăng nhập' });
  // Xoá trong một câu lệnh, chỉ khi còn ít nhất 1 tài khoản khác
  const { rowCount } = await db.query(
    'DELETE FROM quan_tri WHERE id = $1 AND (SELECT count(*) FROM quan_tri) > 1', [id]);
  if (!rowCount) return json(res, 404, { loiChung: 'Không tìm thấy tài khoản' });
  huyPhienCua(Number(id));
  console.log(`[admin] "${tk.tenDangNhap}" đã xoá tài khoản admin id=${id}`);
  res.writeHead(204).end();
}

/* ---------- Người chơi: tìm, sắp xếp (CN-14, CN-19) ---------- */
const COT_SAP_XEP = {
  hoTen: 'nguoi_choi.ho_ten', email: 'nguoi_choi.email', soDienThoai: 'nguoi_choi.so_dien_thoai',
  dangKyLuc: 'nguoi_choi.dang_ky_luc', soLuot: 'nguoi_choi.so_luot',
  diemCaoNhat: 'nguoi_choi.diem_cao_nhat', lanChoiCuoi: 'nguoi_choi.lan_choi_cuoi',
};

function truyVan(url, dinhDangNgay) {
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  const cot = COT_SAP_XEP[url.searchParams.get('sap')] || COT_SAP_XEP.dangKyLuc;
  const huong = url.searchParams.get('huong') === 'asc' ? 'ASC' : 'DESC';
  const params = [];
  let where = '';
  if (q) {
    params.push('%' + q.replace(/[\\%_]/g, (c) => '\\' + c) + '%');
    where = 'WHERE ho_ten ILIKE $1 OR email ILIKE $1 OR so_dien_thoai ILIKE $1';
  }
  const sql = `SELECT id, ho_ten, email, so_dien_thoai, diem_cao_nhat, so_luot,
      to_char(lan_choi_cuoi AT TIME ZONE 'Asia/Ho_Chi_Minh', '${dinhDangNgay}') AS lan_choi_cuoi_txt,
      to_char(dang_ky_luc  AT TIME ZONE 'Asia/Ho_Chi_Minh', '${dinhDangNgay}') AS dang_ky_luc_txt
    FROM nguoi_choi ${where}
    ORDER BY ${cot} ${huong} NULLS LAST, nguoi_choi.id DESC`;
  return db.query(sql, params).then((r) => r.rows);
}

async function danhSach(req, res, url) {
  const rows = await truyVan(url, 'DD/MM/YYYY HH24:MI');
  return json(res, 200, {
    tong: rows.length,
    nguoiChoi: rows.map((r) => ({
      id: Number(r.id), hoTen: r.ho_ten, email: r.email, soDienThoai: r.so_dien_thoai,
      diemCaoNhat: r.diem_cao_nhat, soLuot: r.so_luot, lanChoiCuoi: r.lan_choi_cuoi_txt, dangKyLuc: r.dang_ky_luc_txt,
    })),
  });
}

/* ---------- Xoá (CN-15, CN-20) ---------- */
async function xoa(req, res, id) {
  const { rowCount } = await db.query('DELETE FROM nguoi_choi WHERE id = $1', [id]);
  if (!rowCount) return json(res, 404, { loiChung: 'Không tìm thấy người chơi' });
  console.log(`[admin] đã xoá người chơi id=${id}`);
  res.writeHead(204).end();
}

async function xoaNhieu(req, res) {
  const b = await docJson(req);
  const ids = Array.isArray(b.ids) ? [...new Set(b.ids)].filter((x) => Number.isInteger(x) && x > 0) : [];
  if (!ids.length || ids.length > 1000) throw new LoiHttp(400, 'Danh sách cần xoá không hợp lệ');
  const { rowCount } = await db.query('DELETE FROM nguoi_choi WHERE id = ANY($1::bigint[])', [ids]);
  console.log(`[admin] đã xoá ${rowCount} người chơi`);
  return json(res, 200, { daXoa: rowCount });
}

/* ---------- Xuất CSV (CN-16) ---------- */
function oCsv(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // chặn công thức khi mở bằng Excel
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function xuatCsv(req, res, url) {
  const rows = await truyVan(url, 'YYYY-MM-DD HH24:MI');
  const dong = [['ID', 'Họ tên', 'Email', 'Số điện thoại', 'Điểm cao nhất', 'Số lượt', 'Lần chơi cuối', 'Đăng ký lúc']];
  for (const r of rows) dong.push([r.id, r.ho_ten, r.email, r.so_dien_thoai, r.diem_cao_nhat, r.so_luot, r.lan_choi_cuoi_txt, r.dang_ky_luc_txt]);
  const csv = '﻿' + dong.map((d) => d.map(oCsv).join(',')).join('\r\n') + '\r\n';
  const t = new Date(Date.now() + 7 * 3600_000).toISOString();   // giờ Việt Nam
  const ten = `nguoi-choi-${t.slice(0, 10).replace(/-/g, '')}-${t.slice(11, 16).replace(':', '')}.csv`;
  res.writeHead(200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${ten}"`,
    'Cache-Control': 'no-store',
  });
  res.end(csv);
}

module.exports = {
  adminHienTai, dangNhap, dangXuat, toi, doiMatKhau,
  dsTaiKhoan, taoTaiKhoan, xoaTaiKhoan,
  danhSach, xoa, xoaNhieu, xuatCsv, oCsv,
};
