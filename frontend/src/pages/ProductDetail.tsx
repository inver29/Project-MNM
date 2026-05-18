import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock3,
  Minus,
  PackageCheck,
  Plus,
  ShoppingCart,
  Star,
  SwatchBook,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageNote, PageStat, PageStatGrid } from "@/components/PageParts";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiRequest } from "@/lib/api";
import {
  formatCurrency,
  getProductCategory,
  getProductImage,
  getProductPrice,
  getProductSummary,
} from "@/lib/catalog";
import { Product, ProductReview } from "@/types/domain";
import { toast } from "sonner";

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart, buyNow } = useCart();
  const { token, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [ratingValue, setRatingValue] = useState(5);
  const [commentText, setCommentText] = useState("");

  const reviewFromOrder = searchParams.get("reviewFromOrder");

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiRequest<Product>(`/items/by-slug/${slug}`)
      .then(async (loadedProduct) => {
        setProduct(loadedProduct);
        setQuantity(1);
        const loadedReviews = await apiRequest<ProductReview[]>(`/items/${loadedProduct.item_id}/reviews`);
        setReviews(loadedReviews);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được chi tiết sản phẩm.");
      })
      .finally(() => setIsLoading(false));
  }, [slug]);

  const myReview = useMemo(() => {
    return reviews.find((review) => review.account_id === user?.account_id) || null;
  }, [reviews, user?.account_id]);

  useEffect(() => {
    if (!myReview) {
      return;
    }
    setRatingValue(myReview.rating_value);
    setCommentText(myReview.comment_text);
  }, [myReview]);

  useEffect(() => {
    if (!reviewFromOrder || !product) {
      return;
    }
    const reviewSection = document.getElementById("danh-gia");
    if (reviewSection) {
      reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [product, reviewFromOrder]);

  if (isLoading) {
    return <div className="page-shell py-12">Đang tải chi tiết sản phẩm...</div>;
  }

  if (!product) {
    return <div className="page-shell py-12 text-center">Không tìm thấy sản phẩm.</div>;
  }

  const canAddToCart = product.is_published && product.available_qty > 0;
  const maxQuantity = Math.max(1, product.available_qty);
  const normalizedQuantity = Math.min(Math.max(quantity, 1), maxQuantity);

  function requireAuth() {
    navigate("/dang-nhap", { state: { from: `/san-pham/${slug}` } });
  }

  async function handleAddToCart() {
    await addToCart(product, {
      quantity: normalizedQuantity,
      onRequireAuth: requireAuth,
    });
  }

  async function handleBuyNow() {
    const didPrepareCheckout = await buyNow(product, {
      quantity: normalizedQuantity,
      onRequireAuth: requireAuth,
    });
    if (didPrepareCheckout) {
      navigate("/thanh-toan");
    }
  }

  async function handleSubmitReview() {
    if (!token) {
      requireAuth();
      return;
    }
    setIsSubmittingReview(true);
    try {
      const savedReview = await apiRequest<ProductReview>(`/items/${product.item_id}/reviews`, {
        method: "POST",
        token,
        body: {
          rating_value: ratingValue,
          comment_text: commentText.trim(),
        },
      });
      setReviews((current) => {
        const hasExisting = current.some((review) => review.review_id === savedReview.review_id);
        const nextReviews = hasExisting
          ? current.map((review) => (review.review_id === savedReview.review_id ? savedReview : review))
          : [savedReview, ...current];
        return [...nextReviews].sort(
          (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
        );
      });
      toast.success(myReview ? "Đã cập nhật đánh giá sản phẩm." : "Đã gửi đánh giá sản phẩm.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể gửi đánh giá sản phẩm.");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <div className="page-shell page-stack">
      <Button variant="outline" onClick={() => navigate(-1)} className="w-fit">
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Button>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
        <div className="space-y-5">
          <div className="section-shell flex justify-center p-4">
            <div className="mx-auto flex aspect-[16/11] w-full max-w-[48rem] items-center justify-center overflow-hidden rounded-[1.5rem] bg-secondary/20 p-4">
              <img
                src={getProductImage(product)}
                alt={product.title}
                className="mx-auto max-h-[30rem] w-auto max-w-full rounded-[1.2rem] object-contain object-center"
              />
            </div>
          </div>

          <PageStatGrid className="md:grid-cols-4">
            <PageStat
              label="Chất liệu"
              value={product.material_note || "Đang cập nhật"}
              caption="Thông tin hoàn thiện về bề mặt."
              icon={<SwatchBook className="h-4 w-4" />}
            />
            <PageStat
              label="Tồn kho"
              value={`${product.available_qty} sản phẩm`}
              caption={canAddToCart ? "Có thể thêm vào giỏ hàng ngay." : "Sản phẩm hiện không thể thêm vào giỏ."}
              icon={<PackageCheck className="h-4 w-4" />}
            />
            <PageStat
              label="Giao dự kiến"
              value={`${product.lead_time_days} ngày`}
              caption="Thời gian chuẩn bị trước khi giao."
              icon={<Clock3 className="h-4 w-4" />}
            />
            <PageStat
              label="Đánh giá"
              value={product.review_count ? `${product.average_rating}/5` : "Chưa có"}
              caption={product.review_count ? `${product.review_count} lượt đánh giá đã ghi nhận.` : "Sẽ hiện sau khi có khách mua đánh giá."}
              icon={<Star className="h-4 w-4" />}
            />
          </PageStatGrid>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-28 xl:h-fit">
          <div className="section-shell p-6 md:p-7">
            <div className="space-y-3">
              <p className="section-kicker">{getProductCategory(product)}</p>
              <h1 className="text-[clamp(1.8rem,3vw,2.45rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-balance">
                {product.title}
              </h1>
              <p className="section-copy">{getProductSummary(product)}</p>
            </div>

            <div className="mt-5 rounded-[1.2rem] bg-secondary/45 px-5 py-4">
              <p className="info-label">Giá bán</p>
              <p className="mt-2 text-[1.7rem] font-semibold text-primary">{formatCurrency(getProductPrice(product))}</p>
              <p className="mt-2 text-[0.94rem] leading-6 text-muted-foreground">
                {canAddToCart ? `Còn ${product.available_qty} sản phẩm sẵn kho.` : "Sản phẩm hiện không thể thêm vào giỏ hàng."}
              </p>
            </div>

            <div className="mt-5 rounded-[1.2rem] border border-border/70 bg-background/85 p-4">
              <p className="info-label">Số lượng đặt mua</p>
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary/35 transition hover:bg-secondary disabled:opacity-40"
                  disabled={normalizedQuantity <= 1}
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <Input
                  inputMode="numeric"
                  value={String(normalizedQuantity)}
                  onChange={(event) => {
                    const nextQuantity = Number.parseInt(event.target.value, 10);
                    if (Number.isNaN(nextQuantity)) {
                      setQuantity(1);
                      return;
                    }
                    setQuantity(Math.min(Math.max(nextQuantity, 1), maxQuantity));
                  }}
                  className="h-11 max-w-[6rem] text-center text-[1rem] font-semibold"
                />
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary/35 transition hover:bg-secondary disabled:opacity-40"
                  disabled={normalizedQuantity >= maxQuantity}
                  onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-[0.9rem] text-muted-foreground">
                {canAddToCart ? `Có thể đặt tối đa ${maxQuantity} sản phẩm trong lượt này.` : "Sản phẩm hiện không thể đặt mua."}
              </p>
            </div>

            <div className="mt-5 grid gap-3">
              <Button size="lg" className="w-full" disabled={!canAddToCart} onClick={() => void handleAddToCart()}>
                <ShoppingCart className="h-4.5 w-4.5" />
                {canAddToCart ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
              </Button>
              <Button size="lg" variant="secondary" className="w-full" disabled={!canAddToCart} onClick={() => void handleBuyNow()}>
                <Zap className="h-4.5 w-4.5" />
                Mua ngay
              </Button>
              <Button size="lg" variant="outline" className="w-full" onClick={() => navigate("/gio-hang")}>
                Đi tới giỏ hàng
              </Button>
            </div>
          </div>

          <PageNote title="Thông tin thêm">
            <p>Tông màu: {product.color_tone || "Đang cập nhật"}</p>
            <p>Kích thước: {product.dimension_note || "Đang cập nhật"}</p>
            <p>Trạng thái: {product.is_published ? "Đang kinh doanh" : "Tạm ngừng"}</p>
            <p>Mã sản phẩm: {product.item_code}</p>
          </PageNote>
        </aside>
      </section>

      <section className="section-shell p-6 md:p-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="space-y-3">
            <p className="panel-subtitle">Mô tả sản phẩm</p>
            <p className="text-[0.98rem] leading-8 text-muted-foreground">
              Khu vực này giữ lại phần mô tả cần cho việc ra quyết định mua, tránh lặp lại quá
              nhiều ô thông tin nhỏ gây rối mắt.
            </p>
            <div className="rounded-[1.2rem] bg-secondary/25 p-4 text-[0.96rem] leading-8 text-muted-foreground">
              {getProductSummary(product)}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.1rem] border border-border/70 bg-background/80 px-4 py-3">
              <p className="info-label">Danh mục</p>
              <p className="mt-1 font-medium">{getProductCategory(product)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-background/80 px-4 py-3">
              <p className="info-label">Kích thước</p>
              <p className="mt-1 font-medium">{product.dimension_note || "Đang cập nhật"}</p>
            </div>
            <div className="rounded-[1.1rem] border border-border/70 bg-background/80 px-4 py-3">
              <p className="info-label">Màu sắc</p>
              <p className="mt-1 font-medium">{product.color_tone || "Đang cập nhật"}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="danh-gia" className="section-shell p-6 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <p className="panel-subtitle">Đánh giá sản phẩm</p>
              <p className="section-copy mt-2">
                Khách đã hoàn thành đơn hàng có thể để lại nhận xét giống luồng tham chiếu từ GIS.
              </p>
            </div>

            {reviewFromOrder ? (
              <div className="rounded-[1rem] border border-primary/20 bg-primary/5 px-4 py-3 text-[0.95rem] leading-7 text-primary">
                Bạn vừa đi tới từ chi tiết đơn hàng. Nếu đơn đã hoàn thành, hãy chấm điểm và gửi nhận xét tại đây.
              </div>
            ) : null}

            <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
              <p className="info-label">Chấm điểm</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${
                      value <= ratingValue
                        ? "border-amber-400 bg-amber-50 text-amber-500"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-secondary/40"
                    }`}
                    onClick={() => setRatingValue(value)}
                  >
                    <Star className={`h-5 w-5 ${value <= ratingValue ? "fill-current" : ""}`} />
                  </button>
                ))}
              </div>
              <Textarea
                className="mt-4 min-h-[8rem]"
                placeholder="Viết nhận xét về chất liệu, thiết kế, đóng gói hoặc trải nghiệm sử dụng..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
              />
              <Button className="mt-4 w-full" disabled={isSubmittingReview} onClick={() => void handleSubmitReview()}>
                {isSubmittingReview ? "Đang gửi đánh giá..." : myReview ? "Cập nhật đánh giá" : "Gửi đánh giá"}
              </Button>
              {!token ? (
                <p className="mt-3 text-[0.9rem] leading-6 text-muted-foreground">
                  Bạn cần đăng nhập và đã hoàn thành một đơn chứa sản phẩm này để có thể đánh giá.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="panel-subtitle">Nhận xét từ khách đã mua</p>
                <p className="section-copy mt-2">
                  Trung bình {product.review_count ? `${product.average_rating}/5` : "chưa có đánh giá"} từ{" "}
                  {product.review_count} lượt phản hồi.
                </p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-5 text-[0.96rem] leading-7 text-muted-foreground">
                Chưa có đánh giá nào cho sản phẩm này.
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.review_id} className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{review.account_display_name}</p>
                        <p className="text-[0.9rem] text-muted-foreground">
                          {new Date(review.updated_at).toLocaleDateString("vi-VN")}
                          {review.is_edited ? " • đã chỉnh sửa" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Star
                            key={value}
                            className={`h-4.5 w-4.5 ${value <= review.rating_value ? "fill-current" : ""}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-[0.96rem] leading-7 text-muted-foreground">
                      {review.comment_text || "Khách hàng chưa để lại nhận xét chi tiết."}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProductDetail;
