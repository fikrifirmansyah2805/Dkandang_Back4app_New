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
  filterLeadsList
} from '../../utils/salesProgressHelper';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowRight, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2, 
  Clock, 
  Users, 
  Calendar, 
  Sparkles, 
  Phone, 
  MessageSquare, 
  MapPin, 
  FileText,
  AlertCircle,
  TrendingUp,
  Percent,
  XCircle,
  Trophy,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  onOpenLogModal: (lead: Lead) => void;
  onOpenDetailModal: (lead: Lead) => void;
  searchQuery: string;
  selectedPIC: string;
  selectedMonth: string;
}

export interface StageInfo {
  key: Lead['stage'];
  label: string;
  sublabel: string;
  color: string;
  headerBg: string;
  badgeBg: string;
  badgeText: string;
  defaultProbability: number;
}

export const STAGES_CONFIG: StageInfo[] = [
  {
    key: 'qualified',
    label: 'Prospek Masuk',
    sublabel: 'Kualifikasi Kebutuhan & Tanggal',
    color: 'border-blue-300',
    headerBg: 'bg-blue-50/80 border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    defaultProbability: 25
  },
  {
    key: 'proposal',
    label: 'SPH & Penawaran',
    sublabel: 'Proposal & Penawaran Terkirim',
    color: 'border-amber-300',
    headerBg: 'bg-amber-50/80 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    defaultProbability: 50
  },
  {
    key: 'negotiation',
    label: 'Survey & Negosiasi',
    sublabel: 'Survey Lokasi / Penyesuaian Harga',
    color: 'border-blue-300',
    headerBg: 'bg-blue-50/80 border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    defaultProbability: 75
  },
  {
    key: 'won',
    label: 'Closing / Menang',
    sublabel: 'Deal Terkonfirmasi (Siap DP)',
    color: 'border-emerald-300',
    headerBg: 'bg-emerald-50/80 border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    defaultProbability: 100
  },
  {
    key: 'lost',
    label: 'Batal / Lost',
    sublabel: 'Jadwal Batal / Beralih Tempat',
    color: 'border-rose-200',
    headerBg: 'bg-rose-50/80 border-rose-200',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    defaultProbability: 0
  }
];

export default function PipelineFunnelView({
  onOpenLogModal,
  onOpenDetailModal,
  searchQuery,
  selectedPIC,
  selectedMonth
}: Props) {
  const { leads, updateLeadStage } = useERP();
  const [activeStageFilter, setActiveStageFilter] = useState<string>('all');
  const [isCompactMode, setIsCompactMode] = useState<boolean>(true);

  // Filter leads based on props using helper
  const filteredLeads = filterLeadsList(leads, {
    searchQuery,
    selectedPIC,
    selectedMonth
  });

  // Calculate funnel metrics
  const totalDeals = filteredLeads.length;
  const totalPipelineValue = filteredLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
  const totalWeightedValue = filteredLeads.reduce((acc, l) => {
    const prob = getLeadProbability(l);
    return acc + ((l.dealValue || 0) * prob / 100);
  }, 0);

  // Group by stage
  const stageGroups = STAGES_CONFIG.map(st => {
    const items = filteredLeads.filter(l => (l.stage || 'qualified') === st.key);
    const totalVal = items.reduce((sum, i) => sum + (i.dealValue || 0), 0);
    const totalPax = items.reduce((sum, i) => sum + getLeadTotalPax(i), 0);
    const weightedVal = items.reduce((sum, i) => {
      const p = getLeadProbability(i);
      return sum + ((i.dealValue || 0) * p / 100);
    }, 0);

    return {
      ...st,
      items,
      totalVal,
      totalPax,
      weightedVal,
      count: items.length,
      pctOfTotal: totalDeals > 0 ? (items.length / totalDeals) * 100 : 0
    };
  });

  const handleQuickAdvance = async (e: React.MouseEvent, lead: Lead, nextStage: Lead['stage']) => {
    e.stopPropagation();
    await updateLeadStage(lead.id, nextStage);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. VISUAL INTERACTIVE SALES FUNNEL BAR */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Visualisasi Pipeline & Konversi Funnel Penjualan
            </h3>
            <p className="text-xs text-slate-500">
              Distribusi probabilitas dan pergerakan prospek rombongan sekolah dari tahap awal hingga closing
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-slate-500">Nilai Tertimbang:</span>
            <span className="font-bold text-emerald-700">{formatRupiah(totalWeightedValue)}</span>
          </div>
        </div>

        {/* Funnel Visual Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {stageGroups.map((st) => {
            const isSelected = activeStageFilter === st.key;
            return (
              <button
                key={st.key}
                onClick={() => setActiveStageFilter(activeStageFilter === st.key ? 'all' : st.key)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'ring-2 ring-emerald-500 border-transparent shadow-md bg-white'
                    : 'bg-slate-50/70 hover:bg-white border-slate-200 hover:shadow-xs'
                }`}
              >
                {/* Progress bar line at top */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                  st.key === 'won' ? 'bg-emerald-500' :
                  st.key === 'lost' ? 'bg-rose-400' :
                  st.key === 'negotiation' ? 'bg-blue-600' :
                  st.key === 'proposal' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />

                <div className="flex items-center justify-between gap-1 mb-1 mt-1">
                  <span className="text-[11px] font-bold text-slate-700 truncate">{st.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${st.badgeBg} ${st.badgeText}`}>
                    {st.count} Deal
                  </span>
                </div>

                <div className="text-xs font-extrabold text-slate-900 truncate">
                  {formatRupiah(st.totalVal)}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-200/80">
                  <span>{st.totalPax} Pax Total</span>
                  <span className="font-semibold text-slate-700">{st.pctOfTotal.toFixed(0)}% Vol</span>
                </div>
              </button>
            );
          })}
        </div>

        {activeStageFilter !== 'all' && (
          <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 text-xs px-3.5 py-2 rounded-xl border border-emerald-200">
            <span>Menampilkan filter khusus tahap: <strong>{STAGES_CONFIG.find(s => s.key === activeStageFilter)?.label}</strong></span>
            <button
              onClick={() => setActiveStageFilter('all')}
              className="text-xs underline font-semibold hover:text-emerald-950 cursor-pointer"
            >
              Tampilkan Semua Tahap
            </button>
          </div>
        )}
      </div>

      {/* 2. KANBAN PIPELINE BOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            Pengelompokan Pipeline Sekolah
            {isCompactMode && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 normal-case">
                Mode Ringkas (Hemat Ruang)
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500">
            {isCompactMode 
              ? 'Kartu ringkas tanpa detail pesanan sekolah agar hemat tempat. Klik kartu untuk melihat rincian pesanan lengkap.'
              : 'Menampilkan rincian pesanan dan paket kegiatan pada setiap kartu sekolah.'}
          </p>
        </div>

        <button
          onClick={() => setIsCompactMode(!isCompactMode)}
          className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
          title="Alihkan rincian pesanan sekolah"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isCompactMode ? 'Tampilkan Rincian Pesanan' : 'Sembunyikan Pesanan (Mode Ringkas)'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
        {stageGroups
          .filter(st => activeStageFilter === 'all' || activeStageFilter === st.key)
          .map((stage) => {
            const nextStageKey: Lead['stage'] | null = 
              stage.key === 'qualified' ? 'proposal' :
              stage.key === 'proposal' ? 'negotiation' :
              stage.key === 'negotiation' ? 'won' : null;

            const prevStageKey: Lead['stage'] | null = 
              stage.key === 'proposal' ? 'qualified' :
              stage.key === 'negotiation' ? 'proposal' :
              stage.key === 'won' ? 'negotiation' : null;

            return (
              <div 
                key={stage.key} 
                className={`bg-slate-100/70 rounded-3xl p-3.5 border border-slate-200 flex flex-col min-h-[500px] ${
                  activeStageFilter !== 'all' ? 'md:col-span-5' : ''
                }`}
              >
                {/* Column Header */}
                <div className={`p-3 rounded-2xl mb-3 border ${stage.headerBg} flex items-center justify-between`}>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-slate-900">{stage.label}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stage.badgeBg} ${stage.badgeText}`}>
                        {stage.count}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {stage.sublabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-extrabold text-slate-800 block">
                      {formatRupiah(stage.totalVal)}
                    </span>
                    <span className="text-[9px] font-medium text-slate-500">
                      {stage.totalPax} Pax Total
                    </span>
                  </div>
                </div>

                {/* Deal Cards Container */}
                <div className={`space-y-3 flex-1 overflow-y-auto ${
                  activeStageFilter !== 'all' ? 'grid grid-cols-1 md:grid-cols-3 gap-3 space-y-0' : ''
                }`}>
                  {stage.items.length === 0 ? (
                    <div className="p-8 text-center bg-white/60 border border-dashed border-slate-300 rounded-2xl text-slate-400 text-xs">
                      Tidak ada deal di tahap ini.
                    </div>
                  ) : (
                    stage.items.map((lead) => {
                      const prob = getLeadProbability(lead);
                      const picName = getLeadSalesRep(lead);
                      const latestFollowUp = lead.followUpHistory?.[0];
                      const totalPax = getLeadTotalPax(lead);
                      const studentPax = getLeadStudentPax(lead);
                      const eventDate = getLeadEventDate(lead);
                      const pkgName = getLeadPackage(lead);

                      return (
                        <div
                          key={lead.id}
                          onClick={() => onOpenDetailModal(lead)}
                          className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group relative ${
                            isCompactMode ? 'p-3 space-y-2' : 'p-3.5 space-y-2.5'
                          }`}
                        >
                          {/* Top: School Name & Deal Value */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block leading-none mb-1">
                                {lead.institutionType || 'SEKOLAH / ROMBONGAN'}
                              </span>
                              <h5 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight line-clamp-1" title={lead.company || lead.name}>
                                {lead.company || lead.name}
                              </h5>
                              <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                PIC: {lead.name} {lead.phone ? `(${lead.phone})` : ''}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-emerald-700 block">
                                {formatRupiah(lead.dealValue || 0)}
                              </span>
                              <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200 inline-block mt-0.5">
                                {totalPax} Pax
                              </span>
                            </div>
                          </div>

                          {/* Middle: Either Compact Date/Rep OR Full Detailed Package Box */}
                          {isCompactMode ? (
                            /* TAMPILAN RINGKAS: Tanpa detail pesanan sekolah untuk menghemat tempat */
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                              {eventDate ? (
                                <div className="flex items-center gap-1 text-slate-700 font-semibold truncate">
                                  <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{formatDate(eventDate)}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[10px]">Tgl belum dijadwalkan</span>
                              )}
                              <span className="text-[9px] font-medium text-slate-500 shrink-0">
                                👤 {picName.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            /* TAMPILAN LENGKAP: Dengan detail pesanan dan follow up */
                            <>
                              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-600 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-700 truncate">
                                    📦 {pkgName}
                                  </span>
                                  <span className="text-slate-500 text-[9px] shrink-0 font-medium">
                                    ({studentPax} Siswa {lead.companionCount ? `+ ${lead.companionCount} Ortu` : ''})
                                  </span>
                                </div>
                                {eventDate && (
                                  <div className="flex items-center gap-1 text-slate-500">
                                    <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>Kunjungan: <strong>{formatDate(eventDate)}</strong></span>
                                  </div>
                                )}
                              </div>

                              {/* Probability Bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span>Probabilitas Closing:</span>
                                  <span className="font-bold text-slate-700">{prob}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      prob >= 100 ? 'bg-emerald-500' :
                                      prob >= 75 ? 'bg-blue-600' :
                                      prob >= 50 ? 'bg-amber-500' :
                                      prob > 0 ? 'bg-blue-500' : 'bg-slate-300'
                                    }`}
                                    style={{ width: `${Math.max(5, prob)}%` }}
                                  />
                                </div>
                              </div>

                              {latestFollowUp && (
                                <div className="text-[9px] text-slate-500 bg-emerald-50/50 border border-emerald-100/80 rounded-lg p-1.5 line-clamp-2">
                                  <strong className="text-emerald-900">{latestFollowUp.action} ({formatDate(latestFollowUp.date)}):</strong> {latestFollowUp.note}
                                </div>
                              )}
                            </>
                          )}

                          {/* Footer: PIC & Quick Stage Action Buttons */}
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {prob}% Prob
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Open Log Modal */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenLogModal(lead);
                                }}
                                title="Catat interaksi / follow up"
                                className="p-1 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {/* Backward Stage Button */}
                              {prevStageKey && (
                                <button
                                  onClick={(e) => handleQuickAdvance(e, lead, prevStageKey)}
                                  title={`Kembali ke tahap ${STAGES_CONFIG.find(s => s.key === prevStageKey)?.label}`}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg text-[9px] transition-colors cursor-pointer"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Forward Stage Button */}
                              {nextStageKey && (
                                <button
                                  onClick={(e) => handleQuickAdvance(e, lead, nextStageKey)}
                                  title={`Pindahkan ke tahap ${STAGES_CONFIG.find(s => s.key === nextStageKey)?.label}`}
                                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-bold flex items-center gap-0.5 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  Maju <ChevronRight className="w-3 h-3" />
                                </button>
                              )}

                              {/* Mark Won directly if in negotiation or proposal */}
                              {lead.stage !== 'won' && lead.stage !== 'lost' && (
                                <button
                                  onClick={(e) => handleQuickAdvance(e, lead, 'won')}
                                  title="Closing Won Langsung"
                                  className="p-1 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
