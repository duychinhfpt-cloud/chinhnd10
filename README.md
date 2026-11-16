# Đập Chuột

Mini game phản xạ chạy trên trình duyệt: lưới 3×3, mỗi lượt 30 giây, đập trúng được 1 điểm, độ khó tăng dần qua 3 chặng (Khởi động → Tăng tốc → Bão tuyết).

## Cấu trúc

| Thư mục / file | Nội dung |
|---|---|
| `YEU-CAU.md` | Yêu cầu ban đầu |
| `design/` | Design system: `tokens.css`, trang xem trước `design-system.html` |
| `docs/` | Tài liệu: tổng quan, chức năng, màn hình, quy tắc & dữ liệu, kế hoạch test |
| `app/` | Code game: `index.html`, `style.css`, `game.js` |
| `server.js` | Server Node.js nhỏ phục vụ `app/` (và `design/tokens.css`) |
| `Dockerfile`, `compose.yaml` | Đóng gói và chạy bằng Docker |

## Cách chạy bằng Docker

**Cần có:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) hoặc Docker Engine + Docker Compose (Linux). Mở Docker Desktop và chờ biểu tượng chuyển sang "running".

1. Mở Terminal (hoặc PowerShell trên Windows) tại thư mục repo:

   ```bash
   cd chinhnd10
   ```

2. Build và khởi động (chạy nền):

   ```bash
   docker compose up -d --build
   ```

3. Mở trình duyệt: **http://localhost:3000**

4. Xem log khi cần:

   ```bash
   docker compose logs -f app
   ```

5. Dừng game:

   ```bash
   docker compose down
   ```

Sửa code trong `app/` xong thì chạy lại bước 2 để build bản mới.

**Lỗi thường gặp**

- `port is already allocated`: cổng 3000 đang bị chương trình khác dùng. Tắt chương trình đó, hoặc sửa dòng `"3000:3000"` trong `compose.yaml` thành `"3001:3000"` rồi mở http://localhost:3001.
- `Cannot connect to the Docker daemon`: Docker Desktop chưa chạy.

## Chạy không cần Docker

Cần Node.js 18 trở lên:

```bash
npm start
```

Rồi mở http://localhost:3000. Hoặc mở thẳng file `app/index.html` bằng trình duyệt.

## Phím tắt trong game

- `Enter` / `Space`: bắt đầu, chơi lại
- `P` / `Esc`: tạm dừng, tiếp tục
- `D`: bật/tắt bảng gỡ lỗi (hoặc mở với `?debug=1`)
