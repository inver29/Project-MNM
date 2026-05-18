from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import (
    CatalogItem,
    OrderInventoryAllocation,
    PurchaseImportBatch,
    PurchaseImportLine,
    ReturnRequest,
    SalesOrder,
    SalesOrderLine,
)


def build_import_invoice_code(prefix: str = "PN") -> str:
    return f"{prefix}{datetime.now().strftime('%Y%m%d%H%M%S%f')}"


def get_order_item_ids(order: SalesOrder) -> list[int]:
    return sorted({line.item_id for line in order.lines})


def lock_catalog_items(db, item_ids: list[int]) -> dict[int, CatalogItem]:
    if not item_ids:
        return {}

    items = list(
        db.scalars(
            select(CatalogItem)
            .where(CatalogItem.item_id.in_(item_ids))
            .order_by(CatalogItem.item_id.asc())
            .with_for_update()
        )
    )
    locked = {item.item_id: item for item in items}
    missing_ids = sorted(set(item_ids) - set(locked))
    if missing_ids:
        raise ValueError("Có sản phẩm không tồn tại trong hệ thống.")
    return locked


def lock_import_lines(db, item_ids: list[int]) -> tuple[dict[int, list[PurchaseImportLine]], dict[int, PurchaseImportLine]]:
    if not item_ids:
        return {}, {}

    lines = list(
        db.scalars(
            select(PurchaseImportLine)
            .where(PurchaseImportLine.item_id.in_(item_ids))
            .order_by(
                PurchaseImportLine.item_id.asc(),
                PurchaseImportLine.created_at.asc(),
                PurchaseImportLine.import_line_id.asc(),
            )
            .with_for_update()
        )
    )
    grouped: dict[int, list[PurchaseImportLine]] = {}
    lookup: dict[int, PurchaseImportLine] = {}
    for line in lines:
        grouped.setdefault(line.item_id, []).append(line)
        lookup[line.import_line_id] = line
    return grouped, lookup


def ensure_inventory_baseline(db) -> None:
    items = list(
        db.scalars(
            select(CatalogItem)
            .where(CatalogItem.on_hand_qty > 0)
            .where(~CatalogItem.purchase_import_lines.any())
            .order_by(CatalogItem.item_id.asc())
        )
    )
    if not items:
        return

    batch = PurchaseImportBatch(
        invoice_code=build_import_invoice_code("BASE"),
        note="Đồng bộ tồn kho khởi tạo cho các sản phẩm đã có tồn trước khi bổ sung theo dõi phiếu nhập.",
    )
    db.add(batch)
    db.flush()

    for item in items:
        db.add(
            PurchaseImportLine(
                batch_id=batch.batch_id,
                item_id=item.item_id,
                item_title_snapshot=item.title,
                imported_qty=int(item.on_hand_qty),
                remaining_qty=int(item.on_hand_qty),
                import_unit_price=int(item.unit_price),
                sale_unit_price_snapshot=int(item.unit_price),
                note="Tồn kho khởi tạo",
            )
        )


def load_order_with_inventory(db, sales_order_id: int, *, lock: bool = False) -> SalesOrder | None:
    statement = (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.return_request).selectinload(ReturnRequest.evidences),
            selectinload(SalesOrder.lines).selectinload(SalesOrderLine.item),
            selectinload(SalesOrder.lines)
            .selectinload(SalesOrderLine.inventory_allocations)
            .selectinload(OrderInventoryAllocation.import_line),
        )
        .where(SalesOrder.sales_order_id == sales_order_id)
    )
    if lock:
        statement = statement.with_for_update()
    return db.scalar(statement)


def deduct_inventory_for_order(db, order: SalesOrder, *, prefer_existing_allocations: bool = False) -> None:
    item_ids = get_order_item_ids(order)
    locked_items = lock_catalog_items(db, item_ids)
    grouped_import_lines, import_line_lookup = lock_import_lines(db, item_ids)

    for line in order.lines:
        item = locked_items.get(line.item_id)
        if not item:
            raise ValueError("Không tìm thấy sản phẩm để trừ tồn kho.")
        if item.on_hand_qty < line.ordered_qty:
            raise ValueError(f"Sản phẩm '{line.item_title_snapshot}' không đủ số lượng tồn.")

        existing_allocations = sorted(
            list(line.inventory_allocations),
            key=lambda allocation: allocation.import_line_id,
        )

        if prefer_existing_allocations and existing_allocations:
            restored_total = sum(allocation.allocated_qty for allocation in existing_allocations)
            if restored_total != line.ordered_qty:
                raise ValueError("Dữ liệu phân bổ tồn kho của đơn hàng không còn hợp lệ.")
            for allocation in existing_allocations:
                import_line = import_line_lookup.get(allocation.import_line_id)
                if not import_line or import_line.remaining_qty < allocation.allocated_qty:
                    raise ValueError("Không đủ tồn kho để kích hoạt lại đơn hàng.")
                import_line.remaining_qty -= allocation.allocated_qty
        else:
            if existing_allocations:
                for allocation in existing_allocations:
                    db.delete(allocation)
                db.flush()

            available_import_lines = grouped_import_lines.get(line.item_id, [])
            available_qty = sum(import_line.remaining_qty for import_line in available_import_lines)
            if available_qty < line.ordered_qty:
                raise ValueError(
                    f"Không đủ dữ liệu phiếu nhập để phân bổ tồn kho cho sản phẩm '{line.item_title_snapshot}'."
                )

            remaining_qty = line.ordered_qty
            for import_line in available_import_lines:
                if remaining_qty <= 0:
                    break
                if import_line.remaining_qty <= 0:
                    continue
                take_qty = min(import_line.remaining_qty, remaining_qty)
                import_line.remaining_qty -= take_qty
                db.add(
                    OrderInventoryAllocation(
                        order_line_id=line.order_line_id,
                        import_line_id=import_line.import_line_id,
                        allocated_qty=take_qty,
                    )
                )
                remaining_qty -= take_qty

            if remaining_qty > 0:
                raise ValueError(
                    f"Không thể hoàn tất phân bổ tồn kho cho sản phẩm '{line.item_title_snapshot}'."
                )

        item.on_hand_qty -= line.ordered_qty


def restore_inventory_for_order(db, order: SalesOrder) -> None:
    item_ids = get_order_item_ids(order)
    locked_items = lock_catalog_items(db, item_ids)
    _, import_line_lookup = lock_import_lines(db, item_ids)

    for line in order.lines:
        item = locked_items.get(line.item_id)
        if not item:
            raise ValueError("Không tìm thấy sản phẩm để hoàn tồn kho.")
        item.on_hand_qty += line.ordered_qty

        for allocation in line.inventory_allocations:
            import_line = import_line_lookup.get(allocation.import_line_id)
            if not import_line:
                raise ValueError("Không tìm thấy dữ liệu phiếu nhập để hoàn tồn kho.")
            import_line.remaining_qty += allocation.allocated_qty
