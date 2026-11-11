import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { LeadBillingSummary, generateARWhatsAppReminder } from '../../utils/salesProgressHelper';
import { formatRupiah } from '../../utils/crypto';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  Building2, 
  Calendar, 
  Coins, 
  AlertTriangle,
  Sparkles,
  Phone,
  FileText,
  UserCheck
} from 'lucide-react';

interface Props {
  item: LeadBillingSummary;
  onClose: () => void;
}

export default function WhatsAppARReminderModal({ item, onClose }: Props) {
  const { addLeadFollowUp, currentUser, showNotification, bankAccounts } = useERP();
  const [tone, setTone] = useState<'polite' | 'formal' | 'urgent'>(
    item.billingStatus === 'overdue' || item.billingStatus === 'today' || item.billingStatus === 'critical'
      ? 'urgent'
      : 'polite'
  );
  const [message, setMessage] = useState<string>(() => generateARWhatsAppReminder(item, tone, bankAccounts));
  const [copied, setCopied] = useState<boolean>(false);
  const [autoLogFollowUp, setAutoLogFollowUp] = useState<boolean>(true);

  const handleToneChange = (newTone: 'polite' | 'formal' | 'urgent') => {
    setTone(newTone);
    setMessage(generateARWhatsAppReminder(item, newTone, bankAccounts));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      showNotification('Pesan reminder tagihan berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showNotification('Gagal menyalin pesan.', 'error');
    }
  };

  const handleSendWhatsApp = async () => {
    // Format phone: Indonesian phone number normalization
    let cleanPhone = item.picPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }

    if (autoLogFollowUp) {
      try {
        await addLeadFollowUp(
          item.lead.id,
          'whatsapp',
          `[REMINDER AR / TAGIHAN] Mengirimkan pesan reminder pelunasan via WhatsApp kepada ${item.picName} (${item.schoolName}). Sisa Piutang: ${formatRupiah(item.remainingAmount)}. Nada: ${tone.toUpperCase()}.`,
          currentUser?.name || 'Staff Finance / Sales'
        );
      } catch (err) {
        console.error('Error logging follow up:', err);
      }
    }

    const encodedText = encodeURIComponent(message);
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedText}` 
      : `https://wa.me/?text=${encodedText}`;

    // Open WhatsApp link in new window
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    showNotification('Membuka WhatsApp & follow-up tersimpan di sistem!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-emerald-900 border-b border-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Generator Reminder Tagihan (AR) WhatsApp</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  {item.billingBadgeLabel}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                {item.schoolName} • PIC: {item.picName} ({item.picPhone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          {/* Summary Box */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nilai Kontrak</span>
              <span className="text-xs font-bold text-slate-800 block">{formatRupiah(item.dealValue)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">DP Masuk</span>
              <span className="text-xs font-bold text-emerald-700 block">{formatRupiah(item.paidAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Sisa Piutang (AR)</span>
              <span className="text-xs font-black text-rose-700 block">{formatRupiah(item.remainingAmount)}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tgl Kunjungan</span>
              <span className="text-xs font-bold text-slate-800 block">{item.eventDate || '-'}</span>
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Pilih Gaya Bahasa & Nada Pesan:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleToneChange('polite')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                  tone === 'polite'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🌿 Sopan & Ramah
              </button>

              <button
                type="button"
                onClick={() => handleToneChange('formal')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                  tone === 'formal'
                    ? 'bg-blue-50 text-blue-800 border-blue-400 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                📑 Formal Dokumen
              </button>

              <button
                type="button"
                onClick={() => handleToneChange('urgent')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer ${
                  tone === 'urgent'
                    ? 'bg-rose-50 text-rose-900 border-rose-400 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                🚨 Mendesak / Hari-H
              </button>
            </div>
          </div>

          {/* Editable Draft Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-slate-700">
                Pratinjau Draft Pesan WhatsApp (Dapat Diedit Manual):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={9}
              className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-y"
            />
          </div>

          {/* Auto Log Follow-Up Option */}
          <label className="flex items-center gap-2.5 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl cursor-pointer">
            <input
              type="checkbox"
              checked={autoLogFollowUp}
              onChange={(e) => setAutoLogFollowUp(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                Otomatis Catat ke Log Aktivitas & Follow-Up Prospek ERP
              </span>
              <span className="text-[10px] text-slate-500 block">
                Merekam riwayat pengiriman reminder penagihan ini agar terpantau oleh Direktur & Supervisor.
              </span>
            </div>
          </label>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Berhasil Tersalin' : 'Salin Pesan'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" /> Buka WhatsApp & Kirim Reminder
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
