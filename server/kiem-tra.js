// Chuẩn hoá & kiểm tra dữ liệu đăng ký — theo docs/04-quy-tac-du-lieu.html#dang-ky
'use strict';

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
const SDT_RE = /^0[35789]\d{8}$/;

function chuanHoaTen(v) {
  return typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '';
}
function chuanHoaEmail(v) {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}
function chuanHoaSdt(v) {
  if (typeof v !== 'string') return '';
  let s = v.replace(/[\s.\-()]/g, '');
  if (s.startsWith('+84')) s = '0' + s.slice(3);
  else if (s.startsWith('84') && s.length === 11) s = '0' + s.slice(2);
  return s;
}

/** Trả về { duLieu, loi } — loi là object { truong: thông báo }, rỗng nếu hợp lệ. */
function kiemTraDangKy(body) {
  const b = body && typeof body === 'object' ? body : {};
  const duLieu = {
    hoTen: chuanHoaTen(b.hoTen),
    email: chuanHoaEmail(b.email),
    soDienThoai: chuanHoaSdt(b.soDienThoai),
    dongY: b.dongY === true,
  };
  const loi = {};
  const len = [...duLieu.hoTen].length;
  if (len < 2 || len > 60 || /[<>]/.test(duLieu.hoTen)) loi.hoTen = 'Nhập họ tên (2–60 ký tự)';
  if (!duLieu.email || duLieu.email.length > 254 || !EMAIL_RE.test(duLieu.email)) loi.email = 'Email không đúng định dạng';
  if (!SDT_RE.test(duLieu.soDienThoai)) loi.soDienThoai = 'Số điện thoại không đúng (10 số, bắt đầu bằng 0)';
  if (!duLieu.dongY) loi.dongY = 'Bạn cần đồng ý để đăng ký';
  return { duLieu, loi };
}

function kiemTraDiem(v) {
  return Number.isInteger(v) && v >= 0 && v <= 200;
}

module.exports = { kiemTraDangKy, kiemTraDiem, chuanHoaSdt, chuanHoaEmail };
