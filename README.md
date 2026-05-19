# Nội Thất Mộc Việt

Project web cuối kỳ được xây dựng theo mô hình:

- Frontend: React + Vite + TypeScript.
- Backend: FastAPI + SQLAlchemy.
- Database: PostgreSQL.
- Giao tiếp: HTTP/JSON REST API.

## Mục tiêu

- Đáp ứng yêu cầu môn học về ứng dụng web React và backend RESTful API.
- Thiết kế cơ sở dữ liệu mới hoàn toàn cho đề tài bán hàng nội thất.
- Có CRUD đầy đủ cho các nhóm dữ liệu chính.
- Có xác thực người dùng và danh sách endpoint để đưa vào báo cáo.

## Cấu trúc thư mục

- `frontend`: giao diện React cho người dùng cuối.
- `backend`: REST API FastAPI và tài liệu database.
- `submission`: tài liệu phụ trợ báo cáo, demo và Postman.

## Yêu cầu môi trường
Cần cài đặt sẵn các công cụ sau trước khi chạy project:

- Python 3.12 hoặc mới hơn.
- PostgreSQL 16.
- Bun runtime.
- Docker và Docker Compose (nếu chạy bằng Docker).
- pgAdmin 4 để restore file .backup.

## Kiểm tra phiên bản

- python3 --version
- psql --version
- bun --version
- docker --version
- docker compose version

## Clone project
- git clone <repository_url>
- cd <project_folder>

## Chạy local với PostgreSQL

### 1. Tạo database

- Tạo database với tên `cua_hang_noi_that_db`.
- Mật khẩu PostgreSQL mặc định được cấu hình là `2906`. Nếu sử dụng mật khẩu khác, cần chỉnh lại biến `DATABASE_URL` trong file `backend/.env`.

### 2. Nhập dữ liệu database bằng file .backup

Để nhập dữ liệu database từ file `cua_hang_noi_that_db.backup`, thực hiện như sau:

- Mở pgAdmin và tạo database mới tên `cua_hang_noi_that_db`.
- Chuột phải vào database vừa tạo, chọn `Restore...`.
- Ở mục `Filename`, chọn file từ folder `submission/cua_hang_noi_that_db.backup`.
- Ở mục `Format`, chọn `Custom or tar`, sau đó bấm `Restore`.
- Khi restore xong, mở Query Tool và chạy lệnh `SELECT * FROM san_pham;` để kiểm tra dữ liệu.
- Nếu bảng sản phẩm có dữ liệu hiển thị, database đã được khôi phục thành công.

### 3. Chạy backend

- cd backend
- python3 -m venv .venv
- copy .env.example .env `hoặc` cp .env.example .env
- source .venv/bin/activate
- pip install -r requirements.txt
- uvicorn app.main:app --reload

- API docs: `http://127.0.0.1:8000/docs`.

### 4. Chạy frontend

- cd frontend
- copy .env.example .env
- bun install
- bun run dev

- Frontend dev server được cấu hình mặc định tại `http://localhost:8080`.

### 5. Tài khoản mặc định

- Admin: `admin@cuahangnoithat.com` / `Admin@12345`.
- Customer: `khachhang@cuahangnoithat.com` / `Customer@12345`.

## Triển khai Linux bằng Docker

Project đã có sẵn:

- `docker-compose.yml`.
- `backend/Dockerfile`.
- `frontend/Dockerfile`.
- `frontend/nginx.conf`.

Cài đặt `docker`

Mở terminal trên Linux và chạy các lệnh sau:

- sudo apt update
- sudo apt install -y docker.io docker-compose-v2
- sudo systemctl enable --now docker
- docker --version
- docker compose version

Chạy toàn bộ hệ thống bằng lệnh:

- sudo docker compose up --build

Sau khi chạy thành công:

- Frontend: `http://localhost:8080`.
- Backend docs: `http://localhost:8000/docs`.
- PostgreSQL: port `5432`.

Thư mục `backend/uploads` được mount vào container backend để giữ lại ảnh catalog và ảnh upload khi khi triển khai hệ thống bằng Docker.

## Tài liệu quan trọng

- Endpoint list: `backend/docs/api_endpoints.md`.
- Database dictionary: `backend/docs/database_dictionary.md`.
- PostgreSQL schema: `backend/docs/postgresql_schema.sql`.
- Báo cáo khung: `submission/bao_cao_khung.md`.
- Postman collection: `submission/postman_collection.json`.
- PostgreSQL backup: `submission/cua_hang_noi_that_db.backup`.
