import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api";
import { formatDateTime, paymentLabels, paymentStatusLabels } from "@/lib/admin";
import { formatCurrency } from "@/lib/catalog";
import { OrderInvoice } from "@/types/domain";
import { toast } from "sonner";

const invoiceStyles = `
  .order-invoice-page {
    width: 100%;
  }
  .order-invoice-shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 20px 0 28px;
  }
  .order-invoice-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .order-invoice-paper {
    background: #ffffff;
    border: 1px solid rgba(17, 70, 184, 0.1);
    box-shadow: 0 20px 48px rgba(19, 68, 168, 0.11);
    border-radius: 22px;
    padding: 20px 22px;
  }
  .order-invoice-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 240px;
    gap: 18px;
    padding-bottom: 16px;
    border-bottom: 2px solid #edf3ff;
  }
  .order-invoice-brand h1 {
    margin: 0 0 8px;
    font-size: 1.8rem;
    letter-spacing: 0.02em;
    color: #12376e;
  }
  .order-invoice-brand p {
    margin: 4px 0;
    line-height: 1.55;
    color: #30486f;
  }
  .order-invoice-code-box {
    padding: 14px 16px;
    border-radius: 16px;
    background: #f7faff;
    border: 1px solid #dfe8f7;
  }
  .order-invoice-code-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 0;
    border-bottom: 1px dashed #d8e3f8;
  }
  .order-invoice-code-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  .order-invoice-code-row span {
    color: #6d7c97;
  }
  .order-invoice-code-row strong {
    text-align: right;
    color: #173153;
  }
  .order-invoice-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin-top: 14px;
  }
  .order-invoice-card {
    padding: 14px 16px;
    border-radius: 16px;
    background: #f7faff;
    border: 1px solid #dfe8f7;
  }
  .order-invoice-card h2 {
    margin: 0 0 8px;
    font-size: 1rem;
    color: #173153;
  }
  .order-invoice-card p {
    margin: 4px 0;
    line-height: 1.55;
    color: #314a70;
  }
  .order-invoice-meta-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 12px;
  }
  .order-invoice-meta-item {
    padding: 12px 14px;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid #dfe8f7;
  }
  .order-invoice-meta-item small {
    display: block;
    color: #6d7c97;
    font-size: 0.79rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 6px;
  }
  .order-invoice-meta-item strong {
    display: block;
    line-height: 1.45;
    color: #173153;
  }
  .order-invoice-table-wrap {
    margin-top: 14px;
    overflow-x: auto;
  }
  .order-invoice-table {
    width: 100%;
    min-width: 560px;
    border-collapse: collapse;
  }
  .order-invoice-table th,
  .order-invoice-table td {
    padding: 10px 10px;
    border-bottom: 1px solid #e8effb;
    text-align: left;
    vertical-align: top;
  }
  .order-invoice-table thead th {
    background: #f4f8ff;
    color: #59718f;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .order-invoice-table th:nth-child(1),
  .order-invoice-table td:nth-child(1) {
    width: 42px;
    text-align: center;
  }
  .order-invoice-table th:nth-child(3),
  .order-invoice-table td:nth-child(3),
  .order-invoice-table th:nth-child(4),
  .order-invoice-table td:nth-child(4),
  .order-invoice-table th:nth-child(5),
  .order-invoice-table td:nth-child(5) {
    white-space: nowrap;
  }
  .order-invoice-table th:nth-child(5),
  .order-invoice-table td:nth-child(5) {
    text-align: right;
  }
  .order-invoice-item-name {
    font-weight: 700;
    color: #173153;
  }
  .order-invoice-summary {
    margin-top: 14px;
    display: grid;
    justify-content: end;
  }
  .order-invoice-summary-box {
    width: min(100%, 320px);
    padding: 14px 16px;
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #dfe8f7;
  }
  .order-invoice-summary-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    color: #314a70;
  }
  .order-invoice-summary-row.total {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid #dce7f8;
    font-size: 1.08rem;
    font-weight: 800;
    color: #d62839;
  }
  .order-invoice-foot {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;
  }
  .order-invoice-sign {
    padding-top: 10px;
    border-top: 1px solid #e6eefb;
    text-align: center;
  }
  .order-invoice-sign h3 {
    margin: 0 0 34px;
    font-size: 0.96rem;
    color: #173153;
  }
  .order-invoice-sign p {
    margin: 0;
    font-weight: 700;
    color: #173153;
  }
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  @media print {
    html,
    body,
    #root,
    #root > div,
    #root > div > main {
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
    }
    #root > div {
      display: block !important;
    }
    #root > div > header,
    #root > div > footer {
      display: none !important;
    }
    #root > div > main {
      padding-top: 0 !important;
    }
    .page-shell {
      max-width: none !important;
      padding: 0 !important;
    }
    body {
      background: #ffffff;
    }
    .order-invoice-page {
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
      break-after: auto;
    }
    .order-invoice-shell {
      max-width: none;
      padding: 0;
    }
    .order-invoice-toolbar {
      display: none !important;
    }
    .order-invoice-paper {
      border: none;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .order-invoice-table-wrap {
      overflow: visible;
    }
  }
  @media (max-width: 720px) {
    .order-invoice-head,
    .order-invoice-grid,
    .order-invoice-meta-grid,
    .order-invoice-foot {
      grid-template-columns: 1fr;
    }
    .order-invoice-paper {
      padding: 18px;
    }
    .order-invoice-brand h1 {
      font-size: 1.55rem;
    }
    .order-invoice-summary {
      justify-content: stretch;
    }
    .order-invoice-summary-box {
      width: 100%;
    }
  }
`;

const OrderInvoicePage = () => {
  const { orderId } = useParams();
  const { token, isReady } = useAuth();
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const parsedOrderId = Number.parseInt(orderId || "", 10);

  useEffect(() => {
    if (!isReady || !token || !Number.isFinite(parsedOrderId)) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    apiRequest<OrderInvoice>(`/orders/${parsedOrderId}/invoice`, { token })
      .then(setInvoice)
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Không tải được hóa đơn.");
      })
      .finally(() => setIsLoading(false));
  }, [isReady, parsedOrderId, token]);

  const subtotal = useMemo(() => invoice?.subtotal_amount ?? 0, [invoice]);
  const shippingFee = useMemo(() => invoice?.shipping_fee ?? 0, [invoice]);

  if (isLoading) {
    return <div className="page-shell py-12">Đang tải hóa đơn...</div>;
  }

  if (!invoice) {
    return <div className="page-shell py-12 text-center">Không tìm thấy hóa đơn cho đơn hàng này.</div>;
  }

  return (
    <div className="page-shell order-invoice-page">
      <style>{invoiceStyles}</style>

      <div className="order-invoice-shell">
        <div className="order-invoice-toolbar">
          <Button variant="outline" asChild>
            <Link to={`/don-hang/${invoice.sales_order_id}`}>
              <ArrowLeft className="h-4 w-4" />
              Quay lại chi tiết đơn
            </Link>
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            In / xuất hóa đơn
          </Button>
        </div>

        <section className="order-invoice-paper">
          <div className="order-invoice-head">
            <div className="order-invoice-brand">
              <h1>HÓA ĐƠN BÁN HÀNG</h1>
              <p>
                <strong>{invoice.store_name}</strong>
              </p>
              <p>{invoice.store_address}</p>
            </div>

            <div className="order-invoice-code-box">
              <div className="order-invoice-code-row">
                <span>Mã hóa đơn</span>
                <strong>{invoice.invoice_code}</strong>
              </div>
              <div className="order-invoice-code-row">
                <span>Mã đơn hàng</span>
                <strong>{invoice.order_code}</strong>
              </div>
              <div className="order-invoice-code-row">
                <span>Ngày lập</span>
                <strong>{formatDateTime(invoice.invoice_printed_at)}</strong>
              </div>
            </div>
          </div>

          <div className="order-invoice-grid">
            <div className="order-invoice-card">
              <h2>Thông tin người mua</h2>
              <p>
                <strong>{invoice.consignee_name}</strong>
              </p>
              <p>{invoice.consignee_phone}</p>
              <p>{invoice.delivery_line}</p>
              {invoice.delivery_note ? <p>Ghi chú: {invoice.delivery_note}</p> : null}
            </div>

            <div className="order-invoice-card">
              <h2>Thông tin xử lý đơn</h2>
              <p>
                Nhân viên phụ trách: <strong>{invoice.invoice_staff_display_name}</strong>
              </p>
              <p>
                Phương thức thanh toán: <strong>{paymentLabels[invoice.payment_method]}</strong>
              </p>
              <p>
                Trạng thái thanh toán: <strong>{paymentStatusLabels[invoice.payment_status]}</strong>
              </p>
            </div>
          </div>

          <div className="order-invoice-meta-grid">
            <div className="order-invoice-meta-item">
              <small>Tạm tính sau hệ thống</small>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="order-invoice-meta-item">
              <small>Phí giao hàng</small>
              <strong>{shippingFee > 0 ? formatCurrency(shippingFee) : "0 đ"}</strong>
            </div>
            <div className="order-invoice-meta-item">
              <small>Nội dung thanh toán</small>
              <strong>{invoice.payment_reference}</strong>
            </div>
          </div>

          <div className="order-invoice-table-wrap">
            <table className="order-invoice-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Sản phẩm</th>
                  <th>Đơn giá</th>
                  <th>SL</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, index) => (
                  <tr key={line.order_line_id}>
                    <td>{index + 1}</td>
                    <td>
                      <span className="order-invoice-item-name">{line.item_title_snapshot}</span>
                    </td>
                    <td>{formatCurrency(line.unit_price_snapshot)}</td>
                    <td>{line.ordered_qty}</td>
                    <td>
                      <strong>{formatCurrency(line.line_total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="order-invoice-summary">
            <div className="order-invoice-summary-box">
              <div className="order-invoice-summary-row">
                <span>Tạm tính sau hệ thống</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <div className="order-invoice-summary-row">
                <span>Phí giao hàng</span>
                <strong>{shippingFee > 0 ? formatCurrency(shippingFee) : "0 đ"}</strong>
              </div>
              <div className="order-invoice-summary-row total">
                <span>Tổng thanh toán</span>
                <strong>{formatCurrency(invoice.grand_total)}</strong>
              </div>
            </div>
          </div>

          <div className="order-invoice-foot">
            <div className="order-invoice-sign">
              <h3>Người mua hàng</h3>
              <p>{invoice.consignee_name}</p>
            </div>
            <div className="order-invoice-sign">
              <h3>Người lập hóa đơn</h3>
              <p>{invoice.invoice_staff_display_name}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OrderInvoicePage;
