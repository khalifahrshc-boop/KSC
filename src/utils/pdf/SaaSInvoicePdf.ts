/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import QRCode from 'qrcode';
import { SaaSInvoice } from '../../types/saas';
import { exportElementToPdf } from './UniversalPdfEngine';

/**
 * Generates a ZATCA Phase 1 compliant TLV Base64 string for Saudi e-Invoicing QR codes.
 * Tags:
 * 1. Seller Name
 * 2. Seller VAT Number
 * 3. Timestamp (ISO 8601)
 * 4. Invoice Total Amount
 * 5. VAT Total Amount
 */
function generateZatcaTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: string,
  vatAmount: string
): string {
  try {
    const encoder = new TextEncoder();
    const getTlv = (tag: number, val: string) => {
      const bytes = encoder.encode(val);
      const buf = new Uint8Array(2 + bytes.length);
      buf[0] = tag;
      buf[1] = bytes.length;
      buf.set(bytes, 2);
      return buf;
    };

    const formattedTime = timestamp.includes('T') ? timestamp : `${timestamp}T12:00:00Z`;

    const tlv1 = getTlv(1, sellerName);
    const tlv2 = getTlv(2, vatNumber);
    const tlv3 = getTlv(3, formattedTime);
    const tlv4 = getTlv(4, totalAmount);
    const tlv5 = getTlv(5, vatAmount);

    const combined = new Uint8Array(
      tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length
    );
    let offset = 0;
    [tlv1, tlv2, tlv3, tlv4, tlv5].forEach(arr => {
      combined.set(arr, offset);
      offset += arr.length;
    });

    let binary = '';
    for (let i = 0; i < combined.length; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Failed to construct ZATCA TLV payload:', e);
    return `${sellerName}|${vatNumber}|${timestamp}|${totalAmount}|${vatAmount}`;
  }
}

export async function generateSaaSInvoicePdf(invoice: SaaSInvoice): Promise<void> {
  // 1. Construct ZATCA Phase 1 QR code Base64 image
  let qrDataUrl = '';
  const sellerNameAr = invoice.sellerNameAr || 'شركة منصة السديري لتقنية المعلومات';
  const sellerNameEn = invoice.sellerNameEn || 'Sudairi SaaS Technology Corp';
  const sellerVat = invoice.sellerVatNumber || '310123456700003';
  const sellerCR = (invoice as any).sellerCR || '1010987654';

  try {
    const zatcaTlv = generateZatcaTlvBase64(
      sellerNameAr,
      sellerVat,
      invoice.issueDate || new Date().toISOString().split('T')[0],
      invoice.totalAmount.toFixed(2),
      invoice.vatAmount.toFixed(2)
    );
    qrDataUrl = await QRCode.toDataURL(zatcaTlv, {
      margin: 1,
      width: 150,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
  } catch (e) {
    console.error('QR Code Generation Error:', e);
  }

  // Formatting helpers
  const fmtCurrency = (val: number) =>
    val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return { textAr: 'مدفوعة', textEn: 'PAID', bg: '#dcfce7', color: '#166534', border: '#86efac' };
      case 'PENDING':
        return { textAr: 'بانتظار الدفع', textEn: 'PENDING', bg: '#fef9c3', color: '#854d0e', border: '#fef08a' };
      case 'PAST_DUE':
      case 'OVERDUE':
        return { textAr: 'متأخرة', textEn: 'PAST DUE', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' };
      case 'CANCELLED':
        return { textAr: 'ملغاة', textEn: 'CANCELLED', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      default:
        return { textAr: status, textEn: status, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  const statusBadge = getStatusBadge(invoice.paymentStatus);

  // 2. Build HTML Invoice Layout Container
  const wrapper = document.createElement('div');
  wrapper.className = 'saas-tax-invoice-pdf-document';
  wrapper.style.fontFamily = "'Cairo', 'Tajawal', sans-serif";
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.padding = '24px';
  wrapper.style.boxSizing = 'border-box';
  wrapper.style.width = '100%';
  wrapper.setAttribute('dir', 'rtl');

  wrapper.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap');
      
      .invoice-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #0f172a;
        color: #ffffff;
        padding: 20px 24px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .invoice-title-block h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #38bdf8;
      }
      .invoice-title-block h2 {
        margin: 4px 0 0 0;
        font-size: 13px;
        font-weight: 600;
        color: #94a3b8;
      }
      .invoice-meta-badge {
        text-align: left;
      }
      .invoice-num {
        font-family: monospace;
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
      }
      .status-pill {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        margin-top: 6px;
      }
      .party-cards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 20px;
      }
      .party-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
      }
      .party-card-title {
        font-size: 12px;
        font-weight: 800;
        color: #0369a1;
        text-transform: uppercase;
        border-bottom: 2px solid #e0f2fe;
        padding-bottom: 6px;
        margin-bottom: 10px;
        display: flex;
        justify-content: space-between;
      }
      .party-name-ar {
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
      }
      .party-name-en {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 8px;
      }
      .party-detail {
        font-size: 12px;
        color: #334155;
        margin-bottom: 4px;
        display: flex;
        justify-content: space-between;
      }
      .party-detail span.label {
        color: #64748b;
      }
      .party-detail span.val {
        font-weight: 600;
        font-family: monospace, 'Cairo';
      }
      .invoice-details-bar {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 20px;
        text-align: center;
      }
      .meta-item .meta-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
      }
      .meta-item .meta-val {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        margin-top: 2px;
        font-family: monospace, 'Cairo';
      }
      .items-table-container {
        margin-bottom: 20px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
      }
      .items-table th {
        background: #1e293b;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 10px 12px;
        text-align: right;
        border-bottom: 2px solid #0f172a;
      }
      .items-table td {
        padding: 12px;
        font-size: 12px;
        color: #334155;
        border-bottom: 1px solid #e2e8f0;
        vertical-align: top;
      }
      .items-table tr:nth-child(even) td {
        background: #f8fafc;
      }
      .item-desc-ar {
        font-weight: 700;
        color: #0f172a;
      }
      .item-desc-en {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
      }
      .summary-qr-section {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: 20px;
        align-items: start;
        margin-bottom: 24px;
      }
      .qr-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }
      .qr-box img {
        width: 130px;
        height: 130px;
        margin: 0 auto;
        display: block;
      }
      .qr-caption {
        font-size: 10px;
        color: #64748b;
        margin-top: 6px;
        line-height: 1.3;
        font-weight: 600;
      }
      .financial-summary-box {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 16px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #334155;
        padding: 6px 0;
        border-bottom: 1px dashed #e2e8f0;
      }
      .summary-row.total-row {
        border-bottom: none;
        border-top: 2px solid #0284c7;
        padding-top: 10px;
        margin-top: 6px;
        font-size: 16px;
        font-weight: 800;
        color: #0369a1;
      }
      .legal-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 14px;
        text-align: center;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
      }
    </style>

    <!-- 1. Header Banner -->
    <div class="invoice-header">
      <div class="invoice-title-block">
        <h1>فاتورة ضريبية</h1>
        <h2>TAX INVOICE — SAAS SUBSCRIPTION</h2>
      </div>
      <div class="invoice-meta-badge">
        <div class="invoice-num" dir="ltr">${invoice.invoiceNumber}</div>
        <div class="status-pill" style="background:${statusBadge.bg}; color:${statusBadge.color}; border:1px solid ${statusBadge.border}">
          ${statusBadge.textAr} / ${statusBadge.textEn}
        </div>
      </div>
    </div>

    <!-- 2. Parties Grid -->
    <div class="party-cards-grid">
      <!-- Seller Card -->
      <div class="party-card">
        <div class="party-card-title">
          <span>المورد / ISSUER (SELLER)</span>
          <span>الطرف الأول</span>
        </div>
        <div class="party-name-ar">${sellerNameAr}</div>
        <div class="party-name-en" dir="ltr">${sellerNameEn}</div>
        <div class="party-detail">
          <span class="label">الرقم الضريبي (VAT No):</span>
          <span class="val" dir="ltr">${sellerVat}</span>
        </div>
        <div class="party-detail">
          <span class="label">السجل التجاري (CR No):</span>
          <span class="val" dir="ltr">${sellerCR}</span>
        </div>
        <div class="party-detail">
          <span class="label">الدولة والمنطقة:</span>
          <span class="val">المملكة العربية السعودية (KSA)</span>
        </div>
      </div>

      <!-- Customer Card -->
      <div class="party-card">
        <div class="party-card-title">
          <span>العميل / BUYER (CUSTOMER)</span>
          <span>الطرف الثاني</span>
        </div>
        <div class="party-name-ar">${invoice.customerNameAr || invoice.customerNameEn}</div>
        <div class="party-name-en" dir="ltr">${invoice.customerNameEn}</div>
        <div class="party-detail">
          <span class="label">الرقم الضريبي (VAT No):</span>
          <span class="val" dir="ltr">${invoice.customerVatNumber || 'غ/م - N/A'}</span>
        </div>
        <div class="party-detail">
          <span class="label">السجل التجاري (CR No):</span>
          <span class="val" dir="ltr">${invoice.customerCR || 'غ/م - N/A'}</span>
        </div>
        <div class="party-detail">
          <span class="label">معرف الحساب (Tenant ID):</span>
          <span class="val" dir="ltr">${invoice.tenantId}</span>
        </div>
      </div>
    </div>

    <!-- 3. Invoice Metadata Strip -->
    <div class="invoice-details-bar">
      <div class="meta-item">
        <div class="meta-label">تاريخ الإصدار / Issue Date</div>
        <div class="meta-val" dir="ltr">${invoice.issueDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">تاريخ الاستحقاق / Due Date</div>
        <div class="meta-val" dir="ltr">${invoice.dueDate}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">فترة الفوترة / Billing Period</div>
        <div class="meta-val" dir="ltr">${invoice.billingPeriodStart} - ${invoice.billingPeriodEnd}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">رمز الاشتراك / Sub ID</div>
        <div class="meta-val" dir="ltr">${invoice.subscriptionId}</div>
      </div>
    </div>

    <!-- 4. Items Table -->
    <div class="items-table-container">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">#</th>
            <th>بيان الخدمة / Item Description</th>
            <th style="text-align: center;">فترة الفوترة / Cycle</th>
            <th style="text-align: left;">المبلغ (ر.س) / Subtotal</th>
            <th style="text-align: center;">نسبة الضريبة</th>
            <th style="text-align: left;">الضريبة (ر.س) / VAT</th>
            <th style="text-align: left;">الإجمالي (ر.س) / Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; font-weight: 700;">1</td>
            <td>
              <div class="item-desc-ar">اشتراك منصة البرمجيات — ${invoice.planNameAr}</div>
              <div class="item-desc-en" dir="ltr">SaaS Software Subscription — ${invoice.planNameEn}</div>
            </td>
            <td style="text-align: center; font-size: 11px; font-family: monospace;" dir="ltr">
              ${invoice.billingPeriodStart}<br> إلى <br>${invoice.billingPeriodEnd}
            </td>
            <td style="text-align: left; font-weight: 600; font-family: monospace;" dir="ltr">
              SAR ${fmtCurrency(invoice.subtotal)}
            </td>
            <td style="text-align: center; font-weight: 700;">
              ${invoice.vatRate}%
            </td>
            <td style="text-align: left; font-weight: 600; font-family: monospace;" dir="ltr">
              SAR ${fmtCurrency(invoice.vatAmount)}
            </td>
            <td style="text-align: left; font-weight: 800; color: #0369a1; font-family: monospace;" dir="ltr">
              SAR ${fmtCurrency(invoice.totalAmount)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 5. ZATCA QR Code & Summary -->
    <div class="summary-qr-section">
      <!-- QR Box -->
      <div class="qr-box">
        ${qrDataUrl ? `<img src="${qrDataUrl}" alt="ZATCA QR Code" />` : ''}
        <div class="qr-caption">
          رمز الاستجابة السريعة للفوترة الإلكترونية<br>
          <strong>ZATCA Phase 1 Compliant</strong>
        </div>
      </div>

      <!-- Financial Totals -->
      <div class="financial-summary-box">
        <div class="summary-row">
          <span>المجموع غير شامل ضريبة القيمة المضافة / Subtotal:</span>
          <span style="font-family: monospace; font-weight: 700;" dir="ltr">SAR ${fmtCurrency(invoice.subtotal)}</span>
        </div>

        ${
          invoice.discount > 0
            ? `
          <div class="summary-row" style="color: #dc2626;">
            <span>الخصم المطبق / Discount:</span>
            <span style="font-family: monospace; font-weight: 700;" dir="ltr">-SAR ${fmtCurrency(invoice.discount)}</span>
          </div>
          <div class="summary-row">
            <span>المبلغ الخاضع للضريبة / Taxable Amount:</span>
            <span style="font-family: monospace; font-weight: 700;" dir="ltr">SAR ${fmtCurrency(invoice.subtotal - invoice.discount)}</span>
          </div>
        `
            : ''
        }

        <div class="summary-row">
          <span>ضريبة القيمة المضافة (${invoice.vatRate}%) / VAT Amount:</span>
          <span style="font-family: monospace; font-weight: 700;" dir="ltr">SAR ${fmtCurrency(invoice.vatAmount)}</span>
        </div>

        <div class="summary-row total-row">
          <span>إجمالي المبلغ المستحق / Grand Total:</span>
          <span dir="ltr">SAR ${fmtCurrency(invoice.totalAmount)}</span>
        </div>
      </div>
    </div>

    <!-- 6. Footer -->
    <div class="legal-footer">
      <div>هذه الفاتورة صالحة رسمياً ومصدرة آلياً بموجب نظام الفوترة الإلكترونية بالمملكة العربية السعودية (ZATCA Phase 1)</div>
      <div style="margin-top: 4px; font-size: 10px; color: #94a3b8;" dir="ltr">
        Official Computer-Generated SaaS Tax Invoice — Saudi Commercial Code Compliant — Document Ref: ${invoice.id}
      </div>
    </div>
  `;

  // 3. Export to PDF using UniversalPdfEngine
  await exportElementToPdf(wrapper, {
    filename: `${invoice.invoiceNumber}.pdf`,
    isRtl: true,
    margin: [6, 6, 6, 6]
  });
}

