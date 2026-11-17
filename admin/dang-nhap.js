'use strict';
const form = document.getElementById('form');
const loi = document.getElementById('loi');
const nut = document.getElementById('nut');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  loi.hidden = true;
  const tenDangNhap = form.tenDangNhap.value.trim();
  const matKhau = form.matKhau.value;
  if (!tenDangNhap || !matKhau) { loi.textContent = 'Nhập tên đăng nhập và mật khẩu'; loi.hidden = false; return; }
  nut.disabled = true; nut.textContent = 'Đang đăng nhập…';
  try {
    const r = await fetch('/api/admin/dang-nhap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenDangNhap, matKhau }),
    });
    if (r.ok) { location.replace('/admin/'); return; }
    const d = await r.json().catch(() => ({}));
    loi.textContent = d.loiChung || 'Đăng nhập không thành công';
  } catch {
    loi.textContent = 'Không kết nối được máy chủ';
  }
  loi.hidden = false;
  nut.disabled = false; nut.textContent = 'Đăng nhập';
  form.matKhau.select();
});
