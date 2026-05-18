# Bao Cao Cuoi Ky

## Chuong 1. Tom tat ly thuyet

### 1.1 RESTful API

- Khai niem RESTful API, endpoint, method GET/POST/PUT/PATCH/DELETE
- Cach frontend va backend giao tiep qua HTTP/JSON
- Ly do chon FastAPI cho backend

### 1.2 Xac thuc va phan quyen

- Co che JWT access token
- Phan biet guest, user, admin/nhan vien
- Cac diem can bao ve o phia backend

### 1.3 Co so du lieu quan he

- Vai tro cua PostgreSQL trong he thong
- Khoa chinh, khoa ngoai, unique, check constraint
- Cach mo hinh hoa don hang va chi tiet don hang

## Chuong 2. Dac ta du an

### 2.1 Gioi thieu de tai

- Ten de tai: He thong web kinh doanh noi that Noi That Moc Viet
- Pham vi: ung dung web ban noi that, tach rieng frontend va backend
- Nguoi dung muc tieu: khach hang mua sam va quan tri vien

### 2.2 Muc tieu

- Xay dung frontend React va backend FastAPI tach biet
- Cung cap RESTful API cho nghiep vu chinh
- Co database moi va thong tin minh chung de nop bao cao
- Hoan thanh xac thuc nguoi dung, CRUD, va logic dat hang

### 2.3 Yeu cau chuc nang

- Dang ky tai khoan
- Dang nhap va cap nhat ho so
- Xem khong gian noi that
- Xem danh sach va chi tiet san pham
- Them vao gio hang va thanh toan
- Xem lich su don hang, huy don, xac nhan da nhan hang
- CRUD tai khoan, khong gian, san pham, don hang trong khu admin
- Upload anh cho san pham va khong gian

### 2.4 Yeu cau phi chuc nang

- Frontend va backend giao tiep qua HTTP/API
- API co the test bang Swagger va Postman
- Giao dien responsive tren desktop va mobile web
- Du lieu duoc luu trong PostgreSQL
- Co the release tren Linux bang Docker

## Chuong 3. Thiet ke

### 3.1 Thiet ke he thong

- Trinh bay kien truc tong the theo `submission/system_design.md`
- Chen so do system architecture
- Chen so do release architecture neu demo Docker

### 3.2 Mo hinh use case

- Guest: xem san pham, dang ky
- User: dang nhap, dat hang, theo doi don
- Admin/Nhan vien: quan ly du lieu va xu ly don hang
- Chen so do use case

### 3.3 Thiet ke database

Su dung:

- `backend/docs/database_dictionary.md`
- `backend/docs/postgresql_schema.sql`
- `submission/system_design.md`

Can trinh bay:

- Danh sach bang
- Khoa chinh, khoa ngoai
- Unique, check constraint
- Y nghia nghiep vu cua tung bang
- Lien he giua `tai_khoan`, `khong_gian`, `san_pham`, `don_hang`, `chi_tiet_don_hang`

### 3.4 Thiet ke giao dien

- Nguyen tac bo cuc user va admin
- Danh sach man hinh chinh
- Mo ta luong thao tac nguoi dung
- Chen anh wireframe/mockup neu co
- Chen screenshot thuc te cua giao dien sau khi hoan thanh

## Chuong 4. Trien khai du an

### 4.1 To chuc thanh phan internal

#### Frontend

- `src/pages`: man hinh nguoi dung va admin
- `src/components`: UI tai su dung
- `src/contexts`: auth, cart
- `src/lib`: API client, helper

#### Backend

- `app/api`: router va endpoint
- `app/models.py`: mo hinh bang
- `app/schemas`: request/response schemas
- `app/services`: seed va logic ho tro
- `app/core`: config, JWT, hash password

### 4.2 Thanh phan external

- PostgreSQL
- Swagger UI
- Postman
- Docker Compose / Nginx / Uvicorn

### 4.3 To chuc project

- `frontend`: ung dung React
- `backend`: FastAPI + docs database/API
- `submission`: khung bao cao, checklist demo, Postman collection

### 4.4 Danh sach endpoint

Su dung `backend/docs/api_endpoints.md`.
Can liet ke day du theo nhom:

- Health
- Auth
- Tai khoan
- Khong gian
- San pham
- Don hang
- Uploads

### 4.5 Kiem thu API

Cong cu:

- Swagger UI
- Postman collection tai `submission/postman_collection.json`

Can minh hoa:

- Register user moi
- Login user
- Login admin
- Lay danh sach khong gian va san pham
- Tao don hang
- Cap nhat trang thai don hang
- Huy don / xac nhan da nhan hang
- CRUD tai khoan hoac san pham bang admin

### 4.6 Cach release san pham

- Chay local voi PostgreSQL
- Chay bang Docker Compose tren Linux
- Chen minh chung terminal backend/frontend
- Chen minh chung `docker compose up --build` neu co

## Chuong 5. Ket qua va thao luan

### 5.1 Ket qua

- Trinh bay nhung chuc nang da hoan thanh
- Chen anh giao dien thuc te:
  - Trang chu
  - Danh sach san pham
  - Chi tiet san pham
  - Dang ky / Dang nhap
  - Gio hang / Thanh toan
  - Don hang
  - Admin dashboard
  - Admin quan ly tai khoan
  - Admin quan ly san pham
  - Swagger docs

### 5.2 Thao luan

- Nhung diem da dat
- Nhung diem chua dat
- Rủi ro ky thuat va cach khac phuc
- Bai hoc kinh nghiem trong qua trinh lam du an

### 5.3 Huong phat trien

- Thanh toan online
- Luu gio hang tren server
- Bo sung danh gia san pham, khuyen mai
- Mo rong mobile app neu can

## Tai lieu tham khao

- Tai lieu chinh thuc cua React
- Tai lieu chinh thuc cua FastAPI
- Tai lieu PostgreSQL
- Tai lieu Docker, Nginx, Uvicorn
- Cac document online hop le khac

## Phu luc

### A. Bang phan cong cong viec

- Thanh vien 1:
- Thanh vien 2:
- Thanh vien 3:

### B. Tu danh gia

- Muc do dong gop tung thanh vien
- Kho khan gap phai
- De xuat cai thien quy trinh lam nhom

### C. Danh sach file nop

- Source code
- Bao cao PDF
- File PPT
- Screenshots
- Postman collection
- Database dictionary
- Endpoint list
