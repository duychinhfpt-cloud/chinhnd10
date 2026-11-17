// API trang admin: đăng nhập (CN-13), xem & tìm (CN-14), xoá (CN-15), xuất CSV (CN-16).
'use strict';

const crypto = require('node:crypto');
const db = require('./db');
const { docJson, json, docCookie, ipCua, taoGioiHan } = require('./tien-ich');

const TEN_COOKIE = 'dc_admin';
const THOI_HAN_PHIEN = 8 * 60 * 60 * 1000; // 8 giờ
const phien = new Map();                     // mã phiên → hết hạn lúc
const gioiHanSai = taoGioiHan(5, 60_000);

const ADMIN_USER = process.env.ADMIN_USER || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
if (!ADMIN_USER || ADMIN_PASSWORD.length < 8) {
  console.warn('[admin] CẢNH BÁO: ADMIN_USER/ADMIN_PASSWORD chưa đặt hoặc mật khẩu < 8 ký tự — trang admin bị khoá');
}

function soSanhAnToan(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function daDangNhap(req) {
  const ma = docCookie(req, TEN_COOKIE);
  if (!ma) return false;
  const hetHan = phien.get(ma);
  if (!hetHan || hetHan < Date.now()) { phien.delete(ma); return false; }
  return true;
}

function cookiePhien(ma, maxAgeGiay) {
  return `${TEN_COOKIE}=${ma}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeGiay}`;
}

async function dangNhap(req, res) {
  const ip = ipCua(req);
  if (gioiHanSai.vuot(ip)) return json(res, 429, { loiChung: 'Sai quá nhiều lần, thử lại sau 1 phút' });
  const body = await docJson(req);
  const dung = ADMIN_USER && ADMIN_PASSWORD.length >= 8
    && soSanhAnToan(body.tenDangNhap ?? '', ADMIN_USER)
    & soSanhAnToan(body.matKhau ?? '', ADMIN_PASSWORD);   // & để luôn so cả hai
  if (!dung) {
    gioiHanSai.ghi(ip);
    console.log(`[admin] đăng nhập sai từ ${ip}`);
    return json(res, 401, { loiChung: 'Sai tên đăng nhập hoặc mật khẩu' });
  }
  gioiHanSai.xoa(ip);
  const ma = crypto.randomBytes(32).toString('base64url');
  phien.set(ma, Date.now() + THOI_HAN_PHIEN);
  console.log(`[admin] đăng nhập thành công từ ${ip}`);
  return json(res, 200, { ok: true }, { 'Set-Cookie': cookiePhien(ma, THOI_HAN_PHIEN / 1000) });
}

function dangXuat(req, res) {
  const ma = docCookie(req, TEN_COOKIE);
  if (ma) phien.delete(ma);
  res.writeHead(204, { 'Set-Cookie': cookiePhien('', 0) }).end();
}

// Dọn phiên hết hạn
setInterval(() => { const now = Date.now(); for (const [k, h] of phien) if (h < now) phien.delete(k); }, 10 * 60_000).unref();

/** Điều kiện tìm kiếm: một phần tên/email/SĐT, không phân biệt hoa thường. */
function dieuKienTim(q) {
  const s = typeof q === 'string' ? q.trim().slice(0, 100) : '';
  if (!s) return { where: '', params: [] };
  const mau = '%' + s.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
  return {
    where: `WHERE ho_ten ILIKE $1 OR email ILIKE $1 OR so_dien_thoai ILIKE $1`,
    params: [mau],
  };
}

const COT = `id, ho_ten, email, so_dien_thoai, diem_cao_nhat, so_luot,
  to_char(lan_choi_cuoi AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS lan_choi_cuoi,
  to_char(dang_ky_luc  AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI') AS dang_ky_luc`;

async function timNguoiChoi(q) {
  const { where, params } = dieuKienTim(q);
  const { rows } = await db.query(`SELECT ${COT} FROM nguoi_choi ${where} ORDER BY dang_ky_luc DESC, id DESC`, params);
  return rows;
}

async function danhSach(req, res, url) {
  const rows = await timNguoiChoi(url.searchParams.get('q'));
  return json(res, 200, {
    tong: rows.length,
    nguoiChoi: rows.map((r) => ({
      id: Number(r.id), hoTen: r.ho_ten, email: r.email, soDienThoai: r.so_dien_thoai,
      diemCaoNhat: r.diem_cao_nhat, soLuot: r.so_luot, lanChoiCuoi: r.lan_choi_cuoi, dangKyLuc: r.dang_ky_luc,
    })),
  });
}

async function xoa(req, res, id) {
  const { rowCount } = await db.query('DELETE FROM nguoi_choi WHERE id = $1', [id]);
  if (!rowCount) return json(res, 404, { loiChung: 'Không tìm thấy người chơi' });
  console.log(`[admin] đã xoá người chơi id=${id}`);
  res.writeHead(204).end();
}

function oCsv(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;          // chặn công thức khi mở bằng Excel
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function xuatCsv(req, res, url) {
  const rows = await timNguoiChoi(url.searchParams.get('q'));
  const dong = [['ID', 'Họ tên', 'Email', 'Số điện thoại', 'Điểm cao nhất', 'Số lượt', 'Lần chơi cuối', 'Đăng ký lúc']];
  for (const r of rows) {
    dong.push([r.id, r.ho_ten, r.email, r.so_dien_thoai, r.diem_cao_nhat, r.so_luot, r.lan_choi_cuoi, r.dang_ky_luc]);
  }
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

module.exports = { daDangNhap, dangNhap, dangXuat, danhSach, xoa, xuatCsv, oCsv };
