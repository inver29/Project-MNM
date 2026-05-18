export type AccountRole = "admin" | "nhan_vien" | "khach_hang";
export type PaymentMethod = "tien_mat" | "momo" | "chuyen_khoan";
export type PaymentStatus = "cho_thanh_toan" | "da_thanh_toan" | "da_hoan_tien";
export type OrderStatus =
  | "cho_xac_nhan"
  | "da_xac_nhan"
  | "dang_giao"
  | "hoan_thanh"
  | "da_huy";
export type ReturnRequestStatus = "dang_xu_ly" | "chap_nhan" | "tu_choi";

export interface Account {
  account_id: number;
  email_address: string;
  display_name: string;
  mobile_phone?: string | null;
  address_line?: string | null;
  account_role: AccountRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Space {
  space_id: number;
  space_name: string;
  slug_token: string;
  teaser_text: string;
  cover_image_url?: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductMedia {
  media_id: number;
  media_url: string;
  alt_text: string;
  is_primary: boolean;
  display_rank: number;
}

export interface Product {
  item_id: number;
  space_id: number;
  item_code: string;
  slug_token: string;
  title: string;
  summary_text: string;
  material_note: string;
  color_tone: string;
  design_style: string;
  dimension_note: string;
  care_note: string;
  list_price: number;
  sale_price: number | null;
  lead_time_days: number;
  is_featured: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  available_qty: number;
  primary_image_url?: string | null;
  average_rating: number;
  review_count: number;
  space: Space;
  media_assets: ProductMedia[];
}

export interface CartItem extends Product {
  quantity: number;
  basket_line_id?: number;
  line_total: number;
  is_selected: boolean;
}

export interface OrderLine {
  order_line_id: number;
  item_id: number;
  item_slug_token: string;
  item_title_snapshot: string;
  unit_price_snapshot: number;
  ordered_qty: number;
  line_total: number;
}

export interface ReturnRequestSummary {
  return_request_id: number;
  status: ReturnRequestStatus;
  created_at: string;
  processed_at?: string | null;
}

export interface SalesOrder {
  sales_order_id: number;
  order_code: string;
  account_id: number;
  account_display_name?: string | null;
  account_email_address?: string | null;
  consignee_name: string;
  consignee_phone: string;
  delivery_line: string;
  delivery_note: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  subtotal_amount: number;
  shipping_fee: number;
  distance_km: number;
  grand_total: number;
  invoice_code: string;
  payment_reference: string;
  placed_at: string;
  estimated_delivery_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  lines: OrderLine[];
  return_request?: ReturnRequestSummary | null;
}

export interface ProductReview {
  review_id: number;
  account_id: number;
  account_display_name: string;
  rating_value: number;
  comment_text: string;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentPreview {
  payment_method: PaymentMethod;
  payment_label: string;
  amount_value: number;
  amount_text: string;
  qr_image: string;
  show_qr: boolean;
  recipient_name: string;
  account_number: string;
  provider_name: string;
  transfer_note: string;
  helper_text: string;
  branch_name: string;
  branch_address: string;
}

export interface DeliveryAddressSuggestion {
  display_name: string;
  short_label: string;
  lat: number;
  lng: number;
}

export interface DeliveryQuote {
  resolved_address: string;
  delivery_lat: number;
  delivery_lng: number;
  branch_name: string;
  branch_address: string;
  subtotal_amount: number;
  shipping_fee: number;
  distance_km: number;
  grand_total: number;
  handling_fee: number;
  distance_surcharge: number;
  bulky_surcharge: number;
  bulky_points: number;
  estimated_delivery_days: number;
  note?: string | null;
}

export interface OrderInvoice {
  sales_order_id: number;
  order_code: string;
  invoice_code: string;
  placed_at: string;
  invoice_printed_at: string;
  store_name: string;
  store_address: string;
  invoice_staff_display_name: string;
  consignee_name: string;
  consignee_phone: string;
  delivery_line: string;
  delivery_note: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_reference: string;
  subtotal_amount: number;
  shipping_fee: number;
  distance_km: number;
  grand_total: number;
  lines: OrderLine[];
}

export interface ReturnRequestEvidence {
  evidence_id: number;
  image_url: string;
  created_at: string;
}

export interface ReturnRequest {
  return_request_id: number;
  sales_order_id: number;
  order_code: string;
  order_status: OrderStatus;
  account_id: number;
  account_display_name?: string | null;
  account_email_address?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  bank_account_number?: string | null;
  momo_account_number?: string | null;
  reason_text: string;
  bill_image_url?: string | null;
  status: ReturnRequestStatus;
  admin_note?: string | null;
  processed_by_display_name?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at: string;
  evidences: ReturnRequestEvidence[];
}

export interface PurchaseImportLine {
  import_line_id: number;
  item_id: number;
  item_title_snapshot: string;
  imported_qty: number;
  remaining_qty: number;
  import_unit_price: number;
  sale_unit_price_snapshot: number;
  note?: string | null;
  created_at: string;
}

export interface PurchaseImportBatch {
  batch_id: number;
  invoice_code: string;
  imported_by_account_id?: number | null;
  imported_by_display_name?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  items: PurchaseImportLine[];
  total_import_qty: number;
  total_import_amount: number;
}

export interface ReportMetric {
  label: string;
  value: number | string;
  format: "currency" | "count";
}

export interface ReportSeriesPoint {
  label: string;
  revenue: number;
  orders: number;
  imports: number;
}

export interface ReportStatusBreakdown {
  status: string;
  label: string;
  value: number;
}

export interface ReportTopItem {
  item_id: number;
  title: string;
  quantity: number;
  revenue: number;
}

export interface ReportLowStockItem {
  item_id: number;
  title: string;
  available_qty: number;
  list_price: number;
}

export interface ReportSnapshot {
  metrics: ReportMetric[];
  order_status_breakdown: ReportStatusBreakdown[];
  return_status_breakdown: ReportStatusBreakdown[];
  monthly_series: ReportSeriesPoint[];
  top_items: ReportTopItem[];
  low_stock_items: ReportLowStockItem[];
}
