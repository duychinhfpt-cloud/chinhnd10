'use strict';
// Trang quản trị: người chơi (xem, tìm, sắp xếp, xoá, xoá nhiều, CSV, chi tiết)
// và tài khoản admin (thêm, xoá, đổi mật khẩu)

const $ = (id) => document.getElementById(id);
let trangThai = { q: '', sap: 'dangKyLuc', huong: 'desc' };
let dsHienTai = [];
const daChon = new Set();
let lanTai = 0;

/* ---------- Tiện ích ---------- */
async function goi(url, opts = {}) {
  const r = await fetch(url, opts);
  if (r.status === 401) { location.replace('/admin/'); throw new Error('het-phien'); }
  return r;
}
const guiJson = (url, method, body) => goi(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

let henTb = 0;
function thongBao(chu) {
  const el = $('thongBao');
  el.textContent = chu; el.hidden = false;
  clearTimeout(henTb); henTb = setTimeout(() => { el.hidden = true; }, 2500);
}

function xacNhan(tieuDe, chu, nutDongY = 'Xoá') {
  return new Promise((resolve) => {
    const hop = $('hopXacNhan');
    $('xnTieuDe').textContent = tieuDe;
    $('xnChu').textContent = chu;
    $('xnDongY').textContent = nutDongY;
    const xong = (kq) => { hop.close(); $('xnHuy').onclick = $('xnDongY').onclick = null; resolve(kq); };
    $('xnHuy').onclick = () => xong(false);
    $('xnDongY').onclick = () => xong(true);
    hop.oncancel = () => xong(false);
    hop.showModal();
    $('xnHuy').focus();
  });
}

function hienLoiForm(form, loi) {
  for (const s of form.querySelectorAll('[data-loi]')) {
    s.textContent = (loi && loi[s.dataset.loi]) || '';
    const o = form.elements[s.dataset.loi];
    if (o) o.setAttribute('aria-invalid', s.textContent ? 'true' : 'false');
  }
}
document.querySelectorAll('[data-dong]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));

/* ---------- Tab ---------- */
function moTab() {
  const tab = location.hash === '#tai-khoan' ? 'tai-khoan' : 'nguoi-choi';
  $('mucNguoiChoi').hidden = tab !== 'nguoi-choi';
  $('mucTaiKhoan').hidden = tab !== 'tai-khoan';
  document.querySelectorAll('.tab a').forEach((a) => a.classList.toggle('dang', a.dataset.tab === tab));
  if (tab === 'tai-khoan') taiTaiKhoan(); else taiNguoiChoi();
}
window.addEventListener('hashchange', moTab);

/* ---------- Người chơi ---------- */
function qs() {
  const p = new URLSearchParams();
  if (trangThai.q) p.set('q', trangThai.q);
  p.set('sap', trangThai.sap);
  p.set('huong', trangThai.huong);
  return '?' + p.toString();
}

function capNhatSapXep() {
  document.querySelectorAll('button.sap').forEach((b) => {
    const dang = b.dataset.cot === trangThai.sap;
    b.classList.toggle('dang', dang);
    b.dataset.huong = dang ? trangThai.huong : '';
    b.closest('th').setAttribute('aria-sort', dang ? (trangThai.huong === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

function capNhatChon() {
  const n = daChon.size;
  $('btnXoaChon').disabled = n === 0;
  $('btnXoaChon').textContent = n ? `Xoá đã chọn (${n})` : 'Xoá đã chọn';
  const tatCa = $('chonTatCa');
  tatCa.checked = dsHienTai.length > 0 && dsHienTai.every((x) => daChon.has(x.id));
  tatCa.indeterminate = !tatCa.checked && dsHienTai.some((x) => daChon.has(x.id));
}

function td(text, cls) {
  const o = document.createElement('td');
  if (cls) o.className = cls;
  o.textContent = text === null || text === undefined || text === '' ? '—' : text;
  return o;
}

function veDong(n) {
  const tr = document.createElement('tr');
  const oChon = document.createElement('td');
  oChon.className = 'o-chon';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = daChon.has(n.id);
  cb.setAttribute('aria-label', `Chọn ${n.hoTen}`);
  cb.addEventListener('change', () => { cb.checked ? daChon.add(n.id) : daChon.delete(n.id); capNhatChon(); });
  oChon.appendChild(cb);

  const oTen = document.createElement('td');
  oTen.className = 'ten';
  const lk = document.createElement('button');
  lk.type = 'button'; lk.className = 'lien-ket'; lk.textContent = n.hoTen;
  lk.addEventListener('click', () => moChiTiet(n));
  oTen.appendChild(lk);

  const oXoa = document.createElement('td');
  oXoa.className = 'thao-tac';
  const nut = document.createElement('button');
  nut.type = 'button'; nut.className = 'btn btn-danger-solid btn-sm'; nut.textContent = 'Xoá';
  nut.setAttribute('aria-label', `Xoá ${n.hoTen}`);
  nut.addEventListener('click', () => xoaMot(n));
  oXoa.appendChild(nut);

  tr.append(oChon, oTen, td(n.email), td(n.soDienThoai), td(n.dangKyLuc, 'mo'),
    td(String(n.soLuot), 'so'), td(n.soLuot ? String(n.diemCaoNhat) : '', 'so'), td(n.lanChoiCuoi, 'mo'), oXoa);
  return tr;
}

async function taiNguoiChoi() {
  const lan = ++lanTai;
  $('btnCsv').href = '/api/admin/nguoi-choi.csv' + qs();
  capNhatSapXep();
  try {
    const r = await goi('/api/admin/nguoi-choi' + qs());
    const d = await r.json();
    if (lan !== lanTai) return;
    dsHienTai = d.nguoiChoi;
    const conLai = new Set(dsHienTai.map((x) => x.id));
    for (const id of [...daChon]) if (!conLai.has(id)) daChon.delete(id);
    if (dsHienTai.length) {
      $('than').replaceChildren(...dsHienTai.map(veDong));
    } else {
      const tr = document.createElement('tr');
      tr.className = 'trong-rong';
      const o = td(trangThai.q ? 'Không tìm thấy người chơi nào' : 'Chưa có người chơi nào');
      o.colSpan = 9; tr.appendChild(o);
      $('than').replaceChildren(tr);
    }
    $('dem').textContent = `Tổng ${d.tong} người chơi`;
    capNhatChon();
  } catch (e) { if (e.message !== 'het-phien') thongBao('Không tải được danh sách'); }
}

let henTim = 0;
$('tim').addEventListener('input', () => {
  clearTimeout(henTim);
  henTim = setTimeout(() => { trangThai.q = $('tim').value.trim(); taiNguoiChoi(); }, 250);
});

document.querySelectorAll('button.sap').forEach((b) => b.addEventListener('click', () => {
  const cot = b.dataset.cot;
  if (trangThai.sap === cot) trangThai.huong = trangThai.huong === 'asc' ? 'desc' : 'asc';
  else { trangThai.sap = cot; trangThai.huong = ['hoTen', 'email', 'soDienThoai'].includes(cot) ? 'asc' : 'desc'; }
  taiNguoiChoi();
}));

$('chonTatCa').addEventListener('change', (e) => {
  for (const n of dsHienTai) e.target.checked ? daChon.add(n.id) : daChon.delete(n.id);
  $('than').querySelectorAll('.o-chon input').forEach((c) => { c.checked = e.target.checked; });
  capNhatChon();
});

async function xoaMot(n) {
  if (!(await xacNhan('Xoá người chơi?', `Xoá ${n.hoTen} (${n.email})? Không thể hoàn tác.`))) return;
  try {
    const r = await goi(`/api/admin/nguoi-choi/${n.id}`, { method: 'DELETE' });
    thongBao(r.status === 204 || r.status === 404 ? `Đã xoá ${n.hoTen}` : 'Xoá không thành công');
  } catch { thongBao('Xoá không thành công'); }
  daChon.delete(n.id);
  taiNguoiChoi();
}

$('btnXoaChon').addEventListener('click', async () => {
  const ids = [...daChon];
  if (!ids.length) return;
  if (!(await xacNhan('Xoá người chơi đã chọn?', `Xoá ${ids.length} người chơi đã chọn? Không thể hoàn tác.`, `Xoá ${ids.length}`))) return;
  try {
    const r = await guiJson('/api/admin/nguoi-choi/xoa', 'POST', { ids });
    const d = await r.json();
    thongBao(r.ok ? `Đã xoá ${d.daXoa} người chơi` : (d.loiChung || 'Xoá không thành công'));
    if (r.ok) daChon.clear();
  } catch { thongBao('Xoá không thành công'); }
  taiNguoiChoi();
});

function moChiTiet(n) {
  $('ctTen').textContent = n.hoTen;
  const ds = $('ctDs');
  ds.replaceChildren();
  for (const [k, v] of [['Email', n.email], ['Số điện thoại', n.soDienThoai], ['Ngày đăng ký', n.dangKyLuc],
    ['Số lượt chơi', n.soLuot], ['Điểm cao nhất', n.soLuot ? n.diemCaoNhat : '—'], ['Chơi gần nhất', n.lanChoiCuoi || '—']]) {
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    ds.append(dt, dd);
  }
  $('hopChiTiet').showModal();
}

/* ---------- Tài khoản admin ---------- */
async function taiTaiKhoan() {
  try {
    const d = await (await goi('/api/admin/tai-khoan')).json();
    $('thanTk').replaceChildren(...d.taiKhoan.map((t) => {
      const tr = document.createElement('tr');
      const oTen = td(t.tenDangNhap, 'ten');
      if (t.laToi) { const b = document.createElement('span'); b.className = 'nhan'; b.textContent = 'Bạn'; oTen.append(' ', b); }
      const oXoa = document.createElement('td');
      oXoa.className = 'thao-tac';
      if (!t.laToi) {
        const nut = document.createElement('button');
        nut.type = 'button'; nut.className = 'btn btn-danger-solid btn-sm'; nut.textContent = 'Xoá';
        nut.disabled = d.taiKhoan.length <= 1;
        nut.addEventListener('click', async () => {
          if (!(await xacNhan('Xoá tài khoản admin?', `Xoá tài khoản "${t.tenDangNhap}" (${t.tenHienThi})? Người này sẽ bị đăng xuất.`))) return;
          const r = await goi(`/api/admin/tai-khoan/${t.id}`, { method: 'DELETE' });
          thongBao(r.status === 204 ? `Đã xoá ${t.tenDangNhap}` : ((await r.json().catch(() => ({}))).loiChung || 'Xoá không thành công'));
          taiTaiKhoan();
        });
        oXoa.appendChild(nut);
      }
      tr.append(oTen, td(t.tenHienThi), td(t.taoLuc, 'mo'), oXoa);
      return tr;
    }));
  } catch (e) { if (e.message !== 'het-phien') thongBao('Không tải được danh sách tài khoản'); }
}

$('formTk').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const body = { tenDangNhap: f.tenDangNhap.value, tenHienThi: f.tenHienThi.value, matKhau: f.matKhau.value };
  try {
    const r = await guiJson('/api/admin/tai-khoan', 'POST', body);
    const d = await r.json().catch(() => ({}));
    if (r.status === 201) { f.reset(); hienLoiForm(f, {}); thongBao(`Đã thêm ${body.tenDangNhap.trim().toLowerCase()}`); taiTaiKhoan(); }
    else hienLoiForm(f, d.loi || {});
  } catch { thongBao('Không thêm được tài khoản'); }
});

/* ---------- Tài khoản đang đăng nhập ---------- */
$('btnDoiMk').addEventListener('click', () => {
  const f = $('formDoiMk'); f.reset(); hienLoiForm(f, {});
  $('hopDoiMk').showModal(); f.matKhauCu.focus();
});
$('formDoiMk').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  if (f.matKhauMoi.value.length < 8) return hienLoiForm(f, { matKhauMoi: 'Mật khẩu mới tối thiểu 8 ký tự' });
  if (f.matKhauMoi.value !== f.matKhauLai.value) return hienLoiForm(f, { matKhauLai: 'Mật khẩu nhập lại không khớp' });
  try {
    const r = await guiJson('/api/admin/doi-mat-khau', 'POST', { matKhauCu: f.matKhauCu.value, matKhauMoi: f.matKhauMoi.value });
    if (r.status === 204) { $('hopDoiMk').close(); thongBao('Đã đổi mật khẩu'); return; }
    hienLoiForm(f, (await r.json().catch(() => ({}))).loi || {});
  } catch { thongBao('Không đổi được mật khẩu'); }
});

$('btnDangXuat').addEventListener('click', async () => {
  await fetch('/api/admin/dang-xuat', { method: 'POST' }).catch(() => {});
  location.replace('/admin/');
});

/* ---------- Khởi động ---------- */
(async () => {
  try {
    const tk = await (await goi('/api/admin/toi')).json();
    $('tenAdmin').textContent = tk.tenHienThi;
    $('tenAdmin').title = tk.tenDangNhap;
  } catch { /* goi() đã chuyển về trang đăng nhập nếu hết phiên */ }
  moTab();
})();
