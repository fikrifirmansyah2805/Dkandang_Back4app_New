/**
 * Utilitas Resmi Generator & Cetak Kwitansi D'Kandang Amazing Farm
 * Menghasilkan dokumen kwitansi 1:1 sesuai desain resmi D'Kandang Amazing Farm
 * Mendukung konversi terbilang, stempel digital resmi, watermark peternakan, dan cetak PDF.
 */

import { terbilangRupiah, formatTanggalIndo } from './quotationExporter';
import { getDKandangOfficialLogoSvgString } from '../components/common/DKandangOfficialLogo';
import { printDirectHtml } from './printHelper';

export interface KwitansiData {
  receiptNo: string;
  date: string;
  receivedFrom: string;
  amount: number;
  amountInWords?: string;
  paymentFor: string;
  paymentStage?: string;
  paymentMethod?: string;
  bankAccount?: string;
  signatoryName: string;
  signatoryRole: string;
  includeStamp?: boolean;
  includeSignature?: boolean;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyInstagram?: string;
}

/**
 * Generate nomor kwitansi otomatis berstandar D'Kandang (KWT/YYYY/MM/XXXX)
 */
export function generateReceiptNumber(customIndex?: number | string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const rand = customIndex 
    ? String(customIndex).padStart(4, '0') 
    : String(Math.floor(1000 + Math.random() * 9000));
  return `KWT/${year}/${month}/${rand}`;
}

/**
 * Format mata uang Rupiah standar kwitansi
 */
export function formatRupiahKwitansi(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Mengambil styling CSS lengkap untuk dokumen cetak / download PDF
 */
export function getKwitansiStyles(): string {
  return `
    @page {
      size: A4 landscape;
      margin: 10mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      color: #0c2340;
      -webkit-font-smoothing: antialiased;
    }
    .kwitansi-outer {
      width: 100%;
      max-width: 960px;
      margin: 20px auto;
      background: #faf8f5;
      border: 1.5px solid #0c2340;
      border-radius: 4px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      padding: 28px 36px 20px 36px;
      min-height: 520px;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .kwitansi-outer {
        box-shadow: none !important;
        margin: 0 auto !important;
        max-width: 100% !important;
        border: 1.5px solid #0c2340 !important;
        page-break-inside: avoid !important;
      }
      .no-print-bar {
        display: none !important;
      }
    }
    .corner-top-left {
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      border-top: 42px solid #0c2340;
      border-right: 42px solid transparent;
      z-index: 2;
    }
    .corner-top-left-accent {
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      border-top: 24px solid #f37021;
      border-right: 24px solid transparent;
      z-index: 3;
    }
    .corner-bottom-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: #f37021;
      display: flex;
    }
    .corner-bottom-bar::after {
      content: '';
      position: absolute;
      right: 0;
      bottom: 0;
      width: 180px;
      height: 6px;
      background: #0c2340;
      clip-path: polygon(15px 0, 100% 0, 100% 100%, 0 100%);
    }
    .watermark-farm {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 320px;
      height: 240px;
      opacity: 0.18;
      pointer-events: none;
      z-index: 1;
    }
    .header-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      z-index: 2;
      margin-bottom: 24px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 18px;
    }
    .header-divider {
      width: 2px;
      height: 60px;
      background: #0c2340;
    }
    .header-title-box h1 {
      font-size: 28px;
      font-weight: 900;
      color: #0c2340;
      letter-spacing: 2px;
      margin: 0;
      line-height: 1.1;
    }
    .header-title-box p {
      font-size: 13px;
      font-weight: 800;
      color: #557f56;
      letter-spacing: 4px;
      margin: 4px 0 0 0;
      text-transform: uppercase;
    }
    .header-meta {
      text-align: left;
      font-size: 14px;
      font-weight: 600;
      color: #0c2340;
      min-width: 260px;
    }
    .header-meta-row {
      display: flex;
      align-items: baseline;
      margin-bottom: 8px;
    }
    .header-meta-label {
      width: 80px;
      font-weight: 700;
      color: #0c2340;
    }
    .header-meta-val {
      flex: 1;
      font-family: 'Plus Jakarta Sans', monospace;
      font-weight: 700;
      border-bottom: 1.5px dotted #64748b;
      padding-bottom: 1px;
    }
    .body-form {
      position: relative;
      z-index: 2;
      margin-bottom: 24px;
    }
    .form-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .form-label {
      width: 170px;
      font-weight: 700;
      color: #0c2340;
      padding-top: 4px;
      flex-shrink: 0;
    }
    .form-colon {
      width: 15px;
      font-weight: 700;
      color: #0c2340;
      padding-top: 4px;
      flex-shrink: 0;
    }
    .form-content-line {
      flex: 1;
      font-weight: 700;
      color: #0c2340;
      border-bottom: 1.5px dotted #64748b;
      padding: 3px 6px;
      min-height: 26px;
      line-height: 1.5;
    }
    .terbilang-box {
      flex: 1;
      background: #f4efe6;
      border-radius: 8px;
      padding: 10px 14px;
      border: 1px solid #e7dfd3;
    }
    .terbilang-line {
      border-bottom: 1.5px dotted #94a3b8;
      min-height: 22px;
      font-weight: 700;
      color: #0c2340;
      font-style: italic;
      line-height: 1.5;
      padding-bottom: 2px;
      margin-bottom: 6px;
    }
    .terbilang-line:last-child {
      margin-bottom: 0;
    }
    .desc-box {
      flex: 1;
    }
    .desc-line {
      border-bottom: 1.5px dotted #64748b;
      min-height: 24px;
      font-weight: 600;
      color: #0c2340;
      line-height: 1.6;
      padding: 2px 4px;
      margin-bottom: 6px;
    }
    .desc-line:last-child {
      margin-bottom: 0;
    }
    .bottom-grid {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      position: relative;
      z-index: 2;
      margin-top: 20px;
      margin-bottom: 24px;
    }
    .amount-badge-container {
      display: flex;
      align-items: stretch;
      min-width: 380px;
      border-radius: 4px;
      overflow: hidden;
      border: 1.5px solid #0c2340;
    }
    .amount-badge-label {
      background: #0c2340;
      color: #ffffff;
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1.5px;
      padding: 10px 22px 10px 16px;
      clip-path: polygon(0 0, 100% 0, 80% 100%, 0 100%);
      display: flex;
      align-items: center;
      position: relative;
    }
    .amount-badge-label::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background: #f37021;
    }
    .amount-badge-value {
      flex: 1;
      background: #ffffff;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      font-size: 18px;
      font-weight: 900;
      color: #0c2340;
      font-family: 'Plus Jakarta Sans', monospace;
      border-left: 2px solid #f37021;
    }
    .amount-dotted-tail {
      flex: 1;
      border-bottom: 1.5px dotted #64748b;
      margin-left: 10px;
      height: 14px;
    }
    .signature-container {
      text-align: center;
      min-width: 240px;
      position: relative;
    }
    .signature-title {
      font-size: 13px;
      font-weight: 600;
      color: #0c2340;
      margin-bottom: 8px;
    }
    .signature-space {
      height: 68px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .stamp-badge {
      position: absolute;
      transform: rotate(-10deg);
      border: 2.5px solid #059669;
      color: #059669;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 900;
      font-size: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.85;
      background: rgba(236, 253, 245, 0.8);
    }
    .signature-name {
      font-size: 13px;
      font-weight: 700;
      color: #0c2340;
      border-bottom: 1.5px dotted #64748b;
      padding-bottom: 2px;
      display: inline-block;
      min-width: 200px;
    }
    .signature-role {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .footer-divider {
      width: 100%;
      height: 1.5px;
      background: #0c2340;
      margin-bottom: 12px;
    }
    .footer-grid {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #334155;
      position: relative;
      z-index: 2;
      padding-bottom: 6px;
    }
    .footer-left {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      max-width: 58%;
    }
    .footer-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .footer-icon-pin {
      color: #f37021;
      font-size: 14px;
      margin-top: 1px;
    }
    .footer-contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;
    }
  `;
}

/**
 * Reserved space for manual logo placement
 */
export function getDKandangLogoSvg(): string {
  return `
    <div style="display: flex; align-items: center; width: 195px; height: 75px;">
      <!-- Area Kosong untuk Menaruh Logo Manual -->
    </div>
  `;
}

/**
 * Farm Barn Watermark Illustration persis seperti di foto
 */
export function getFarmWatermarkSvg(): string {
  return `
    <svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#786c55" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <!-- Ground Line -->
      <line x1="10" y1="200" x2="310" y2="200" stroke-dasharray="4 2"/>
      
      <!-- Trees Left -->
      <path d="M 35 200 L 35 170 M 20 170 C 15 150 35 130 50 145 C 65 130 80 150 75 170 C 70 185 25 185 20 170 Z" fill="#e8e1d5" fill-opacity="0.25"/>
      <path d="M 75 200 L 75 175 M 65 175 C 60 160 75 145 85 155 C 95 145 105 160 100 175 Z" fill="#e8e1d5" fill-opacity="0.2"/>

      <!-- Ranch Fence -->
      <line x1="90" y1="180" x2="160" y2="180"/>
      <line x1="90" y1="190" x2="160" y2="190"/>
      <line x1="105" y1="172" x2="105" y2="200"/>
      <line x1="125" y1="172" x2="125" y2="200"/>
      <line x1="145" y1="172" x2="145" y2="200"/>

      <!-- Main Barn House -->
      <!-- Barn Roof -->
      <polygon points="215,90 260,125 170,125" fill="#f4efe6" fill-opacity="0.4"/>
      <!-- Cupola / Rooster Weather Vane -->
      <rect x="210" y="70" width="10" height="20" fill="#f4efe6"/>
      <polygon points="215,60 223,70 207,70"/>
      <line x1="215" y1="60" x2="215" y2="48"/>
      <!-- Weather vane arrow & rooster -->
      <line x1="208" y1="52" x2="222" y2="52"/>
      <path d="M 213 48 Q 216 42 220 45 Q 217 50 213 48 Z" fill="#786c55"/>

      <!-- Barn Body -->
      <rect x="175" y="125" width="80" height="75" fill="#faf8f5" fill-opacity="0.6"/>
      <!-- Barn Loft Window -->
      <rect x="205" y="132" width="20" height="18"/>
      <line x1="205" y1="132" x2="225" y2="150"/>
      <line x1="225" y1="132" x2="205" y2="150"/>

      <!-- Big Barn Door with X braces -->
      <rect x="195" y="155" width="40" height="45"/>
      <line x1="195" y1="155" x2="215" y2="200"/>
      <line x1="215" y1="155" x2="195" y2="200"/>
      <line x1="215" y1="155" x2="235" y2="200"/>
      <line x1="235" y1="155" x2="215" y2="200"/>
      <line x1="215" y1="155" x2="215" y2="200"/>

      <!-- Silo Right -->
      <path d="M 270 120 C 270 100 295 100 295 120 L 295 200 L 270 200 Z" fill="#f4efe6" fill-opacity="0.4"/>
      <line x1="270" y1="135" x2="295" y2="135"/>
      <line x1="270" y1="155" x2="295" y2="155"/>
      <line x1="270" y1="175" x2="295" y2="175"/>
      <!-- Silo Dome Roof Lines -->
      <path d="M 273 115 Q 282 105 292 115"/>
    </svg>
  `;
}

/**
 * Generate string HTML Kwitansi lengkap
 */
export function generateKwitansiHtml(data: KwitansiData): string {
  const terbilang = data.amountInWords || terbilangRupiah(data.amount);
  const tanggalFormat = formatTanggalIndo(data.date);
  const nominalFormatted = formatRupiahKwitansi(data.amount);

  const companyAddress = data.companyAddress || "Jl. Penarikan, RT.01/RW.02, Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519";
  const companyPhone = data.companyPhone || "0857-1997-7773";
  const companyInstagram = data.companyInstagram || "@dkandang";

  return `
    <div class="kwitansi-outer">
      <!-- Top Left Geometric Accents -->
      <div class="corner-top-left"></div>
      <div class="corner-top-left-accent"></div>

      <!-- Bottom Geometric Bar -->
      <div class="corner-bottom-bar"></div>

      <!-- Farm Barn Watermark -->
      <div class="watermark-farm">
        ${getFarmWatermarkSvg()}
      </div>

      <!-- Top Header -->
      <div class="header-grid">
        <div class="header-left">
          ${getDKandangLogoSvg()}
          <div class="header-divider"></div>
          <div class="header-title-box">
            <h1>KWITANSI</h1>
            <p>PENERIMAAN UANG</p>
          </div>
        </div>

        <div class="header-meta">
          <div class="header-meta-row">
            <div class="header-meta-label">No.</div>
            <div class="header-meta-val">${data.receiptNo}</div>
          </div>
          <div class="header-meta-row">
            <div class="header-meta-label">Tanggal :</div>
            <div class="header-meta-val">${tanggalFormat}</div>
          </div>
        </div>
      </div>

      <!-- Form Content -->
      <div class="body-form">
        <!-- Row 1: Telah terima dari -->
        <div class="form-row">
          <div class="form-label">Telah terima dari</div>
          <div class="form-colon">:</div>
          <div class="form-content-line">
            ${data.receivedFrom || '................................................................................................................'}
          </div>
        </div>

        <!-- Row 2: Uang sejumlah (Terbilang) -->
        <div class="form-row">
          <div class="form-label">Uang sejumlah</div>
          <div class="form-colon">:</div>
          <div class="terbilang-box">
            <div class="terbilang-line"># ${terbilang} #</div>
          </div>
        </div>

        <!-- Row 3: Untuk pembayaran -->
        <div class="form-row">
          <div class="form-label">Untuk pembayaran</div>
          <div class="form-colon">:</div>
          <div class="desc-box">
            <div class="desc-line">${data.paymentFor || 'Pembayaran Kunjungan Edukasi Agrowisata D\'Kandang Amazing Farm'}</div>
            ${data.paymentMethod ? `<div class="desc-line">Metode Transaksi: ${data.paymentMethod} ${data.bankAccount ? `(${data.bankAccount})` : ''}</div>` : ''}
          </div>
        </div>
      </div>

      <!-- Bottom Amount & Signatures -->
      <div class="bottom-grid">
        <!-- Amount Box -->
        <div class="amount-badge-container">
          <div class="amount-badge-label">JUMLAH</div>
          <div class="amount-badge-value">
            <span>Rp. ${nominalFormatted} ,-</span>
            <div class="amount-dotted-tail"></div>
          </div>
        </div>

        <!-- Signature Block -->
        <div class="signature-container">
          <div class="signature-title">Hormat kami,</div>
          <div class="signature-space"></div>
          <div class="signature-name">( ${data.signatoryName || 'Bagian Keuangan & Kasir'} )</div>
          <div class="signature-role">${data.signatoryRole || "Finance & Treasury D'Kandang Farm"}</div>
        </div>
      </div>

      <!-- Footer Divider -->
      <div class="footer-divider"></div>

      <!-- Footer Info -->
      <div class="footer-grid">
        <div class="footer-left">
          <span class="footer-icon-pin">📍</span>
          <div>
            <strong style="color: #0c2340; display: block; margin-bottom: 2px;">D'Kandang Amazing Farm</strong>
            <span>${companyAddress}</span>
          </div>
        </div>

        <div class="footer-right">
          <div class="footer-contact-item">
            <span style="color: #f37021;">📞</span>
            <span>${companyPhone}</span>
          </div>
          <div class="footer-contact-item">
            <span style="color: #f37021;">📸</span>
            <span>${companyInstagram}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Mencetak kwitansi langsung atau membuka dialog Print / Save as PDF
 */
export function printKwitansi(data: KwitansiData) {
  const styles = getKwitansiStyles();
  const kwitansiContent = generateKwitansiHtml(data);
  const title = `Kwitansi_${data.receiptNo.replace(/\//g, '_')}`;

  // In iframe environments (e.g. AI Studio preview), popups are blocked.
  // Use in-page print which is 100% reliable and doesn't trigger popup warnings.
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  if (isInIframe) {
    const styledHtml = `<style>${styles}</style>${kwitansiContent}`;
    printDirectHtml(title, styledHtml);
    return;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (!printWindow || !printWindow.document) {
      const styledHtml = `<style>${styles}</style>${kwitansiContent}`;
      printDirectHtml(title, styledHtml);
      return;
    }

    printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Kwitansi Resmi - ${data.receiptNo} - D'Kandang Amazing Farm</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap" rel="stylesheet">
      <style>
        ${styles}
        .no-print-bar {
          max-width: 960px;
          margin: 16px auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .btn-print {
          background: #059669;
          color: white;
          border: none;
          padding: 8px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: inherit;
        }
        .btn-print:hover {
          background: #047857;
        }
        .btn-close {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          font-family: inherit;
        }
      </style>
    </head>
    <body>
      <div class="no-print-bar">
        <div>
          <strong style="color: #0c2340; font-size: 14px;">Pratinjau Cetak Kwitansi D'Kandang Amazing Farm</strong>
          <div style="font-size: 12px; color: #64748b;">Gunakan opsi 'Save as PDF' pada dialog cetak untuk mengunduh berkas PDF.</div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn-close" onclick="window.close()">Tutup Jendela</button>
          <button class="btn-print" onclick="window.print()">🖨️ Cetak / Unduh PDF</button>
        </div>
      </div>

      ${kwitansiContent}

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 450);
        });
      </script>
    </body>
    </html>
  `);
    printWindow.document.close();
  } catch (err) {
    console.warn('[kwitansiHelper] Failed to open popup, printing directly:', err);
    const styledHtml = `<style>${styles}</style>${kwitansiContent}`;
    printDirectHtml(title, styledHtml);
  }
}

/**
 * Mengunduh berkas Kwitansi sebagai file HTML Standalone yang siap cetak / PDF
 */
export function downloadKwitansiHtmlFile(data: KwitansiData) {
  const styles = getKwitansiStyles();
  const kwitansiContent = generateKwitansiHtml(data);

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kwitansi - ${data.receiptNo} - D'Kandang Farm</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    ${styles}
  </style>
</head>
<body onload="window.print()">
  ${kwitansiContent}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Kwitansi_${data.receiptNo.replace(/\//g, '_')}_${data.receivedFrom.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
