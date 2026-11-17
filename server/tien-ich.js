// Tiện ích HTTP dùng chung: đọc JSON, trả JSON, cookie, giới hạn tần suất.
'use strict';

const GIOI_HAN_BODY = 10 * 1024; // 10 KB

class LoiHttp extends Error {
  constructor(ma, thongBao) { super(thongBao); this.ma = ma; }
}

function docJson(req) {
  return new Promise((resolve, reject) => {
    const loai = (req.headers['content-type'] || '').split(';')[0].trim();
    if (loai !== 'application/json') return reject(new LoiHttp(415, 'Cần gửi JSON'));
    let kichThuoc = 0;
    const phan = [];
    req.on('data', (c) => {
      kichThuoc += c.length;
      if (kichThuoc > GIOI_HAN_BODY) { reject(new LoiHttp(413, 'Dữ liệu quá lớn')); req.destroy(); return; }
      phan.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(phan).toString('utf8') || '{}')); }
      catch { reject(new LoiHttp(400, 'JSON không hợp lệ')); }
    });
    req.on('error', reject);
  });
}

function json(res, ma, duLieu, headers = {}) {
  const body = duLieu === undefined ? '' : JSON.stringify(duLieu);
  res.writeHead(ma, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function docCookie(req, ten) {
  const raw = req.headers.cookie || '';
  for (const phan of raw.split(';')) {
    const i = phan.indexOf('=');
    if (i > 0 && phan.slice(0, i).trim() === ten) return decodeURIComponent(phan.slice(i + 1).trim());
  }
  return null;
}

function ipCua(req) {
  return req.socket.remoteAddress || 'khong-ro';
}

/** Giới hạn tần suất đơn giản theo khoá (IP), cửa sổ trượt. */
function taoGioiHan(soLan, cuaSoMs) {
  const bang = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, ds] of bang) if (!ds.some((t) => now - t < cuaSoMs)) bang.delete(k);
  }, cuaSoMs).unref();
  return {
    vuot(khoa) {
      const now = Date.now();
      const ds = (bang.get(khoa) || []).filter((t) => now - t < cuaSoMs);
      bang.set(khoa, ds);
      return ds.length >= soLan;
    },
    ghi(khoa) {
      const ds = bang.get(khoa) || [];
      ds.push(Date.now());
      bang.set(khoa, ds);
    },
    xoa(khoa) { bang.delete(khoa); },
  };
}

module.exports = { LoiHttp, docJson, json, docCookie, ipCua, taoGioiHan };
