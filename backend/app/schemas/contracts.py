from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator

from app.models import (
    AccountRole,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    ReturnRequestStatus,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AccountRead(ORMModel):
    account_id: int
    email_address: EmailStr
    display_name: str
    mobile_phone: str | None = None
    address_line: str | None = None
    account_role: AccountRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class AccountRegister(BaseModel):
    email_address: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=2, max_length=150)
    mobile_phone: str | None = Field(default=None, max_length=20)
    address_line: str | None = Field(default=None, max_length=255)


class AccountLogin(BaseModel):
    email_address: EmailStr
    password: str


class AccountProfileUpdate(BaseModel):
    email_address: EmailStr
    display_name: str = Field(min_length=2, max_length=150)
    mobile_phone: str | None = Field(default=None, max_length=20)
    address_line: str | None = Field(default=None, max_length=255)
    current_password: str | None = Field(default=None, min_length=6, max_length=128)
    new_password: str | None = Field(default=None, min_length=6, max_length=128)


class AccountAdminUpdate(BaseModel):
    email_address: EmailStr
    display_name: str = Field(min_length=2, max_length=150)
    mobile_phone: str | None = Field(default=None, max_length=20)
    address_line: str | None = Field(default=None, max_length=255)
    account_role: AccountRole
    is_active: bool
    new_password: str | None = Field(default=None, min_length=6, max_length=128)


class AccountAdminCreate(BaseModel):
    email_address: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=2, max_length=150)
    mobile_phone: str | None = Field(default=None, max_length=20)
    address_line: str | None = Field(default=None, max_length=255)
    account_role: AccountRole = AccountRole.khach_hang
    is_active: bool = True


class AccessTokenPayload(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AccountRead


class SpaceCreate(BaseModel):
    space_name: str = Field(min_length=2, max_length=100)
    summary_text: str = ""
    cover_image_url: str | None = None
    is_visible: bool = True


class SpaceUpdate(BaseModel):
    space_name: str | None = Field(default=None, min_length=2, max_length=100)
    summary_text: str | None = None
    cover_image_url: str | None = None
    is_visible: bool | None = None


class SpaceRead(BaseModel):
    space_id: int
    space_name: str
    slug_token: str
    teaser_text: str
    cover_image_url: str | None = None
    is_visible: bool
    created_at: datetime
    updated_at: datetime


class ItemMediaRead(BaseModel):
    media_id: int
    media_url: str
    alt_text: str
    is_primary: bool
    display_rank: int


class UploadResult(BaseModel):
    file_name: str
    file_url: str


class CartItemAdd(BaseModel):
    item_id: int
    quantity: int = Field(default=1, ge=1)
    is_selected: bool = True


class CartItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=1)
    is_selected: bool | None = None


class CartSelectionUpdate(BaseModel):
    is_selected: bool


class CartBulkSelectionUpdate(BaseModel):
    is_selected: bool
    item_ids: list[int] | None = None


class ItemCreate(BaseModel):
    space_id: int
    title: str = Field(min_length=2, max_length=200)
    summary_text: str = ""
    material_note: str = ""
    color_tone: str = ""
    dimension_note: str = ""
    unit_price: int = Field(ge=0)
    on_hand_qty: int = Field(default=0, ge=0)
    primary_image_url: str | None = None
    is_published: bool = True


class ItemUpdate(BaseModel):
    space_id: int | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    summary_text: str | None = None
    material_note: str | None = None
    color_tone: str | None = None
    dimension_note: str | None = None
    unit_price: int | None = Field(default=None, ge=0)
    on_hand_qty: int | None = Field(default=None, ge=0)
    primary_image_url: str | None = None
    is_published: bool | None = None


class ItemRead(BaseModel):
    item_id: int
    space_id: int
    item_code: str
    slug_token: str
    title: str
    summary_text: str
    material_note: str
    color_tone: str
    design_style: str
    dimension_note: str
    care_note: str
    list_price: int
    sale_price: int | None
    lead_time_days: int
    is_featured: bool
    is_published: bool
    created_at: datetime
    updated_at: datetime
    space: SpaceRead
    media_assets: list[ItemMediaRead]
    available_qty: int
    primary_image_url: str | None
    average_rating: float = 0
    review_count: int = 0


class ItemReviewCreate(BaseModel):
    rating_value: int = Field(ge=1, le=5)
    comment_text: str = Field(default="", max_length=4000)


class ItemReviewRead(BaseModel):
    review_id: int
    account_id: int
    account_display_name: str
    rating_value: int
    comment_text: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime


class CartLineRead(ItemRead):
    basket_line_id: int
    quantity: int
    line_total: int
    is_selected: bool


class OrderItemCreate(BaseModel):
    item_id: int
    requested_qty: int = Field(default=1, ge=1)


class OrderCreate(BaseModel):
    consignee_name: str = Field(min_length=2, max_length=150)
    consignee_phone: str = Field(min_length=8, max_length=20)
    delivery_line: str = Field(min_length=3, max_length=255)
    delivery_lat: float | None = None
    delivery_lng: float | None = None
    delivery_note: str = ""
    payment_method: PaymentMethod = PaymentMethod.tien_mat
    items: list[OrderItemCreate] = Field(default_factory=list)
    cart_item_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_checkout_source(self):
        if not self.items and not self.cart_item_ids:
            raise ValueError("Cần có ít nhất một sản phẩm để tạo đơn hàng.")
        return self


class OrderStatusUpdate(BaseModel):
    order_status: OrderStatus


class OrderPaymentStatusUpdate(BaseModel):
    payment_status: PaymentStatus


class SalesOrderLineRead(BaseModel):
    order_line_id: int
    item_id: int
    item_slug_token: str
    item_title_snapshot: str
    unit_price_snapshot: int
    ordered_qty: int
    line_total: int


class ReturnRequestEvidenceRead(BaseModel):
    evidence_id: int
    image_url: str
    created_at: datetime


class ReturnRequestSummaryRead(BaseModel):
    return_request_id: int
    status: ReturnRequestStatus
    created_at: datetime
    processed_at: datetime | None = None


class SalesOrderRead(BaseModel):
    sales_order_id: int
    order_code: str
    account_id: int
    account_display_name: str | None = None
    account_email_address: EmailStr | None = None
    consignee_name: str
    consignee_phone: str
    delivery_line: str
    delivery_note: str
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    order_status: OrderStatus
    subtotal_amount: int
    shipping_fee: int
    distance_km: float
    grand_total: int
    invoice_code: str
    payment_reference: str
    placed_at: datetime
    estimated_delivery_at: datetime | None = None
    completed_at: datetime | None = None
    cancelled_at: datetime | None = None
    lines: list[SalesOrderLineRead]
    return_request: ReturnRequestSummaryRead | None = None


class PaymentPreviewRead(BaseModel):
    payment_method: PaymentMethod
    payment_label: str
    amount_value: int
    amount_text: str
    qr_image: str = ""
    show_qr: bool = False
    recipient_name: str = ""
    account_number: str = ""
    provider_name: str = ""
    transfer_note: str
    helper_text: str
    branch_name: str = ""
    branch_address: str = ""


class DeliveryAddressCandidateRead(BaseModel):
    display_name: str
    short_label: str
    lat: float
    lng: float


class DeliveryQuoteRequest(BaseModel):
    delivery_line: str = Field(min_length=3, max_length=255)
    delivery_lat: float | None = None
    delivery_lng: float | None = None
    items: list[OrderItemCreate] = Field(default_factory=list)
    cart_item_ids: list[int] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_quote_source(self):
        if not self.items and not self.cart_item_ids:
            raise ValueError("Can co it nhat mot san pham de tinh phi giao hang.")
        return self


class DeliveryQuoteRead(BaseModel):
    resolved_address: str
    delivery_lat: float
    delivery_lng: float
    branch_name: str
    branch_address: str
    subtotal_amount: int
    shipping_fee: int
    distance_km: float
    grand_total: int
    handling_fee: int
    distance_surcharge: int
    bulky_surcharge: int
    bulky_points: int
    estimated_delivery_days: int
    note: str | None = None


class OrderInvoiceRead(BaseModel):
    sales_order_id: int
    order_code: str
    invoice_code: str
    placed_at: datetime
    invoice_printed_at: datetime
    store_name: str
    store_address: str
    invoice_staff_display_name: str
    consignee_name: str
    consignee_phone: str
    delivery_line: str
    delivery_note: str
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    payment_reference: str
    subtotal_amount: int
    shipping_fee: int
    distance_km: float
    grand_total: int
    lines: list[SalesOrderLineRead]


class ReturnRequestUpsert(BaseModel):
    reason_text: str = Field(min_length=10, max_length=4000)
    contact_email: EmailStr | None = None
    contact_phone: str | None = Field(default=None, max_length=20)
    bank_account_number: str | None = Field(default=None, max_length=80)
    momo_account_number: str | None = Field(default=None, max_length=40)
    bill_image_url: str | None = Field(default=None, max_length=500)
    evidence_image_urls: list[str] = Field(default_factory=list, max_length=10)


class ReturnRequestAdminUpdate(BaseModel):
    status: ReturnRequestStatus
    admin_note: str | None = Field(default=None, max_length=4000)


class ReturnRequestRead(BaseModel):
    return_request_id: int
    sales_order_id: int
    order_code: str
    order_status: OrderStatus
    account_id: int
    account_display_name: str | None = None
    account_email_address: EmailStr | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    bank_account_number: str | None = None
    momo_account_number: str | None = None
    reason_text: str
    bill_image_url: str | None = None
    status: ReturnRequestStatus
    admin_note: str | None = None
    processed_by_display_name: str | None = None
    processed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    evidences: list[ReturnRequestEvidenceRead]


class PurchaseImportLineRead(BaseModel):
    import_line_id: int
    item_id: int
    item_title_snapshot: str
    imported_qty: int
    remaining_qty: int
    import_unit_price: int
    sale_unit_price_snapshot: int
    note: str | None = None
    created_at: datetime


class PurchaseImportRead(BaseModel):
    batch_id: int
    invoice_code: str
    imported_by_account_id: int | None = None
    imported_by_display_name: str | None = None
    note: str | None = None
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseImportLineRead]
    total_import_qty: int
    total_import_amount: int


class ReportMetricRead(BaseModel):
    label: str
    value: int | float | str
    format: str = "count"


class ReportSeriesPoint(BaseModel):
    label: str
    revenue: int = 0
    orders: int = 0
    imports: int = 0


class ReportStatusBreakdownRead(BaseModel):
    status: str
    label: str
    value: int


class ReportTopItemRead(BaseModel):
    item_id: int
    title: str
    quantity: int
    revenue: int


class ReportLowStockItemRead(BaseModel):
    item_id: int
    title: str
    available_qty: int
    list_price: int


class ReportSnapshotRead(BaseModel):
    metrics: list[ReportMetricRead]
    order_status_breakdown: list[ReportStatusBreakdownRead]
    return_status_breakdown: list[ReportStatusBreakdownRead]
    monthly_series: list[ReportSeriesPoint]
    top_items: list[ReportTopItemRead]
    low_stock_items: list[ReportLowStockItemRead]
