import { Link, useNavigate } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency, getProductImage, getProductPrice, getProductSummary } from "@/lib/catalog";
import { toast } from "sonner";

const Cart = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, cartCount, lineCount, removeFromCart, updateQuantity, isSyncing } = useCart();

  async function handleQuantityChange(productId: number, newQuantity: number) {
    if (newQuantity < 1) {
      toast.info("Số lượng tối thiểu là 1.");
      return;
    }
    await updateQuantity(productId, newQuantity);
  }

  function handleCheckout() {
    if (lineCount === 0) {
      toast.info("Giỏ hàng đang trống. Hãy thêm sản phẩm trước khi thanh toán.");
      return;
    }
    navigate("/thanh-toan");
  }

  if (cart.length === 0) {
    return (
      <div className="page-shell">
        <div className="section-shell mx-auto max-w-3xl p-10 text-center">
          <ShoppingBag className="mx-auto mb-5 h-14 w-14 text-muted-foreground" />
          <h2 className="text-[1.9rem] font-semibold">Giỏ hàng của bạn đang trống</h2>
          <p className="mx-auto mt-3 max-w-xl text-[1rem] leading-7 text-muted-foreground">
            Khi bạn thêm sản phẩm, danh sách đã chọn và tổng tiền sẽ xuất hiện tại đây để bạn tiếp tục thanh toán.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/san-pham">Xem sản phẩm</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Về trang chủ</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      <section className="section-shell px-6 py-7 md:px-8 md:py-8">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
          <div className="space-y-3">
            <p className="section-kicker">Giỏ hàng</p>
            <h1 className="panel-title max-w-4xl">Kiểm tra lại sản phẩm, số lượng và tổng tiền trước khi sang bước thanh toán.</h1>
            <p className="section-copy max-w-3xl">
              Tôi đã rút gọn phần mở đầu để bạn tập trung vào đúng việc cần làm: chỉnh số lượng, bỏ món không cần và
              sang checkout khi đã sẵn sàng.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 px-4 py-3">
              <p className="info-label">Dòng sản phẩm</p>
              <p className="mt-1 text-[1.4rem] font-semibold">{lineCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 px-4 py-3">
              <p className="info-label">Tổng số lượng</p>
              <p className="mt-1 text-[1.4rem] font-semibold">{cartCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 px-4 py-3">
              <p className="info-label">Trạng thái tồn kho</p>
              <p className="mt-1 text-[0.98rem] font-semibold">{isSyncing ? "Đang đồng bộ" : "Sẵn sàng thanh toán"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-4">
          {cart.map((item) => {
            const canIncreaseQuantity = item.quantity < item.available_qty;

            return (
              <Card key={item.item_id} className="overflow-hidden border-border/70 transition">
                <CardContent className="grid gap-5 p-5 lg:grid-cols-[112px_minmax(0,1fr)_190px] lg:items-center">
                  <div className="h-28 w-28 overflow-hidden rounded-[1.2rem] bg-secondary/35">
                    <img src={getProductImage(item)} alt={item.title} className="h-full w-full object-cover" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[1.2rem] font-semibold leading-snug">{item.title}</h3>
                    <p className="line-clamp-2 text-[0.96rem] leading-7 text-muted-foreground">
                      {getProductSummary(item)}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[0.94rem] text-muted-foreground">
                      <span className="font-semibold text-primary">{formatCurrency(getProductPrice(item))}</span>
                      <span>{item.available_qty > 0 ? `Còn ${item.available_qty} sản phẩm` : "Đã hết hàng"}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 lg:items-end">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-destructive/20 bg-destructive/5 text-destructive transition hover:bg-destructive/10"
                      onClick={() => void removeFromCart(item.item_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center rounded-full border border-border/70 bg-secondary/28 p-1.5">
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-background transition hover:bg-secondary"
                        onClick={() => void handleQuantityChange(item.item_id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[3rem] px-2 text-center text-[1rem] font-semibold">{item.quantity}</span>
                      <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-background transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!canIncreaseQuantity}
                        onClick={() => void handleQuantityChange(item.item_id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="rounded-[1rem] bg-secondary/30 px-4 py-3 text-right">
                      <p className="info-label">Thành tiền</p>
                      <p className="mt-1 text-[1.12rem] font-semibold text-foreground">
                        {formatCurrency(item.line_total)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <Card className="rounded-[1.6rem] border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="section-kicker">Tóm tắt đơn hàng</p>
                <h2 className="text-[1.45rem] font-semibold leading-tight">Sẵn sàng sang bước thanh toán</h2>
              </div>

              <div className="space-y-3 rounded-[1.2rem] bg-secondary/20 p-4">
                <div className="flex items-center justify-between text-[0.96rem]">
                  <span>Dòng sản phẩm</span>
                  <span className="font-semibold">{lineCount} dòng</span>
                </div>
                <div className="flex items-center justify-between text-[0.96rem]">
                  <span>Tổng số lượng</span>
                  <span className="font-semibold">{cartCount} món</span>
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-[1rem]">
                  <span className="font-medium">Tổng cộng</span>
                  <span className="text-[1.45rem] font-semibold text-primary">{formatCurrency(cartTotal)}</span>
                </div>
              </div>

              <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3 text-[0.94rem] leading-6 text-muted-foreground">
                {isSyncing
                  ? "Giỏ hàng đang được đồng bộ với tồn kho mới nhất."
                  : "Hệ thống sẽ kiểm tra lại tồn kho một lần nữa trước khi tạo đơn hàng."}
              </div>

              <div className="grid gap-3">
                <Button size="lg" className="w-full" onClick={handleCheckout}>
                  Sang bước thanh toán
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full">
                  <Link to="/san-pham">Tiếp tục mua sắm</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
};

export default Cart;
