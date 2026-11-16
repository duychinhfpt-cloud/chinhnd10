// Server tĩnh nhỏ cho game Đập Chuột — chỉ dùng module có sẵn của Node.js.
// "/"            → app/index.html
// "/<file>"      → app/<file>
// "/design/..."  → design/... (game dùng ../design/tokens.css)
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const GOC = __dirname;
const THU_MUC = {
  app: path.join(GOC, 'app'),
  design: path.join(GOC, 'design'),
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

function timFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch { return null; }
  let goc = THU_MUC.app;
  if (p === '/design' || p.startsWith('/design/')) { goc = THU_MUC.design; p = p.slice('/design'.length); }
  if (p === '' || p.endsWith('/')) p += 'index.html';
  const day = path.normalize(path.join(goc, p));
  if (!day.startsWith(goc + path.sep)) return null;      // chặn ../ thoát khỏi thư mục
  return day;
}

const server = http.createServer((req, res) => {
  const batDau = Date.now();
  const ghiLog = (code) => console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${code} ${Date.now() - batDau}ms`);

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return ghiLog(405);
  }
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('ok');
    return;                                              // không ghi log để log healthcheck không làm rối
  }

  const file = timFile(req.url);
  if (!file) { res.writeHead(400).end('Bad request'); return ghiLog(400); }

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
    });
    if (req.method === 'HEAD') { res.end(); return ghiLog(200); }
    fs.createReadStream(file).pipe(res);
    ghiLog(200);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Đập Chuột đang chạy: http://localhost:${PORT}`);
});

// Docker gửi SIGTERM khi dừng container: đóng server gọn gàng
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { console.log(`Nhận ${sig}, dừng server`); server.close(() => process.exit(0)); });
}
