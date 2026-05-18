from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import CatalogItem, ShoppingCartLine


@dataclass(slots=True)
class CheckoutItemSnapshot:
    item: CatalogItem
    requested_qty: int
    unit_price: int
    line_total: int


@dataclass(slots=True)
class CheckoutSnapshot:
    cart_lines: list[ShoppingCartLine]
    checked_out_cart_line_ids: list[int]
    requested_quantities: dict[int, int]
    item_snapshots: list[CheckoutItemSnapshot]
    subtotal_amount: int


def build_requested_quantities_from_items(items_payload: list[tuple[int, int]]) -> dict[int, int]:
    requested_quantities: dict[int, int] = defaultdict(int)
    for item_id, requested_qty in items_payload:
        requested_quantities[item_id] += requested_qty
    return requested_quantities


def build_requested_quantities_from_cart_lines(cart_lines: list[ShoppingCartLine]) -> dict[int, int]:
    requested_quantities: dict[int, int] = defaultdict(int)
    for line in cart_lines:
        requested_quantities[line.item_id] += line.quantity
    return requested_quantities


def load_checkout_cart_lines(
    db,
    account_id: int,
    cart_item_ids: list[int],
    *,
    lock: bool,
) -> list[ShoppingCartLine]:
    requested_ids = list(dict.fromkeys(cart_item_ids))
    statement = select(ShoppingCartLine).where(ShoppingCartLine.account_id == account_id)
    if requested_ids:
        statement = statement.where(ShoppingCartLine.cart_line_id.in_(requested_ids))
    statement = statement.options(selectinload(ShoppingCartLine.item).selectinload(CatalogItem.space))
    if lock:
        statement = statement.with_for_update()

    lines = list(db.scalars(statement).unique())

    if requested_ids:
        line_lookup = {line.cart_line_id: line for line in lines}
        missing_ids = [cart_line_id for cart_line_id in requested_ids if cart_line_id not in line_lookup]
        if missing_ids:
            raise HTTPException(status_code=404, detail="Co san pham khong con ton tai trong gio hang.")
        ordered_lines = [line_lookup[cart_line_id] for cart_line_id in requested_ids]
    else:
        ordered_lines = sorted(lines, key=lambda line: (line.updated_at, line.cart_line_id), reverse=True)

    for line in ordered_lines:
        if not line.item.is_published or not line.item.space.is_visible:
            raise HTTPException(status_code=400, detail=f"San pham '{line.item.title}' dang ngung kinh doanh.")
        if line.item.on_hand_qty < line.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"San pham '{line.item.title}' khong con du so luong trong gio hang.",
            )

    return ordered_lines


def validate_checkout_snapshot(
    requested_quantities_from_payload: dict[int, int],
    cart_lines: list[ShoppingCartLine],
) -> None:
    if not cart_lines or not requested_quantities_from_payload:
        return

    current_quantities = build_requested_quantities_from_cart_lines(cart_lines)
    if requested_quantities_from_payload != current_quantities:
        raise HTTPException(
            status_code=409,
            detail="Gio hang da thay doi. Vui long quay lai kiem tra truoc khi dat don.",
        )


def lock_checkout_items(db, item_ids: list[int], *, lock: bool) -> dict[int, CatalogItem]:
    if not item_ids:
        return {}

    statement = (
        select(CatalogItem)
        .options(selectinload(CatalogItem.space))
        .where(CatalogItem.item_id.in_(item_ids))
        .order_by(CatalogItem.item_id.asc())
    )
    if lock:
        statement = statement.with_for_update()

    items = list(db.scalars(statement).unique())
    locked = {item.item_id: item for item in items}
    missing_ids = sorted(set(item_ids) - set(locked))
    if missing_ids:
        raise HTTPException(status_code=404, detail="Co san pham khong ton tai trong he thong.")
    return locked


def resolve_checkout_snapshot(
    db,
    account_id: int,
    cart_item_ids: list[int],
    items_payload: list[tuple[int, int]],
    *,
    lock: bool,
) -> CheckoutSnapshot:
    cart_lines = load_checkout_cart_lines(db, account_id, cart_item_ids, lock=lock)
    requested_quantities_from_payload = build_requested_quantities_from_items(items_payload)

    if cart_lines:
        validate_checkout_snapshot(requested_quantities_from_payload, cart_lines)
        requested_quantities = build_requested_quantities_from_cart_lines(cart_lines)
        checked_out_cart_line_ids = [line.cart_line_id for line in cart_lines]
    else:
        requested_quantities = requested_quantities_from_payload
        checked_out_cart_line_ids = []

    item_ids = sorted(requested_quantities)
    if not item_ids:
        raise HTTPException(status_code=400, detail="Can chon it nhat mot san pham de dat hang.")

    catalog_items = lock_checkout_items(db, item_ids, lock=lock)
    item_snapshots: list[CheckoutItemSnapshot] = []
    subtotal_amount = 0

    for item_id in item_ids:
        item = catalog_items[item_id]
        requested_qty = requested_quantities[item_id]
        if not item.is_published or not item.space.is_visible:
            raise HTTPException(status_code=400, detail=f"San pham '{item.title}' dang ngung kinh doanh.")
        if item.on_hand_qty < requested_qty:
            raise HTTPException(status_code=400, detail=f"San pham '{item.title}' khong du so luong ton.")

        unit_price = int(item.unit_price)
        line_total = unit_price * requested_qty
        subtotal_amount += line_total
        item_snapshots.append(
            CheckoutItemSnapshot(
                item=item,
                requested_qty=requested_qty,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    return CheckoutSnapshot(
        cart_lines=cart_lines,
        checked_out_cart_line_ids=checked_out_cart_line_ids,
        requested_quantities=requested_quantities,
        item_snapshots=item_snapshots,
        subtotal_amount=subtotal_amount,
    )
