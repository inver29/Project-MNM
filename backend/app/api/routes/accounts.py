from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, or_, select

from app.api.deps import CurrentAccount, DbSession, require_roles
from app.core.security import hash_password
from app.models import AccountRole, IdentityAccount, SalesOrder
from app.schemas.contracts import AccountAdminCreate, AccountAdminUpdate, AccountRead


router = APIRouter()


def count_active_admins(db: DbSession) -> int:
    return int(
        db.scalar(
            select(func.count(IdentityAccount.account_id)).where(
                IdentityAccount.account_role == AccountRole.admin,
                IdentityAccount.is_active.is_(True),
            )
        )
        or 0
    )


@router.get(
    "/accounts",
    response_model=list[AccountRead],
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def list_accounts(
    db: DbSession,
    search: str | None = None,
    role: AccountRole | None = None,
    is_active: bool | None = None,
) -> list[IdentityAccount]:
    statement = select(IdentityAccount).order_by(
        IdentityAccount.created_at.desc(),
        IdentityAccount.account_id.desc(),
    )

    if search:
        keyword = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                IdentityAccount.display_name.ilike(keyword),
                IdentityAccount.email_address.ilike(keyword),
                IdentityAccount.mobile_phone.ilike(keyword),
            )
        )

    if role is not None:
        statement = statement.where(IdentityAccount.account_role == role)

    if is_active is not None:
        statement = statement.where(IdentityAccount.is_active.is_(is_active))

    return list(db.scalars(statement))


@router.get(
    "/accounts/{account_id}",
    response_model=AccountRead,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def get_account(account_id: int, db: DbSession) -> IdentityAccount:
    account = db.get(IdentityAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
    return account


@router.post(
    "/accounts",
    response_model=AccountRead,
    status_code=201,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def create_account(payload: AccountAdminCreate, db: DbSession) -> IdentityAccount:
    normalized_email = payload.email_address.lower().strip()
    existing = db.scalar(
        select(IdentityAccount).where(IdentityAccount.email_address == normalized_email)
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")

    account = IdentityAccount(
        email_address=normalized_email,
        password_digest=hash_password(payload.password),
        display_name=payload.display_name.strip(),
        mobile_phone=payload.mobile_phone.strip() if payload.mobile_phone else None,
        address_line=payload.address_line.strip() if payload.address_line else None,
        account_role=payload.account_role,
        is_active=payload.is_active,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.put(
    "/accounts/{account_id}",
    response_model=AccountRead,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def update_account(
    account_id: int,
    payload: AccountAdminUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> IdentityAccount:
    account = db.get(IdentityAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    normalized_email = payload.email_address.lower().strip()
    existing = db.scalar(
        select(IdentityAccount).where(
            IdentityAccount.email_address == normalized_email,
            IdentityAccount.account_id != account_id,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")

    is_downgrading_admin = account.account_role == AccountRole.admin and payload.account_role != AccountRole.admin
    is_disabling_admin = account.account_role == AccountRole.admin and not payload.is_active
    if is_downgrading_admin or is_disabling_admin:
        if count_active_admins(db) <= 1:
            raise HTTPException(status_code=400, detail="Hệ thống phải luôn còn ít nhất một quản trị viên đang hoạt động.")

    if current_account.account_id == account_id:
        if not payload.is_active:
            raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình.")
        if current_account.account_role == AccountRole.admin and payload.account_role != AccountRole.admin:
            raise HTTPException(status_code=400, detail="Bạn không thể tự hạ quyền quản trị của mình.")

    account.email_address = normalized_email
    account.display_name = payload.display_name.strip()
    account.mobile_phone = payload.mobile_phone.strip() if payload.mobile_phone else None
    account.address_line = payload.address_line.strip() if payload.address_line else None
    account.account_role = payload.account_role
    account.is_active = payload.is_active
    if payload.new_password:
        account.password_digest = hash_password(payload.new_password)

    db.commit()
    db.refresh(account)
    return account


@router.delete(
    "/accounts/{account_id}",
    status_code=204,
    response_model=None,
    response_class=Response,
    dependencies=[Depends(require_roles(AccountRole.admin))],
)
def delete_account(account_id: int, db: DbSession, current_account: CurrentAccount) -> None:
    account = db.get(IdentityAccount, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    if current_account.account_id == account_id:
        raise HTTPException(status_code=400, detail="Bạn không thể tự xóa tài khoản của mình.")

    if account.account_role == AccountRole.admin and account.is_active and count_active_admins(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="Hệ thống phải luôn còn ít nhất một quản trị viên đang hoạt động.",
        )

    order_count = int(
        db.scalar(select(func.count(SalesOrder.sales_order_id)).where(SalesOrder.account_id == account_id))
        or 0
    )
    if order_count > 0:
        raise HTTPException(status_code=400, detail="Tài khoản đã có đơn hàng, không thể xóa.")

    db.delete(account)
    db.commit()
