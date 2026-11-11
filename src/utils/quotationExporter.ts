// Utility for exporting D'Kandang Official Quotation to Word (.doc / .docx compatible) and Google Docs

import { Quotation, CompanyProfile } from '../types';
import { simulateDecrypt } from './crypto';

/**
 * Konversi angka ke kalimat terbilang bahasa Indonesia (e.g. Rp 26.000.000 -> Dua Puluh Enam Juta Rupiah)
 */
export function terbilangRupiah(nominal: number): string {
  if (nominal === 0) return 'Nol Rupiah';
  const angka = Math.floor(Math.abs(nominal));
  
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  function toWords(n: number): string {
    if (n < 12) return bilangan[n];
    if (n < 20) return toWords(n - 10) + ' Belas';
    if (n < 100) return toWords(Math.floor(n / 10)) + ' Puluh ' + toWords(n % 10);
    if (n < 200) return 'Seratus ' + toWords(n - 100);
    if (n < 1000) return toWords(Math.floor(n / 100)) + ' Ratus ' + toWords(n % 100);
    if (n < 2000) return 'Seribu ' + toWords(n - 1000);
    if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Ribu ' + toWords(n % 1000);
    if (n < 1000000000) return toWords(Math.floor(n / 1000000)) + ' Juta ' + toWords(n % 1000000);
    if (n < 1000000000000) return toWords(Math.floor(n / 1000000000)) + ' Miliar ' + toWords(n % 1000000000);
    return toWords(Math.floor(n / 1000000000000)) + ' Triliun ' + toWords(n % 1000000000000);
  }

  return (toWords(angka).replace(/\s+/g, ' ').trim()) + ' Rupiah';
}

/**
 * Format tanggal Indonesia formal (e.g. 21 Agustus 2026)
 */
export function formatTanggalIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Generate full HTML markup with D'Kandang Official Letterhead (Kop Resmi)
 */
export function generateQuotationHTML(quote: Quotation, company?: Partial<CompanyProfile>): string {
  const tanggalSurat = formatTanggalIndo(quote.date || new Date().toISOString());
  const berlakuSampai = formatTanggalIndo(quote.validUntil || new Date(Date.now() + 30 * 86400000).toISOString());
  const tanggalKegiatan = quote.eventDate ? formatTanggalIndo(quote.eventDate) : 'Sesuai Kesepakatan Jadwal';
  const terbilang = terbilangRupiah(quote.grandTotal);

  // Dynamic Company Details
  const ptName = company?.ptName || "PT. WISATA AGRO EDUKASI SEJAHTERA";
  const brandName = company?.name || "D'Kandang Amazing Farm";
  const tagline = company?.tagline || "Wisata Edukasi Agro Pertanian & Peternakan Ramah Keluarga";
  const address = company?.address || "Jl. Penarikan RT 01 / RW 02, Kel. Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519";
  const phone = company?.phone || "(021) 7788-9000 / 0812-1111-2233";
  const email = company?.email || "sales@dkandang.id";
  const website = company?.website || "www.dkandang.id";
  const directorName = quote.approvedBy || company?.directorName || "H. Muh. Ridwan, S.Pt";
  const directorTitle = quote.approvedByTitle || company?.directorTitle || "Direktur Utama";
  const bankName = quote.bankDetails?.bankName || company?.defaultBankName || "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata";
  const bankAccount = simulateDecrypt(quote.bankDetails?.accountNumber || company?.defaultBankAccount || "137-00-1928374-1");
  const accountHolder = quote.bankDetails?.accountHolder || company?.defaultAccountHolder || ptName;

  const itemsRows = quote.items.map((item, idx) => `
    <tr>
      <td style="border: 1px solid #333333; padding: 8px; text-align: center; font-size: 11pt;">${idx + 1}</td>
      <td style="border: 1px solid #333333; padding: 8px; font-size: 11pt;">
        <strong>${item.name}</strong>
        ${item.description ? `<div style="font-size: 9.5pt; color: #444444; margin-top: 2px;">${item.description}</div>` : ''}
      </td>
      <td style="border: 1px solid #333333; padding: 8px; text-align: center; font-size: 11pt;">${item.quantity}</td>
      <td style="border: 1px solid #333333; padding: 8px; text-align: center; font-size: 11pt;">${item.unit || 'Pax'}</td>
      <td style="border: 1px solid #333333; padding: 8px; text-align: right; font-size: 11pt;">Rp ${item.unitPrice.toLocaleString('id-ID')}</td>
      <td style="border: 1px solid #333333; padding: 8px; text-align: right; font-weight: bold; font-size: 11pt;">Rp ${item.total.toLocaleString('id-ID')}</td>
    </tr>
  `).join('');

  const termsList = (quote.termsAndConditions && quote.termsAndConditions.length > 0)
    ? quote.termsAndConditions
    : [
        "Harga paket sudah mencakup pemandu edukasi lapangan (Field Guide) dan seluruh aktivitas edukasi yang tertera.",
        "Setiap kelipatan 10 siswa berhak mendapatkan 1 guru pendamping gratis (FOC).",
        "Konfirmasi final jumlah rombongan selambat-lambatnya H-5 sebelum tanggal pelaksanaan kunjungan.",
        "Reschedule tanggal kegiatan dapat dilakukan maksimal 1 kali dengan pemberitahuan tertulis paling lambat H-7."
      ];

  const termsHtml = termsList.map(t => `<li style="margin-bottom: 4px; font-size: 10.5pt; line-height: 1.4;">${t}</li>`).join('');

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Surat Penawaran Resmi - ${quote.quotationNumber}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 20mm 18mm 20mm 18mm;
      }
      body {
        font-family: 'Calibri', 'Arial', sans-serif;
        color: #1a1a1a;
        line-height: 1.35;
        font-size: 11pt;
        background-color: #ffffff;
        margin: 0;
        padding: 0;
      }
      .kop-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 4px;
      }
      .kop-title {
        color: #166534;
        font-size: 18pt;
        font-weight: bold;
        letter-spacing: 0.5px;
        margin: 0;
        padding: 0;
        text-transform: uppercase;
      }
      .kop-subtitle {
        color: #15803d;
        font-size: 11pt;
        font-weight: bold;
        margin: 2px 0 0 0;
        letter-spacing: 0.3px;
      }
      .kop-pt {
        color: #333333;
        font-size: 9.5pt;
        font-weight: bold;
        margin: 1px 0 0 0;
      }
      .kop-address {
        color: #4b5563;
        font-size: 9pt;
        margin: 3px 0 0 0;
        line-height: 1.25;
      }
      .kop-divider-double {
        border-top: 3px solid #166534;
        border-bottom: 1px solid #166534;
        height: 3px;
        margin: 6px 0 16px 0;
      }
      .meta-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        font-size: 10.5pt;
      }
      .meta-table td {
        padding: 2px 0;
        vertical-align: top;
      }
      .letter-body {
        margin-top: 10px;
        margin-bottom: 14px;
        text-align: justify;
        font-size: 11pt;
      }
      .items-table {
        width: 100%;
        border-collapse: collapse;
        margin: 12px 0;
      }
      .items-table th {
        background-color: #f0fdf4;
        color: #166534;
        border: 1px solid #333333;
        padding: 8px;
        font-size: 10.5pt;
        font-weight: bold;
        text-align: center;
      }
      .signature-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 24px;
        page-break-inside: avoid;
      }
      .signature-table td {
        width: 50%;
        vertical-align: top;
        text-align: center;
        font-size: 10.5pt;
      }
      .approval-seal {
        display: inline-block;
        border: 2px solid #166534;
        color: #166534;
        background-color: #f0fdf4;
        font-weight: bold;
        font-size: 9pt;
        padding: 4px 10px;
        border-radius: 6px;
        margin-top: 6px;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <!-- KOP SURAT RESMI D'KANDANG AMAZING FARM -->
    <table class="kop-table">
      <tr>
        <td style="width: 80px; vertical-align: middle; text-align: center; padding-right: 12px;">
          <div style="width: 72px; height: 72px; background: linear-gradient(135deg, #166534, #15803d); border-radius: 12px; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 22pt; border: 2px solid #ca8a04;">
            ${company?.logoEmoji || '🌿'}
          </div>
        </td>
        <td style="vertical-align: middle;">
          <h1 class="kop-title">${brandName}</h1>
          <div class="kop-subtitle">${tagline}</div>
          <div class="kop-pt">${ptName}</div>
          <div class="kop-address">
            ${address}<br>
            <strong>Hotline/WhatsApp:</strong> ${phone} | <strong>Email:</strong> ${email} | <strong>Website:</strong> ${website}
          </div>
        </td>
      </tr>
    </table>

    <div class="kop-divider-double"></div>

    <!-- TANGGAL & NOMOR SURAT -->
    <table class="meta-table">
      <tr>
        <td style="width: 15%;"><strong>Nomor</strong></td>
        <td style="width: 3%;">:</td>
        <td style="width: 42%; font-weight: bold; color: #166534;">${quote.quotationNumber}</td>
        <td style="width: 40%; text-align: right;">Depok, ${tanggalSurat}</td>
      </tr>
      <tr>
        <td><strong>Lampiran</strong></td>
        <td>:</td>
        <td>1 Berkas Rundown & Fasilitas Kegiatan</td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Perihal</strong></td>
        <td>:</td>
        <td><strong>${quote.subject || "Penawaran Harga Paket Wisata Edukasi & Rekreasi Field Trip"}</strong></td>
        <td></td>
      </tr>
      <tr>
        <td><strong>Berlaku s/d</strong></td>
        <td>:</td>
        <td style="color: #b45309; font-weight: 600;">${berlakuSampai}</td>
        <td></td>
      </tr>
    </table>

    <!-- TUJUAN SURAT -->
    <div style="margin-top: 14px; margin-bottom: 12px; font-size: 11pt; line-height: 1.4;">
      Kepada Yth.<br>
      <strong>${quote.recipientTitle || 'Bapak / Ibu Kepala Sekolah & Panitia Kegiatan'}</strong><br>
      <strong>${quote.companyName}</strong><br>
      ${quote.customerName ? `UP: ${quote.customerName}<br>` : ''}
      ${quote.customerAddress ? `${quote.customerAddress}<br>` : 'Di Tempat'}
    </div>

    <!-- SALAM PEMBUKA -->
    <div class="letter-body">
      Dengan hormat,<br><br>
      ${quote.notes || `Teriring salam dan doa semoga Bapak/Ibu beserta seluruh jajaran senantiasa berada dalam lindungan Tuhan Yang Maha Esa serta sukses dalam menjalankan seluruh aktivitas keseharian.

Sehubungan dengan rencana agenda kegiatan wisata edukasi dan rekreasi bagi siswa/i, kami dari manajemen <strong>${brandName}</strong> bermaksud mengajukan surat penawaran harga resmi untuk rincian paket edukasi dan fasilitas sebagai berikut:`}
    </div>

    <!-- INFORMASI KEGIATAN -->
    <table style="width: 100%; border: 1px solid #bbf7d0; background-color: #f0fdf4; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 10.5pt;">
      <tr>
        <td style="width: 25%;"><strong>Rencana Kegiatan:</strong></td>
        <td style="width: 75%;">${quote.activityPlan || 'Kunjungan Wisata Edukasi & Outbound Kids'}</td>
      </tr>
      <tr>
        <td><strong>Estimasi Jadwal:</strong></td>
        <td>${tanggalKegiatan}</td>
      </tr>
      <tr>
        <td><strong>Estimasi Peserta:</strong></td>
        <td><strong>${quote.estimatedPax || quote.items.reduce((a, b) => a + b.quantity, 0)} Orang (Siswa & Pendamping)</strong></td>
      </tr>
    </table>

    <!-- TABEL RINCIAN ITEM -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 5%;">No</th>
          <th style="width: 45%;">Deskripsi Paket Edukasi & Fasilitas</th>
          <th style="width: 8%;">Qty</th>
          <th style="width: 10%;">Satuan</th>
          <th style="width: 16%;">Harga Satuan</th>
          <th style="width: 16%;">Total Harga</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt;">
            SUBTOTAL:
          </td>
          <td style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt;">
            Rp ${quote.subtotal.toLocaleString('id-ID')}
          </td>
        </tr>
        ${quote.discountAmount ? `
        <tr>
          <td colspan="5" style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt; color: #b45309;">
            DISKON KHUSUS ROMBONGAN:
          </td>
          <td style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt; color: #b45309;">
            - Rp ${quote.discountAmount.toLocaleString('id-ID')}
          </td>
        </tr>` : ''}
        ${quote.tax > 0 ? `
        <tr>
          <td colspan="5" style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt;">
            PPN:
          </td>
          <td style="border: 1px solid #333333; padding: 7px 10px; text-align: right; font-weight: bold; font-size: 10.5pt;">
            Rp ${quote.tax.toLocaleString('id-ID')}
          </td>
        </tr>` : ''}
        <tr style="background-color: #f0fdf4;">
          <td colspan="5" style="border: 1px solid #333333; padding: 9px 10px; text-align: right; font-weight: bold; font-size: 11.5pt; color: #166534;">
            GRAND TOTAL PENAWARAN:
          </td>
          <td style="border: 1px solid #333333; padding: 9px 10px; text-align: right; font-weight: bold; font-size: 12pt; color: #166534;">
            Rp ${quote.grandTotal.toLocaleString('id-ID')}
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- TERBILANG -->
    <div style="background-color: #f8fafc; border-left: 4px solid #166534; padding: 8px 12px; margin-bottom: 14px; font-size: 10.5pt;">
      <strong>Terbilang:</strong> <em>${terbilang}</em>
    </div>

    <!-- SYARAT & KETENTUAN -->
    <div style="margin-top: 14px; font-size: 10.5pt;">
      <strong style="color: #166534; text-transform: uppercase; font-size: 10.5pt;">Syarat & Ketentuan Kegiatan:</strong>
      <ol style="margin-top: 4px; padding-left: 20px;">
        ${termsHtml}
      </ol>
    </div>

    <!-- KETENTUAN PEMBAYARAN & REKENING RESMI -->
    <div style="margin-top: 12px; padding: 10px 14px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; font-size: 10pt;">
      <strong style="color: #166534;">Sistem Pembayaran & Rekening Resmi Perusahaan:</strong>
      <div style="margin-top: 4px; white-space: pre-line; line-height: 1.35;">
${quote.paymentTerms || "1. Pembayaran Uang Muka (DP) minimal 30% saat konfirmasi pemesanan jadwal.\n2. Pelunasan sisa tagihan selambat-lambatnya H-3 sebelum hari pelaksanaan kegiatan."}
      </div>
      <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #86efac;">
        <strong>Transfer Bank Resmi:</strong><br>
        <strong>${bankName}</strong><br>
        No. Rekening: <span style="font-family: monospace; font-size: 11pt; font-weight: bold; color: #166534;">${bankAccount}</span><br>
        A.N: <strong>${accountHolder}</strong>
      </div>
    </div>

    <!-- PENUTUP -->
    <div class="letter-body" style="margin-top: 14px;">
      Demikian surat penawaran harga ini kami sampaikan. Besar harapan kami dapat menjalin kerjasama dan menyambut kedatangan rombongan <strong>${quote.companyName}</strong> di ${brandName}. Atas perhatian dan kerjasamanya, kami haturkan terima kasih.
    </div>

    <!-- TANDA TANGAN -->
    <table class="signature-table">
      <tr>
        <td>
          Dibuat Oleh,<br>
          <strong>${brandName}</strong><br><br><br><br>
          <strong style="text-decoration: underline;">${quote.preparedBy || 'Sales Executive'}</strong><br>
          <span style="font-size: 9.5pt; color: #555555;">${quote.preparedByTitle || 'Sales & Marketing Team'}</span>
        </td>
        <td>
          Mengetahui & Menyetujui,<br>
          <strong>Direksi ${brandName}</strong><br><br>
          ${quote.status === 'approved' || quote.status === 'sent' || quote.status === 'converted' ? `
            <div class="approval-seal">
              ✓ APPROVED BY DIREKSI<br>
              <span style="font-size: 8pt; font-weight: normal;">${quote.approvedAt ? formatTanggalIndo(quote.approvedAt) : ''}</span>
            </div><br>
          ` : `
            <div style="height: 40px;"></div>
          `}
          <strong style="text-decoration: underline;">${directorName}</strong><br>
          <span style="font-size: 9.5pt; color: #555555;">${directorTitle}</span>
        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
}

/**
 * Ekspor Surat Penawaran ke format file Microsoft Word (.doc / .docx compatible)
 */
export function exportQuotationToWord(quote: Quotation, company?: Partial<CompanyProfile>): void {
  const htmlContent = generateQuotationHTML(quote, company);
  
  // Format as Word XML document with full styling and Mime Type
  const wordDocumentContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <meta charset="utf-8">
      <title>Surat Penawaran ${quote.quotationNumber}</title>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff' + wordDocumentContent], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanCompanyName = quote.companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
  a.download = `Surat_Penawaran_${quote.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${cleanCompanyName}.doc`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 300);
}

/**
 * Salin format dokumen rich HTML ke Clipboard agar bisa langsung di-paste ke Google Docs dengan layout sempurna
 */
export async function copyQuotationToClipboardForGoogleDocs(quote: Quotation, company?: Partial<CompanyProfile>): Promise<boolean> {
  const html = generateQuotationHTML(quote, company);
  try {
    const blobHtml = new Blob([html], { type: 'text/html' });
    const blobText = new Blob([extractPlainText(quote, company)], { type: 'text/plain' });
    
    if (navigator.clipboard && window.ClipboardItem) {
      const item = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      await navigator.clipboard.write([item]);
      return true;
    } else {
      // Fallback
      await navigator.clipboard.writeText(html);
      return true;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard for Google Docs', err);
    return false;
  }
}

/**
 * Ekstrak plain text surat penawaran (untuk pesan WhatsApp atau text clipboard)
 */
export function extractPlainText(quote: Quotation, company?: Partial<CompanyProfile>): string {
  const tanggalSurat = formatTanggalIndo(quote.date || new Date().toISOString());
  const terbilang = terbilangRupiah(quote.grandTotal);
  const ptName = company?.ptName || "PT. WISATA AGRO EDUKASI SEJAHTERA";
  const brandName = company?.name || "D'Kandang Amazing Farm";
  const address = company?.address || "Jl. Penarikan RT 01/02 Pasir Putih Sawangan Depok";
  const phone = company?.phone || "0812-1111-2233";
  const directorName = quote.approvedBy || company?.directorName || "H. Muh. Ridwan, S.Pt";
  const bankName = quote.bankDetails?.bankName || company?.defaultBankName || "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata";
  const bankAccount = simulateDecrypt(quote.bankDetails?.accountNumber || company?.defaultBankAccount || "137-00-1928374-1");
  const accountHolder = quote.bankDetails?.accountHolder || company?.defaultAccountHolder || ptName;

  return `
*SURAT PENAWARAN RESMI ${brandName.toUpperCase()}*
${ptName}
${address}
--------------------------------------------------
No. Surat  : ${quote.quotationNumber}
Tanggal    : ${tanggalSurat}
Perihal    : ${quote.subject || "Penawaran Wisata Edukasi"}
Kpd Yth    : ${quote.recipientTitle || 'Kepala Sekolah / Panitia'} ${quote.companyName}
UP         : ${quote.customerName}

RINCIAN KOMPONEN PENAWARAN:
${quote.items.map((it, idx) => `${idx + 1}. ${it.name} (${it.quantity} ${it.unit || 'Pax'}) @ Rp ${it.unitPrice.toLocaleString('id-ID')} = Rp ${it.total.toLocaleString('id-ID')}`).join('\n')}

Subtotal   : Rp ${quote.subtotal.toLocaleString('id-ID')}
${quote.discountAmount ? `Diskon     : - Rp ${quote.discountAmount.toLocaleString('id-ID')}\n` : ''}Grand Total: Rp ${quote.grandTotal.toLocaleString('id-ID')}
(Terbilang: ${terbilang})

STATUS APPROVAL: ${quote.status === 'approved' ? `DISETUJUI DIREKSI (${directorName})` : quote.status}

Rekening Resmi:
${bankName}
No. Rek: ${bankAccount}
A.N: ${accountHolder}

Info & Konfirmasi:
${brandName} - Telp/WA: ${phone}
  `.trim();
}
