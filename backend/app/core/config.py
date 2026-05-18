from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_title: str = "API Cửa Hàng Nội Thất"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-this-secret-in-production"
    access_token_expire_minutes: int = 60 * 24
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/cua_hang_noi_that_db"
    cors_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:8080,"
        "http://127.0.0.1:8080"
    )
    admin_seed_email: str = "admin@cuahangnoithat.com"
    admin_seed_password: str = "Admin@12345"
    customer_seed_email: str = "khachhang@cuahangnoithat.com"
    customer_seed_password: str = "Customer@12345"
    geocoding_base_url: str = "https://nominatim.openstreetmap.org"
    geocoding_user_agent: str = "MNM-Furniture/1.0 (FastAPI checkout)"
    geocoding_contact_email: str = ""
    delivery_origin_name: str = "Showroom nội thất MNM"
    delivery_origin_address: str = "Trung tâm vận hành MNM, Quận 1, TP. Hồ Chí Minh"
    delivery_origin_lat: float = 10.7769
    delivery_origin_lng: float = 106.7009
    furniture_delivery_base_km: float = 5.0
    furniture_delivery_base_fee: int = 90000
    furniture_delivery_fee_per_km: int = 18000

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
