import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Landmark, Loader2, MapPinHouse, WalletCards } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DeliveryLocationMap from "@/components/checkout/DeliveryLocationMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { apiRequest, buildQuery, resolveAssetUrl } from "@/lib/api";
import { paymentLabels } from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { FieldErrors, isValidPhone } from "@/lib/form-validation";
import { cn } from "@/lib/utils";
import {
  CartItem,
  DeliveryAddressSuggestion,
  DeliveryQuote,
  PaymentMethod,
  PaymentPreview,
  SalesOrder,
} from "@/types/domain";

type CheckoutField =
  | "consignee_name"
  | "consignee_phone"
  | "delivery_line"
  | "payment_method"
  | "delivery_quote";

type CheckoutSnapshotLine = {
  basket_line_id?: number;
  item_id: number;
  quantity: number;
};

type DeliveryQuoteSource = "address_input" | "map_pick";

const MAP_PICK_PLACEHOLDER = "Vị trí đã chọn trên bản đồ";

const paymentOptions: Array<{
  value: PaymentMethod;
  title: string;
  description: string;
  icon: typeof Banknote;
}> = [
  { value: "tien_mat", title: "COD", description: "Thanh toán khi nhận hàng.", icon: Banknote },
  { value: "momo", title: "Ví MoMo", description: "Quét mã để chuyển nhanh.", icon: WalletCards },
  { value: "chuyen_khoan", title: "Chuyển khoản", description: "Quét QR hoặc chuyển thủ công.", icon: Landmark },
];

function buildCheckoutSnapshot(lines: CartItem[]): CheckoutSnapshotLine[] {
  return [...lines]
    .map((item) => ({
      basket_line_id: item.basket_line_id,
      item_id: item.item_id,
      quantity: item.quantity,
    }))
    .sort((left, right) => {
      const leftKey = left.basket_line_id ?? left.item_id;
      const rightKey = right.basket_line_id ?? right.item_id;
      return leftKey - rightKey;
    });
}

function didCheckoutCartChange(previousSnapshot: CheckoutSnapshotLine[], nextSnapshot: CheckoutSnapshotLine[]) {
  if (previousSnapshot.length !== nextSnapshot.length) {
    return true;
  }

  return previousSnapshot.some((item, index) => {
    const nextItem = nextSnapshot[index];
    return (
      !nextItem ||
      nextItem.basket_line_id !== item.basket_line_id ||
      nextItem.item_id !== item.item_id ||
      nextItem.quantity !== item.quantity
    );
  });
}

function buildQuoteKey(
  deliveryLine: string,
  deliveryLat: number | null,
  deliveryLng: number | null,
  snapshot: CheckoutSnapshotLine[],
) {
  return JSON.stringify({
    deliveryLine: deliveryLine.trim(),
    deliveryLat,
    deliveryLng,
    snapshot,
  });
}

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, cartCount, lineCount, refreshCart, isSyncing } = useCart();
  const { isAuthenticated, isReady, token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  const [deliveryLocationError, setDeliveryLocationError] = useState("");
  const [isAddressSyncing, setIsAddressSyncing] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null);
  const [deliveryQuoteKey, setDeliveryQuoteKey] = useState("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    consignee_name: "",
    consignee_phone: "",
    delivery_line: "",
    delivery_note: "",
    payment_method: "tien_mat" as PaymentMethod,
  });
  const [errors, setErrors] = useState<FieldErrors<CheckoutField>>({});
  const [submitError, setSubmitError] = useState("");
  const [isLocatingOnMap, setIsLocatingOnMap] = useState(false);
  const quoteRequestIdRef = useRef(0);
  const addressLookupRequestIdRef = useRef(0);
  const addressLookupTimerRef = useRef<number | null>(null);
  const autoQuoteTimerRef = useRef<number | null>(null);
  const pendingPrefillAddressRef = useRef<string | null>(null);
  const syncMapFromAddressRef = useRef<((addressLine: string, options?: { showError?: boolean }) => Promise<DeliveryAddressSuggestion | null>) | null>(null);
  const requestDeliveryQuoteRef = useRef<((lines: CartItem[], addressLine: string, lat?: number | null, lng?: number | null, source?: DeliveryQuoteSource) => Promise<DeliveryQuote | null>) | null>(null);

  const cartSnapshot = useMemo(() => buildCheckoutSnapshot(cart), [cart]);
  const currentQuoteKey = useMemo(
    () => buildQuoteKey(formData.delivery_line, deliveryLat, deliveryLng, cartSnapshot),
    [cartSnapshot, deliveryLat, deliveryLng, formData.delivery_line],
  );
  const previewAmount = deliveryQuote?.grand_total ?? cartTotal;
  const previewReference = `TAM-X-${previewAmount}`;
  useEffect(() => {
    if (isReady && isAuthenticated && lineCount === 0) {
      navigate("/gio-hang");
    }
  }, [isAuthenticated, isReady, lineCount, navigate]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void refreshCart();
  }, [isAuthenticated, refreshCart]);

  useEffect(() => {
    if (!user) {
      return;
    }
    const defaultAddress = (user.address_line || "").trim();
    pendingPrefillAddressRef.current = defaultAddress || null;

    setFormData((current) => ({
      ...current,
      consignee_name: current.consignee_name || user.display_name,
      consignee_phone: current.consignee_phone || user.mobile_phone || "",
      delivery_line: current.delivery_line || defaultAddress,
    }));
  }, [user]);

  useEffect(() => {
    const pendingAddress = pendingPrefillAddressRef.current;
    if (!pendingAddress) {
      return;
    }

    if (formData.delivery_line.trim() !== pendingAddress) {
      return;
    }

    pendingPrefillAddressRef.current = null;
    if (deliveryLat === null && deliveryLng === null) {
      void syncMapFromAddressRef.current?.(pendingAddress, { showError: true });
    }
  }, [deliveryLat, deliveryLng, formData.delivery_line]);

  useEffect(() => {
    if (deliveryQuote && deliveryQuoteKey !== currentQuoteKey) {
      setDeliveryQuote(null);
      setDeliveryQuoteKey("");
    }
  }, [currentQuoteKey, deliveryQuote, deliveryQuoteKey]);

  useEffect(() => {
    return () => {
      clearAddressLookupTimer();
      clearAutoQuoteTimer();
      addressLookupRequestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    clearAutoQuoteTimer();

    if (!token || lineCount === 0 || isAddressSyncing || isQuoteLoading) {
      return;
    }

    if (formData.delivery_line.trim().length < 4 || deliveryLat === null || deliveryLng === null) {
      return;
    }

    if (deliveryQuoteKey === currentQuoteKey) {
      return;
    }

    autoQuoteTimerRef.current = window.setTimeout(() => {
      autoQuoteTimerRef.current = null;
      void requestDeliveryQuoteRef.current?.(cart, formData.delivery_line, deliveryLat, deliveryLng);
    }, 700);

    return () => clearAutoQuoteTimer();
  }, [
    cart,
    currentQuoteKey,
    deliveryLat,
    deliveryLng,
    deliveryQuoteKey,
    formData.delivery_line,
    isAddressSyncing,
    isQuoteLoading,
    lineCount,
    token,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPaymentPreview() {
      setIsPreviewLoading(true);
      try {
        const preview = await apiRequest<PaymentPreview>(
          `/payment-preview${buildQuery({
            payment_method: formData.payment_method,
            amount: previewAmount,
            reference: previewReference,
          })}`,
          { signal: controller.signal },
        );
        setPaymentPreview(preview);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setPaymentPreview(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsPreviewLoading(false);
        }
      }
    }

    if (lineCount > 0) {
      void loadPaymentPreview();
    } else {
      setPaymentPreview(null);
    }

    return () => controller.abort();
  }, [formData.payment_method, lineCount, previewAmount, previewReference]);

  function resetQuoteState() {
    clearAutoQuoteTimer();
    setDeliveryQuote(null);
    setDeliveryQuoteKey("");
    setErrors((current) => ({ ...current, delivery_quote: undefined }));
  }

  function cancelPendingQuoteRequest() {
    clearAutoQuoteTimer();
    quoteRequestIdRef.current += 1;
    setIsQuoteLoading(false);
  }

  function clearAddressLookupTimer() {
    if (addressLookupTimerRef.current !== null) {
      window.clearTimeout(addressLookupTimerRef.current);
      addressLookupTimerRef.current = null;
    }
  }

  function clearAutoQuoteTimer() {
    if (autoQuoteTimerRef.current !== null) {
      window.clearTimeout(autoQuoteTimerRef.current);
      autoQuoteTimerRef.current = null;
    }
  }

  function cancelPendingAddressLookup() {
    clearAddressLookupTimer();
    addressLookupRequestIdRef.current += 1;
    setIsAddressSyncing(false);
  }

  function buildCheckoutRequest(lines: CartItem[], addressLine: string, lat: number | null, lng: number | null) {
    return {
      delivery_line: addressLine.trim(),
      delivery_lat: lat,
      delivery_lng: lng,
      cart_item_ids: lines.map((item) => item.basket_line_id).filter((value): value is number => typeof value === "number"),
      items: lines.map((item) => ({ item_id: item.item_id, requested_qty: item.quantity })),
    };
  }

  async function requestDeliveryQuote(
    lines: CartItem[],
    addressLine: string,
    lat: number | null = deliveryLat,
    lng: number | null = deliveryLng,
    source: DeliveryQuoteSource = "address_input",
  ) {
    if (!token) {
      return null;
    }

    cancelPendingAddressLookup();
    const requestId = ++quoteRequestIdRef.current;
    const requestAddressLine = source === "map_pick" ? MAP_PICK_PLACEHOLDER : addressLine;
    setIsQuoteLoading(true);
    setDeliveryLocationError("");
    setSubmitError("");
    try {
      const quote = await apiRequest<DeliveryQuote>("/delivery/quote", {
        method: "POST",
        token,
        body: buildCheckoutRequest(lines, requestAddressLine, lat, lng),
      });
      if (requestId !== quoteRequestIdRef.current) {
        return null;
      }
      const nextSnapshot = buildCheckoutSnapshot(lines);
      const normalizedRequestedAddress = requestAddressLine.trim();
      setFormData((current) => {
        const currentDeliveryLine = current.delivery_line.trim();
        const shouldReplaceInputAddress =
          source === "map_pick" ||
          !currentDeliveryLine ||
          currentDeliveryLine === MAP_PICK_PLACEHOLDER;

        return shouldReplaceInputAddress
          ? { ...current, delivery_line: quote.resolved_address }
          : current;
      });
      setDeliveryLat(quote.delivery_lat);
      setDeliveryLng(quote.delivery_lng);
      setDeliveryQuote(quote);
      setDeliveryQuoteKey(
        buildQuoteKey(
          source === "map_pick" ? quote.resolved_address : normalizedRequestedAddress || quote.resolved_address,
          quote.delivery_lat,
          quote.delivery_lng,
          nextSnapshot,
        ),
      );
      setErrors((current) => ({ ...current, delivery_quote: undefined, delivery_line: undefined }));
      return quote;
    } catch (error) {
      if (requestId !== quoteRequestIdRef.current) {
        return null;
      }
      resetQuoteState();
      const message = error instanceof Error ? error.message : "Không thể tính phí giao hàng.";
      setErrors((current) => ({ ...current, delivery_quote: message }));
      setSubmitError(message);
      return null;
    } finally {
      if (requestId === quoteRequestIdRef.current) {
        setIsQuoteLoading(false);
      }
    }
  }

  async function syncMapFromAddress(addressLine: string, options?: { showError?: boolean }) {
    const normalizedAddress = addressLine.trim();
    const showError = options?.showError ?? false;

    clearAddressLookupTimer();

    if (normalizedAddress.length < 4) {
      setDeliveryLat(null);
      setDeliveryLng(null);
      if (showError) {
        setDeliveryLocationError("Hãy nhập địa chỉ rõ hơn để bản đồ xác định đúng vị trí.");
      }
      return null;
    }

    const requestId = addressLookupRequestIdRef.current + 1;
    addressLookupRequestIdRef.current = requestId;
    setIsAddressSyncing(true);
    if (showError) {
      setDeliveryLocationError("");
    }

    try {
      const matches = await apiRequest<DeliveryAddressSuggestion[]>(
        `/delivery/address-search${buildQuery({ query: normalizedAddress, limit: 1 })}`,
      );
      if (requestId !== addressLookupRequestIdRef.current) {
        return null;
      }

      const bestMatch = matches[0];
      if (!bestMatch) {
        setDeliveryLat(null);
        setDeliveryLng(null);
        if (showError) {
          setDeliveryLocationError("Không tìm thấy vị trí phù hợp trên bản đồ từ địa chỉ bạn vừa nhập.");
        }
        return null;
      }

      setDeliveryLat(bestMatch.lat);
      setDeliveryLng(bestMatch.lng);
      setDeliveryLocationError("");
      return bestMatch;
    } catch (error) {
      if (requestId !== addressLookupRequestIdRef.current) {
        return null;
      }
      if (showError) {
        setDeliveryLocationError(error instanceof Error ? error.message : "Không thể đồng bộ địa chỉ lên bản đồ.");
      }
      return null;
    } finally {
      if (requestId === addressLookupRequestIdRef.current) {
        setIsAddressSyncing(false);
      }
    }
  }

  function queueMapSyncFromAddress(addressLine: string) {
    clearAddressLookupTimer();
    if (addressLine.trim().length < 4) {
      return;
    }

    addressLookupTimerRef.current = window.setTimeout(() => {
      addressLookupTimerRef.current = null;
      void syncMapFromAddress(addressLine, { showError: true });
    }, 500);
  }

  async function handleMapLocationPick(lat: number, lng: number) {
    cancelPendingAddressLookup();
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setDeliveryLocationError("");
    setSubmitError("");
    setErrors((current) => ({ ...current, delivery_line: undefined, delivery_quote: undefined }));
    await requestDeliveryQuote(cart, formData.delivery_line, lat, lng, "map_pick");
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setDeliveryLocationError("Trình duyệt hiện tại không hỗ trợ lấy vị trí.");
      return;
    }

    cancelPendingAddressLookup();
    setIsLocatingOnMap(true);
    setDeliveryLocationError("");
    setSubmitError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingOnMap(false);
        void handleMapLocationPick(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsLocatingOnMap(false);
        if (error.code === error.PERMISSION_DENIED) {
          setDeliveryLocationError("Bạn đã từ chối quyền truy cập vị trí. Hãy cho phép trình duyệt dùng GPS rồi thử lại.");
          return;
        }
        if (error.code === error.TIMEOUT) {
          setDeliveryLocationError("Hệ thống lấy vị trí quá lâu. Vui lòng thử lại.");
          return;
        }
        setDeliveryLocationError("Không thể lấy vị trí hiện tại của bạn.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    );
  }

  syncMapFromAddressRef.current = syncMapFromAddress;
  requestDeliveryQuoteRef.current = requestDeliveryQuote;

  function validateCheckoutForm() {
    const nextErrors: FieldErrors<CheckoutField> = {};
    const normalizedName = formData.consignee_name.trim();
    const normalizedPhone = formData.consignee_phone.trim();
    const normalizedAddress = formData.delivery_line.trim();

    if (lineCount === 0) {
      setSubmitError("Giỏ hàng đang trống. Vui lòng quay lại giỏ hàng trước khi thanh toán.");
      return false;
    }
    if (normalizedName.length < 2) {
      nextErrors.consignee_name = "Họ và tên người nhận phải có ít nhất 2 ký tự.";
    }
    if (!normalizedPhone) {
      nextErrors.consignee_phone = "Vui lòng nhập số điện thoại người nhận.";
    } else if (!isValidPhone(normalizedPhone)) {
      nextErrors.consignee_phone = "Số điện thoại người nhận cần từ 8 đến 20 ký tự hợp lệ.";
    }
    if (normalizedAddress.length < 3) {
      nextErrors.delivery_line = "Địa chỉ giao hàng phải có ít nhất 3 ký tự.";
    }
    if (!formData.payment_method) {
      nextErrors.payment_method = "Vui lòng chọn phương thức thanh toán.";
    }
    if (!deliveryQuote || deliveryQuoteKey !== currentQuoteKey) {
      nextErrors.delivery_quote = "Vui lòng tính phí giao hàng lại trước khi đặt đơn.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setSubmitError("Vui lòng kiểm tra lại thông tin giao hàng trước khi đặt đơn.");
      return false;
    }
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");
    if (!token) {
      return;
    }

    const refreshedCart = await refreshCart();
    const refreshedSnapshot = buildCheckoutSnapshot(refreshedCart);
    if (didCheckoutCartChange(cartSnapshot, refreshedSnapshot)) {
      resetQuoteState();
      setSubmitError("Giỏ hàng đã thay đổi sau khi đồng bộ tồn kho. Vui lòng tính lại phí giao hàng trước khi đặt đơn.");
      return;
    }
    if (!validateCheckoutForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const createdOrder = await apiRequest<SalesOrder>("/orders", {
        method: "POST",
        token,
        body: {
          ...buildCheckoutRequest(refreshedCart, formData.delivery_line, deliveryLat, deliveryLng),
          consignee_name: formData.consignee_name.trim(),
          consignee_phone: formData.consignee_phone.trim(),
          delivery_note: formData.delivery_note.trim(),
          payment_method: formData.payment_method,
        },
      });
      await refreshCart();
      navigate(`/don-hang?highlight=${createdOrder.sales_order_id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể tạo đơn hàng.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isReady) {
    return <div className="page-shell py-12">Đang chuẩn bị bước thanh toán...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell py-12">
        <Card className="mx-auto max-w-2xl rounded-[1.6rem] border-border/70">
          <CardContent className="space-y-5 p-8 text-center">
            <h1 className="text-[1.9rem] font-semibold">Đăng nhập để tiếp tục thanh toán</h1>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/dang-nhap">Đăng nhập</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/dang-ky">Đăng ký</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell page-stack">
      <section className="section-shell p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="panel-subtitle">Thanh toán</p>
            <h1 className="text-[2rem] font-semibold leading-tight md:text-[2.4rem]">
              Chốt đơn nội thất theo địa chỉ giao thực tế và tổng tiền đã gồm phí ship.
            </h1>
            <p className="section-copy">
              Giữ nguyên luồng thanh toán hiện tại, đồng thời bổ sung chọn vị trí trên bản đồ để chốt đúng địa chỉ và
              phí giao hàng cho đơn nội thất cồng kềnh.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 px-4 py-3">
              <p className="info-label">Dòng sản phẩm</p>
              <p className="mt-1 text-[1.5rem] font-semibold">{lineCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-secondary/15 px-4 py-3">
              <p className="info-label">Tổng tạm tính</p>
              <p className="mt-1 text-[1.5rem] font-semibold">{formatCurrency(previewAmount)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="section-shell p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="panel-subtitle">1. Người nhận và địa chỉ</p>
                <p className="section-copy">Địa chỉ mặc định từ hồ sơ sẽ được tự điền vào đây.</p>
              </div>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/tai-khoan">
                  <MapPinHouse className="h-4 w-4" />
                  Chỉnh hồ sơ
                </Link>
              </Button>
            </div>

            <form id="checkout-form" className="mt-5 space-y-5" noValidate onSubmit={handleSubmit}>
              <div className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="consignee_name">Họ và tên người nhận</Label>
                      <Input
                        id="consignee_name"
                        value={formData.consignee_name}
                        onChange={(event) => {
                          setFormData((current) => ({ ...current, consignee_name: event.target.value }));
                          setErrors((current) => ({ ...current, consignee_name: undefined }));
                          setSubmitError("");
                        }}
                      />
                      <FieldError>{errors.consignee_name}</FieldError>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="consignee_phone">Số điện thoại người nhận</Label>
                      <Input
                        id="consignee_phone"
                        value={formData.consignee_phone}
                        onChange={(event) => {
                          setFormData((current) => ({ ...current, consignee_phone: event.target.value }));
                          setErrors((current) => ({ ...current, consignee_phone: undefined }));
                          setSubmitError("");
                        }}
                      />
                      <FieldError>{errors.consignee_phone}</FieldError>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery_line">Địa chỉ giao hàng</Label>
                    <Textarea
                      id="delivery_line"
                      rows={4}
                      value={formData.delivery_line}
                      onChange={(event) => {
                        const nextAddress = event.target.value;
                        setFormData((current) => ({ ...current, delivery_line: nextAddress }));
                        setDeliveryLat(null);
                        setDeliveryLng(null);
                        setDeliveryLocationError("");
                        setSubmitError("");
                        cancelPendingQuoteRequest();
                        resetQuoteState();
                        queueMapSyncFromAddress(nextAddress);
                      }}
                      onBlur={() => {
                        void syncMapFromAddress(formData.delivery_line, { showError: true });
                      }}
                    />
                    <p className="text-[0.92rem] leading-6 text-muted-foreground">
                      Bạn có thể nhập địa chỉ để bản đồ tự ghim vị trí, hoặc chấm trực tiếp trên bản đồ để hệ thống tự chuẩn hóa lại vị trí giao.
                    </p>
                    <FieldError>{errors.delivery_line}</FieldError>
                  </div>

                  {deliveryLocationError ? (
                    <div className="rounded-[1rem] border border-amber-300/70 bg-amber-50 px-4 py-3 text-[0.92rem] leading-6 text-amber-900">
                      {deliveryLocationError}
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="delivery_note">Ghi chú thêm</Label>
                    <Textarea
                      id="delivery_note"
                      rows={3}
                      value={formData.delivery_note}
                      onChange={(event) => setFormData((current) => ({ ...current, delivery_note: event.target.value }))}
                    />
                  </div>
                </div>

                <DeliveryLocationMap
                  lat={deliveryLat}
                  lng={deliveryLng}
                  isAddressSyncing={isAddressSyncing}
                  isQuoteLoading={isQuoteLoading}
                  isLocating={isLocatingOnMap}
                  onPickCoordinates={(lat, lng) => {
                    void handleMapLocationPick(lat, lng);
                  }}
                  onLocateMe={handleUseCurrentLocation}
                />
              </div>

              {deliveryQuote ? (
                <div className="rounded-[1.2rem] border border-primary/20 bg-primary/5 p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="info-label">Giao đến địa chỉ</p>
                      <p className="mt-1 font-medium">{deliveryQuote.resolved_address}</p>
                    </div>
                    <div>
                      <p className="info-label">Phụ thu do hàng cồng kềnh</p>
                      <p className="mt-1 font-medium">
                        {formatCurrency(deliveryQuote.bulky_surcharge)} - mức cồng kềnh {deliveryQuote.bulky_points}
                      </p>
                    </div>
                    <div>
                      <p className="info-label">Quãng đường và thời gian giao</p>
                      <p className="mt-1 font-medium">
                        {deliveryQuote.distance_km.toFixed(2)} km - khoảng {deliveryQuote.estimated_delivery_days} ngày
                      </p>
                    </div>
                    <div>
                      <p className="info-label">Vị trí giao hàng</p>
                      <p className="mt-1 font-medium">{deliveryQuote.branch_name}</p>
                      <p className="text-[0.92rem] leading-6 text-muted-foreground">{deliveryQuote.branch_address}</p>
                    </div>
                  </div>
                  {deliveryQuote.note ? (
                    <div className="mt-3 rounded-[1rem] border border-amber-300/70 bg-amber-50 px-4 py-3 text-[0.92rem] leading-6 text-amber-900">
                      {deliveryQuote.note}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-[1rem] border border-border/70 bg-secondary/15 px-4 py-3 text-[0.94rem] leading-6 text-muted-foreground">
                {isSyncing
                  ? "Giỏ hàng đang được đối chiếu với tồn kho mới nhất trước khi tạo đơn."
                  : "Hệ thống sẽ kiểm tra lại tồn kho một lần nữa ngay trước khi tạo đơn để tránh lệch số lượng."}
              </div>

              <FieldError>{errors.delivery_quote}</FieldError>
              <FormAlert tone="error">{submitError}</FormAlert>
            </form>
          </section>

          <section className="section-shell p-6 md:p-7">
            <div className="space-y-1">
              <p className="panel-subtitle">2. Phương thức thanh toán</p>
              <p className="section-copy">Preview thanh toán sẽ cập nhật theo tổng tiền đã gồm phí ship.</p>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const isActive = formData.payment_method === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "grid gap-3 rounded-[1.25rem] border p-4 text-left transition",
                      isActive ? "border-primary/35 bg-primary/5" : "border-border/70 bg-background hover:border-primary/20",
                    )}
                    onClick={() => {
                      setFormData((current) => ({ ...current, payment_method: option.value }));
                      setErrors((current) => ({ ...current, payment_method: undefined }));
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={cn(
                          "h-4.5 w-4.5 rounded-full border",
                          isActive ? "border-primary bg-primary ring-4 ring-primary/15" : "border-border bg-white",
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-semibold">{option.title}</p>
                      <p className="text-[0.88rem] leading-6 text-muted-foreground">{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError>{errors.payment_method}</FieldError>

            <div className={cn("mt-5 rounded-[1.35rem] border border-border/70 bg-secondary/15 p-5", isPreviewLoading && "opacity-70")}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                  <p className="info-label">Phương thức</p>
                  <p className="mt-1 font-medium">{paymentPreview?.payment_label || paymentLabels[formData.payment_method]}</p>
                </div>
                <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                  <p className="info-label">Tổng cần thanh toán</p>
                  <p className="mt-1 font-medium">{paymentPreview?.amount_text || formatCurrency(previewAmount)}</p>
                </div>
                <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                  <p className="info-label">Nội dung đối soát</p>
                  <p className="mt-1 font-medium">{paymentPreview?.transfer_note || previewReference}</p>
                </div>
                <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                  <p className="info-label">Tài khoản / ví nhận</p>
                  <p className="mt-1 font-medium">
                    {formData.payment_method === "tien_mat" ? "Thu tiền khi giao" : paymentPreview?.account_number || "Đang cập nhật"}
                  </p>
                </div>
              </div>

              {paymentPreview?.show_qr ? (
                <div className="mt-4 rounded-[1rem] border border-border/70 bg-white p-4 text-center">
                  <img
                    src={resolveAssetUrl(paymentPreview.qr_image)}
                    alt={`Mã QR ${paymentPreview.payment_label}`}
                    className="mx-auto h-auto max-w-[18rem] object-contain"
                  />
                </div>
              ) : null}
            </div>
          </section>

          <section className="section-shell p-6 md:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="panel-subtitle">3. Sản phẩm đang thanh toán</p>
                <p className="section-copy">Danh sách này bám đúng giỏ hàng hiện tại sau khi đồng bộ tồn kho.</p>
              </div>
              <span className="rounded-full bg-secondary/35 px-3 py-1 text-[0.92rem] text-muted-foreground">{cartCount} món</span>
            </div>

            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item.item_id} className="flex items-start justify-between gap-4 rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-[0.9rem] text-muted-foreground">Số lượng: {item.quantity}</p>
                  </div>
                  <p className="shrink-0 font-semibold text-primary">{formatCurrency(item.line_total)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
          <Card className="rounded-[1.7rem] border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div>
                <p className="section-kicker">Tóm tắt thanh toán</p>
                <h2 className="text-[1.45rem] font-semibold">Kiểm tra tổng tiền cuối cùng</h2>
              </div>

              <div className="space-y-3 rounded-[1.3rem] bg-secondary/20 p-4">
                <div className="flex items-center justify-between">
                  <span>Tạm tính</span>
                  <span className="font-semibold">{formatCurrency(deliveryQuote?.subtotal_amount ?? cartTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Phí giao hàng</span>
                  <span className={cn("font-semibold", deliveryQuote ? "text-foreground" : "text-destructive")}>
                    {deliveryQuote ? formatCurrency(deliveryQuote.shipping_fee) : "Chưa tính"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/70 pt-3 text-[1rem]">
                  <span className="font-medium">Tổng thanh toán</span>
                  <span className="text-[1.45rem] font-semibold text-primary">
                    {formatCurrency(deliveryQuote?.grand_total ?? cartTotal)}
                  </span>
                </div>
              </div>

              <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-4 text-[0.92rem] leading-6 text-muted-foreground">
                Phí ship nội thất được tính từ phí xử lý cơ bản, quãng đường giao và mức độ cồng kềnh của đơn.
              </div>

              <div className="grid gap-3">
                <Button form="checkout-form" type="submit" size="lg" className="w-full" disabled={isSubmitting || lineCount === 0 || isQuoteLoading}>
                  {isSubmitting ? "Đang tạo đơn hàng..." : "Xác nhận đặt hàng"}
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/gio-hang">Quay lại giỏ hàng</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </div>
  );
};

export default Checkout;
