import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatCurrency } from "@/lib/catalog";
import { ReportMetric, ReportSnapshot } from "@/types/domain";
import { toast } from "sonner";
import {
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminPage,
  AdminSection,
} from "@/components/admin/AdminPageParts";

const ORDER_COLORS = ["#9a6c45", "#b48b67", "#7aa37a", "#4e80c7", "#c26b6b"];
const RETURN_COLORS = ["#d4a443", "#4f8f67", "#bf5b5b"];

function formatMetricValue(metric: ReportMetric) {
  if (typeof metric.value === "number" && metric.format === "currency") {
    return formatCurrency(metric.value);
  }
  return metric.value;
}

const AdminReports = () => {
  const { token } = useAuth();
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<ReportSnapshot>("/reports/overview", { token })
      .then((data) => setSnapshot(data))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được báo cáo tổng hợp.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const metrics = useMemo(() => snapshot?.metrics || [], [snapshot]);

  if (isLoading) {
    return <div className="px-2 py-6">Đang tải báo cáo tổng hợp...</div>;
  }

  if (!snapshot) {
    return (
      <AdminPage>
        <AdminEmptyState>Không có dữ liệu báo cáo để hiển thị.</AdminEmptyState>
      </AdminPage>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Báo cáo"
        title="Gom doanh thu, đơn hàng, hoàn tiền và tồn kho về cùng một bảng tổng hợp để ra quyết định nhanh hơn."
        description="Màn hình này giữ trọng tâm ở xu hướng bán hàng, trạng thái xử lý và nhóm sản phẩm cần theo dõi, thay vì dàn trải quá nhiều số rời rạc."
        actions={
          <Button asChild variant="outline">
            <Link to="/quan-tri/nhap-hang">Đi tới nhập hàng</Link>
          </Button>
        }
      />

      <AdminMetricsGrid className="xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <AdminMetricCard
            key={metric.label}
            label={metric.label}
            value={formatMetricValue(metric)}
            tone={index === 0 ? "primary" : index === 1 ? "warning" : index === 2 ? "info" : "success"}
          />
        ))}
      </AdminMetricsGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_400px]">
        <AdminSection
          title="Xu hướng 6 tháng gần nhất"
          description="So sánh doanh thu, số đơn và giá trị nhập hàng theo từng tháng để xem nhịp vận hành của cửa hàng."
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot.monthly_series}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" name="Doanh thu" fill="#9a6c45" radius={[8, 8, 0, 0]} />
                <Bar dataKey="imports" name="Giá trị nhập" fill="#d8b28c" radius={[8, 8, 0, 0]} />
                <Bar dataKey="orders" name="Số đơn" fill="#6c8f63" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AdminSection>

        <AdminSection
          title="Phân bổ trạng thái"
          description="Đọc nhanh tình trạng đơn hàng và hậu mãi để biết chỗ nào đang nghẽn."
        >
          <div className="grid gap-6">
            <div>
              <h3 className="mb-3 text-base font-semibold">Đơn hàng</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={snapshot.order_status_breakdown} dataKey="value" nameKey="label" innerRadius={50} outerRadius={82}>
                      {snapshot.order_status_breakdown.map((entry, index) => (
                        <Cell key={entry.status} fill={ORDER_COLORS[index % ORDER_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-base font-semibold">Yêu cầu hoàn tiền</h3>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={snapshot.return_status_breakdown} dataKey="value" nameKey="label" innerRadius={50} outerRadius={82}>
                      {snapshot.return_status_breakdown.map((entry, index) => (
                        <Cell key={entry.status} fill={RETURN_COLORS[index % RETURN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </AdminSection>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <AdminSection
          title="Sản phẩm bán tốt"
          description="Các mặt hàng này đang kéo doanh thu trong nhóm hoàn thành, nên theo dõi để giữ nhịp nhập hàng phù hợp."
        >
          {snapshot.top_items.length === 0 ? (
            <AdminEmptyState>Chưa có dữ liệu bán hàng hoàn thành để xếp hạng.</AdminEmptyState>
          ) : (
            <div className="space-y-3">
              {snapshot.top_items.map((item) => (
                <div
                  key={item.item_id}
                  className="grid gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-[0.94rem] leading-6 text-muted-foreground">Mã sản phẩm #{item.item_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.92rem] text-muted-foreground">Đã bán</p>
                    <p className="font-semibold">{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.92rem] text-muted-foreground">Doanh thu</p>
                    <p className="font-semibold text-primary">{formatCurrency(item.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>

        <AdminSection
          title="Sản phẩm tồn thấp"
          description="Danh sách này giúp nối trực tiếp sang luồng nhập hàng để bổ sung các mặt hàng cần ưu tiên."
        >
          {snapshot.low_stock_items.length === 0 ? (
            <AdminEmptyState>Không có sản phẩm nào ở ngưỡng tồn thấp.</AdminEmptyState>
          ) : (
            <div className="space-y-3">
              {snapshot.low_stock_items.map((item) => (
                <div
                  key={item.item_id}
                  className="grid gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto_auto]"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-[0.94rem] leading-6 text-muted-foreground">Mã sản phẩm #{item.item_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.92rem] text-muted-foreground">Tồn kho</p>
                    <p className="font-semibold text-amber-700">{item.available_qty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.92rem] text-muted-foreground">Giá bán</p>
                    <p className="font-semibold">{formatCurrency(item.list_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminSection>
      </div>
    </AdminPage>
  );
};

export default AdminReports;
