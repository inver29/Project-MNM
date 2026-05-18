import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, RefreshCcw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePicker } from "@/components/ui/file-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDateTime } from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { PurchaseImportBatch } from "@/types/domain";
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
} from "@/components/admin/AdminPageParts";

const AdminImports = () => {
  const { token } = useAuth();
  const [batches, setBatches] = useState<PurchaseImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<PurchaseImportBatch | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [invoiceCode, setInvoiceCode] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadBatches = useCallback(async (showToast = false) => {
    if (!token) {
      return;
    }
    try {
      const data = await apiRequest<PurchaseImportBatch[]>("/inventory/imports", { token });
      setBatches(data);
      if (showToast) {
        toast.success("Đã làm mới danh sách phiếu nhập.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không tải được danh sách phiếu nhập.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  const metrics = useMemo(
    () => ({
      totalBatches: batches.length,
      totalImportedQty: batches.reduce((sum, batch) => sum + batch.total_import_qty, 0),
      totalImportedAmount: batches.reduce((sum, batch) => sum + batch.total_import_amount, 0),
    }),
    [batches],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !file) {
      toast.error("Vui lòng chọn file Excel để nhập hàng.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (invoiceCode.trim()) {
      formData.append("invoice_code", invoiceCode.trim());
    }
    if (note.trim()) {
      formData.append("note", note.trim());
    }

    setIsSubmitting(true);
    try {
      const createdBatch = await apiRequest<PurchaseImportBatch>("/inventory/imports/excel", {
        method: "POST",
        token,
        body: formData,
      });
      setBatches((current) => [createdBatch, ...current]);
      setSelectedBatch(createdBatch);
      setFile(null);
      setInvoiceCode("");
      setNote("");
      toast.success("Đã nhập hàng bằng Excel và cập nhật tồn kho.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không nhập được file Excel.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(batch: PurchaseImportBatch) {
    if (!token) {
      return;
    }
    try {
      await apiRequest(`/inventory/imports/${batch.batch_id}`, {
        method: "DELETE",
        token,
      });
      setBatches((current) => current.filter((entry) => entry.batch_id !== batch.batch_id));
      if (selectedBatch?.batch_id === batch.batch_id) {
        setSelectedBatch(null);
      }
      toast.success("Đã xóa phiếu nhập hàng và hoàn tác tồn kho tương ứng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được phiếu nhập.");
    }
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Nhập hàng"
        title="Đưa luồng nhập hàng vào Excel nhưng vẫn giữ lịch sử kiểm soát tồn kho ngay trong hệ thống."
        description="Mỗi file nhập tạo thành một phiếu nhập riêng, lưu lại người nhập, thời điểm nhập, số lượng và giá trị nhập để truy vết tồn kho về sau."
      />

      <AdminMetricsGrid>
        <AdminMetricCard label="Phiếu nhập" value={metrics.totalBatches} />
        <AdminMetricCard label="Tổng số lượng nhập" value={metrics.totalImportedQty} tone="success" />
        <AdminMetricCard label="Giá trị nhập" value={formatCurrency(metrics.totalImportedAmount)} tone="info" />
      </AdminMetricsGrid>

      <AdminSection
        title="Nhập bằng Excel"
        description="Khối nhập được gom lại để người quản lý chỉ còn ba việc: tải mẫu, chọn file và tạo phiếu nhập."
        actions={
          <Button asChild variant="outline">
            <a href="/mau-nhap-hang-noi-that.xlsx" download>
              <Download className="mr-2 h-4 w-4" />
              Tải file mẫu
            </a>
          </Button>
        }
      >
        <form
          className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
          onSubmit={handleSubmit}
        >
          <div className="rounded-[1.4rem] border border-dashed border-primary/25 bg-primary/[0.04] p-5">
            <div className="space-y-2">
              <p className="panel-subtitle">Bước 1. Chọn file Excel</p>
              <p className="text-[0.95rem] leading-7 text-muted-foreground">
                File Excel là dữ liệu chính của phiếu nhập. Bạn có thể tải file mẫu ở nút phía trên để kiểm tra đúng
                định dạng và nhập thử với dữ liệu có dấu.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <Label>File Excel</Label>
              <FilePicker
                accept=".xlsx,.xlsm"
                fileName={file?.name}
                buttonLabel="Chọn file Excel"
                placeholder="Chưa chọn file nhập hàng"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] || null)}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                <p className="info-label">File hiện tại</p>
                <p className="mt-1 font-medium">{file?.name || "Chưa có file nào được chọn"}</p>
              </div>
              <div className="rounded-[1rem] border border-border/70 bg-background px-4 py-3">
                <p className="info-label">Loại dữ liệu</p>
                <p className="mt-1 font-medium">Nhập tồn kho từ Excel</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.3rem] border border-border/70 bg-secondary/15 p-5">
              <div className="space-y-2">
                <p className="panel-subtitle">Bước 2. Thông tin phiếu nhập</p>
                <p className="text-[0.95rem] leading-7 text-muted-foreground">
                  Hai trường dưới đây là tùy chọn. Bạn có thể để mã phiếu trống để hệ thống tự sinh.
                </p>
              </div>

              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Mã phiếu nhập</Label>
                  <Input
                    placeholder="Để trống để hệ thống tự sinh"
                    value={invoiceCode}
                    onChange={(event) => setInvoiceCode(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ghi chú</Label>
                  <Textarea
                    rows={4}
                    placeholder="Ghi chú thêm cho đợt nhập hàng này"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-end justify-end">
              <Button className="min-w-[12rem]" type="submit" disabled={isSubmitting}>
                <Upload className="mr-2 h-4 w-4" />
                Tạo phiếu nhập
              </Button>
            </div>
          </div>
        </form>
      </AdminSection>

      <AdminSection
        title="Danh sách phiếu nhập"
        description="Danh sách này giúp kiểm tra lại mỗi lần nhập hàng, xem nhanh tổng số lượng và mở chi tiết từng phiếu khi cần đối soát."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              setIsRefreshing(true);
              void loadBatches(true);
            }}
            disabled={isRefreshing}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>
        }
      >
          {isLoading ? (
            <p className="text-base text-muted-foreground">Đang tải danh sách phiếu nhập...</p>
          ) : batches.length === 0 ? (
            <AdminEmptyState>Chưa có phiếu nhập hàng nào trong hệ thống.</AdminEmptyState>
          ) : (
            <AdminDataSurface>
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã phiếu</TableHead>
                    <TableHead>Người nhập</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Giá trị nhập</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead className={`${adminStickyActionHeaderClassName} w-[7.5rem]`}>Tác vụ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.batch_id} className="group">
                      <TableCell className="font-medium">{batch.invoice_code}</TableCell>
                      <TableCell>{batch.imported_by_display_name || "Hệ thống"}</TableCell>
                      <TableCell>{batch.total_import_qty}</TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(batch.total_import_amount)}
                      </TableCell>
                      <TableCell>{formatDateTime(batch.created_at)}</TableCell>
                      <TableCell className={adminStickyActionCellClassName}>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setSelectedBatch(batch)}
                            title={`Xem phiếu ${batch.invoice_code}`}
                            aria-label={`Xem phiếu ${batch.invoice_code}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => void handleDelete(batch)}
                            title={`Xóa phiếu ${batch.invoice_code}`}
                            aria-label={`Xóa phiếu ${batch.invoice_code}`}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={Boolean(selectedBatch)} onOpenChange={(open) => !open && setSelectedBatch(null)}>
        <DialogContent className="top-[calc(50%+1rem)] max-h-[calc(100vh-11rem)] max-w-[52rem] overflow-hidden rounded-[1.5rem] px-4 py-5 sm:px-5">
          <DialogHeader className="w-full pr-10">
            <DialogTitle>Chi tiết phiếu nhập hàng</DialogTitle>
            <DialogDescription>Xem lại toàn bộ dòng nhập và số lượng còn lại theo từng sản phẩm trong phiếu.</DialogDescription>
          </DialogHeader>

          {selectedBatch ? (
            <div className="max-h-[calc(100vh-18rem)] space-y-4 overflow-y-auto pr-1">
              <div className="grid gap-4 rounded-[1.35rem] bg-secondary/25 p-4 md:grid-cols-2">
                <div>
                  <Label>Mã phiếu</Label>
                  <p className="mt-1 font-medium">{selectedBatch.invoice_code}</p>
                </div>
                <div>
                  <Label>Người nhập</Label>
                  <p className="mt-1 font-medium">{selectedBatch.imported_by_display_name || "Hệ thống"}</p>
                </div>
                <div>
                  <Label>Ngày tạo</Label>
                  <p className="mt-1 font-medium">{formatDateTime(selectedBatch.created_at)}</p>
                </div>
                <div>
                  <Label>Tổng giá trị</Label>
                  <p className="mt-1 font-medium text-primary">{formatCurrency(selectedBatch.total_import_amount)}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Ghi chú</Label>
                  <p className="mt-1 text-[0.96rem] leading-7 text-muted-foreground">
                    {selectedBatch.note || "Không có ghi chú thêm."}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {selectedBatch.items.map((line) => (
                  <div
                    key={line.import_line_id}
                    className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{line.item_title_snapshot}</p>
                        <p className="text-[0.92rem] leading-6 text-muted-foreground">
                          Mã sản phẩm #{line.item_id}
                        </p>
                      </div>
                      <p className="text-[1rem] font-semibold text-primary">
                        {formatCurrency(line.imported_qty * line.import_unit_price)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1rem] border border-border/60 bg-secondary/15 px-4 py-3">
                        <p className="info-label">SL nhập</p>
                        <p className="mt-1 font-semibold">{line.imported_qty}</p>
                      </div>
                      <div className="rounded-[1rem] border border-border/60 bg-secondary/15 px-4 py-3">
                        <p className="info-label">SL còn lại</p>
                        <p className="mt-1 font-semibold">{line.remaining_qty}</p>
                      </div>
                      <div className="rounded-[1rem] border border-border/60 bg-secondary/15 px-4 py-3">
                        <p className="info-label">Giá nhập</p>
                        <p className="mt-1 font-semibold">{formatCurrency(line.import_unit_price)}</p>
                      </div>
                      <div className="rounded-[1rem] border border-border/60 bg-secondary/15 px-4 py-3">
                        <p className="info-label">Giá bán lúc nhập</p>
                        <p className="mt-1 font-semibold">{formatCurrency(line.sale_unit_price_snapshot)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminImports;
