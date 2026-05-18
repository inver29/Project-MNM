import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DataPagination from "@/components/ui/data-pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, buildQuery } from "@/lib/api";
import { formatDateTime, orderStatusLabels, orderStatusToneClasses } from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { Product, SalesOrder, Space } from "@/types/domain";
import { toast } from "sonner";
import {
  AdminDataSurface,
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminPage,
  AdminSection,
} from "@/components/admin/AdminPageParts";

const DASHBOARD_ORDERS_PER_PAGE = 5;

const AdminDashboard = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    Promise.all([
      apiRequest<Product[]>(`/items${buildQuery({ published_only: false })}`, { token }),
      apiRequest<Space[]>(`/spaces${buildQuery({ visible_only: false })}`, { token }),
      apiRequest<SalesOrder[]>(`/orders${buildQuery({ scope: "all" })}`, { token }),
    ])
      .then(([loadedProducts, loadedSpaces, loadedOrders]) => {
        setProducts(loadedProducts);
        setSpaces(loadedSpaces);
        setOrders(loadedOrders);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu bảng điều khiển.");
      })
      .finally(() => setIsLoading(false));
  }, [token, user]);

  const metrics = useMemo(
    () => ({
      totalSpaces: spaces.length,
      totalProducts: products.length,
      pendingOrders: orders.filter((order) => order.order_status === "cho_xac_nhan").length,
      deliveringOrders: orders.filter((order) => order.order_status === "dang_giao").length,
      lowStockProducts: products.filter((product) => product.available_qty > 0 && product.available_qty <= 5).length,
      outOfStockProducts: products.filter((product) => product.available_qty <= 0).length,
    }),
    [orders, products, spaces.length],
  );

  const recentOrders = useMemo(
    () =>
      [...orders].sort(
        (left, right) => new Date(right.placed_at).getTime() - new Date(left.placed_at).getTime(),
      ),
    [orders],
  );

  const totalPages = Math.max(1, Math.ceil(recentOrders.length / DASHBOARD_ORDERS_PER_PAGE));
  const paginatedRecentOrders = useMemo(() => {
    const startIndex = (currentOrderPage - 1) * DASHBOARD_ORDERS_PER_PAGE;
    return recentOrders.slice(startIndex, startIndex + DASHBOARD_ORDERS_PER_PAGE);
  }, [currentOrderPage, recentOrders]);

  useEffect(() => {
    setCurrentOrderPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  if (isLoading) {
    return <div className="px-2 py-6">Đang tải bảng điều khiển quản trị...</div>;
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Bảng điều khiển"
        title="Dashboard quản trị hệ thống"
        description="Theo dõi nhanh các mục vận hành chính, giống cách bố trí gọn ở project GIS: chỉ giữ các chỉ số cần nhìn ngay và bảng đơn mới phát sinh."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/tai-khoan">Tài khoản cá nhân</Link>
            </Button>
            <Button asChild>
              <Link to="/">Về website</Link>
            </Button>
          </>
        }
      />

      <AdminMetricsGrid className="xl:grid-cols-4">
        <AdminMetricCard label="Tổng danh mục" value={metrics.totalSpaces} tone="primary" />
        <AdminMetricCard label="Tổng sản phẩm" value={metrics.totalProducts} tone="primary" />
        <AdminMetricCard label="Chờ xử lý" value={metrics.pendingOrders} tone="warning" />
        <AdminMetricCard label="Đang giao" value={metrics.deliveringOrders} tone="info" />
        <AdminMetricCard label="Sắp hết hàng" value={metrics.lowStockProducts} tone="warning" />
        <AdminMetricCard label="Hết hàng" value={metrics.outOfStockProducts} tone="success" />
      </AdminMetricsGrid>

      <AdminSection
        title="Đơn hàng mới nhất"
        description="Theo dõi các đơn vừa phát sinh để kiểm tra nhanh trạng thái xử lý."
        actions={
          <Button asChild variant="outline">
            <Link to="/quan-tri/don-hang">Xem toàn bộ đơn</Link>
          </Button>
        }
      >
        {recentOrders.length === 0 ? (
          <AdminEmptyState>Chưa có đơn hàng nào để hiển thị.</AdminEmptyState>
        ) : (
          <>
            <AdminDataSurface>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Người nhận</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRecentOrders.map((order) => (
                    <TableRow key={order.sales_order_id}>
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
                          <p className="text-[0.92rem] leading-6 text-muted-foreground">
                            {order.consignee_phone}
                          </p>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminDataSurface>

            <DataPagination
              className="mt-5"
              currentPage={currentOrderPage}
              totalPages={totalPages}
              onPageChange={setCurrentOrderPage}
            />
          </>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminDashboard;
