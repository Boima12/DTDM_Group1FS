# DTDM - Group1FS

## Techstack được sử dụng trong đồ án này
**Frontend:**
<ol>
    <li>React Vite</li>
    <li>TailwindCSS</li>
    <li>Lucide-react (icons)</li>
</ol>
<br>

**Backend:**
<ol>
    <li>Nodejs Express</li>
    <li>MongoDB (database)</li>
    <li>MongoDB GridFS (Cũng là database nhưng dùng để chứa file nặng hơn)</li>
</ol>
<br><br>


## Quy tắc branch/push lên Github
- Branch Main đã được bảo vệ nên không thể push trực tiếp vào main, chỉ có thể pull request để các member review rồi sau đó mới gộp vào main

**Quy tắc đặt tên branch như sau:**
- **`feature/<branch-name>`**: Dành cho cập nhật tính năng mới.
  - _Example:_ `feature/login`, `feature/caregiver-schedule`
- **`bugfix/<branch-name>`**: Dành cho vá lỗi.
  - _Example:_ `bugfix/payment-retry`, `bugfix/session-expiry`
- **`refactor/<branch-name>`**: Dành cho việc sửa code cũ mà không thêm tính năng mới
  - _Example:_ `refactor/auth-middleware`

<br><br>


## Cách cập nhật branch main mới nhất từ GitHub về máy local của mình
```cmd
git checkout main
git fetch --all --prune
git pull origin main
```
<br><br>


## Cách chạy backend và frontend localhost
- Xem file `runCommand.md` để biết thêm chi tiết