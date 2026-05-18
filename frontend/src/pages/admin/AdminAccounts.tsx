import { FormEvent, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, PencilLine, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError, FormAlert } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DataPagination from "@/components/ui/data-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDateTime, roleLabels } from "@/lib/admin";
import { FieldErrors, isValidEmail, isValidPhone } from "@/lib/form-validation";
import { Account, AccountRole } from "@/types/domain";
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

interface AccountFormState {
  account_id: number;
  email_address: string;
  display_name: string;
  mobile_phone: string;
  password: string;
  account_role: AccountRole;
  is_active: boolean;
}

type AccountDialogField = "display_name" | "email_address" | "mobile_phone" | "password";

const ADMIN_ITEMS_PER_PAGE = 5;

const defaultAccountForm: AccountFormState = {
  account_id: 0,
  email_address: "",
  display_name: "",
  mobile_phone: "",
  password: "",
  account_role: "khach_hang",
  is_active: true,
};

const AdminAccounts = () => {
  const { token, user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [accountForm, setAccountForm] = useState<AccountFormState>(defaultAccountForm);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogErrors, setDialogErrors] = useState<FieldErrors<AccountDialogField>>({});
  const [dialogError, setDialogError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const isCreateMode = accountForm.account_id === 0;

  useEffect(() => {
    if (!token) {
      return;
    }

    apiRequest<Account[]>("/accounts", { token })
      .then(setAccounts)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được danh sách tài khoản.");
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const filteredAccounts = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return accounts.filter((account) => {
      const matchesRole = selectedRole === "all" || account.account_role === selectedRole;
      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && account.is_active) ||
        (selectedStatus === "inactive" && !account.is_active);
      const haystack = [account.display_name, account.email_address, account.mobile_phone || ""]
        .join(" ")
        .toLowerCase();

      return matchesRole && matchesStatus && (!normalizedKeyword || haystack.includes(normalizedKeyword));
    });
  }, [accounts, keyword, selectedRole, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ADMIN_ITEMS_PER_PAGE));

  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * ADMIN_ITEMS_PER_PAGE;
    return filteredAccounts.slice(startIndex, startIndex + ADMIN_ITEMS_PER_PAGE);
  }, [currentPage, filteredAccounts]);

  const metrics = useMemo(
    () => ({
      total: accounts.length,
      active: accounts.filter((account) => account.is_active).length,
      inactive: accounts.filter((account) => !account.is_active).length,
      admins: accounts.filter((account) => account.account_role === "admin").length,
    }),
    [accounts],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedRole, selectedStatus]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function openCreateDialog() {
    setAccountForm(defaultAccountForm);
    setDialogErrors({});
    setDialogError("");
    setShowPassword(false);
    setIsDialogOpen(true);
  }

  function openEditDialog(account: Account) {
    setAccountForm({
      account_id: account.account_id,
      email_address: account.email_address,
      display_name: account.display_name,
      mobile_phone: account.mobile_phone || "",
      password: "",
      account_role: account.account_role,
      is_active: account.is_active,
    });
    setDialogErrors({});
    setDialogError("");
    setShowPassword(false);
    setIsDialogOpen(true);
  }

  function closeDialog() {
    if (isSaving) {
      return;
    }
    setAccountForm(defaultAccountForm);
    setDialogErrors({});
    setDialogError("");
    setShowPassword(false);
    setIsDialogOpen(false);
  }

  function validateForm() {
    const nextErrors: FieldErrors<AccountDialogField> = {};
    const normalizedName = accountForm.display_name.trim();
    const normalizedEmail = accountForm.email_address.trim();
    const normalizedPhone = accountForm.mobile_phone.trim();
    const normalizedPassword = accountForm.password.trim();

    if (normalizedName.length < 2) {
      nextErrors.display_name = "Họ tên cần có ít nhất 2 ký tự.";
    }

    if (!normalizedEmail) {
      nextErrors.email_address = "Vui lòng nhập email.";
    } else if (!isValidEmail(normalizedEmail)) {
      nextErrors.email_address = "Email chưa đúng định dạng.";
    }

    if (normalizedPhone && !isValidPhone(normalizedPhone)) {
      nextErrors.mobile_phone = "Số điện thoại cần từ 8 đến 20 ký tự hợp lệ.";
    }

    if (isCreateMode && normalizedPassword.length < 6) {
      nextErrors.password = "Mật khẩu cần có ít nhất 6 ký tự.";
    }

    if (!isCreateMode && normalizedPassword && normalizedPassword.length < 6) {
      nextErrors.password = "Mật khẩu mới cần có ít nhất 6 ký tự.";
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

    setIsSaving(true);
    try {
      if (isCreateMode) {
        const created = await apiRequest<Account>("/accounts", {
          method: "POST",
          token,
          body: {
            email_address: accountForm.email_address.trim(),
            password: accountForm.password,
            display_name: accountForm.display_name.trim(),
            mobile_phone: accountForm.mobile_phone.trim() || null,
            account_role: accountForm.account_role,
            is_active: accountForm.is_active,
          },
        });
        setAccounts((current) => [created, ...current]);
        setCurrentPage(1);
        toast.success("Đã thêm tài khoản mới.");
      } else {
        const updated = await apiRequest<Account>(`/accounts/${accountForm.account_id}`, {
          method: "PUT",
          token,
          body: {
            email_address: accountForm.email_address.trim(),
            display_name: accountForm.display_name.trim(),
            mobile_phone: accountForm.mobile_phone.trim() || null,
            account_role: accountForm.account_role,
            is_active: accountForm.is_active,
            new_password: accountForm.password.trim() || undefined,
          },
        });
        setAccounts((current) =>
          current.map((account) => (account.account_id === updated.account_id ? updated : account)),
        );
        toast.success(
          accountForm.password.trim()
            ? "Đã cập nhật tài khoản và đặt lại mật khẩu."
            : "Đã cập nhật tài khoản.",
        );
      }

      closeDialog();
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : "Không lưu được tài khoản.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(account: Account) {
    if (!token) {
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa tài khoản "${account.display_name}" không?`)) {
      return;
    }

    try {
      await apiRequest(`/accounts/${account.account_id}`, {
        method: "DELETE",
        token,
      });
      setAccounts((current) => current.filter((entry) => entry.account_id !== account.account_id));
      toast.success("Đã xóa tài khoản.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không xóa được tài khoản.");
    }
  }

  if (user?.account_role !== "admin") {
    return (
      <AdminSection title="Không có quyền truy cập">
        <AdminEmptyState>Chỉ quản trị viên mới được quản lý tài khoản hệ thống.</AdminEmptyState>
      </AdminSection>
    );
  }

  return (
    <AdminPage>
      <AdminHero
        eyebrow="Quản lý tài khoản"
        title="Danh sách tài khoản được tách rõ theo vai trò và trạng thái"
        description="Quản trị viên có thể tạo mới, tìm kiếm, chỉnh sửa, khóa/mở và đặt lại mật khẩu tài khoản ngay trên cùng một bố cục thống nhất."
      />

      <AdminMetricsGrid>
        <AdminMetricCard label="Tổng tài khoản" value={metrics.total} tone="primary" />
        <AdminMetricCard label="Đang hoạt động" value={metrics.active} tone="success" />
        <AdminMetricCard label="Tạm khóa" value={metrics.inactive} tone="warning" />
        <AdminMetricCard label="Quản trị viên" value={metrics.admins} tone="info" />
      </AdminMetricsGrid>

      <AdminToolbar>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_230px_210px_170px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Tìm theo họ tên, email hoặc số điện thoại..."
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Lọc theo vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả vai trò</SelectItem>
              <SelectItem value="admin">Quản trị viên</SelectItem>
              <SelectItem value="nhan_vien">Nhân viên</SelectItem>
              <SelectItem value="khach_hang">Khách hàng</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang hoạt động</SelectItem>
              <SelectItem value="inactive">Tạm khóa</SelectItem>
            </SelectContent>
          </Select>
          <AdminToolbarInfo>Hiển thị {filteredAccounts.length} tài khoản</AdminToolbarInfo>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Danh sách tài khoản"
        description="Bảng dữ liệu giữ vai trò, trạng thái và thông tin liên hệ trên cùng một dòng để kiểm tra nhanh hơn."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm tài khoản
          </Button>
        }
      >
        {isLoading ? (
          <p className="text-base text-muted-foreground">Đang tải dữ liệu tài khoản...</p>
        ) : filteredAccounts.length === 0 ? (
          <AdminEmptyState>Không có tài khoản nào phù hợp với bộ lọc hiện tại.</AdminEmptyState>
        ) : (
          <>
            <AdminDataSurface>
              <Table className="min-w-0">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[24%]">Họ tên</TableHead>
                    <TableHead className="w-[30%]">Email</TableHead>
                    <TableHead className="hidden xl:table-cell">Số điện thoại</TableHead>
                    <TableHead className="w-[12%]">Vai trò</TableHead>
                    <TableHead className="w-[14%]">Trạng thái</TableHead>
                    <TableHead className="hidden 2xl:table-cell">Ngày tạo</TableHead>
                    <TableHead className={`${adminStickyActionHeaderClassName} w-[6.5rem]`}>
                      Tác vụ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedAccounts.map((account) => (
                    <TableRow key={account.account_id} className="group">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="truncate font-medium" title={account.display_name}>
                            {account.display_name}
                          </p>
                          <p className="text-sm text-muted-foreground xl:hidden">
                            {account.mobile_phone || "Chưa cập nhật số điện thoại"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="truncate" title={account.email_address}>
                            {account.email_address}
                          </p>
                          <p className="text-sm text-muted-foreground 2xl:hidden">
                            Tạo: {formatDateTime(account.created_at)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap xl:table-cell">
                        {account.mobile_phone || "Chưa cập nhật"}
                      </TableCell>
                      <TableCell>{roleLabels[account.account_role]}</TableCell>
                      <TableCell>{account.is_active ? "Đang hoạt động" : "Tạm khóa"}</TableCell>
                      <TableCell className="hidden whitespace-nowrap 2xl:table-cell">
                        {formatDateTime(account.created_at)}
                      </TableCell>
                      <TableCell className={adminStickyActionCellClassName}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            title={`Sửa tài khoản ${account.display_name}`}
                            aria-label={`Sửa tài khoản ${account.display_name}`}
                            onClick={() => openEditDialog(account)}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          {account.account_id !== user?.account_id ? (
                            <Button
                              variant="outline"
                              size="icon"
                              title={`Xóa tài khoản ${account.display_name}`}
                              aria-label={`Xóa tài khoản ${account.display_name}`}
                              onClick={() => void handleDelete(account)}
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

            <DataPagination
              className="mt-5"
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </AdminSection>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-3xl rounded-[1.6rem]">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? "Thêm tài khoản mới" : "Cập nhật tài khoản"}</DialogTitle>
            <DialogDescription>
              {isCreateMode
                ? "Tạo nhanh tài khoản mới và gán luôn vai trò phù hợp cho người dùng."
                : "Điều chỉnh thông tin cơ bản, vai trò, trạng thái hoạt động và đặt lại mật khẩu nếu cần."}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-5 md:grid-cols-2" noValidate onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label>Họ tên</Label>
              <Input
                value={accountForm.display_name}
                onChange={(event) => {
                  setAccountForm((current) => ({ ...current, display_name: event.target.value }));
                  setDialogErrors((current) => ({ ...current, display_name: undefined }));
                  setDialogError("");
                }}
                aria-describedby={dialogErrors.display_name ? "admin-account-name-error" : undefined}
                aria-invalid={dialogErrors.display_name ? true : undefined}
              />
              <FieldError id="admin-account-name-error">{dialogErrors.display_name}</FieldError>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={accountForm.email_address}
                onChange={(event) => {
                  setAccountForm((current) => ({ ...current, email_address: event.target.value }));
                  setDialogErrors((current) => ({ ...current, email_address: undefined }));
                  setDialogError("");
                }}
                aria-describedby={dialogErrors.email_address ? "admin-account-email-error" : undefined}
                aria-invalid={dialogErrors.email_address ? true : undefined}
              />
              <FieldError id="admin-account-email-error">{dialogErrors.email_address}</FieldError>
            </div>

            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={accountForm.mobile_phone}
                onChange={(event) => {
                  setAccountForm((current) => ({ ...current, mobile_phone: event.target.value }));
                  setDialogErrors((current) => ({ ...current, mobile_phone: undefined }));
                  setDialogError("");
                }}
                aria-describedby={dialogErrors.mobile_phone ? "admin-account-phone-error" : undefined}
                aria-invalid={dialogErrors.mobile_phone ? true : undefined}
              />
              <FieldError id="admin-account-phone-error">{dialogErrors.mobile_phone}</FieldError>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>{isCreateMode ? "Mật khẩu" : "Đặt lại mật khẩu"}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={accountForm.password}
                  onChange={(event) => {
                    setAccountForm((current) => ({ ...current, password: event.target.value }));
                    setDialogErrors((current) => ({ ...current, password: undefined }));
                    setDialogError("");
                  }}
                  placeholder={isCreateMode ? "Tối thiểu 6 ký tự" : "Để trống nếu không đổi mật khẩu"}
                  className="pr-11"
                  aria-describedby={dialogErrors.password ? "admin-account-password-error" : undefined}
                  aria-invalid={dialogErrors.password ? true : undefined}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FieldError id="admin-account-password-error">{dialogErrors.password}</FieldError>
              {!isCreateMode ? (
                <p className="text-[0.92rem] leading-6 text-muted-foreground">
                  Nếu nhập mật khẩu mới, hệ thống sẽ thay trực tiếp mật khẩu hiện tại của tài khoản này.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select
                value={accountForm.account_role}
                onValueChange={(value: AccountRole) =>
                  setAccountForm((current) => ({ ...current, account_role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Quản trị viên</SelectItem>
                  <SelectItem value="nhan_vien">Nhân viên</SelectItem>
                  <SelectItem value="khach_hang">Khách hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={accountForm.is_active ? "active" : "inactive"}
                onValueChange={(value) =>
                  setAccountForm((current) => ({ ...current, is_active: value === "active" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <FormAlert>{dialogError}</FormAlert>
            </div>
            <DialogFooter className="md:col-span-2">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Hủy
              </Button>
              <Button disabled={isSaving} type="submit">
                {isSaving ? "Đang lưu..." : isCreateMode ? "Tạo tài khoản" : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
};

export default AdminAccounts;
