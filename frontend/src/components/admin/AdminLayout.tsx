import {
  ArrowUpRight,
  BarChart3,
  Layers3,
  LayoutDashboard,
  LogOut,
  Package2,
  RotateCcw,
  Sheet,
  ShoppingBag,
  UserCircle2,
  Users2,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { roleLabels } from "@/lib/admin";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const navItems = [
    { to: "/quan-tri", label: "Tổng quan", icon: LayoutDashboard, end: true, visible: true },
    { to: "/quan-tri/don-hang", label: "Quản lý đơn hàng", icon: ShoppingBag, visible: true },
    { to: "/quan-tri/tra-hang", label: "Trả hàng / hoàn tiền", icon: RotateCcw, visible: true },
    { to: "/quan-tri/san-pham", label: "Quản lý sản phẩm", icon: Package2, visible: true },
    { to: "/quan-tri/danh-muc", label: "Quản lý danh mục", icon: Layers3, visible: true },
    { to: "/quan-tri/nhap-hang", label: "Nhập hàng Excel", icon: Sheet, visible: true },
    { to: "/quan-tri/bao-cao", label: "Báo cáo & thống kê", icon: BarChart3, visible: true },
    {
      to: "/quan-tri/tai-khoan",
      label: "Quản lý tài khoản",
      icon: Users2,
      visible: user?.account_role === "admin",
    },
  ];

  const visibleItems = navItems.filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(122,94,71,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(209,178,129,0.16),transparent_30%)]">
      <Navbar />

      <div className="mx-auto max-w-[1500px] px-4 pb-6 pt-[6.1rem] md:px-6 md:pt-[6.3rem]">
        <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="section-shell p-4 md:p-5 xl:sticky xl:top-28">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="section-kicker">Khu vực quản trị</p>
                <h1 className="text-[1.55rem] font-semibold tracking-tight">Cửa hàng nội thất</h1>
                <p className="text-[0.95rem] leading-7 text-muted-foreground">
                  Điều hướng được gom theo các luồng vận hành chính: đơn hàng, hậu mãi, kho nhập,
                  báo cáo và tài khoản.
                </p>
              </div>

              <div className="rounded-[1.2rem] bg-secondary/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserCircle2 className="h-7 w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{user?.display_name}</p>
                    <p className="truncate text-[0.95rem] text-muted-foreground">{user?.email_address}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-1 text-[0.95rem] leading-7 text-muted-foreground">
                  <p>
                    Vai trò hiện tại:{" "}
                    <span className="font-medium text-foreground">
                      {user ? roleLabels[user.account_role] : "-"}
                    </span>
                  </p>
                  <p>
                    Đang truy cập {visibleItems.length} nhóm chức năng phù hợp với quyền hiện tại.
                  </p>
                </div>
              </div>

              <nav className="grid gap-2">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-[1.2rem] px-4 py-3 text-[0.98rem] font-medium transition ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-background/70 text-foreground/80 hover:bg-accent/45 hover:text-primary"
                        }`
                      }
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>

              <div className="grid gap-3">
                <Button
                  className="h-12 w-full justify-between rounded-2xl"
                  variant="outline"
                  onClick={() => navigate("/tai-khoan")}
                >
                  Trang thông tin cá nhân
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
                <Button
                  className="h-12 w-full rounded-2xl"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
