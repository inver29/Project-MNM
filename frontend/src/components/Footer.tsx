import { Link } from "react-router-dom";
import { Clock3, Mail, MapPin, Phone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="mt-16 border-t border-border/70 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-10 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr_1fr]">
          <div className="space-y-4">
            <p className="text-[0.94rem] font-medium text-primary-foreground/78">Cửa hàng nội thất</p>
            <h3 className="max-w-md text-[1.55rem] font-semibold leading-tight md:text-[1.8rem]">
              Mua sắm gọn, rõ và dễ theo dõi trên cùng một hệ thống.
            </h3>
            <p className="max-w-md text-[0.98rem] leading-7 text-primary-foreground/88">
              Các trang được tinh gọn lại để người dùng tập trung vào sản phẩm, giỏ hàng, đơn hàng và thao tác chính thay vì phải đọc quá nhiều khối thông tin phụ.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-[1rem] font-semibold text-white">Đi nhanh</h4>
            <div className="grid gap-3 text-[0.98rem] text-primary-foreground/88">
              <Link to="/" className="transition hover:text-white">
                Trang chủ
              </Link>
              <Link to="/san-pham" className="transition hover:text-white">
                Sản phẩm
              </Link>
              <Link to="/gioi-thieu" className="transition hover:text-white">
                Giới thiệu
              </Link>
              <Link to="/gio-hang" className="transition hover:text-white">
                Giỏ hàng
              </Link>
              <Link to="/don-hang" className="transition hover:text-white">
                Đơn hàng
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[1rem] font-semibold text-white">Liên hệ</h4>
            <div className="grid gap-3 text-[0.98rem] leading-7 text-primary-foreground/88">
              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-4 w-4 shrink-0" />
                <span>(028) 7300 8899</span>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-4 w-4 shrink-0" />
                <span>hotro@cuahangnoithat.vn</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-4 w-4 shrink-0" />
                <span>Quận 7, TP. Hồ Chí Minh</span>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-1 h-4 w-4 shrink-0" />
                <span>08:30 - 20:30 mỗi ngày</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/12 pt-4 text-[0.94rem] text-primary-foreground/78">
          © 2026 Cửa hàng nội thất. Giao diện được tinh gọn để dễ xem, dễ chọn và dễ thao tác hơn.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
