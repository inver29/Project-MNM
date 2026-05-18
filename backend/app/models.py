import enum
import re
import unicodedata
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def slugify_text(value: str) -> str:
    raw = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-zA-Z0-9]+", "-", raw).strip("-").lower()


def build_enum(enum_cls: type[enum.Enum], name: str):
    return Enum(
        enum_cls,
        name=name,
        native_enum=False,
        values_callable=lambda members: [member.value for member in members],
    )


class AccountRole(str, enum.Enum):
    admin = "admin"
    nhan_vien = "nhan_vien"
    khach_hang = "khach_hang"


class PaymentMethod(str, enum.Enum):
    tien_mat = "tien_mat"
    momo = "momo"
    chuyen_khoan = "chuyen_khoan"


class PaymentStatus(str, enum.Enum):
    cho_thanh_toan = "cho_thanh_toan"
    da_thanh_toan = "da_thanh_toan"
    da_hoan_tien = "da_hoan_tien"


class OrderStatus(str, enum.Enum):
    cho_xac_nhan = "cho_xac_nhan"
    da_xac_nhan = "da_xac_nhan"
    dang_giao = "dang_giao"
    hoan_thanh = "hoan_thanh"
    da_huy = "da_huy"


class ReturnRequestStatus(str, enum.Enum):
    dang_xu_ly = "dang_xu_ly"
    chap_nhan = "chap_nhan"
    tu_choi = "tu_choi"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        "ngay_tao",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        "ngay_cap_nhat",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )


class IdentityAccount(TimestampMixin, Base):
    __tablename__ = "tai_khoan"

    account_id: Mapped[int] = mapped_column("ma_tai_khoan", BigInteger, primary_key=True)
    email_address: Mapped[str] = mapped_column("email", String(150), nullable=False, unique=True, index=True)
    password_digest: Mapped[str] = mapped_column("mat_khau", String(255), nullable=False)
    display_name: Mapped[str] = mapped_column("ho_ten", String(150), nullable=False)
    mobile_phone: Mapped[str | None] = mapped_column("so_dien_thoai", String(20))
    address_line: Mapped[str | None] = mapped_column("dia_chi", String(255))
    account_role: Mapped[AccountRole] = mapped_column(
        "vai_tro",
        build_enum(AccountRole, "vai_tro_tai_khoan"),
        default=AccountRole.khach_hang,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column("dang_hoat_dong", Boolean, default=True, nullable=False)

    sales_orders: Mapped[list["SalesOrder"]] = relationship(back_populates="account")
    cart_lines: Mapped[list["ShoppingCartLine"]] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
    )
    imported_batches: Mapped[list["PurchaseImportBatch"]] = relationship(back_populates="imported_by")
    processed_return_requests: Mapped[list["ReturnRequest"]] = relationship(back_populates="processed_by")
    item_reviews: Mapped[list["CatalogItemReview"]] = relationship(
        back_populates="account",
        cascade="all, delete-orphan",
    )


class CatalogSpace(TimestampMixin, Base):
    __tablename__ = "khong_gian"

    space_id: Mapped[int] = mapped_column("ma_khong_gian", BigInteger, primary_key=True)
    space_name: Mapped[str] = mapped_column("ten_khong_gian", String(100), nullable=False, unique=True)
    summary_text: Mapped[str | None] = mapped_column("mo_ta", Text)
    cover_image_url: Mapped[str | None] = mapped_column("hinh_anh", String(500))
    is_visible: Mapped[bool] = mapped_column("dang_hien_thi", Boolean, default=True, nullable=False)

    items: Mapped[list["CatalogItem"]] = relationship(back_populates="space")


class CatalogItem(TimestampMixin, Base):
    __tablename__ = "san_pham"

    item_id: Mapped[int] = mapped_column("ma_san_pham", BigInteger, primary_key=True)
    space_id: Mapped[int] = mapped_column(
        "ma_khong_gian",
        ForeignKey("khong_gian.ma_khong_gian", ondelete="RESTRICT"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column("ten_san_pham", String(200), nullable=False)
    summary_text: Mapped[str | None] = mapped_column("mo_ta", Text)
    material_note: Mapped[str | None] = mapped_column("chat_lieu", String(120))
    color_tone: Mapped[str | None] = mapped_column("mau_sac", String(120))
    dimension_note: Mapped[str | None] = mapped_column("kich_thuoc", String(120))
    unit_price: Mapped[float] = mapped_column("gia_ban", Numeric(14, 0), nullable=False)
    on_hand_qty: Mapped[int] = mapped_column("so_luong_ton", Integer, default=0, nullable=False)
    primary_image_url: Mapped[str | None] = mapped_column("anh_dai_dien", String(500))
    is_published: Mapped[bool] = mapped_column("dang_kinh_doanh", Boolean, default=True, nullable=False)

    space: Mapped["CatalogSpace"] = relationship(back_populates="items")
    order_lines: Mapped[list["SalesOrderLine"]] = relationship(back_populates="item")
    cart_lines: Mapped[list["ShoppingCartLine"]] = relationship(back_populates="item")
    purchase_import_lines: Mapped[list["PurchaseImportLine"]] = relationship(back_populates="item")
    reviews: Mapped[list["CatalogItemReview"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
    )


class CatalogItemReview(TimestampMixin, Base):
    __tablename__ = "danh_gia_san_pham"
    __table_args__ = (
        UniqueConstraint("ma_tai_khoan", "ma_san_pham", name="uq_danh_gia_san_pham_tai_khoan_san_pham"),
    )

    review_id: Mapped[int] = mapped_column("ma_danh_gia", BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "ma_tai_khoan",
        ForeignKey("tai_khoan.ma_tai_khoan", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        "ma_san_pham",
        ForeignKey("san_pham.ma_san_pham", ondelete="CASCADE"),
        nullable=False,
    )
    rating_value: Mapped[int] = mapped_column("so_sao", Integer, nullable=False)
    comment_text: Mapped[str] = mapped_column("noi_dung", Text, default="", nullable=False)
    is_edited: Mapped[bool] = mapped_column("da_chinh_sua", Boolean, default=False, nullable=False)

    account: Mapped["IdentityAccount"] = relationship(back_populates="item_reviews")
    item: Mapped["CatalogItem"] = relationship(back_populates="reviews")


class StoredMedia(Base):
    __tablename__ = "tep_tin_media"

    media_id: Mapped[int] = mapped_column("ma_media", BigInteger, primary_key=True)
    source_key: Mapped[str | None] = mapped_column("ma_nguon", String(500), unique=True)
    file_name: Mapped[str] = mapped_column("ten_tap_tin", String(255), nullable=False)
    content_type: Mapped[str] = mapped_column("loai_noi_dung", String(120), nullable=False)
    binary_data: Mapped[bytes] = mapped_column("du_lieu_nhi_phan", LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "ngay_tao",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )


class ShoppingCartLine(TimestampMixin, Base):
    __tablename__ = "gio_hang_tam"
    __table_args__ = (
        UniqueConstraint("ma_tai_khoan", "ma_san_pham", name="uq_gio_hang_tam_tai_khoan_san_pham"),
    )

    cart_line_id: Mapped[int] = mapped_column("ma_dong_gio_hang", BigInteger, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        "ma_tai_khoan",
        ForeignKey("tai_khoan.ma_tai_khoan", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        "ma_san_pham",
        ForeignKey("san_pham.ma_san_pham", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column("so_luong", Integer, nullable=False, default=1)
    is_selected: Mapped[bool] = mapped_column(
        "duoc_chon_thanh_toan",
        Boolean,
        default=True,
        nullable=False,
    )

    account: Mapped["IdentityAccount"] = relationship(back_populates="cart_lines")
    item: Mapped["CatalogItem"] = relationship(back_populates="cart_lines")


class SalesOrder(Base):
    __tablename__ = "don_hang"

    sales_order_id: Mapped[int] = mapped_column("ma_don_hang", BigInteger, primary_key=True)
    order_code: Mapped[str] = mapped_column("so_don_hang", String(30), unique=True, nullable=False)
    account_id: Mapped[int] = mapped_column(
        "ma_tai_khoan",
        ForeignKey("tai_khoan.ma_tai_khoan", ondelete="RESTRICT"),
        nullable=False,
    )
    consignee_name: Mapped[str] = mapped_column("ten_nguoi_nhan", String(150), nullable=False)
    consignee_phone: Mapped[str] = mapped_column("so_dien_thoai_nhan", String(20), nullable=False)
    delivery_line: Mapped[str] = mapped_column("dia_chi_giao", Text, nullable=False)
    delivery_lat: Mapped[float | None] = mapped_column("vi_do_giao", Numeric(10, 6))
    delivery_lng: Mapped[float | None] = mapped_column("kinh_do_giao", Numeric(10, 6))
    distance_km: Mapped[float] = mapped_column("khoang_cach_km", Numeric(8, 2), default=0, nullable=False)
    shipping_fee: Mapped[float] = mapped_column("phi_giao_hang", Numeric(14, 0), default=0, nullable=False)
    payment_method: Mapped[PaymentMethod] = mapped_column(
        "phuong_thuc_thanh_toan",
        build_enum(PaymentMethod, "phuong_thuc_thanh_toan"),
        default=PaymentMethod.tien_mat,
        nullable=False,
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        "trang_thai_thanh_toan",
        build_enum(PaymentStatus, "trang_thai_thanh_toan"),
        default=PaymentStatus.cho_thanh_toan,
        nullable=False,
    )
    order_status: Mapped[OrderStatus] = mapped_column(
        "trang_thai_don_hang",
        build_enum(OrderStatus, "trang_thai_don_hang"),
        default=OrderStatus.cho_xac_nhan,
        nullable=False,
    )
    grand_total: Mapped[float] = mapped_column("tong_tien", Numeric(14, 0), nullable=False)
    delivery_note: Mapped[str | None] = mapped_column("ghi_chu", Text)
    placed_at: Mapped[datetime] = mapped_column(
        "ngay_dat",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column("ngay_hoan_thanh", DateTime(timezone=False))
    cancelled_at: Mapped[datetime | None] = mapped_column("ngay_huy", DateTime(timezone=False))
    updated_at: Mapped[datetime] = mapped_column(
        "ngay_cap_nhat",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
        nullable=False,
    )

    account: Mapped["IdentityAccount"] = relationship(back_populates="sales_orders")
    lines: Mapped[list["SalesOrderLine"]] = relationship(
        back_populates="sales_order",
        cascade="all, delete-orphan",
    )
    return_request: Mapped["ReturnRequest | None"] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
        uselist=False,
    )


class SalesOrderLine(Base):
    __tablename__ = "chi_tiet_don_hang"

    order_line_id: Mapped[int] = mapped_column("ma_chi_tiet_don_hang", BigInteger, primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(
        "ma_don_hang",
        ForeignKey("don_hang.ma_don_hang", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        "ma_san_pham",
        ForeignKey("san_pham.ma_san_pham", ondelete="RESTRICT"),
        nullable=False,
    )
    item_title_snapshot: Mapped[str] = mapped_column("ten_san_pham_luc_dat", String(200), nullable=False)
    unit_price_snapshot: Mapped[float] = mapped_column("gia_luc_dat", Numeric(14, 0), nullable=False)
    ordered_qty: Mapped[int] = mapped_column("so_luong", Integer, nullable=False)
    line_total: Mapped[float] = mapped_column("thanh_tien", Numeric(14, 0), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "ngay_tao",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    sales_order: Mapped["SalesOrder"] = relationship(back_populates="lines")
    item: Mapped["CatalogItem"] = relationship(back_populates="order_lines")
    inventory_allocations: Mapped[list["OrderInventoryAllocation"]] = relationship(
        back_populates="order_line",
        cascade="all, delete-orphan",
    )


class ReturnRequest(TimestampMixin, Base):
    __tablename__ = "yeu_cau_hoan_tra"

    return_request_id: Mapped[int] = mapped_column("ma_yeu_cau", BigInteger, primary_key=True)
    sales_order_id: Mapped[int] = mapped_column(
        "ma_don_hang",
        ForeignKey("don_hang.ma_don_hang", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    reason_text: Mapped[str] = mapped_column("ly_do", Text, nullable=False)
    contact_email: Mapped[str | None] = mapped_column("email_lien_he", String(150))
    contact_phone: Mapped[str | None] = mapped_column("so_dien_thoai_lien_he", String(20))
    bank_account_number: Mapped[str | None] = mapped_column("so_tai_khoan_ngan_hang", String(80))
    momo_account_number: Mapped[str | None] = mapped_column("so_tai_khoan_momo", String(40))
    bill_image_url: Mapped[str | None] = mapped_column("anh_hoa_don", String(500))
    status: Mapped[ReturnRequestStatus] = mapped_column(
        "trang_thai",
        build_enum(ReturnRequestStatus, "trang_thai_yeu_cau_hoan_tra"),
        default=ReturnRequestStatus.dang_xu_ly,
        nullable=False,
    )
    admin_note: Mapped[str | None] = mapped_column("ghi_chu_quan_tri", Text)
    processed_by_account_id: Mapped[int | None] = mapped_column(
        "ma_tai_khoan_xu_ly",
        ForeignKey("tai_khoan.ma_tai_khoan", ondelete="SET NULL"),
    )
    processed_at: Mapped[datetime | None] = mapped_column("ngay_xu_ly", DateTime(timezone=False))

    order: Mapped["SalesOrder"] = relationship(back_populates="return_request")
    processed_by: Mapped["IdentityAccount | None"] = relationship(back_populates="processed_return_requests")
    evidences: Mapped[list["ReturnRequestEvidence"]] = relationship(
        back_populates="return_request",
        cascade="all, delete-orphan",
    )


class ReturnRequestEvidence(TimestampMixin, Base):
    __tablename__ = "anh_chung_minh_hoan_tra"

    evidence_id: Mapped[int] = mapped_column("ma_anh_chung_minh", BigInteger, primary_key=True)
    return_request_id: Mapped[int] = mapped_column(
        "ma_yeu_cau",
        ForeignKey("yeu_cau_hoan_tra.ma_yeu_cau", ondelete="CASCADE"),
        nullable=False,
    )
    image_url: Mapped[str] = mapped_column("duong_dan_anh", String(500), nullable=False)

    return_request: Mapped["ReturnRequest"] = relationship(back_populates="evidences")


class PurchaseImportBatch(TimestampMixin, Base):
    __tablename__ = "phieu_nhap_hang"

    batch_id: Mapped[int] = mapped_column("ma_phieu_nhap", BigInteger, primary_key=True)
    invoice_code: Mapped[str] = mapped_column("ma_hoa_don_nhap", String(40), nullable=False, unique=True)
    imported_by_account_id: Mapped[int | None] = mapped_column(
        "ma_tai_khoan_nhap",
        ForeignKey("tai_khoan.ma_tai_khoan", ondelete="SET NULL"),
    )
    note: Mapped[str | None] = mapped_column("ghi_chu", Text)

    imported_by: Mapped["IdentityAccount | None"] = relationship(back_populates="imported_batches")
    items: Mapped[list["PurchaseImportLine"]] = relationship(
        back_populates="batch",
        cascade="all, delete-orphan",
    )


class PurchaseImportLine(Base):
    __tablename__ = "chi_tiet_phieu_nhap_hang"

    import_line_id: Mapped[int] = mapped_column("ma_chi_tiet_phieu_nhap", BigInteger, primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        "ma_phieu_nhap",
        ForeignKey("phieu_nhap_hang.ma_phieu_nhap", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        "ma_san_pham",
        ForeignKey("san_pham.ma_san_pham", ondelete="RESTRICT"),
        nullable=False,
    )
    item_title_snapshot: Mapped[str] = mapped_column("ten_san_pham_luc_nhap", String(200), nullable=False)
    imported_qty: Mapped[int] = mapped_column("so_luong_nhap", Integer, nullable=False)
    remaining_qty: Mapped[int] = mapped_column("so_luong_con_lai", Integer, nullable=False)
    import_unit_price: Mapped[float] = mapped_column("gia_nhap", Numeric(14, 0), nullable=False)
    sale_unit_price_snapshot: Mapped[float] = mapped_column("gia_ban_luc_nhap", Numeric(14, 0), nullable=False)
    note: Mapped[str | None] = mapped_column("ghi_chu", Text)
    created_at: Mapped[datetime] = mapped_column(
        "ngay_tao",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    batch: Mapped["PurchaseImportBatch"] = relationship(back_populates="items")
    item: Mapped["CatalogItem"] = relationship(back_populates="purchase_import_lines")
    inventory_allocations: Mapped[list["OrderInventoryAllocation"]] = relationship(
        back_populates="import_line",
        cascade="all, delete-orphan",
    )


class OrderInventoryAllocation(Base):
    __tablename__ = "phan_bo_ton_kho_don_hang"
    __table_args__ = (
        UniqueConstraint("ma_chi_tiet_don_hang", "ma_chi_tiet_phieu_nhap", name="uq_phan_bo_ton_kho"),
    )

    allocation_id: Mapped[int] = mapped_column("ma_phan_bo", BigInteger, primary_key=True)
    order_line_id: Mapped[int] = mapped_column(
        "ma_chi_tiet_don_hang",
        ForeignKey("chi_tiet_don_hang.ma_chi_tiet_don_hang", ondelete="CASCADE"),
        nullable=False,
    )
    import_line_id: Mapped[int] = mapped_column(
        "ma_chi_tiet_phieu_nhap",
        ForeignKey("chi_tiet_phieu_nhap_hang.ma_chi_tiet_phieu_nhap", ondelete="CASCADE"),
        nullable=False,
    )
    allocated_qty: Mapped[int] = mapped_column("so_luong_phan_bo", Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        "ngay_tao",
        DateTime(timezone=False),
        server_default=func.current_timestamp(),
        nullable=False,
    )

    order_line: Mapped["SalesOrderLine"] = relationship(back_populates="inventory_allocations")
    import_line: Mapped["PurchaseImportLine"] = relationship(back_populates="inventory_allocations")
