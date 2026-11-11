import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead } from '../../types';
import { formatRupiah, formatCompactRupiah, formatDate } from '../../utils/crypto';
import { 
  getLeadBillingSummary, 
  LeadBillingSummary,
  getARScheduleBucket
} from '../../utils/salesProgressHelper';
import WhatsAppARReminderModal from './WhatsAppARReminderModal';
import { 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Download, 
  Printer, 
  MessageSquare, 
  Eye, 
  Plus, 
  ArrowUpDown
} from 'lucide-react';

interface Props {
  onOpenLogModal: (lead: Lead) => void;
  onOpenDetailModal: (lead: Lead) => void;
  onOpenOfficialReport?: () => void;
  initialPIC?: string;
  initialMonth?: string;
}

type SimpleFilterTab = 'all' | 'urgent' | 'this_week' | 'month' | 'paid';
type SortOption = 'urgency' | 'eventDateAsc' | 'remainingDesc' | 'schoolAsc';

export default function UpcomingARScheduleView({
  onOpenLogModal,
  onOpenDetailModal,
  onOpenOfficialReport,
  initialPIC = 'all',
  initialMonth = 'all'
}: Props) {
  const { leads, cashTransactions, quotations } = useERP();

  // Simple state
  const [activeTab, setActiveTab] = useState<SimpleFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPIC, setSelectedPIC] = useState<string>(initialPIC);
  const [selectedMonth, setSelectedMonth] = useState<string>(initialMonth);
  const [sortBy, setSortBy] = useState<SortOption>('urgency');

  // WhatsApp Reminder Modal state
  const [selectedItemForWA, setSelectedItemForWA] = useState<LeadBillingSummary | null>(null);

  // 1. Calculate Billing Summaries for all leads
  const allSummaries: LeadBillingSummary[] = useMemo(() => {
    return leads.map(lead => getLeadBillingSummary(lead, cashTransactions, quotations));
  }, [leads, cashTransactions, quotations]);

  // Unique PICs for filter
  const uniquePICs = useMemo(() => {
    return Array.from(new Set(allSummaries.map(s => s.salesRep).filter(Boolean)));
  }, [allSummaries]);

  // Key KPI metrics (Simple & Clean - 3 Core Cards)
  const metrics = useMemo(() => {
    const totalContractValue = allSummaries.reduce((sum, s) => sum + s.dealValue, 0);
    const totalPaid = allSummaries.reduce((sum, s) => sum + s.paidAmount, 0);
    const totalRemaining = allSummaries.reduce((sum, s) => sum + s.remainingAmount, 0);

    const urgentList = allSummaries.filter(
      s => s.remainingAmount > 0 && s.daysDiff !== null && s.daysDiff <= 3
    );
    const urgentAmount = urgentList.reduce((sum, s) => sum + s.remainingAmount, 0);

    const thisWeekList = allSummaries.filter(
      s => s.remainingAmount > 0 && s.daysDiff !== null && s.daysDiff >= 0 && s.daysDiff <= 7
    );

    const monthList = allSummaries.filter(
      s => s.remainingAmount > 0 && s.daysDiff !== null && s.daysDiff >= 0 && s.daysDiff <= 30
    );

    const paidList = allSummaries.filter(s => s.remainingAmount <= 0 && s.dealValue > 0);

    const collectionRate = totalContractValue > 0 ? (totalPaid / totalContractValue) * 100 : 0;

    return {
      totalDeals: allSummaries.length,
      totalRemaining,
      unpaidCount: allSummaries.filter(s => s.remainingAmount > 0).length,
      urgentCount: urgentList.length,
      urgentAmount,
      thisWeekCount: thisWeekList.length,
      monthCount: monthList.length,
      paidCount: paidList.length,
      totalPaid,
      collectionRate
    };
  }, [allSummaries]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return allSummaries.filter(item => {
      // Tab filter
      if (activeTab === 'urgent') {
        if (item.remainingAmount <= 0) return false;
        if (item.daysDiff === null || item.daysDiff > 3) return false;
      } else if (activeTab === 'this_week') {
        if (item.remainingAmount <= 0) return false;
        if (item.daysDiff === null || item.daysDiff < 0 || item.daysDiff > 7) return false;
      } else if (activeTab === 'month') {
        if (item.remainingAmount <= 0) return false;
        if (item.daysDiff === null || item.daysDiff < 0 || item.daysDiff > 30) return false;
      } else if (activeTab === 'paid') {
        if (item.remainingAmount > 0 || item.dealValue <= 0) return false;
      } else if (activeTab === 'all') {
        // default: show all with remaining balance, or all records
      }

      // PIC filter
      if (selectedPIC !== 'all') {
        if (!item.salesRep.toLowerCase().includes(selectedPIC.toLowerCase())) return false;
      }

      // Month filter
      if (selectedMonth !== 'all') {
        if (!item.eventDate || !item.eventDate.startsWith(selectedMonth)) return false;
      }

      // Search query
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

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') {
        return a.urgencyLevel - b.urgencyLevel || b.remainingAmount - a.remainingAmount;
      }
      if (sortBy === 'eventDateAsc') {
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return a.eventDate.localeCompare(b.eventDate);
      }
      if (sortBy === 'remainingDesc') {
        return b.remainingAmount - a.remainingAmount;
      }
      if (sortBy === 'schoolAsc') {
        return a.schoolName.localeCompare(b.schoolName);
      }
      return 0;
    });
  }, [allSummaries, activeTab, selectedPIC, selectedMonth, searchQuery, sortBy]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Status Tagihan',
      'Tanggal Kunjungan',
      'Nama Sekolah',
      'Nama PIC',
      'No. Telepon',
      'Paket',
      'Total Pax',
      'Nilai Transaksi',
      'Pembayaran Masuk',
      'Sisa Piutang',
      'Sales PIC'
    ];

    const rows = filteredItems.map(item => [
      `"${item.billingBadgeLabel}"`,
      `"${item.eventDate || '-'}"`,
      `"${item.schoolName.replace(/"/g, '""')}"`,
      `"${item.picName.replace(/"/g, '""')}"`,
      `"${item.picPhone}"`,
      `"${item.packageName.replace(/"/g, '""')}"`,
      item.totalPax,
      item.dealValue,
      item.paidAmount,
      item.remainingAmount,
      `"${item.salesRep}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Jadwal_Piutang_DKandang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150" id="upcoming-ar-schedule-view">
      
      {/* 1. SIMPLE & CLEAN SUMMARY CARDS (Only 3 high-contrast, calm cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Card 1: Total Piutang */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Piutang Berjalan</span>
            <span className="text-xs text-slate-400 font-medium">{metrics.unpaidCount} Rombongan</span>
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(metrics.totalRemaining)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Sisa tagihan yang belum dilunasi
          </div>
        </div>

        {/* Card 2: Perlu Ditagih Segera */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              Perlu Ditagih Segera
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
              {metrics.urgentCount} Sekolah
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-800 tracking-tight">
            {formatRupiah(metrics.urgentAmount)}
          </div>
          <div className="mt-1 text-xs text-rose-600">
            Jatuh tempo atau kunjungan dalam ≤ 3 hari
          </div>
        </div>

        {/* Card 3: Realisasi Masuk */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pembayaran Diterima</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {metrics.collectionRate.toFixed(1)}% Tertagih
            </span>
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            {formatRupiah(metrics.totalPaid)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Total uang muka & termin masuk
          </div>
        </div>

      </div>

      {/* 2. SIMPLE NAVIGATION TABS & ACTION BUTTONS */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
        
        {/* Simple Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto p-0.5">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Semua ({allSummaries.length})
          </button>

          <button
            onClick={() => setActiveTab('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'urgent'
                ? 'bg-rose-700 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Mendesak ({metrics.urgentCount})
          </button>

          <button
            onClick={() => setActiveTab('this_week')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'this_week'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Minggu Ini ({metrics.thisWeekCount})
          </button>

          <button
            onClick={() => setActiveTab('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'month'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            30 Hari ({metrics.monthCount})
          </button>

          <button
            onClick={() => setActiveTab('paid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'paid'
                ? 'bg-emerald-700 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sudah Lunas ({metrics.paidCount})
          </button>
        </div>

        {/* Export & Print */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Ekspor
          </button>
          <button
            onClick={() => {
              if (onOpenOfficialReport) {
                onOpenOfficialReport();
              } else {
                window.print();
              }
            }}
            title="Cetak Laporan Resmi Penagihan & Rombongan"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak
          </button>
        </div>

      </div>

      {/* 3. COMPACT SEARCH & FILTER BAR */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama sekolah atau PIC..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* PIC Filter */}
          <select
            value={selectedPIC}
            onChange={(e) => setSelectedPIC(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
          >
            <option value="all">Semua Sales PIC</option>
            {uniquePICs.map((pic, idx) => (
              <option key={idx} value={pic}>{pic}</option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
          >
            <option value="all">Semua Bulan Kunjungan</option>
            <option value="2026-07">Juli 2026</option>
            <option value="2026-08">Agustus 2026</option>
            <option value="2026-09">September 2026</option>
            <option value="2026-10">Oktober 2026</option>
            <option value="2026-11">November 2026</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
          <span className="text-xs text-slate-400 font-medium">Urutkan:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer"
          >
            <option value="urgency">Tingkat Urgensi</option>
            <option value="eventDateAsc">Tanggal Kunjungan</option>
            <option value="remainingDesc">Sisa Piutang Terbesar</option>
            <option value="schoolAsc">Nama Sekolah (A-Z)</option>
          </select>
        </div>
      </div>

      {/* 4. CLEAN, HIGH-LEGIBILITY TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium">Tidak ada data tagihan yang sesuai dengan filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Tgl Kunjungan</th>
                  <th className="py-2.5 px-3">Sekolah & PIC</th>
                  <th className="py-2.5 px-3">Paket & Peserta</th>
                  <th className="py-2.5 px-3 text-right">Nilai Kontrak</th>
                  <th className="py-2.5 px-3 text-right">Pembayaran Masuk</th>
                  <th className="py-2.5 px-3 text-right">Sisa Piutang</th>
                  <th className="py-2.5 px-3">Sales PIC</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => {
                  const isUrgent = item.remainingAmount > 0 && item.daysDiff !== null && item.daysDiff <= 3;
                  const isOverdue = item.remainingAmount > 0 && item.daysDiff !== null && item.daysDiff < 0;
                  const isPaid = item.remainingAmount <= 0;

                  return (
                    <tr key={item.lead.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            Lunas
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                            Jatuh Tempo
                          </span>
                        ) : isUrgent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            H-{item.daysDiff} Kritis
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {item.daysDiff !== null ? `H-${item.daysDiff}` : 'Terjadwal'}
                          </span>
                        )}
                      </td>

                      {/* Tanggal Kunjungan */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-medium">
                        {item.eventDate ? formatDate(item.eventDate) : '-'}
                      </td>

                      {/* Sekolah & PIC */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onOpenDetailModal(item.lead)}
                          className="font-semibold text-slate-900 hover:text-slate-600 text-left transition-colors cursor-pointer block"
                        >
                          {item.schoolName}
                        </button>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.picName} {item.picPhone ? `• ${item.picPhone}` : ''}
                        </div>
                      </td>

                      {/* Paket & Pax */}
                      <td className="py-3 px-3 text-slate-600">
                        <div className="font-medium text-slate-800 truncate max-w-[140px]" title={item.packageName}>
                          {item.packageName}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.totalPax} Pax
                        </div>
                      </td>

                      {/* Nilai Kontrak */}
                      <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatRupiah(item.dealValue)}
                      </td>

                      {/* Pembayaran Masuk */}
                      <td className="py-3 px-3 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {formatRupiah(item.paidAmount)}
                      </td>

                      {/* Sisa Piutang */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-bold ${item.remainingAmount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                          {formatRupiah(item.remainingAmount)}
                        </span>
                      </td>

                      {/* Sales PIC */}
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                        {item.salesRep}
                      </td>

                      {/* Aksi Cepat */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {/* WhatsApp Reminder */}
                          {item.remainingAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedItemForWA(item)}
                              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                              title="Kirim Pesan WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(item.lead)}
                            className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            title="Lihat Detail Prospek"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Catat Log */}
                          <button
                            type="button"
                            onClick={() => onOpenLogModal(item.lead)}
                            className="p-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                            title="Catat Follow-up / Progres"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900 text-xs">
                <tr>
                  <td className="py-2.5 px-3" colSpan={4}>
                    Total ({filteredItems.length} Rombongan)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatRupiah(filteredItems.reduce((s, i) => s + i.dealValue, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-700">
                    {formatRupiah(filteredItems.reduce((s, i) => s + i.paidAmount, 0))}
                  </td>
                  <td className="py-2.5 px-3 text-right text-rose-700 font-bold">
                    {formatRupiah(filteredItems.reduce((s, i) => s + i.remainingAmount, 0))}
                  </td>
                  <td className="py-2.5 px-3" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 5. WHATSAPP REMINDER MODAL */}
      {selectedItemForWA && (
        <WhatsAppARReminderModal
          item={selectedItemForWA}
          onClose={() => setSelectedItemForWA(null)}
        />
      )}

    </div>
  );
}
