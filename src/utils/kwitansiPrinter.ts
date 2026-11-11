/**
 * Kwitansi Print & PDF Export Utility for D'Kandang Amazing Farm
 * Generates exact vector layout matching the official Kwitansi Penerimaan Uang
 */

import { getDKandangOfficialLogoSvgString } from '../components/common/DKandangOfficialLogo';
import { printDirectHtml } from './printHelper';

export interface KwitansiData {
  kwitansiNumber: string;
  date: string;
  receivedFrom: string;
  amount: number;
  amountInWords: string;
  paymentFor: string;
  paymentForLine2?: string;
  paymentMethod?: string;
  signerName: string;
  signerTitle?: string;
  showStamp?: boolean;
}

export function printKwitansiDocument(data: KwitansiData) {
  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(data.amount || 0);

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kwitansi ${data.kwitansiNumber} - D'Kandang Amazing Farm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,500;1,600;1,700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .screen-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1040px;
      margin: 12px auto;
      padding: 12px 20px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 13px;
    }
    .btn {
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: inherit;
    }
    .btn-primary {
      background: #0369a1;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #0284c7;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .kwitansi-page-wrap {
      max-width: 1060px;
      margin: 10px auto;
      padding: 6px;
    }
    .kwitansi-card {
      position: relative;
      background: #fbfbf9;
      border: 2.5px solid #0f172a;
      border-radius: 4px;
      padding: 24px 34px 22px 34px;
      min-height: 520px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    /* Top & bottom corner geometric notch styling */
    .top-notch-left {
      position: absolute;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      border-top: 14px solid #0f172a;
      border-right: 14px solid transparent;
    }
    .top-notch-center {
      position: absolute;
      top: 0;
      left: 42%;
      width: 80px;
      height: 6px;
      background: #0f172a;
      clip-path: polygon(0 0, 100% 0, 85% 100%, 15% 100%);
    }
    .bottom-notch-left {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 42%;
      height: 8px;
      background: #ea580c;
      clip-path: polygon(0 0, 95% 0, 100% 100%, 0 100%);
    }
    .bottom-notch-right {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 58%;
      height: 8px;
      background: #0f172a;
      clip-path: polygon(0 0, 100% 0, 100% 100%, 3% 100%);
    }

    /* Watermark barn line art */
    .farm-watermark {
      position: absolute;
      top: 25px;
      right: 25px;
      width: 320px;
      height: 220px;
      opacity: 0.13;
      pointer-events: none;
      z-index: 1;
    }
    .watercolor-wash {
      position: absolute;
      bottom: -30px;
      right: -30px;
      width: 320px;
      height: 240px;
      background: radial-gradient(circle, rgba(14,116,144,0.08) 0%, rgba(20,184,166,0.04) 45%, transparent 70%);
      pointer-events: none;
      z-index: 1;
    }

    /* Header Section */
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 22px;
      position: relative;
      z-index: 2;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo-container {
      width: 220px;
    }
    .header-divider {
      width: 1.5px;
      height: 62px;
      background: #0f172a;
    }
    .header-title-box {
      display: flex;
      flex-direction: column;
    }
    .title-kwitansi {
      font-size: 34pt;
      font-weight: 900;
      color: #0b2545;
      letter-spacing: 2px;
      line-height: 0.95;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .subtitle-penerimaan {
      font-size: 14pt;
      font-weight: 800;
      color: #438058;
      letter-spacing: 4px;
      margin-top: 4px;
      text-transform: uppercase;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .header-meta {
      text-align: right;
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin-top: 6px;
      width: 310px;
    }
    .meta-line {
      display: flex;
      align-items: flex-end;
      margin-bottom: 12px;
    }
    .meta-label {
      width: 70px;
      text-align: left;
      font-weight: 700;
      color: #0f172a;
    }
    .meta-dots {
      flex: 1;
      border-bottom: 1.5px dotted #64748b;
      text-align: left;
      padding-left: 8px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 700;
      color: #0369a1;
      font-size: 11pt;
    }

    /* Content Body */
    .content-body {
      position: relative;
      z-index: 2;
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: flex;
      align-items: flex-start;
      font-size: 11.5pt;
      line-height: 1.5;
    }
    .field-label {
      width: 175px;
      font-weight: 600;
      color: #1e293b;
      flex-shrink: 0;
      padding-top: 2px;
    }
    .field-colon {
      width: 20px;
      font-weight: 700;
      color: #1e293b;
      flex-shrink: 0;
      padding-top: 2px;
    }
    .field-value-dots {
      flex: 1;
      border-bottom: 1.5px dotted #64748b;
      padding-bottom: 2px;
      font-weight: 700;
      color: #0f172a;
      min-height: 24px;
      padding-left: 4px;
    }
    .terbilang-box {
      flex: 1;
      background: #f4efe6;
      border-radius: 12px;
      padding: 10px 16px;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
    }
    .terbilang-line {
      border-bottom: 1.5px dotted #94a3b8;
      padding-bottom: 4px;
      font-style: italic;
      font-weight: 700;
      color: #1e293b;
      font-size: 11pt;
      letter-spacing: 0.3px;
      line-height: 1.4;
    }
    .terbilang-line-2 {
      border-bottom: 1.5px dotted #cbd5e1;
      margin-top: 8px;
      height: 12px;
    }
    .multiline-dots {
      flex: 1;
    }
    .multiline-row-1 {
      border-bottom: 1.5px dotted #64748b;
      padding-bottom: 2px;
      font-weight: 600;
      color: #0f172a;
      min-height: 24px;
      padding-left: 4px;
    }
    .multiline-row-2 {
      border-bottom: 1.5px dotted #64748b;
      padding-bottom: 2px;
      font-weight: 600;
      color: #0f172a;
      min-height: 22px;
      margin-top: 8px;
      padding-left: 4px;
    }

    /* Bottom Section */
    .bottom-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 26px;
      position: relative;
      z-index: 2;
    }
    .bottom-left-wrap {
      width: 55%;
    }
    .jumlah-badge-row {
      display: flex;
      align-items: center;
      margin-bottom: 14px;
    }
    .jumlah-tag {
      background: #0b2545;
      color: #ffffff;
      font-weight: 800;
      font-size: 13.5pt;
      letter-spacing: 1.5px;
      padding: 7px 22px 7px 18px;
      clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%);
      text-transform: uppercase;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    .jumlah-amount-box {
      flex: 1;
      max-width: 320px;
      margin-left: -6px;
      border-bottom: 2px dotted #0f172a;
      padding: 4px 8px;
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', monospace;
      display: flex;
      align-items: baseline;
      gap: 6px;
    }
    .rp-label {
      font-size: 14pt;
      font-weight: 800;
      color: #0b2545;
    }
    .nominal-val {
      font-size: 15pt;
      font-weight: 900;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .footer-divider {
      width: 100%;
      height: 1.5px;
      background: #0f172a;
      margin-bottom: 12px;
    }
    .company-info {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.35;
    }
    .info-address {
      display: flex;
      gap: 6px;
      flex: 1;
    }
    .info-address-text strong {
      display: block;
      color: #0f172a;
      font-size: 9pt;
      font-weight: 800;
    }
    .info-contacts {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-weight: 600;
      color: #1e293b;
      padding-left: 12px;
      border-left: 1px solid #cbd5e1;
      white-space: nowrap;
    }
    .contact-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    /* Bottom Right Signer */
    .bottom-right-signer {
      text-align: center;
      width: 250px;
      position: relative;
    }
    .signer-heading {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 6px;
    }
    .signer-stamp-area {
      height: 65px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .official-stamp {
      position: absolute;
      top: -6px;
      left: 20px;
      width: 82px;
      height: 82px;
      border: 2px dashed #0284c7;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #0369a1;
      font-weight: 800;
      font-size: 7pt;
      text-transform: uppercase;
      transform: rotate(-12deg);
      opacity: 0.85;
      background: radial-gradient(circle, rgba(2,132,199,0.06) 0%, transparent 80%);
      pointer-events: none;
      line-height: 1.1;
      text-align: center;
      padding: 4px;
    }
    .stamp-inner-circle {
      border: 1px solid #0284c7;
      border-radius: 50%;
      width: 68px;
      height: 68px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .signature-line-text {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .signer-title-text {
      font-size: 8pt;
      color: #64748b;
      font-weight: 600;
      margin-top: 2px;
    }

    @media print {
      .screen-controls {
        display: none !important;
      }
      body {
        background: #ffffff;
      }
      .kwitansi-page-wrap {
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      .kwitansi-card {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>

  <div class="screen-controls">
    <div style="font-weight: 700; color: #0f172a;">
      📄 Dokumen Resmi Kwitansi Penerimaan Uang - D'Kandang Amazing Farm
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-secondary" onclick="window.close()">Tutup Jendela</button>
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Cetak / Unduh PDF
      </button>
    </div>
  </div>

  <div class="kwitansi-page-wrap">
    <div class="kwitansi-card">
      <!-- Decorative notches -->
      <div class="top-notch-left"></div>
      <div class="top-notch-center"></div>
      <div class="bottom-notch-left"></div>
      <div class="bottom-notch-right"></div>

      <!-- Farm illustration watermark -->
      <svg class="farm-watermark" viewBox="0 0 300 200" fill="none" stroke="#78716c" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
        <!-- Barn -->
        <polygon points="150,40 190,75 190,140 110,140 110,75" fill="none" />
        <line x1="150" y1="40" x2="150" y2="75" />
        <line x1="110" y1="75" x2="190" y2="75" />
        <!-- Barn Door X -->
        <rect x="135" y="95" width="30" height="45" />
        <line x1="135" y1="95" x2="165" y2="140" />
        <line x1="165" y1="95" x2="135" y2="140" />
        <!-- Silo -->
        <path d="M205,60 C205,45 235,45 235,60 L235,140 L205,140 Z" />
        <line x1="205" y1="75" x2="235" y2="75" />
        <line x1="205" y1="95" x2="235" y2="95" />
        <line x1="205" y1="115" x2="235" y2="115" />
        <!-- Fence -->
        <line x1="40" y1="130" x2="110" y2="130" />
        <line x1="40" y1="140" x2="110" y2="140" />
        <line x1="50" y1="120" x2="50" y2="145" />
        <line x1="75" y1="120" x2="75" y2="145" />
        <line x1="100" y1="120" x2="100" y2="145" />
        <!-- Tree -->
        <path d="M60,115 C45,100 40,80 55,65 C65,55 85,55 95,68 C105,75 105,95 90,110 C85,115 75,118 60,115 Z" />
        <line x1="75" y1="115" x2="75" y2="140" stroke-width="2" />
        <!-- Hills -->
        <path d="M20,145 Q100,135 180,145 T300,140" />
      </svg>

      <!-- Watercolor wash right corner -->
      <div class="watercolor-wash"></div>

      <!-- Header -->
      <div class="header-row">
        <div class="header-brand">
          <div class="logo-container" style="display: flex; align-items: center; width: 195px; height: 75px;">
            <!-- Area Kosong untuk Menaruh Logo Manual -->
          </div>
          <div class="header-divider"></div>
          <div class="header-title-box">
            <span class="title-kwitansi">KWITANSI</span>
            <span class="subtitle-penerimaan">PENERIMAAN UANG</span>
          </div>
        </div>

        <div class="header-meta">
          <div class="meta-line">
            <span class="meta-label">No.</span>
            <span class="meta-dots">${data.kwitansiNumber || '...........................................'}</span>
          </div>
          <div class="meta-line">
            <span class="meta-label">Tanggal :</span>
            <span class="meta-dots">${data.date || '...........................................'}</span>
          </div>
        </div>
      </div>

      <!-- Main Form Content -->
      <div class="content-body">
        <div class="form-row">
          <span class="field-label">Telah terima dari</span>
          <span class="field-colon">:</span>
          <span class="field-value-dots">${data.receivedFrom || '............................................................................................................................................'}</span>
        </div>

        <div class="form-row" style="align-items: center;">
          <span class="field-label">Uang sejumlah</span>
          <span class="field-colon">:</span>
          <div class="terbilang-box">
            <div class="terbilang-line">
              ${data.amountInWords || '# ............................................................................................................................................................................ #'}
            </div>
            <div class="terbilang-line-2"></div>
          </div>
        </div>

        <div class="form-row">
          <span class="field-label">Untuk pembayaran</span>
          <span class="field-colon">:</span>
          <div class="multiline-dots">
            <div class="multiline-row-1">
              ${data.paymentFor || '............................................................................................................................................................................'}
            </div>
            <div class="multiline-row-2">
              ${data.paymentForLine2 || '............................................................................................................................................................................'}
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Bar -->
      <div class="bottom-section">
        <div class="bottom-left-wrap">
          <div class="jumlah-badge-row">
            <div class="jumlah-tag">JUMLAH</div>
            <div class="jumlah-amount-box">
              <span class="rp-label">Rp.</span>
              <span class="nominal-val">${formattedNominal}</span>
            </div>
          </div>

          <div class="footer-divider"></div>

          <div class="company-info">
            <div class="info-address">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <div class="info-address-text">
                <strong>D'Kandang Amazing Farm</strong>
                Jl. Penarikan, RT.01/RW.02, Pasir Putih,<br>
                Kec. Sawangan, Kota Depok, Jawa Barat 16519
              </div>
            </div>

            <div class="info-contacts">
              <div class="contact-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>0857-1997-7773</span>
              </div>
              <div class="contact-item">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <span>@dkandang</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Signer / Tempat Tanda Tangan (Bersih Tanpa Stempel) -->
        <div class="bottom-right-signer">
          <div class="signer-heading">Hormat kami,</div>
          <div class="signer-stamp-area" style="height: 48px;"></div>
          <div class="signature-line-text" style="border-bottom: 1.5px dotted #64748b; padding-bottom: 2px;">
            ( ${data.signerName ? data.signerName : '................................................'} )
          </div>
          ${data.signerTitle ? `<div class="signer-title-text">${data.signerTitle}</div>` : ''}
        </div>
      </div>
    </div>
  </div>

  <script>
    // Auto focus and trigger print when opened
    window.addEventListener('load', () => {
      // Optional: window.print();
    });
  </script>
</body>
</html>`;

  const docTitle = `Kwitansi_${data.kwitansiNumber}`;
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (isInIframe) {
    printDirectHtml(docTitle, fullHtml);
    return;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=1100,height=750');
    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      printDirectHtml(docTitle, fullHtml);
    }
  } catch (err) {
    console.warn('[kwitansiPrinter] Popup failed, falling back to in-page print:', err);
    printDirectHtml(docTitle, fullHtml);
  }
}
