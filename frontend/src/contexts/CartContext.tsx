import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { CartItem, Product } from "@/types/domain";

interface AddToCartOptions {
  quantity?: number;
  onRequireAuth?: () => void;
  skipSuccessToast?: boolean;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, options?: AddToCartOptions) => Promise<boolean>;
  buyNow: (product: Product, options?: AddToCartOptions) => Promise<boolean>;
  removeFromCart: (productId: number) => Promise<void>;
  updateQuantity: (productId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<CartItem[]>;
  cartTotal: number;
  cartCount: number;
  lineCount: number;
  isSyncing: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function showSynchronizationFeedback(previousCart: CartItem[], nextCart: CartItem[]) {
  const previousQuantities = new Map(previousCart.map((item) => [item.item_id, item.quantity]));
  let removedCount = 0;
  let adjustedCount = 0;

  for (const item of previousCart) {
    if (!nextCart.some((nextItem) => nextItem.item_id === item.item_id)) {
      removedCount += 1;
    }
  }

  for (const item of nextCart) {
    const previousQuantity = previousQuantities.get(item.item_id);
    if (previousQuantity !== undefined && previousQuantity !== item.quantity) {
      adjustedCount += 1;
    }
  }

  if (removedCount > 0 && adjustedCount > 0) {
    toast.info("Giỏ hàng đã được đồng bộ lại theo tồn kho hiện tại.");
  } else if (removedCount > 0) {
    toast.info("Một số sản phẩm đã hết hàng hoặc ngừng bán nên được gỡ khỏi giỏ.");
  } else if (adjustedCount > 0) {
    toast.info("Số lượng trong giỏ đã được điều chỉnh theo tồn kho mới nhất.");
  }
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { token, isReady } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const cartRef = useRef<CartItem[]>([]);

  const syncCartState = useCallback((nextCart: CartItem[]) => {
    cartRef.current = nextCart;
    setCart(nextCart);
  }, []);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  const fetchCart = useCallback(
    async (showFeedback: boolean): Promise<CartItem[]> => {
      if (!token || !isReady) {
        syncCartState([]);
        return [];
      }

      setIsSyncing(true);
      try {
        const nextCart = await apiRequest<CartItem[]>("/cart", { token });
        if (showFeedback) {
          showSynchronizationFeedback(cartRef.current, nextCart);
        }
        syncCartState(nextCart);
        return nextCart;
      } finally {
        setIsSyncing(false);
      }
    },
    [isReady, syncCartState, token],
  );

  const refreshCart = useCallback(async () => fetchCart(true), [fetchCart]);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!token) {
      syncCartState([]);
      return;
    }
    void fetchCart(false);
  }, [fetchCart, isReady, syncCartState, token]);

  function handleAuthRequired(onRequireAuth?: () => void) {
    if (onRequireAuth) {
      onRequireAuth();
      return;
    }
    toast.info("Vui lòng đăng nhập để lưu giỏ hàng vào tài khoản.");
  }

  async function addToCart(product: Product, options: AddToCartOptions = {}) {
    if (!token) {
      handleAuthRequired(options.onRequireAuth);
      return false;
    }
    if (!product.is_published) {
      toast.error("Sản phẩm này hiện đang tạm ngừng kinh doanh.");
      return false;
    }
    if (product.available_qty <= 0) {
      toast.error("Sản phẩm này hiện đã hết hàng.");
      return false;
    }

    const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
    await apiRequest<CartItem>("/cart/items", {
      method: "POST",
      token,
      body: {
        item_id: product.item_id,
        quantity,
      },
    });
    await fetchCart(false);
    if (!options.skipSuccessToast) {
      toast.success(quantity > 1 ? `Đã thêm ${quantity} sản phẩm vào giỏ hàng.` : "Đã thêm vào giỏ hàng.");
    }
    return true;
  }

  async function buyNow(product: Product, options: AddToCartOptions = {}) {
    if (!token) {
      handleAuthRequired(options.onRequireAuth);
      return false;
    }

    const didAddToCart = await addToCart(product, { ...options, skipSuccessToast: true });
    if (!didAddToCart) {
      return false;
    }

    toast.success("Đã thêm sản phẩm vào giỏ và chuyển sang bước thanh toán.");
    return true;
  }

  async function removeFromCart(productId: number) {
    if (!token) {
      syncCartState([]);
      return;
    }
    await apiRequest<void>(`/cart/items/${productId}`, {
      method: "DELETE",
      token,
    });
    const nextCart = cartRef.current.filter((item) => item.item_id !== productId);
    syncCartState(nextCart);
    toast.success("Đã xóa khỏi giỏ hàng.");
  }

  async function updateQuantity(productId: number, quantity: number) {
    if (!token) {
      syncCartState([]);
      return;
    }
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const updatedLine = await apiRequest<CartItem>(`/cart/items/${productId}`, {
      method: "PUT",
      token,
      body: { quantity },
    });
    const nextCart = cartRef.current.map((item) => (item.item_id === productId ? updatedLine : item));
    syncCartState(nextCart);
  }

  async function clearCart() {
    if (!token) {
      syncCartState([]);
      return;
    }
    await apiRequest<void>("/cart", {
      method: "DELETE",
      token,
    });
    syncCartState([]);
  }

  const cartTotal = cart.reduce((total, item) => total + item.line_total, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const lineCount = cart.length;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        buyNow,
        removeFromCart,
        updateQuantity,
        clearCart,
        refreshCart,
        cartTotal,
        cartCount,
        lineCount,
        isSyncing,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

export type { Product, CartItem };
