import React, { useState, useMemo } from 'react';
import { ChartOfAccount, JournalEntry } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { exportToCSV } from '../../utils/exportHelper';
import { 
  Scale, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Layers
} from 'lucide-react';

interface TrialBalanceViewProps {
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const TrialBalanceView: React.FC<TrialBalanceViewProps> = ({
  chartOfAccounts,
  journalEntries,
  showNotification
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Compute available periods from journalEntries
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    journalEntries.forEach(j => {
      if (j.date && j.date.length >= 7) {
        set.add(j.date.substring(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort().reverse();
  }, [journalEntries]);

  // Filter journals based on selected period
  const periodJournals = useMemo(() => {
    if (selectedPeriod === 'all') return journalEntries;
    return journalEntries.filter(j => j.date.startsWith(selectedPeriod));
  }, [journalEntries, selectedPeriod]);

  // Compute trial balance rows
  const trialBalanceRows = useMemo(() => {
    return chartOfAccounts.map(acc => {
      let mutDebit = 0;
      let mutCredit = 0;

      for (const jrn of periodJournals) {
        for (const line of jrn.lines) {
          if (line.accountCode === acc.code) {
            mutDebit += Number(line.debit) || 0;
            mutCredit += Number(line.credit) || 0;
          }
        }
      }

      // Calculate final debit/credit based on normal balance
      let endingDebit = 0;
      let endingCredit = 0;

      if (acc.normalBalance === 'Debit') {
        const net = mutDebit - mutCredit;
        if (net >= 0) {
          endingDebit = net;
          endingCredit = 0;
        } else {
          endingDebit = 0;
          endingCredit = Math.abs(net);
        }
      } else {
        const net = mutCredit - mutDebit;
        if (net >= 0) {
          endingCredit = net;
          endingDebit = 0;
        } else {
          endingCredit = 0;
          endingDebit = Math.abs(net);
        }
      }

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        category: acc.category,
        normalBalance: acc.normalBalance,
        mutDebit,
        mutCredit,
        endingDebit,
        endingCredit
      };
    });
  }, [chartOfAccounts, periodJournals]);

  // Filtered rows for table display
  const filteredRows = useMemo(() => {
    return trialBalanceRows.filter(r => {
      const matchSearch = searchTerm === '' || 
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = categoryFilter === 'all' || r.type === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [trialBalanceRows, searchTerm, categoryFilter]);

  // Totals of all rows (unfiltered by search to maintain accounting truth)
  const totalMutDebit = trialBalanceRows.reduce((sum, r) => sum + r.mutDebit, 0);
  const totalMutCredit = trialBalanceRows.reduce((sum, r) => sum + r.mutCredit, 0);
  const totalEndingDebit = trialBalanceRows.reduce((sum, r) => sum + r.endingDebit, 0);
  const totalEndingCredit = trialBalanceRows.reduce((sum, r) => sum + r.endingCredit, 0);

  const isBalanced = totalEndingDebit === totalEndingCredit;
  const discrepancy = Math.abs(totalEndingDebit - totalEndingCredit);

  const handleExportCSV = () => {
    const headers = [
      'Kode Akun',
      'Nama Akun',
      'Klasifikasi',
      'Kategori',
      'Saldo Normal',
      'Mutasi Debit (Rp)',
      'Mutasi Kredit (Rp)',
      'Saldo Akhir Debit (Rp)',
      'Saldo Akhir Kredit (Rp)'
    ];

    const rows = trialBalanceRows.map(r => [
      r.code,
      r.name,
      r.type,
      r.category,
      r.normalBalance,
      r.mutDebit,
      r.mutCredit,
      r.endingDebit,
      r.endingCredit
    ]);

    // Summary row
    rows.push([
      'TOTAL',
      'KESEIMBANGAN NERACA SALDO',
      '-',
      '-',
      '-',
      totalMutDebit,
      totalMutCredit,
      totalEndingDebit,
      totalEndingCredit
    ]);

    const periodLabel = selectedPeriod === 'all' ? 'Semua_Periode' : selectedPeriod;
    const filename = `Neraca_Saldo_${periodLabel}_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Neraca Saldo (Trial Balance) berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor Neraca Saldo.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari kode atau nama akun..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-60"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none"
              >
                <option value="all">Semua Tipe Akun</option>
                <option value="Asset">Aset (Asset)</option>
                <option value="Liability">Kewajiban (Liability)</option>
                <option value="Equity">Ekuitas (Equity)</option>
                <option value="Revenue">Pendapatan (Revenue)</option>
                <option value="Expense">Beban (Expense)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-transparent text-slate-700 font-semibold focus:outline-none"
              >
                <option value="all">Semua Periode (YTD 2026)</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>Periode: {p}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor Neraca Saldo
          </button>
        </div>

        {/* Verification Strip */}
        <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
          isBalanced 
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50/70 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {isBalanced ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {isBalanced 
                  ? 'Audit Integritas Neraca Saldo: SEIMBANG (Zero-Fault Matched)' 
                  : `Audit Integritas: TIDAK SEIMBANG (Selisih: ${formatRupiah(discrepancy)})`}
              </span>
              <p className="text-[11px] opacity-80 mt-0.5">
                Total Mutasi Debit: <strong className="font-mono">{formatRupiah(totalMutDebit)}</strong> | Total Mutasi Kredit: <strong className="font-mono">{formatRupiah(totalMutCredit)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono self-end sm:self-auto bg-white/80 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <span className="text-[10px] text-slate-500 block">Total Saldo Debit</span>
              <span className="font-bold text-slate-800">{formatRupiah(totalEndingDebit)}</span>
            </div>
            <div className="w-px h-6 bg-slate-200"></div>
            <div>
              <span className="text-[10px] text-slate-500 block">Total Saldo Kredit</span>
              <span className="font-bold text-slate-800">{formatRupiah(totalEndingCredit)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            <span className="font-bold text-slate-800">Buku Neraca Saldo Sebelum Penyesuaian / Pasca Penyesuaian</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Menampilkan {filteredRows.length} dari {chartOfAccounts.length} Akun
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="p-3">Kode Akun</th>
                <th className="p-3">Nama Akun Buku Besar</th>
                <th className="p-3">Klasifikasi</th>
                <th className="p-3 text-center">Posisi Normal</th>
                <th className="p-3 text-right">Mutasi Debit (Rp)</th>
                <th className="p-3 text-right">Mutasi Kredit (Rp)</th>
                <th className="p-3 text-right bg-emerald-50/40">Saldo Akhir Debit (Rp)</th>
                <th className="p-3 text-right bg-emerald-50/40">Saldo Akhir Kredit (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                    Tidak ada akun yang sesuai dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono font-bold text-emerald-800">{row.code}</td>
                    <td className="p-3 font-medium text-slate-800">{row.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.type === 'Asset' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                        row.type === 'Liability' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        row.type === 'Equity' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                        row.type === 'Revenue' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                      {row.normalBalance}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {row.mutDebit > 0 ? formatRupiah(row.mutDebit) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {row.mutCredit > 0 ? formatRupiah(row.mutCredit) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/20">
                      {row.endingDebit > 0 ? formatRupiah(row.endingDebit) : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-slate-800 bg-emerald-50/20">
                      {row.endingCredit > 0 ? formatRupiah(row.endingCredit) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs text-slate-800">
              <tr>
                <td colSpan={4} className="p-3 text-right text-slate-600 uppercase text-[11px]">
                  Total Keseimbangan (Grand Total):
                </td>
                <td className="p-3 text-right font-mono text-slate-700">
                  {formatRupiah(totalMutDebit)}
                </td>
                <td className="p-3 text-right font-mono text-slate-700">
                  {formatRupiah(totalMutCredit)}
                </td>
                <td className="p-3 text-right font-mono text-emerald-800 bg-emerald-50/60">
                  {formatRupiah(totalEndingDebit)}
                </td>
                <td className="p-3 text-right font-mono text-emerald-800 bg-emerald-50/60">
                  {formatRupiah(totalEndingCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
