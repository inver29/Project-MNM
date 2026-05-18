from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentAccount, DbSession, require_roles
from app.api.routes.orders import apply_status_change, get_order_or_404
from app.models import (
    AccountRole,
    OrderStatus,
    PaymentStatus,
    ReturnRequest,
    ReturnRequestEvidence,
    ReturnRequestStatus,
    SalesOrder,
)
from app.schemas.contracts import (
    ReturnRequestAdminUpdate,
    ReturnRequestEvidenceRead,
    ReturnRequestRead,
    ReturnRequestUpsert,
)


router = APIRouter()


def return_request_query():
    return select(ReturnRequest).options(
        selectinload(ReturnRequest.order).selectinload(SalesOrder.account),
        selectinload(ReturnRequest.processed_by),
        selectinload(ReturnRequest.evidences),
    )


def build_return_request_response(return_request: ReturnRequest) -> ReturnRequestRead:
    order = return_request.order
    return ReturnRequestRead(
        return_request_id=return_request.return_request_id,
        sales_order_id=return_request.sales_order_id,
        order_code=order.order_code,
        order_status=order.order_status,
        account_id=order.account_id,
        account_display_name=order.account.display_name if order.account else None,
        account_email_address=order.account.email_address if order.account else None,
        contact_email=return_request.contact_email,
        contact_phone=return_request.contact_phone,
        bank_account_number=return_request.bank_account_number,
        momo_account_number=return_request.momo_account_number,
        reason_text=return_request.reason_text,
        bill_image_url=return_request.bill_image_url,
        status=return_request.status,
        admin_note=return_request.admin_note,
        processed_by_display_name=return_request.processed_by.display_name if return_request.processed_by else None,
        processed_at=return_request.processed_at,
        created_at=return_request.created_at,
        updated_at=return_request.updated_at,
        evidences=[
            ReturnRequestEvidenceRead(
                evidence_id=evidence.evidence_id,
                image_url=evidence.image_url,
                created_at=evidence.created_at,
            )
            for evidence in return_request.evidences
        ],
    )


def get_return_request_or_404(db: DbSession, return_request_id: int, *, lock: bool = False) -> ReturnRequest:
    statement = return_request_query().where(ReturnRequest.return_request_id == return_request_id)
    if lock:
        statement = statement.with_for_update()
    return_request = db.scalar(statement)
    if not return_request:
        raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu trả hàng / hoàn tiền.")
    return return_request


def ensure_customer_access(return_request: ReturnRequest, current_account: CurrentAccount) -> None:
    if return_request.order.account_id != current_account.account_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem yêu cầu này.")


def validate_return_payload(payload: ReturnRequestUpsert) -> None:
    if not payload.bill_image_url:
        raise HTTPException(status_code=400, detail="Vui lòng tải lên ảnh hóa đơn thanh toán.")
    if not (payload.bank_account_number or payload.momo_account_number):
        raise HTTPException(
            status_code=400,
            detail="Vui lòng nhập ít nhất một thông tin nhận tiền hoàn: tài khoản ngân hàng hoặc MoMo.",
        )
    if len(payload.evidence_image_urls) > 10:
        raise HTTPException(status_code=400, detail="Tối đa chỉ được lưu 10 ảnh chứng minh cho mỗi yêu cầu.")


@router.get("/return-requests", response_model=list[ReturnRequestRead])
def list_return_requests(
    db: DbSession,
    current_account: CurrentAccount,
    status: ReturnRequestStatus | None = None,
) -> list[ReturnRequestRead]:
    statement = return_request_query().order_by(ReturnRequest.created_at.desc())
    if current_account.account_role == AccountRole.khach_hang:
        statement = statement.join(ReturnRequest.order).where(SalesOrder.account_id == current_account.account_id)
    if status is not None:
        statement = statement.where(ReturnRequest.status == status)

    requests = list(db.scalars(statement).unique())
    return [build_return_request_response(request_item) for request_item in requests]


@router.get("/return-requests/{return_request_id}", response_model=ReturnRequestRead)
def get_return_request(
    return_request_id: int,
    db: DbSession,
    current_account: CurrentAccount,
) -> ReturnRequestRead:
    return_request = get_return_request_or_404(db, return_request_id)
    if current_account.account_role == AccountRole.khach_hang:
        ensure_customer_access(return_request, current_account)
    return build_return_request_response(return_request)


@router.post("/orders/{sales_order_id}/return-request", response_model=ReturnRequestRead)
def create_or_update_return_request(
    sales_order_id: int,
    payload: ReturnRequestUpsert,
    db: DbSession,
    current_account: CurrentAccount,
) -> ReturnRequestRead:
    validate_return_payload(payload)

    order = get_order_or_404(db, sales_order_id, lock=True)
    if order.account_id != current_account.account_id:
        raise HTTPException(status_code=403, detail="Bạn không có quyền gửi yêu cầu cho đơn hàng này.")
    if order.order_status != OrderStatus.hoan_thanh:
        raise HTTPException(
            status_code=400,
            detail="Chỉ đơn hàng đã hoàn thành mới có thể gửi yêu cầu trả hàng / hoàn tiền.",
        )

    existing_request = db.scalar(
        return_request_query().where(ReturnRequest.sales_order_id == sales_order_id).with_for_update()
    )
    if existing_request and existing_request.status != ReturnRequestStatus.dang_xu_ly:
        raise HTTPException(
            status_code=400,
            detail="Yêu cầu này đã được xử lý và không thể chỉnh sửa thêm.",
        )

    try:
        if existing_request:
            return_request = existing_request
        else:
            return_request = ReturnRequest(
                sales_order_id=sales_order_id,
                status=ReturnRequestStatus.dang_xu_ly,
            )
            db.add(return_request)

        return_request.reason_text = payload.reason_text.strip()
        return_request.contact_email = payload.contact_email
        return_request.contact_phone = payload.contact_phone.strip() if payload.contact_phone else None
        return_request.bank_account_number = (
            payload.bank_account_number.strip() if payload.bank_account_number else None
        )
        return_request.momo_account_number = (
            payload.momo_account_number.strip() if payload.momo_account_number else None
        )
        return_request.bill_image_url = payload.bill_image_url

        if return_request.return_request_id is None:
            db.flush()

        for evidence in list(return_request.evidences):
            db.delete(evidence)
        db.flush()

        for image_url in payload.evidence_image_urls:
            db.add(
                ReturnRequestEvidence(
                    return_request_id=return_request.return_request_id,
                    image_url=image_url,
                )
            )

        db.commit()
    except Exception:
        db.rollback()
        raise

    return build_return_request_response(get_return_request_or_404(db, return_request.return_request_id))


@router.patch(
    "/return-requests/{return_request_id}",
    response_model=ReturnRequestRead,
    dependencies=[Depends(require_roles(AccountRole.admin, AccountRole.nhan_vien))],
)
def update_return_request_status(
    return_request_id: int,
    payload: ReturnRequestAdminUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> ReturnRequestRead:
    try:
        return_request = get_return_request_or_404(db, return_request_id, lock=True)
        order = get_order_or_404(db, return_request.sales_order_id, lock=True)
        previous_status = return_request.status

        return_request.admin_note = payload.admin_note.strip() if payload.admin_note else None
        return_request.status = payload.status
        return_request.processed_by_account_id = current_account.account_id
        return_request.processed_at = None if payload.status == ReturnRequestStatus.dang_xu_ly else datetime.now()

        if payload.status == ReturnRequestStatus.chap_nhan and order.order_status != OrderStatus.da_huy:
            apply_status_change(db, order, OrderStatus.da_huy)
            order.payment_status = PaymentStatus.da_hoan_tien
        elif previous_status == ReturnRequestStatus.chap_nhan and payload.status != ReturnRequestStatus.chap_nhan:
            if order.order_status == OrderStatus.da_huy:
                apply_status_change(db, order, OrderStatus.hoan_thanh)
            order.payment_status = PaymentStatus.da_thanh_toan

        db.commit()
    except Exception:
        db.rollback()
        raise

    return build_return_request_response(get_return_request_or_404(db, return_request_id))
