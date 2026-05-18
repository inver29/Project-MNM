import hashlib
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.deps import CurrentAccount, DbSession, require_roles
from app.models import AccountRole
from app.schemas.contracts import UploadResult
from app.services.media import build_media_url, guess_content_type, store_media_bytes


router = APIRouter()
ALLOWED_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


async def save_upload(image: UploadFile, db: DbSession, *, source_group: str) -> UploadResult:
    file_name = image.filename or "upload"
    suffix = Path(file_name).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Chỉ hỗ trợ các định dạng ảnh .jpg, .jpeg, .png hoặc .webp.",
        )

    file_bytes = await image.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Tệp ảnh tải lên đang rỗng.")
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Kích thước ảnh không được vượt quá 5MB.")

    media = store_media_bytes(
        db,
        file_name=file_name,
        binary_data=file_bytes,
        content_type=guess_content_type(file_name, image.content_type),
        source_key=f"{source_group}:{hashlib.sha256(file_bytes).hexdigest()}:{file_name}",
    )
    db.commit()
    return UploadResult(file_name=media.file_name, file_url=build_media_url(media.media_id))


@router.post(
    "/product-image",
    response_model=UploadResult,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
async def upload_product_image(
    db: DbSession,
    image: UploadFile = File(...),
) -> UploadResult:
    return await save_upload(image, db, source_group="product")


@router.post(
    "/space-image",
    response_model=UploadResult,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
async def upload_space_image(
    db: DbSession,
    image: UploadFile = File(...),
) -> UploadResult:
    return await save_upload(image, db, source_group="space")


@router.post(
    "/supporting-image",
    response_model=UploadResult,
    status_code=status.HTTP_201_CREATED,
)
async def upload_supporting_image(
    db: DbSession,
    current_account: CurrentAccount,
    image: UploadFile = File(...),
) -> UploadResult:
    source_group = f"support:{current_account.account_id}"
    return await save_upload(image, db, source_group=source_group)
