# DTDM — Group1FS v2.0 (Cloud File Storage & GridFS Showcase)

Hệ thống lưu trữ đám mây hiện đại (**Google Drive Mini + GridFS Architecture Showcase**) phục vụ đồ án môn **Điện Toán Đám Mây**, xây dựng với **React 19 + Vite + TailwindCSS v4 + Node.js Express 5 + MongoDB Atlas GridFS**.

## Tính năng nổi bật ở phiên bản `v2.0`
- **Zero-RAM Streaming Upload & SHA-256**: Truyền thẳng tệp từ ổ đĩa tạm vào `GridFSBucket` chống tràn RAM container 512MB trên Render, hỗ trợ tải song song, đo tốc độ `MB/s` + ETA, hủy bằng `AbortController`, thử lại 1 click và tự sửa lỗi font tiếng Việt UTF-8.
- **HTTP 206 Partial Content Range Streaming**: Phát và tua Video/Audio tức thì (`.mp4`, `.mov`, `.webm`, `.ogg`, `.mp3`), hỗ trợ xem trước Ảnh (Zoom/Xoay/Kéo), PDF, Code/JSON/Markdown và Bảng CSV trực quan.
- **GridFS Chunk X-Ray Visualizer & SHA-256 Verify**: Soi trực tiếp từng khối 255 KiB trong collection `fs.chunks` và bấm kiểm định toàn vẹn dữ liệu SHA-256 theo thời gian thực.
- **Live Cloud Telemetry Dashboard**: Theo dõi độ trễ MongoDB Atlas (`ms`), bộ nhớ RAM container thực tế, tổng số chunk GridFS, phân bổ dung lượng theo loại tệp và quản lý worker tự động dọn rác 30 ngày.
- **Thư mục đa cấp (Folders) + Kéo-thả + Dán ảnh `Ctrl+V`**: Tạo/sửa màu/xóa thư mục, Breadcrumb điều hướng, kéo thả file vào thư mục hoặc thả tệp vào bất kỳ vị trí nào trên màn hình.
- **Chia sẻ Công khai kèm Mã QR (`/share/:token`)**: Sinh liên kết chia sẻ có thời hạn, phân quyền Chỉ xem / Cho tải, khóa mật khẩu tùy chọn và mã QR quét mở ngay trên điện thoại.
- **Đa tài khoản JWT + Không gian Demo 1-Click + Phiên bản tệp (`v1, v2...`) + Nhật ký hoạt động (Audit Log)**.
- **UI/UX Pro**: Chế độ Sáng/Tối (**Dark/Light Mode**), chuyển ngôn ngữ **EN / VI**, Command Palette (**`Ctrl+K`**), Toast kèm nút **Hoàn tác (Undo)**.

---

## Cách chạy nhanh

### 1. Chạy phát triển cục bộ (Local Dev)
```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env   # Điền MONGO_URI của bạn
npm install
npm run dev

# (Tùy chọn) Nạp sẵn dữ liệu mẫu đẹp để demo
npm run seed:demo

# Terminal 2 — Frontend
cd frontend/Group1FS
cp .env.example .env
npm install
npm run dev
```

### 2. Chạy Offline Demo "Bất Tử" bằng Docker Compose (Không cần Wi-Fi / Atlas)
```bash
docker compose up --build -d
# Nạp bộ dữ liệu mẫu demo vào MongoDB local:
docker compose exec group1fs npm run seed:demo
# Mở trình duyệt tại: http://localhost:5000
```

### 3. Chạy Bộ Kiểm Thử Tích Hợp Backend (10 kịch bản tự động)
```bash
cd backend
npm test
```

### 4. Triển khai lên Render (1-Click Blueprint)
Kết nối kho GitHub này với Render Blueprint sử dụng tệp `render.yaml` có sẵn và nhập biến môi trường `MONGO_URI`.

---

## Quy tắc Git Branch
- Nhánh `main` được bảo vệ — tuyệt đối không merge/push trực tiếp vào `main`.
- Mọi tính năng mới phát triển trên nhánh `feature/<branch-name>` và tạo Pull Request để review.
