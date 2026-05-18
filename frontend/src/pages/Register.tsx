import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { FieldErrors, isValidEmail, isValidPhone } from "@/lib/form-validation";
import { toast } from "sonner";

type RegisterField = "display_name" | "email_address" | "mobile_phone" | "password";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    display_name: "",
    email_address: "",
    mobile_phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateForm() {
    const nextErrors: FieldErrors<RegisterField> = {};
    const normalizedName = formData.display_name.trim();
    const normalizedEmail = formData.email_address.trim();
    const normalizedPhone = formData.mobile_phone.trim();

    if (normalizedName.length < 2) {
      nextErrors.display_name = "Họ và tên cần có ít nhất 2 ký tự.";
    }

    if (!normalizedEmail) {
      nextErrors.email_address = "Vui lòng nhập email.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email_address = "Email chưa đúng định dạng.";
    }

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      nextErrors.mobile_phone = "Số điện thoại cần từ 8 đến 20 ký tự hợp lệ.";
    }

    if (formData.password.length < 6) {
      nextErrors.password = "Mật khẩu cần có ít nhất 6 ký tự.";
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
      await register({
        ...formData,
        display_name: formData.display_name.trim(),
        email_address: formData.email_address.trim(),
        mobile_phone: formData.mobile_phone.trim(),
      });
      toast.success("Tạo tài khoản thành công.");
      navigate("/");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page-shell page-stack">
      <section className="page-hero space-y-3 text-center">
        <p className="section-kicker">Đăng ký</p>
        <h1 className="panel-title mx-auto max-w-4xl">
          Tạo tài khoản mới bằng biểu mẫu ngắn gọn để bắt đầu mua sắm nhanh hơn.
        </h1>
        <p className="section-copy mx-auto max-w-3xl">
          Trang đăng ký giờ chỉ còn phần giới thiệu ngắn và biểu mẫu chính, không tách thêm các khối phụ làm loãng trọng tâm.
        </p>
      </section>

      <Card className="mx-auto w-full max-w-3xl rounded-[1.8rem] border-border/70 shadow-sm">
        <CardContent className="space-y-6 p-7 md:p-8">
          <div className="space-y-2">
            <p className="section-kicker">Tài khoản mới</p>
            <h2 className="text-[1.75rem] font-semibold leading-tight">Đăng ký trong một bước</h2>
            <p className="text-[0.98rem] leading-7 text-muted-foreground">
              Điền các thông tin cơ bản để bắt đầu mua sắm và quản lý đơn hàng trên cùng một hệ thống.
            </p>
          </div>

          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="display_name">Họ và tên</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, display_name: event.target.value }));
                  setErrors((current) => ({ ...current, display_name: undefined }));
                  setSubmitError("");
                }}
                aria-describedby={errors.display_name ? "register-display-name-error" : undefined}
                aria-invalid={errors.display_name ? true : undefined}
              />
              <FieldError id="register-display-name-error">{errors.display_name}</FieldError>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                  aria-describedby={errors.email_address ? "register-email-error" : undefined}
                  aria-invalid={errors.email_address ? true : undefined}
                />
                <FieldError id="register-email-error">{errors.email_address}</FieldError>
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
                  aria-describedby={errors.mobile_phone ? "register-phone-error" : undefined}
                  aria-invalid={errors.mobile_phone ? true : undefined}
                />
                <FieldError id="register-phone-error">{errors.mobile_phone}</FieldError>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, password: event.target.value }));
                  setErrors((current) => ({ ...current, password: undefined }));
                  setSubmitError("");
                }}
                aria-describedby={errors.password ? "register-password-error" : undefined}
                aria-invalid={errors.password ? true : undefined}
              />
              <FieldError id="register-password-error">{errors.password}</FieldError>
            </div>

            <FormAlert>{submitError}</FormAlert>
            <Button className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
            </Button>
          </form>

          <div className="rounded-[1.15rem] bg-secondary/35 px-4 py-3 text-[0.95rem] leading-7 text-muted-foreground">
            Sau khi đăng ký, bạn có thể lưu giỏ hàng, đặt đơn và theo dõi lịch sử mua sắm bằng cùng một tài khoản.
          </div>

          <p className="text-center text-base text-muted-foreground">
            Đã có tài khoản?{" "}
            <Link className="font-medium text-primary" to="/dang-nhap">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
