import { AccountRole, PaymentStatus, ReturnRequestStatus, SalesOrder } from "@/types/domain";

export const roleLabels: Record<AccountRole, string> = {
  admin: "Quản trị viên",
  nhan_vien: "Nhân viên",
  khach_hang: "Khách hàng",
};

export const orderStatusLabels: Record<SalesOrder["order_status"], string> = {
  cho_xac_nhan: "Chờ xử lý",
  da_xac_nhan: "Đã xác nhận",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

export const orderStatusToneClasses: Record<SalesOrder["order_status"], string> = {
  cho_xac_nhan: "border-amber-500/20 bg-amber-500/10 text-amber-800",
  da_xac_nhan: "border-stone-500/20 bg-stone-500/10 text-stone-700",
  dang_giao: "border-blue-500/20 bg-blue-500/10 text-blue-700",
  hoan_thanh: "border-green-500/30 bg-green-500/12 text-green-700",
  da_huy: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

export const paymentLabels: Record<SalesOrder["payment_method"], string> = {
  tien_mat: "Tiền mặt khi nhận hàng",
  momo: "Ví MoMo",
  chuyen_khoan: "Chuyển khoản",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  cho_thanh_toan: "Chờ thanh toán",
  da_thanh_toan: "Đã thanh toán",
  da_hoan_tien: "Đã hoàn tiền",
};

export const paymentStatusToneClasses: Record<PaymentStatus, string> = {
  cho_thanh_toan: "border-stone-500/20 bg-stone-500/10 text-stone-700",
  da_thanh_toan: "border-green-500/30 bg-green-500/12 text-green-700",
  da_hoan_tien: "border-sky-500/20 bg-sky-500/10 text-sky-700",
};

export const returnStatusLabels: Record<ReturnRequestStatus, string> = {
  dang_xu_ly: "Đang xử lý",
  chap_nhan: "Chấp nhận",
  tu_choi: "Từ chối",
};

export const returnStatusToneClasses: Record<ReturnRequestStatus, string> = {
  dang_xu_ly: "border-amber-500/20 bg-amber-500/10 text-amber-800",
  chap_nhan: "border-green-500/30 bg-green-500/12 text-green-700",
  tu_choi: "border-rose-500/20 bg-rose-500/10 text-rose-700",
};

const adminOrderStatusTransitions: Record<SalesOrder["order_status"], SalesOrder["order_status"][]> = {
  cho_xac_nhan: ["dang_giao", "da_huy"],
  da_xac_nhan: ["dang_giao", "da_huy"],
  dang_giao: ["hoan_thanh", "da_huy"],
  hoan_thanh: [],
  da_huy: [],
};

export function getAdminOrderStatusOptions(
  currentStatus: SalesOrder["order_status"],
): SalesOrder["order_status"][] {
  return [currentStatus, ...adminOrderStatusTransitions[currentStatus]];
}

export function canCustomerCancelOrder(order: SalesOrder) {
  return order.order_status === "cho_xac_nhan";
}

export function canCustomerConfirmReceived(order: SalesOrder) {
  return order.order_status === "dang_giao";
}

export function canCustomerRequestReturn(order: SalesOrder) {
  return order.order_status === "hoan_thanh" || Boolean(order.return_request);
}

export function canAdminDeleteOrder(order: SalesOrder) {
  return Boolean(order);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN");
}

export function getPaymentStatusLabel(order: Pick<SalesOrder, "payment_method" | "payment_status">) {
  if (order.payment_status === "da_hoan_tien") {
    return paymentStatusLabels.da_hoan_tien;
  }
  if (order.payment_status === "da_thanh_toan") {
    return paymentStatusLabels.da_thanh_toan;
  }
  if (order.payment_method === "tien_mat") {
    return "Thu tiền khi giao hàng";
  }
  return "Chờ xác nhận thanh toán";
}
