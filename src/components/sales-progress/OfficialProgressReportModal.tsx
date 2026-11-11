import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  getLeadBillingSummary, 
  LeadBillingSummary
} from '../../utils/salesProgressHelper';
import { printElementById } from '../../utils/printHelper';
import { exportToCSV } from '../../utils/exportHelper';
import { 
  Printer, 
  Download, 
  X, 
  Search, 
  FileText
} from 'lucide-react';

interface Props {
  onClose: () => void;
  selectedMonth?: string;
}

type BillingFilter = 'all' | 'unpaid_only' | 'urgent_only' | 'paid_only';
type SortOption = 'urgency' | 'date_asc' | 'date_desc' | 'debt_desc' | 'contract_desc';

/**
 * Helper untuk menentukan teks status DP serta H-H secara ringkas dan informatif
 * sesuai kebutuhan resmi (menampilkan apakah sudah DP serta status H-H kunjungan).
 */
export function getDPAndHStatus(item: LeadBillingSummary): { label: string; badgeClass: string } {
  const isPaid = item.remainingAmount <= 0 && item.dealValue > 0;
  const hasDP = item.paidAmount > 0 && item.remainingAmount > 0;
  const days = item.daysDiff;

  let hText = '';
  if (days !== null) {
    if (days === 0) {
      hText = 'Hari H';
    } else if (days > 0) {
      hText = `H-${days}`;
    } else {
      hText = `H+${Math.abs(days)}`;
    }
  }

  // 1. Sudah Lunas
  if (isPaid) {
    return {
      label: hText ? `Lunas (${hText})` : 'Lunas',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  }

  // 2. Sudah DP
  if (hasDP) {
    const isOverdue = days !== null && days < 0;
    const isUrgent = days !== null && days >= 0 && days <= 3;

    let badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
    if (isOverdue) {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    } else if (isUrgent) {
      badgeClass = 'bg-amber-100 text-amber-900 border-amber-400 font-bold';
    }

    return {
      label: hText ? `Sudah DP (${hText})` : 'Sudah DP',
      badgeClass
    };
  }

  // 3. Belum DP
  const isOverdue = days !== null && days < 0;
  const isUrgent = days !== null && days >= 0 && days <= 3;

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
  if (isOverdue || isUrgent) {
    badgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
  }

  return {
    label: hText ? `Belum DP (${hText})` : 'Belum DP',
    badgeClass
  };
}

export default function OfficialProgressReportModal({ onClose, selectedMonth: initialSelectedMonth }: Props) {
  const { leads, quotations, cashTransactions, companyProfile, currentUser, showNotification } = useERP();

  // Simple state
  const [selectedMonth, setSelectedMonth] = useState<string>(initialSelectedMonth || 'all');
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('urgency');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const reportDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const reportNumber = `DK-REP/SALES/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Process summaries
  const allSummaries: LeadBillingSummary[] = useMemo(() => {
    return leads.map(lead => getLeadBillingSummary(lead, cashTransactions, quotations));
  }, [leads, cashTransactions, quotations]);

  // 2. Filter data
  const filteredSummaries = useMemo(() => {
    return allSummaries.filter(item => {
      // Month
      if (selectedMonth !== 'all') {
        if (!item.eventDate || !item.eventDate.startsWith(selectedMonth)) {
          return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const school = item.schoolName.toLowerCase();
        const pic = item.picName.toLowerCase();
        const rep = item.salesRep.toLowerCase();
        const pkg = item.packageName.toLowerCase();
        if (!school.includes(q) && !pic.includes(q) && !rep.includes(q) && !pkg.includes(q)) {
          return false;
        }
      }

      // Status
      if (billingFilter === 'unpaid_only') {
        return item.remainingAmount > 0;
      }
      if (billingFilter === 'urgent_only') {
        return item.remainingAmount > 0 && item.daysDiff !== null && item.daysDiff <= 3;
      }
      if (billingFilter === 'paid_only') {
        return item.remainingAmount <= 0 && item.dealValue > 0;
      }

      return true;
    }).sort((a, b) => {
      if (sortOption === 'urgency') {
        if (a.urgencyLevel !== b.urgencyLevel) {
          return a.urgencyLevel - b.urgencyLevel;
        }
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortOption === 'date_asc') {
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 9999999999999;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 9999999999999;
        return dateA - dateB;
      }
      if (sortOption === 'date_desc') {
        const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
        const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
        return dateB - dateA;
      }
      if (sortOption === 'debt_desc') {
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortOption === 'contract_desc') {
        return b.dealValue - a.dealValue;
      }
      return 0;
    });
  }, [allSummaries, selectedMonth, searchQuery, billingFilter, sortOption]);

  // 3. Totals
  const totals = useMemo(() => {
    const totalContract = filteredSummaries.reduce((sum, s) => sum + s.dealValue, 0);
    const totalPaid = filteredSummaries.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalRemaining = filteredSummaries.reduce((sum, s) => sum + s.remainingAmount, 0);
    const totalPax = filteredSummaries.reduce((sum, s) => sum + s.totalPax, 0);

    return {
      totalContract,
      totalPaid,
      totalRemaining,
      totalPax,
      percentPaid: totalContract > 0 ? (totalPaid / totalContract) * 100 : 0
    };
  }, [filteredSummaries]);

  // Print using robust printElementById utility
  const handlePrint = () => {
    const periodLabel = selectedMonth !== 'all' ? selectedMonth : 'Semua-Periode';
    const filterLabel = billingFilter !== 'all' ? `_${billingFilter}` : '';
    const cleanDocTitle = `Laporan_Resmi_Penagihan_Sales_${periodLabel}${filterLabel}_${new Date().toISOString().split('T')[0]}`;
    printElementById('official-sales-billing-report', cleanDocTitle);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'No',
      'Sekolah',
      'PIC',
      'No. Telepon',
      'Paket',
      'Pax',
      'Tgl Kunjungan',
      'Nilai Kontrak',
      'Pembayaran Masuk',
      'Sisa Piutang',
      'Status',
      'Sales PIC'
    ];

    const rows = filteredSummaries.map((item, idx) => {
      const statusInfo = getDPAndHStatus(item);
      return [
        idx + 1,
        item.schoolName,
        item.picName,
        item.picPhone,
        item.packageName,
        item.totalPax,
        item.eventDate ? formatDate(item.eventDate) : '-',
        item.dealValue,
        item.paidAmount,
        item.remainingAmount,
        statusInfo.label,
        item.salesRep
      ];
    });

    const filename = `Laporan_Penagihan_DKandang_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Laporan penagihan resmi berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor laporan penagihan.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 printable-modal-overlay print:p-0 print:m-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white rounded-2xl max-w-6xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh] printable-modal-card print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none print:w-full print:max-w-none print:overflow-visible transition-all duration-150">
        
        {/* ========================================================================= */}
        {/* SIMPLE TOP CONTROL BAR (Hidden during Print) */}
        {/* ========================================================================= */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden shrink-0">
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900">
              Laporan Penagihan & Jadwal Kunjungan Sekolah
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              ({filteredSummaries.length} Rombongan)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sekolah / PIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-36 sm:w-44"
              />
            </div>

            {/* Filter Status */}
            <select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value as BillingFilter)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="unpaid_only">Belum Lunas Saja</option>
              <option value="urgent_only">Mendesak (≤ 3 Hari)</option>
              <option value="paid_only">Sudah Lunas</option>
            </select>

            {/* Urutkan */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="urgency">Urut: Paling Mendesak</option>
              <option value="date_asc">Urut: Tanggal Terdekat</option>
              <option value="date_desc">Urut: Tanggal Terjauh</option>
              <option value="debt_desc">Urut: Piutang Terbesar</option>
              <option value="contract_desc">Urut: Nilai Kontrak Terbesar</option>
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
            >
              <option value="all">Semua Periode</option>
              <option value="2026-07">Juli 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
            </select>

            {/* Actions */}
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* ========================================================================= */}
        {/* CLEAN, ELEGANT PRINTABLE REPORT AREA */}
        {/* ========================================================================= */}
        <div 
          className="p-6 md:p-8 overflow-y-auto space-y-5 flex-1 text-slate-800 bg-white w-full print:p-0 print:m-0 print:overflow-visible print:h-auto print:max-h-none" 
          id="official-sales-billing-report"
        >
          
          {/* Header Kop Surat Resmi */}
          <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-xl tracking-tighter shrink-0 shadow-xs">
                D'K
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                    {companyProfile?.name || "PT D'KANDANG AMAZING FARM"}
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                    WISATA EDUKASI & KELUARGA
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  Divisi Sales, Marketing & Hubungan Lembaga Pendidikan
                </p>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Jl. Penarikan RT 01 / RW 02, Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519
                </p>
                <p className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-3 pt-0.5">
                  <span>Telp: (021) 7788-9900</span>
                  <span>•</span>
                  <span>WhatsApp: 0812-8899-7700</span>
                  <span>•</span>
                  <span>Email: sales@dkandang.co.id</span>
                  <span>•</span>
                  <span>Website: www.dkandang.co.id</span>
                </p>
              </div>
            </div>
            
            <div className="text-right text-xs space-y-1 shrink-0">
              <div className="inline-block px-2.5 py-1 bg-slate-100 rounded border border-slate-300 font-mono text-[11px] font-bold text-slate-800">
                NO: {reportNumber}
              </div>
              <div className="text-slate-600 text-[11px]">
                Tanggal Terbit: <span className="font-semibold text-slate-900">{reportDate}</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                Periode: <span className="font-semibold text-slate-900">{selectedMonth !== 'all' ? selectedMonth : 'Semua Periode Kunjungan'}</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                Filter: <span className="font-semibold text-slate-900">{
                  billingFilter === 'all' ? 'Semua Status' :
                  billingFilter === 'unpaid_only' ? 'Belum Lunas' :
                  billingFilter === 'urgent_only' ? 'Mendesak (≤ 3 Hari)' : 'Lunas'
                }</span>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-300 -mt-3 mb-2"></div>

          {/* Judul Laporan */}
          <div className="text-center pt-1 pb-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              LAPORAN REKAPITULASI PENAGIHAN & JADWAL KUNJUNGAN ROMBONGAN SEKOLAH
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dokumen Rekonsiliasi Kas Masuk, Nilai Kontrak Deal, dan Piutang Kunjungan Lapangan
            </p>
          </div>

          {/* Executive Summary Metrics Box */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs avoid-page-break">
            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Total Nilai Kontrak</span>
              <span className="text-base font-black text-slate-900 block mt-0.5">
                {formatRupiah(totals.totalContract)}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {totals.totalPax.toLocaleString('id-ID')} Total Siswa & Guru
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
              <span className="text-slate-500 font-medium block text-[11px]">Kas / DP Diterima</span>
              <span className="text-base font-black text-emerald-700 block mt-0.5">
                {formatRupiah(totals.totalPaid)}
              </span>
              <span className="text-[11px] text-emerald-700 font-bold">
                {totals.percentPaid.toFixed(1)}% Terkoleksi
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-rose-200">
              <span className="text-slate-500 font-medium block text-[11px]">Sisa Piutang Berjalan</span>
              <span className="text-base font-black text-rose-700 block mt-0.5">
                {formatRupiah(totals.totalRemaining)}
              </span>
              <span className="text-[11px] text-rose-600 font-medium">
                {filteredSummaries.filter(s => s.remainingAmount > 0).length} Sekolah Belum Lunas
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-lg border border-slate-200">
              <span className="text-slate-500 font-medium block text-[11px]">Status Kunjungan</span>
              <span className="text-base font-black text-slate-800 block mt-0.5">
                {filteredSummaries.length} Rombongan
              </span>
              <span className="text-[11px] text-slate-500">
                {filteredSummaries.filter(s => s.remainingAmount <= 0 && s.dealValue > 0).length} Lunas • {filteredSummaries.filter(s => s.paidAmount > 0 && s.remainingAmount > 0).length} Sudah DP • {filteredSummaries.filter(s => s.paidAmount <= 0 && s.dealValue > 0).length} Belum DP
              </span>
            </div>
          </div>

          {/* Simple Clean Table */}
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-left border border-slate-300 border-collapse table-auto">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[10.5px] sm:text-xs">
                <tr>
                  <th className="py-2 px-2 text-center border border-slate-200 w-8">No</th>
                  <th className="py-2 px-2.5 border border-slate-200">Nama Sekolah & Kontak PIC</th>
                  <th className="py-2 px-2.5 border border-slate-200">Paket & Peserta</th>
                  <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap">Tgl Kunjungan</th>
                  <th className="py-2 px-2.5 text-right border border-slate-200 whitespace-nowrap">Nilai Kontrak</th>
                  <th className="py-2 px-2.5 text-right border border-slate-200 whitespace-nowrap">Kas Masuk</th>
                  <th className="py-2 px-2.5 text-right border border-slate-200 whitespace-nowrap">Sisa Piutang</th>
                  <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap text-center">Status Tagihan</th>
                  <th className="py-2 px-2.5 border border-slate-200 whitespace-nowrap">Sales PIC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 text-[10.5px] sm:text-xs">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 border border-slate-200">
                      Tidak ada data rombongan yang memenuhi kriteria filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((item, idx) => {
                    const statusInfo = getDPAndHStatus(item);

                    return (
                      <tr key={item.lead.id} className="avoid-page-break hover:bg-slate-50/60 transition-colors">
                        <td className="py-2 px-2 text-center text-slate-500 font-medium border border-slate-200">{idx + 1}</td>
                        <td className="py-2 px-2.5 border border-slate-200">
                          <div className="font-bold text-slate-900 text-xs">{item.schoolName}</div>
                          <div className="text-[10px] sm:text-[10.5px] text-slate-500 leading-tight">{item.picName} {item.picPhone ? `• ${item.picPhone}` : ''}</div>
                        </td>
                        <td className="py-2 px-2.5 border border-slate-200">
                          <div className="font-medium text-slate-800 text-xs">{item.packageName}</div>
                          <div className="text-[10px] sm:text-[10.5px] text-slate-500 leading-tight">{item.totalPax} Peserta (Pax)</div>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-800 border border-slate-200">
                          {item.eventDate ? formatDate(item.eventDate) : '-'}
                          {item.daysDiff !== null && (
                            <span className={`block text-[9.5px] font-normal ${item.daysDiff < 0 ? 'text-slate-400' : item.daysDiff <= 3 ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {item.daysDiff < 0 ? `${Math.abs(item.daysDiff)} hari lalu` : item.daysDiff === 0 ? 'Hari ini' : `${item.daysDiff} hari lagi`}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-right font-medium text-slate-800 whitespace-nowrap border border-slate-200">
                          {formatRupiah(item.dealValue)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-semibold text-emerald-700 whitespace-nowrap border border-slate-200">
                          {formatRupiah(item.paidAmount)}
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap border border-slate-200">
                          <span className={`font-bold ${item.remainingAmount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                            {formatRupiah(item.remainingAmount)}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap border border-slate-200 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] sm:text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-slate-700 font-medium border border-slate-200">
                          {item.salesRep}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-400 font-bold text-slate-900 text-[10.5px] sm:text-xs">
                <tr className="avoid-page-break">
                  <td colSpan={4} className="py-2 px-2.5 border border-slate-200">
                    TOTAL REKAPITULASI ({filteredSummaries.length} Rombongan Sekolah)
                  </td>
                  <td className="py-2 px-2.5 text-right border border-slate-200 text-slate-900">
                    {formatRupiah(totals.totalContract)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-700 border border-slate-200 font-black">
                    {formatRupiah(totals.totalPaid)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-rose-700 border border-slate-200 font-black">
                    {formatRupiah(totals.totalRemaining)}
                  </td>
                  <td colSpan={2} className="py-2 px-2.5 text-center border border-slate-200 text-[10.5px] text-slate-600 font-semibold">
                    {totals.percentPaid.toFixed(1)}% Terbayar
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures Block */}
          <div className="pt-6 border-t border-slate-300 signature-block avoid-page-break">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-14 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 font-medium block">Dibuat Oleh:</span>
                  <span className="text-[11px] text-slate-400">Sales & Customer Service</span>
                </div>
                <div>
                  <strong className="block text-slate-900 underline font-bold text-sm">
                    {currentUser?.name || 'Staff Sales'}
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    NIP: DK-SLS-{new Date().getFullYear()}01
                  </span>
                </div>
              </div>

              <div className="space-y-14 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 font-medium block">Diverifikasi Oleh:</span>
                  <span className="text-[11px] text-slate-400">Finance & Accounting</span>
                </div>
                <div>
                  <strong className="block text-slate-900 underline font-bold text-sm">
                    Staff Keuangan & Kasir
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    NIP: DK-FIN-{new Date().getFullYear()}04
                  </span>
                </div>
              </div>

              <div className="space-y-14 flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 font-medium block">Mengetahui & Menyetujui:</span>
                  <span className="text-[11px] text-slate-400">Manajemen D'Kandang Farm</span>
                </div>
                <div>
                  <strong className="block text-slate-900 underline font-bold text-sm">
                    Pimpinan / General Manager
                  </strong>
                  <span className="text-[11px] text-slate-500">
                    PT D'Kandang Amazing Farm Depok
                  </span>
                </div>
              </div>
            </div>

            {/* Verification Footer & Security Audit Note */}
            <div className="mt-8 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Dokumen resmi terverifikasi sistem D'Kandang Enterprise ERP. Sah sebagai arsip keuangan & logistik.</span>
              </div>
              <div>
                Waktu Cetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
