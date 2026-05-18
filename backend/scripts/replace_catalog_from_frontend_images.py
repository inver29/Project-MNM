from __future__ import annotations

import re
import shutil
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_ROOT.parent
FRONTEND_IMAGES_DIR = PROJECT_ROOT / "frontend" / "src" / "images"
PRODUCT_UPLOADS_DIR = BACKEND_ROOT / "uploads" / "products" / "catalog"
SQL_EXPORT_PATH = BACKEND_ROOT / "docs" / "replace_catalog_from_frontend_images.sql"

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import SessionLocal
from app.models import CatalogItem, CatalogSpace, SalesOrderLine, slugify_text


SPACE_NAME_BY_FOLDER = {
    "phongbep": "Phòng bếp",
    "phongkhach": "Phòng khách",
    "phonglamviec": "Phòng làm việc",
    "phongngu": "Phòng ngủ",
}


@dataclass(frozen=True)
class ProductSeed:
    folder: str
    file_name: str
    title: str
    description: str
    material: str
    color: str
    size: str
    price: int


PRODUCT_CATALOG: list[ProductSeed] = [
    ProductSeed(
        folder="phongbep",
        file_name="Bộ Bàn Ăn 4 Ghế Neva.jpg",
        title="Bộ bàn ăn 4 ghế Neva",
        description="Bộ bàn ăn 4 ghế phong cách hiện đại, phù hợp căn hộ gia đình nhỏ với bố cục gọn và tông màu ấm.",
        material="Gỗ cao su tự nhiên, ghế bọc nệm vải",
        color="Nâu gỗ sáng",
        size="140 x 80 x 75 cm",
        price=12990000,
    ),
    ProductSeed(
        folder="phongbep",
        file_name="Bộ bàn ăn Oval Wood.jpg",
        title="Bộ bàn ăn Oval Wood",
        description="Mẫu bàn ăn mặt oval tạo cảm giác mềm hơn cho không gian bếp, đi kèm ghế đồng bộ và bề mặt dễ vệ sinh.",
        material="Gỗ sồi veneer, chân gỗ đặc",
        color="Gỗ óc chó",
        size="160 x 85 x 75 cm",
        price=14990000,
    ),
    ProductSeed(
        folder="phongbep",
        file_name="Bộ bàn ăn Somin.jpg",
        title="Bộ bàn ăn Somin",
        description="Thiết kế bàn ăn thanh thoát cho khu bếp hiện đại, phù hợp gia đình 4 người và dễ phối với nhiều tông nội thất.",
        material="Gỗ MDF lõi xanh phủ veneer",
        color="Nâu caramel",
        size="150 x 80 x 75 cm",
        price=13990000,
    ),
    ProductSeed(
        folder="phongbep",
        file_name="Tủ Bếp Gỗ MDF Công Nghiệp.jpg",
        title="Tủ bếp gỗ MDF công nghiệp",
        description="Hệ tủ bếp bố trí lưu trữ rộng rãi, chia khu chức năng rõ ràng cho khu sơ chế, nấu nướng và cất trữ đồ dùng.",
        material="Gỗ MDF chống ẩm phủ melamine",
        color="Trắng kem - gỗ sáng",
        size="Dài 3.2 m",
        price=25990000,
    ),
    ProductSeed(
        folder="phongbep",
        file_name="Tủ bếp Acrylic chữ L.jpg",
        title="Tủ bếp Acrylic chữ L",
        description="Tủ bếp chữ L bề mặt bóng hiện đại, tối ưu góc bếp và tăng diện tích thao tác cho căn hộ và nhà phố.",
        material="Acrylic bóng gương, MDF lõi xanh",
        color="Trắng - xám khói",
        size="Dài 3.6 m",
        price=32900000,
    ),
    ProductSeed(
        folder="phongbep",
        file_name="Tủ bếp chữ L hiện đại.jpg",
        title="Tủ bếp chữ L hiện đại",
        description="Mẫu tủ bếp hiện đại với khoang lưu trữ kín, phù hợp gian bếp gia đình cần sự gọn gàng và dễ bảo quản.",
        material="MDF chống ẩm phủ melamine",
        color="Gỗ nâu - trắng mờ",
        size="Dài 3.4 m",
        price=28900000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Bàn Sofa Amin Xoay 360 Độ.jpg",
        title="Bàn sofa Amin xoay 360 độ",
        description="Bàn sofa mặt tròn có cơ chế xoay linh hoạt, giúp mở rộng bề mặt sử dụng khi tiếp khách hoặc bày trí đồ decor.",
        material="Mặt đá nung kết, chân thép sơn",
        color="Trắng - xám",
        size="80 x 80 x 42 cm",
        price=5490000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Bàn Trà Cao Cấp Sisido.jpg",
        title="Bàn trà cao cấp Sisido",
        description="Bàn trà dáng thấp với bề mặt vân đá sang trọng, phù hợp phòng khách hiện đại và dễ kết hợp với sofa sáng màu.",
        material="Mặt đá ceramic, khung thép",
        color="Trắng vân đá",
        size="90 x 60 x 40 cm",
        price=4790000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Bàn Trà Cao Cấp Wilya.jpg",
        title="Bàn trà cao cấp Wilya",
        description="Mẫu bàn trà tối giản với đường nét mềm, giúp khu vực tiếp khách trông gọn hơn nhưng vẫn đủ điểm nhấn.",
        material="Mặt đá ceramic, chân kim loại",
        color="Kem sữa",
        size="100 x 60 x 40 cm",
        price=5290000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Sofa Góc Daily.jpg",
        title="Sofa góc Daily",
        description="Mẫu sofa góc dành cho phòng khách gia đình, đệm ngồi êm và bố cục ôm góc giúp tận dụng diện tích tốt hơn.",
        material="Khung gỗ sồi, mousse D40, vải bố",
        color="Kem be",
        size="280 x 165 x 85 cm",
        price=23900000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Sofa Góc Maika.jpg",
        title="Sofa góc Maika",
        description="Sofa góc dáng rộng, phù hợp không gian tiếp khách có chiều sâu và tạo cảm giác ấm áp, hiện đại.",
        material="Khung gỗ tự nhiên, mousse đàn hồi, vải nhung",
        color="Xám sáng",
        size="290 x 170 x 86 cm",
        price=24900000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Sofa Góc Vinni.jpg",
        title="Sofa góc Vinni",
        description="Thiết kế sofa góc cân đối cho căn hộ và nhà phố, phù hợp bố trí gần cửa sổ hoặc mảng tường dài của phòng khách.",
        material="Khung gỗ tự nhiên, nệm mousse, vải bố",
        color="Nâu be",
        size="275 x 160 x 84 cm",
        price=22900000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Tủ Trang Trí Bin.jpg",
        title="Tủ trang trí Bin",
        description="Tủ trang trí đứng gọn cho phòng khách, phù hợp trưng bày sách, khung ảnh và các món decor nhỏ.",
        material="Gỗ MDF phủ melamine",
        color="Gỗ sồi",
        size="120 x 40 x 180 cm",
        price=7890000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Tủ Trang Trí Saba.jpg",
        title="Tủ trang trí Saba",
        description="Mẫu tủ trang trí cao và chắc chắn, giúp phòng khách có thêm không gian lưu trữ mà vẫn giữ nhịp bố cục gọn.",
        material="Gỗ MDF chống ẩm",
        color="Nâu óc chó",
        size="140 x 40 x 180 cm",
        price=8390000,
    ),
    ProductSeed(
        folder="phongkhach",
        file_name="Tủ Trang Trí Wabi.jpg",
        title="Tủ trang trí Wabi",
        description="Tủ trang trí phong cách trầm ấm, hợp với phòng khách tông gỗ và các không gian theo hướng tối giản sang trọng.",
        material="Gỗ công nghiệp phủ veneer",
        color="Gỗ trầm",
        size="150 x 42 x 190 cm",
        price=8690000,
    ),
    ProductSeed(
        folder="phonglamviec",
        file_name="Bàn Làm Việc BLV-12.jpg",
        title="Bàn làm việc BLV-12",
        description="Bàn làm việc mặt rộng vừa đủ cho laptop và tài liệu, thích hợp góc học tập hoặc làm việc tại nhà.",
        material="MDF phủ melamine, khung thép",
        color="Gỗ sáng - trắng",
        size="120 x 60 x 75 cm",
        price=4590000,
    ),
    ProductSeed(
        folder="phonglamviec",
        file_name="Bàn Làm Việc BLV-16.jpg",
        title="Bàn làm việc BLV-16",
        description="Mẫu bàn làm việc hiện đại với mặt bàn dài hơn, tạo không gian thao tác thoải mái cho màn hình và phụ kiện.",
        material="Gỗ MDF chống ẩm, khung thép",
        color="Nâu gỗ - đen",
        size="140 x 60 x 75 cm",
        price=5190000,
    ),
    ProductSeed(
        folder="phonglamviec",
        file_name="Ghế Công Thái Học Spirit.jpg",
        title="Ghế công thái học Spirit",
        description="Ghế công thái học tựa lưng lưới thoáng, hỗ trợ ngồi lâu và phù hợp góc làm việc cần sự thoải mái hàng ngày.",
        material="Lưới cao cấp, chân nhôm",
        color="Đen nhám",
        size="66 x 65 x 115 cm",
        price=6390000,
    ),
    ProductSeed(
        folder="phonglamviec",
        file_name="Ghế Văn Phòng Chân Xoay.jpg",
        title="Ghế văn phòng chân xoay",
        description="Ghế làm việc gọn, dễ phối cùng nhiều kiểu bàn và phù hợp cho không gian làm việc cá nhân hoặc văn phòng nhỏ.",
        material="Da PU, chân thép mạ",
        color="Đen",
        size="60 x 62 x 110 cm",
        price=3290000,
    ),
    ProductSeed(
        folder="phongngu",
        file_name="Giường Bọc Nệm Donan.jpg",
        title="Giường bọc nệm Donan",
        description="Giường ngủ bọc nệm đầu giường êm ái, tạo cảm giác ấm cúng cho phòng ngủ hiện đại và dễ phối tủ áo.",
        material="Khung gỗ tự nhiên, đầu giường bọc vải",
        color="Kem sáng",
        size="160 x 200 cm",
        price=14990000,
    ),
    ProductSeed(
        folder="phongngu",
        file_name="Giường Bọc Nệm Jin.jpg",
        title="Giường bọc nệm Jin",
        description="Mẫu giường ngủ tông trung tính với phần bọc nệm dày, hợp căn phòng cần cảm giác nhẹ và thư giãn.",
        material="Khung gỗ sồi, bọc nỉ cao cấp",
        color="Xám be",
        size="180 x 200 cm",
        price=15990000,
    ),
    ProductSeed(
        folder="phongngu",
        file_name="Giường Bọc Nệm Limog.jpg",
        title="Giường bọc nệm Limog",
        description="Giường ngủ kiểu sang hiện đại, bề mặt bọc nệm mềm và form khung chắc chắn cho phòng ngủ gia đình.",
        material="Khung gỗ tự nhiên, bọc nhung",
        color="Be sữa",
        size="180 x 200 cm",
        price=16990000,
    ),
    ProductSeed(
        folder="phongngu",
        file_name="Tủ Quần Áo Gỗ T-55.jpg",
        title="Tủ quần áo gỗ T-55",
        description="Tủ quần áo cửa mở dung tích khá lớn, phù hợp phòng ngủ chính cần sắp xếp quần áo gọn và rõ ngăn.",
        material="Gỗ MDF phủ veneer",
        color="Nâu gỗ",
        size="180 x 60 x 200 cm",
        price=12490000,
    ),
    ProductSeed(
        folder="phongngu",
        file_name="Tủ Quần Áo gỗ công nghiệp.jpg",
        title="Tủ quần áo gỗ công nghiệp",
        description="Mẫu tủ quần áo tối giản, bề mặt sáng giúp phòng ngủ trông thoáng hơn và dễ kết hợp với giường bọc nệm.",
        material="Gỗ công nghiệp MDF chống ẩm",
        color="Trắng kem",
        size="160 x 55 x 200 cm",
        price=10990000,
    ),
]


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "", normalized).lower()


def ensure_spaces(session) -> dict[str, CatalogSpace]:
    required = {
        normalize_text(name): name
        for name in SPACE_NAME_BY_FOLDER.values()
    }
    spaces = {
        normalize_text(space.space_name): space
        for space in session.scalars(select(CatalogSpace).order_by(CatalogSpace.space_id))
    }

    for space_key, space_name in required.items():
        if space_key not in spaces:
            new_space = CatalogSpace(space_name=space_name, summary_text=f"Các sản phẩm nội thất cho {space_name.lower()}", is_visible=True)
            session.add(new_space)
            session.flush()
            spaces[space_key] = new_space

    return spaces


def copy_product_image(seed: ProductSeed) -> str:
    source = FRONTEND_IMAGES_DIR / seed.folder / seed.file_name
    if not source.exists():
        raise FileNotFoundError(f"Không tìm thấy ảnh nguồn: {source}")

    PRODUCT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    destination_name = f"{seed.folder}-{slugify_text(seed.title)}{source.suffix.lower()}"
    destination = PRODUCT_UPLOADS_DIR / destination_name
    shutil.copy2(source, destination)
    return f"/uploads/products/catalog/{destination_name}"


def export_sql(rows: list[dict[str, str | int]]) -> None:
    SQL_EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)

    def sql_quote(value: str) -> str:
        return value.replace("'", "''")

    lines = [
        "-- Tu dong sinh tu script replace_catalog_from_frontend_images.py",
        "BEGIN;",
        "",
        "-- An cac san pham cu da tung duoc dat hang de giu lich su don",
        "UPDATE san_pham",
        "SET dang_kinh_doanh = FALSE, ngay_cap_nhat = CURRENT_TIMESTAMP",
        "WHERE ma_san_pham IN (SELECT DISTINCT ma_san_pham FROM chi_tiet_don_hang);",
        "",
        "-- Xoa cac san pham cu chua phat sinh don hang",
        "DELETE FROM san_pham",
        "WHERE ma_san_pham NOT IN (SELECT DISTINCT ma_san_pham FROM chi_tiet_don_hang);",
        "",
        "-- Chen bo san pham moi tu thu muc frontend/src/images",
    ]

    for row in rows:
        lines.extend(
            [
                "INSERT INTO san_pham (",
                "    ma_khong_gian, ten_san_pham, mo_ta, chat_lieu, mau_sac, kich_thuoc,",
                "    gia_ban, so_luong_ton, anh_dai_dien, dang_kinh_doanh",
                ")",
                "SELECT",
                f"    kg.ma_khong_gian, '{sql_quote(str(row['title']))}', '{sql_quote(str(row['description']))}',",
                f"    '{sql_quote(str(row['material']))}', '{sql_quote(str(row['color']))}', '{sql_quote(str(row['size']))}',",
                f"    {int(row['price'])}, 20, '{sql_quote(str(row['image_url']))}', TRUE",
                "FROM khong_gian kg",
                f"WHERE kg.ten_khong_gian = '{sql_quote(str(row['space_name']))}';",
                "",
            ]
        )

    lines.append("COMMIT;")
    SQL_EXPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def replace_catalog() -> None:
    with SessionLocal() as session:
        spaces = ensure_spaces(session)
        referenced_item_ids = set(session.scalars(select(SalesOrderLine.item_id).distinct()))
        existing_items = list(session.scalars(select(CatalogItem).order_by(CatalogItem.item_id)))

        for item in existing_items:
            if item.item_id in referenced_item_ids:
                item.is_published = False
            else:
                session.delete(item)

        session.flush()

        imported_rows: list[dict[str, str | int]] = []
        for seed in PRODUCT_CATALOG:
            space_name = SPACE_NAME_BY_FOLDER[seed.folder]
            space = spaces[normalize_text(space_name)]
            image_url = copy_product_image(seed)
            session.add(
                CatalogItem(
                    space_id=space.space_id,
                    title=seed.title,
                    summary_text=seed.description,
                    material_note=seed.material,
                    color_tone=seed.color,
                    dimension_note=seed.size,
                    unit_price=seed.price,
                    on_hand_qty=20,
                    primary_image_url=image_url,
                    is_published=True,
                )
            )
            imported_rows.append(
                {
                    "space_name": space_name,
                    "title": seed.title,
                    "description": seed.description,
                    "material": seed.material,
                    "color": seed.color,
                    "size": seed.size,
                    "price": seed.price,
                    "image_url": image_url,
                }
            )

        session.commit()
        export_sql(imported_rows)

    print(f"Da nhap {len(PRODUCT_CATALOG)} san pham moi vao database.")
    print(f"Da tao file SQL tai: {SQL_EXPORT_PATH}")


if __name__ == "__main__":
    replace_catalog()
