import React from 'react';
import { useERP } from '../../context/ERPContext';
import { formatRupiah, formatCompactRupiah } from '../../utils/crypto';
import { 
  getLeadStudentPax, 
  getLeadTotalPax, 
  getLeadPackage, 
  getLeadEventDate, 
  getLeadProbability 
} from '../../utils/salesProgressHelper';
import { 
  Coins, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  PieChart, 
  CheckCircle2, 
  Clock, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function RevenueForecastView() {
  const { leads } = useERP();

  // Define Forecast Months
  const MONTHS = [
    { key: '2026-07', label: 'Juli 2026' },
    { key: '2026-08', label: 'Agustus 2026' },
    { key: '2026-09', label: 'September 2026' },
    { key: '2026-10', label: 'Oktober 2026' },
    { key: '2026-11', label: 'November 2026' }
  ];

  // Group leads by target visit month
  const monthlyData = MONTHS.map(m => {
    const monthLeads = leads.filter(l => {
      const dt = getLeadEventDate(l);
      return dt && dt.startsWith(m.key);
    });

    const totalDeals = monthLeads.length;
    const totalPotential = monthLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const wonLeads = monthLeads.filter(l => l.stage === 'won');
    const wonRevenue = wonLeads.reduce((acc, l) => acc + (l.dealValue || 0), 0);
    const weightedForecast = monthLeads.reduce((acc, l) => {
      const prob = getLeadProbability(l);
      return acc + ((l.dealValue || 0) * prob / 100);
    }, 0);
    const totalPax = monthLeads.reduce((acc, l) => acc + getLeadTotalPax(l), 0);
    const wonPax = wonLeads.reduce((acc, l) => acc + getLeadTotalPax(l), 0);

    // Estimated Cash Inflow Schedule
    // DP (30% on closing) vs Settlement (70% on event date)
    const estimatedDP = weightedForecast * 0.3;
    const estimatedPelunasan = weightedForecast * 0.7;

    return {
      ...m,
      totalDeals,
      totalPotential,
      wonRevenue,
      weightedForecast,
      totalPax,
      wonPax,
      estimatedDP,
      estimatedPelunasan
    };
  });

  const totalForecastValue = monthlyData.reduce((acc, m) => acc + m.weightedForecast, 0);
  const totalWonValue = monthlyData.reduce((acc, m) => acc + m.wonRevenue, 0);
  const totalForecastPax = monthlyData.reduce((acc, m) => acc + m.totalPax, 0);

  // Group by Package Type for Product Share
  const packageMap = new Map<string, { count: number; totalVal: number; totalPax: number }>();
  leads.forEach(l => {
    const pkg = getLeadPackage(l);
    if (!packageMap.has(pkg)) {
      packageMap.set(pkg, { count: 0, totalVal: 0, totalPax: 0 });
    }
    const cur = packageMap.get(pkg)!;
    cur.count += 1;
    cur.totalVal += (l.dealValue || 0);
    cur.totalPax += getLeadTotalPax(l);
  });

  const packageList = Array.from(packageMap.entries()).map(([name, data]) => ({
    name,
    ...data,
    sharePct: totalForecastValue > 0 ? (data.totalVal / leads.reduce((s, x) => s + (x.dealValue || 0), 0)) * 100 : 0
  })).sort((a, b) => b.totalVal - a.totalVal);

  return (
    <div className="space-y-6">
      
      {/* 1. FORECAST CASH INFLOW HEADER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Forecast Tertimbang</span>
            <Coins className="w-4 h-4 text-emerald-700" />
          </div>
          <span className="text-2xl font-black text-slate-900 block">{formatRupiah(totalForecastValue)}</span>
          <p className="text-[10px] text-slate-500 font-medium">
            Berdasarkan kalkulasi probabilitas di setiap tahap deal
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Realisasi Closing Terkunci</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-800 block">{formatRupiah(totalWonValue)}</span>
          <p className="text-[10px] text-emerald-600 font-medium">
            Pendapatan pasti dari rombongan yang telah Closing / Won
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Estimasi Arus Kas Masuk (DP 30%)</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-2xl font-black text-blue-900 block">{formatRupiah(totalForecastValue * 0.3)}</span>
          <p className="text-[10px] text-blue-600 font-medium">
            Proyeksi penerimaan uang muka sebelum hari kunjungan
          </p>
        </div>
      </div>

      {/* 2. MONTHLY FORECAST SCHEDULE TABLE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Jadwal Proyeksi Pendapatan Bulanan (Semester II 2026)
          </h3>
          <p className="text-xs text-slate-500">
            Pemisahan estimasi penerimaan termin Down Payment (DP 30%) dan Pelunasan Hari-H (70%)
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Bulan Kunjungan</th>
                <th className="py-3 px-3">Jumlah Rombongan</th>
                <th className="py-3 px-3">Estimasi Siswa/Pax</th>
                <th className="py-3 px-3">Total Potensi Nilai</th>
                <th className="py-3 px-3">Closing Terkunci (Won)</th>
                <th className="py-3 px-3">Forecast Tertimbang</th>
                <th className="py-3 px-3">Estimasi DP (30%)</th>
                <th className="py-3 px-4 text-right">Pelunasan H-H (70%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {monthlyData.map((m) => (
                <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{m.label}</span>
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-slate-800">
                    {m.totalDeals} Rombongan
                  </td>

                  <td className="py-3.5 px-3 text-slate-700">
                    <strong>{m.totalPax.toLocaleString('id-ID')}</strong> Pax
                    {m.wonPax > 0 && <span className="text-[10px] text-emerald-700 block">({m.wonPax} Won)</span>}
                  </td>

                  <td className="py-3.5 px-3 font-medium text-slate-600">
                    {formatRupiah(m.totalPotential)}
                  </td>

                  <td className="py-3.5 px-3 font-bold text-emerald-700">
                    {formatRupiah(m.wonRevenue)}
                  </td>

                  <td className="py-3.5 px-3 font-extrabold text-slate-900">
                    {formatRupiah(m.weightedForecast)}
                  </td>

                  <td className="py-3.5 px-3 font-semibold text-blue-700">
                    {formatRupiah(m.estimatedDP)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-800">
                    {formatRupiah(m.estimatedPelunasan)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-900">
              <tr>
                <td className="py-3.5 px-4">TOTAL KESELURUHAN</td>
                <td className="py-3.5 px-3">{monthlyData.reduce((s, m) => s + m.totalDeals, 0)} Rombongan</td>
                <td className="py-3.5 px-3">{totalForecastPax.toLocaleString('id-ID')} Pax</td>
                <td className="py-3.5 px-3">{formatRupiah(monthlyData.reduce((s, m) => s + m.totalPotential, 0))}</td>
                <td className="py-3.5 px-3 text-emerald-800">{formatRupiah(totalWonValue)}</td>
                <td className="py-3.5 px-3 text-slate-900">{formatRupiah(totalForecastValue)}</td>
                <td className="py-3.5 px-3 text-blue-800">{formatRupiah(totalForecastValue * 0.3)}</td>
                <td className="py-3.5 px-4 text-right text-emerald-800">{formatRupiah(totalForecastValue * 0.7)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. PRODUCT / PACKAGE DEMAND FORECAST */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-600" />
            Distribusi Permintaan Paket Agrowisata & Field Trip
          </h3>
          <p className="text-xs text-slate-500">
            Analisis kontribusi pendapatan per varian paket edukasi anak & keluarga
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {packageList.map((pkg) => (
            <div key={pkg.name} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-slate-900 truncate max-w-[180px]" title={pkg.name}>
                  {pkg.name}
                </h5>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  {pkg.sharePct.toFixed(1)}% Share
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500">{pkg.count} Deal • {pkg.totalPax} Pax</span>
                <span className="font-extrabold text-slate-900">{formatRupiah(pkg.totalVal)}</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, pkg.sharePct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
