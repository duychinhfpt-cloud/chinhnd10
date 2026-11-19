# Đập Chuột

Mini game phản xạ chạy trên trình duyệt: lưới 3×3, mỗi lượt 30 giây, đập trúng được 1 điểm, độ khó tăng dần qua 3 chặng (Khởi động → Tăng tốc → Bão tuyết).

Từ v1.1: người chơi đăng ký (họ tên, email, số điện thoại) trước khi chơi, dữ liệu lưu trong PostgreSQL; trang admin ở `/admin` để xem, tìm kiếm, sắp xếp, xoá (từng người hoặc nhiều người), xuất CSV; quản lý nhiều tài khoản admin và đổi mật khẩu.

## Cấu trúc

| Thư mục / file | Nội dung |
|---|---|
| `YEU-CAU.md` | Yêu cầu ban đầu |
| `design/` | Design system: `tokens.css`, trang xem trước `design-system.html` |
| `docs/` | Tài liệu: tổng quan, chức năng, màn hình, quy tắc & dữ liệu, kế hoạch test |
| `app/` | Code game: `index.html`, `style.css`, `game.js` |
| `admin/` | Trang quản trị (đăng nhập, danh sách người chơi) |
| `server.js`, `server/` | Server Node.js: phục vụ game, API đăng ký/điểm, API admin |
| `.env.example` | Mẫu cấu hình mật khẩu (chép thành `.env`) |
| `Dockerfile`, `compose.yaml` | Đóng gói và chạy bằng Docker |

## Cách chạy bằng Docker

**Cần có:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) hoặc Docker Engine + Docker Compose (Linux). Mở Docker Desktop và chờ biểu tượng chuyển sang "running".

1. Mở Terminal (hoặc PowerShell trên Windows) tại thư mục repo:

   ```bash
   cd chinhnd10
   ```

2. **Lần đầu:** tạo file `.env` từ mẫu rồi mở `.env` đổi 2 mật khẩu (database và admin, admin tối thiểu 8 ký tự):

   ```bash
   cp .env.example .env
   ```

   Trên Windows (PowerShell): `Copy-Item .env.example .env`

3. Build và khởi động (chạy nền):

   ```bash
   docker compose up -d --build
   ```

4. Mở trình duyệt:
   - Game: **http://localhost:3000**
   - Trang admin: **http://localhost:3000/admin** (lần đầu đăng nhập bằng `ADMIN_USER` / `ADMIN_PASSWORD` trong `.env`; sau đó thêm tài khoản và đổi mật khẩu ngay trên trang admin)

5. Xem log khi cần:

   ```bash
   docker compose logs -f app db
   ```

6. Dừng game (dữ liệu người chơi vẫn giữ trong volume `db-data`):

   ```bash
   docker compose down
   ```

Sửa code xong thì chạy lại bước 3 để build bản mới. Muốn xoá sạch dữ liệu người chơi: `docker compose down -v`.

**Lỗi thường gặp**

- `port is already allocated`: cổng 3000 đang bị chương trình khác dùng. Tắt chương trình đó, hoặc sửa dòng `"3000:3000"` trong `compose.yaml` thành `"3001:3000"` rồi mở http://localhost:3001.
- `Cannot connect to the Docker daemon`: Docker Desktop chưa chạy.
- `Thiếu POSTGRES_USER trong .env` (hoặc biến khác): chưa tạo file `.env`, xem bước 2.
- Trang admin không đăng nhập được: kiểm tra `ADMIN_PASSWORD` trong `.env` có ít nhất 8 ký tự, sửa xong chạy lại bước 3.

## Đưa lên Internet với tên miền riêng (Render.com, miễn phí)

Repo có sẵn `render.yaml`: Render tự tạo dịch vụ web (chạy `Dockerfile`) và database PostgreSQL.

1. Vào https://render.com, bấm **Get Started**, đăng nhập bằng **GitHub** (tài khoản sở hữu repo này).
2. Bấm **New +** → **Blueprint** → chọn repo này → **Connect**.
3. Render hỏi `ADMIN_PASSWORD`: nhập mật khẩu admin (tối thiểu 8 ký tự) → **Apply**. Chờ 3–5 phút đến khi dịch vụ `dap-chuot` báo **Live**; game chạy ở địa chỉ `https://dap-chuot-xxxx.onrender.com`.
4. Gắn tên miền: mở dịch vụ `dap-chuot` → **Settings** → **Custom Domains** → **Add Custom Domain** → nhập tên miền (ví dụ `vf3.io.vn`), làm thêm một lần với `www.vf3.io.vn`.
5. Vào trang quản lý DNS của nhà cung cấp tên miền, thêm đúng các bản ghi Render hiển thị, thường là:
   - `A` · tên `@` · giá trị `216.24.57.1`
   - `CNAME` · tên `www` · giá trị `dap-chuot-xxxx.onrender.com`
6. Quay lại Render bấm **Verify**. Khi xong, Render tự cấp HTTPS; mở `https://vf3.io.vn` để chơi, `https://vf3.io.vn/admin` để quản trị (đăng nhập `admin` / mật khẩu bước 3).

Lưu ý gói miễn phí: dịch vụ web "ngủ" sau 15 phút không có người vào, lần mở đầu tiên sau đó chờ khoảng 1 phút. Database miễn phí của Render có thời hạn; hết hạn cần nâng gói hoặc chuyển sang database khác (chỉ cần đổi biến `DATABASE_URL`).

## Chạy không cần Docker

Từ v1.1 game cần server và database để đăng ký người chơi, nên mở thẳng file `app/index.html` sẽ dừng ở màn hình đăng ký. Hãy chạy bằng Docker như trên.

## Phím tắt trong game

- `Enter` / `Space`: bắt đầu, chơi lại
- `P` / `Esc`: tạm dừng, tiếp tục
- `D`: bật/tắt bảng gỡ lỗi (hoặc mở với `?debug=1`)
