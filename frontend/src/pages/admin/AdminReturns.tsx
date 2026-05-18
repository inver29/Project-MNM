import { useEffect, useMemo, useState } from "react";
import { Eye, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, resolveAssetUrl } from "@/lib/api";
import {
  formatDateTime,
  orderStatusLabels,
  orderStatusToneClasses,
  returnStatusLabels,
  returnStatusToneClasses,
} from "@/lib/admin";
import { ReturnRequest, ReturnRequestStatus } from "@/types/domain";
import { toast } from "sonner";
import {
  adminStickyActionCellClassName,
  adminStickyActionHeaderClassName,
  AdminDataSurface,
  AdminEmptyState,
  AdminHero,
  AdminMetricCard,
  AdminMetricsGrid,
  AdminPage,
  AdminSection,
  AdminToolbar,
  AdminToolbarInfo,
} from "@/components/admin/AdminPageParts";

const AdminReturns = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<ReturnRequestStatus | "all">("all");
  const [keyword, setKeyword] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<ReturnRequest | null>(null);
  const [draftStatus, setDraftStatus] = useState<ReturnRequestStatus>("dang_xu_ly");
  const [adminNote, setAdminNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<ReturnRequest[]>("/return-requests", { token })
      .then((data) => setRequests(data))
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được yêu cầu trả hàng / hoàn tiền.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }
    setDraftStatus(selectedRequest.status);
    setAdminNote(selectedRequest.admin_note || "");
  }, [selectedRequest]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = selectedStatus === "all" || request.status === selectedStatus;
      const normalizedKeyword = keyword.trim().toLowerCase();
      const matchesKeyword =
        !normalizedKeyword ||
        request.order_code.toLowerCase().includes(normalizedKeyword) ||
        request.reason_text.toLowerCase().includes(normalizedKeyword) ||
        (request.account_display_name || "").toLowerCase().includes(normalizedKeyword);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, requests, selectedStatus]);

  const metrics = useMemo(
    () => ({
      total: requests.length,
      processing: requests.filter((request) => request.status === "dang_xu_ly").length,
      approved: requests.filter((request) => request.status === "chap_nhan").length,
      rejected: requests.filter((request) => request.status === "tu_choi").length,
    }),
    [requests],
  );

  async function handleSaveRequest() {
    if (!token || !selectedRequest) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await apiRequest<ReturnRequest>(`/return-requests/${selectedRequest.return_request_id}`, {
        method: "PATCH",
        token,
        body: {
          status: draftStatus,
          admin_note: adminNote.trim() || null,
        },
      });
      setRequests((current) =>
        current.map((request) =>
          request.return_request_id === updated.return_request_id ? updated : request,
        ),
      );
      setSelectedRequest(updated);
      toast.success("Đã cập nhật yêu cầu trả hàng / hoàn tiền.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không cập nhật được yêu cầu.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Hậu mãi"
        title="Quản lý yêu cầu trả hàng / hoàn tiền theo cùng luồng đơn hàng thay vì xử lý rời rạc."
        description="Mỗi yêu cầu giữ đầy đủ thông tin đơn gốc, lý do khách gửi, ảnh chứng minh và trạng thái xử lý để tránh sai lệch tồn kho và trạng thái đơn hàng."
      />

      <AdminMetricsGrid>
        <AdminMetricCard label="Tổng yêu cầu" value={metrics.total} />
        <AdminMetricCard label="Đang xử lý" value={metrics.processing} tone="warning" />
        <AdminMetricCard label="Chấp nhận" value={metrics.approved} tone="success" />
        <AdminMetricCard label="Từ chối" value={metrics.rejected} tone="info" />
      </AdminMetricsGrid>

      <AdminToolbar>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_140px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo mã đơn, khách hàng hoặc lý do"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ReturnRequestStatus | "all")}>
            <SelectTrigger>
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {Object.entries(returnStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AdminToolbarInfo>Hiển thị {filteredRequests.length} yêu cầu</AdminToolbarInfo>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Danh sách yêu cầu"
        description="Tập trung vào mã đơn, khách hàng, trạng thái và thời gian gửi; chi tiết xử lý được gom vào cửa sổ riêng để màn hình chính không bị rối."
      >
        {isLoading ? (
          <p className="text-base text-muted-foreground">Đang tải danh sách yêu cầu...</p>
        ) : filteredRequests.length === 0 ? (
          <AdminEmptyState>Chưa có yêu cầu nào khớp với bộ lọc hiện tại.</AdminEmptyState>
        ) : (
          <AdminDataSurface>
            <Table className="min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Trạng thái đơn</TableHead>
                  <TableHead>Yêu cầu hoàn tiền</TableHead>
                  <TableHead>Ngày gửi</TableHead>
                  <TableHead className={`${adminStickyActionHeaderClassName} w-[6.5rem]`}>Tác vụ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => (
                  <TableRow key={request.return_request_id} className="group">
                    <TableCell className="font-medium">{request.order_code}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{request.account_display_name || `Tài khoản #${request.account_id}`}</p>
                        <p className="text-[0.92rem] leading-6 text-muted-foreground">
                          {request.account_email_address || "Không có email"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${orderStatusToneClasses[request.order_status]}`}>
                        {orderStatusLabels[request.order_status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${returnStatusToneClasses[request.status]}`}>
                        {returnStatusLabels[request.status]}
                      </span>
                    </TableCell>
                    <TableCell>{formatDateTime(request.created_at)}</TableCell>
                    <TableCell className={adminStickyActionCellClassName}>
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedRequest(request)}
                          title={`Xem yêu cầu ${request.order_code}`}
                          aria-label={`Xem yêu cầu ${request.order_code}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminDataSurface>
        )}
      </AdminSection>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="top-[calc(50%+1rem)] max-h-[calc(100vh-11rem)] max-w-[56rem] overflow-hidden rounded-[1.5rem] px-4 py-5 sm:px-5">
          <DialogHeader className="w-full pr-10">
            <DialogTitle>Chi tiết yêu cầu trả hàng / hoàn tiền</DialogTitle>
            <DialogDescription>
              Đối chiếu thông tin đơn gốc, lý do khách gửi và cập nhật trạng thái xử lý tại cùng một nơi.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest ? (
            <div className="grid max-h-[calc(100vh-18rem)] gap-4 overflow-y-auto pr-1 xl:grid-cols-[minmax(0,1.25fr)_320px]">
              <div className="space-y-4">
                <div className="grid gap-4 rounded-[1.35rem] bg-secondary/25 p-4 md:grid-cols-2">
                  <div>
                    <Label>Mã đơn</Label>
                    <p className="mt-1 font-medium">{selectedRequest.order_code}</p>
                  </div>
                  <div>
                    <Label>Trạng thái đơn</Label>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[0.88rem] font-semibold ${orderStatusToneClasses[selectedRequest.order_status]}`}>
                        {orderStatusLabels[selectedRequest.order_status]}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Khách hàng</Label>
                    <p className="mt-1 font-medium">{selectedRequest.account_display_name}</p>
                    <p className="text-[0.94rem] leading-6 text-muted-foreground">
                      {selectedRequest.account_email_address || "Không có email"}
                    </p>
                  </div>
                  <div>
                    <Label>Liên hệ hoàn tiền</Label>
                    <p className="mt-1 font-medium">{selectedRequest.contact_phone || "Không có số điện thoại"}</p>
                    <p className="text-[0.94rem] leading-6 text-muted-foreground">
                      {selectedRequest.contact_email || "Không có email liên hệ"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
                  <h3 className="text-lg font-semibold">Lý do khách gửi</h3>
                  <p className="text-[0.98rem] leading-7 text-muted-foreground">{selectedRequest.reason_text}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <Label>Tài khoản ngân hàng</Label>
                      <p className="mt-1 font-medium">{selectedRequest.bank_account_number || "Không cung cấp"}</p>
                    </div>
                    <div>
                      <Label>Tài khoản MoMo</Label>
                      <p className="mt-1 font-medium">{selectedRequest.momo_account_number || "Không cung cấp"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
                  <h3 className="text-lg font-semibold">Hình ảnh khách gửi</h3>
                  {selectedRequest.bill_image_url ? (
                    <a
                      href={resolveAssetUrl(selectedRequest.bill_image_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[1.2rem] border border-border/70"
                    >
                      <img
                        className="max-h-72 w-full object-cover"
                        src={resolveAssetUrl(selectedRequest.bill_image_url)}
                        alt={`Hóa đơn ${selectedRequest.order_code}`}
                      />
                    </a>
                  ) : null}
                  {selectedRequest.evidences.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {selectedRequest.evidences.map((evidence) => (
                        <a
                          key={evidence.evidence_id}
                          href={resolveAssetUrl(evidence.image_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="overflow-hidden rounded-[1rem] border border-border/70"
                        >
                          <img
                            className="h-36 w-full object-cover"
                            src={resolveAssetUrl(evidence.image_url)}
                            alt={`Bằng chứng ${evidence.evidence_id}`}
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[0.95rem] leading-6 text-muted-foreground">Khách hàng chưa gửi thêm ảnh chứng minh.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.35rem] border border-border/70 bg-background/80 p-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">Cập nhật xử lý</h3>
                    <p className="text-[0.95rem] leading-6 text-muted-foreground">
                      Khi chấp nhận hoàn tiền, hệ thống sẽ đồng bộ lại trạng thái đơn và tồn kho theo luồng hậu mãi.
                    </p>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Trạng thái</Label>
                      <Select value={draftStatus} onValueChange={(value) => setDraftStatus(value as ReturnRequestStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(returnStatusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ghi chú nội bộ</Label>
                      <Textarea
                        rows={6}
                        placeholder="Ghi chú xử lý, phản hồi hoặc lý do từ chối."
                        value={adminNote}
                        onChange={(event) => setAdminNote(event.target.value)}
                      />
                    </div>

                    <Button className="w-full" onClick={() => void handleSaveRequest()} disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu cập nhật
                    </Button>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
                  <div className="space-y-2 text-[0.95rem] leading-7 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Ngày gửi:</span> {formatDateTime(selectedRequest.created_at)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Cập nhật gần nhất:</span> {formatDateTime(selectedRequest.updated_at)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Người xử lý:</span> {selectedRequest.processed_by_display_name || "Chưa có"}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Ngày xử lý:</span>{" "}
                      {selectedRequest.processed_at ? formatDateTime(selectedRequest.processed_at) : "Chưa xử lý"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminReturns;
