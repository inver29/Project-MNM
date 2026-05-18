from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentAccount, DbSession
from app.core.config import get_settings
from app.core.security import create_access_token, hash_password, verify_password
from app.models import IdentityAccount
from app.schemas.contracts import (
    AccessTokenPayload,
    AccountLogin,
    AccountProfileUpdate,
    AccountRead,
    AccountRegister,
)


router = APIRouter()
settings = get_settings()


@router.post("/register", response_model=AccountRead, status_code=status.HTTP_201_CREATED)
def register_account(payload: AccountRegister, db: DbSession) -> IdentityAccount:
    existing = db.scalar(
        select(IdentityAccount).where(IdentityAccount.email_address == payload.email_address.lower())
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")

    account = IdentityAccount(
        email_address=payload.email_address.lower(),
        password_digest=hash_password(payload.password),
        display_name=payload.display_name,
        mobile_phone=payload.mobile_phone,
        address_line=payload.address_line.strip() if payload.address_line else None,
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.post("/login", response_model=AccessTokenPayload)
def login_account(payload: AccountLogin, db: DbSession) -> AccessTokenPayload:
    account = db.scalar(
        select(IdentityAccount).where(IdentityAccount.email_address == payload.email_address.lower())
    )
    if not account or not verify_password(payload.password, account.password_digest):
        raise HTTPException(status_code=400, detail="Email hoặc mật khẩu không đúng.")
    if not account.is_active:
        raise HTTPException(status_code=403, detail="Tài khoản đang bị khóa.")

    token = create_access_token(
        str(account.account_id),
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    return AccessTokenPayload(access_token=token, user=account)


@router.get("/me", response_model=AccountRead)
def get_me(current_account: CurrentAccount) -> IdentityAccount:
    return current_account


@router.put("/me", response_model=AccountRead)
def update_me(
    payload: AccountProfileUpdate,
    db: DbSession,
    current_account: CurrentAccount,
) -> IdentityAccount:
    normalized_email = payload.email_address.lower().strip()
    existing = db.scalar(
        select(IdentityAccount).where(
            IdentityAccount.email_address == normalized_email,
            IdentityAccount.account_id != current_account.account_id,
        )
    )
    if existing:
        raise HTTPException(status_code=400, detail="Email đã tồn tại.")

    if payload.new_password:
        if not payload.current_password:
            raise HTTPException(status_code=400, detail="Bạn cần nhập mật khẩu hiện tại để đổi mật khẩu mới.")
        if not verify_password(payload.current_password, current_account.password_digest):
            raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không chính xác.")
        current_account.password_digest = hash_password(payload.new_password)

    current_account.email_address = normalized_email
    current_account.display_name = payload.display_name.strip()
    current_account.mobile_phone = payload.mobile_phone.strip() if payload.mobile_phone else None
    current_account.address_line = payload.address_line.strip() if payload.address_line else None

    db.commit()
    db.refresh(current_account)
    return current_account
