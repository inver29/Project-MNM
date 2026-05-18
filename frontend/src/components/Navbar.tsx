import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  ShoppingCart,
  UserCircle2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cartCount } = useCart();
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();

  const canAccessAdmin = user?.account_role === "admin" || user?.account_role === "nhan_vien";
  const userInitial = user?.display_name?.trim().charAt(0).toUpperCase() || "T";

  const navLinks = [
    { path: "/", label: "Trang chủ" },
    { path: "/san-pham", label: "Sản phẩm" },
    { path: "/gioi-thieu", label: "Giới thiệu" },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(`${path}/`));

  return (
    <nav className="fixed inset-x-0 top-0 z-[60] border-b border-border/80 bg-background/96 shadow-[0_18px_36px_-34px_hsl(24_18%_18%/0.65)] backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-[5.05rem] items-center justify-between gap-4">
          <Link to="/" className="min-w-0">
            <span className="block truncate text-[1.45rem] font-semibold leading-none text-primary md:text-[1.65rem]">
              Cửa hàng nội thất
            </span>
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`rounded-full px-4 py-2 text-[0.98rem] font-medium transition ${
                  isActive(link.path)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <Link
                to="/don-hang"
                className={`rounded-full px-4 py-2 text-[0.98rem] font-medium transition ${
                  isActive("/don-hang")
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                }`}
              >
                Đơn hàng
              </Link>
            ) : null}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/gio-hang" className="relative">
              <Button variant="outline" size="icon" className="rounded-full bg-background">
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 ? (
                  <Badge className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.78rem]">
                    {cartCount}
                  </Badge>
                ) : null}
              </Button>
            </Link>

            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="grid max-w-[17rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.2rem] border border-border/80 bg-card px-3 py-2 shadow-sm transition hover:border-primary/25"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      {userInitial}
                    </span>
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-[0.98rem] font-semibold text-foreground">{user.display_name}</span>
                      <span className="block truncate text-[0.84rem] text-muted-foreground">{user.email_address}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-[20rem] rounded-[1.2rem] border-border/80 p-3 shadow-xl">
                  <div className="rounded-[1rem] bg-secondary/45 p-4">
                    <p className="truncate text-[1rem] font-semibold">{user.display_name}</p>
                    <p className="truncate text-[0.92rem] text-muted-foreground">{user.email_address}</p>
                  </div>

                  <div className="mt-3 grid gap-1">
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-3">
                      <Link to="/tai-khoan" className="flex items-center gap-3">
                        <UserCircle2 className="h-4 w-4 text-primary" />
                        <span>Thông tin cá nhân</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-3">
                      <Link to="/don-hang" className="flex items-center gap-3">
                        <ReceiptText className="h-4 w-4 text-primary" />
                        <span>Lịch sử đơn hàng</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="rounded-xl px-3 py-3">
                      <Link to="/gio-hang" className="flex items-center gap-3">
                        <ShoppingCart className="h-4 w-4 text-primary" />
                        <span>Giỏ hàng</span>
                      </Link>
                    </DropdownMenuItem>
                    {canAccessAdmin ? (
                      <DropdownMenuItem asChild className="rounded-xl px-3 py-3">
                        <Link to="/quan-tri" className="flex items-center gap-3">
                          <LayoutDashboard className="h-4 w-4 text-primary" />
                          <span>Quản trị hệ thống</span>
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                  </div>

                  <DropdownMenuSeparator className="my-2" />

                  <DropdownMenuItem
                    className="rounded-xl px-3 py-3 text-destructive focus:text-destructive"
                    onSelect={() => logout()}
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline">
                  <Link to="/dang-nhap">Đăng nhập</Link>
                </Button>
                <Button asChild>
                  <Link to="/dang-ky">Đăng ký</Link>
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link to="/gio-hang" className="relative">
              <Button variant="outline" size="icon" className="rounded-full bg-background">
                <ShoppingCart className="h-4.5 w-4.5" />
                {cartCount > 0 ? (
                  <Badge className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[0.78rem]">
                    {cartCount}
                  </Badge>
                ) : null}
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-background"
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-border/70 py-4 md:hidden">
            <div className="section-shell space-y-2 p-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-[0.98rem] font-medium transition ${
                    isActive(link.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-secondary"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  <Link
                    to="/tai-khoan"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Thông tin cá nhân
                  </Link>
                  <Link
                    to="/don-hang"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Lịch sử đơn hàng
                  </Link>
                  {canAccessAdmin ? (
                    <Link
                      to="/quan-tri"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-xl px-4 py-3 text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                    >
                      Quản trị hệ thống
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full rounded-xl px-4 py-3 text-left text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/dang-nhap"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/dang-ky"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-[0.98rem] font-medium text-foreground/80 hover:bg-secondary"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
};

export default Navbar;
