# Yêu cầu: Mini game "Đập Chuột" (trình duyệt)

## 1. Tổng quan

- **Thể loại:** game phản xạ, chơi một mình.
- **Nền tảng:** trình duyệt web trên máy tính và điện thoại (Chrome, Edge, Firefox, Safari bản mới).
- **Công nghệ:** HTML + CSS + JavaScript thuần, không cần server, mở file `index.html` là chơi được.
- **Mục tiêu người chơi:** đập trúng càng nhiều chuột càng tốt trong 30 giây.

## 2. Luật chơi

1. Bảng chơi là lưới **3×3 = 9 ô (hang)**.
2. Mỗi lượt chơi kéo dài **30 giây**, bắt đầu khi người chơi bấm nút **"Bắt đầu"**.
3. Trong lượt, chuột lần lượt **trồi lên ở một ô ngẫu nhiên**:
   - Mỗi lúc chỉ có **tối đa 1 chuột** trên bảng.
   - Chuột ở trên mặt đất khoảng **0,8 – 1,2 giây** (ngẫu nhiên) rồi tự lặn xuống.
   - Sau khi chuột lặn hoặc bị đập, chuột tiếp theo xuất hiện sau **0,2 – 0,5 giây**.
   - Chuột mới **không xuất hiện lại ở đúng ô vừa xong** (tránh lặp liên tiếp).
4. Người chơi **bấm/chạm vào ô có chuột** để đập. Chuột bị đập lặn xuống ngay.
5. Bấm vào ô trống hoặc bấm khi chuột đã lặn thì **không có tác dụng** (không trừ điểm).
6. Hết 30 giây: chuột biến mất, bảng bị khóa (không bấm được nữa), hiện màn hình kết quả.
7. Người chơi có thể **chơi lại** bất cứ lúc nào sau khi kết thúc lượt.

## 3. Cách tính điểm

| Hành động | Điểm |
|---|---|
| Đập trúng chuột | **+1** |
| Bấm trượt (ô trống) | 0 |
| Để chuột lặn mất | 0 |

- Mỗi con chuột chỉ được tính **tối đa 1 điểm**, kể cả khi bấm liên tục nhiều lần vào nó.
- Điểm bắt đầu từ **0** ở mỗi lượt.
- **Kỷ lục (điểm cao nhất)** được lưu trên trình duyệt (`localStorage`), vẫn còn sau khi tải lại trang.
- Ở màn hình kết quả có hiển thị thêm (chỉ để tham khảo, không cộng vào điểm):
  - Số chuột đã xuất hiện.
  - Tỉ lệ trúng = số lần trúng / số chuột đã xuất hiện (%).

## 4. Màn hình

### 4.1. Màn hình bắt đầu
- Tên game "Đập Chuột".
- Mô tả luật ngắn trong một câu: *"Đập trúng chuột trong 30 giây, mỗi con được 1 điểm."*
- Kỷ lục hiện tại (hiện "—" nếu chưa chơi lần nào).
- Nút **"Bắt đầu"** to, dễ bấm.

### 4.2. Màn hình chơi
- **Thanh trên cùng:**
  - Điểm hiện tại (ví dụ `Điểm: 12`).
  - Thời gian còn lại, đếm ngược theo giây (ví dụ `⏱ 17s`). Từ **5 giây cuối**, số chuyển sang màu đỏ.
  - Kỷ lục.
- **Lưới 3×3** ở giữa màn hình:
  - Các ô vuông bằng nhau, có hình hang.
  - Chuột có hiệu ứng trồi lên và lặn xuống.
  - Khi đập trúng: chuột đổi hình (bị choáng) khoảng 0,2 giây và hiện chữ "+1" bay lên.
  - Con trỏ chuột trên máy tính có hình cái búa (nếu được).
- Không có nút tạm dừng (một lượt chỉ 30 giây).

### 4.3. Màn hình kết quả
- Dòng chữ **"Hết giờ!"**
- Điểm của lượt vừa chơi (chữ lớn).
- Số chuột xuất hiện và tỉ lệ trúng.
- Nếu phá kỷ lục: hiện thông báo **"Kỷ lục mới!"**
- Nút **"Chơi lại"**: vào lượt mới ngay, không qua màn hình bắt đầu.

### 4.4. Bố cục và hiển thị
- Hiển thị tốt từ màn hình **360px** (điện thoại) đến **1920px** (máy tính); lưới luôn vuông và nằm gọn trong màn hình, không phải cuộn.
- Ô đủ lớn để chạm bằng ngón tay (cạnh tối thiểu **80px** trên điện thoại).
- Chữ trên giao diện bằng **tiếng Việt**.
- Âm thanh (nếu có) mặc định **tắt** và có nút bật/tắt.

## 5. Tiêu chí hoàn thành

Game được xem là hoàn thành khi đáp ứng **tất cả** các tiêu chí sau:

### Chức năng
- [ ] Mở `index.html` bằng trình duyệt là chơi được, không có lỗi trong Console.
- [ ] Lưới hiển thị đúng 9 ô, xếp 3 hàng × 3 cột.
- [ ] Bấm "Bắt đầu" thì đồng hồ chạy từ 30 về 0 và chuột bắt đầu xuất hiện.
- [ ] Lượt kết thúc trong **30 giây ± 0,5 giây** (đo bằng đồng hồ ngoài).
- [ ] Mỗi lúc trên bảng có tối đa 1 chuột; chuột xuất hiện ở ô ngẫu nhiên và không lặp lại ô ngay trước đó.
- [ ] Đập trúng chuột thì điểm tăng đúng 1; bấm nhanh nhiều lần vào cùng một con vẫn chỉ được 1 điểm.
- [ ] Bấm ô trống không làm thay đổi điểm.
- [ ] Hết giờ thì không bấm được nữa và điểm không đổi thêm.
- [ ] Màn hình kết quả hiện đúng điểm, số chuột xuất hiện và tỉ lệ trúng.
- [ ] Kỷ lục được cập nhật khi điểm mới cao hơn và vẫn còn sau khi tải lại trang.
- [ ] "Chơi lại" đưa điểm về 0 và đồng hồ về 30 giây; chơi liên tiếp 5 lượt không bị lỗi (không có chuột "ma", đồng hồ không chạy nhanh lên).

### Giao diện và trải nghiệm
- [ ] Chơi được bằng chuột trên máy tính và bằng cảm ứng trên điện thoại.
- [ ] Bố cục không vỡ ở các chiều rộng 360px, 768px và 1920px.
- [ ] Có phản hồi hình ảnh rõ khi đập trúng (chuột đổi hình và hiện "+1").
- [ ] Thời gian còn lại chuyển màu đỏ ở 5 giây cuối.

### Kỹ thuật
- [ ] Không dùng thư viện ngoài và không cần kết nối mạng để chơi.
- [ ] Mã nguồn tách riêng thành `index.html`, `style.css`, `game.js`.
- [ ] Các thông số (thời gian lượt, thời gian chuột hiện, khoảng nghỉ) đặt thành hằng số ở đầu `game.js` để dễ chỉnh.

## 6. Ngoài phạm vi (phiên bản này)

- Nhiều mức độ khó, chuột tăng tốc dần.
- Vật phẩm đặc biệt (chuột vàng, bom trừ điểm).
- Bảng xếp hạng online, đăng nhập, chơi nhiều người.
