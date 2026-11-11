import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead } from '../../types';
import { formatRupiah, formatCompactRupiah } from '../../utils/crypto';
import { exportToCSV } from '../../utils/exportHelper';
import { 
  getLeadStudentPax, 
  getLeadTotalPax, 
  getLeadPackage, 
  getLeadEventDate, 
  getLeadSalesRep, 
  getLeadProbability,
  getLeadBillingSummary
} from '../../utils/salesProgressHelper';
import ActivityTrackerView from './ActivityTrackerView';
import SalesPerformanceView from './SalesPerformanceView';
import RevenueForecastView from './RevenueForecastView';
import UpcomingARScheduleView from './UpcomingARScheduleView';
import LogProgressModal from './LogProgressModal';
import OfficialProgressReportModal from './OfficialProgressReportModal';
import ProspectDetailModal from '../sales/ProspectDetailModal';
import { 
  LineChart, 
  TrendingUp, 
  Target, 
  Plus, 
  Printer, 
  Download, 
  Calendar, 
  CalendarClock,
  Users, 
  Coins, 
  CheckCircle2, 
  Activity, 
  Layers, 
  Kanban, 
  FileSpreadsheet, 
  Sparkles,
  PieChart,
  SlidersHorizontal,
  RefreshCw,
  Search,
  AlertTriangle
} from 'lucide-react';

type TabType = 'tracker' | 'ar_schedule' | 'performance' | 'forecast';

export default function SalesProgressModule() {
  const { leads, cashTransactions, quotations, refreshAllData, showNotification } = useERP();
  const [activeTab, setActiveTab] = useState<TabType>('tracker');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPIC, setSelectedPIC] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [activeLeadForLog, setActiveLeadForLog] = useState<Lead | null>(null);
  const [activeLeadForDetailId, setActiveLeadForDetailId] = useState<string | null>(null);

  // Compute billing summaries and schools that urgently need collection
  const billingSummaries = useMemo(() => {
    return leads.map(l => getLeadBillingSummary(l, cashTransactions, quotations));
  }, [leads, cashTransactions, quotations]);

  const urgentBillingLeads = useMemo(() => {
    return billingSummaries.filter(s => s.remainingAmount > 0 && ['overdue', 'today', 'critical', 'warning'].includes(s.billingStatus));
  }, [billingSummaries]);

  const overdueCount = useMemo(() => {
    return billingSummaries.filter(s => s.remainingAmount > 0 && s.billingStatus === 'overdue').length;
  }, [billingSummaries]);

  const totalUrgentRemaining = useMemo(() => {
    return urgentBillingLeads.reduce((sum, s) => sum + s.remainingAmount, 0);
  }, [urgentBillingLeads]);

  // Extract unique PICs for filtering
  const uniquePICs = Array.from(
    new Set(
      leads.map(l => getLeadSalesRep(l)).filter(Boolean)
    )
  ) as string[];

  // Top KPI Metrics with robust helpers
  const totalDeals = leads.length;
  const totalPipelineValue = leads.reduce((sum, l) => sum + (l.dealValue || 0), 0);
  const wonDeals = leads.filter(l => l.stage === 'won');
  const totalWonValue = wonDeals.reduce((sum, l) => sum + (l.dealValue || 0), 0);
  const totalWeightedValue = leads.reduce((sum, l) => {
    const prob = getLeadProbability(l);
    return sum + ((l.dealValue || 0) * prob / 100);
  }, 0);
  const totalPax = leads.reduce((sum, l) => sum + getLeadTotalPax(l), 0);
  const totalWonPax = wonDeals.reduce((sum, l) => sum + getLeadTotalPax(l), 0);
  const totalActivities = leads.reduce((sum, l) => sum + (l.followUpHistory?.length || 0), 0);
  const winRate = totalDeals > 0 ? (wonDeals.length / totalDeals) * 100 : 0;

  const handleOpenLogModal = (lead?: Lead) => {
    setActiveLeadForLog(lead || null);
    setIsLogModalOpen(true);
  };

  const handleOpenDetailModal = (lead: Lead) => {
    setActiveLeadForDetailId(lead.id);
  };

  const handleSelectPICFromPerformance = (pic: string) => {
    setSelectedPIC(pic);
    setActiveTab('tracker');
  };

  const activeLeadForDetail = activeLeadForDetailId 
    ? leads.find(l => l.id === activeLeadForDetailId) || null 
    : null;

  const exportToCSVData = () => {
    const headers = [
      'ID Prospek',
      'Nama Sekolah / Rombongan',
      'Nama PIC',
      'Kontak Telepon',
      'Paket Wisata',
      'Peserta Siswa',
      'Total Peserta (Siswa+Pendamping)',
      'Tanggal Kunjungan',
      'Nilai Deal (IDR)',
      'Tahap Pipeline',
      'Probabilitas (%)',
      'Sales PIC',
      'Catatan Terakhir'
    ];

    const rows = leads.map(l => {
      const latestNote = l.followUpHistory?.[0]?.note || l.notes || '';
      return [
        l.id,
        l.company || l.name,
        l.name,
        l.phone || '-',
        getLeadPackage(l),
        getLeadStudentPax(l),
        getLeadTotalPax(l),
        getLeadEventDate(l),
        l.dealValue || 0,
        l.stage || 'qualified',
        `${getLeadProbability(l)}%`,
        getLeadSalesRep(l),
        latestNote
      ];
    });

    const filename = `Progress_Sales_DKandang_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Data progress sales & pipeline berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor data progress sales.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="sales-progress-module">
      
      {/* 1. MODULE HEADER & GLOBAL CONTROLS */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              SISTEM & PELAPORAN PROGRESS SALES
            </span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-xs text-slate-500 font-medium">Monitoring Kunjungan & Field Trip D'Kandang</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LineChart className="w-7 h-7 text-emerald-600" />
            Monitoring Progress & Pipeline Sales
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pelaporan komprehensif kemajuan prospek sekolah, konversi funnel, kinerja PIC, dan proyeksi pendapatan
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenLogModal()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Catat Progres / Follow-up
          </button>

          <button
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Laporan Resmi
          </button>

          <button
            onClick={exportToCSVData}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            title="Ekspor data pipeline ke file CSV/Excel"
          >
            <Download className="w-4 h-4" /> Ekspor CSV
          </button>

          <button
            onClick={() => refreshAllData()}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-colors cursor-pointer"
            title="Muat ulang data terkini"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. TOP KPI SUMMARY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Total Pipeline */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Potensi Pipeline</span>
          <span className="text-base font-extrabold text-slate-900 block truncate">{formatCompactRupiah(totalPipelineValue)}</span>
          <span className="text-[10px] text-slate-500 font-medium block">{totalDeals} Prospek Terdaftar</span>
        </div>

        {/* KPI 2: Weighted Forecast */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Forecast Tertimbang</span>
          <span className="text-base font-extrabold text-slate-900 block truncate">{formatCompactRupiah(totalWeightedValue)}</span>
          <span className="text-[10px] text-slate-500 font-medium block">Probabilitas Terhitung</span>
        </div>

        {/* KPI 3: Won Deals Closing */}
        <div className="bg-white rounded-3xl p-4 border border-emerald-200/80 bg-emerald-50/30 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Closing (Won Deal)</span>
          <span className="text-base font-extrabold text-emerald-800 block truncate">{formatCompactRupiah(totalWonValue)}</span>
          <span className="text-[10px] text-emerald-700 font-semibold block">{wonDeals.length} Rombongan Closing</span>
        </div>

        {/* KPI 4: Win Rate */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Efektivitas (Win Rate)</span>
          <span className="text-base font-extrabold text-blue-900 block">{winRate.toFixed(1)}%</span>
          <span className="text-[10px] text-blue-600 font-medium block">Rasio Konversi Lead</span>
        </div>

        {/* KPI 5: Total Pax Siswa */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Total Peserta / Siswa</span>
          <span className="text-base font-extrabold text-slate-900 block">{totalPax.toLocaleString('id-ID')} Pax</span>
          <span className="text-[10px] text-amber-700 font-medium block">{totalWonPax} Pax Terkonfirmasi</span>
        </div>

        {/* KPI 6: Activity Logs */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Interaksi Follow-Up</span>
          <span className="text-base font-extrabold text-slate-900 block">{totalActivities} Log</span>
          <span className="text-[10px] text-slate-500 font-medium block">WA, Survey, & SPH</span>
        </div>

      </div>

      {/* 2.5 EXECUTIVE BILLING & PAYMENT ALERT BANNER */}
      {urgentBillingLeads.length > 0 && (
        <div className="bg-rose-50/60 rounded-2xl p-3.5 border border-rose-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 border border-rose-200">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-rose-900">
                  Perhatian Penagihan: {urgentBillingLeads.length} Rombongan Sekolah
                </span>
                {overdueCount > 0 && (
                  <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-rose-200 text-rose-800">
                    {overdueCount} Jatuh Tempo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Total sisa tagihan <strong className="text-rose-900 font-bold">{formatRupiah(totalUrgentRemaining)}</strong> perlu ditindaklanjuti menjelang atau melewati tanggal kunjungan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => setActiveTab('ar_schedule')}
              className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5" /> Buka Jadwal Piutang
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" /> Cetak Laporan
            </button>
          </div>
        </div>
      )}

      {/* 3. NAVIGATION TABS & FILTER BAR */}
      <div className="bg-white rounded-3xl p-2.5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'tracker'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Matriks Progres & Log Aktivitas
          </button>

          {/* Upcoming AR Schedule Tab */}
          <button
            onClick={() => setActiveTab('ar_schedule')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ar_schedule'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>Jadwal Piutang (Upcoming AR)</span>
            {urgentBillingLeads.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'ar_schedule' ? 'bg-white text-rose-700' : 'bg-rose-600 text-white'
              }`}>
                {urgentBillingLeads.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'performance'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Target className="w-4 h-4" /> Performa Sales & Target
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'forecast'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <Coins className="w-4 h-4" /> Proyeksi & Arus Kas
          </button>
        </div>
      </div>

      {/* 4. ACTIVE TAB CONTENT */}
      <div>
        {activeTab === 'tracker' && (
          <ActivityTrackerView
            onOpenLogModal={handleOpenLogModal}
            onOpenDetailModal={handleOpenDetailModal}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedPIC={selectedPIC}
            setSelectedPIC={setSelectedPIC}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
          />
        )}

        {activeTab === 'ar_schedule' && (
          <UpcomingARScheduleView
            onOpenLogModal={handleOpenLogModal}
            onOpenDetailModal={handleOpenDetailModal}
            onOpenOfficialReport={() => setIsReportModalOpen(true)}
            initialPIC={selectedPIC}
            initialMonth={selectedMonth}
          />
        )}

        {activeTab === 'performance' && (
          <SalesPerformanceView
            onSelectPIC={handleSelectPICFromPerformance}
          />
        )}

        {activeTab === 'forecast' && (
          <RevenueForecastView />
        )}
      </div>

      {/* 5. MODALS INTEGRATION */}
      {isLogModalOpen && (
        <LogProgressModal
          lead={activeLeadForLog}
          onClose={() => {
            setIsLogModalOpen(false);
            setActiveLeadForLog(null);
          }}
        />
      )}

      {isReportModalOpen && (
        <OfficialProgressReportModal
          selectedMonth={selectedMonth}
          onClose={() => setIsReportModalOpen(false)}
        />
      )}

      {activeLeadForDetail && (
        <ProspectDetailModal
          lead={activeLeadForDetail}
          onClose={() => setActiveLeadForDetailId(null)}
        />
      )}

    </div>
  );
}
