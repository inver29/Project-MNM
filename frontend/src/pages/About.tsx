import { HandHeart, Home, Layers3, Sparkles } from "lucide-react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImage from "@/assets/room-living.jpg";

const promises = [
  {
    icon: Home,
    title: "Không gian sống rõ gu",
    text: "Mỗi bộ sưu tập được sắp theo từng không gian để bạn dễ tưởng tượng cách bài trí ngay trong ngôi nhà của mình.",
  },
  {
    icon: Layers3,
    title: "Mẫu mã đồng bộ",
    text: "Từ sofa, bàn trà đến kệ trang trí, sản phẩm được lựa chọn để dễ phối cùng nhau thay vì nhìn đẹp nhưng khó dùng chung.",
  },
  {
    icon: HandHeart,
    title: "Dễ đặt hàng, dễ theo dõi",
    text: "Khách có thể đặt hàng trực tuyến, xem lịch sử đơn và hậu mãi trên cùng một hệ thống gọn gàng.",
  },
];

const About = () => {
  return (
    <>
      <Helmet>
        <title>Giới thiệu | Cửa hàng nội thất</title>
        <meta
          name="description"
          content="Tìm hiểu về cửa hàng nội thất, phong cách phục vụ và những giá trị mà hệ thống muốn mang lại cho khách hàng."
        />
      </Helmet>

      <div className="page-shell page-stack">
        <section className="section-shell overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_43%]">
            <div className="flex items-center px-6 py-8 md:px-10 md:py-12">
              <div className="max-w-3xl space-y-5">
                <p className="section-kicker">Giới thiệu cửa hàng</p>
                <h1 className="panel-title max-w-3xl">
                  Chúng tôi chọn nội thất theo hướng đẹp, dễ sống cùng và phù hợp với nhịp sinh hoạt hằng ngày.
                </h1>
                <p className="section-copy max-w-2xl">
                  Cửa hàng nội thất MNM tập trung vào những sản phẩm giúp không gian sống trở nên ấm, gọn và có cá
                  tính riêng. Thay vì bày quá nhiều lựa chọn gây rối, chúng tôi sắp xếp sản phẩm theo từng khu vực như
                  phòng khách, phòng ngủ, phòng ăn và góc làm việc để khách dễ tìm hơn.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/san-pham">Xem sản phẩm</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/">Về trang chủ</Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative min-h-[22rem] overflow-hidden">
              <img src={heroImage} alt="Không gian phòng khách nội thất MNM" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-[1.3rem] border border-white/20 bg-white/14 p-4 text-white backdrop-blur">
                <p className="text-[0.82rem] uppercase tracking-[0.18em] text-white/68">Phong cách phục vụ</p>
                <p className="mt-2 text-[1.05rem] font-semibold leading-7">
                  Gợi ý vừa đủ để bạn dễ chọn, nhưng vẫn giữ không gian riêng cho gu thẩm mỹ của chính mình.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_340px]">
          <div className="section-shell p-6 md:p-8">
            <div className="space-y-4">
              <p className="section-kicker">Về MNM</p>
              <h2 className="panel-title max-w-3xl">Một cửa hàng nội thất dành cho những người muốn chọn nhanh nhưng vẫn muốn căn nhà có dấu ấn riêng.</h2>
              <div className="space-y-4 text-[1rem] leading-8 text-muted-foreground">
                <p>
                  Chúng tôi tin rằng nội thất không chỉ là đồ dùng, mà còn là cách mỗi người tạo nên cảm giác dễ chịu
                  khi trở về nhà. Vì vậy, hệ thống tập trung vào những sản phẩm có hình thức đẹp, màu sắc dễ phối và
                  kích thước đủ thực tế cho nhu cầu sử dụng hằng ngày.
                </p>
                <p>
                  Website được xây dựng để khách hàng xem sản phẩm, so sánh nhanh, đặt hàng trực tuyến và theo dõi đơn
                  mua sắm mà không bị rối bởi quá nhiều thông tin phụ. Từ giao diện người dùng đến khu quản trị đều
                  hướng tới sự rõ ràng, dễ thao tác và dễ trình bày khi demo.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="section-shell p-5">
              <p className="section-kicker">Cam kết</p>
              <p className="mt-2 text-[1rem] leading-7 text-muted-foreground">
                Sản phẩm được tổ chức theo không gian sống để bạn đi từ nhu cầu thực tế đến lựa chọn phù hợp nhanh
                hơn.
              </p>
            </div>
            <div className="section-shell p-5">
              <p className="section-kicker">Trải nghiệm</p>
              <p className="mt-2 text-[1rem] leading-7 text-muted-foreground">
                Từ xem hàng đến theo dõi đơn sau mua đều nằm trong một luồng mạch lạc, dễ dùng trên cả máy tính lẫn
                điện thoại.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="section-kicker">Điểm nổi bật</p>
            <h2 className="panel-title max-w-3xl">Những điều chúng tôi muốn khách cảm nhận rõ nhất khi mua sắm tại MNM.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {promises.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title} className="overflow-hidden rounded-[1.45rem] border-border/70 shadow-sm">
                  <CardContent className="space-y-3 p-6">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[1.2rem] font-semibold">{item.title}</h3>
                    <p className="text-[0.96rem] leading-7 text-muted-foreground">{item.text}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="section-shell px-6 py-8 md:px-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="space-y-2">
              <p className="section-kicker">Sẵn sàng tham khảo</p>
              <h2 className="panel-title max-w-3xl">Bắt đầu từ không gian bạn muốn làm mới nhất.</h2>
              <p className="section-copy max-w-2xl">
                Dù là thay một chiếc ghế, chọn bộ sofa mới hay làm gọn lại góc làm việc, bạn đều có thể bắt đầu từ
                danh mục sản phẩm và xem theo từng không gian.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full px-6">
              <Link to="/san-pham">
                <Sparkles className="h-4 w-4" />
                Khám phá bộ sưu tập
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
};

export default About;
