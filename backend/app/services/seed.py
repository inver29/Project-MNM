import unicodedata
from html import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.models import AccountRole, CatalogItem, CatalogSpace, IdentityAccount
from app.services.media import build_media_url, store_media_bytes


def normalize_space_key(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", (value or "").strip().lower().replace("_", " "))
    ascii_only = "".join(character for character in normalized if not unicodedata.combining(character))
    return " ".join(ascii_only.split())


def canonical_space_key(value: str) -> str:
    compact = normalize_space_key(value)
    aliases = {
        "phong an": "phong bep",
        "phong bep": "phong bep",
    }
    return aliases.get(compact, compact)


def build_seed_media_url(db: Session, *, source_key: str, title: str, accent_color: str) -> str:
    svg_markup = f"""
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="#f5efe6" />
      <rect x="88" y="84" width="1024" height="732" rx="52" fill="{accent_color}" opacity="0.18" />
      <rect x="176" y="180" width="848" height="540" rx="44" fill="#ffffff" />
      <circle cx="330" cy="330" r="98" fill="{accent_color}" opacity="0.28" />
      <circle cx="840" cy="560" r="120" fill="{accent_color}" opacity="0.16" />
      <text x="176" y="760" fill="#3f352d" font-family="Georgia, serif" font-size="66" font-weight="700">
        {escape(title)}
      </text>
      <text x="176" y="820" fill="#6e6258" font-family="Arial, sans-serif" font-size="28">
        Seed media stored in PostgreSQL
      </text>
    </svg>
    """.strip()
    media = store_media_bytes(
        db,
        file_name=f"{source_key}.svg",
        binary_data=svg_markup.encode("utf-8"),
        content_type="image/svg+xml",
        source_key=f"seed:{source_key}",
    )
    return build_media_url(media.media_id)


def seed_initial_data(db: Session) -> None:
    settings = get_settings()
    admin_seed_email = settings.admin_seed_email.lower()
    customer_seed_email = settings.customer_seed_email.lower()

    legacy_seed_pairs = {
        "admin@noithatmocviet.local": admin_seed_email,
        "khachhang@noithatmocviet.local": customer_seed_email,
        "admin@noithatmocviet.com": admin_seed_email,
        "khachhang@noithatmocviet.com": customer_seed_email,
    }
    for legacy_email, target_email in legacy_seed_pairs.items():
        if legacy_email == target_email:
            continue
        legacy_account = db.scalar(
            select(IdentityAccount).where(IdentityAccount.email_address == legacy_email),
        )
        target_account = db.scalar(
            select(IdentityAccount).where(IdentityAccount.email_address == target_email),
        )
        if legacy_account and not target_account:
            legacy_account.email_address = target_email

    seeded_accounts = [
        {
            "email": admin_seed_email,
            "password": settings.admin_seed_password,
            "display_name": "Quản trị viên",
            "mobile_phone": "0909000001",
            "account_role": AccountRole.admin,
        },
        {
            "email": customer_seed_email,
            "password": settings.customer_seed_password,
            "display_name": "Khách hàng demo",
            "mobile_phone": "0909000002",
            "account_role": AccountRole.khach_hang,
        },
    ]

    for account_seed in seeded_accounts:
        existing_account = db.scalar(
            select(IdentityAccount).where(IdentityAccount.email_address == account_seed["email"]),
        )
        if existing_account is None:
            db.add(
                IdentityAccount(
                    email_address=account_seed["email"],
                    password_digest=hash_password(str(account_seed["password"])),
                    display_name=str(account_seed["display_name"]),
                    mobile_phone=str(account_seed["mobile_phone"]),
                    account_role=account_seed["account_role"],
                    is_active=True,
                )
            )
            db.flush()
            continue

        existing_account.password_digest = hash_password(str(account_seed["password"]))
        existing_account.display_name = str(account_seed["display_name"])
        existing_account.mobile_phone = str(account_seed["mobile_phone"])
        existing_account.account_role = account_seed["account_role"]
        existing_account.is_active = True

    space_media_urls = {
        "phong khach": build_seed_media_url(
            db,
            source_key="space-living",
            title="Phòng khách",
            accent_color="#b4875e",
        ),
        "phong ngu": build_seed_media_url(
            db,
            source_key="space-bedroom",
            title="Phòng ngủ",
            accent_color="#8c7a63",
        ),
        "phong bep": build_seed_media_url(
            db,
            source_key="space-kitchen",
            title="Phòng bếp",
            accent_color="#bb8d52",
        ),
        "phong lam viec": build_seed_media_url(
            db,
            source_key="space-office",
            title="Phòng làm việc",
            accent_color="#66808f",
        ),
    }

    required_spaces = {
        "phong khach": ("Phòng khách", "Sofa, bàn trà, kệ tivi"),
        "phong ngu": ("Phòng ngủ", "Giường, tủ, bàn trang điểm"),
        "phong bep": ("Phòng bếp", "Bàn ăn, ghế ăn và nội thất cho khu bếp"),
        "phong lam viec": ("Phòng làm việc", "Bàn làm việc, ghế xoay, kệ sách"),
    }

    existing_spaces = list(db.scalars(select(CatalogSpace).order_by(CatalogSpace.space_id)))
    existing_space_keys = {normalize_space_key(space.space_name): space for space in existing_spaces}

    kitchen_space = existing_space_keys.get("phong bep")
    dining_space = existing_space_keys.get("phong an")
    if dining_space and not kitchen_space:
        dining_space.space_name = "Phòng bếp"
        if not dining_space.summary_text or "phong an" in normalize_space_key(dining_space.summary_text or ""):
            dining_space.summary_text = "Bàn ăn, ghế ăn và nội thất cho khu bếp"
        existing_space_keys.pop("phong an", None)
        existing_space_keys["phong bep"] = dining_space

    for space_key, (space_name, summary_text) in required_spaces.items():
        media_url = space_media_urls[space_key]
        if space_key not in existing_space_keys:
            new_space = CatalogSpace(
                space_name=space_name,
                summary_text=summary_text,
                cover_image_url=media_url,
                is_visible=True,
            )
            db.add(new_space)
            db.flush()
            existing_space_keys[space_key] = new_space
        elif not existing_space_keys[space_key].cover_image_url:
            existing_space_keys[space_key].cover_image_url = media_url

    if db.scalar(select(CatalogItem.item_id).limit(1)) is None:
        spaces = {}
        for space in db.scalars(select(CatalogSpace).order_by(CatalogSpace.space_id)):
            exact_key = normalize_space_key(space.space_name)
            resolved_key = canonical_space_key(space.space_name)
            if resolved_key not in spaces or exact_key == resolved_key:
                spaces[resolved_key] = space

        item_media_urls = {
            "sofa-da-milano": build_seed_media_url(
                db,
                source_key="item-sofa-da-milano",
                title="Sofa da Milano",
                accent_color="#9c7350",
            ),
            "ban-tra-luna": build_seed_media_url(
                db,
                source_key="item-ban-tra-luna",
                title="Bàn trà Luna",
                accent_color="#7f6b5d",
            ),
            "giuong-ngu-haven": build_seed_media_url(
                db,
                source_key="item-giuong-ngu-haven",
                title="Giường ngủ Haven",
                accent_color="#b69c85",
            ),
            "tu-ao-nova": build_seed_media_url(
                db,
                source_key="item-tu-ao-nova",
                title="Tủ áo Nova",
                accent_color="#8a908f",
            ),
            "ban-an-orion": build_seed_media_url(
                db,
                source_key="item-ban-an-orion",
                title="Bàn ăn Orion",
                accent_color="#b38345",
            ),
            "ban-lam-viec-zenith": build_seed_media_url(
                db,
                source_key="item-ban-lam-viec-zenith",
                title="Bàn làm việc Zenith",
                accent_color="#5f7b8c",
            ),
        }

        db.add_all(
            [
                CatalogItem(
                    space_id=spaces["phong khach"].space_id,
                    title="Sofa da Milano",
                    summary_text="Mẫu sofa ba chỗ ngồi thiết kế hiện đại, phù hợp căn hộ và nhà phố.",
                    material_note="Da microfiber và gỗ sồi",
                    color_tone="Nâu caramel",
                    dimension_note="220 x 95 x 82 cm",
                    unit_price=11890000,
                    on_hand_qty=12,
                    primary_image_url=item_media_urls["sofa-da-milano"],
                    is_published=True,
                ),
                CatalogItem(
                    space_id=spaces["phong khach"].space_id,
                    title="Bàn trà Luna",
                    summary_text="Bàn trà chân sắt mặt đá nhân tạo cho phòng khách hiện đại.",
                    material_note="Đá nhân tạo và sắt sơn",
                    color_tone="Đen mờ",
                    dimension_note="100 x 60 x 42 cm",
                    unit_price=3990000,
                    on_hand_qty=18,
                    primary_image_url=item_media_urls["ban-tra-luna"],
                    is_published=True,
                ),
                CatalogItem(
                    space_id=spaces["phong ngu"].space_id,
                    title="Giường ngủ Haven",
                    summary_text="Khung giường bọc nỉ tối giản, tạo cảm giác ấm cúng cho phòng ngủ.",
                    material_note="Vải nỉ và thép sơn tĩnh điện",
                    color_tone="Kem sữa",
                    dimension_note="180 x 200 cm",
                    unit_price=14990000,
                    on_hand_qty=8,
                    primary_image_url=item_media_urls["giuong-ngu-haven"],
                    is_published=True,
                ),
                CatalogItem(
                    space_id=spaces["phong ngu"].space_id,
                    title="Tủ áo Nova",
                    summary_text="Tủ áo cánh trượt tối ưu diện tích cho căn hộ hiện đại.",
                    material_note="MDF chống ẩm",
                    color_tone="Trắng nhám",
                    dimension_note="180 x 60 x 220 cm",
                    unit_price=9990000,
                    on_hand_qty=10,
                    primary_image_url=item_media_urls["tu-ao-nova"],
                    is_published=True,
                ),
                CatalogItem(
                    space_id=spaces["phong bep"].space_id,
                    title="Bàn ăn Orion",
                    summary_text="Bàn ăn gỗ tự nhiên phù hợp gia đình 4-6 người.",
                    material_note="Gỗ sồi tự nhiên",
                    color_tone="Gỗ óc chó",
                    dimension_note="180 x 90 x 75 cm",
                    unit_price=8990000,
                    on_hand_qty=9,
                    primary_image_url=item_media_urls["ban-an-orion"],
                    is_published=True,
                ),
                CatalogItem(
                    space_id=spaces["phong lam viec"].space_id,
                    title="Bàn làm việc Zenith",
                    summary_text="Bàn làm việc gỗ veneer có hộc kéo và khung chân chắc chắn.",
                    material_note="MDF phủ veneer",
                    color_tone="Gỗ sáng",
                    dimension_note="140 x 70 x 75 cm",
                    unit_price=4590000,
                    on_hand_qty=15,
                    primary_image_url=item_media_urls["ban-lam-viec-zenith"],
                    is_published=True,
                ),
            ],
        )

    db.commit()
