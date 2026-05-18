import mimetypes
from pathlib import Path
from urllib.parse import urlparse

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models import CatalogItem, CatalogSpace, StoredMedia


BACKEND_ROOT = Path(__file__).resolve().parents[2]
MEDIA_URL_TEMPLATE = "{prefix}/media/{media_id}/content"


def build_media_url(media_id: int) -> str:
    settings = get_settings()
    return MEDIA_URL_TEMPLATE.format(prefix=settings.api_v1_prefix, media_id=media_id)


def guess_content_type(file_name: str, fallback: str | None = None) -> str:
    guessed_type, _ = mimetypes.guess_type(file_name)
    return fallback or guessed_type or "application/octet-stream"


def store_media_bytes(
    db: Session,
    *,
    file_name: str,
    binary_data: bytes,
    content_type: str,
    source_key: str | None = None,
) -> StoredMedia:
    if source_key:
        existing_media = db.scalar(select(StoredMedia).where(StoredMedia.source_key == source_key))
        if existing_media:
            return existing_media

    media = StoredMedia(
        source_key=source_key,
        file_name=file_name,
        content_type=content_type,
        binary_data=binary_data,
    )
    db.add(media)
    db.flush()
    return media


def resolve_media_reference_to_bytes(raw_reference: str) -> tuple[str, bytes, str, str] | None:
    normalized_reference = (raw_reference or "").strip()
    if not normalized_reference:
        return None

    if normalized_reference.startswith("/uploads/"):
        file_path = BACKEND_ROOT / normalized_reference.lstrip("/")
        if not file_path.exists() or not file_path.is_file():
            return None
        return (
            normalized_reference,
            file_path.read_bytes(),
            guess_content_type(file_path.name),
            file_path.name,
        )

    if normalized_reference.startswith("http://") or normalized_reference.startswith("https://"):
        try:
            response = httpx.get(normalized_reference, follow_redirects=True, timeout=20.0)
            response.raise_for_status()
        except httpx.HTTPError:
            return None
        parsed_url = urlparse(normalized_reference)
        file_name = Path(parsed_url.path).name or "remote-media"
        return (
            normalized_reference,
            response.content,
            guess_content_type(file_name, response.headers.get("content-type")),
            file_name,
        )

    return None


def migrate_media_reference(db: Session, raw_reference: str | None) -> str | None:
    normalized_reference = (raw_reference or "").strip()
    if not normalized_reference:
        return None
    if normalized_reference.startswith(f"{get_settings().api_v1_prefix}/media/"):
        return normalized_reference

    resolved = resolve_media_reference_to_bytes(normalized_reference)
    if not resolved:
        return None

    source_key, binary_data, content_type, file_name = resolved
    media = store_media_bytes(
        db,
        file_name=file_name,
        binary_data=binary_data,
        content_type=content_type,
        source_key=source_key,
    )
    return build_media_url(media.media_id)


def migrate_catalog_media_references(db: Session) -> None:
    spaces = list(db.scalars(select(CatalogSpace).where(CatalogSpace.cover_image_url.is_not(None))))
    items = list(db.scalars(select(CatalogItem).where(CatalogItem.primary_image_url.is_not(None))))

    for space in spaces:
        migrated_reference = migrate_media_reference(db, space.cover_image_url)
        space.cover_image_url = migrated_reference

    for item in items:
        migrated_reference = migrate_media_reference(db, item.primary_image_url)
        item.primary_image_url = migrated_reference
