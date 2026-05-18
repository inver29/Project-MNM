from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentAccount, DbSession
from app.schemas.contracts import (
    DeliveryAddressCandidateRead,
    DeliveryQuoteRead,
    DeliveryQuoteRequest,
)
from app.services.checkout import resolve_checkout_snapshot
from app.services.delivery import (
    calculate_furniture_delivery_quote,
    resolve_delivery_point,
    search_address_candidates,
)


router = APIRouter()


@router.get("/address-search", response_model=list[DeliveryAddressCandidateRead])
def address_search(query: str, limit: int = 5) -> list[dict]:
    try:
        return search_address_candidates(query, limit=limit)
    except Exception as exc:  # pragma: no cover - network failure fallback
        raise HTTPException(status_code=502, detail="Không thể tìm địa chỉ lúc này.") from exc


@router.post("/quote", response_model=DeliveryQuoteRead)
def get_delivery_quote(
    payload: DeliveryQuoteRequest,
    db: DbSession,
    current_account: CurrentAccount,
) -> DeliveryQuoteRead:
    checkout_snapshot = resolve_checkout_snapshot(
        db,
        current_account.account_id,
        payload.cart_item_ids,
        [(entry.item_id, entry.requested_qty) for entry in payload.items],
        lock=False,
    )

    try:
        delivery_point = resolve_delivery_point(
            payload.delivery_line,
            delivery_lat=payload.delivery_lat,
            delivery_lng=payload.delivery_lng,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - network failure fallback
        raise HTTPException(status_code=502, detail="Không thể tính địa chỉ giao hàng lúc này.") from exc

    quote = calculate_furniture_delivery_quote(
        resolved_address=delivery_point["resolved_address"],
        delivery_lat=delivery_point["delivery_lat"],
        delivery_lng=delivery_point["delivery_lng"],
        item_snapshots=[
            {
                "title": item_snapshot.item.title,
                "dimension_note": item_snapshot.item.dimension_note or "",
                "quantity": item_snapshot.requested_qty,
            }
            for item_snapshot in checkout_snapshot.item_snapshots
        ],
        subtotal_amount=checkout_snapshot.subtotal_amount,
        note=delivery_point["note"],
    )
    return DeliveryQuoteRead(**quote)
