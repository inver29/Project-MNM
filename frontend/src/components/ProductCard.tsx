import { useLocation, useNavigate } from "react-router-dom";
import { Eye, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency, getProductImage, getProductPrice, getProductSummary } from "@/lib/catalog";
import { Product } from "@/types/domain";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const canAddToCart = product.is_published && product.available_qty > 0;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-34px_hsl(24_18%_18%/0.35)]">
      <button
        type="button"
        className="block w-full overflow-hidden text-left"
        onClick={() => navigate(`/san-pham/${product.slug_token}`)}
      >
        <div className="aspect-[4/3.05] overflow-hidden bg-secondary/25">
          <img
            src={getProductImage(product)}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            width="560"
            height="420"
          />
        </div>
      </button>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-[0.84rem] font-medium text-primary">
            {product.space.space_name}
          </span>
          <h3 className="line-clamp-2 text-[1.25rem] font-semibold leading-snug">{product.title}</h3>
          <p className="line-clamp-2 text-[0.96rem] leading-7 text-muted-foreground">{getProductSummary(product)}</p>
        </div>

        <div className="mt-auto rounded-[1.15rem] bg-secondary/35 p-4">
          <p className="info-label">Giá bán</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="whitespace-nowrap text-[1.5rem] font-semibold text-primary">
              {formatCurrency(getProductPrice(product))}
            </p>
            <span className="whitespace-nowrap text-[0.9rem] text-muted-foreground">
              {product.available_qty > 0 ? `Còn ${product.available_qty}` : "Tạm hết hàng"}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="grid gap-2 border-t border-border/70 px-5 py-4">
        <Button variant="outline" className="w-full" onClick={() => navigate(`/san-pham/${product.slug_token}`)}>
          <Eye className="mr-1 h-4 w-4" />
          Xem chi tiết
        </Button>
        <Button
          className="w-full"
          disabled={!canAddToCart}
          onClick={(event) => {
            event.stopPropagation();
            void addToCart(product, {
              onRequireAuth: () => navigate("/dang-nhap", { state: { from: location.pathname } }),
            });
          }}
        >
          <ShoppingCart className="mr-1 h-4 w-4" />
          {canAddToCart ? "Thêm vào giỏ" : "Tạm hết hàng"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
