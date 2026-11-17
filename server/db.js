// Kết nối PostgreSQL. Thông tin kết nối lấy từ biến môi trường chuẩn của pg:
// PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE (đặt trong compose.yaml / .env).
'use strict';

const { Pool } = require('pg');

const pool = new Pool({ max: 10, idleTimeoutMillis: 30_000 });
pool.on('error', (err) => console.error('[db] lỗi kết nối nền:', err.message));

const SCHEMA = `
CREATE TABLE IF NOT EXISTS nguoi_choi (
  id             BIGSERIAL PRIMARY KEY,
  ho_ten         TEXT        NOT NULL CHECK (char_length(ho_ten) BETWEEN 2 AND 60),
  email          TEXT        NOT NULL,
  so_dien_thoai  TEXT        NOT NULL,
  dong_y         BOOLEAN     NOT NULL CHECK (dong_y),
  ma_hash        TEXT        NOT NULL,
  diem_cao_nhat  INTEGER     NOT NULL DEFAULT 0 CHECK (diem_cao_nhat >= 0),
  so_luot        INTEGER     NOT NULL DEFAULT 0 CHECK (so_luot >= 0),
  lan_choi_cuoi  TIMESTAMPTZ,
  dang_ky_luc    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT nguoi_choi_email_key UNIQUE (email),
  CONSTRAINT nguoi_choi_sdt_key   UNIQUE (so_dien_thoai),
  CONSTRAINT nguoi_choi_ma_key    UNIQUE (ma_hash)
);`;

/** Chờ database sẵn sàng (tối đa ~60 giây) rồi tạo bảng nếu chưa có. */
async function khoiTao() {
  for (let lan = 1; ; lan++) {
    try {
      await pool.query(SCHEMA);
      console.log('[db] sẵn sàng, bảng nguoi_choi đã có');
      return;
    } catch (err) {
      if (lan >= 30) throw err;
      console.log(`[db] chưa kết nối được (lần ${lan}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

const query = (text, params) => pool.query(text, params);
const dong = () => pool.end();

module.exports = { khoiTao, query, dong };
