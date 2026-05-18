import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, ShoppingBag, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro, PageNote, PageStat, PageStatGrid } from "@/components/PageParts";
import { useAuth } from "@/contexts/AuthContext";
import { FieldErrors, isValidEmail } from "@/lib/form-validation";
import { toast } from "sonner";

type LoginField = "email" | "password";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    const nextErrors: FieldErrors<LoginField> = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Vui lòng nhập email.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email = "Email chưa đúng định dạng.";
    }

    if (!password) {
      nextErrors.password = "Vui lòng nhập mật khẩu.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      toast.success("Đăng nhập thành công.");
      navigate((location.state as { from?: string } | null)?.from || "/");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể đăng nhập.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell page-stack">
      <PageIntro
        eyebrow="Đăng nhập"
        title="Quay lại khu vực mua sắm và đơn hàng của bạn bằng biểu mẫu gọn, dễ nhìn."
        description="Trang này chỉ giữ lại các thông tin thật sự cần cho việc đăng nhập và các lợi ích chính sau khi vào tài khoản."
        aside={
          <div className="space-y-4">
            <PageStatGrid className="md:grid-cols-1 xl:grid-cols-2">
              <PageStat
                label="Theo dõi đơn"
                value="1 nơi"
                caption="Xem nhanh trạng thái đơn và lịch sử mua."
                icon={<ShoppingBag className="h-4 w-4" />}
              />
              <PageStat
                label="Hồ sơ cá nhân"
                value="Gọn"
                caption="Cập nhật thông tin và mật khẩu cùng một màn hình."
                icon={<UserCircle2 className="h-4 w-4" />}
              />
            </PageStatGrid>
            <PageNote title="Lưu ý">
              <p>Phiên đăng nhập hiện chỉ được giữ trong phiên đang mở để tránh lưu dữ liệu người dùng ngoài cơ sở dữ liệu.</p>
            </PageNote>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="section-shell space-y-4 p-6 md:p-7">
          <div className="space-y-2">
            <p className="panel-subtitle">Sau khi đăng nhập</p>
            <p className="section-copy max-w-2xl">
              Bạn có thể quay lại giỏ hàng đã lưu trong tài khoản, kiểm tra đơn hàng và cập nhật thông tin liên hệ mà không phải tìm qua nhiều khu vực khác nhau.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              "Xem đơn hàng gần nhất ngay trong tài khoản.",
              "Tiếp tục mua sắm mà không phải nhập lại hồ sơ.",
              "Giỏ hàng và dữ liệu đơn được đồng bộ với hệ thống.",
            ].map((text) => (
              <div key={text} className="info-tile min-h-0 p-4">
                <p className="text-[0.96rem] leading-7 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-[1.75rem] border-border/70 shadow-sm">
          <CardContent className="space-y-6 p-7 md:p-8">
            <div className="space-y-2">
              <p className="section-kicker">Tài khoản</p>
              <h2 className="text-[1.75rem] font-semibold leading-tight">Tiếp tục phiên làm việc</h2>
              <p className="text-[0.98rem] leading-7 text-muted-foreground">
                Nhập email và mật khẩu để truy cập lại khu vực mua sắm của bạn.
              </p>
            </div>

            <form className="space-y-5" noValidate onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setErrors((current) => ({ ...current, email: undefined }));
                    setSubmitError("");
                  }}
                  placeholder="you@example.com"
                  aria-describedby={errors.email ? "login-email-error" : undefined}
                  aria-invalid={errors.email ? true : undefined}
                />
                <FieldError id="login-email-error">{errors.email}</FieldError>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setErrors((current) => ({ ...current, password: undefined }));
                    setSubmitError("");
                  }}
                  placeholder="••••••••"
                  aria-describedby={errors.password ? "login-password-error" : undefined}
                  aria-invalid={errors.password ? true : undefined}
                />
                <FieldError id="login-password-error">{errors.password}</FieldError>
              </div>

              <FormAlert>{submitError}</FormAlert>
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
              </Button>
            </form>

            <div className="rounded-[1.15rem] bg-secondary/35 px-4 py-3 text-[0.95rem] leading-7 text-muted-foreground">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <p>Thông tin đăng nhập chỉ dùng để xác thực tài khoản và truy cập dữ liệu cá nhân của bạn.</p>
              </div>
            </div>

            <p className="text-center text-base text-muted-foreground">
              Chưa có tài khoản?{" "}
              <Link className="font-medium text-primary" to="/dang-ky">
                Đăng ký ngay
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
