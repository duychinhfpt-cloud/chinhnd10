// Server Đập Chuột — chỉ dùng module có sẵn của Node.js + thư viện pg cho PostgreSQL.
// "/"            → app/          (game)
// "/design/..."  → design/       (game dùng ../design/tokens.css)
// "/admin"       → admin/        (chưa đăng nhập: chỉ trang đăng nhập)
// "/api/..."     → API đăng ký, điểm, admin (docs/04-quy-tac-du-lieu.html#dang-ky)
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./server/db');
const nguoiChoi = require('./server/api-nguoi-choi');
const admin = require('./server/api-admin');
const { LoiHttp, json } = require('./server/tien-ich');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const GOC = __dirname;
const THU_MUC = {
  app: path.join(GOC, 'app'),
  design: path.join(GOC, 'design'),
  admin: path.join(GOC, 'admin'),
};

const KIEU = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/* ---------- File tĩnh ---------- */
function timFile(p) {
  let goc = THU_MUC.app;
  if (p === '/design' || p.startsWith('/design/')) { goc = THU_MUC.design; p = p.slice('/design'.length); }
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const day = path.normalize(path.join(goc, p));
  if (!day.startsWith(goc + path.sep)) return null;      // chặn ../ thoát khỏi thư mục
  return day;
}

function guiFile(req, res, file, ghiLog) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Không tìm thấy');
      return ghiLog(404);
    }
    res.writeHead(200, {
      'Content-Type': KIEU[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
    });
    if (req.method === 'HEAD') { res.end(); return ghiLog(200); }
    fs.createReadStream(file).pipe(res);
    ghiLog(200);
  });
}

/* ---------- Trang admin: chỉ cho xem khi đã đăng nhập ---------- */
const TAI_NGUYEN_ADMIN = new Set(['/admin/admin.css', '/admin/admin.js', '/admin/dang-nhap.js']);
function phucVuAdmin(req, res, p, ghiLog) {
  if (p === '/admin') { res.writeHead(302, { Location: '/admin/' }).end(); return ghiLog(302); }
  if (TAI_NGUYEN_ADMIN.has(p)) return guiFile(req, res, path.join(THU_MUC.admin, path.basename(p)), ghiLog);
  if (p === '/admin/') {
    const trang = admin.daDangNhap(req) ? 'index.html' : 'dang-nhap.html';
    return guiFile(req, res, path.join(THU_MUC.admin, trang), ghiLog);
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Không tìm thấy');
  return ghiLog(404);
}

/* ---------- API ---------- */
async function xuLyApi(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  if (p === '/api/dang-ky' && m === 'POST') return nguoiChoi.dangKy(req, res);
  if (p === '/api/toi' && m === 'GET') return nguoiChoi.toi(req, res);
  if (p === '/api/diem' && m === 'POST') return nguoiChoi.guiDiem(req, res);

  if (p === '/api/admin/dang-nhap' && m === 'POST') return admin.dangNhap(req, res);
  if (p === '/api/admin/dang-xuat' && m === 'POST') return admin.dangXuat(req, res);

  if (p.startsWith('/api/admin/')) {
    if (!admin.daDangNhap(req)) return json(res, 401, { loiChung: 'Cần đăng nhập' });
    if (p === '/api/admin/nguoi-choi' && m === 'GET') return admin.danhSach(req, res, url);
    if (p === '/api/admin/nguoi-choi.csv' && m === 'GET') return admin.xuatCsv(req, res, url);
    const xoa = /^\/api\/admin\/nguoi-choi\/(\d{1,15})$/.exec(p);
    if (xoa && m === 'DELETE') return admin.xoa(req, res, xoa[1]);
  }
  return json(res, 404, { loiChung: 'Không có API này' });
}

/* ---------- Server ---------- */
const server = http.createServer(async (req, res) => {
  const batDau = Date.now();
  const ghiLog = (code) => console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]} ${code} ${Date.now() - batDau}ms`);
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok'); return; }

  let url;
  try { url = new URL(req.url, 'http://localhost'); decodeURIComponent(url.pathname); }
  catch { res.writeHead(400).end('Bad request'); return ghiLog(400); }
  const p = decodeURIComponent(url.pathname);

  if (p.startsWith('/api/')) {
    try {
      await xuLyApi(req, res, url);
      ghiLog(res.statusCode);
    } catch (err) {
      if (err instanceof LoiHttp) {
        if (!res.headersSent) json(res, err.ma, { loiChung: err.message });
      } else {
        console.error('[api] lỗi:', err);
        if (!res.headersSent) json(res, 500, { loiChung: 'Lỗi máy chủ, thử lại sau' });
      }
      ghiLog(res.statusCode);
    }
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return ghiLog(405);
  }
  if (p === '/admin' || p.startsWith('/admin/')) return phucVuAdmin(req, res, p, ghiLog);

  const file = timFile(p);
  if (!file) { res.writeHead(400).end('Bad request'); return ghiLog(400); }
  guiFile(req, res, file, ghiLog);
});

db.khoiTao()
  .then(() => server.listen(PORT, HOST, () => {
    console.log(`Đập Chuột đang chạy: http://localhost:${PORT}  ·  admin: http://localhost:${PORT}/admin`);
  }))
  .catch((err) => { console.error('[db] không khởi tạo được database:', err.message); process.exit(1); });

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => {
    console.log(`Nhận ${sig}, dừng server`);
    server.close(() => db.dong().finally(() => process.exit(0)));
  });
}
