import { useEffect, useMemo, useState } from "react";
import { Eye, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataPagination from "@/components/ui/data-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, buildQuery } from "@/lib/api";
import {
  formatDateTime,
  getAdminOrderStatusOptions,
  getPaymentStatusLabel,
  orderStatusLabels,
  orderStatusToneClasses,
  paymentLabels,
  paymentStatusLabels,
  paymentStatusToneClasses,
  returnStatusLabels,
  returnStatusToneClasses,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { PaymentStatus, SalesOrder } from "@/types/domain";
import { toast } from "sonner";
import {
  adminStickyActionCellClassName,
  adminStickyActionHeaderClassName,
  AdminDataSurface,
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminPage,
  AdminSection,
  AdminToolbar,
  AdminToolbarInfo,
} from "@/components/admin/AdminPageParts";

const ADMIN_ITEMS_PER_PAGE = 5;

const AdminOrders = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, SalesOrder["order_status"]>>({});
  const [paymentDrafts, setPaymentDrafts] = useState<Record<number, PaymentStatus>>({});
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pendingPaymentOrderId, setPendingPaymentOrderId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const canManage = user?.account_role === "admin" || user?.account_role === "nhan_vien";

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<SalesOrder[]>(`/orders${buildQuery({ scope: "all" })}`, { token })
      .then((data) => {
        setOrders(data);
        setStatusDrafts(
          data.reduce<Record<number, SalesOrder["order_status"]>>((accumulator, order) => {
            accumulator[order.sales_order_id] = order.order_status;
            return accumulator;
          }, {}),
        );
        setPaymentDrafts(
          data.reduce<Record<number, PaymentStatus>>((accumulator, order) => {
            accumulator[order.sales_order_id] = order.payment_status;
            return accumulator;
          }, {}),
        );
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được danh sách đơn hàng.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredOrders = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = selectedStatus === "all" || order.order_status === selectedStatus;
      const haystack = [
        order.order_code,
        order.account_display_name || "",
        order.account_email_address || "",
        order.consignee_name,
        order.consignee_phone,
        order.delivery_line,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedKeyword || haystack.includes(normalizedKeyword));
    });
  }, [keyword, orders, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ADMIN_ITEMS_PER_PAGE));

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ADMIN_ITEMS_PER_PAGE);
  }, [currentPage, filteredOrders]);

  const metrics = useMemo(
    () => ({
      pending: orders.filter((order) => order.order_status === "cho_xac_nhan").length,
      delivering: orders.filter((order) => order.order_status === "dang_giao").length,
      completed: orders.filter((order) => order.order_status === "hoan_thanh").length,
      cancelled: orders.filter((order) => order.order_status === "da_huy").length,
    }),
    [orders],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedStatus]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  async function handleStatusUpdate(orderId: number, nextStatus: SalesOrder["order_status"]) {
    if (!token) {
      return;
    }

    const currentOrder = orders.find((entry) => entry.sales_order_id === orderId);
    const currentStatus = currentOrder?.order_status;
    if (!currentOrder || !currentStatus || nextStatus === currentStatus) {
      setStatusDrafts((current) => ({ ...current, [orderId]: currentStatus || nextStatus }));
      return;
    }

    setStatusDrafts((current) => ({ ...current, [orderId]: nextStatus }));
    setPendingOrderId(orderId);
    try {
      const updated = await apiRequest<SalesOrder>(`/orders/${orderId}/status`, {
        method: "PATCH",
        token,
        body: { order_status: nextStatus },
      });
      setOrders((current) =>
        current.map((entry) => (entry.sales_order_id === updated.sales_order_id ? updated : entry)),
      );
      setSelectedOrder((current) =>
        current?.sales_order_id === updated.sales_order_id ? updated : current,
      );
      setStatusDrafts((current) => ({ ...current, [updated.sales_order_id]: updated.order_status }));
      toast.success("Đã cập nhật trạng thái đơn hàng.");
    } catch (error) {
      setStatusDrafts((current) => ({ ...current, [orderId]: currentStatus }));
      toast.error(error instanceof Error ? error.message : "Không cập nhật được đơn hàng.");
    } finally {
      setPendingOrderId(null);
    }
  }

  async function handlePaymentStatusUpdate(orderId: number, nextStatus: PaymentStatus) {
    if (!token) {
      return;
    }

    const currentOrder = orders.find((entry) => entry.sales_order_id === orderId);
    const currentStatus = currentOrder?.payment_status;
    if (!currentOrder || !currentStatus || nextStatus === currentStatus) {
      setPaymentDrafts((current) => ({ ...current, [orderId]: currentStatus || nextStatus }));
      return;
    }

    setPaymentDrafts((current) => ({ ...current, [orderId]: nextStatus }));
    setPendingPaymentOrderId(orderId);
    try {
      const updated = await apiRequest<SalesOrder>(`/orders/${orderId}/payment-status`, {
        method: "PATCH",
        token,
        body: { payment_status: nextStatus },
      });
      setOrders((current) =>
        current.map((entry) => (entry.sales_order_id === updated.sales_order_id ? updated : entry)),
      );
      setSelectedOrder((current) =>
        current?.sales_order_id === updated.sales_order_id ? updated : current,
      );
      setPaymentDrafts((current) => ({ ...current, [updated.sales_order_id]: updated.payment_status }));
      toast.success("Đã cập nhật trạng thái thanh toán.");
    } catch (error) {
      setPaymentDrafts((current) => ({ ...current, [orderId]: currentStatus }));
      toast.error(error instanceof Error ? error.message : "Không cập nhật được trạng thái thanh toán.");
    } finally {
      setPendingPaymentOrderId(null);
    }
  }

  async function handleDelete(order: SalesOrder) {
    if (!token || user?.account_role !== "admin") {
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa đơn hàng ${order.order_code} không?`)) {
      return;
    }

    try {
      await apiRequest(`/orders/${order.sales_order_id}`, {
        method: "DELETE",
        token,
      });
      setOrders((current) => current.filter((entry) => entry.sales_order_id !== order.sales_order_id));
      setSelectedOrder((current) =>
        current?.sales_order_id === order.sales_order_id ? null : current,
      );
      toast.success("Đã xóa đơn hàng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được đơn hàng.");
    }
  }

  if (!canManage) {
    return (
      <AdminSection title="Không có quyền truy cập">
        <AdminEmptyState>Chỉ quản trị viên hoặc nhân viên mới được quản lý đơn hàng.</AdminEmptyState>
      </AdminSection>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Quản lý đơn hàng"
        title="Quản lý đơn hàng"
        description="Danh sách đơn được giữ gọn như GIS: nhìn nhanh mã đơn, khách đặt, người nhận, trạng thái và tổng tiền; phần xử lý sâu chuyển vào màn hình chi tiết."
      />

      <AdminMetricsGrid className="xl:grid-cols-4">
        <AdminMetricCard label="Đơn chờ xử lý" value={metrics.pending} tone="warning" />
        <AdminMetricCard label="Đang giao" value={metrics.delivering} tone="info" />
        <AdminMetricCard label="Hoàn thành" value={metrics.completed} tone="success" />
        <AdminMetricCard label="Đã hủy" value={metrics.cancelled} tone="primary" />
      </AdminMetricsGrid>

      <AdminToolbar>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo mã đơn, khách hàng, số điện thoại..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(orderStatusLabels).map(([status, label]) => (
                <SelectItem key={status} value={status}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AdminToolbarInfo>Hiển thị {filteredOrders.length} đơn</AdminToolbarInfo>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Danh sách Đơn hàng"
        description="Bảng chỉ giữ các cột cần thiết cho thao tác quản trị nhanh."
      >
        {isLoading ? (
          <p className="text-base text-muted-foreground">Đang tải danh sách đơn hàng...</p>
        ) : filteredOrders.length === 0 ? (
          <AdminEmptyState>Không có đơn hàng nào phù hợp với bộ lọc hiện tại.</AdminEmptyState>
        ) : (
          <>
            <AdminDataSurface>
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead className={`${adminStickyActionHeaderClassName} w-[6.5rem]`}>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order) => (
                    <TableRow key={order.sales_order_id} className="group">
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-semibold">{order.order_code}</p>
                          <p className="text-[0.92rem] leading-6 text-muted-foreground">
                            {formatDateTime(order.placed_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium">
                            {order.account_display_name || `Tài khoản #${order.account_id}`}
                          </p>
                          <p className="text-[0.92rem] leading-6 text-muted-foreground">
                            {order.account_email_address || "Không có email"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          <p className="font-medium">{order.consignee_name}</p>
                          <p className="text-[0.92rem] leading-6 text-muted-foreground">{order.consignee_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${orderStatusToneClasses[order.order_status]}`}
                        >
                          {orderStatusLabels[order.order_status]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">
                        {formatCurrency(order.grand_total)}
                      </TableCell>
                      <TableCell className={adminStickyActionCellClassName}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title={`Xem đơn hàng ${order.order_code}`}
                            aria-label={`Xem đơn hàng ${order.order_code}`}
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.account_role === "admin" ? (
                            <Button
                              variant="outline"
                              size="icon"
                              title={`Xóa đơn hàng ${order.order_code}`}
                              aria-label={`Xóa đơn hàng ${order.order_code}`}
                              onClick={() => void handleDelete(order)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminDataSurface>

            <DataPagination
              className="mt-5"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </AdminSection>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="top-[calc(50%+1rem)] max-h-[calc(100vh-11rem)] max-w-[44rem] overflow-hidden rounded-[1.5rem] px-4 py-5 sm:px-5">
          <DialogHeader className="w-full pr-10">
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
            <DialogDescription>
              Xem thông tin giao hàng, thanh toán, yêu cầu trả hàng và cập nhật trạng thái xử lý.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className="max-h-[calc(100vh-18rem)] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-4 rounded-[1.35rem] bg-secondary/25 p-4 md:grid-cols-2">
                <div>
                  <Label>Mã đơn hàng</Label>
                  <p className="mt-1 font-medium">{selectedOrder.order_code}</p>
                  <p className="text-[0.95rem] leading-6 text-muted-foreground">
                    Hóa đơn: {selectedOrder.invoice_code}
                  </p>
                </div>
                <div>
                  <Label>Tổng thanh toán</Label>
                  <p className="mt-1 font-medium text-primary">{formatCurrency(selectedOrder.grand_total)}</p>
                  <p className="text-[0.95rem] leading-6 text-muted-foreground">
                    Nội dung thanh toán: {selectedOrder.payment_reference}
                  </p>
                </div>
                <div>
                  <Label>Khách đặt</Label>
                  <p className="mt-1 font-medium">
                    {selectedOrder.account_display_name || `Tài khoản #${selectedOrder.account_id}`}
                  </p>
                  <p className="text-[0.95rem] leading-6 text-muted-foreground">
                    {selectedOrder.account_email_address || "Không có email"}
                  </p>
                </div>
                <div>
                  <Label>Người nhận</Label>
                  <p className="mt-1 font-medium">{selectedOrder.consignee_name}</p>
                  <p className="text-[0.95rem] leading-6 text-muted-foreground">
                    {selectedOrder.consignee_phone}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label>Địa chỉ giao hàng</Label>
                  <p className="mt-1 font-medium">{selectedOrder.delivery_line}</p>
                  <p className="text-[0.95rem] leading-6 text-muted-foreground">
                    {selectedOrder.delivery_note || "Không có ghi chú giao hàng."}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                  <Label>Trạng thái đơn hàng</Label>
                  <div className="mt-3">
                    <Select
                      value={statusDrafts[selectedOrder.sales_order_id] || selectedOrder.order_status}
                      disabled={
                        pendingOrderId === selectedOrder.sales_order_id ||
                        getAdminOrderStatusOptions(selectedOrder.order_status).length === 1
                      }
                      onValueChange={(value: SalesOrder["order_status"]) =>
                        void handleStatusUpdate(selectedOrder.sales_order_id, value)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-10 w-full rounded-full px-3.5 text-[0.88rem] font-semibold shadow-none",
                          orderStatusToneClasses[
                            statusDrafts[selectedOrder.sales_order_id] || selectedOrder.order_status
                          ],
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getAdminOrderStatusOptions(selectedOrder.order_status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {orderStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                  <Label>Thanh toán</Label>
                  <p className="mt-1 text-[0.94rem] leading-6 text-muted-foreground">
                    {paymentLabels[selectedOrder.payment_method]} - {getPaymentStatusLabel(selectedOrder)}
                  </p>
                  <div className="mt-3">
                    <Select
                      value={paymentDrafts[selectedOrder.sales_order_id] || selectedOrder.payment_status}
                      disabled={
                        pendingPaymentOrderId === selectedOrder.sales_order_id ||
                        selectedOrder.payment_status === "da_hoan_tien"
                      }
                      onValueChange={(value: PaymentStatus) =>
                        void handlePaymentStatusUpdate(selectedOrder.sales_order_id, value)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-10 w-full rounded-full px-3.5 text-[0.88rem] font-semibold shadow-none",
                          paymentStatusToneClasses[
                            paymentDrafts[selectedOrder.sales_order_id] || selectedOrder.payment_status
                          ],
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(selectedOrder.payment_status === "da_hoan_tien"
                          ? ["da_hoan_tien"]
                          : ["cho_thanh_toan", "da_thanh_toan"]
                        ).map((status) => (
                          <SelectItem key={status} value={status}>
                            {paymentStatusLabels[status]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {selectedOrder.return_request ? (
                <div className="rounded-[1.25rem] border border-border/70 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Yêu cầu trả hàng / hoàn tiền</p>
                      <p className="mt-1 text-[0.95rem] leading-6 text-muted-foreground">
                        Gửi lúc {formatDateTime(selectedOrder.return_request.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${returnStatusToneClasses[selectedOrder.return_request.status]}`}
                    >
                      {returnStatusLabels[selectedOrder.return_request.status]}
                    </span>
                  </div>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(null);
                      navigate("/quan-tri/tra-hang");
                    }}
                  >
                    Mở khu xử lý trả hàng / hoàn tiền
                  </Button>
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Sản phẩm trong đơn</h3>
                <div className="space-y-3">
                  {selectedOrder.lines.map((line) => (
                    <div
                      key={line.order_line_id}
                      className="grid items-center gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 px-4 py-3 md:grid-cols-[minmax(0,1fr)_8rem]"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{line.item_title_snapshot}</p>
                        <p className="text-[0.95rem] leading-6 text-muted-foreground">
                          {formatCurrency(line.unit_price_snapshot)} x {line.ordered_qty}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-right font-semibold text-primary md:justify-self-end">
                        {formatCurrency(line.line_total)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminOrders;
