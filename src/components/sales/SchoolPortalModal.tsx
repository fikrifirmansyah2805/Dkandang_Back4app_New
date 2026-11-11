import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { SalesInvoice, PaymentProof } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  School, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Copy, 
  UploadCloud, 
  Building2, 
  Calendar, 
  Download, 
  X, 
  Check, 
  FileText, 
  Eye,
  ExternalLink,
  ShieldCheck,
  Send,
  CreditCard
} from 'lucide-react';

interface SchoolPortalModalProps {
  initialInvoiceId?: string;
  onClose: () => void;
}

export default function SchoolPortalModal({ initialInvoiceId, onClose }: SchoolPortalModalProps) {
  const { 
    salesInvoices, 
    bankAccounts, 
    companyProfile, 
    submitPaymentProof, 
    paymentProofs,
    showNotification
  } = useERP();

  // Search by token or invoice selection
  const [selectedInvId, setSelectedInvId] = useState<string>(
    initialInvoiceId || (salesInvoices[0]?.id || '')
  );
  const [tokenInput, setTokenInput] = useState<string>('');

  // Selected invoice
  const currentInvoice = useMemo(() => {
    return salesInvoices.find(i => i.id === selectedInvId) || salesInvoices[0];
  }, [salesInvoices, selectedInvId]);

  // Handle find by token
  const handleFindByToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    const cleanToken = tokenInput.trim().toLowerCase();
    const found = salesInvoices.find(i => 
      (i.publicAccessToken && i.publicAccessToken.toLowerCase() === cleanToken) ||
      i.invoiceNumber.toLowerCase() === cleanToken
    );
    if (found) {
      setSelectedInvId(found.id);
    } else {
      showNotification('Token akses atau nomor faktur tidak ditemukan', 'warning');
    }
  };

  // Payment Proof Form
  const [amount, setAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bankDestination, setBankDestination] = useState<string>('BCA KCP Sawangan Depok - Giro Operasional');
  const [senderBank, setSenderBank] = useState<string>('BCA');
  const [senderAccountName, setSenderAccountName] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentStage, setPaymentStage] = useState<'dp' | 'installment' | 'settlement' | 'full'>('settlement');
  const [proofFileUrl, setProofFileUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [copiedBank, setCopiedBank] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Initialize amount when invoice changes
  React.useEffect(() => {
    if (currentInvoice) {
      const remaining = Math.max(0, currentInvoice.totalAmount - (currentInvoice.paidAmount || 0));
      setAmount(remaining > 0 ? String(remaining) : String(currentInvoice.totalAmount));
      setSenderAccountName(currentInvoice.customerName || '');
    }
  }, [currentInvoice]);

  const copyToClipboard = (text: string, bankId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBank(bankId);
    setTimeout(() => setCopiedBank(null), 2000);
  };

  // Handle simulated upload
  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofFileUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInvoice) return;
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      showNotification('Nominal pembayaran harus lebih besar dari Rp 0', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await submitPaymentProof({
        invoiceId: currentInvoice.id,
        invoiceNumber: currentInvoice.invoiceNumber,
        schoolName: currentInvoice.customerName,
        amount: amt,
        transferDate,
        bankDestination,
        senderBank: senderBank.trim() || 'Bank Pengirim',
        senderAccountName: senderAccountName.trim() || currentInvoice.customerName,
        referenceNumber: referenceNumber.trim() || `TRF-${Date.now().toString().slice(-6)}`,
        proofFileUrl: proofFileUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=60',
        paymentStage,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setSubmitSuccessMsg('Bukti transfer berhasil dikirim ke Tim Finance D\'Kandang. Verifikasi biasanya membutuhkan waktu maksimal 1x24 jam.');
        setProofFileUrl('');
        setReferenceNumber('');
        setNotes('');
      }
    } catch (err) {
      console.error(err);
      showNotification('Gagal mengirimkan bukti transfer', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Proofs associated with current invoice
  const currentInvoiceProofs = useMemo(() => {
    if (!currentInvoice) return [];
    return paymentProofs.filter(p => p.invoiceId === currentInvoice.id || p.invoiceNumber === currentInvoice.invoiceNumber);
  }, [paymentProofs, currentInvoice]);

  const remainingBalance = currentInvoice ? Math.max(0, currentInvoice.totalAmount - (currentInvoice.paidAmount || 0)) : 0;
  const isPaid = currentInvoice ? currentInvoice.status === 'paid' || remainingBalance === 0 : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Portal Pembayaran Sekolah & Rombongan</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  Akses Publik Klien
                </span>
              </div>
              <p className="text-xs text-emerald-100/70">
                Layanan mandiri pengecekan faktur dan konfirmasi transfer kunjungan wisata edukasi D'Kandang
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Selector Sub-bar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shrink-0">
          {/* Invoice Picker dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-slate-500 font-semibold whitespace-nowrap">Pilih Faktur Sekolah:</span>
            <select
              value={selectedInvId}
              onChange={(e) => {
                setSelectedInvId(e.target.value);
                setSubmitSuccessMsg(null);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600 w-full sm:w-64"
            >
              {salesInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.customerName} ({inv.invoiceNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Token Search */}
          <form onSubmit={handleFindByToken} className="flex items-center gap-1.5 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Masukkan token akses unik..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono w-full sm:w-48"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs whitespace-nowrap cursor-pointer"
            >
              Cari Token
            </button>
          </form>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          
          {currentInvoice ? (
            <>
              {/* Invoice Summary Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Ditujukan Kepada</span>
                    <h3 className="text-base font-black text-slate-900">{currentInvoice.customerName}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>No. Faktur: <strong className="font-mono text-slate-700">{currentInvoice.invoiceNumber}</strong></span>
                      <span>Ref. Pesanan: <strong className="font-mono text-slate-700">{currentInvoice.soReference}</strong></span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status Pembayaran</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mt-1 ${
                      isPaid 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : (currentInvoice.paidAmount || 0) > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {isPaid ? 'LUNAS (Verified)' : (currentInvoice.paidAmount || 0) > 0 ? 'DP / Cicilan Masuk' : 'Belum Dibayar'}
                    </span>
                  </div>
                </div>

                {/* Amount Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[10px] text-slate-500 font-medium block">Total Tagihan Kunjungan</span>
                    <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                      {formatRupiah(currentInvoice.totalAmount)}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-semibold block">Telah Terverifikasi</span>
                    <div className="text-lg font-bold text-emerald-800 font-mono mt-0.5">
                      {formatRupiah(currentInvoice.paidAmount || 0)}
                    </div>
                  </div>

                  <div className={`p-3 rounded-xl border ${
                    remainingBalance > 0 
                      ? 'bg-rose-50/60 border-rose-200 text-rose-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span className="text-[10px] font-semibold block opacity-80">Sisa yang Perlu Ditransfer</span>
                    <div className="text-lg font-black font-mono mt-0.5">
                      {formatRupiah(remainingBalance)}
                    </div>
                  </div>
                </div>

                {/* Items preview table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-50 px-3 py-2 font-bold text-slate-700 flex justify-between">
                    <span>Rincian Paket Wisata Terlampir</span>
                    <span className="text-[11px] text-slate-400">Jatuh Tempo: {formatDate(currentInvoice.dueDate)}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {currentInvoice.items.map((it, idx) => (
                      <div key={idx} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{it.name}</span>
                          <span className="text-[11px] text-slate-500 ml-2">x {it.quantity} pax (@ Rp {it.unitPrice.toLocaleString('id-ID')})</span>
                        </div>
                        <span className="font-bold text-slate-800 font-mono">Rp {it.total.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Rekening Resmi Pembayaran D'Kandang</h3>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                    Bebas Biaya Admin Antar Bank
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Silakan lakukan transfer ke salah satu rekening giro operasional resmi PT D'Kandang Amazing Farm berikut:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  {bankAccounts.filter(b => b.status === 'active').map((bank) => (
                    <div key={bank.id} className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col justify-between space-y-2">
                      <div>
                        <div className="text-xs font-bold text-white">{bank.bankName.split(' - ')[0]}</div>
                        <div className="text-[10px] text-slate-400">a.n. PT D'Kandang Amazing Farm</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="font-mono text-xs font-bold text-emerald-400 tracking-wider">
                          {bank.accountNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(bank.accountNumber, bank.id)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedBank === bank.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copiedBank === bank.id ? 'Tersalin' : 'Salin'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit Success Alert */}
              {submitSuccessMsg && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold block">Terima Kasih, Bukti Berhasil Terkirim!</span>
                    <p className="text-emerald-800 leading-relaxed">{submitSuccessMsg}</p>
                  </div>
                </div>
              )}

              {/* Form: Upload Slip Transfer */}
              {!isPaid && (
                <form onSubmit={handleSubmitProof} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800">Form Konfirmasi Pembayaran Sekolah</h3>
                      <p className="text-[11px] text-slate-500">Unggah bukti transfer dan isi detail mutasi rekening Anda</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nominal yang Ditransfer (Rp)*</label>
                      <input
                        type="number"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600"
                        placeholder="Contoh: 5000000"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal Transfer*</label>
                      <input
                        type="date"
                        required
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tahap Pembayaran*</label>
                      <select
                        value={paymentStage}
                        onChange={(e) => setPaymentStage(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600"
                      >
                        <option value="settlement">Pelunasan Akhir (100%)</option>
                        <option value="dp">Uang Muka (DP Rombongan)</option>
                        <option value="installment">Termin Cicilan</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Rekening Tujuan D'Kandang*</label>
                      <select
                        value={bankDestination}
                        onChange={(e) => setBankDestination(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600"
                      >
                        {bankAccounts.map(b => (
                          <option key={b.id} value={b.bankName}>{b.bankName.split(' - ')[0]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Bank Pengirim Anda</label>
                      <input
                        type="text"
                        value={senderBank}
                        onChange={(e) => setSenderBank(e.target.value)}
                        placeholder="BCA / Mandiri / BRI / BSI..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Pemilik Rekening / Sekolah</label>
                      <input
                        type="text"
                        value={senderAccountName}
                        onChange={(e) => setSenderAccountName(e.target.value)}
                        placeholder="Nama tercetak di rekening..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nomor Referensi / No. Resi Transfer</label>
                      <input
                        type="text"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="Contoh: 98124801 / No. Jurnal Mutasi"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">Catatan Tambahan (Opsional)</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Pembayaran DP 50 siswa kelas 4 & 5"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* File Attachment / Slip */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">Foto / Screenshot Bukti Transfer (Slip ATM / M-Banking)*</label>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex-1 w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50 hover:bg-emerald-50/40 cursor-pointer transition-colors">
                        <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Pilih Berkas Slip Transfer</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG atau PDF (Maks 5MB)</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleSimulateUpload}
                          className="hidden"
                        />
                      </label>

                      {proofFileUrl && (
                        <div className="w-24 h-24 rounded-xl border border-slate-200 overflow-hidden relative shrink-0 bg-slate-100 flex items-center justify-center">
                          <img src={proofFileUrl} alt="Preview Bukti" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setProofFileUrl('')}
                            className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 cursor-pointer shadow-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isSubmitting ? 'Mengirimkan...' : 'Kirim Bukti Pembayaran'}
                    </button>
                  </div>
                </form>
              )}

              {/* History of Uploaded Proofs */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-slate-500" /> Riwayat Bukti Pembayaran yang Pernah Dikirim ({currentInvoiceProofs.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">Verifikasi Real-Time</span>
                </div>

                {currentInvoiceProofs.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Belum ada bukti pembayaran yang diunggah untuk faktur ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {currentInvoiceProofs.map((prf) => (
                      <div key={prf.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 font-mono">Rp {prf.amount.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-slate-400">via {prf.bankDestination}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              prf.status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : prf.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {prf.status === 'verified' ? 'Terverifikasi (Lunas Masuk)' : prf.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>Ref: {prf.referenceNumber}</span>
                            <span>•</span>
                            <span>Pengirim: {prf.senderAccountName} ({prf.senderBank})</span>
                            <span>•</span>
                            <span>{formatDate(prf.transferDate)}</span>
                          </div>
                          {prf.rejectionReason && (
                            <div className="text-[11px] text-rose-600 font-medium mt-1">
                              Alasan Ditolak: {prf.rejectionReason}
                            </div>
                          )}
                        </div>

                        {prf.proofFileUrl && (
                          <a
                            href={prf.proofFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] inline-flex items-center gap-1 self-start sm:self-center"
                          >
                            <Eye className="w-3 h-3" /> Lihat Slip
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              Pilih faktur dari daftar di atas untuk membuka rincian pembayaran sekolah.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Transaksi aman terenkripsi & tercatat resmi di sistem D'Kandang
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs cursor-pointer transition-colors"
          >
            Tutup Portal
          </button>
        </div>

      </div>
    </div>
  );
}
