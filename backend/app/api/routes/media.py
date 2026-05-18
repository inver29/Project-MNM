from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import StoredMedia


router = APIRouter()


def build_content_disposition(file_name: str) -> str:
    display_name = (file_name or "media").replace("\\", "/").split("/")[-1] or "media"
    ascii_fallback = "".join(
        character if 32 <= ord(character) < 127 and character not in {'"', "\\", ";"} else "_"
        for character in display_name
    ).strip(" .")
    if not ascii_fallback:
        ascii_fallback = "media"

    encoded_name = quote(display_name, safe="")
    return f"inline; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_name}"


@router.get("/media/{media_id}/content")
def get_media_content(media_id: int, db: DbSession) -> Response:
    media = db.scalar(select(StoredMedia).where(StoredMedia.media_id == media_id))
    if not media:
        raise HTTPException(status_code=404, detail="Không tìm thấy tệp media.")

    return Response(
        content=media.binary_data,
        media_type=media.content_type,
        headers={
            "Cache-Control": "public, max-age=86400",
            "Content-Disposition": build_content_disposition(media.file_name),
        },
    )
