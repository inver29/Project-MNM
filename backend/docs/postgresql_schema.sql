CREATE TABLE tai_khoan (
    ma_tai_khoan BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    mat_khau VARCHAR(255) NOT NULL,
    ho_ten VARCHAR(150) NOT NULL,
    so_dien_thoai VARCHAR(20),
    vai_tro VARCHAR(20) NOT NULL DEFAULT 'khach_hang',
    dang_hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tai_khoan_email UNIQUE (email),
    CONSTRAINT ck_tai_khoan_vai_tro CHECK (vai_tro IN ('admin', 'nhan_vien', 'khach_hang'))
);

CREATE INDEX idx_tai_khoan_email ON tai_khoan(email);

CREATE TABLE khong_gian (
    ma_khong_gian BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ten_khong_gian VARCHAR(100) NOT NULL,
    mo_ta TEXT,
    dang_hien_thi BOOLEAN NOT NULL DEFAULT TRUE,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_khong_gian_ten UNIQUE (ten_khong_gian)
);

CREATE TABLE san_pham (
    ma_san_pham BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ma_khong_gian BIGINT NOT NULL,
    ten_san_pham VARCHAR(200) NOT NULL,
    mo_ta TEXT,
    chat_lieu VARCHAR(120),
    mau_sac VARCHAR(120),
    kich_thuoc VARCHAR(120),
    gia_ban NUMERIC(14,0) NOT NULL,
    so_luong_ton INTEGER NOT NULL DEFAULT 0,
    anh_dai_dien VARCHAR(500),
    dang_kinh_doanh BOOLEAN NOT NULL DEFAULT TRUE,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_san_pham_khong_gian
        FOREIGN KEY (ma_khong_gian)
        REFERENCES khong_gian(ma_khong_gian)
        ON DELETE RESTRICT,
    CONSTRAINT ck_san_pham_gia_ban CHECK (gia_ban >= 0),
    CONSTRAINT ck_san_pham_so_luong_ton CHECK (so_luong_ton >= 0)
);

CREATE INDEX idx_san_pham_ma_khong_gian ON san_pham(ma_khong_gian);
CREATE INDEX idx_san_pham_ten_san_pham ON san_pham(ten_san_pham);

CREATE TABLE don_hang (
    ma_don_hang BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    so_don_hang VARCHAR(30) NOT NULL,
    ma_tai_khoan BIGINT NOT NULL,
    ten_nguoi_nhan VARCHAR(150) NOT NULL,
    so_dien_thoai_nhan VARCHAR(20) NOT NULL,
    dia_chi_giao TEXT NOT NULL,
    phuong_thuc_thanh_toan VARCHAR(30) NOT NULL DEFAULT 'tien_mat',
    trang_thai_don_hang VARCHAR(30) NOT NULL DEFAULT 'cho_xac_nhan',
    tong_tien NUMERIC(14,0) NOT NULL,
    ghi_chu TEXT,
    ngay_dat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_don_hang_so_don_hang UNIQUE (so_don_hang),
    CONSTRAINT fk_don_hang_tai_khoan
        FOREIGN KEY (ma_tai_khoan)
        REFERENCES tai_khoan(ma_tai_khoan)
        ON DELETE RESTRICT,
    CONSTRAINT ck_don_hang_phuong_thuc_thanh_toan
        CHECK (phuong_thuc_thanh_toan IN ('tien_mat', 'chuyen_khoan')),
    CONSTRAINT ck_don_hang_trang_thai
        CHECK (trang_thai_don_hang IN ('cho_xac_nhan', 'da_xac_nhan', 'dang_giao', 'hoan_thanh', 'da_huy')),
    CONSTRAINT ck_don_hang_tong_tien CHECK (tong_tien >= 0)
);

CREATE INDEX idx_don_hang_ma_tai_khoan ON don_hang(ma_tai_khoan);
CREATE INDEX idx_don_hang_ngay_dat ON don_hang(ngay_dat);
CREATE INDEX idx_don_hang_trang_thai ON don_hang(trang_thai_don_hang);

CREATE TABLE chi_tiet_don_hang (
    ma_chi_tiet_don_hang BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ma_don_hang BIGINT NOT NULL,
    ma_san_pham BIGINT NOT NULL,
    ten_san_pham_luc_dat VARCHAR(200) NOT NULL,
    gia_luc_dat NUMERIC(14,0) NOT NULL,
    so_luong INTEGER NOT NULL,
    thanh_tien NUMERIC(14,0) NOT NULL,
    ngay_tao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chi_tiet_don_hang_don_hang
        FOREIGN KEY (ma_don_hang)
        REFERENCES don_hang(ma_don_hang)
        ON DELETE CASCADE,
    CONSTRAINT fk_chi_tiet_don_hang_san_pham
        FOREIGN KEY (ma_san_pham)
        REFERENCES san_pham(ma_san_pham)
        ON DELETE RESTRICT,
    CONSTRAINT uq_chi_tiet_don_hang_ma_don_hang_ma_san_pham UNIQUE (ma_don_hang, ma_san_pham),
    CONSTRAINT ck_chi_tiet_don_hang_so_luong CHECK (so_luong > 0),
    CONSTRAINT ck_chi_tiet_don_hang_gia_luc_dat CHECK (gia_luc_dat >= 0),
    CONSTRAINT ck_chi_tiet_don_hang_thanh_tien CHECK (thanh_tien >= 0)
);

CREATE INDEX idx_chi_tiet_don_hang_ma_don_hang ON chi_tiet_don_hang(ma_don_hang);
CREATE INDEX idx_chi_tiet_don_hang_ma_san_pham ON chi_tiet_don_hang(ma_san_pham);

CREATE OR REPLACE FUNCTION cap_nhat_thoi_gian_sua()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ngay_cap_nhat = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tai_khoan_ngay_cap_nhat
BEFORE UPDATE ON tai_khoan
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_thoi_gian_sua();

CREATE TRIGGER trg_khong_gian_ngay_cap_nhat
BEFORE UPDATE ON khong_gian
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_thoi_gian_sua();

CREATE TRIGGER trg_san_pham_ngay_cap_nhat
BEFORE UPDATE ON san_pham
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_thoi_gian_sua();

CREATE TRIGGER trg_don_hang_ngay_cap_nhat
BEFORE UPDATE ON don_hang
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_thoi_gian_sua();

INSERT INTO khong_gian (ten_khong_gian, mo_ta) VALUES
('Phong khach', 'Cac san pham noi that cho phong khach'),
('Phong ngu', 'Cac san pham noi that cho phong ngu'),
('Phong an', 'Cac san pham noi that cho phong an'),
('Phong lam viec', 'Cac san pham noi that cho phong lam viec');
