// Tài khoản quản trị (v1.2): lưu trong bảng quan_tri, mật khẩu băm bằng scrypt.
// Lần đầu chạy (bảng trống) tạo tài khoản từ ADMIN_USER / ADMIN_PASSWORD trong .env.
'use strict';

const crypto = require('node:crypto');
const { promisify } = require('node:util');
const db = require('./db');

const scrypt = promisify(crypto.scrypt);
const TEN_RE = /^[a-z0-9._-]{3,32}$/;

async function bamMatKhau(mk) {
  const muoi = crypto.randomBytes(16);
  const bam = await scrypt(mk, muoi, 64);
  return `scrypt$${muoi.toString('base64')}$${bam.toString('base64')}`;
}

async function khopMatKhau(mk, luu) {
  const [loai, muoiB64, bamB64] = String(luu || '').split('$');
  if (loai !== 'scrypt' || !muoiB64 || !bamB64) {
    await scrypt(String(mk), 'gia', 64);              // giữ thời gian xử lý tương đương
    return false;
  }
  const bam = Buffer.from(bamB64, 'base64');
  const thu = await scrypt(String(mk), Buffer.from(muoiB64, 'base64'), bam.length);
  return crypto.timingSafeEqual(bam, thu);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS quan_tri (
  id             BIGSERIAL PRIMARY KEY,
  ten_dang_nhap  TEXT        NOT NULL,
  ten_hien_thi   TEXT        NOT NULL CHECK (char_length(ten_hien_thi) BETWEEN 1 AND 60),
  mat_khau_hash  TEXT        NOT NULL,
  tao_luc        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT quan_tri_ten_key UNIQUE (ten_dang_nhap)
);`;

async function khoiTao() {
  await db.query(SCHEMA);
  const { rows } = await db.query('SELECT count(*)::int AS n FROM quan_tri');
  if (rows[0].n > 0) return;
  const ten = (process.env.ADMIN_USER || '').trim().toLowerCase();
  const mk = process.env.ADMIN_PASSWORD || '';
  if (!TEN_RE.test(ten) || mk.length < 8) {
    console.warn('[admin] CẢNH BÁO: chưa có tài khoản admin và ADMIN_USER/ADMIN_PASSWORD trong .env không hợp lệ (tên 3–32 ký tự a-z 0-9 . _ -, mật khẩu ≥ 8 ký tự)');
    return;
  }
  await db.query(
    'INSERT INTO quan_tri (ten_dang_nhap, ten_hien_thi, mat_khau_hash) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [ten, 'Quản trị viên', await bamMatKhau(mk)],
  );
  console.log(`[admin] đã tạo tài khoản admin đầu tiên "${ten}" từ .env`);
}

/** Trả về tài khoản nếu đúng tên + mật khẩu, ngược lại null. */
async function xacThuc(tenDangNhap, matKhau) {
  const ten = String(tenDangNhap || '').trim().toLowerCase();
  const { rows } = await db.query('SELECT id, ten_dang_nhap, ten_hien_thi, mat_khau_hash FROM quan_tri WHERE ten_dang_nhap = $1', [ten]);
  const dung = await khopMatKhau(matKhau || '', rows[0] && rows[0].mat_khau_hash);
  return dung ? { id: Number(rows[0].id), tenDangNhap: rows[0].ten_dang_nhap, tenHienThi: rows[0].ten_hien_thi } : null;
}

async function layTheoId(id) {
  const { rows } = await db.query('SELECT id, ten_dang_nhap, ten_hien_thi FROM quan_tri WHERE id = $1', [id]);
  return rows[0] ? { id: Number(rows[0].id), tenDangNhap: rows[0].ten_dang_nhap, tenHienThi: rows[0].ten_hien_thi } : null;
}

module.exports = { TEN_RE, bamMatKhau, khopMatKhau, khoiTao, xacThuc, layTheoId };
