import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead } from '../../types';
import { formatRupiah, formatCompactRupiah } from '../../utils/crypto';
import { 
  getLeadStudentPax, 
  getLeadTotalPax, 
  getLeadSalesRep, 
  getLeadProbability 
} from '../../utils/salesProgressHelper';
import { 
  Trophy, 
  Target, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Phone, 
  MapPin, 
  FileText, 
  Award, 
  Sparkles, 
  BarChart3, 
  Percent,
  SlidersHorizontal,
  Mail
} from 'lucide-react';

interface Props {
  onSelectPIC: (pic: string) => void;
}

export default function SalesPerformanceView({ onSelectPIC }: Props) {
  const { leads } = useERP();
  const [monthlyTarget, setMonthlyTarget] = useState<number>(150000000); // Rp 150jt default target

  // Total won deals
  const wonDeals = leads.filter(l => l.stage === 'won');
  const totalWonRevenue = wonDeals.reduce((sum, l) => sum + (l.dealValue || 0), 0);
  const totalActivePipeline = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').reduce((sum, l) => sum + (l.dealValue || 0), 0);

  // Group by Sales PIC
  const picMap = new Map<string, {
    picName: string;
    totalDeals: number;
    wonDeals: number;
    lostDeals: number;
    inProgressDeals: number;
    totalPipelineValue: number;
    totalWonValue: number;
    totalPax: number;
    followUpCount: number;
    interactions: {
      wa: number;
      phone: number;
      survey: number;
      meeting: number;
      email: number;
    };
  }>();

  leads.forEach(lead => {
    const pic = getLeadSalesRep(lead);
    if (!picMap.has(pic)) {
      picMap.set(pic, {
        picName: pic,
        totalDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        inProgressDeals: 0,
        totalPipelineValue: 0,
        totalWonValue: 0,
        totalPax: 0,
        followUpCount: 0,
        interactions: { wa: 0, phone: 0, survey: 0, meeting: 0, email: 0 }
      });
    }

    const stat = picMap.get(pic)!;
    stat.totalDeals += 1;
    stat.totalPipelineValue += (lead.dealValue || 0);
    stat.totalPax += getLeadTotalPax(lead);

    if (lead.stage === 'won') {
      stat.wonDeals += 1;
      stat.totalWonValue += (lead.dealValue || 0);
    } else if (lead.stage === 'lost') {
      stat.lostDeals += 1;
    } else {
      stat.inProgressDeals += 1;
    }

    // Follow-ups
    if (lead.followUpHistory) {
      stat.followUpCount += lead.followUpHistory.length;
      lead.followUpHistory.forEach(f => {
        if (f.action === 'WhatsApp') stat.interactions.wa++;
        else if (f.action === 'Telepon') stat.interactions.phone++;
        else if (f.action === 'Survey Lokasi') stat.interactions.survey++;
        else if (f.action === 'Meeting Proposal') stat.interactions.meeting++;
        else if (f.action === 'Email') stat.interactions.email++;
      });
    }
  });

  const picList = Array.from(picMap.values()).sort((a, b) => b.totalWonValue - a.totalWonValue || b.totalPipelineValue - a.totalPipelineValue);

  // Interaction channels totals
  const totalWA = picList.reduce((sum, p) => sum + p.interactions.wa, 0);
  const totalPhone = picList.reduce((sum, p) => sum + p.interactions.phone, 0);
  const totalSurvey = picList.reduce((sum, p) => sum + p.interactions.survey, 0);
  const totalMeeting = picList.reduce((sum, p) => sum + p.interactions.meeting, 0);
  const totalEmail = picList.reduce((sum, p) => sum + p.interactions.email, 0);
  const totalInteractions = totalWA + totalPhone + totalSurvey + totalMeeting + totalEmail;

  // Target achievement
  const targetPct = monthlyTarget > 0 ? (totalWonRevenue / monthlyTarget) * 100 : 0;
  const projectedPct = monthlyTarget > 0 ? ((totalWonRevenue + (totalActivePipeline * 0.6)) / monthlyTarget) * 100 : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. TARGET VS REALISASI OMSET BANNER */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                KPI BULANAN AGROWISATA 2026
              </span>
            </div>
            <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Target Penjualan Rombongan vs Realisasi Closing
            </h3>
            <p className="text-xs text-slate-300">
              Monitoring pencapaian revenue field trip, little farmer, dan paket rombongan edukasi
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 p-2.5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <span className="text-xs text-slate-300 font-medium">Target Bulanan:</span>
            <select
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(Number(e.target.value))}
              className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <option value={75000000}>Rp 75.000.000</option>
              <option value={100000000}>Rp 100.000.000</option>
              <option value={120000000}>Rp 120.000.000</option>
              <option value={150000000}>Rp 150.000.000</option>
              <option value={200000000}>Rp 200.000.000</option>
            </select>
          </div>
        </div>

        {/* Progress Bar & Numerical KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Omset</span>
            <span className="text-lg font-black text-white">{formatRupiah(monthlyTarget)}</span>
            <span className="text-[10px] text-slate-400 block">Target Bulan Berjalan</span>
          </div>

          <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 space-y-1">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">Realisasi Closing (Won)</span>
            <span className="text-lg font-black text-emerald-400">{formatRupiah(totalWonRevenue)}</span>
            <span className="text-[10px] text-emerald-200 block">{targetPct.toFixed(1)}% Tercapai</span>
          </div>

          <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20 space-y-1">
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">Pipeline Aktif</span>
            <span className="text-lg font-black text-blue-300">{formatRupiah(totalActivePipeline)}</span>
            <span className="text-[10px] text-blue-200 block">Potensi Terbuka</span>
          </div>

          <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 space-y-1">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">Proyeksi Total</span>
            <span className="text-lg font-black text-amber-300">{projectedPct.toFixed(1)}%</span>
            <span className="text-[10px] text-amber-200 block">Estimasi Realistis</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Pencapaian Realisasi Closing: <strong>{targetPct.toFixed(1)}%</strong></span>
            <span>Kekurangan Gap: <strong>{formatRupiah(Math.max(0, monthlyTarget - totalWonRevenue))}</strong></span>
          </div>
          <div className="w-full bg-slate-700/80 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, targetPct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. SALES PIC PERFORMANCE LEADERBOARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Leaderboard & Performa Sales Representative (PIC Rombongan)
            </h3>
            <p className="text-xs text-slate-500">
              Evaluasi efektivitas closing, penanganan siswa, dan intensitas follow-up per personil
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Peringkat & Sales PIC</th>
                <th className="py-3 px-3">Total Deal</th>
                <th className="py-3 px-3">Closing (Won)</th>
                <th className="py-3 px-3">Win Rate (%)</th>
                <th className="py-3 px-3">Total Siswa/Pax</th>
                <th className="py-3 px-3">Total Nilai Closing</th>
                <th className="py-3 px-3">Interaksi Follow-up</th>
                <th className="py-3 px-4 text-right">Filter Deal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {picList.map((pic, idx) => {
                const winRate = pic.totalDeals > 0 ? (pic.wonDeals / pic.totalDeals) * 100 : 0;
                return (
                  <tr key={pic.picName} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full font-extrabold text-[11px] flex items-center justify-center ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          idx === 1 ? 'bg-slate-200 text-slate-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">{pic.picName}</span>
                          <span className="text-[10px] text-slate-500">
                            {pic.inProgressDeals} Prospek Berjalan • {pic.lostDeals} Batal
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {pic.totalDeals} Deal
                    </td>

                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {pic.wonDeals} Won
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">{winRate.toFixed(0)}%</span>
                        <div className="w-12 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${winRate}%` }} />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      {pic.totalPax.toLocaleString('id-ID')} Pax
                    </td>

                    <td className="py-3.5 px-3 font-extrabold text-emerald-800">
                      {formatRupiah(pic.totalWonValue)}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span title="WhatsApp">💬 {pic.interactions.wa}</span>
                        <span title="Telepon">📞 {pic.interactions.phone}</span>
                        <span title="Survey Lokasi">📍 {pic.interactions.survey}</span>
                        <span title="Meeting Proposal">📄 {pic.interactions.meeting}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onSelectPIC(pic.picName)}
                        className="px-3 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                      >
                        Lihat Prospek →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. INTERACTION CHANNELS BREAKDOWN */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            Distribusi Saluran Interaksi & Tindak Lanjut Sales
          </h3>
          <p className="text-xs text-slate-500">
            Total {totalInteractions} interaksi tercatat di seluruh prospek rombongan sekolah
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase">WhatsApp Chat</span>
              <MessageSquare className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-black text-emerald-900 block">{totalWA} Log</span>
            <span className="text-[10px] text-emerald-700 font-medium">Follow-up Terbanyak</span>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-blue-800">
              <span className="text-[10px] font-bold uppercase">Panggilan Telepon</span>
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-xl font-black text-blue-900 block">{totalPhone} Log</span>
            <span className="text-[10px] text-blue-700 font-medium">Konfirmasi Cepat</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-[10px] font-bold uppercase">Survey Lokasi Farm</span>
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <span className="text-xl font-black text-emerald-900 block">{totalSurvey} Log</span>
            <span className="text-[10px] text-emerald-700 font-medium">Kunjungan Guru/PIC</span>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-1">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-[10px] font-bold uppercase">Meeting & SPH</span>
              <FileText className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xl font-black text-amber-900 block">{totalMeeting} Log</span>
            <span className="text-[10px] text-amber-700 font-medium">Presentasi Proposal</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-[10px] font-bold uppercase">Email Korespondensi</span>
              <Mail className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-xl font-black text-slate-900 block">{totalEmail} Log</span>
            <span className="text-[10px] text-slate-500 font-medium">Surat Penawaran Resmi</span>
          </div>
        </div>
      </div>

    </div>
  );
}
