import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, Search, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FilePicker } from "@/components/ui/file-picker";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataPagination from "@/components/ui/data-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, buildQuery, resolveAssetUrl } from "@/lib/api";
import { formatDateTime } from "@/lib/admin";
import { FieldErrors } from "@/lib/form-validation";
import { Product, Space } from "@/types/domain";
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
  AdminToolbarInfo,
  AdminToolbar,
} from "@/components/admin/AdminPageParts";

const defaultSpaceForm = {
  space_id: 0,
  space_name: "",
  teaser_text: "",
  cover_image_url: "",
  is_visible: true,
};

type SpaceDialogField = "space_name";

interface UploadResult {
  file_name: string;
  file_url: string;
}

const ADMIN_ITEMS_PER_PAGE = 5;

function extractAssetFileName(assetUrl: string) {
  const cleanedUrl = assetUrl.split("?")[0];
  return cleanedUrl.split("/").pop() || "";
}

const AdminSpaces = () => {
  const { token, user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [spaceForm, setSpaceForm] = useState(defaultSpaceForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogErrors, setDialogErrors] = useState<FieldErrors<SpaceDialogField>>({});
  const [dialogError, setDialogError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedImageName, setSelectedImageName] = useState("");

  const canManage = user?.account_role === "admin" || user?.account_role === "nhan_vien";

  useEffect(() => {
    if (!token) {
      return;
    }

    Promise.all([
      apiRequest<Space[]>(`/spaces${buildQuery({ visible_only: false })}`, { token }),
      apiRequest<Product[]>(`/items${buildQuery({ published_only: false })}`, { token }),
    ])
      .then(([loadedSpaces, loadedProducts]) => {
        setSpaces(loadedSpaces);
        setProducts(loadedProducts);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu danh mục.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredSpaces = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return spaces.filter((space) => {
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "visible" && space.is_visible) ||
        (selectedStatus === "hidden" && !space.is_visible);

      const haystack = `${space.space_name} ${space.teaser_text}`.toLowerCase();
      return matchesStatus && (!normalizedKeyword || haystack.includes(normalizedKeyword));
    });
  }, [keyword, selectedStatus, spaces]);

  const totalPages = Math.max(1, Math.ceil(filteredSpaces.length / ADMIN_ITEMS_PER_PAGE));

  const paginatedSpaces = useMemo(() => {
    const startIndex = (currentPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredSpaces.slice(startIndex, startIndex + ADMIN_ITEMS_PER_PAGE);
  }, [currentPage, filteredSpaces]);

  const productCountBySpaceId = useMemo(
    () =>
      products.reduce<Record<number, number>>((accumulator, product) => {
        accumulator[product.space_id] = (accumulator[product.space_id] || 0) + 1;
        return accumulator;
      }, {}),
    [products],
  );

  const metrics = useMemo(
    () => ({
      total: spaces.length,
      visible: spaces.filter((space) => space.is_visible).length,
      hidden: spaces.filter((space) => !space.is_visible).length,
      assignedProducts: products.length,
    }),
    [products.length, spaces],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedStatus]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function openCreateDialog() {
    setDialogErrors({});
    setDialogError("");
    setSpaceForm(defaultSpaceForm);
    setSelectedImageName("");
    setIsDialogOpen(true);
  }

  function openEditDialog(space: Space) {
    setDialogErrors({});
    setDialogError("");
    setSpaceForm({
      space_id: space.space_id,
      space_name: space.space_name,
      teaser_text: space.teaser_text,
      cover_image_url: space.cover_image_url || "",
      is_visible: space.is_visible,
    });
    setSelectedImageName(space.cover_image_url ? extractAssetFileName(space.cover_image_url) : "");
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSaving || isUploadingImage) {
      return;
    }
    setSpaceForm(defaultSpaceForm);
    setSelectedImageName("");
    setIsDialogOpen(false);
    setDialogErrors({});
    setDialogError("");
  }

  function validateForm() {
    const nextErrors: FieldErrors<SpaceDialogField> = {};

    if (spaceForm.space_name.trim().length < 2) {
      nextErrors.space_name = "Tên danh mục cần có ít nhất 2 ký tự.";
    }

    setDialogErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    setDialogError("");

    if (!validateForm()) {
      return;
    }

    const payload = {
      space_name: spaceForm.space_name.trim(),
      summary_text: spaceForm.teaser_text.trim(),
      cover_image_url: spaceForm.cover_image_url || null,
      is_visible: spaceForm.is_visible,
    };

    setIsSaving(true);
    try {
      if (spaceForm.space_id) {
        const updated = await apiRequest<Space>(`/spaces/${spaceForm.space_id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setSpaces((current) => current.map((space) => (space.space_id === updated.space_id ? updated : space)));
        toast.success("Đã cập nhật danh mục.");
      } else {
        const created = await apiRequest<Space>("/spaces", {
          method: "POST",
          token,
          body: payload,
        });
        setSpaces((current) => [created, ...current]);
        setCurrentPage(1);
        toast.success("Đã thêm danh mục mới.");
      }
      closeDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Không lưu được danh mục.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleImageSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !token) {
      return;
    }
    setSelectedImageName(file.name);

    const formData = new FormData();
    formData.append("image", file);

    setIsUploadingImage(true);
    try {
      const uploaded = await apiRequest<UploadResult>("/uploads/space-image", {
        method: "POST",
        token,
        body: formData,
      });
      setSpaceForm((current) => ({ ...current, cover_image_url: uploaded.file_url }));
      setSelectedImageName(uploaded.file_name || file.name);
      toast.success("Đã tải ảnh danh mục lên thành công.");
    } catch (error) {
      setSelectedImageName((current) => current || "");
      toast.error(error instanceof Error ? error.message : "Không tải được ảnh danh mục.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleDelete(space: Space) {
    if (!token || user?.account_role !== "admin") {
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${space.space_name}" không?`)) {
      return;
    }

    try {
      await apiRequest(`/spaces/${space.space_id}`, {
        method: "DELETE",
        token,
      });
      setSpaces((current) => current.filter((entry) => entry.space_id !== space.space_id));
      toast.success("Đã xóa danh mục.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được danh mục.");
    }
  }

  if (!canManage) {
    return (
      <AdminSection title="Không có quyền truy cập">
        <AdminEmptyState>Chỉ quản trị viên hoặc nhân viên mới được quản lý danh mục.</AdminEmptyState>
      </AdminSection>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Quản lý danh mục"
        title="Danh mục theo không gian được hiển thị trực quan và dễ chỉnh sửa hơn"
        description="Mỗi danh mục có ảnh, mô tả, trạng thái và số lượng sản phẩm đi kèm để người quản trị kiểm tra nhanh mà không phải mở quá nhiều màn hình."
      />

      <AdminMetricsGrid>
        <AdminMetricCard label="Tổng danh mục" value={metrics.total} tone="primary" />
        <AdminMetricCard label="Đang hiển thị" value={metrics.visible} tone="success" />
        <AdminMetricCard label="Tạm ẩn" value={metrics.hidden} tone="warning" />
        <AdminMetricCard label="Sản phẩm đã gán" value={metrics.assignedProducts} tone="info" />
      </AdminMetricsGrid>

      <AdminToolbar>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tên danh mục hoặc mô tả..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="visible">Đang hiển thị</SelectItem>
              <SelectItem value="hidden">Tạm ẩn</SelectItem>
            </SelectContent>
          </Select>
          <AdminToolbarInfo>
            Hiển thị {filteredSpaces.length} danh mục
          </AdminToolbarInfo>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Danh sách danh mục"
        description="Danh mục được đưa về cùng kiểu bảng quản trị với các trang khác để việc quét dữ liệu và đổi thiết kế sau này thống nhất hơn."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm danh mục
          </Button>
        }
      >
        {isLoading ? (
          <p className="text-base text-muted-foreground">Đang tải danh mục...</p>
        ) : filteredSpaces.length === 0 ? (
          <AdminEmptyState>Không có danh mục nào phù hợp với bộ lọc hiện tại.</AdminEmptyState>
        ) : (
          <div className="space-y-5">
            <AdminDataSurface>
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="hidden xl:table-cell">Mô tả</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="hidden 2xl:table-cell">Cập nhật</TableHead>
                    <TableHead className={`${adminStickyActionHeaderClassName} w-[6.5rem]`}>
                      Tác vụ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSpaces.map((space) => (
                    <TableRow key={space.space_id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1rem] bg-secondary/35">
                            {space.cover_image_url ? (
                              <img
                                src={resolveAssetUrl(space.cover_image_url)}
                                alt={space.space_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[0.78rem] text-muted-foreground">
                                Chưa có ảnh
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-medium" title={space.space_name}>
                              {space.space_name}
                            </p>
                            <p className="line-clamp-2 text-[0.92rem] leading-6 text-muted-foreground xl:hidden">
                              {space.teaser_text || "Chưa có mô tả cho danh mục này."}
                            </p>
                            <p className="text-[0.92rem] leading-6 text-muted-foreground 2xl:hidden">
                              Cập nhật: {formatDateTime(space.updated_at)}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <p className="line-clamp-2 max-w-[26rem] text-[0.95rem] leading-6 text-muted-foreground">
                          {space.teaser_text || "Chưa có mô tả cho danh mục này."}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{productCountBySpaceId[space.space_id] || 0}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[0.84rem] font-semibold ${
                            space.is_visible
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-800"
                          }`}
                        >
                          {space.is_visible ? "Đang hiển thị" : "Tạm ẩn"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap 2xl:table-cell">
                        {formatDateTime(space.updated_at)}
                      </TableCell>
                      <TableCell className={`${adminStickyActionCellClassName} w-[6.5rem]`}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title={`Sửa danh mục ${space.space_name}`}
                            aria-label={`Sửa danh mục ${space.space_name}`}
                            onClick={() => openEditDialog(space)}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          {user?.account_role === "admin" ? (
                            <Button
                              variant="outline"
                              size="icon"
                              title={`Xóa danh mục ${space.space_name}`}
                              aria-label={`Xóa danh mục ${space.space_name}`}
                              onClick={() => void handleDelete(space)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminDataSurface>

            <DataPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}
      </AdminSection>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-4xl rounded-[1.6rem]">
          <DialogHeader>
            <DialogTitle>{spaceForm.space_id ? "Cập nhật danh mục" : "Thêm danh mục mới"}</DialogTitle>
            <DialogDescription>Mỗi danh mục dùng để gom nhóm sản phẩm theo không gian sử dụng.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Tên danh mục</Label>
                  <Input
                    value={spaceForm.space_name}
                    onChange={(event) => {
                      setSpaceForm((current) => ({ ...current, space_name: event.target.value }));
                      setDialogErrors((current) => ({ ...current, space_name: undefined }));
                      setDialogError("");
                    }}
                    aria-describedby={dialogErrors.space_name ? "admin-space-name-error" : undefined}
                    aria-invalid={dialogErrors.space_name ? true : undefined}
                  />
                  <FieldError id="admin-space-name-error">{dialogErrors.space_name}</FieldError>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả ngắn</Label>
                  <Textarea
                    value={spaceForm.teaser_text}
                    onChange={(event) => setSpaceForm((current) => ({ ...current, teaser_text: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={spaceForm.is_visible ? "visible" : "hidden"}
                    onValueChange={(value) => setSpaceForm((current) => ({ ...current, is_visible: value === "visible" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="visible">Đang hiển thị</SelectItem>
                      <SelectItem value="hidden">Tạm ẩn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3 rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
                <Label>Ảnh danh mục</Label>
                <FilePicker
                  accept=".jpg,.jpeg,.png,.webp"
                  disabled={isUploadingImage}
                  fileName={selectedImageName}
                  placeholder="Chưa chọn tệp ảnh"
                  onChange={(event) => void handleImageSelected(event)}
                />
                {isUploadingImage ? <p className="text-[0.95rem] text-muted-foreground">Đang tải ảnh lên...</p> : null}
                {spaceForm.cover_image_url ? (
                  <div className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-background">
                    <img
                      src={resolveAssetUrl(spaceForm.cover_image_url)}
                      alt="Ảnh danh mục"
                      className="h-64 w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-[1.2rem] border border-dashed border-border/70 bg-background text-[0.95rem] text-muted-foreground">
                    <Upload className="mr-2 h-4 w-4" />
                    Chưa có ảnh danh mục
                  </div>
                )}
              </div>
            </div>

            <FormAlert>{dialogError}</FormAlert>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button disabled={isSaving || isUploadingImage} type="submit">
                {isSaving ? "Đang lưu..." : spaceForm.space_id ? "Lưu cập nhật" : "Tạo danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminSpaces;
