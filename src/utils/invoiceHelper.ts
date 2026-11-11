import { printDirectHtml } from './printHelper';
import { formatRupiah } from './crypto';
import { getDKandangOfficialLogoSvgString } from '../components/common/DKandangOfficialLogo';

export interface InvoicePrintData {
  invoiceNo: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  visitDate?: string;
  items: { name: string; quantity: number; unitPrice: number; total: number }[];
  discount: number;
  totalAmount: number;
  paymentStatus: string;
  notes: string;
  bankAccountInfo: string;
  companyProfile: { name: string; address: string; phone: string; email: string };
}

function getInvoiceStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      margin: 0;
      padding: 0;
      color: #1e293b; /* slate-800 */
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    * { box-sizing: border-box; }

    .invoice-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #fff;
      display: flex;
      flex-direction: column;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 2px solid #f1f5f9;
    }

    .company-details h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
    }
    
    .company-details p {
      font-size: 11px;
      color: #64748b;
      margin: 0 0 3px 0;
      line-height: 1.4;
      max-width: 250px;
    }

    .invoice-title-block {
      text-align: right;
    }

    .invoice-title-block h2 {
      font-size: 28px;
      font-weight: 800;
      color: #047857; /* emerald-700 */
      margin: 0 0 4px 0;
      letter-spacing: 2px;
    }
    
    .invoice-title-block p {
      font-size: 12px;
      color: #64748b;
      margin: 0;
      font-weight: 600;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;
    }
    
    .meta-box {
      background: #f8fafc;
      padding: 16px;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .meta-box h3 {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      margin: 0 0 12px 0;
      font-weight: 700;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 12px;
    }
    
    .meta-row:last-child {
      margin-bottom: 0;
    }

    .meta-label {
      color: #64748b;
      font-weight: 500;
    }

    .meta-value {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
    }

    .customer-value {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    .items-table th {
      background: #047857;
      color: #ffffff;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 12px;
      text-align: left;
    }

    .items-table th:last-child {
      text-align: right;
      border-top-right-radius: 8px;
    }
    
    .items-table th:first-child {
      border-top-left-radius: 8px;
    }

    .items-table td {
      padding: 14px 12px;
      font-size: 12px;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
    }

    .items-table td:last-child {
      text-align: right;
      font-weight: 600;
    }

    .totals-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }

    .payment-info {
      width: 45%;
      padding: 16px;
      background: #ecfdf5; /* emerald-50 */
      border: 1px solid #a7f3d0; /* emerald-200 */
      border-radius: 12px;
    }

    .payment-info h4 {
      font-size: 11px;
      color: #065f46;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }

    .payment-info p {
      font-size: 12px;
      color: #064e3b;
      margin: 0;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .totals-box {
      width: 45%;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 13px;
      color: #475569;
    }

    .totals-row.grand-total {
      font-size: 18px;
      font-weight: 800;
      color: #047857;
      border-top: 2px solid #e2e8f0;
      margin-top: 4px;
      padding-top: 12px;
    }

    .notes-section {
      margin-bottom: 40px;
    }

    .notes-section h4 {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 8px 0;
    }

    .notes-content {
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
      white-space: pre-wrap;
      padding-left: 12px;
      border-left: 3px solid #cbd5e1;
    }

    .footer-signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 40px;
    }

    .signature-box {
      text-align: center;
      width: 200px;
    }
    
    .signature-title {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 70px;
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
    }

    .badge-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 99px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .badge-status.paid {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .badge-status.dp {
      background: #fef9c3;
      color: #854d0e;
      border: 1px solid #fef08a;
    }
    .badge-status.unpaid {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
  `;
}

function generateInvoiceHtml(data: InvoicePrintData): string {
  const statusClass = data.paymentStatus.toLowerCase() === 'lunas' ? 'paid' 
                    : data.paymentStatus.toLowerCase().includes('dp') ? 'dp' : 'unpaid';

  return `
    <div class="invoice-container">
      <div class="header-section">
        <div class="company-logo-area">
          ${getDKandangOfficialLogoSvgString(200, 85)}
          <div class="company-details" style="margin-top: 12px;">
            <h1>${data.companyProfile.name}</h1>
            <p>${data.companyProfile.address}</p>
            <p>${data.companyProfile.phone} | ${data.companyProfile.email}</p>
          </div>
        </div>
        
        <div class="invoice-title-block">
          <h2>INVOICE</h2>
          <p>${data.invoiceNo}</p>
          <div style="margin-top: 12px;">
            <span class="badge-status ${statusClass}">${data.paymentStatus}</span>
          </div>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <h3>Tagihan Kepada</h3>
          <div class="customer-value">${data.customerName}</div>
        </div>
        
        <div class="meta-box">
          <h3>Detail Tagihan</h3>
          <div class="meta-row">
            <span class="meta-label">Tanggal Terbit</span>
            <span class="meta-value">${data.issueDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Jatuh Tempo</span>
            <span class="meta-value">${data.dueDate}</span>
          </div>
          ${data.visitDate ? `
          <div class="meta-row">
            <span class="meta-label">Tgl. Kunjungan</span>
            <span class="meta-value">${data.visitDate}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <table class="items-table">
        <thead>
          <tr>
            <th>Deskripsi / Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Harga Satuan</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatRupiah(item.unitPrice)}</td>
              <td>${formatRupiah(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="payment-info">
          <h4>Informasi Pembayaran (Transfer via)</h4>
          <p>${data.bankAccountInfo}</p>
        </div>
        
        <div class="totals-box">
          <div class="totals-row">
            <span>Subtotal</span>
            <span style="font-weight: 600;">${formatRupiah(data.items.reduce((s,i) => s + i.total, 0))}</span>
          </div>
          ${data.discount > 0 ? `
          <div class="totals-row" style="color: #e11d48;">
            <span>Diskon</span>
            <span style="font-weight: 600;">- ${formatRupiah(data.discount)}</span>
          </div>
          ` : ''}
          <div class="totals-row grand-total">
            <span>TOTAL TAGIHAN</span>
            <span>${formatRupiah(data.totalAmount)}</span>
          </div>
        </div>
      </div>

      ${data.notes ? `
      <div class="notes-section">
        <h4>Catatan Penting / Syarat Ketentuan</h4>
        <div class="notes-content">${data.notes}</div>
      </div>
      ` : ''}

      <div class="footer-signatures">
        <div class="signature-box">
          <div class="signature-title">Mengetahui, Pelanggan</div>
          <div class="signature-line">${data.customerName}</div>
        </div>
        <div class="signature-box">
          <div class="signature-title">Hormat Kami,</div>
          <div class="signature-line">Finance D'Kandang</div>
        </div>
      </div>
    </div>
  `;
}



export function printInvoice(data: InvoicePrintData) {
  const styles = getInvoiceStyles();
  const html = generateInvoiceHtml(data);
  const title = `Invoice_\${data.invoiceNo.replace(/\\//g, '_')}`;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (isInIframe) {
    const styledHtml = `<style>\${styles}</style>\${html}`;
    printDirectHtml(title, styledHtml);
    return;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>\${title}</title>
            <style>
              \${styles}
              @media print {
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="text-align:center; padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;">
              <button onclick="window.print()" style="background:#047857;color:white;border:none;padding:8px 24px;border-radius:8px;font-weight:bold;cursor:pointer;">Cetak Invoice</button>
            </div>
            \${html}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    } else {
      const styledHtml = `<style>\${styles}</style>\${html}`;
      printDirectHtml(title, styledHtml);
    }
  } catch (err) {
    const styledHtml = `<style>\${styles}</style>\${html}`;
    printDirectHtml(title, styledHtml);
  }
}

export function downloadInvoiceHtmlFile(data: InvoicePrintData) {
  const styles = getInvoiceStyles();
  const invoiceContent = generateInvoiceHtml(data);
  const title = `Invoice_\${data.invoiceNo.replace(/\\//g, '_')}`;
  
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>\${title}</title>
      <style>\${styles}</style>
    </head>
    <body>
      <div style="text-align:center; padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px;" class="no-print">
        <button onclick="window.print()" style="background:#047857;color:white;border:none;padding:12px 32px;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px;">
          Cetak Dokumen ke PDF / Printer
        </button>
      </div>
      \${invoiceContent}
      <style>
        @media print { .no-print { display: none !important; } }
      </style>
    </body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `\${title}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
