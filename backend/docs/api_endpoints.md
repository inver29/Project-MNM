# API Endpoints

Tat ca endpoint duoc public tai prefix `/api/v1`.
Phan quyen duoc chia thanh 3 nhom:

- `Public`: khong can dang nhap
- `User`: can dang nhap
- `Admin/Nhan vien`: can quyen quan tri hoac nhan vien

## Health

- `GET /health` - Public

## Auth

- `POST /auth/register` - Public
- `POST /auth/login` - Public
- `GET /auth/me` - User
- `PUT /auth/me` - User

## Tai khoan

- `GET /accounts` - Admin
  - Query: `search`, `role`, `is_active`
- `GET /accounts/{account_id}` - Admin
- `POST /accounts` - Admin
- `PUT /accounts/{account_id}` - Admin
- `DELETE /accounts/{account_id}` - Admin

## Khong gian

- `GET /spaces` - Public
  - Query: `visible_only` (`false` chi danh cho Admin/Nhan vien)
- `POST /spaces` - Admin/Nhan vien
- `PUT /spaces/{space_id}` - Admin/Nhan vien
- `DELETE /spaces/{space_id}` - Admin

## San pham

- `GET /items` - Public
  - Query: `search`, `space_slug`, `featured_only`, `published_only`
  - `published_only=false` chi danh cho Admin/Nhan vien
- `GET /items/{item_id}` - Public
- `GET /items/by-slug/{slug_token}` - Public
- `POST /items` - Admin/Nhan vien
- `PUT /items/{item_id}` - Admin/Nhan vien
- `DELETE /items/{item_id}` - Admin

## Don hang

- `GET /orders` - User
  - Query: `scope`
  - `scope=mine` cho user thuong
  - `scope=all` chi danh cho Admin/Nhan vien
- `GET /orders/{sales_order_id}` - User
- `POST /orders` - User
- `POST /orders/{sales_order_id}/cancel` - User so huu don
- `POST /orders/{sales_order_id}/confirm-received` - User so huu don
- `PATCH /orders/{sales_order_id}/status` - Admin/Nhan vien
- `DELETE /orders/{sales_order_id}` - Admin, chi ap dung cho don da huy

## Uploads

- `POST /uploads/product-image` - Admin/Nhan vien
- `POST /uploads/space-image` - Admin/Nhan vien

## Ghi chu

- Danh sach test request tuong ung duoc luu tai `submission/postman_collection.json`.
- Swagger UI co san tai `/docs` de minh hoa va doi chieu endpoint trong bao cao.
