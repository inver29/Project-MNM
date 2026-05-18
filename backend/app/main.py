from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.services.inventory import ensure_inventory_baseline
from app.services.media import migrate_catalog_media_references
from app.services.seed import seed_initial_data


settings = get_settings()


def ensure_database_compatibility() -> None:
    with engine.begin() as connection:
        inspector = inspect(connection)
        existing_tables = set(inspector.get_table_names())

        if "danh_gia_san_pham" not in existing_tables:
            Base.metadata.tables["danh_gia_san_pham"].create(connection, checkfirst=True)
            inspector = inspect(connection)
            existing_tables = set(inspector.get_table_names())

        if "tai_khoan" in existing_tables:
            account_columns = {column["name"] for column in inspector.get_columns("tai_khoan")}
            if "dia_chi" not in account_columns:
                connection.execute(text("ALTER TABLE tai_khoan ADD COLUMN dia_chi VARCHAR(255)"))

        existing_columns = {column["name"] for column in inspector.get_columns("khong_gian")}
        if "hinh_anh" not in existing_columns:
            connection.execute(text("ALTER TABLE khong_gian ADD COLUMN hinh_anh VARCHAR(500)"))
        if "anh_dai_dien" in existing_columns:
            connection.execute(
                text(
                    """
                    UPDATE khong_gian
                    SET hinh_anh = COALESCE(hinh_anh, anh_dai_dien)
                    WHERE anh_dai_dien IS NOT NULL
                    """
                )
            )

        order_columns = {column["name"] for column in inspector.get_columns("don_hang")}
        if "trang_thai_thanh_toan" not in order_columns:
            connection.execute(
                text(
                    """
                    ALTER TABLE don_hang
                    ADD COLUMN trang_thai_thanh_toan VARCHAR(30) NOT NULL DEFAULT 'cho_thanh_toan'
                    """
                )
            )
        if "ngay_hoan_thanh" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN ngay_hoan_thanh TIMESTAMP"))
        if "ngay_huy" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN ngay_huy TIMESTAMP"))
        if "vi_do_giao" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN vi_do_giao NUMERIC(10, 6)"))
        if "kinh_do_giao" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN kinh_do_giao NUMERIC(10, 6)"))
        if "khoang_cach_km" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN khoang_cach_km NUMERIC(8, 2) NOT NULL DEFAULT 0"))
        if "phi_giao_hang" not in order_columns:
            connection.execute(text("ALTER TABLE don_hang ADD COLUMN phi_giao_hang NUMERIC(14, 0) NOT NULL DEFAULT 0"))
        connection.execute(text("ALTER TABLE don_hang DROP CONSTRAINT IF EXISTS ck_don_hang_phuong_thuc_thanh_toan"))
        connection.execute(
            text(
                """
                ALTER TABLE don_hang
                ADD CONSTRAINT ck_don_hang_phuong_thuc_thanh_toan
                CHECK (phuong_thuc_thanh_toan IN ('tien_mat', 'momo', 'chuyen_khoan'))
                """
            )
        )

        if "gio_hang_tam" in existing_tables:
            cart_columns = {column["name"] for column in inspector.get_columns("gio_hang_tam")}
            if "duoc_chon_thanh_toan" not in cart_columns:
                connection.execute(
                    text(
                        """
                        ALTER TABLE gio_hang_tam
                        ADD COLUMN duoc_chon_thanh_toan BOOLEAN NOT NULL DEFAULT TRUE
                        """
                    )
                )


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_database_compatibility()
    with SessionLocal() as db:
        seed_initial_data(db)
        migrate_catalog_media_references(db)
        ensure_inventory_baseline(db)
        db.commit()
    yield


app = FastAPI(
    title=settings.app_title,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix=settings.api_v1_prefix)
