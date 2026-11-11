import React, { useState, useMemo } from 'react';
import { ChartOfAccount, JournalEntry, AccountingPeriodLock, User } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  Lock, 
  Unlock, 
  CalendarCheck, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Plus, 
  ShieldCheck, 
  X, 
  TrendingUp, 
  ArrowRight,
  HelpCircle,
  Clock
} from 'lucide-react';

interface PeriodClosingManagerProps {
  accountingPeriods: AccountingPeriodLock[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  currentUser: User;
  closeAccountingPeriod: (period: string, notes?: string) => Promise<{ success: boolean; message?: string }>;
  reopenAccountingPeriod: (periodId: string) => Promise<{ success: boolean; message?: string }>;
  showNotification: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const PeriodClosingManager: React.FC<PeriodClosingManagerProps> = ({
  accountingPeriods,
  chartOfAccounts,
  journalEntries,
  currentUser,
  closeAccountingPeriod,
  reopenAccountingPeriod,
  showNotification
}) => {
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  });
  const [closingNotes, setClosingNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reopen confirmation state
  const [reopeningPeriod, setReopeningPeriod] = useState<AccountingPeriodLock | null>(null);
  const [isReopening, setIsReopening] = useState(false);

  const isSuperAdminOrDirector = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
  const isAccountingRole = currentUser.role === 'accounting_manager';
  const canClosePeriod = isSuperAdminOrDirector || isAccountingRole;

  // Real-time calculation for period preview
  const previewData = useMemo(() => {
    const periodJournals = journalEntries.filter(j => j.date.startsWith(selectedPeriod) && !j.isClosingEntry);
    const revAccounts = chartOfAccounts.filter(a => a.type === 'Revenue');
    const expAccounts = chartOfAccounts.filter(a => a.type === 'Expense');

    let totalRevenue = 0;
    const revDetails: { code: string; name: string; amount: number }[] = [];
    for (const r of revAccounts) {
      let rBal = 0;
      for (const jrn of periodJournals) {
        for (const l of jrn.lines) {
          if (l.accountCode === r.code) {
            rBal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
          }
        }
      }
      if (rBal > 0) {
        totalRevenue += rBal;
        revDetails.push({ code: r.code, name: r.name, amount: rBal });
      }
    }

    let totalExpense = 0;
    const expDetails: { code: string; name: string; amount: number }[] = [];
    for (const e of expAccounts) {
      let eBal = 0;
      for (const jrn of periodJournals) {
        for (const l of jrn.lines) {
          if (l.accountCode === e.code) {
            eBal += (Number(l.debit) || 0) - (Number(l.credit) || 0);
          }
        }
      }
      if (eBal > 0) {
        totalExpense += eBal;
        expDetails.push({ code: e.code, name: e.name, amount: eBal });
      }
    }

    const netIncome = totalRevenue - totalExpense;
    const isAlreadyLocked = accountingPeriods.some(p => p.period === selectedPeriod && p.status === 'locked');

    return {
      periodJournalsCount: periodJournals.length,
      totalRevenue,
      totalExpense,
      netIncome,
      revDetails,
      expDetails,
      isAlreadyLocked
    };
  }, [journalEntries, chartOfAccounts, selectedPeriod, accountingPeriods]);

  const handleExecuteClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canClosePeriod || isSubmitting) return;

    if (previewData.isAlreadyLocked) {
      showNotification(`Periode ${selectedPeriod} sudah berstatus terkunci.`, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await closeAccountingPeriod(selectedPeriod, closingNotes);
      if (res.success) {
        setShowCloseModal(false);
        setClosingNotes('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteReopen = async () => {
    if (!reopeningPeriod || !isSuperAdminOrDirector || isReopening) return;

    setIsReopening(true);
    try {
      const res = await reopenAccountingPeriod(reopeningPeriod.id);
      if (res.success) {
        setReopeningPeriod(null);
      }
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm">
                  Otoritas Tutup Buku & Penguncian Periode Akuntansi (Period Lock)
                </h3>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  PSAK Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengunci voucher jurnal, mendistribusikan laba/rugi ke Laba Ditahan (Akun 3210), dan mencegah manipulasi data historis demi kepatuhan audit.
              </p>
            </div>
          </div>

          {canClosePeriod && (
            <button
              onClick={() => setShowCloseModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Eksekusi Tutup Buku Periode
            </button>
          )}
        </div>
      </div>

      {/* History of Closed Periods */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-700" />
            <h4 className="font-bold text-xs text-slate-800">Daftar Periode Buku yang Dikunci (Period Locks)</h4>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            {accountingPeriods.length} Periode Tercatat
          </span>
        </div>

        {accountingPeriods.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs space-y-2">
            <Clock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">Belum Ada Periode yang Dikunci</p>
            <p className="text-[11px] max-w-md mx-auto text-slate-500">
              Seluruh transaksi masih berada pada periode berjalan terbuka. Gunakan tombol "Eksekusi Tutup Buku Periode" untuk menutup buku akhir bulan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {accountingPeriods.map(lock => (
              <div key={lock.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{lock.periodName}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {lock.period}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      lock.status === 'locked' 
                        ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {lock.status === 'locked' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {lock.status === 'locked' ? 'DIKUNCI (LOCKED)' : 'DIBUKA KEMBALI'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Ditutup oleh: <strong className="text-slate-700">{lock.closedBy}</strong></span>
                    <span>•</span>
                    <span>Tanggal: <strong>{formatDate(lock.closedAt)}</strong></span>
                    {lock.closingJournalNumber && (
                      <>
                        <span>•</span>
                        <span>Voucher Penutup: <strong className="font-mono text-emerald-800">{lock.closingJournalNumber}</strong></span>
                      </>
                    )}
                  </div>

                  {lock.notes && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/60 mt-1">
                      Catatan: {lock.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Laba Bersih Ditutup</span>
                    <span className="font-mono font-bold text-xs text-emerald-800">
                      {formatRupiah(lock.netIncome)}
                    </span>
                  </div>

                  {isSuperAdminOrDirector && lock.status === 'locked' && (
                    <button
                      onClick={() => setReopeningPeriod(lock)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Buka kembali kunci periode untuk penyesuaian khusus (Direktur/Super Admin)"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Buka Kunci
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Eksekusi Tutup Buku */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Eksekusi Tutup Buku Periode</h3>
                  <p className="text-[11px] text-slate-500">Membukukan Jurnal Penutup & Mengunci Mutasi</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCloseModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteClose} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pilih Periode Bulan & Tahun:</label>
                <input
                  type="month"
                  required
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Real-Time Preview Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>Jumlah Jurnal Teridentifikasi di Periode Ini:</span>
                  <span className="font-mono font-bold text-slate-900">{previewData.periodJournalsCount} transaksi</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>Total Pendapatan yang Ditutup (Debit Akun Pendapatan):</span>
                  <span className="font-mono font-bold text-emerald-800">{formatRupiah(previewData.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 font-medium">
                  <span>Total Beban yang Ditutup (Kredit Akun Beban):</span>
                  <span className="font-mono font-bold text-rose-700">({formatRupiah(previewData.totalExpense)})</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-800 font-bold">
                  <span>Hasil Laba Bersih ke Laba Ditahan (Akun 3210):</span>
                  <span className="font-mono text-sm text-emerald-800">{formatRupiah(previewData.netIncome)}</span>
                </div>
              </div>

              {previewData.isAlreadyLocked && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Periode ini sudah pernah ditutup dan saat ini terkunci.</span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan / Risalah Tutup Buku:</label>
                <textarea
                  rows={2}
                  placeholder="Catatan persetujuan direksi, audit internal, atau rekonsiliasi akhir..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Setelah dieksekusi, sistem secara otomatis menerbitkan voucher jurnal penutup resmi dan mengunci periode ini dari penambahan transaksi baru.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={previewData.isAlreadyLocked || isSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl cursor-pointer"
                >
                  {isSubmitting ? 'Memproses Tutup Buku...' : 'Konfirmasi & Kunci Periode'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Buka Kunci Periode */}
      {reopeningPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Buka Kunci Periode?</h3>
                <p className="text-xs text-slate-500 font-mono">{reopeningPeriod.periodName}</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-slate-700 space-y-1.5">
              <p className="font-semibold text-rose-800">
                Peringatan Otoritas Khusus Direktur & Super Admin:
              </p>
              <p className="text-[11px] leading-relaxed">
                Membuka kembali kunci periode akan mengizinkan penyesuaian voucher pada bulan terkait. Seluruh aktivitas ini akan dicatat ke dalam *Immutable Audit Log*.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReopeningPeriod(null)}
                disabled={isReopening}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteReopen}
                disabled={isReopening}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isReopening ? 'Membuka Kunci...' : 'Ya, Buka Kunci Periode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
