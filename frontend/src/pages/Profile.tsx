import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogOut, ShieldCheck, ShoppingCart, UserCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageIntro, PageNote, PageStat, PageStatGrid } from "@/components/PageParts";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiRequest } from "@/lib/api";
import { formatDateTime, orderStatusLabels, orderStatusToneClasses, paymentLabels, roleLabels } from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { FieldErrors, isValidEmail, isValidPhone } from "@/lib/form-validation";
import { SalesOrder } from "@/types/domain";
import { toast } from "sonner";

type ProfileField =
  | "display_name"
  | "email_address"
  | "mobile_phone"
  | "address_line"
  | "current_password"
  | "new_password";

const Profile = () => {
  const navigate = useNavigate();
  const { user, token, refreshProfile, logout } = useAuth();
  const { cartCount } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [formData, setFormData] = useState({
    email_address: "",
    display_name: "",
    mobile_phone: "",
    address_line: "",
    current_password: "",
    new_password: "",
  });
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [submitError, setSubmitError] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFormData({
      email_address: user.email_address,
      display_name: user.display_name,
      mobile_phone: user.mobile_phone || "",
      address_line: user.address_line || "",
      current_password: "",
      new_password: "",
    });
  }, [user]);

  useEffect(() => {
    if (!token) {
      return;
    }
    apiRequest<SalesOrder[]>("/orders", { token })
      .then(setOrders)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được lịch sử đơn hàng.");
      });
  }, [token]);

  const stats = useMemo(() => {
    const pending = orders.filter((order) => order.order_status === "cho_xac_nhan").length;
    const completed = orders.filter((order) => order.order_status === "hoan_thanh").length;
    const totalSpend = orders
      .filter((order) => order.order_status !== "da_huy")
      .reduce((sum, order) => sum + order.grand_total, 0);

    return {
      total: orders.length,
      pending,
      completed,
      cartCount,
      totalSpend,
    };
  }, [cartCount, orders]);

  function validateForm() {
    const nextErrors: FieldErrors<ProfileField> = {};
    const normalizedName = formData.display_name.trim();
    const normalizedEmail = formData.email_address.trim();
    const normalizedPhone = formData.mobile_phone.trim();

    if (normalizedName.length < 2) {
      nextErrors.display_name = "Họ tên cần có ít nhất 2 ký tự.";
    }

    if (!normalizedEmail) {
      nextErrors.email_address = "Vui lòng nhập email.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email_address = "Email chưa đúng định dạng.";
    }

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      nextErrors.mobile_phone = "Số điện thoại cần từ 8 đến 20 ký tự hợp lệ.";
    }

    if (formData.address_line.trim() && formData.address_line.trim().length < 6) {
      nextErrors.address_line = "Địa chỉ nên có ít nhất 6 ký tự để đủ rõ nơi nhận hàng.";
    }

    if (formData.new_password && !formData.current_password) {
      nextErrors.current_password = "Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.";
    }

    if (formData.current_password && !formData.new_password) {
      nextErrors.new_password = "Vui lòng nhập mật khẩu mới.";
    } else if (formData.new_password && formData.new_password.length < 6) {
      nextErrors.new_password = "Mật khẩu mới cần có ít nhất 6 ký tự.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("/auth/me", {
        method: "PUT",
        token,
        body: {
          ...formData,
          email_address: formData.email_address.trim(),
          display_name: formData.display_name.trim(),
          mobile_phone: formData.mobile_phone.trim() || null,
          address_line: formData.address_line.trim() || null,
          current_password: formData.current_password || null,
          new_password: formData.new_password || null,
        },
      });
      await refreshProfile();
      setFormData((current) => ({
        ...current,
        current_password: "",
        new_password: "",
      }));
      setErrors({});
      toast.success("Đã cập nhật thông tin cá nhân.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không cập nhật được thông tin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const canAccessAdmin = user?.account_role === "admin" || user?.account_role === "nhan_vien";

  return (
    <div className="page-shell page-stack">
      <PageIntro
        eyebrow="Tài khoản cá nhân"
        title="Quản lý hồ sơ, mật khẩu và các đơn hàng gần đây trên cùng một bố cục gọn hơn."
        description="Hồ sơ giờ lưu cả số điện thoại và địa chỉ mặc định để bước thanh toán tự điền nhanh hơn ở những lần mua sau."
        aside={
          <div className="space-y-3">
            <PageStatGrid>
              <PageStat label="Tổng đơn" value={stats.total} />
              <PageStat label="Tổng chi tiêu" value={formatCurrency(stats.totalSpend)} />
            </PageStatGrid>
            <PageNote title="Tài khoản hiện tại">
              <p>Vai trò: <span className="font-medium text-foreground">{user ? roleLabels[user.account_role] : "-"}</span></p>
              <p>Giỏ hàng: <span className="font-medium text-foreground">{stats.cartCount}</span> sản phẩm</p>
              <p>Đơn chờ xác nhận: <span className="font-medium text-foreground">{stats.pending}</span></p>
            </PageNote>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="rounded-[1.7rem] border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-7">
              <div className="flex items-center gap-4">
                <div className="flex h-18 w-18 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-hover text-2xl font-semibold text-primary-foreground">
                  {user?.display_name?.trim().charAt(0).toUpperCase() || "T"}
                </div>
                <div className="min-w-0">
                  <p className="section-kicker">Tài khoản</p>
                  <h2 className="truncate text-[1.5rem] font-semibold">{user?.display_name}</h2>
                  <p className="truncate text-base text-muted-foreground">{user?.email_address}</p>
                </div>
              </div>

            <PageNote title="Thông tin nhanh">
              <p>Số điện thoại: <span className="font-medium text-foreground">{user?.mobile_phone || "Chưa cập nhật"}</span></p>
              <p>Địa chỉ: <span className="font-medium text-foreground">{user?.address_line || "Chưa cập nhật"}</span></p>
              <p>Trạng thái: <span className="font-medium text-foreground">{user?.is_active ? "Đang hoạt động" : "Tạm khóa"}</span></p>
              <p>Ngày tham gia: <span className="font-medium text-foreground">{user ? formatDateTime(user.created_at) : "-"}</span></p>
              <p>Đơn hoàn thành: <span className="font-medium text-foreground">{stats.completed}</span></p>
              </PageNote>

              <div className="grid gap-3">
                <Button asChild variant="outline" className="justify-between rounded-2xl">
                  <Link to="/don-hang">Xem toàn bộ đơn hàng</Link>
                </Button>
                <Button asChild variant="outline" className="justify-between rounded-2xl">
                  <Link to="/gio-hang">
                    Giỏ hàng của tôi
                    <ShoppingCart className="h-4 w-4" />
                  </Link>
                </Button>
                {canAccessAdmin ? (
                  <Button asChild variant="outline" className="justify-between rounded-2xl">
                    <Link to="/quan-tri">
                      Vào khu quản trị
                      <ShieldCheck className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  className="justify-between rounded-2xl"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  Đăng xuất
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-[1.7rem] border-border/70 shadow-sm">
            <CardHeader className="space-y-2">
              <p className="section-kicker">Chỉnh sửa hồ sơ</p>
              <CardTitle className="text-[1.35rem]">Cập nhật thông tin cá nhân</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5 md:grid-cols-2" noValidate onSubmit={handleSubmit}>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="display_name">Họ tên</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, display_name: event.target.value }));
                      setErrors((current) => ({ ...current, display_name: undefined }));
                      setSubmitError("");
                    }}
                    aria-describedby={errors.display_name ? "profile-display-name-error" : undefined}
                    aria-invalid={errors.display_name ? true : undefined}
                  />
                  <FieldError id="profile-display-name-error">{errors.display_name}</FieldError>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email_address">Email</Label>
                  <Input
                    id="email_address"
                    type="email"
                    value={formData.email_address}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, email_address: event.target.value }));
                      setErrors((current) => ({ ...current, email_address: undefined }));
                      setSubmitError("");
                    }}
                    aria-describedby={errors.email_address ? "profile-email-error" : undefined}
                    aria-invalid={errors.email_address ? true : undefined}
                  />
                  <FieldError id="profile-email-error">{errors.email_address}</FieldError>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile_phone">Số điện thoại</Label>
                  <Input
                    id="mobile_phone"
                    value={formData.mobile_phone}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, mobile_phone: event.target.value }));
                      setErrors((current) => ({ ...current, mobile_phone: undefined }));
                      setSubmitError("");
                    }}
                    aria-describedby={errors.mobile_phone ? "profile-phone-error" : undefined}
                    aria-invalid={errors.mobile_phone ? true : undefined}
                  />
                  <FieldError id="profile-phone-error">{errors.mobile_phone}</FieldError>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address_line">Địa chỉ mặc định</Label>
                  <Textarea
                    id="address_line"
                    rows={3}
                    value={formData.address_line}
                    onChange={(event) => {
                      setFormData((current) => ({ ...current, address_line: event.target.value }));
                      setErrors((current) => ({ ...current, address_line: undefined }));
                      setSubmitError("");
                    }}
                    placeholder="Địa chỉ này sẽ được tự điền vào bước thanh toán"
                    aria-describedby={errors.address_line ? "profile-address-error" : undefined}
                    aria-invalid={errors.address_line ? true : undefined}
                  />
                  <FieldError id="profile-address-error">{errors.address_line}</FieldError>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_password">Mật khẩu hiện tại</Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={formData.current_password}
                      onChange={(event) => {
                        setFormData((current) => ({ ...current, current_password: event.target.value }));
                        setErrors((current) => ({ ...current, current_password: undefined }));
                        setSubmitError("");
                      }}
                      className="pr-12"
                      placeholder="Nhập nếu bạn muốn đổi mật khẩu"
                      aria-describedby={errors.current_password ? "profile-current-password-error" : undefined}
                      aria-invalid={errors.current_password ? true : undefined}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      onClick={() => setShowCurrentPassword((current) => !current)}
                      aria-label={showCurrentPassword ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError id="profile-current-password-error">{errors.current_password}</FieldError>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Mật khẩu mới</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={formData.new_password}
                      onChange={(event) => {
                        setFormData((current) => ({ ...current, new_password: event.target.value }));
                        setErrors((current) => ({ ...current, new_password: undefined }));
                        setSubmitError("");
                      }}
                      className="pr-12"
                      placeholder="Tối thiểu 6 ký tự"
                      aria-describedby={errors.new_password ? "profile-new-password-error" : undefined}
                      aria-invalid={errors.new_password ? true : undefined}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      onClick={() => setShowNewPassword((current) => !current)}
                      aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FieldError id="profile-new-password-error">{errors.new_password}</FieldError>
                </div>

                <div className="md:col-span-2">
                  <FormAlert className="mb-4">{submitError}</FormAlert>
                  <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[1.7rem] border-border/70 shadow-sm">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <p className="section-kicker">Mua sắm gần đây</p>
                <CardTitle className="text-[1.35rem]">Đơn hàng gần đây</CardTitle>
              </div>
              <Button asChild variant="outline">
                <Link to="/don-hang">Xem toàn bộ đơn hàng</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {orders.length === 0 ? (
                <p className="text-muted-foreground">Bạn chưa có đơn hàng nào.</p>
              ) : (
                orders.slice(0, 3).map((order) => (
                  <div key={order.sales_order_id} className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{order.order_code}</p>
                        <p className="text-[0.95rem] leading-6 text-muted-foreground">
                          Đặt lúc {formatDateTime(order.placed_at)}
                        </p>
                      </div>
                      <div className="space-y-2 text-left md:text-right">
                        <div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${orderStatusToneClasses[order.order_status]}`}
                          >
                            {orderStatusLabels[order.order_status]}
                          </span>
                        </div>
                        <p className="font-semibold text-primary">{formatCurrency(order.grand_total)}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div>
                        <p className="text-[0.95rem] font-medium">Người nhận</p>
                        <p className="text-[0.95rem] leading-6 text-muted-foreground">
                          {order.consignee_name} - {order.consignee_phone}
                        </p>
                      </div>
                      <div>
                        <p className="text-[0.95rem] font-medium">Thanh toán</p>
                        <p className="text-[0.95rem] leading-6 text-muted-foreground">{paymentLabels[order.payment_method]}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
