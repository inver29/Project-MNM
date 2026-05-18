const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

interface RequestOptions extends RequestInit {
  token?: string | null;
}

interface UploadFileOptions {
  token?: string | null;
  fieldName?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const fieldLabels: Record<string, string> = {
  consignee_name: "Họ và tên người nhận",
  consignee_phone: "Số điện thoại người nhận",
  delivery_line: "Địa chỉ giao hàng",
  delivery_note: "Ghi chú",
  payment_method: "Phương thức thanh toán",
  requested_qty: "Số lượng sản phẩm",
  items: "Danh sách sản phẩm",
};

interface ValidationIssue {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
  ctx?: Record<string, unknown>;
}

function getFieldLabel(issue: ValidationIssue) {
  const rawField = issue.loc?.findLast((value) => typeof value === "string" && value !== "body");
  if (!rawField || typeof rawField !== "string") {
    return "Dữ liệu nhập";
  }
  return fieldLabels[rawField] || rawField;
}

function mapValidationIssue(issue: ValidationIssue) {
  const label = getFieldLabel(issue);

  if (issue.type === "string_too_short") {
    return `${label} phải có ít nhất ${issue.ctx?.min_length ?? ""} ký tự.`;
  }
  if (issue.type === "string_too_long") {
    return `${label} không được vượt quá ${issue.ctx?.max_length ?? ""} ký tự.`;
  }
  if (issue.type === "missing") {
    return `${label} là bắt buộc.`;
  }
  if (issue.type === "greater_than_equal") {
    return `${label} phải lớn hơn hoặc bằng ${issue.ctx?.ge ?? 0}.`;
  }
  if (issue.msg) {
    return `${label}: ${issue.msg}`;
  }
  return `${label} không hợp lệ.`;
}

function getApiErrorMessage(payload: unknown) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const detail = record["detail"];

    if (Array.isArray(detail)) {
      return detail
        .map((entry) => mapValidationIssue((entry ?? {}) as ValidationIssue))
        .filter(Boolean)
        .join(" ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      const nestedMessage = (detail as Record<string, unknown>)["message"];
      if (typeof nestedMessage === "string") {
        return nestedMessage;
      }
    }

    if (typeof record["error"] === "string") {
      return record["error"];
    }

    if (typeof record["message"] === "string") {
      return record["message"];
    }
  }

  return "Có lỗi xảy ra khi giao tiếp với máy chủ.";
}

export async function apiRequest<T>(
  path: string,
  { token, headers, body, ...init }: RequestOptions = {},
): Promise<T> {
  const isFormDataBody = typeof FormData !== "undefined" && body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body:
        body === undefined
          ? undefined
          : isFormDataBody || typeof body === "string"
            ? body
            : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error && error.message === "Failed to fetch"
        ? "Không thể kết nối đến máy chủ. Hãy kiểm tra backend đang chạy rồi thử lại."
        : "Không thể kết nối đến máy chủ.",
      0,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const rawText = await response.text();
  let payload: Record<string, unknown> = {};

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      payload = { message: rawText };
    }
  }

  if (!response.ok) {
    const message = getApiErrorMessage(payload);
    throw new ApiError(String(message), response.status);
  }

  return payload as T;
}

export async function uploadFile<T = { file_name: string; file_url: string }>(
  path: string,
  file: File,
  { token, fieldName = "image" }: UploadFileOptions = {},
): Promise<T> {
  const formData = new FormData();
  formData.append(fieldName, file);
  return apiRequest<T>(path, {
    method: "POST",
    token,
    body: formData,
  });
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const queryString = query.toString();
  return queryString ? `?${queryString}` : "";
}

export function resolveAssetUrl(path: string | null | undefined) {
  if (!path) {
    return "";
  }

  if (/^(?:https?:)?\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  if (path.startsWith("/")) {
    try {
      const assetOrigin = new URL(API_BASE_URL, window.location.origin).origin;
      return new URL(path, assetOrigin).toString();
    } catch {
      return path;
    }
  }

  return path;
}

export { API_BASE_URL };
