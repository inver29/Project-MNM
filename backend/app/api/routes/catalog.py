from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import CurrentAccount, DbSession, OptionalCurrentAccount, require_roles
from app.models import (
    AccountRole,
    CatalogItem,
    CatalogItemReview,
    CatalogSpace,
    IdentityAccount,
    OrderStatus,
    SalesOrder,
    SalesOrderLine,
    slugify_text,
)
from app.schemas.contracts import (
    ItemCreate,
    ItemMediaRead,
    ItemRead,
    ItemReviewCreate,
    ItemReviewRead,
    ItemUpdate,
    SpaceCreate,
    SpaceRead,
    SpaceUpdate,
)


router = APIRouter()
MANAGEMENT_ROLES = {AccountRole.admin, AccountRole.nhan_vien}


def prettify_space_name(value: str) -> str:
    normalized = value.replace("_", " ").strip()
    return normalized[:1].upper() + normalized[1:] if normalized else value


def build_item_slug(item: CatalogItem) -> str:
    return f"{slugify_text(item.title)}-{item.item_id}"


def can_manage_catalog(current_account: IdentityAccount | None) -> bool:
    return bool(current_account and current_account.account_role in MANAGEMENT_ROLES)


def require_catalog_management_access(current_account: IdentityAccount | None) -> None:
    if not can_manage_catalog(current_account):
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem dữ liệu quản trị này.")


def build_space_response(space: CatalogSpace) -> SpaceRead:
    return SpaceRead(
        space_id=space.space_id,
        space_name=prettify_space_name(space.space_name),
        slug_token=slugify_text(space.space_name),
        teaser_text=space.summary_text or "",
        cover_image_url=space.cover_image_url,
        is_visible=space.is_visible,
        created_at=space.created_at,
        updated_at=space.updated_at,
    )


def build_item_response(item: CatalogItem) -> ItemRead:
    review_count = len(item.reviews)
    average_rating = (
        round(sum(review.rating_value for review in item.reviews) / review_count, 1)
        if review_count
        else 0
    )
    media_assets: list[ItemMediaRead] = []
    if item.primary_image_url:
        media_assets.append(
            ItemMediaRead(
                media_id=item.item_id,
                media_url=item.primary_image_url,
                alt_text=item.title,
                is_primary=True,
                display_rank=1,
            )
        )

    return ItemRead(
        item_id=item.item_id,
        space_id=item.space_id,
        item_code=f"SP-{item.item_id:04d}",
        slug_token=build_item_slug(item),
        title=item.title,
        summary_text=item.summary_text or "",
        material_note=item.material_note or "",
        color_tone=item.color_tone or "",
        design_style="",
        dimension_note=item.dimension_note or "",
        care_note="",
        list_price=int(item.unit_price),
        sale_price=None,
        lead_time_days=3,
        is_featured=item.item_id <= 4,
        is_published=item.is_published,
        created_at=item.created_at,
        updated_at=item.updated_at,
        space=build_space_response(item.space),
        media_assets=media_assets,
        available_qty=int(item.on_hand_qty),
        primary_image_url=item.primary_image_url,
        average_rating=average_rating,
        review_count=review_count,
    )


def build_item_review_response(review: CatalogItemReview) -> ItemReviewRead:
    return ItemReviewRead(
        review_id=review.review_id,
        account_id=review.account_id,
        account_display_name=review.account.display_name if review.account else f"Tài khoản #{review.account_id}",
        rating_value=review.rating_value,
        comment_text=review.comment_text or "",
        is_edited=review.is_edited,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


def get_space_or_404(db: DbSession, space_id: int) -> CatalogSpace:
    space = db.get(CatalogSpace, space_id)
    if not space:
        raise HTTPException(status_code=404, detail="Không tìm thấy không gian.")
    return space


def get_item_or_404(db: DbSession, item_id: int) -> CatalogItem:
    item = db.scalar(
        select(CatalogItem)
        .options(joinedload(CatalogItem.space), selectinload(CatalogItem.reviews))
        .where(CatalogItem.item_id == item_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    return item


def assert_public_item_access(item: CatalogItem, current_account: IdentityAccount | None) -> None:
    if can_manage_catalog(current_account):
        return
    if not item.is_published or not item.space.is_visible:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")


def ensure_account_can_review_item(db: DbSession, current_account: IdentityAccount, item_id: int) -> None:
    completed_order_id = db.scalar(
        select(SalesOrder.sales_order_id)
        .join(SalesOrder.lines)
        .where(SalesOrder.account_id == current_account.account_id)
        .where(SalesOrder.order_status == OrderStatus.hoan_thanh)
        .where(SalesOrderLine.item_id == item_id)
        .limit(1)
    )
    if completed_order_id is None:
        raise HTTPException(
            status_code=400,
            detail="Chỉ có thể đánh giá sản phẩm sau khi bạn đã hoàn thành một đơn chứa sản phẩm này.",
        )


@router.get("/spaces", response_model=list[SpaceRead])
def list_spaces(
    db: DbSession,
    current_account: OptionalCurrentAccount,
    visible_only: bool = True,
) -> list[SpaceRead]:
    statement = select(CatalogSpace).order_by(CatalogSpace.created_at.asc(), CatalogSpace.space_name.asc())
    if visible_only:
        statement = statement.where(CatalogSpace.is_visible.is_(True))
    else:
        require_catalog_management_access(current_account)
    return [build_space_response(space) for space in db.scalars(statement)]


@router.post(
    "/spaces",
    response_model=SpaceRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def create_space(payload: SpaceCreate, db: DbSession) -> SpaceRead:
    normalized_name = payload.space_name.strip()
    existing = db.scalar(select(CatalogSpace).where(CatalogSpace.space_name.ilike(normalized_name)))
    if existing:
        raise HTTPException(status_code=400, detail="Không gian đã tồn tại.")

    space = CatalogSpace(
        space_name=normalized_name,
        summary_text=payload.summary_text.strip(),
        cover_image_url=payload.cover_image_url.strip() if payload.cover_image_url else None,
        is_visible=payload.is_visible,
    )
    db.add(space)
    db.commit()
    db.refresh(space)
    return build_space_response(space)


@router.put(
    "/spaces/{space_id}",
    response_model=SpaceRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def update_space(space_id: int, payload: SpaceUpdate, db: DbSession) -> SpaceRead:
    space = get_space_or_404(db, space_id)

    data = payload.model_dump(exclude_unset=True)
    for field_name, field_value in data.items():
        if isinstance(field_value, str):
            normalized_value = field_value.strip()
            if field_name == "space_name":
                existing = db.scalar(
                    select(CatalogSpace).where(
                        CatalogSpace.space_name.ilike(normalized_value),
                        CatalogSpace.space_id != space_id,
                    )
                )
                if existing:
                    raise HTTPException(status_code=400, detail="Không gian đã tồn tại.")
            setattr(space, field_name, normalized_value)
        else:
            setattr(space, field_name, field_value)

    db.commit()
    db.refresh(space)
    return build_space_response(space)


@router.delete(
    "/spaces/{space_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def delete_space(space_id: int, db: DbSession) -> None:
    space = get_space_or_404(db, space_id)
    if space.items:
        raise HTTPException(status_code=400, detail="Không gian đang có sản phẩm, không thể xóa.")
    db.delete(space)
    db.commit()


@router.get("/items", response_model=list[ItemRead])
def list_items(
    db: DbSession,
    current_account: OptionalCurrentAccount,
    search: str | None = None,
    space_slug: str | None = None,
    featured_only: bool = False,
    published_only: bool = True,
) -> list[ItemRead]:
    statement = (
        select(CatalogItem)
        .join(CatalogItem.space)
        .options(joinedload(CatalogItem.space), selectinload(CatalogItem.reviews))
        .order_by(CatalogItem.created_at.desc())
    )

    if published_only:
        statement = statement.where(
            CatalogItem.is_published.is_(True),
            CatalogSpace.is_visible.is_(True),
        )
    else:
        require_catalog_management_access(current_account)

    if search:
        keyword = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                CatalogItem.title.ilike(keyword),
                CatalogItem.summary_text.ilike(keyword),
                CatalogItem.material_note.ilike(keyword),
                CatalogItem.color_tone.ilike(keyword),
                CatalogItem.dimension_note.ilike(keyword),
            )
        )

    if space_slug:
        items = list(db.scalars(statement).unique())
        filtered = [item for item in items if slugify_text(item.space.space_name) == space_slug]
    else:
        filtered = list(db.scalars(statement).unique())

    if featured_only:
        filtered = filtered[:4]

    return [build_item_response(item) for item in filtered]


@router.get("/items/{item_id}", response_model=ItemRead)
def get_item(item_id: int, db: DbSession, current_account: OptionalCurrentAccount) -> ItemRead:
    item = get_item_or_404(db, item_id)
    assert_public_item_access(item, current_account)
    return build_item_response(item)


@router.get("/items/by-slug/{slug_token}", response_model=ItemRead)
def get_item_by_slug(
    slug_token: str,
    db: DbSession,
    current_account: OptionalCurrentAccount,
) -> ItemRead:
    items = list(
        db.scalars(
            select(CatalogItem)
            .join(CatalogItem.space)
            .options(joinedload(CatalogItem.space), selectinload(CatalogItem.reviews))
            .order_by(CatalogItem.item_id)
        ).unique()
    )
    exact_match = next((record for record in items if build_item_slug(record) == slug_token), None)
    if exact_match:
        assert_public_item_access(exact_match, current_account)
        return build_item_response(exact_match)

    legacy_matches = [record for record in items if slugify_text(record.title) == slug_token]
    if can_manage_catalog(current_account):
        accessible_matches = legacy_matches
    else:
        accessible_matches = [
            record for record in legacy_matches if record.is_published and record.space.is_visible
        ]

    if len(accessible_matches) == 1:
        return build_item_response(accessible_matches[0])
    if len(accessible_matches) > 1:
        raise HTTPException(
            status_code=409,
            detail="Đường dẫn sản phẩm này không còn duy nhất. Vui lòng mở lại từ danh sách sản phẩm mới nhất.",
        )
    raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")


@router.post(
    "/items",
    response_model=ItemRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def create_item(payload: ItemCreate, db: DbSession) -> ItemRead:
    get_space_or_404(db, payload.space_id)

    item = CatalogItem(
        space_id=payload.space_id,
        title=payload.title.strip(),
        summary_text=payload.summary_text.strip(),
        material_note=payload.material_note.strip(),
        color_tone=payload.color_tone.strip(),
        dimension_note=payload.dimension_note.strip(),
        unit_price=payload.unit_price,
        on_hand_qty=payload.on_hand_qty,
        primary_image_url=payload.primary_image_url.strip() if payload.primary_image_url else None,
        is_published=payload.is_published,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return build_item_response(get_item_or_404(db, item.item_id))


@router.put(
    "/items/{item_id}",
    response_model=ItemRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def update_item(item_id: int, payload: ItemUpdate, db: DbSession) -> ItemRead:
    item = get_item_or_404(db, item_id)

    data = payload.model_dump(exclude_unset=True)
    if "space_id" in data and data["space_id"] is not None:
        get_space_or_404(db, int(data["space_id"]))

    for field_name, field_value in data.items():
        if isinstance(field_value, str):
            setattr(item, field_name, field_value.strip())
        else:
            setattr(item, field_name, field_value)

    db.commit()
    db.refresh(item)
    return build_item_response(get_item_or_404(db, item_id))


@router.delete(
    "/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def delete_item(item_id: int, db: DbSession) -> None:
    item = get_item_or_404(db, item_id)
    if item.order_lines:
        item.is_published = False
    else:
        db.delete(item)
    db.commit()


@router.get("/items/{item_id}/reviews", response_model=list[ItemReviewRead])
def list_item_reviews(item_id: int, db: DbSession, current_account: OptionalCurrentAccount) -> list[ItemReviewRead]:
    item = get_item_or_404(db, item_id)
    assert_public_item_access(item, current_account)
    reviews = list(
        db.scalars(
            select(CatalogItemReview)
            .options(joinedload(CatalogItemReview.account))
            .where(CatalogItemReview.item_id == item_id)
            .order_by(CatalogItemReview.updated_at.desc(), CatalogItemReview.review_id.desc())
        )
    )
    return [build_item_review_response(review) for review in reviews]


@router.post("/items/{item_id}/reviews", response_model=ItemReviewRead, status_code=status.HTTP_201_CREATED)
def create_or_update_item_review(
    item_id: int,
    payload: ItemReviewCreate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ItemReviewRead:
    item = get_item_or_404(db, item_id)
    assert_public_item_access(item, current_account)
    ensure_account_can_review_item(db, current_account, item_id)

    existing_review = db.scalar(
        select(CatalogItemReview)
        .where(CatalogItemReview.item_id == item_id)
        .where(CatalogItemReview.account_id == current_account.account_id)
    )
    normalized_comment = payload.comment_text.strip()

    if existing_review:
        has_changes = (
            existing_review.rating_value != payload.rating_value
            or (existing_review.comment_text or "") != normalized_comment
        )
        existing_review.rating_value = payload.rating_value
        existing_review.comment_text = normalized_comment
        existing_review.is_edited = existing_review.is_edited or has_changes
        db.commit()
        review_id = existing_review.review_id
    else:
        review = CatalogItemReview(
            account_id=current_account.account_id,
            item_id=item_id,
            rating_value=payload.rating_value,
            comment_text=normalized_comment,
            is_edited=False,
        )
        db.add(review)
        db.commit()
        review_id = review.review_id

    review = db.scalar(
        select(CatalogItemReview)
        .options(joinedload(CatalogItemReview.account))
        .where(CatalogItemReview.review_id == review_id)
    )
    if not review:
        raise HTTPException(status_code=404, detail="Không tìm thấy đánh giá vừa lưu.")
    return build_item_review_response(review)
