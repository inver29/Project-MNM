from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.api.deps import DbSession, require_roles
from app.models import (
    AccountRole,
    CatalogItem,
    OrderStatus,
    PurchaseImportBatch,
    PurchaseImportLine,
    ReturnRequest,
    ReturnRequestStatus,
    SalesOrder,
)
from app.schemas.contracts import (
    ReportLowStockItemRead,
    ReportMetricRead,
    ReportSeriesPoint,
    ReportSnapshotRead,
    ReportStatusBreakdownRead,
    ReportTopItemRead,
)


router = APIRouter()
LOW_STOCK_THRESHOLD = 5


def month_key(value: date) -> str:
    return value.strftime("%m/%Y")


@router.get(
    "/reports/overview",
    response_model=ReportSnapshotRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def get_report_snapshot(db: DbSession) -> ReportSnapshotRead:
    orders = list(
        db.scalars(
            select(SalesOrder)
            .options(selectinload(SalesOrder.lines))
            .order_by(SalesOrder.placed_at.desc())
        ).unique()
    )
    items = list(db.scalars(select(CatalogItem).order_by(CatalogItem.on_hand_qty.asc(), CatalogItem.title.asc())))
    return_requests = list(
        db.scalars(
            select(ReturnRequest)
            .options(joinedload(ReturnRequest.order))
            .order_by(ReturnRequest.created_at.desc())
        ).unique()
    )
    import_batches = list(
        db.scalars(
            select(PurchaseImportBatch)
            .options(selectinload(PurchaseImportBatch.items))
            .order_by(PurchaseImportBatch.created_at.desc())
        ).unique()
    )

    active_orders = [order for order in orders if order.order_status != OrderStatus.da_huy]
    completed_orders = [order for order in orders if order.order_status == OrderStatus.hoan_thanh]
    revenue_total = sum(int(order.grand_total) for order in active_orders)
    imported_total = sum(
        int(line.import_unit_price) * line.imported_qty
        for batch in import_batches
        for line in batch.items
    )

    metrics = [
        ReportMetricRead(label="Tổng doanh thu", value=revenue_total, format="currency"),
        ReportMetricRead(label="Tổng đơn hàng", value=len(orders), format="count"),
        ReportMetricRead(label="Yêu cầu hoàn tiền", value=len(return_requests), format="count"),
        ReportMetricRead(label="Phiếu nhập hàng", value=len(import_batches), format="count"),
    ]

    order_status_breakdown = [
        ReportStatusBreakdownRead(status=status.value, label=label, value=sum(1 for order in orders if order.order_status == status))
        for status, label in [
            (OrderStatus.cho_xac_nhan, "Chờ xác nhận"),
            (OrderStatus.da_xac_nhan, "Đã xác nhận"),
            (OrderStatus.dang_giao, "Đang giao"),
            (OrderStatus.hoan_thanh, "Hoàn thành"),
            (OrderStatus.da_huy, "Đã hủy"),
        ]
    ]

    return_status_breakdown = [
        ReportStatusBreakdownRead(
            status=status.value,
            label=label,
            value=sum(1 for request_item in return_requests if request_item.status == status),
        )
        for status, label in [
            (ReturnRequestStatus.dang_xu_ly, "Đang xử lý"),
            (ReturnRequestStatus.chap_nhan, "Chấp nhận"),
            (ReturnRequestStatus.tu_choi, "Từ chối"),
        ]
    ]

    today = date.today()
    month_order: list[tuple[int, int]] = []
    current_year = today.year
    current_month = today.month
    for offset in range(5, -1, -1):
        month = current_month - offset
        year = current_year
        while month <= 0:
            month += 12
            year -= 1
        month_order.append((year, month))

    revenue_map = defaultdict(int)
    order_map = defaultdict(int)
    import_map = defaultdict(int)

    for order in active_orders:
        key = month_key(order.placed_at.date())
        revenue_map[key] += int(order.grand_total)
        order_map[key] += 1

    for batch in import_batches:
        key = month_key(batch.created_at.date())
        import_map[key] += sum(int(line.import_unit_price) * line.imported_qty for line in batch.items)

    monthly_series = []
    for year, month in month_order:
        label = f"{month:02d}/{year}"
        monthly_series.append(
            ReportSeriesPoint(
                label=label,
                revenue=revenue_map[label],
                orders=order_map[label],
                imports=import_map[label],
            )
        )

    sold_item_map: dict[int, ReportTopItemRead] = {}
    for order in completed_orders:
        for line in order.lines:
            current = sold_item_map.get(line.item_id)
            if current is None:
                sold_item_map[line.item_id] = ReportTopItemRead(
                    item_id=line.item_id,
                    title=line.item_title_snapshot,
                    quantity=line.ordered_qty,
                    revenue=int(line.line_total),
                )
            else:
                current.quantity += line.ordered_qty
                current.revenue += int(line.line_total)

    top_items = sorted(
        sold_item_map.values(),
        key=lambda item: (-item.quantity, -item.revenue, item.title.lower()),
    )[:6]

    low_stock_items = [
        ReportLowStockItemRead(
            item_id=item.item_id,
            title=item.title,
            available_qty=int(item.on_hand_qty),
            list_price=int(item.unit_price),
        )
        for item in items
        if item.on_hand_qty <= LOW_STOCK_THRESHOLD
    ][:8]

    return ReportSnapshotRead(
        metrics=metrics,
        order_status_breakdown=order_status_breakdown,
        return_status_breakdown=return_status_breakdown,
        monthly_series=monthly_series,
        top_items=top_items,
        low_stock_items=low_stock_items,
    )
