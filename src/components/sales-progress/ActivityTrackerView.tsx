import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  getLeadStudentPax, 
  getLeadTotalPax, 
  getLeadPackage, 
  getLeadEventDate, 
  getLeadSalesRep, 
  getLeadProbability,
  getLeadBillingSummary,
  filterLeadsList
} from '../../utils/salesProgressHelper';
import { STAGES_CONFIG } from './PipelineFunnelView';
import FilterDrawer from '../common/FilterDrawer';
import { 
  Plus, 
  Search, 
  Filter, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  onOpenLogModal: (lead: Lead) => void;
  onOpenDetailModal: (lead: Lead) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedPIC: string;
  setSelectedPIC: (pic: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
}

export default function ActivityTrackerView({
  onOpenLogModal,
  onOpenDetailModal,
  searchQuery,
  setSearchQuery,
  selectedPIC,
  setSelectedPIC,
  selectedMonth,
  setSelectedMonth
}: Props) {
  const { leads, cashTransactions, quotations, updateLeadStage } = useERP();
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [selectedPackage, setSelectedPackage] = useState<string>('all');
  const [selectedBillingStatus, setSelectedBillingStatus] = useState<string>('all');

  // Extract unique packages cleanly using helper
  const uniquePackages = Array.from(new Set(leads.map(l => getLeadPackage(l)).filter(Boolean)));

  // Filter leads using helper
  const baseFilteredLeads = filterLeadsList(leads, {
    searchQuery,
    selectedPIC,
    selectedMonth,
    selectedStage,
    selectedPackage
  });

  // Filter by billing status based on event date and remaining amount
  const filteredLeads = baseFilteredLeads.filter(lead => {
    if (selectedBillingStatus === 'all') return true;
    const billing = getLeadBillingSummary(lead, cashTransactions, quotations);
    if (selectedBillingStatus === 'urgent_only') {
      return billing.remainingAmount > 0 && ['overdue', 'today', 'critical', 'warning'].includes(billing.billingStatus);
    }
    if (selectedBillingStatus === 'overdue_only') {
      return billing.remainingAmount > 0 && billing.billingStatus === 'overdue';
    }
    if (selectedBillingStatus === 'need_billing') {
      return billing.remainingAmount > 0;
    }
    if (selectedBillingStatus === 'paid_only') {
      return billing.remainingAmount <= 0 && billing.dealValue > 0;
    }
    return true;
  });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Extract unique PICs
  const uniquePICs = Array.from(new Set(leads.map(l => getLeadSalesRep(l)).filter(Boolean)));

  const activeFiltersCount = 
    (selectedStage !== 'all' ? 1 : 0) + 
    (selectedBillingStatus !== 'all' ? 1 : 0) + 
    (selectedPackage !== 'all' ? 1 : 0) + 
    (selectedPIC !== 'all' ? 1 : 0) + 
    (selectedMonth !== 'all' ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedStage('all');
    setSelectedBillingStatus('all');
    setSelectedPackage('all');
    setSelectedPIC('all');
    setSelectedMonth('all');
    setSearchQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Filtering Toolbar - Progressive Disclosure */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex-1 w-full flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari sekolah, PIC, paket, catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Drawer Trigger */}
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
              activeFiltersCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter Parameter</span>
            {activeFiltersCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* Reset Button */}
          {(activeFiltersCount > 0 || searchQuery !== '') && (
            <button
              onClick={resetAllFilters}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium shrink-0">
          Menampilkan <strong>{filteredLeads.length}</strong> dari {leads.length} rombongan
        </div>
      </div>

      {/* Collapsible Filter Drawer */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filter Pipeline & Progress Sales"
        subtitle="Atur kriteria PIC sales, bulan kunjungan, tahap funnel, status penagihan & paket"
        activeCount={activeFiltersCount}
        onReset={resetAllFilters}
      >
        <div className="space-y-5">
          {/* 1. PIC Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Sales PIC / Penanggung Jawab</label>
            <select
              value={selectedPIC}
              onChange={(e) => setSelectedPIC(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Sales PIC</option>
              {uniquePICs.map((pic, idx) => (
                <option key={idx} value={pic}>{pic}</option>
              ))}
            </select>
          </div>

          {/* 2. Month Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Jadwal Bulan Kunjungan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Jadwal Kunjungan</option>
              <option value="2026-07">Juli 2026</option>
              <option value="2026-08">Agustus 2026</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-10">Oktober 2026</option>
              <option value="2026-11">November 2026</option>
            </select>
          </div>

          {/* 3. Stage Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Tahap Pipeline (Funnel)</label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Tahap Pipeline</option>
              <option value="qualified">Prospek Masuk (Qualified)</option>
              <option value="proposal">Penawaran & SPH (Proposal)</option>
              <option value="negotiation">Negosiasi & Survey</option>
              <option value="won">Closing / Menang (Won)</option>
              <option value="lost">Batal / Ditolak (Lost)</option>
            </select>
          </div>

          {/* 4. Billing Status Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Status Urgensi Penagihan (AR)</label>
            <select
              value={selectedBillingStatus}
              onChange={(e) => setSelectedBillingStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Status Penagihan</option>
              <option value="urgent_only">🚨 Perlu Ditagih Segera (Jatuh Tempo & H-7)</option>
              <option value="overdue_only">🚨 Jatuh Tempo Saja (Lewat Kunjungan)</option>
              <option value="need_billing">⚠️ Memiliki Sisa Tagihan (&gt; 0)</option>
              <option value="paid_only">✅ Sudah Lunas Saja</option>
            </select>
          </div>

          {/* 5. Package Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">Paket Wisata Edukasi</label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">Semua Paket Wisata</option>
              {uniquePackages.map((pkg, idx) => (
                <option key={idx} value={pkg}>{pkg}</option>
              ))}
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Main Tabular Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4">Sekolah / Lembaga & PIC</th>
                <th className="py-3.5 px-3">Paket & Rincian Peserta</th>
                <th className="py-3.5 px-3">Tanggal Kegiatan</th>
                <th className="py-3.5 px-3">Nilai Deal (IDR)</th>
                <th className="py-3.5 px-3">Tahap & Probabilitas</th>
                <th className="py-3.5 px-3">Log Interaksi Terakhir</th>
                <th className="py-3.5 px-3">Sales PIC</th>
                <th className="py-3.5 px-4 text-right">Aksi Progres</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs">
                    Tidak ada data rombongan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const stageConfig = STAGES_CONFIG.find(s => s.key === (lead.stage || 'qualified')) || STAGES_CONFIG[0];
                  const prob = getLeadProbability(lead);
                  const latestFollowUp = lead.followUpHistory?.[0];
                  const totalFollowUps = lead.followUpHistory?.length || 0;
                  const picName = getLeadSalesRep(lead);
                  const studentPax = getLeadStudentPax(lead);
                  const totalPax = getLeadTotalPax(lead);
                  const eventDate = getLeadEventDate(lead);
                  const pkgName = getLeadPackage(lead);
                  const billing = getLeadBillingSummary(lead, cashTransactions, quotations);

                  return (
                    <tr 
                      key={lead.id} 
                      className={`hover:bg-slate-50/80 transition-colors group ${billing.rowHighlightClass} ${billing.borderAccent}`}
                    >
                      {/* 1. School & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center border border-emerald-100 shrink-0">
                            {lead.company?.charAt(0) || lead.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <button
                              onClick={() => onOpenDetailModal(lead)}
                              className="font-bold text-slate-900 group-hover:text-emerald-700 text-left transition-colors cursor-pointer hover:underline block leading-tight"
                            >
                              {lead.company || lead.name}
                            </button>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              PIC: {lead.name} {lead.phone ? `(${lead.phone})` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Package & Pax Breakdown */}
                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 block text-xs truncate max-w-[170px]" title={pkgName}>
                          {pkgName}
                        </span>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-bold text-emerald-800">{studentPax} Siswa</span>
                          {lead.companionCount ? <span>• {lead.companionCount} Pendamping</span> : null}
                          {lead.teacherCount ? <span>• {lead.teacherCount} Guru</span> : null}
                          <span className="text-slate-400 font-medium">({totalPax} Total)</span>
                        </div>
                      </td>

                      {/* 3. Event Date & Urgency Conditional Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {eventDate ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-slate-800 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{formatDate(eventDate)}</span>
                            </div>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${billing.billingBadgeBg} ${billing.billingBadgeText} ${billing.billingBadgeBorder}`}>
                              {billing.billingBadgeLabel}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Belum dijadwalkan</span>
                        )}
                      </td>

                      {/* 4. Deal Value & Remaining Balance */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-extrabold text-slate-900 block">
                          {formatRupiah(billing.dealValue)}
                        </span>
                        <div className="text-[10px] mt-0.5 space-y-0.5">
                          {billing.paidAmount > 0 && (
                            <span className="text-emerald-700 font-semibold block">
                              Masuk: {formatRupiah(billing.paidAmount)} ({billing.paymentPercentage}%)
                            </span>
                          )}
                          {billing.remainingAmount > 0 ? (
                            <span className="text-rose-700 font-black block">
                              Sisa: {formatRupiah(billing.remainingAmount)}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold block">
                              ✓ Lunas (Rp 0)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Stage & Probability Dropdown */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <select
                            value={lead.stage || 'qualified'}
                            onChange={(e) => updateLeadStage(lead.id, e.target.value as Lead['stage'])}
                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${stageConfig.badgeBg} ${stageConfig.badgeText} ${stageConfig.color}`}
                          >
                            <option value="qualified">Prospek Masuk</option>
                            <option value="proposal">Penawaran & SPH</option>
                            <option value="negotiation">Negosiasi & Survey</option>
                            <option value="won">Closing / Menang</option>
                            <option value="lost">Batal / Lost</option>
                          </select>
                          <div className="flex items-center gap-1 text-[9px] text-slate-500">
                            <span>Prob:</span>
                            <span className="font-bold text-slate-700">{prob}%</span>
                          </div>
                        </div>
                      </td>

                      {/* 6. Latest Follow-Up Log */}
                      <td className="py-3.5 px-3 max-w-[200px]">
                        {latestFollowUp ? (
                          <div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-800">
                              <span className="bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 text-slate-700">
                                {latestFollowUp.action}
                              </span>
                              <span className="text-slate-400 font-normal text-[9px]">
                                {formatDate(latestFollowUp.date)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-600 line-clamp-1 mt-0.5" title={latestFollowUp.note}>
                              {latestFollowUp.note}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Belum ada log interaksi</span>
                        )}
                      </td>

                      {/* 7. Sales PIC */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-slate-700 block" title={picName}>
                          👤 {picName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {totalFollowUps} kali interaksi
                        </span>
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenLogModal(lead)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                            title="Catat kemajuan & interaksi baru"
                          >
                            <Plus className="w-3 h-3" /> Catat Progres
                          </button>
                          
                          <button
                            onClick={() => onOpenDetailModal(lead)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs transition-colors cursor-pointer"
                            title="Lihat rincian lengkap prospek"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
