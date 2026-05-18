import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Helmet } from "react-helmet";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { getSpaceImage } from "@/lib/catalog";
import { Product, Space } from "@/types/domain";
import heroImage from "@/assets/furniture-hero.jpg";
import roomBedroom from "@/assets/room-bedroom.jpg";
import roomDining from "@/assets/room-dining.jpg";
import roomLiving from "@/assets/room-living.jpg";
import roomOffice from "@/assets/room-office.jpg";

const roomImages = [roomLiving, roomBedroom, roomDining, roomOffice];

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    void Promise.all([apiRequest<Product[]>("/items?featured_only=true"), apiRequest<Space[]>("/spaces")])
      .then(([items, loadedSpaces]) => {
        setFeaturedProducts(items.slice(0, 4));
        setSpaces(loadedSpaces);
      })
      .catch(() => {
        setFeaturedProducts([]);
        setSpaces([]);
      });
  }, []);

  return (
    <>
      <Helmet>
        <title>Cửa hàng nội thất | Hệ thống web bán hàng nội thất</title>
        <meta
          name="description"
          content="Khám phá bộ sưu tập nội thất theo từng không gian và đặt hàng trực tuyến."
        />
      </Helmet>

      <div className="page-shell page-stack">
        <section className="section-shell overflow-hidden">
          <div
            className="relative min-h-[32rem] bg-cover bg-center px-6 py-10 md:px-10 md:py-14"
            style={{ backgroundImage: `linear-gradient(135deg, rgba(34, 22, 16, 0.58), rgba(89, 58, 38, 0.38)), url(${heroImage})` }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_40%)]" />
            <div className="relative mx-auto flex min-h-[26rem] max-w-4xl flex-col items-center justify-center text-center text-white">
              <p className="text-[0.86rem] font-semibold uppercase tracking-[0.22em] text-white/72">Cửa hàng nội thất</p>
              <h1 className="mt-4 text-[2.25rem] font-semibold leading-tight md:text-[3.35rem]">
                Nội thất sang trọng cho cuộc sống của bạn
              </h1>
              <p className="mt-4 max-w-2xl text-[1rem] leading-7 text-white/78 md:text-[1.05rem]">
                Chọn nhanh không gian, xem bộ sưu tập phù hợp và theo dõi đơn hàng ngay trên cùng một hệ thống
                gọn, rõ và dễ dùng.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
                  <Link to="/san-pham">
                    Xem sản phẩm
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/35 bg-white/10 text-white hover:bg-white/18 hover:text-white">
                  <a href="#khong-gian">Xem theo không gian</a>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-3 text-[0.92rem]">
                {["Không gian dễ chọn", "Sản phẩm dễ so sánh", "Đơn hàng dễ theo dõi"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-white/88 backdrop-blur"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="khong-gian" className="page-stack">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <h2 className="panel-title max-w-3xl">Mua sắm theo không gian</h2>
            </div>
            <Button asChild variant="outline">
              <Link to="/san-pham">Xem toàn bộ sản phẩm</Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {spaces.map((space, index) => (
              <Link
                key={space.space_id}
                to={`/san-pham?category=${space.slug_token}`}
                className="group overflow-hidden rounded-[1.45rem] border border-border/70 bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-[0_24px_40px_-34px_hsl(24_18%_18%/0.28)]"
              >
                <div className="aspect-[4/3.1] overflow-hidden bg-secondary/25">
                  <img
                    alt={space.space_name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    src={getSpaceImage(space, roomImages[index % roomImages.length])}
                  />
                </div>
                <div className="space-y-3 p-5">
                  <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-[0.84rem] font-medium text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Không gian
                  </p>
                  <h3 className="text-[1.15rem] font-semibold leading-snug">{space.space_name}</h3>
                  <p className="line-clamp-2 text-[0.95rem] leading-7 text-muted-foreground">
                    {space.teaser_text || `Các sản phẩm nội thất cho ${space.space_name.toLowerCase()}.`}
                  </p>
                  <span className="inline-flex items-center gap-2 text-[0.95rem] font-medium text-primary">
                    Xem sản phẩm
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="page-stack">
          <div className="space-y-2">
            <p className="section-kicker">Sản phẩm nổi bật</p>
            <h2 className="panel-title max-w-3xl">Những mẫu đang được quan tâm.</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.item_id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
};

export default Home;
