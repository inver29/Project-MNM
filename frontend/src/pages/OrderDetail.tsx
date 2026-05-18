import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Receipt, Star } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageIntro, PageNote } from "@/components/PageParts";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, resolveAssetUrl, uploadFile } from "@/lib/api";
import {
  canCustomerCancelOrder,
  canCustomerConfirmReceived,
  canCustomerRequestReturn,
  formatDateTime,
  getPaymentStatusLabel,
  orderStatusLabels,
  orderStatusToneClasses,
  paymentLabels,
  paymentStatusToneClasses,
  returnStatusLabels,
  returnStatusToneClasses,
} from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { ReturnRequest, SalesOrder } from "@/types/domain";
import { toast } from "sonner";

type ReturnFormState = {
  reason_text: string;
  contact_email: string;
  contact_phone: string;
  bank_account_number: string;
  momo_account_number: string;
};

const EMPTY_RETURN_FORM: ReturnFormState = {
  reason_text: "",
  contact_email: "",
  contact_phone: "",
  bank_account_number: "",
  momo_account_number: "",
};

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { token, user, isReady, isAuthenticated } = useAuth();
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<"cancel" | "confirm" | null>(null);
  const [isReturnLoading, setIsReturnLoading] = useState(false);
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [currentReturnRequest, setCurrentReturnRequest] = useState<ReturnRequest | null>(null);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnForm, setReturnForm] = useState<ReturnFormState>(EMPTY_RETURN_FORM);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [billPreviewUrl, setBillPreviewUrl] = useState<string | null>(null);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState<string[]>([]);
  const [existingBillUrl, setExistingBillUrl] = useState<string | null>(null);
  const [existingEvidenceUrls, setExistingEvidenceUrls] = useState<string[]>([]);

  const parsedOrderId = Number.parseInt(orderId || "", 10);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!isAuthenticated || !token || !Number.isFinite(parsedOrderId)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiRequest<SalesOrder>(`/orders/${parsedOrderId}`, { token })
      .then(setOrder)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được chi tiết đơn hàng.");
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, isReady, parsedOrderId, token]);

  const totalQuantity = useMemo(() => {
    return order?.lines.reduce((sum, line) => sum + line.ordered_qty, 0) ?? 0;
  }, [order]);

  useEffect(() => {
    if (!billFile) {
      setBillPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(billFile);
    setBillPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [billFile]);

  useEffect(() => {
    if (evidenceFiles.length === 0) {
      setEvidencePreviewUrls([]);
      return;
    }

    const objectUrls = evidenceFiles.map((file) => URL.createObjectURL(file));
    setEvidencePreviewUrls(objectUrls);

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [evidenceFiles]);

  function resetReturnDialog() {
    setCurrentReturnRequest(null);
    setReturnForm(EMPTY_RETURN_FORM);
    setBillFile(null);
    setEvidenceFiles([]);
    setExistingBillUrl(null);
    setExistingEvidenceUrls([]);
    setIsReturnLoading(false);
    setIsReturnSubmitting(false);
    setReturnDialogOpen(false);
  }

  async function openReturnDialog() {
    if (!token || !order) {
      return;
    }
    setReturnDialogOpen(true);
    setReturnForm({
      ...EMPTY_RETURN_FORM,
      contact_email: user?.email_address || "",
      contact_phone: user?.mobile_phone || "",
    });
    setBillFile(null);
    setEvidenceFiles([]);
    setCurrentReturnRequest(null);
    setExistingBillUrl(null);
    setExistingEvidenceUrls([]);

    if (!order.return_request) {
      return;
    }

    setIsReturnLoading(true);
    try {
      const request = await apiRequest<ReturnRequest>(`/return-requests/${order.return_request.return_request_id}`, {
        token,
      });
      setCurrentReturnRequest(request);
      setExistingBillUrl(request.bill_image_url || null);
      setExistingEvidenceUrls(request.evidences.map((evidence) => evidence.image_url));
      setReturnForm({
        reason_text: request.reason_text,
        contact_email: request.contact_email || user?.email_address || "",
        contact_phone: request.contact_phone || user?.mobile_phone || "",
        bank_account_number: request.bank_account_number || "",
        momo_account_number: request.momo_account_number || "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được yêu cầu hoàn tiền.");
    } finally {
      setIsReturnLoading(false);
    }
  }

  async function handleOrderAction(
    action: "cancel" | "confirm-received",
    successMessage: string,
  ) {
    if (!token || !order) {
      return;
    }

    setPendingAction(action === "cancel" ? "cancel" : "confirm");
    try {
      const updated = await apiRequest<SalesOrder>(`/orders/${order.sales_order_id}/${action}`, {
        method: "POST",
        token,
      });
      setOrder(updated);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReturnSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !order) {
      return;
    }
    if (returnForm.reason_text.trim().length < 10) {
      toast.error("Lý do trả hàng / hoàn tiền cần ít nhất 10 ký tự.");
      return;
    }
    if (!billFile && !existingBillUrl) {
      toast.error("Vui lòng tải lên ảnh hóa đơn.");
      return;
    }

    setIsReturnSubmitting(true);
    try {
      let billImageUrl = existingBillUrl;
      if (billFile) {
        const uploadedBill = await uploadFile<{ file_name: string; file_url: string }>(
          "/uploads/supporting-image",
          billFile,
          { token },
        );
        billImageUrl = uploadedBill.file_url;
      }

      const uploadedEvidenceUrls = [...existingEvidenceUrls];
      for (const file of evidenceFiles) {
        const uploadedEvidence = await uploadFile<{ file_name: string; file_url: string }>(
          "/uploads/supporting-image",
          file,
          { token },
        );
        uploadedEvidenceUrls.push(uploadedEvidence.file_url);
      }

      const updatedRequest = await apiRequest<ReturnRequest>(`/orders/${order.sales_order_id}/return-request`, {
        method: "POST",
        token,
        body: {
          ...returnForm,
          bill_image_url: billImageUrl,
          contact_email: returnForm.contact_email.trim() || null,
          contact_phone: returnForm.contact_phone.trim() || null,
          bank_account_number: returnForm.bank_account_number.trim() || null,
          momo_account_number: returnForm.momo_account_number.trim() || null,
          evidence_image_urls: uploadedEvidenceUrls,
        },
      });

      setCurrentReturnRequest(updatedRequest);
      setExistingBillUrl(updatedRequest.bill_image_url || null);
      setExistingEvidenceUrls(updatedRequest.evidences.map((evidence) => evidence.image_url));
      setBillFile(null);
      setEvidenceFiles([]);
      setOrder((current) =>
        current
          ? {
              ...current,
              return_request: {
                return_request_id: updatedRequest.return_request_id,
                status: updatedRequest.status,
                created_at: updatedRequest.created_at,
                processed_at: updatedRequest.processed_at,
              },
            }
          : current,
      );
      toast.success("Đã lưu yêu cầu trả hàng / hoàn tiền.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu yêu cầu hoàn tiền.");
    } finally {
      setIsReturnSubmitting(false);
    }
  }

  if (!isReady || isLoading) {
    return <div className="page-shell py-12">Đang tải chi tiết đơn hàng...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="page-shell">
        <Button onClick={() => navigate("/dang-nhap", { state: { from: `/don-hang/${orderId}` } })}>
          Đăng nhập để xem đơn hàng
        </Button>
      </div>
    );
  }

  if (!order) {
    return <div className="page-shell py-12 text-center">Không tìm thấy đơn hàng.</div>;
  }

  return (
    <div className="page-shell page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" asChild>
          <Link to="/don-hang">
            <ArrowLeft className="h-4 w-4" />
            Quay lại lịch sử đơn hàng
          </Link>
        </Button>
        <Button asChild>
          <Link to={`/don-hang/${order.sales_order_id}/hoa-don`}>
            <Receipt className="h-4 w-4" />
            Xem hóa đơn
          </Link>
        </Button>
      </div>

      <PageIntro
        eyebrow="Chi tiết lịch sử đơn hàng"
        title={order.order_code}
        description={`Đặt lúc ${formatDateTime(order.placed_at)}. Theo dõi xử lý đơn, hóa đơn, đánh giá sản phẩm và yêu cầu hậu mãi ngay trên cùng luồng.`}
      />

      <section className="section-shell p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Mã hóa đơn</p>
            <p className="mt-1 font-semibold">{order.invoice_code}</p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Thanh toán</p>
            <p className="mt-1 font-semibold">{paymentLabels[order.payment_method]}</p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Dự kiến giao</p>
            <p className="mt-1 font-semibold">
              {order.estimated_delivery_at ? formatDateTime(order.estimated_delivery_at) : "Đang cập nhật"}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Trạng thái thanh toán</p>
            <p className="mt-1 font-semibold">{getPaymentStatusLabel(order)}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <PageNote title="Thông tin người nhận">
            <p>
              <span className="font-medium text-foreground">{order.consignee_name}</span> - {order.consignee_phone}
            </p>
            <p>{order.delivery_line}</p>
            <p>{order.delivery_note || "Không có ghi chú giao hàng."}</p>
          </PageNote>

          <PageNote title="Trạng thái xử lý">
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${orderStatusToneClasses[order.order_status]}`}
              >
                {orderStatusLabels[order.order_status]}
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${paymentStatusToneClasses[order.payment_status]}`}
              >
                {getPaymentStatusLabel(order)}
              </span>
              {order.return_request ? (
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[0.84rem] font-semibold ${returnStatusToneClasses[order.return_request.status]}`}
                >
                  {returnStatusLabels[order.return_request.status]}
                </span>
              ) : null}
            </div>
            <p>Nội dung thanh toán: {order.payment_reference}</p>
            <p>Tổng số lượng: {totalQuantity} món</p>
          </PageNote>
        </div>
      </section>

      <section className="section-shell p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="panel-subtitle">Sản phẩm trong đơn</p>
            <p className="section-copy">Khi đơn đã hoàn thành, bạn có thể mở nhanh đúng sản phẩm để đánh giá.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {order.lines.map((line) => (
            <div
              key={line.order_line_id}
              className="grid gap-3 rounded-[1.25rem] border border-border/70 bg-background/80 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_110px_110px_160px]"
            >
              <div className="space-y-1">
                <p className="font-semibold">{line.item_title_snapshot}</p>
                <p className="text-[0.94rem] leading-6 text-muted-foreground">
                  Mã dòng hàng #{line.order_line_id}
                </p>
              </div>
              <div>
                <p className="info-label">Đơn giá</p>
                <p className="mt-1 font-medium">{formatCurrency(line.unit_price_snapshot)}</p>
              </div>
              <div>
                <p className="info-label">Số lượng</p>
                <p className="mt-1 font-medium">{line.ordered_qty}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 lg:justify-end">
                <p className="font-semibold text-primary">{formatCurrency(line.line_total)}</p>
                {order.order_status === "hoan_thanh" ? (
                  <Button asChild variant="outline">
                    <Link to={`/san-pham/${line.item_slug_token}?reviewFromOrder=${order.sales_order_id}#danh-gia`}>
                      <Star className="h-4 w-4" />
                      Đánh giá sản phẩm
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    Chờ hoàn tất đơn hàng
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell p-5 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))]">
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Tạm tính sau hệ thống</p>
            <p className="mt-1 font-semibold">{formatCurrency(order.subtotal_amount)}</p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Phí giao hàng</p>
            <p className="mt-1 font-semibold">
              {order.shipping_fee > 0 ? formatCurrency(order.shipping_fee) : "Chưa tính"}
            </p>
          </div>
          <div className="rounded-[1rem] border border-border/70 bg-background/75 px-4 py-3">
            <p className="info-label">Tổng thanh toán</p>
            <p className="mt-1 text-[1.15rem] font-semibold text-primary">{formatCurrency(order.grand_total)}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {canCustomerCancelOrder(order) ? (
            <Button
              variant="outline"
              disabled={pendingAction === "cancel"}
              onClick={() =>
                void handleOrderAction("cancel", "Đơn hàng đã được hủy và tồn kho đã được hoàn lại.")
              }
            >
              {pendingAction === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Hủy đơn hàng
            </Button>
          ) : null}

          {canCustomerConfirmReceived(order) ? (
            <Button
              variant="outline"
              disabled={pendingAction === "confirm"}
              onClick={() =>
                void handleOrderAction("confirm-received", "Đơn hàng đã được xác nhận hoàn thành.")
              }
            >
              {pendingAction === "confirm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Tôi đã nhận đủ hàng
            </Button>
          ) : null}

          {canCustomerRequestReturn(order) ? (
            <Button onClick={() => void openReturnDialog()}>
              {order.return_request ? "Xem yêu cầu trả hàng / hoàn tiền" : "Gửi yêu cầu trả hàng / hoàn tiền"}
            </Button>
          ) : (
            <Button disabled>Chỉ mở sau khi đơn hoàn thành</Button>
          )}
        </div>
      </section>

      <Dialog open={returnDialogOpen} onOpenChange={(open) => !open && resetReturnDialog()}>
        <DialogContent className="top-[calc(50%+1rem)] max-h-[calc(100vh-11rem)] max-w-[46rem] overflow-hidden rounded-[1.5rem] px-4 py-5 sm:px-5">
          <DialogHeader className="w-full pr-10">
            <DialogTitle>Yêu cầu trả hàng / hoàn tiền</DialogTitle>
            <DialogDescription>
              Gửi đầy đủ lý do, thông tin nhận hoàn tiền và ảnh chứng minh để bộ phận hỗ trợ xử lý nhanh hơn.
            </DialogDescription>
          </DialogHeader>
          {isReturnLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải thông tin yêu cầu...
            </div>
          ) : (
            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
              {currentReturnRequest && currentReturnRequest.status !== "dang_xu_ly" ? (
                <div className="mb-4 rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${returnStatusToneClasses[currentReturnRequest.status]}`}
                    >
                      {returnStatusLabels[currentReturnRequest.status]}
                    </span>
                    <p className="text-[0.95rem] leading-6 text-muted-foreground">
                      Yêu cầu này đã được xử lý. Bạn có thể xem lại thông tin đã gửi.
                    </p>
                  </div>
                  {currentReturnRequest.admin_note ? (
                    <p className="mt-3 text-[0.96rem] leading-7 text-muted-foreground">
                      <span className="font-medium text-foreground">Ghi chú xử lý:</span>{" "}
                      {currentReturnRequest.admin_note}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <form className="space-y-4" onSubmit={(event) => void handleReturnSubmit(event)}>
                <div className="grid gap-4 rounded-[1.35rem] bg-secondary/25 p-4 md:grid-cols-2">
                  <div>
                    <Label>Mã đơn</Label>
                    <p className="mt-1 font-medium">{order.order_code}</p>
                  </div>
                  <div>
                    <Label>Tổng thanh toán</Label>
                    <p className="mt-1 font-medium text-primary">{formatCurrency(order.grand_total)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email liên hệ</Label>
                    <Input
                      value={returnForm.contact_email}
                      onChange={(event) =>
                        setReturnForm((current) => ({ ...current, contact_email: event.target.value }))
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Số điện thoại liên hệ</Label>
                    <Input
                      value={returnForm.contact_phone}
                      onChange={(event) =>
                        setReturnForm((current) => ({ ...current, contact_phone: event.target.value }))
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tài khoản ngân hàng</Label>
                    <Input
                      value={returnForm.bank_account_number}
                      onChange={(event) =>
                        setReturnForm((current) => ({ ...current, bank_account_number: event.target.value }))
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tài khoản MoMo</Label>
                    <Input
                      value={returnForm.momo_account_number}
                      onChange={(event) =>
                        setReturnForm((current) => ({ ...current, momo_account_number: event.target.value }))
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Lý do trả hàng / hoàn tiền</Label>
                  <Textarea
                    rows={6}
                    value={returnForm.reason_text}
                    onChange={(event) =>
                      setReturnForm((current) => ({ ...current, reason_text: event.target.value }))
                    }
                    disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Ảnh hóa đơn</Label>
                    <FilePicker
                      accept="image/*"
                      fileName={billFile?.name}
                      buttonLabel="Chọn ảnh"
                      placeholder={existingBillUrl ? "Đang giữ ảnh hóa đơn hiện tại" : "Chưa chọn ảnh"}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setBillFile(event.target.files?.[0] || null)
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                    {billPreviewUrl ? (
                      <div className="space-y-2">
                        <p className="text-[0.9rem] font-medium text-foreground">Ảnh mới sẽ được gửi</p>
                        <div className="overflow-hidden rounded-[1rem] border border-border/70">
                          <img className="h-36 w-full object-cover" src={billPreviewUrl} alt="Ảnh hóa đơn mới" />
                        </div>
                      </div>
                    ) : null}
                    {existingBillUrl ? (
                      <div className="space-y-2">
                        <p className="text-[0.9rem] font-medium text-muted-foreground">
                          Ảnh hóa đơn hiện đang lưu
                        </p>
                        <a
                          className="block overflow-hidden rounded-[1rem] border border-border/70"
                          href={resolveAssetUrl(existingBillUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="h-36 w-full object-cover"
                            src={resolveAssetUrl(existingBillUrl)}
                            alt="Hóa đơn"
                          />
                        </a>
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Ảnh chứng minh bổ sung</Label>
                    <FilePicker
                      accept="image/*"
                      multiple
                      fileName={evidenceFiles.length ? `${evidenceFiles.length} ảnh mới được chọn` : undefined}
                      buttonLabel="Chọn ảnh"
                      placeholder="Có thể chọn nhiều ảnh"
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        setEvidenceFiles(Array.from(event.target.files || []))
                      }
                      disabled={currentReturnRequest?.status !== undefined && currentReturnRequest.status !== "dang_xu_ly"}
                    />
                    {evidencePreviewUrls.length ? (
                      <div className="space-y-2">
                        <p className="text-[0.9rem] font-medium text-foreground">Ảnh mới sẽ được gửi</p>
                        <div className="grid grid-cols-2 gap-2">
                          {evidencePreviewUrls.map((previewUrl, index) => (
                            <div
                              key={`${previewUrl}-${index}`}
                              className="overflow-hidden rounded-[1rem] border border-border/70"
                            >
                              <img
                                className="h-24 w-full object-cover"
                                src={previewUrl}
                                alt={`Ảnh chứng minh mới ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {existingEvidenceUrls.length ? (
                      <div className="space-y-2">
                        <p className="text-[0.9rem] font-medium text-muted-foreground">
                          Ảnh chứng minh hiện đang lưu
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {existingEvidenceUrls.map((imageUrl) => (
                            <a
                              key={imageUrl}
                              className="overflow-hidden rounded-[1rem] border border-border/70"
                              href={resolveAssetUrl(imageUrl)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                className="h-24 w-full object-cover"
                                src={resolveAssetUrl(imageUrl)}
                                alt="Ảnh chứng minh"
                              />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {!currentReturnRequest || currentReturnRequest.status === "dang_xu_ly" ? (
                  <Button type="submit" disabled={isReturnSubmitting}>
                    {isReturnSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {currentReturnRequest ? "Cập nhật yêu cầu" : "Gửi yêu cầu xử lý"}
                  </Button>
                ) : null}
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
