import{k as s}from"./index-CBCpnD5h.js";/**
 * @license lucide-react v0.546.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["path",{d:"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6",key:"1itne7"}],["rect",{x:"6",y:"14",width:"12",height:"8",rx:"1",key:"1ue0tg"}]],u=s("printer",m);function f(){let n="";return document.querySelectorAll('link[rel="stylesheet"], style').forEach(e=>{n+=e.outerHTML+`
`}),n}function b(n,e){const o=f(),i=`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${n} - D'Kandang Farm</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  ${o}
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
    ${e}
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  <\/script>
</body>
</html>`;if(typeof window<"u"&&window.self!==window.top){c(n,e);return}try{const t=window.open("","_blank","width=950,height=850,menubar=no,toolbar=no,location=no,status=no");t&&t.document?(t.document.open(),t.document.write(i),t.document.close()):c(n,e)}catch(t){console.warn("[printHelper] window.open failed or blocked, falling back to direct in-page print:",t),c(n,e)}}function c(n,e){let o=document.getElementById("dkandang-inpage-print-container");o||(o=document.createElement("div"),o.id="dkandang-inpage-print-container",document.body.appendChild(o));const i=`
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
      ${e}
    </div>
  `;o.innerHTML=i;const r=document.title;n&&(document.title=n),document.body.classList.add("dkandang-printing-report");let t=!1;const a=()=>{t||(t=!0,document.body.classList.remove("dkandang-printing-report"),o&&(o.innerHTML=""),document.title=r,window.removeEventListener("afterprint",a))};window.addEventListener("afterprint",a),setTimeout(()=>{try{window.focus(),window.print()}catch(d){console.warn("Gagal memicu window.print:",d)}setTimeout(a,2500)},100)}function x(n,e="Dokumen Resmi D'Kandang Farm",o){const i=document.getElementById(n);if(!i){window.print();return}const r=i.innerHTML;let t=document.getElementById("dkandang-inpage-print-container");t||(t=document.createElement("div"),t.id="dkandang-inpage-print-container",document.body.appendChild(t)),t.innerHTML=r;const a=document.title;e&&(document.title=e),document.body.classList.add("dkandang-printing-report");let d=!1;const p=()=>{d||(d=!0,document.body.classList.remove("dkandang-printing-report"),t&&(t.innerHTML=""),document.title=a,window.removeEventListener("afterprint",p))};window.addEventListener("afterprint",p),setTimeout(()=>{try{window.focus(),window.print()}catch(l){console.warn("Gagal memicu window.print:",l)}setTimeout(p,2500)},100)}export{u as P,x as a,b,c as p};
