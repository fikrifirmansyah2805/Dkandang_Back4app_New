/**
 * Utilitas Resmi Cetak & Ekspor PDF D'Kandang ERP
 * Menjamin keselarasan 100% antara layout pratinjau (preview modal) dan hasil cetak / unduh PDF.
 * Mendukung pencetakan dokumen A4 resolusi tinggi, ramah iframe & print-to-PDF
 */

export interface PrintDocumentOptions {
  title: string;
  subtitle?: string;
  periodText?: string;
  documentNumber?: string;
  contentHtml: string;
  creatorName?: string;
  creatorRole?: string;
  approverName?: string;
  approverRole?: string;
  showSignatures?: boolean;
}

/**
 * Mengambil seluruh tag <style> dan <link rel="stylesheet"> dari dokumen induk
 * agar seluruh class Tailwind CSS dan typography termuat persis di jendela/iframe cetak.
 */
function getDocumentStylesHtml(): string {
  let styleTags = '';
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
    styleTags += node.outerHTML + '\n';
  });
  return styleTags;
}

/**
 * Membuka dokumen dalam jendela / iframe cetak mandiri berformat A4 bersih
 * Menjamin hasil cetak tajam, warna latar presisi, tanpa terpotong sidebar atau backdrop modal
 */
export function printHtmlContent(title: string, bodyHtml: string) {
  const currentStyles = getDocumentStylesHtml();

  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - D'Kandang Farm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${currentStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      padding: 0;
      margin: 0;
      width: 100%;
    }
    .print-container {
      max-width: 840px;
      margin: 0 auto;
      padding: 24px;
    }
    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 24px;
      padding: 12px 18px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
    }
    .btn {
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-primary {
      background: #059669;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #047857;
    }
    .btn-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .btn-secondary:hover {
      background: #f1f5f9;
    }
    .kop-surat {
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
      text-align: center;
    }
    .kop-title {
      font-size: 18pt;
      font-weight: 900;
      color: #065f46;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .kop-sub {
      font-size: 10pt;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }
    .kop-desc {
      font-size: 8.5pt;
      color: #64748b;
      margin-top: 4px;
      line-height: 1.3;
    }
    .doc-header {
      text-align: center;
      margin-bottom: 18px;
    }
    .doc-title {
      font-size: 13pt;
      font-weight: 800;
      text-decoration: underline;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
    }
    .doc-meta {
      font-size: 9pt;
      color: #475569;
      margin-top: 4px;
    }
    .meta-box {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 9pt;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .meta-box div {
      line-height: 1.4;
    }
    .meta-label {
      color: #64748b;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .summary-card {
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .summary-card.green {
      background: #ecfdf5 !important;
      border-color: #a7f3d0 !important;
      color: #065f46 !important;
    }
    .summary-card.amber {
      background: #fffbeb !important;
      border-color: #fde68a !important;
      color: #92400e !important;
    }
    .summary-card.blue {
      background: #f0f9ff !important;
      border-color: #bae6fd !important;
      color: #075985 !important;
    }
    .card-label {
      font-size: 8pt;
      font-weight: 600;
      display: block;
      text-transform: uppercase;
    }
    .card-val {
      font-size: 12pt;
      font-weight: 800;
      display: block;
      margin-top: 2px;
    }
    .card-sub {
      font-size: 7.5pt;
      margin-top: 2px;
      display: block;
      opacity: 0.9;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
      margin-bottom: 18px;
      border: 1px solid #cbd5e1;
    }
    table.data-table th {
      background: #f1f5f9 !important;
      color: #1e293b !important;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
    }
    table.data-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc !important;
    }
    table.data-table tfoot td {
      font-weight: 700;
      background: #f1f5f9 !important;
      border-top: 2px solid #94a3b8;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 28px;
      text-align: center;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    .signature-title {
      color: #64748b;
      margin-bottom: 50px;
    }
    .signature-name {
      font-weight: 700;
      text-decoration: underline;
      color: #0f172a;
    }
    .signature-role {
      color: #64748b;
      font-size: 8pt;
      margin-top: 2px;
    }
    .footer-stamp {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      font-size: 7.5pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        padding: 0 !important;
      }
      .print-container {
        padding: 0 !important;
        max-width: 100% !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="no-print">
      <button onclick="window.close()" class="btn btn-secondary">
        Tutup
      </button>
      <button onclick="window.print()" class="btn btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"></path><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><path d="M6 14h12v8H6z"></path></svg>
        Cetak / Unduh PDF
      </button>
    </div>
    ${bodyHtml}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>`;

  // In iframe environments (e.g. AI Studio preview), window.open is blocked or isolated.
  // We prefer direct in-page printing for flawless reliability.
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  if (isInIframe) {
    printDirectHtml(title, bodyHtml);
    return;
  }

  try {
    const printWindow = window.open('', '_blank', 'width=950,height=850,menubar=no,toolbar=no,location=no,status=no');
    if (printWindow && printWindow.document) {
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
    } else {
      printDirectHtml(title, bodyHtml);
    }
  } catch (err) {
    console.warn('[printHelper] window.open failed or blocked, falling back to direct in-page print:', err);
    printDirectHtml(title, bodyHtml);
  }
}

/**
 * Mencetak string HTML langsung ke dalam halaman saat ini secara aman
 */
export function printDirectHtml(title: string, bodyHtml: string) {
  let printContainer = document.getElementById('dkandang-inpage-print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'dkandang-inpage-print-container';
    document.body.appendChild(printContainer);
  }

  // Inject base print styling if needed so standard report markup looks crisp
  const contentWithStyle = `
    <style>
      #dkandang-inpage-print-container {
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }
      #dkandang-inpage-print-container table {
        width: 100%;
        border-collapse: collapse;
      }
      #dkandang-inpage-print-container th, 
      #dkandang-inpage-print-container td {
        padding: 6px 8px;
      }
      #dkandang-inpage-print-container .no-print {
        display: none !important;
      }
    </style>
    <div class="print-container">
      ${bodyHtml}
    </div>
  `;

  printContainer.innerHTML = contentWithStyle;

  const originalTitle = document.title;
  if (title) {
    document.title = title;
  }

  document.body.classList.add('dkandang-printing-report');

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('dkandang-printing-report');
    if (printContainer) {
      printContainer.innerHTML = '';
    }
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Gagal memicu window.print:', err);
    }
    setTimeout(cleanup, 2500);
  }, 100);
}

export interface PrintElementOptions {
  orientation?: 'portrait' | 'landscape' | 'auto';
  title?: string;
  margin?: string;
}

/**
 * Mencetak elemen DOM tertentu secara langsung dan andal tanpa ketergantungan pada popup window
 * atau hidden iframe yang sering diblokir sandbox browser/iframe.
 * Menggunakan class-scoped in-page container yang menyalin 100% styling Tailwind aktif,
 * bebas dari tombol kontrol/toolbar, dan fleksibel untuk format cetak Portrait maupun Landscape.
 */
export function printElementById(
  elementId: string, 
  documentTitle: string = 'Dokumen Resmi D\'Kandang Farm',
  options?: PrintElementOptions | 'portrait' | 'landscape'
) {
  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // Ambil HTML murni dari elemen target
  const contentHtml = elem.innerHTML;

  // Dapatkan atau buat container print bersih di body
  let printContainer = document.getElementById('dkandang-inpage-print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'dkandang-inpage-print-container';
    document.body.appendChild(printContainer);
  }

  // Masukkan konten ke dalam container cetak
  printContainer.innerHTML = contentHtml;

  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  // Tambahkan penanda class cetak aktif ke body
  document.body.classList.add('dkandang-printing-report');

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('dkandang-printing-report');
    if (printContainer) {
      printContainer.innerHTML = '';
    }
    document.title = originalTitle;
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  // Jalankan dialog cetak browser
  setTimeout(() => {
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.warn('Gagal memicu window.print:', err);
    }
    // Fallback cleanup jika event afterprint tidak tertrigger di beberapa browser
    setTimeout(cleanup, 2500);
  }, 100);
}

