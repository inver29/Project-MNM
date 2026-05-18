-- Tu dong sinh tu script replace_catalog_from_frontend_images.py
BEGIN;

-- An cac san pham cu da tung duoc dat hang de giu lich su don
UPDATE san_pham
SET dang_kinh_doanh = FALSE, ngay_cap_nhat = CURRENT_TIMESTAMP
WHERE ma_san_pham IN (SELECT DISTINCT ma_san_pham FROM chi_tiet_don_hang);

-- Xoa cac san pham cu chua phat sinh don hang
DELETE FROM san_pham
WHERE ma_san_pham NOT IN (SELECT DISTINCT ma_san_pham FROM chi_tiet_don_hang);

-- Chen bo san pham moi tu thu muc frontend/src/images
INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bộ bàn ăn 4 ghế Neva', 'Bộ bàn ăn 4 ghế phong cách hiện đại, phù hợp căn hộ gia đình nhỏ với bố cục gọn và tông màu ấm.',
    'Gỗ cao su tự nhiên, ghế bọc nệm vải', 'Nâu gỗ sáng', '140 x 80 x 75 cm',
    12990000, 20, '/uploads/products/catalog/phongbep-bo-ban-an-4-ghe-neva.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bộ bàn ăn Oval Wood', 'Mẫu bàn ăn mặt oval tạo cảm giác mềm hơn cho không gian bếp, đi kèm ghế đồng bộ và bề mặt dễ vệ sinh.',
    'Gỗ sồi veneer, chân gỗ đặc', 'Gỗ óc chó', '160 x 85 x 75 cm',
    14990000, 20, '/uploads/products/catalog/phongbep-bo-ban-an-oval-wood.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bộ bàn ăn Somin', 'Thiết kế bàn ăn thanh thoát cho khu bếp hiện đại, phù hợp gia đình 4 người và dễ phối với nhiều tông nội thất.',
    'Gỗ MDF lõi xanh phủ veneer', 'Nâu caramel', '150 x 80 x 75 cm',
    13990000, 20, '/uploads/products/catalog/phongbep-bo-ban-an-somin.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ bếp gỗ MDF công nghiệp', 'Hệ tủ bếp bố trí lưu trữ rộng rãi, chia khu chức năng rõ ràng cho khu sơ chế, nấu nướng và cất trữ đồ dùng.',
    'Gỗ MDF chống ẩm phủ melamine', 'Trắng kem - gỗ sáng', 'Dài 3.2 m',
    25990000, 20, '/uploads/products/catalog/phongbep-tu-bep-go-mdf-cong-nghiep.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ bếp Acrylic chữ L', 'Tủ bếp chữ L bề mặt bóng hiện đại, tối ưu góc bếp và tăng diện tích thao tác cho căn hộ và nhà phố.',
    'Acrylic bóng gương, MDF lõi xanh', 'Trắng - xám khói', 'Dài 3.6 m',
    32900000, 20, '/uploads/products/catalog/phongbep-tu-bep-acrylic-chu-l.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ bếp chữ L hiện đại', 'Mẫu tủ bếp hiện đại với khoang lưu trữ kín, phù hợp gian bếp gia đình cần sự gọn gàng và dễ bảo quản.',
    'MDF chống ẩm phủ melamine', 'Gỗ nâu - trắng mờ', 'Dài 3.4 m',
    28900000, 20, '/uploads/products/catalog/phongbep-tu-bep-chu-l-hien-ai.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng bếp';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bàn sofa Amin xoay 360 độ', 'Bàn sofa mặt tròn có cơ chế xoay linh hoạt, giúp mở rộng bề mặt sử dụng khi tiếp khách hoặc bày trí đồ decor.',
    'Mặt đá nung kết, chân thép sơn', 'Trắng - xám', '80 x 80 x 42 cm',
    5490000, 20, '/uploads/products/catalog/phongkhach-ban-sofa-amin-xoay-360-o.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bàn trà cao cấp Sisido', 'Bàn trà dáng thấp với bề mặt vân đá sang trọng, phù hợp phòng khách hiện đại và dễ kết hợp với sofa sáng màu.',
    'Mặt đá ceramic, khung thép', 'Trắng vân đá', '90 x 60 x 40 cm',
    4790000, 20, '/uploads/products/catalog/phongkhach-ban-tra-cao-cap-sisido.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bàn trà cao cấp Wilya', 'Mẫu bàn trà tối giản với đường nét mềm, giúp khu vực tiếp khách trông gọn hơn nhưng vẫn đủ điểm nhấn.',
    'Mặt đá ceramic, chân kim loại', 'Kem sữa', '100 x 60 x 40 cm',
    5290000, 20, '/uploads/products/catalog/phongkhach-ban-tra-cao-cap-wilya.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Sofa góc Daily', 'Mẫu sofa góc dành cho phòng khách gia đình, đệm ngồi êm và bố cục ôm góc giúp tận dụng diện tích tốt hơn.',
    'Khung gỗ sồi, mousse D40, vải bố', 'Kem be', '280 x 165 x 85 cm',
    23900000, 20, '/uploads/products/catalog/phongkhach-sofa-goc-daily.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Sofa góc Maika', 'Sofa góc dáng rộng, phù hợp không gian tiếp khách có chiều sâu và tạo cảm giác ấm áp, hiện đại.',
    'Khung gỗ tự nhiên, mousse đàn hồi, vải nhung', 'Xám sáng', '290 x 170 x 86 cm',
    24900000, 20, '/uploads/products/catalog/phongkhach-sofa-goc-maika.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Sofa góc Vinni', 'Thiết kế sofa góc cân đối cho căn hộ và nhà phố, phù hợp bố trí gần cửa sổ hoặc mảng tường dài của phòng khách.',
    'Khung gỗ tự nhiên, nệm mousse, vải bố', 'Nâu be', '275 x 160 x 84 cm',
    22900000, 20, '/uploads/products/catalog/phongkhach-sofa-goc-vinni.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ trang trí Bin', 'Tủ trang trí đứng gọn cho phòng khách, phù hợp trưng bày sách, khung ảnh và các món decor nhỏ.',
    'Gỗ MDF phủ melamine', 'Gỗ sồi', '120 x 40 x 180 cm',
    7890000, 20, '/uploads/products/catalog/phongkhach-tu-trang-tri-bin.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ trang trí Saba', 'Mẫu tủ trang trí cao và chắc chắn, giúp phòng khách có thêm không gian lưu trữ mà vẫn giữ nhịp bố cục gọn.',
    'Gỗ MDF chống ẩm', 'Nâu óc chó', '140 x 40 x 180 cm',
    8390000, 20, '/uploads/products/catalog/phongkhach-tu-trang-tri-saba.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ trang trí Wabi', 'Tủ trang trí phong cách trầm ấm, hợp với phòng khách tông gỗ và các không gian theo hướng tối giản sang trọng.',
    'Gỗ công nghiệp phủ veneer', 'Gỗ trầm', '150 x 42 x 190 cm',
    8690000, 20, '/uploads/products/catalog/phongkhach-tu-trang-tri-wabi.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng khách';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bàn làm việc BLV-12', 'Bàn làm việc mặt rộng vừa đủ cho laptop và tài liệu, thích hợp góc học tập hoặc làm việc tại nhà.',
    'MDF phủ melamine, khung thép', 'Gỗ sáng - trắng', '120 x 60 x 75 cm',
    4590000, 20, '/uploads/products/catalog/phonglamviec-ban-lam-viec-blv-12.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng làm việc';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Bàn làm việc BLV-16', 'Mẫu bàn làm việc hiện đại với mặt bàn dài hơn, tạo không gian thao tác thoải mái cho màn hình và phụ kiện.',
    'Gỗ MDF chống ẩm, khung thép', 'Nâu gỗ - đen', '140 x 60 x 75 cm',
    5190000, 20, '/uploads/products/catalog/phonglamviec-ban-lam-viec-blv-16.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng làm việc';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Ghế công thái học Spirit', 'Ghế công thái học tựa lưng lưới thoáng, hỗ trợ ngồi lâu và phù hợp góc làm việc cần sự thoải mái hàng ngày.',
    'Lưới cao cấp, chân nhôm', 'Đen nhám', '66 x 65 x 115 cm',
    6390000, 20, '/uploads/products/catalog/phonglamviec-ghe-cong-thai-hoc-spirit.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng làm việc';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Ghế văn phòng chân xoay', 'Ghế làm việc gọn, dễ phối cùng nhiều kiểu bàn và phù hợp cho không gian làm việc cá nhân hoặc văn phòng nhỏ.',
    'Da PU, chân thép mạ', 'Đen', '60 x 62 x 110 cm',
    3290000, 20, '/uploads/products/catalog/phonglamviec-ghe-van-phong-chan-xoay.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng làm việc';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Giường bọc nệm Donan', 'Giường ngủ bọc nệm đầu giường êm ái, tạo cảm giác ấm cúng cho phòng ngủ hiện đại và dễ phối tủ áo.',
    'Khung gỗ tự nhiên, đầu giường bọc vải', 'Kem sáng', '160 x 200 cm',
    14990000, 20, '/uploads/products/catalog/phongngu-giuong-boc-nem-donan.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng ngủ';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Giường bọc nệm Jin', 'Mẫu giường ngủ tông trung tính với phần bọc nệm dày, hợp căn phòng cần cảm giác nhẹ và thư giãn.',
    'Khung gỗ sồi, bọc nỉ cao cấp', 'Xám be', '180 x 200 cm',
    15990000, 20, '/uploads/products/catalog/phongngu-giuong-boc-nem-jin.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng ngủ';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Giường bọc nệm Limog', 'Giường ngủ kiểu sang hiện đại, bề mặt bọc nệm mềm và form khung chắc chắn cho phòng ngủ gia đình.',
    'Khung gỗ tự nhiên, bọc nhung', 'Be sữa', '180 x 200 cm',
    16990000, 20, '/uploads/products/catalog/phongngu-giuong-boc-nem-limog.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng ngủ';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ quần áo gỗ T-55', 'Tủ quần áo cửa mở dung tích khá lớn, phù hợp phòng ngủ chính cần sắp xếp quần áo gọn và rõ ngăn.',
    'Gỗ MDF phủ veneer', 'Nâu gỗ', '180 x 60 x 200 cm',
    12490000, 20, '/uploads/products/catalog/phongngu-tu-quan-ao-go-t-55.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng ngủ';

INSERT INTO san_pham (
    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,
    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh
)
SELECT
    kg.ma_khong_gian, 'Tủ quần áo gỗ công nghiệp', 'Mẫu tủ quần áo tối giản, bề mặt sáng giúp phòng ngủ trông thoáng hơn và dễ kết hợp với giường bọc nệm.',
    'Gỗ công nghiệp MDF chống ẩm', 'Trắng kem', '160 x 55 x 200 cm',
    10990000, 20, '/uploads/products/catalog/phongngu-tu-quan-ao-go-cong-nghiep.jpg', TRUE
FROM khong_gian kg
WHERE kg.ten_khong_gian = 'Phòng ngủ';

COMMIT;