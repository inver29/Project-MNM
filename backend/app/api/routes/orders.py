from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentAccount, DbSession, require_roles
from app.core.config import get_settings
from app.models import (
    AccountRole,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    ReturnRequest,
    SalesOrder,
    SalesOrderLine,
    ShoppingCartLine,
    slugify_text,
)
from app.schemas.contracts import (
    OrderCreate,
    OrderInvoiceRead,
    OrderPaymentStatusUpdate,
    OrderStatusUpdate,
    PaymentPreviewRead,
    ReturnRequestSummaryRead,
    SalesOrderLineRead,
    SalesOrderRead,
)
from app.services.checkout import resolve_checkout_snapshot
from app.services.delivery import calculate_furniture_delivery_quote, estimate_delivery_days, resolve_delivery_point
from app.services.inventory import deduct_inventory_for_order, ensure_inventory_baseline, restore_inventory_for_order


router = APIRouter()
settings = get_settings()
STORE_DISPLAY_NAME = settings.app_title.replace("API ", "") or "MNM Furniture"
STORE_ADDRESS = settings.delivery_origin_address
MOMO_ACCOUNT_NUMBER = "0901234567"
BANK_ACCOUNT_NUMBER = "1029384756"
BANK_PROVIDER_NAME = "Vietcombank"
BANK_RECIPIENT_NAME = "MNM FURNITURE"
MOMO_QR_IMAGE = "/payment-momo-qr.jpg"
BANK_QR_IMAGE = "/payment-bank-qr.jpg"

ADMIN_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.cho_xac_nhan: {OrderStatus.da_xac_nhan, OrderStatus.dang_giao, OrderStatus.da_huy},
    OrderStatus.da_xac_nhan: {OrderStatus.dang_giao, OrderStatus.da_huy},
    OrderStatus.dang_giao: {OrderStatus.hoan_thanh, OrderStatus.da_huy},
    OrderStatus.hoan_thanh: set(),
    OrderStatus.da_huy: set(),
}

PAYMENT_METHOD_LABELS: dict[PaymentMethod, str] = {
    PaymentMethod.tien_mat: "Thanh toán khi nhận hàng (COD)",
    PaymentMethod.momo: "Ví MoMo",
    PaymentMethod.chuyen_khoan: "Chuyển khoản ngân hàng",
}


def format_vnd(value: int) -> str:
    return f"{int(value):,}".replace(",", ".") + " d"


def build_order_invoice_code(order: SalesOrder) -> str:
    if order.sales_order_id and order.placed_at:
        return f"HD{order.placed_at.strftime('%Y%m%d')}-{order.sales_order_id:06d}"
    return "HD-TAM"


def build_order_payment_reference(order: SalesOrder) -> str:
    if order.order_code and order.placed_at:
        return f"{order.order_code}-{order.placed_at.strftime('%d%m')}"
    return "DH-TAM"


def build_order_estimated_delivery_at(order: SalesOrder) -> datetime | None:
    if not order.placed_at:
        return None
    delivery_days = estimate_delivery_days(float(order.distance_km or 0), 0)
    return order.placed_at + timedelta(days=max(delivery_days, 1))


def build_order_line_slug(item_id: int, title: str) -> str:
    return f"{slugify_text(title)}-{item_id}"


def build_payment_preview_payload(
    payment_method: PaymentMethod,
    amount: int,
    reference: str,
) -> PaymentPreviewRead:
    safe_amount = max(int(amount or 0), 0)

    if payment_method == PaymentMethod.tien_mat:
        return PaymentPreviewRead(
            payment_method=payment_method,
            payment_label=PAYMENT_METHOD_LABELS[payment_method],
            amount_value=safe_amount,
            amount_text=format_vnd(safe_amount),
            qr_image="",
            show_qr=False,
            transfer_note=reference,
            helper_text="Khách hàng thanh toán trực tiếp cho nhân viên giao hàng khi nhận đơn.",
            branch_name=settings.delivery_origin_name,
            branch_address=settings.delivery_origin_address,
        )

    if payment_method == PaymentMethod.momo:
        return PaymentPreviewRead(
            payment_method=payment_method,
            payment_label=PAYMENT_METHOD_LABELS[payment_method],
            amount_value=safe_amount,
            amount_text=format_vnd(safe_amount),
            qr_image=MOMO_QR_IMAGE,
            show_qr=True,
            recipient_name=STORE_DISPLAY_NAME,
            account_number=MOMO_ACCOUNT_NUMBER,
            provider_name="MoMo",
            transfer_note=reference,
            helper_text="Quét mã để mở nhanh màn hình thanh toán với sẵn số tiền và nội dung đối soát.",
            branch_name=settings.delivery_origin_name,
            branch_address=settings.delivery_origin_address,
        )

    return PaymentPreviewRead(
        payment_method=payment_method,
        payment_label=PAYMENT_METHOD_LABELS[payment_method],
        amount_value=safe_amount,
        amount_text=format_vnd(safe_amount),
        qr_image=BANK_QR_IMAGE,
        show_qr=True,
        recipient_name=BANK_RECIPIENT_NAME,
        account_number=BANK_ACCOUNT_NUMBER,
        provider_name=BANK_PROVIDER_NAME,
        transfer_note=reference,
        helper_text="Quét mã để nhập nhanh tài khoản nhận, số tiền cần chuyển và nội dung đối soát.",
        branch_name=settings.delivery_origin_name,
        branch_address=settings.delivery_origin_address,
    )


def build_return_request_summary(return_request: ReturnRequest | None) -> ReturnRequestSummaryRead | None:
    if not return_request:
        return None
    return ReturnRequestSummaryRead(
        return_request_id=return_request.return_request_id,
        status=return_request.status,
        created_at=return_request.created_at,
        processed_at=return_request.processed_at,
    )


def build_order_response(order: SalesOrder) -> SalesOrderRead:
    shipping_fee = int(order.shipping_fee or 0)
    subtotal_amount = int(order.grand_total) - shipping_fee
    return SalesOrderRead(
        sales_order_id=order.sales_order_id,
        order_code=order.order_code,
        account_id=order.account_id,
        account_display_name=order.account.display_name if order.account else None,
        account_email_address=order.account.email_address if order.account else None,
        consignee_name=order.consignee_name,
        consignee_phone=order.consignee_phone,
        delivery_line=order.delivery_line,
        delivery_note=order.delivery_note or "",
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        order_status=order.order_status,
        subtotal_amount=subtotal_amount,
        shipping_fee=shipping_fee,
        distance_km=float(order.distance_km or 0),
        grand_total=int(order.grand_total),
        invoice_code=build_order_invoice_code(order),
        payment_reference=build_order_payment_reference(order),
        placed_at=order.placed_at,
        estimated_delivery_at=build_order_estimated_delivery_at(order),
        completed_at=order.completed_at,
        cancelled_at=order.cancelled_at,
        return_request=build_return_request_summary(order.return_request),
        lines=[
            SalesOrderLineRead(
                order_line_id=line.order_line_id,
                item_id=line.item_id,
                item_slug_token=build_order_line_slug(line.item_id, line.item_title_snapshot),
                item_title_snapshot=line.item_title_snapshot,
                unit_price_snapshot=int(line.unit_price_snapshot),
                ordered_qty=line.ordered_qty,
                line_total=int(line.line_total),
            )
            for line in order.lines
        ],
    )


def order_query():
    return (
        select(SalesOrder)
        .options(
            selectinload(SalesOrder.lines).selectinload(SalesOrderLine.inventory_allocations),
            selectinload(SalesOrder.return_request),
            selectinload(SalesOrder.account),
        )
    )


def get_order_or_404(db: DbSession, sales_order_id: int, *, lock: bool = False) -> SalesOrder:
    statement = order_query().where(SalesOrder.sales_order_id == sales_order_id)
    if lock:
        statement = statement.with_for_update()

    order = db.scalar(statement)
    if not order:
        raise HTTPException(status_code=404, detail="Khong tim thay don hang.")
    return order


def ensure_customer_owns_order(order: SalesOrder, current_account: CurrentAccount) -> None:
    if order.account_id != current_account.account_id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen thuc hien thao tac nay.")


def validate_admin_status_transition(current_status: OrderStatus, next_status: OrderStatus) -> None:
    if next_status == current_status:
        return
    if next_status not in ADMIN_STATUS_TRANSITIONS[current_status]:
        raise HTTPException(status_code=400, detail="Khong the chuyen trang thai don hang theo luong nay.")


def validate_admin_payment_status_transition(order: SalesOrder, next_status: PaymentStatus) -> None:
    if next_status == order.payment_status:
        return
    if next_status == PaymentStatus.da_hoan_tien:
        raise HTTPException(
            status_code=400,
            detail="Trang thai hoan tien duoc he thong cap nhat tu dong tu luong tra hang / hoan tien.",
        )
    if order.payment_status == PaymentStatus.da_hoan_tien:
        raise HTTPException(
            status_code=400,
            detail="Don hang nay da duoc hoan tien nen khong the cap nhat lai trang thai thanh toan thu cong.",
        )
    if order.order_status == OrderStatus.da_huy:
        raise HTTPException(
            status_code=400,
            detail="Khong the cap nhat thanh toan cho don hang da huy.",
        )
    if order.payment_method == PaymentMethod.tien_mat and next_status == PaymentStatus.da_thanh_toan:
        if order.order_status not in {OrderStatus.da_xac_nhan, OrderStatus.dang_giao, OrderStatus.hoan_thanh}:
            raise HTTPException(
                status_code=400,
                detail="Don tien mat chi nen xac nhan da thanh toan sau khi don da duoc xu ly.",
            )


def apply_status_change(db: DbSession, order: SalesOrder, next_status: OrderStatus) -> None:
    if next_status == order.order_status:
        return

    if next_status == OrderStatus.da_huy and order.order_status != OrderStatus.da_huy:
        restore_inventory_for_order(db, order)
        order.cancelled_at = datetime.now()
    elif order.order_status == OrderStatus.da_huy and next_status != OrderStatus.da_huy:
        deduct_inventory_for_order(db, order, prefer_existing_allocations=True)
        order.cancelled_at = None

    if next_status == OrderStatus.hoan_thanh:
        order.completed_at = datetime.now()
        if order.payment_method == PaymentMethod.tien_mat:
            order.payment_status = PaymentStatus.da_thanh_toan
    elif order.order_status == OrderStatus.hoan_thanh and next_status != OrderStatus.hoan_thanh:
        order.completed_at = None

    order.order_status = next_status


@router.get("/payment-preview", response_model=PaymentPreviewRead)
def get_payment_preview(
    payment_method: PaymentMethod = PaymentMethod.tien_mat,
    amount: int = 0,
    reference: str = "",
) -> PaymentPreviewRead:
    normalized_reference = reference.strip() or f"TAM-{max(int(amount or 0), 0)}"
    return build_payment_preview_payload(payment_method, amount, normalized_reference)


@router.get("/orders", response_model=list[SalesOrderRead])
def list_orders(
    db: DbSession,
    current_account: CurrentAccount,
    scope: str = "mine",
) -> list[SalesOrderRead]:
    statement = order_query().order_by(SalesOrder.placed_at.desc())
    if scope != "all" or current_account.account_role == AccountRole.khach_hang:
        statement = statement.where(SalesOrder.account_id == current_account.account_id)

    orders = list(db.scalars(statement).unique())
    return [build_order_response(order) for order in orders]


@router.get("/orders/{sales_order_id}", response_model=SalesOrderRead)
def get_order(sales_order_id: int, db: DbSession, current_account: CurrentAccount) -> SalesOrderRead:
    order = get_order_or_404(db, sales_order_id)
    if current_account.account_role == AccountRole.khach_hang and order.account_id != current_account.account_id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem don hang nay.")
    return build_order_response(order)


@router.get("/orders/{sales_order_id}/invoice", response_model=OrderInvoiceRead)
def get_order_invoice(
    sales_order_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> OrderInvoiceRead:
    order = get_order_or_404(db, sales_order_id)
    if current_account.account_role == AccountRole.khach_hang and order.account_id != current_account.account_id:
        raise HTTPException(status_code=403, detail="Ban khong co quyen xem hoa don cua don hang nay.")

    shipping_fee = int(order.shipping_fee or 0)
    return OrderInvoiceRead(
        sales_order_id=order.sales_order_id,
        order_code=order.order_code,
        invoice_code=build_order_invoice_code(order),
        placed_at=order.placed_at,
        invoice_printed_at=datetime.now(),
        store_name=STORE_DISPLAY_NAME,
        store_address=STORE_ADDRESS,
        invoice_staff_display_name="Nhan vien cua hang noi that MNM",
        consignee_name=order.consignee_name,
        consignee_phone=order.consignee_phone,
        delivery_line=order.delivery_line,
        delivery_note=order.delivery_note or "",
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        payment_reference=build_order_payment_reference(order),
        subtotal_amount=int(order.grand_total) - shipping_fee,
        shipping_fee=shipping_fee,
        distance_km=float(order.distance_km or 0),
        grand_total=int(order.grand_total),
        lines=[
            SalesOrderLineRead(
                order_line_id=line.order_line_id,
                item_id=line.item_id,
                item_slug_token=build_order_line_slug(line.item_id, line.item_title_snapshot),
                item_title_snapshot=line.item_title_snapshot,
                unit_price_snapshot=int(line.unit_price_snapshot),
                ordered_qty=line.ordered_qty,
                line_total=int(line.line_total),
            )
            for line in order.lines
        ],
    )


@router.post("/orders", response_model=SalesOrderRead, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: DbSession, current_account: CurrentAccount) -> SalesOrderRead:
    try:
        checkout_snapshot = resolve_checkout_snapshot(
            db,
            current_account.account_id,
            payload.cart_item_ids,
            [(entry.item_id, entry.requested_qty) for entry in payload.items],
            lock=True,
        )
        ensure_inventory_baseline(db)

        delivery_point = resolve_delivery_point(
            payload.delivery_line,
            delivery_lat=payload.delivery_lat,
            delivery_lng=payload.delivery_lng,
        )
        delivery_quote = calculate_furniture_delivery_quote(
            resolved_address=delivery_point["resolved_address"],
            delivery_lat=delivery_point["delivery_lat"],
            delivery_lng=delivery_point["delivery_lng"],
            subtotal_amount=checkout_snapshot.subtotal_amount,
            item_snapshots=[
                {
                    "title": item_snapshot.item.title,
                    "dimension_note": item_snapshot.item.dimension_note or "",
                    "quantity": item_snapshot.requested_qty,
                }
                for item_snapshot in checkout_snapshot.item_snapshots
            ],
            note=delivery_point["note"],
        )

        order = SalesOrder(
            order_code=f"DH{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            account_id=current_account.account_id,
            consignee_name=payload.consignee_name.strip(),
            consignee_phone=payload.consignee_phone.strip(),
            delivery_line=delivery_quote["resolved_address"],
            delivery_lat=delivery_quote["delivery_lat"],
            delivery_lng=delivery_quote["delivery_lng"],
            distance_km=delivery_quote["distance_km"],
            shipping_fee=delivery_quote["shipping_fee"],
            delivery_note=payload.delivery_note.strip(),
            payment_method=payload.payment_method,
            payment_status=PaymentStatus.cho_thanh_toan,
            order_status=OrderStatus.cho_xac_nhan,
            grand_total=delivery_quote["grand_total"],
        )
        db.add(order)
        db.flush()

        for item_snapshot in checkout_snapshot.item_snapshots:
            db.add(
                SalesOrderLine(
                    sales_order_id=order.sales_order_id,
                    item_id=item_snapshot.item.item_id,
                    item_title_snapshot=item_snapshot.item.title,
                    unit_price_snapshot=item_snapshot.unit_price,
                    ordered_qty=item_snapshot.requested_qty,
                    line_total=item_snapshot.line_total,
                )
            )

        db.flush()
        order = get_order_or_404(db, order.sales_order_id, lock=True)
        deduct_inventory_for_order(db, order)

        if checkout_snapshot.checked_out_cart_line_ids:
            db.execute(
                delete(ShoppingCartLine)
                .where(ShoppingCartLine.account_id == current_account.account_id)
                .where(ShoppingCartLine.cart_line_id.in_(checkout_snapshot.checked_out_cart_line_ids))
            )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        db.rollback()
        raise

    return get_order(order.sales_order_id, db, current_account)


@router.patch(
    "/orders/{sales_order_id}/status",
    response_model=SalesOrderRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def update_order_status(
    sales_order_id: int,
    payload: OrderStatusUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SalesOrderRead:
    del current_account

    try:
        order = get_order_or_404(db, sales_order_id, lock=True)
        validate_admin_status_transition(order.order_status, payload.order_status)
        apply_status_change(db, order, payload.order_status)
        db.commit()
    except Exception:
        db.rollback()
        raise

    order = get_order_or_404(db, sales_order_id)
    return build_order_response(order)


@router.patch(
    "/orders/{sales_order_id}/payment-status",
    response_model=SalesOrderRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def update_order_payment_status(
    sales_order_id: int,
    payload: OrderPaymentStatusUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> SalesOrderRead:
    del current_account

    try:
        order = get_order_or_404(db, sales_order_id, lock=True)
        validate_admin_payment_status_transition(order, payload.payment_status)
        order.payment_status = payload.payment_status
        db.commit()
    except Exception:
        db.rollback()
        raise

    order = get_order_or_404(db, sales_order_id)
    return build_order_response(order)


@router.post("/orders/{sales_order_id}/cancel", response_model=SalesOrderRead)
def cancel_my_order(
    sales_order_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> SalesOrderRead:
    try:
        order = get_order_or_404(db, sales_order_id, lock=True)
        ensure_customer_owns_order(order, current_account)

        if order.order_status != OrderStatus.cho_xac_nhan:
            raise HTTPException(status_code=400, detail="Chi co the huy don khi don hang con cho xac nhan.")

        apply_status_change(db, order, OrderStatus.da_huy)
        db.commit()
    except Exception:
        db.rollback()
        raise

    order = get_order_or_404(db, sales_order_id)
    return build_order_response(order)


@router.post("/orders/{sales_order_id}/confirm-received", response_model=SalesOrderRead)
def confirm_order_received(
    sales_order_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> SalesOrderRead:
    try:
        order = get_order_or_404(db, sales_order_id, lock=True)
        ensure_customer_owns_order(order, current_account)

        if order.order_status != OrderStatus.dang_giao:
            raise HTTPException(status_code=400, detail="Chi co the xac nhan da nhan khi don hang dang giao.")

        apply_status_change(db, order, OrderStatus.hoan_thanh)
        db.commit()
    except Exception:
        db.rollback()
        raise

    order = get_order_or_404(db, sales_order_id)
    return build_order_response(order)


@router.delete(
    "/orders/{sales_order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    response_class=Response,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def delete_order(sales_order_id: int, db: DbSession) -> None:
    order = get_order_or_404(db, sales_order_id, lock=True)
    if order.order_status != OrderStatus.da_huy:
        restore_inventory_for_order(db, order)
    db.delete(order)
    db.commit()
