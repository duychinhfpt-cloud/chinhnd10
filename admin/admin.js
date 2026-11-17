'use strict';
// Trang danh sách người chơi: xem & tìm (CN-14), xoá (CN-15), xuất CSV (CN-16)

const $ = (id) => document.getElementById(id);
const than = $('than'), dem = $('dem'), tim = $('tim'), btnCsv = $('btnCsv');
const hopXoa = $('hopXoa'), hopXoaChu = $('hopXoaChu');
let dangXoa = null;
let lanTai = 0;

function veDong(n) {
  const tr = document.createElement('tr');
  const o = (text, cls) => {
    const td = document.createElement('td');
    if (cls) td.className = cls;
    td.textContent = text ?? '—';
    tr.appendChild(td);
  };
  o(n.hoTen, 'ten'); o(n.email); o(n.soDienThoai);
  o(String(n.diemCaoNhat), 'so'); o(String(n.soLuot), 'so');
  o(n.lanChoiCuoi || '—', 'mo'); o(n.dangKyLuc, 'mo');
  const td = document.createElement('td');
  const nut = document.createElement('button');
  nut.type = 'button';
  nut.className = 'btn btn-danger btn-sm';
  nut.textContent = 'Xoá';
  nut.setAttribute('aria-label', `Xoá ${n.hoTen}`);
  nut.addEventListener('click', () => moHopXoa(n));
  td.appendChild(nut);
  tr.appendChild(td);
  return tr;
}

async function goi(url, opts) {
  const r = await fetch(url, opts);
  if (r.status === 401) { location.replace('/admin/'); throw new Error('Hết phiên'); }
  return r;
}

async function taiDanhSach() {
  const q = tim.value.trim();
  const lan = ++lanTai;
  const qs = q ? `?q=${encodeURIComponent(q)}` : '';
  btnCsv.href = `/api/admin/nguoi-choi.csv${qs}`;
  try {
    const r = await goi(`/api/admin/nguoi-choi${qs}`);
    const d = await r.json();
    if (lan !== lanTai) return;                  // bỏ kết quả cũ khi đang gõ nhanh
    than.replaceChildren(...(d.nguoiChoi.length
      ? d.nguoiChoi.map(veDong)
      : [Object.assign(document.createElement('tr'), {
          className: 'trong-rong',
          innerHTML: `<td colspan="8">${q ? 'Không tìm thấy người chơi nào' : 'Chưa có người chơi nào'}</td>`,
        })]));
    dem.innerHTML = `<strong>${d.tong}</strong> người chơi`;
  } catch (e) {
    if (e.message !== 'Hết phiên') thongBao('Không tải được danh sách');
  }
}

let henTim = 0;
tim.addEventListener('input', () => { clearTimeout(henTim); henTim = setTimeout(taiDanhSach, 250); });

function moHopXoa(n) {
  dangXoa = n;
  hopXoaChu.textContent = `Xoá người chơi ${n.hoTen} (${n.email})? Không thể hoàn tác.`;
  hopXoa.showModal();
  $('btnHuy').focus();
}
$('btnHuy').addEventListener('click', () => hopXoa.close());
$('btnXacNhanXoa').addEventListener('click', async () => {
  const n = dangXoa;
  hopXoa.close();
  if (!n) return;
  try {
    const r = await goi(`/api/admin/nguoi-choi/${n.id}`, { method: 'DELETE' });
    if (r.status === 204 || r.status === 404) thongBao(`Đã xoá ${n.hoTen}`);
    else thongBao('Xoá không thành công');
  } catch { thongBao('Xoá không thành công'); }
  taiDanhSach();
});

$('btnDangXuat').addEventListener('click', async () => {
  await fetch('/api/admin/dang-xuat', { method: 'POST' }).catch(() => {});
  location.replace('/admin/');
});

let henThongBao = 0;
function thongBao(chu) {
  const el = $('thongBao');
  el.textContent = chu; el.hidden = false;
  clearTimeout(henThongBao);
  henThongBao = setTimeout(() => { el.hidden = true; }, 2500);
}

taiDanhSach();
