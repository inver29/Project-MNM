import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { PencilLine, Plus, Search, Trash2, Upload } from "lucide-react";
import { Link } from "react-router-dom";
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
import { formatCurrency } from "@/lib/catalog";
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

interface UploadResult {
  file_name: string;
  file_url: string;
}

const defaultProductForm = {
  item_id: 0,
  space_id: "",
  title: "",
  summary_text: "",
  material_note: "",
  color_tone: "",
  dimension_note: "",
  unit_price: "",
  on_hand_qty: "",
  primary_image_url: "",
  is_published: true,
};

type ProductDialogField = "title" | "space_id" | "unit_price" | "on_hand_qty";

const ADMIN_ITEMS_PER_PAGE = 5;

function extractAssetFileName(assetUrl: string) {
  const cleanedUrl = assetUrl.split("?")[0];
  return cleanedUrl.split("/").pop() || "";
}

const AdminProducts = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [productForm, setProductForm] = useState(defaultProductForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogErrors, setDialogErrors] = useState<FieldErrors<ProductDialogField>>({});
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
      apiRequest<Product[]>(`/items${buildQuery({ published_only: false })}`, { token }),
      apiRequest<Space[]>(`/spaces${buildQuery({ visible_only: false })}`, { token }),
    ])
      .then(([loadedProducts, loadedSpaces]) => {
        setProducts(loadedProducts);
        setSpaces(loadedSpaces);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được dữ liệu sản phẩm.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredProducts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSpace = selectedSpace === "all" || String(product.space_id) === selectedSpace;
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "published" && product.is_published) ||
        (selectedStatus === "hidden" && !product.is_published);

      const haystack = [
        product.title,
        product.space.space_name,
        product.summary_text,
        product.material_note,
        product.color_tone,
      ]
        .join(" ")
        .toLowerCase();

      return matchesSpace && matchesStatus && (!normalizedKeyword || haystack.includes(normalizedKeyword));
    });
  }, [keyword, products, selectedSpace, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ADMIN_ITEMS_PER_PAGE));

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ADMIN_ITEMS_PER_PAGE);
  }, [currentPage, filteredProducts]);

  const metrics = useMemo(
    () => ({
      total: products.length,
      published: products.filter((product) => product.is_published).length,
      hidden: products.filter((product) => !product.is_published).length,
      lowStock: products.filter((product) => product.available_qty <= 5).length,
    }),
    [products],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedSpace, selectedStatus]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function openCreateDialog() {
    if (spaces.length === 0) {
      toast.error("Bạn cần tạo ít nhất một danh mục trước khi thêm sản phẩm.");
      return;
    }

    setDialogErrors({});
    setDialogError("");
    setProductForm({
      ...defaultProductForm,
      space_id: String(spaces[0].space_id),
    });
    setSelectedImageName("");
    setIsDialogOpen(true);
  }

  function openEditDialog(product: Product) {
    setDialogErrors({});
    setDialogError("");
    setProductForm({
      item_id: product.item_id,
      space_id: String(product.space_id),
      title: product.title,
      summary_text: product.summary_text,
      material_note: product.material_note,
      color_tone: product.color_tone,
      dimension_note: product.dimension_note,
      unit_price: String(product.list_price),
      on_hand_qty: String(product.available_qty),
      primary_image_url: product.primary_image_url || "",
      is_published: product.is_published,
    });
    setSelectedImageName(product.primary_image_url ? extractAssetFileName(product.primary_image_url) : "");
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSaving || isUploadingImage) {
      return;
    }
    setProductForm(defaultProductForm);
    setSelectedImageName("");
    setIsDialogOpen(false);
    setDialogErrors({});
    setDialogError("");
  }

  function validateForm() {
    const nextErrors: FieldErrors<ProductDialogField> = {};
    const unitPrice = Number(productForm.unit_price);
    const onHandQty = Number(productForm.on_hand_qty);

    if (productForm.title.trim().length < 2) {
      nextErrors.title = "Tên sản phẩm cần có ít nhất 2 ký tự.";
    }

    if (!productForm.space_id) {
      nextErrors.space_id = "Vui lòng chọn danh mục.";
    }

    if (!Number.isFinite(unitPrice) || productForm.unit_price === "" || unitPrice < 0) {
      nextErrors.unit_price = "Giá bán phải là số từ 0 trở lên.";
    }

    if (!Number.isFinite(onHandQty) || productForm.on_hand_qty === "" || onHandQty < 0) {
      nextErrors.on_hand_qty = "Số lượng tồn phải là số từ 0 trở lên.";
    }

    setDialogErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
      const uploaded = await apiRequest<UploadResult>("/uploads/product-image", {
        method: "POST",
        token,
        body: formData,
      });
      setProductForm((current) => ({ ...current, primary_image_url: uploaded.file_url }));
      setSelectedImageName(uploaded.file_name || file.name);
      toast.success("Đã tải ảnh lên thành công.");
    } catch (error) {
      setSelectedImageName((current) => current || "");
      toast.error(error instanceof Error ? error.message : "Không tải được ảnh lên.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
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
      space_id: Number(productForm.space_id),
      title: productForm.title.trim(),
      summary_text: productForm.summary_text.trim(),
      material_note: productForm.material_note.trim(),
      color_tone: productForm.color_tone.trim(),
      dimension_note: productForm.dimension_note.trim(),
      unit_price: Number(productForm.unit_price),
      on_hand_qty: Number(productForm.on_hand_qty),
      primary_image_url: productForm.primary_image_url || null,
      is_published: productForm.is_published,
    };

    setIsSaving(true);
    try {
      if (productForm.item_id) {
        const updated = await apiRequest<Product>(`/items/${productForm.item_id}`, {
          method: "PUT",
          token,
          body: payload,
        });
        setProducts((current) =>
          current.map((product) => (product.item_id === updated.item_id ? updated : product)),
        );
        toast.success("Đã cập nhật sản phẩm.");
      } else {
        const created = await apiRequest<Product>("/items", {
          method: "POST",
          token,
          body: payload,
        });
        setProducts((current) => [created, ...current]);
        setCurrentPage(1);
        toast.success("Đã thêm sản phẩm mới.");
      }
      closeDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Không lưu được sản phẩm.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    if (!token || user?.account_role !== "admin") {
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa sản phẩm "${product.title}" không?`)) {
      return;
    }

    try {
      await apiRequest(`/items/${product.item_id}`, {
        method: "DELETE",
        token,
      });
      setProducts((current) => current.filter((entry) => entry.item_id !== product.item_id));
      toast.success("Đã xóa sản phẩm.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được sản phẩm.");
    }
  }

  if (!canManage) {
    return (
      <AdminSection title="Không có quyền truy cập">
        <AdminEmptyState>Chỉ quản trị viên hoặc nhân viên mới được quản lý sản phẩm.</AdminEmptyState>
      </AdminSection>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Quản lý sản phẩm"
        title="Danh sách sản phẩm được tổ chức rõ hơn cho việc xem và chỉnh sửa"
        description="Mỗi sản phẩm hiển thị đúng các thông tin quan trọng: ảnh, tên, danh mục, giá, tồn kho và trạng thái. Hộp thoại chỉnh sửa cũng được chia nhóm trường rõ ràng hơn."
      />

      <AdminMetricsGrid className="xl:grid-cols-4">
        <AdminMetricCard label="Tổng sản phẩm" value={metrics.total} tone="primary" />
        <AdminMetricCard label="Đang bán" value={metrics.published} tone="success" />
        <AdminMetricCard label="Ngưng bán" value={metrics.hidden} tone="info" />
        <AdminMetricCard label="Tồn kho thấp" value={metrics.lowStock} tone="warning" />
      </AdminMetricsGrid>

      <AdminToolbar>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px_210px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo tên, chất liệu, màu sắc..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả danh mục</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.space_id} value={String(space.space_id)}>
                  {space.space_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="published">Đang bán</SelectItem>
              <SelectItem value="hidden">Ngưng bán</SelectItem>
            </SelectContent>
          </Select>
          <AdminToolbarInfo>
            Hiển thị {filteredProducts.length} sản phẩm
          </AdminToolbarInfo>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Danh sách sản phẩm"
        description="Bảng dữ liệu được giữ đều cột và rõ chữ để người quản trị quét thông tin nhanh hơn."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/quan-tri/nhap-hang">Nhập hàng Excel</Link>
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm sản phẩm
            </Button>
          </>
        }
      >
        {isLoading ? (
          <p className="text-base text-muted-foreground">Đang tải dữ liệu sản phẩm...</p>
        ) : filteredProducts.length === 0 ? (
          <AdminEmptyState>Không có sản phẩm nào phù hợp với bộ lọc hiện tại.</AdminEmptyState>
        ) : (
          <>
            <AdminDataSurface>
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Danh mục</TableHead>
                    <TableHead>Giá bán</TableHead>
                    <TableHead className="text-center">Tồn kho</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Cập nhật</TableHead>
                    <TableHead className={`${adminStickyActionHeaderClassName} w-[6.5rem]`}>
                      Tác vụ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.item_id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-12 w-12 overflow-hidden rounded-[0.9rem] bg-secondary/40">
                            {product.primary_image_url ? (
                              <img
                                src={resolveAssetUrl(product.primary_image_url)}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="space-y-1">
                            <p className="font-medium">{product.title}</p>
                            <p className="line-clamp-1 max-w-[7.5rem] text-[0.92rem] leading-6 text-muted-foreground">
                              {product.summary_text || product.material_note || "Chưa có mô tả ngắn."}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{product.space.space_name}</TableCell>
                      <TableCell className="whitespace-nowrap font-semibold text-primary">{formatCurrency(product.list_price)}</TableCell>
                      <TableCell className="whitespace-nowrap text-center">{product.available_qty}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[0.84rem] font-semibold ${
                            product.is_published
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                              : "border-amber-500/20 bg-amber-500/10 text-amber-800"
                          }`}
                        >
                          {product.is_published ? "Đang bán" : "Ngưng bán"}
                        </span>
                      </TableCell>
                      <TableCell className="text-[0.92rem] leading-6">{formatDateTime(product.updated_at)}</TableCell>
                      <TableCell className={`${adminStickyActionCellClassName} w-[6.5rem]`}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title={`Sửa sản phẩm ${product.title}`}
                            aria-label={`Sửa sản phẩm ${product.title}`}
                            onClick={() => openEditDialog(product)}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          {user?.account_role === "admin" ? (
                            <Button
                              variant="outline"
                              size="icon"
                              title={`Xóa sản phẩm ${product.title}`}
                              aria-label={`Xóa sản phẩm ${product.title}`}
                              onClick={() => void handleDelete(product)}
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

            <DataPagination className="mt-5" currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </AdminSection>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto rounded-[1.6rem]">
          <DialogHeader>
            <DialogTitle>{productForm.item_id ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}</DialogTitle>
            <DialogDescription>Điền đúng các thông tin cần thiết rồi lưu trực tiếp vào hệ thống.</DialogDescription>
          </DialogHeader>

          <form className="grid gap-6" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label>Tên sản phẩm</Label>
                  <Input
                    value={productForm.title}
                    onChange={(event) => {
                      setProductForm((current) => ({ ...current, title: event.target.value }));
                      setDialogErrors((current) => ({ ...current, title: undefined }));
                      setDialogError("");
                    }}
                    aria-describedby={dialogErrors.title ? "admin-product-title-error" : undefined}
                    aria-invalid={dialogErrors.title ? true : undefined}
                  />
                  <FieldError id="admin-product-title-error">{dialogErrors.title}</FieldError>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Danh mục</Label>
                    <Select
                      value={productForm.space_id}
                      onValueChange={(value) => {
                        setProductForm((current) => ({ ...current, space_id: value }));
                        setDialogErrors((current) => ({ ...current, space_id: undefined }));
                        setDialogError("");
                      }}
                    >
                      <SelectTrigger
                        aria-describedby={dialogErrors.space_id ? "admin-product-space-error" : undefined}
                        aria-invalid={dialogErrors.space_id ? true : undefined}
                      >
                        <SelectValue placeholder="Chọn danh mục" />
                      </SelectTrigger>
                      <SelectContent>
                        {spaces.map((space) => (
                          <SelectItem key={space.space_id} value={String(space.space_id)}>
                            {space.space_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError id="admin-product-space-error">{dialogErrors.space_id}</FieldError>
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={productForm.is_published ? "published" : "hidden"}
                      onValueChange={(value) =>
                        setProductForm((current) => ({ ...current, is_published: value === "published" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Đang bán</SelectItem>
                      <SelectItem value="hidden">Ngưng bán</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả ngắn</Label>
                  <Textarea
                    value={productForm.summary_text}
                    onChange={(event) => setProductForm((current) => ({ ...current, summary_text: event.target.value }))}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Chất liệu</Label>
                    <Input
                      value={productForm.material_note}
                      onChange={(event) => setProductForm((current) => ({ ...current, material_note: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Màu sắc</Label>
                    <Input
                      value={productForm.color_tone}
                      onChange={(event) => setProductForm((current) => ({ ...current, color_tone: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Kích thước</Label>
                  <Input
                    value={productForm.dimension_note}
                    onChange={(event) => setProductForm((current) => ({ ...current, dimension_note: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
                  <div className="space-y-3">
                    <Label>Ảnh đại diện</Label>
                    <FilePicker
                      accept=".jpg,.jpeg,.png,.webp"
                      disabled={isUploadingImage}
                      fileName={selectedImageName}
                      placeholder="Chưa chọn tệp ảnh"
                      onChange={(event) => void handleImageSelected(event)}
                    />
                    {isUploadingImage ? <p className="text-[0.95rem] text-muted-foreground">Đang tải ảnh lên...</p> : null}
                    {productForm.primary_image_url ? (
                      <div className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-background">
                        <img
                          src={resolveAssetUrl(productForm.primary_image_url)}
                          alt="Ảnh đại diện sản phẩm"
                          className="h-56 w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-56 items-center justify-center rounded-[1.2rem] border border-dashed border-border/70 bg-background text-[0.95rem] text-muted-foreground">
                        <Upload className="mr-2 h-4 w-4" />
                        Chưa có ảnh đại diện
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4">
                  <div className="grid gap-5">
                    <div className="space-y-2">
                      <Label>Giá bán</Label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.unit_price}
                        onChange={(event) => {
                          setProductForm((current) => ({ ...current, unit_price: event.target.value }));
                          setDialogErrors((current) => ({ ...current, unit_price: undefined }));
                          setDialogError("");
                        }}
                        aria-describedby={dialogErrors.unit_price ? "admin-product-price-error" : undefined}
                        aria-invalid={dialogErrors.unit_price ? true : undefined}
                      />
                      <FieldError id="admin-product-price-error">{dialogErrors.unit_price}</FieldError>
                    </div>

                    <div className="space-y-2">
                      <Label>Số lượng tồn</Label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.on_hand_qty}
                        onChange={(event) => {
                          setProductForm((current) => ({ ...current, on_hand_qty: event.target.value }));
                          setDialogErrors((current) => ({ ...current, on_hand_qty: undefined }));
                          setDialogError("");
                        }}
                        aria-describedby={dialogErrors.on_hand_qty ? "admin-product-qty-error" : undefined}
                        aria-invalid={dialogErrors.on_hand_qty ? true : undefined}
                      />
                      <FieldError id="admin-product-qty-error">{dialogErrors.on_hand_qty}</FieldError>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <FormAlert>{dialogError}</FormAlert>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button disabled={isSaving || isUploadingImage} type="submit">
                {isSaving ? "Đang lưu..." : productForm.item_id ? "Lưu cập nhật" : "Tạo sản phẩm"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminProducts;
