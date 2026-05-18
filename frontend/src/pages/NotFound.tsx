import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="page-shell py-12">
      <div className="section-shell mx-auto max-w-2xl p-8 text-center md:p-10">
        <p className="section-kicker">Không tìm thấy trang</p>
        <h1 className="mt-3 text-[3.8rem] font-semibold leading-none md:text-[4.8rem]">404</h1>
        <p className="mx-auto mt-4 max-w-xl text-[1rem] leading-7 text-muted-foreground">
          Đường dẫn <span className="font-medium text-foreground">{location.pathname}</span> hiện không tồn tại hoặc đã được thay đổi.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/">Về trang chủ</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/san-pham">Xem sản phẩm</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
