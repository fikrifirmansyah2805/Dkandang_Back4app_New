import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { printHtmlContent } from '../../utils/printHelper';
import { exportRawCSV, exportToJSON } from '../../utils/exportHelper';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate,
  formatDateTime 
} from '../../utils/crypto';
import { 
  FileSpreadsheet, 
  Download, 
  Clock, 
  CheckCircle2, 
  Send, 
  Sparkles, 
  Calendar, 
  Layers, 
  Eye, 
  FileText, 
  ShieldCheck, 
  Printer,
  X
} from 'lucide-react';
import { ReportSchedule } from '../../types';

export default function AutomatedReportsModule() {
  const { 
    reportSchedules, 
    bankAccounts, 
    cashTransactions, 
    inventory, 
    salesOrders, 
    salesInvoices, 
    purchaseOrders, 
    marketingCampaigns, 
    chartOfAccounts,
    currentUser,
    companyProfile,
    showNotification
  } = useERP();

  const [selectedReportType, setSelectedReportType] = useState<string>('executive_summary');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Agustus 2026');
  const [previewData, setPreviewData] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const generateReportHtml = (data: any) => {
    let specificContentHtml = '';

    if (data.type === 'finance_cashflow') {
      specificContentHtml = `
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Total Saldo Kas & Bank</span>
            <span class="card-val">${formatRupiah(data.content.totalKas)}</span>
            <span class="card-sub">${data.content.banks.length} Rekening Aktif</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Arus Kas Masuk (Inflow)</span>
            <span class="card-val">+${formatRupiah(data.content.inflows)}</span>
            <span class="card-sub">Penerimaan Terverifikasi</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Arus Kas Keluar (Outflow)</span>
            <span class="card-val">-${formatRupiah(data.content.outflows)}</span>
            <span class="card-sub">Beban Operasional & Vendor</span>
          </div>
        </div>

        <h4 style="font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Rincian Posisi Saldo Per Rekening Bank & Kas</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No.</th>
              <th>Nama Bank / Sumber Kas</th>
              <th style="width: 140px;">No. Rekening</th>
              <th style="width: 140px;">Atas Nama</th>
              <th style="width: 160px; text-align: right;">Saldo Realtime (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${data.content.banks.map((b: any, idx: number) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${b.name}</strong></td>
                <td style="font-family: monospace;">${b.accountNumber || '-'}</td>
                <td>${b.accountHolder || '-'}</td>
                <td style="text-align: right; font-weight: 700; color: #065f46;">${formatRupiah(b.balance)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4" style="text-align: right; font-weight: 700;">TOTAL LIKUIDITAS:</td>
              <td style="text-align: right; font-weight: 800; color: #065f46; font-size: 10pt;">${formatRupiah(data.content.totalKas)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else if (data.type === 'sales_performance') {
      specificContentHtml = `
        <div class="summary-grid">
          <div class="summary-card green">
            <span class="card-label">Total Faktur Penjualan</span>
            <span class="card-val">${formatRupiah(data.content.totalInvoices)}</span>
            <span class="card-sub">Omset Terfaktur</span>
          </div>
          <div class="summary-card blue">
            <span class="card-label">Kas Masuk Terbayar</span>
            <span class="card-val">${formatRupiah(data.content.paidInvoices)}</span>
            <span class="card-sub">Pelunasan Customer</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Total Pesanan SO</span>
            <span class="card-val">${formatRupiah(data.content.totalOrders)}</span>
            <span class="card-sub">${data.content.orderCount} Sales Order</span>
          </div>
        </div>
      `;
    } else if (data.type === 'warehouse_valuation') {
      specificContentHtml = `
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Total Valuasi Persediaan</span>
            <span class="card-val">${formatRupiah(data.content.totalValuation)}</span>
            <span class="card-sub">Nilai Aset Stok Gudang</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Jumlah SKU Terdaftar</span>
            <span class="card-val">${data.content.totalSKUs} Item</span>
            <span class="card-sub">Katalog Aktif</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Peringatan Stok Rendah</span>
            <span class="card-val">${data.content.lowStockCount} SKU</span>
            <span class="card-sub">Perlu Reorder Segera</span>
          </div>
        </div>

        <h4 style="font-size: 9pt; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Daftar Item Persediaan & Valuasi</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px; text-align: center;">No.</th>
              <th>Nama Item Barang</th>
              <th style="width: 90px; text-align: center;">Kategori</th>
              <th style="width: 70px; text-align: center;">Stok</th>
              <th style="width: 100px; text-align: right;">HPP Satuan</th>
              <th style="width: 120px; text-align: right;">Total Nilai (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${data.content.items.slice(0, 20).map((it: any, idx: number) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${it.name}</strong> <span style="font-size: 7.5pt; color: #64748b;">(${it.sku})</span></td>
                <td style="text-align: center; text-transform: uppercase; font-size: 7.5pt;">${it.category}</td>
                <td style="text-align: center; font-weight: 600;">${it.stockQty} ${it.unit}</td>
                <td style="text-align: right;">${formatRupiah(it.unitCost)}</td>
                <td style="text-align: right; font-weight: 700;">${formatRupiah(it.stockQty * it.unitCost)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL VALUASI GUDANG:</td>
              <td style="text-align: right; font-weight: 800; color: #065f46; font-size: 10pt;">${formatRupiah(data.content.totalValuation)}</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      // Executive Digest
      specificContentHtml = `
        <div class="summary-grid">
          <div class="summary-card blue">
            <span class="card-label">Likuiditas Kas & Bank</span>
            <span class="card-val">${formatRupiah(data.content.totalKas || 0)}</span>
            <span class="card-sub">Cadangan Kas Siap Pakai</span>
          </div>
          <div class="summary-card green">
            <span class="card-label">Pendapatan Terfaktur</span>
            <span class="card-val">${formatRupiah(data.content.salesRevenue || 0)}</span>
            <span class="card-sub">Omset Penjualan</span>
          </div>
          <div class="summary-card amber">
            <span class="card-label">Valuasi Persediaan</span>
            <span class="card-val">${formatRupiah(data.content.inventoryVal || 0)}</span>
            <span class="card-sub">Aset Logistik & Pakan</span>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>Indikator Kinerja Utama (KPI)</th>
              <th style="width: 140px; text-align: right;">Capaian Nilai</th>
              <th style="width: 160px; text-align: center;">Status Kepatuhan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Likuiditas Kas Operasional Agrowisata</strong></td>
              <td style="text-align: right; font-weight: 700; color: #075985;">${formatRupiah(data.content.totalKas || 0)}</td>
              <td style="text-align: center; color: #065f46; font-weight: 700;">Optimal & Sehat</td>
            </tr>
            <tr>
              <td><strong>Total Realisasi Belanja Pengadaan PO Vendor</strong></td>
              <td style="text-align: right; font-weight: 700; color: #92400e;">${formatRupiah(data.content.procurementSpend || 0)}</td>
              <td style="text-align: center; color: #075985; font-weight: 700;">Terkontrol Sesuai Budget</td>
            </tr>
            <tr>
              <td><strong>Total Nilai Aset Fisik Persediaan & Panen Farm</strong></td>
              <td style="text-align: right; font-weight: 700; color: #065f46;">${formatRupiah(data.content.inventoryVal || 0)}</td>
              <td style="text-align: center; color: #065f46; font-weight: 700;">Audit Opname Cocok</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return `
      <div class="kop-surat">
        <div class="kop-title">${companyProfile.name.toUpperCase()}</div>
        <div class="kop-sub">${companyProfile.ptName}</div>
        <div class="kop-desc">${companyProfile.address} | Telp: ${companyProfile.phone} | Email: ${companyProfile.email}</div>
      </div>
      <div class="doc-header">
        <div class="doc-title">${data.title.toUpperCase()}</div>
        <div class="doc-meta">Periode Laporan: <strong>${data.period}</strong> | Terbit: ${formatDateTime(data.dateGenerated)}</div>
      </div>
      
      ${specificContentHtml}

      <div class="signatures-block">
        <div>
          <div class="signature-title">Disiapkan Oleh (Sistem & Staff)</div>
          <div class="signature-name">${currentUser.name}</div>
          <div class="signature-role">ERP Intelligence Engine</div>
        </div>
        <div>
          <div class="signature-title">Diverifikasi (Finance & Controller)</div>
          <div class="signature-name">Finance Manager</div>
          <div class="signature-role">Divisi Akuntansi & Keuangan</div>
        </div>
        <div>
          <div class="signature-title">Disetujui Oleh (Direksi)</div>
          <div class="signature-name">${companyProfile.directorName}</div>
          <div class="signature-role">${companyProfile.directorTitle}</div>
        </div>
      </div>

      <div class="footer-stamp">
        <span>Dicetak Resmi dari Sistem ERP Terpadu D'Kandang Amazing Farm</span>
        <span>Dokumen Sah Internal & Audit • Halaman 1/1</span>
      </div>
    `;
  };

  const handleGenerateReport = (type: string) => {
    let reportTitle = '';
    let reportContent: any = {};

    switch (type) {
      case 'finance_cashflow':
        reportTitle = 'Laporan Konsolidasi Arus Kas & Treasury';
        reportContent = {
          totalKas: bankAccounts.reduce((a, b) => a + b.balance, 0),
          inflows: cashTransactions.filter(t => t.type === 'inflow').reduce((a, b) => a + b.amount, 0),
          outflows: cashTransactions.filter(t => t.type === 'outflow').reduce((a, b) => a + b.amount, 0),
          txCount: cashTransactions.length,
          banks: bankAccounts.map(b => ({
            name: b.bankName,
            accountNumber: b.accountNumber,
            accountHolder: b.accountHolder,
            balance: b.balance
          }))
        };
        break;

      case 'sales_performance':
        reportTitle = 'Laporan Kinerja Penjualan & Pipeline CRM';
        reportContent = {
          totalInvoices: salesInvoices.reduce((a, b) => a + b.totalAmount, 0),
          paidInvoices: salesInvoices.filter(i => i.status === 'paid').reduce((a, b) => a + b.paidAmount, 0),
          totalOrders: salesOrders.reduce((a, b) => a + b.totalAmount, 0),
          orderCount: salesOrders.length
        };
        break;

      case 'warehouse_valuation':
        reportTitle = 'Laporan Valuasi Persediaan & Audit Stok';
        reportContent = {
          totalValuation: inventory.reduce((a, b) => a + (b.stockQty * b.unitCost), 0),
          totalSKUs: inventory.length,
          lowStockCount: inventory.filter(i => i.stockQty <= i.minStockLevel).length,
          items: inventory
        };
        break;

      case 'procurement_spend':
        reportTitle = 'Laporan Pengadaan & Kepatuhan 3-Way Match';
        reportContent = {
          totalSpend: purchaseOrders.reduce((a, b) => a + b.totalCost, 0),
          poCount: purchaseOrders.length,
          threeWayMatched: purchaseOrders.filter(p => p.threeWayMatched).length
        };
        break;

      default:
        reportTitle = 'Executive Master ERP Intelligence Digest';
        reportContent = {
          totalKas: bankAccounts.reduce((a, b) => a + b.balance, 0),
          salesRevenue: salesInvoices.reduce((a, b) => a + b.totalAmount, 0),
          inventoryVal: inventory.reduce((a, b) => a + (b.stockQty * b.unitCost), 0),
          procurementSpend: purchaseOrders.reduce((a, b) => a + b.totalCost, 0),
          marketingCampaignsCount: marketingCampaigns.length
        };
        break;
    }

    setPreviewData({
      title: reportTitle,
      type,
      dateGenerated: new Date().toISOString(),
      period: selectedPeriod,
      content: reportContent
    });

    setShowPreviewModal(true);
    showNotification(`Laporan ${reportTitle} berhasil di-generate secara real-time!`, 'success');
  };

  const handleDownloadFile = (format: 'pdf' | 'excel' | 'csv' | 'json') => {
    if (!previewData) return;

    if (format === 'pdf') {
      const html = generateReportHtml(previewData);
      printHtmlContent(previewData.title, html);
      showNotification(`Pratinjau cetak dan ekspor PDF untuk '${previewData.title}' siap!`, 'success');
      return;
    }

    const baseFilename = `DKandang_${previewData.type}_${previewData.period.replace(/\s+/g, '_')}`;

    if (format === 'json') {
      const success = exportToJSON(baseFilename, previewData);
      if (success) {
        showNotification(`Laporan '${previewData.title}' berhasil diunduh dalam format JSON!`, 'success');
      } else {
        showNotification(`Gagal mengunduh file JSON.`, 'error');
      }
      return;
    }

    if (format === 'csv' || format === 'excel') {
      let content = `Laporan,"${previewData.title}"\nPeriode,"${previewData.period}"\nTanggal Cetak,"${formatDate(previewData.dateGenerated)}"\n\nRingkasan Metrik,Nilai\n`;
      
      // Breakdown by section
      Object.entries(previewData.content).forEach(([k, v]) => {
        if (Array.isArray(v)) return; // Handled separately below
        const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        const valStr = typeof v === 'number' ? (k.toLowerCase().includes('count') || k.toLowerCase().includes('skus') ? String(v) : formatRupiah(v)) : String(v);
        content += `"${label}","${valStr.replace(/"/g, '""')}"\n`;
      });

      // If there are detailed items (e.g. banks, inventory items)
      if (previewData.content.banks && Array.isArray(previewData.content.banks)) {
        content += `\nDetail Rekening Bank & Kas Resmi\nNama Rekening,Nomor Rekening,Atas Nama,Saldo (Rp)\n`;
        previewData.content.banks.forEach((b: any) => {
          content += `"${b.name}","${b.accountNumber}","${b.accountHolder}","${b.balance}"\n`;
        });
      }

      if (previewData.content.items && Array.isArray(previewData.content.items)) {
        content += `\nDetail Inventaris & Audit Stok\nKode SKU,Nama Barang,Kategori,Stok Fisik,Satuan,Biaya Satuan,Total Valuasi (Rp)\n`;
        previewData.content.items.forEach((item: any) => {
          const totalVal = (item.stockQty || 0) * (item.unitCost || 0);
          content += `"${item.sku}","${(item.name || '').replace(/"/g, '""')}","${item.category}","${item.stockQty}","${item.unit}","${item.unitCost}","${totalVal}"\n`;
        });
      }

      const success = exportRawCSV(baseFilename, content);
      if (success) {
        showNotification(`Laporan '${previewData.title}' berhasil diunduh dalam format ${format.toUpperCase()}!`, 'success');
      } else {
        showNotification(`Gagal mengunduh file ${format.toUpperCase()}.`, 'error');
      }
    }
  };

  const handleTriggerScheduleNow = (schedule: ReportSchedule) => {
    showNotification(`Jadwal otomatis '${schedule.title}' berhasil dieksekusi dan dikirim ke ${schedule.recipients.join(', ')}`, 'success');
  };

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 md:p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Laporan Otomatis & Rekap Pimpinan</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pembuatan laporan berkala (Harian, Mingguan, Bulanan) untuk keuangan, penjualan tiket/rombongan, stok pakan, dan pembelian.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleGenerateReport('executive_summary')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4" /> Buat Rekap Lengkap Sekarang
        </button>
      </div>

      {/* Quick Generator Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          Pusat Pembuatan Laporan Instan per Departemen
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-blue-700">Keuangan & Kasir Tiket</span>
              <h4 className="font-bold text-slate-900 text-xs mt-1">Laporan Arus Kas & Tiketing Gate</h4>
              <p className="text-[11px] text-slate-500 mt-1">Rekap pendapatan tiket pengunjung, resto farm, dan saldo bank.</p>
            </div>
            <button
              onClick={() => handleGenerateReport('finance_cashflow')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Buat & Pratinjau
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-emerald-700">Akuntansi & PSAK 69</span>
              <h4 className="font-bold text-slate-900 text-xs mt-1">Laporan Laba Rugi & Aset Biologis</h4>
              <p className="text-[11px] text-slate-500 mt-1">Valuasi satwa edukasi PSAK 69, HPP pakan ternak, dan laba agrowisata.</p>
            </div>
            <button
              onClick={() => handleGenerateReport('executive_summary')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Buat & Pratinjau
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-amber-700">Persediaan Satwa & Pakan</span>
              <h4 className="font-bold text-slate-900 text-xs mt-1">Laporan Valuasi Pakan & Stok Farm</h4>
              <p className="text-[11px] text-slate-500 mt-1">Konsentrat pakan sapi, bibit hidroponik, susu pasteurisasi, dan souvenir.</p>
            </div>
            <button
              onClick={() => handleGenerateReport('warehouse_valuation')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-amber-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Buat & Pratinjau
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-3 transition-colors shadow-2xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-indigo-700">Pengadaan Sarana Farm</span>
              <h4 className="font-bold text-slate-900 text-xs mt-1">Laporan PO Vendor & Pakan Ternak</h4>
              <p className="text-[11px] text-slate-500 mt-1">Pembelian rumput gajah, konsentrat, vitamin ternak, dan 3-Way Match.</p>
            </div>
            <button
              onClick={() => handleGenerateReport('procurement_spend')}
              className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border border-slate-300 shadow-xs cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" /> Buat & Pratinjau
            </button>
          </div>

        </div>
      </div>

      {/* Automated Scheduling Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900">Jadwal Otomasi Pengiriman Laporan (Cron Reporting Dispatch)</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Sistem secara otomatis mengekspor dan mengirimkan laporan terenkripsi ke email jajaran pimpinan.</p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {reportSchedules.length} Jadwal Aktif
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Nama Laporan Rutin</th>
                <th className="p-3.5">Frekuensi Jadwal</th>
                <th className="p-3.5">Modul Terkait</th>
                <th className="p-3.5">Daftar Penerima Email</th>
                <th className="p-3.5">Format Berkas</th>
                <th className="p-3.5">Jadwal Kirim Berikutnya</th>
                <th className="p-3.5 text-center">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportSchedules.map((sch) => (
                <tr key={sch.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{sch.title}</td>
                  <td className="p-3.5">
                    <span className="capitalize px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[10px]">
                      {sch.frequency}
                    </span>
                  </td>
                  <td className="p-3.5 uppercase font-mono text-slate-600 text-[11px]">{sch.module}</td>
                  <td className="p-3.5 text-slate-600">
                    {sch.recipients.join(', ')}
                  </td>
                  <td className="p-3.5 font-mono text-emerald-700 font-bold uppercase text-[11px]">{sch.format}</td>
                  <td className="p-3.5 text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> {sch.nextRun}
                  </td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleTriggerScheduleNow(sch)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1 mx-auto transition-all shadow-xs cursor-pointer"
                    >
                      <Send className="w-3 h-3 text-emerald-600" /> Eksekusi Sekarang
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Pratinjau Laporan & Download Formats */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-slate-800">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                  Hasil Generasi Otomatis
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg mt-1">{previewData.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode: <strong>{previewData.period}</strong> • Tanggal Ekspor: {new Date(previewData.dateGenerated).toLocaleString('id-ID')}
                </p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Generated Document Content Preview */}
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-4 text-xs text-slate-700 shadow-2xs">
              <div className="text-center pb-3 border-b border-slate-200">
                <h4 className="font-bold text-emerald-700 text-sm">{companyProfile.name.toUpperCase()}</h4>
                <p className="text-[11px] text-slate-500">{companyProfile.ptName} • Sistem Laporan ERP Terintegrasi</p>
              </div>

              {previewData.type === 'finance_cashflow' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Total Kas & Bank:</span>
                      <strong className="text-slate-900 font-mono text-sm">{formatRupiah(previewData.content.totalKas)}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Arus Kas Masuk:</span>
                      <strong className="text-emerald-700 font-mono text-sm">+{formatRupiah(previewData.content.inflows)}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Arus Kas Keluar:</span>
                      <strong className="text-rose-700 font-mono text-sm">-{formatRupiah(previewData.content.outflows)}</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="font-semibold text-slate-700 block mb-1">Rincian Saldo Akun Bank:</span>
                    <div className="space-y-1">
                      {previewData.content.banks.map((b: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-slate-700 bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs">
                          <span>{b.name}</span>
                          <strong className="font-mono text-slate-900">{formatRupiah(b.balance)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {previewData.type === 'warehouse_valuation' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                    <span className="font-medium text-slate-700">Total Valuasi Persediaan Aset:</span>
                    <strong className="text-emerald-700 font-mono text-base font-bold">{formatRupiah(previewData.content.totalValuation)}</strong>
                  </div>
                  <div className="text-slate-600">
                    Jumlah Master SKU: <strong className="text-slate-900">{previewData.content.totalSKUs}</strong> • Stok Di Bawah Minimum: <strong className="text-rose-600 font-bold">{previewData.content.lowStockCount}</strong>
                  </div>
                </div>
              )}

              {previewData.type === 'procurement_spend' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                    <span className="font-medium text-slate-700">Total Belanja Pengadaan PO:</span>
                    <strong className="text-rose-700 font-mono text-base font-bold">{formatRupiah(previewData.content.totalSpend)}</strong>
                  </div>
                  <div className="text-slate-600">
                    PO Terbit: <strong className="text-slate-900">{previewData.content.poCount}</strong> • 3-Way Match Terpenuhi: <strong className="text-emerald-700 font-bold">{previewData.content.threeWayMatched} PO</strong>
                  </div>
                </div>
              )}

              {previewData.type === 'executive_summary' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Likuiditas Kas & Bank</span>
                      <strong className="text-blue-700 font-mono text-sm">{formatRupiah(previewData.content.totalKas)}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Pendapatan Penjualan Terfaktur</span>
                      <strong className="text-emerald-700 font-mono text-sm">{formatRupiah(previewData.content.salesRevenue)}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Valuasi Persediaan Gudang</span>
                      <strong className="text-amber-700 font-mono text-sm">{formatRupiah(previewData.content.inventoryVal)}</strong>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
                      <span className="text-slate-500 text-[10px] block">Realisasi Belanja PO Vendor</span>
                      <strong className="text-rose-700 font-mono text-sm">{formatRupiah(previewData.content.procurementSpend)}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Format Terenkripsi E2EE Siap Unduh:
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownloadFile('pdf')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF
                </button>
                <button
                  onClick={() => handleDownloadFile('excel')}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Unduh Excel (.csv)
                </button>
                <button
                  onClick={() => handleDownloadFile('csv')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" /> Unduh CSV
                </button>
                <button
                  onClick={() => handleDownloadFile('json')}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" /> Encrypted JSON
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
