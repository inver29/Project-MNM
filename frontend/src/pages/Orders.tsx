import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, Receipt, ShoppingBag } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DataPagination from "@/components/ui/data-pagination";
import { PageIntro } from "@/components/PageParts";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import {
  canCustomerCancelOrder,
  canCustomerConfirmReceived,
  formatDateTime,
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
import { PaymentMethod, ReturnRequestStatus, SalesOrder } from "@/types/domain";
import { toast } from "sonner";

const ORDERS_PER_PAGE = 4;

const Orders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isReady, token } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [selectedReturnStatus, setSelectedReturnStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated || !token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiRequest<SalesOrder[]>("/orders", { token })
      .then(setOrders)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được lịch sử đơn hàng.");
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, isReady, token]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (selectedStatus !== "all" && order.order_status !== selectedStatus) {
        return false;
      }
      if (selectedPaymentMethod !== "all" && order.payment_method !== selectedPaymentMethod) {
        return false;
      }
      if (selectedReturnStatus === "none") {
        return !order.return_request;
      }
      if (selectedReturnStatus !== "all") {
        return order.return_request?.status === selectedReturnStatus;
      }
      return true;
    });
  }, [orders, selectedPaymentMethod, selectedReturnStatus, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [currentPage, filteredOrders]);

  const highlightedOrderId = Number.parseInt(searchParams.get("highlight") || "", 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPaymentMethod, selectedReturnStatus, selectedStatus]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!highlightedOrderId || filteredOrders.length === 0) {
      return;
    }
    const orderIndex = filteredOrders.findIndex((order) => order.sales_order_id === highlightedOrderId);
    if (orderIndex >= 0) {
      setCurrentPage(Math.floor(orderIndex / ORDERS_PER_PAGE) + 1);
      toast.success("Đơn hàng mới đã được đưa lên đầu danh sách để bạn tiếp tục theo dõi.");
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("highlight");
    setSearchParams(nextParams, { replace: true });
  }, [filteredOrders, highlightedOrderId, searchParams, setSearchParams]);

  async function handleOrderAction(
    order: SalesOrder,
    action: "cancel" | "confirm-received",
    successMessage: string,
  ) {
    if (!token) {
      return;
    }

    setPendingOrderId(order.sales_order_id);
    try {
      const updated = await apiRequest<SalesOrder>(`/orders/${order.sales_order_id}/${action}`, {
        method: "POST",
        token,
      });
      setOrders((current) =>
        current.map((entry) => (entry.sales_order_id === updated.sales_order_id ? updated : entry)),
      );
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.");
    } finally {
      setPendingOrderId(null);
    }
  }

  if (!isReady || isLoading) {
    return <div className="page-shell py-12">Đang tải lịch sử đơn hàng...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <Card className="mx-auto max-w-3xl rounded-[1.8rem] border-border/70 shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="section-kicker">Lịch sử đơn hàng</p>
            <h1 className="panel-title">Bạn cần đăng nhập để xem các đơn hàng đã đặt.</h1>
            <p className="section-copy mx-auto max-w-2xl">
              Sau khi đăng nhập, bạn có thể xem tiến độ xử lý, mở hóa đơn, xác nhận đã nhận hàng
              hoặc gửi yêu cầu trả hàng / hoàn tiền đúng lúc.
            </p>
            <Button onClick={() => navigate("/dang-nhap", { state: { from: "/don-hang" } })}>
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      <PageIntro
        eyebrow="Lịch sử đơn hàng"
        title="Theo dõi các đơn đã đặt"
        description="Luồng này được tách gọn như project GIS: danh sách đơn chỉ để lọc và mở đúng thao tác cần làm, còn chi tiết xử lý nằm trong từng đơn."
      />

      <section className="section-shell p-5 md:p-6">
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="info-label">Trạng thái đơn</p>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả trạng thái đơn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {Object.entries(orderStatusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="info-label">Phương thức thanh toán</p>
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả phương thức thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                {(Object.keys(paymentLabels) as PaymentMethod[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {paymentLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="info-label">Trả hàng / hoàn tiền</p>
            <Select value={selectedReturnStatus} onValueChange={setSelectedReturnStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Tất cả yêu cầu hậu mãi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="none">Chưa tạo yêu cầu</SelectItem>
                {(Object.keys(returnStatusLabels) as ReturnRequestStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {returnStatusLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {filteredOrders.length === 0 ? (
        <Card className="rounded-[1.8rem] border-border/70 shadow-sm">
          <CardContent className="space-y-4 p-8 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="text-[1.4rem] font-semibold">Chưa có đơn hàng phù hợp.</h2>
            <p className="section-copy mx-auto max-w-2xl">
              Khi bạn hoàn tất thanh toán, đơn hàng sẽ xuất hiện tại đây cùng các nút xem chi tiết,
              hóa đơn và hậu mãi tương ứng.
            </p>
            <Button asChild>
              <Link to="/san-pham">Khám phá sản phẩm</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const isPendingAction = pendingOrderId === order.sales_order_id;
            const isHighlighted = highlightedOrderId === order.sales_order_id;

            return (
              <article
                key={order.sales_order_id}
                className={`section-shell p-5 md:p-6 ${isHighlighted ? "ring-2 ring-primary/20" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[1.18rem] font-semibold leading-tight">{order.order_code}</h2>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${orderStatusToneClasses[order.order_status]}`}
                      >
                        {orderStatusLabels[order.order_status]}
                      </span>
                    </div>
                    <p className="text-[0.95rem] leading-6 text-muted-foreground">
                      Đặt lúc {formatDateTime(order.placed_at)}
                    </p>
                  </div>

                  <div className="rounded-[1rem] bg-secondary/35 px-4 py-3 text-right">
                    <p className="info-label">Tổng thanh toán</p>
                    <p className="mt-1 text-[1.1rem] font-semibold text-primary">
                      {formatCurrency(order.grand_total)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
                    <p className="info-label">Phương thức thanh toán</p>
                    <p className="mt-1 font-medium">{paymentLabels[order.payment_method]}</p>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
                    <p className="info-label">Trạng thái thanh toán</p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${paymentStatusToneClasses[order.payment_status]}`}
                      >
                        {getPaymentStatusLabel(order)}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
                    <p className="info-label">Yêu cầu hoàn tiền</p>
                    <div className="mt-2">
                      {order.return_request ? (
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${returnStatusToneClasses[order.return_request.status]}`}
                        >
                          {returnStatusLabels[order.return_request.status]}
                        </span>
                      ) : (
                        <span className="text-[0.95rem] text-muted-foreground">Chưa gửi yêu cầu</span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-border/70 bg-background/70 px-4 py-3">
                    <p className="info-label">Người nhận / tổng sản phẩm</p>
                    <p className="mt-1 font-medium">{order.consignee_name}</p>
                    <p className="text-[0.92rem] text-muted-foreground">
                      {order.lines.reduce((sum, line) => sum + line.ordered_qty, 0)} món
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to={`/don-hang/${order.sales_order_id}`}>
                      <FileText className="h-4 w-4" />
                      Xem chi tiết lịch sử đơn
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/don-hang/${order.sales_order_id}/hoa-don`}>
                      <Receipt className="h-4 w-4" />
                      Xem hóa đơn
                    </Link>
                  </Button>
                  {canCustomerCancelOrder(order) ? (
                    <Button
                      variant="outline"
                      disabled={isPendingAction}
                      onClick={() =>
                        void handleOrderAction(
                          order,
                          "cancel",
                          "Đơn hàng đã được hủy và tồn kho đã được hoàn lại.",
                        )
                      }
                    >
                      {isPendingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Hủy đơn hàng
                    </Button>
                  ) : null}
                  {canCustomerConfirmReceived(order) ? (
                    <Button
                      variant="outline"
                      disabled={isPendingAction}
                      onClick={() =>
                        void handleOrderAction(
                          order,
                          "confirm-received",
                          "Đơn hàng đã được xác nhận hoàn thành.",
                        )
                      }
                    >
                      {isPendingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Đã nhận hàng
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}

          <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
};

export default Orders;
