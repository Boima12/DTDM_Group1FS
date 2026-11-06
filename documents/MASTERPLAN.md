# GIAI ĐOẠN 1: KHỞI TẠO DỰ ÁN & THIẾT LẬP KẾT NỐI (PROJECT SETUP)
### 1.1 [Backend] Khởi tạo Server Node.js/Express & Kết nối MongoDB Atlas
- Khởi tạo dự án `npm init -y`, cài đặt `express`, `mongoose`, `dotenv`, `cors`, `multer`, `gridfs-stream`.
- Cấu hình file `.env` chứa `MONGO_URI` và `PORT`.
- Viết module kết nối MongoDB Atlas sử dụng Mongoose và khởi tạo `GridFSBucket`.
- Kiểm tra kết nối từ server tới cụm MongoDB Atlas.

### 1.2 [Frontend] Khởi tạo ứng dụng React Vite & Cấu hình Tailwind CSS
- Khởi tạo dự án React bằng Vite.
- Cài đặt và cấu hình Tailwind CSS, Lucide-react (icons).
- Cấu hình Axios / Fetch client với `baseURL` trỏ về Backend API.
- Thiết kế Layout khung: Header (chứa tên đề tài), Toolbar (thanh công cụ tìm kiếm, lọc, nút upload), và Vùng hiển thị file chính.
<br><br>



# GIAI ĐOẠN 2: CORE MODULE - UPLOAD, DANH SÁCH & TẢI VỀ FILE
###  2.1 [API] Endpoint Upload File vào GridFS với Validation (Chức năng 1, 10)
- Cấu hình Multer lưu tạm bộ nhớ (MemoryStorage) hoặc Stream trực tiếp vào `GridFSBucket`.
- Xây dựng middleware kiểm tra kích thước tối đa cho phép (ví dụ: max 50MB/file) và đuôi file.
- Viết API `POST /api/files/upload` tiếp nhận 1 hoặc nhiều file, ghi metadata vào GridFS.
- Xử lý trả về status code 201 khi thành công, mã 400 khi file không hợp lệ.
 
###  2.2 [API] Endpoint Lấy danh sách & Tải về file (Chức năng 2, 3)
- Viết API `GET /api/files`: truy vấn danh sách file từ `fs.files` (lấy tên, loại, dung lượng, ngày tải).
- Viết API `GET /api/files/:id/download`: mở `openDownloadStream` từ GridFSBucket và pipe dữ liệu về client với header `Content-Disposition: attachment`.
 
###  2.3 [UI] Vùng Upload File & Trạng thái tải lên (Chức năng 1, 10, 11)
- Tạo giao diện kéo thả file (Drag & Drop zone) hoặc bấm nút chọn file.
- Kiểm tra dung lượng và định dạng file ngay tại client trước khi gửi request.
- Hiển thị thanh tiến trình tải lên (Progress bar) hoặc trạng thái "Đang tải", "Thành công", "Lỗi" bằng Toast notification.
 
###  2.4 [UI] Bảng danh sách tệp tin & Nút Tải xuống (Chức năng 2, 3)
- Xây dựng bảng/lưới (Table / Grid View) hiển thị danh sách file: Icon loại file, Tên, Dung lượng (format KB/MB), Ngày upload.
- Gắn sự kiện nút "Tải xuống" kích hoạt tải file về máy tính người dùng.
<br><br>



# GIAI ĐOẠN 3: XỬ LÝ FILE NÂNG CAO - XEM TRƯỚC, ĐỔI TÊN, XÓA & THÔNG TIN
###  3.1 [API] Endpoints Preview, Rename, Delete & Metadata (Chức năng 4, 5, 6, 9)
- Viết API `GET /api/files/:id/preview`: stream file nhị phân với đúng header `Content-Type` để trình duyệt đọc trực tiếp (ảnh, pdf, txt).
- Viết API `PATCH /api/files/:id/rename`: nhận `newFilename` và cập nhật trường `filename` trong `fs.files`.
- Viết API `DELETE /api/files/:id`: gọi `gridfsBucket.delete(new ObjectId(id))` để xóa sạch file và toàn bộ chunks liên kết trong GridFS.
- Viết API `GET /api/files/:id/info`: trả về chi tiết metadata của file.
 
###  3.2 [UI] Modal Xem trước tệp tin (File Preview Modal) (Chức năng 4)
- Xây dựng Modal xem trước hỗ trợ: hiển thị ảnh <img### , file PDF qua <iframe### /<embed### , văn bản thuần <pre### 
- Với các định dạng không hỗ trợ xem trước, hiển thị thông báo "Không hỗ trợ xem trước, vui lòng tải về".

###  3.3 [UI] Đổi tên & Hộp thoại Xác nhận Xóa (Chức năng 5, 6, 12)
- Tạo Modal/Prompt cho phép nhập tên mới và gọi API đổi tên.
- Tạo Modal xác nhận trước khi xóa (Confirm Delete Modal): "Bạn có chắc chắn muốn xóa file [Tên file] không?" để tránh người dùng thao tác nhầm.
- Tự động reload danh sách file sau khi xóa hoặc đổi tên thành công.

###  3.4 [UI] Drawer / Modal Xem thông tin chi tiết (Chức năng 9)
- Thiết kế bảng popup hiển thị đầy đủ: Tên file, Tên gốc ban đầu, Định dạng MIME, Dung lượng chính xác theo bytes, ID trong GridFS, Ngày giờ tải lên chi tiết.
<br><br>



# GIAI ĐOẠN 4: TÌM KIẾM, LỌC, SẮP XẾP & HOÀN THIỆN TRẢI NGHIỆM
###  4.1 [Fullstack] Tìm kiếm tệp tin theo tên (Chức năng 7)
- Backend: Bổ sung query parameter `?search=keyword` cho API `GET /api/files` sử dụng Regex hoặc Text Search trên MongoDB.
- Frontend: Ô tìm kiếm (Search bar) có cơ chế Debounce (khoảng 300ms) để lọc danh sách file theo thời gian thực.
 
###  4.2 [Fullstack] Lọc & Sắp xếp danh sách tệp tin (Chức năng 8)
- Dropdown Lọc theo loại file: Tất cả, Hình ảnh (`image/`), Tài liệu (`application/pdf`, `.docx`...), Khác.
- Dropdown Sắp xếp theo tiêu chí: Tên (A-Z, Z-A), Kích thước (Tăng dần/Giảm dần), Ngày tải lên (Mới nhất/Cũ nhất).
 
###  4.3 [Frontend] Xử lý trạng thái rỗng và cảnh báo (Chức năng 11)
- Thiết kế giao diện Empty State khi chưa có file nào hoặc không tìm thấy kết quả tìm kiếm.
- Rà soát toàn bộ các thông báo lỗi: mất mạng, upload file quá lớn, lỗi máy chủ.
<br><br>



# GIAI ĐOẠN 5: KIỂM THỬ & CHUẨN BỊ TRIỂN KHAI RENDER
###  5.1 [Testing] Kiểm thử toàn diện 12 chức năng trên Local
- Chạy kịch bản kiểm thử: Upload file thường, file lớn, file sai định dạng, đổi tên, xóa có confirm, tải xuống và xem trước.
- Kiểm tra dữ liệu thực tế bên trong cụm MongoDB Atlas (collection `fs.files` và `fs.chunks`).
 
###  5.2 [Deploy Prep] Chuẩn bị triển khai lên Render [!document trong tài liệu báo cáo chương 3!]
- Cấu hình Backend lắng nghe trên host `0.0.0.0` và cổng `process.env.PORT` theo quy định của Render.
- Thiết lập build script cho Frontend và cấu hình phục vụ static files hoặc tách riêng Frontend/Backend Web Service trên Render.
- Đẩy toàn bộ mã nguồn lên Git/GitHub repository sẵn sàng cho việc kết nối webhook tự động của Render.


