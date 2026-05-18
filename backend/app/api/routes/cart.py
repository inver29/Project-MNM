from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import joinedload

from app.api.deps import CurrentAccount, DbSession
from app.api.routes.catalog import build_item_response
from app.models import CatalogItem, ShoppingCartLine
from app.schemas.contracts import (
    CartBulkSelectionUpdate,
    CartItemAdd,
    CartItemUpdate,
    CartLineRead,
    CartSelectionUpdate,
)


router = APIRouter()


def cart_query(account_id: int):
    return (
        select(ShoppingCartLine)
        .where(ShoppingCartLine.account_id == account_id)
        .options(joinedload(ShoppingCartLine.item).joinedload(CatalogItem.space))
        .order_by(
            ShoppingCartLine.updated_at.desc(),
            ShoppingCartLine.cart_line_id.desc(),
        )
    )


def build_cart_line_response(line: ShoppingCartLine) -> CartLineRead:
    item_payload = build_item_response(line.item).model_dump()
    return CartLineRead(
        **item_payload,
        basket_line_id=line.cart_line_id,
        quantity=line.quantity,
        line_total=int(line.item.unit_price) * line.quantity,
        is_selected=line.is_selected,
    )


def ensure_cart_item_available(item: CatalogItem) -> None:
    if not item.is_published or not item.space.is_visible:
        raise HTTPException(status_code=400, detail="Sản phẩm này hiện không còn kinh doanh.")
    if item.on_hand_qty <= 0:
        raise HTTPException(status_code=400, detail="Sản phẩm này hiện đã hết hàng.")


def get_item_for_cart(db: DbSession, item_id: int) -> CatalogItem:
    item = db.scalar(
        select(CatalogItem)
        .options(joinedload(CatalogItem.space))
        .where(CatalogItem.item_id == item_id)
    )
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm.")
    return item


def get_cart_line_or_404(db: DbSession, account_id: int, item_id: int) -> ShoppingCartLine:
    line = db.scalar(cart_query(account_id).where(ShoppingCartLine.item_id == item_id))
    if not line:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm trong giỏ hàng.")
    return line


def synchronize_cart_lines(db: DbSession, account_id: int) -> list[ShoppingCartLine]:
    lines = list(db.scalars(cart_query(account_id)).unique())
    has_changes = False

    for line in lines:
        item = line.item
        if not item.is_published or not item.space.is_visible or item.on_hand_qty <= 0:
            db.delete(line)
            has_changes = True
            continue

        next_quantity = min(line.quantity, item.on_hand_qty)
        if next_quantity != line.quantity:
            line.quantity = next_quantity
            has_changes = True

    if has_changes:
        db.commit()
        lines = list(db.scalars(cart_query(account_id)).unique())

    return lines


def get_cart_lines_by_item_ids(
    db: DbSession,
    account_id: int,
    item_ids: set[int],
) -> list[ShoppingCartLine]:
    if not item_ids:
        return []
    lines = synchronize_cart_lines(db, account_id)
    return [line for line in lines if line.item_id in item_ids]


@router.get("/cart", response_model=list[CartLineRead])
def get_my_cart(db: DbSession, current_account: CurrentAccount) -> list[CartLineRead]:
    lines = synchronize_cart_lines(db, current_account.account_id)
    return [build_cart_line_response(line) for line in lines]


@router.post("/cart/items", response_model=CartLineRead, status_code=status.HTTP_201_CREATED)
def add_cart_item(
    payload: CartItemAdd,
    db: DbSession,
    current_account: CurrentAccount,
) -> CartLineRead:
    item = get_item_for_cart(db, payload.item_id)
    ensure_cart_item_available(item)

    line = db.scalar(
        cart_query(current_account.account_id).where(ShoppingCartLine.item_id == payload.item_id)
    )
    next_quantity = payload.quantity
    if line:
        next_quantity += line.quantity

    if next_quantity > item.on_hand_qty:
        raise HTTPException(
            status_code=400,
            detail=f"Sản phẩm '{item.title}' chỉ còn {item.on_hand_qty} món trong kho.",
        )

    if line:
        line.quantity = next_quantity
        if payload.is_selected:
            line.is_selected = True
    else:
        line = ShoppingCartLine(
            account_id=current_account.account_id,
            item_id=item.item_id,
            quantity=next_quantity,
            is_selected=payload.is_selected,
        )
        db.add(line)

    db.commit()
    line = get_cart_line_or_404(db, current_account.account_id, payload.item_id)
    return build_cart_line_response(line)


@router.put("/cart/items/{item_id}", response_model=CartLineRead)
def update_cart_item(
    item_id: int,
    payload: CartItemUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> CartLineRead:
    line = get_cart_line_or_404(db, current_account.account_id, item_id)
    ensure_cart_item_available(line.item)

    if payload.quantity is None and payload.is_selected is None:
        raise HTTPException(status_code=400, detail="Không có thay đổi nào được gửi lên.")

    if payload.quantity is not None:
        if payload.quantity > line.item.on_hand_qty:
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{line.item.title}' chỉ còn {line.item.on_hand_qty} món trong kho.",
            )
        line.quantity = payload.quantity

    if payload.is_selected is not None:
        line.is_selected = payload.is_selected

    db.commit()
    line = get_cart_line_or_404(db, current_account.account_id, item_id)
    return build_cart_line_response(line)


@router.patch("/cart/items/{item_id}/selection", response_model=CartLineRead)
def update_cart_item_selection(
    item_id: int,
    payload: CartSelectionUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> CartLineRead:
    line = get_cart_line_or_404(db, current_account.account_id, item_id)
    line.is_selected = payload.is_selected
    db.commit()
    line = get_cart_line_or_404(db, current_account.account_id, item_id)
    return build_cart_line_response(line)


@router.post("/cart/selection", response_model=list[CartLineRead])
def bulk_update_cart_selection(
    payload: CartBulkSelectionUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> list[CartLineRead]:
    lines = synchronize_cart_lines(db, current_account.account_id)
    target_item_ids = set(payload.item_ids or [])

    if payload.item_ids is None:
        target_lines = lines
    else:
        target_lines = [line for line in lines if line.item_id in target_item_ids]
        missing_ids = sorted(target_item_ids - {line.item_id for line in target_lines})
        if missing_ids:
            raise HTTPException(status_code=404, detail="Có sản phẩm không tồn tại trong giỏ hàng.")

    for line in target_lines:
        line.is_selected = payload.is_selected

    db.commit()
    lines = synchronize_cart_lines(db, current_account.account_id)
    return [build_cart_line_response(line) for line in lines]


@router.delete(
    "/cart/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
)
def remove_cart_item(item_id: int, db: DbSession, current_account: CurrentAccount) -> None:
    line = get_cart_line_or_404(db, current_account.account_id, item_id)
    db.delete(line)
    db.commit()


@router.delete(
    "/cart",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
)
def clear_my_cart(db: DbSession, current_account: CurrentAccount) -> None:
    db.execute(delete(ShoppingCartLine).where(ShoppingCartLine.account_id == current_account.account_id))
    db.commit()
