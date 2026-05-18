from fastapi import APIRouter

from app.api.routes import accounts, auth, cart, catalog, delivery, health, imports, media, orders, reports, returns, uploads


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(accounts.router, tags=["accounts"])
api_router.include_router(cart.router, tags=["cart"])
api_router.include_router(catalog.router, tags=["catalog"])
api_router.include_router(delivery.router, prefix="/delivery", tags=["delivery"])
api_router.include_router(media.router, tags=["media"])
api_router.include_router(orders.router, tags=["orders"])
api_router.include_router(returns.router, tags=["returns"])
api_router.include_router(imports.router, tags=["imports"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
