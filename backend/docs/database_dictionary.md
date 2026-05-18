# Tu Dien Co So Du Lieu

Database chinh thuc: `cua_hang_noi_that_db`

He thong su dung 5 bang chinh, dat ten theo kieu PostgreSQL: chu thuong, khong dau, ngan cach bang dau gach duoi.

## Danh sach bang

- `tai_khoan`
  - PK: `ma_tai_khoan`
  - UQ: `email`
  - Muc dich: luu thong tin dang ky, dang nhap va phan quyen nguoi dung.

- `khong_gian`
  - PK: `ma_khong_gian`
  - UQ: `ten_khong_gian`
  - Muc dich: nhom san pham theo tung khu vuc nhu phong khach, phong ngu, phong an, phong lam viec.

- `san_pham`
  - PK: `ma_san_pham`
  - FK: `ma_khong_gian -> khong_gian.ma_khong_gian`
  - Muc dich: luu thong tin san pham, anh dai dien va so luong ton tong.

- `don_hang`
  - PK: `ma_don_hang`
  - UQ: `so_don_hang`
  - FK: `ma_tai_khoan -> tai_khoan.ma_tai_khoan`
  - Muc dich: luu thong tin tong quan cua don hang.

- `chi_tiet_don_hang`
  - PK: `ma_chi_tiet_don_hang`
  - FK: `ma_don_hang -> don_hang.ma_don_hang`
  - FK: `ma_san_pham -> san_pham.ma_san_pham`
  - UQ: `(ma_don_hang, ma_san_pham)`
  - Muc dich: luu tung dong san pham trong don hang.

## Quan he tong quat

- 1 `tai_khoan` co nhieu `don_hang`
- 1 `khong_gian` co nhieu `san_pham`
- 1 `don_hang` co nhieu `chi_tiet_don_hang`
- 1 `san_pham` co nhieu `chi_tiet_don_hang`

## Rang buoc quan trong

- `tai_khoan.vai_tro` chi nhan cac gia tri: `admin`, `nhan_vien`, `khach_hang`
- `san_pham.gia_ban >= 0`
- `san_pham.so_luong_ton >= 0`
- `don_hang.phuong_thuc_thanh_toan` chi nhan `tien_mat` hoac `chuyen_khoan`
- `don_hang.trang_thai_don_hang` chi nhan:
  - `cho_xac_nhan`
  - `da_xac_nhan`
  - `dang_giao`
  - `hoan_thanh`
  - `da_huy`
- `chi_tiet_don_hang.so_luong > 0`
- `chi_tiet_don_hang.gia_luc_dat >= 0`
- `chi_tiet_don_hang.thanh_tien >= 0`
