import React, { useState } from 'react';
import { JournalEntry } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { RotateCcw, X, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ReversalEntryModalProps {
  journal: JournalEntry | null;
  onClose: () => void;
  onConfirmReversal: (journalId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
}

export const ReversalEntryModal: React.FC<ReversalEntryModalProps> = ({
  journal,
  onClose,
  onConfirmReversal
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!journal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await onConfirmReversal(journal.id, reason.trim());
      if (res.success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Buat Jurnal Pembalik (Storno Reversal)
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Voucher Asal: {journal.entryNumber}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Voucher Summary */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tanggal Voucher:</span>
              <strong className="text-slate-800">{formatDate(journal.date)}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Deskripsi:</span>
              <strong className="text-slate-800 text-right max-w-xs truncate">{journal.description}</strong>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Nilai Voucher:</span>
              <strong className="font-mono text-emerald-800">{formatRupiah(journal.totalAmount)}</strong>
            </div>
          </div>

          {/* Lines Preview */}
          <div className="space-y-1">
            <span className="font-semibold text-slate-600 block">Rincian Baris yang Akan Dibalik:</span>
            <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white p-2">
              {journal.lines.map((l, i) => (
                <div key={i} className="py-1 flex justify-between items-center text-[11px]">
                  <div>
                    <span className="font-mono font-bold mr-1.5 text-slate-700">{l.accountCode}</span>
                    <span className="text-slate-600">{l.accountName}</span>
                  </div>
                  <div className="font-mono text-right">
                    {/* Invert preview: Debit becomes Credit, Credit becomes Debit */}
                    {l.debit > 0 ? (
                      <span className="text-rose-700">Dibalik ke Kredit: {formatRupiah(l.debit)}</span>
                    ) : (
                      <span className="text-emerald-800">Dibalik ke Debit: {formatRupiah(l.credit)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Alasan Pembalikan / Koreksi Transaksi (Wajib Kepatuhan Audit):
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Koreksi nomor akun beban operasional / pembatalan tagihan..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2 text-slate-700">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Standar PSAK / Audit Zero-Fault:</strong> Voucher asli tetap tersimpan secara permanen untuk memelihara nomor urut dokumen, sedangkan voucher pembalik baru diterbitkan untuk menolkan pengaruh saldo pada Bagan Akun (COA).
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!reason.trim() || isSubmitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Membukukan...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Bukukan Jurnal Pembalik
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
