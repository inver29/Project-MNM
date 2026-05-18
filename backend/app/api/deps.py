from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import decode_access_token
from app.db.session import get_db_session
from app.models import AccountRole, IdentityAccount


settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.api_v1_prefix}/auth/login",
    auto_error=False,
)
DbSession = Annotated[Session, Depends(get_db_session)]


def _resolve_account(token: str | None, db: DbSession) -> IdentityAccount | None:
    if not token:
        return None

    try:
        payload = decode_access_token(token)
        account_id = int(payload["sub"])
    except Exception:
        return None

    account = db.get(IdentityAccount, account_id)
    if not account or not account.is_active:
        return None
    return account


def get_current_account(token: Annotated[str, Depends(oauth2_scheme)], db: DbSession) -> IdentityAccount:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    account = _resolve_account(token, db)
    if not account:
        raise credentials_error
    return account


def get_optional_current_account(
    token: Annotated[str | None, Depends(optional_oauth2_scheme)],
    db: DbSession,
) -> IdentityAccount | None:
    return _resolve_account(token, db)


CurrentAccount = Annotated[IdentityAccount, Depends(get_current_account)]
OptionalCurrentAccount = Annotated[IdentityAccount | None, Depends(get_optional_current_account)]


def require_roles(*allowed_roles: AccountRole) -> Callable[[CurrentAccount], IdentityAccount]:
    def dependency(current_account: CurrentAccount) -> IdentityAccount:
        if current_account.account_role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Bạn không có quyền thực hiện thao tác này.")
        return current_account

    return dependency
