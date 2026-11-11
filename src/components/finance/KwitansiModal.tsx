import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Receipt, 
  ShieldCheck, 
  Sparkles, 
  Sliders, 
  CheckCircle2, 
  School, 
  Calendar, 
  User, 
  FileText,
  Building,
  Info
} from 'lucide-react';
import { CashTransaction } from '../../types';
import { useERP } from '../../context/ERPContext';
import { formatRupiah, formatDate, simulateDecrypt } from '../../utils/crypto';
import { findTargetBankAccount } from '../../utils/bankMatcher';
import { terbilangRupiah, formatTanggalIndo } from '../../utils/quotationExporter';
import { 
  KwitansiData, 
  generateReceiptNumber, 
  formatRupiahKwitansi, 
  printKwitansi, 
  downloadKwitansiHtmlFile,
  getDKandangLogoSvg,
  getFarmWatermarkSvg
} from '../../utils/kwitansiHelper';

interface KwitansiModalProps {
  transaction: CashTransaction;
  onClose: () => void;
}

export default function KwitansiModal({ transaction, onClose }: KwitansiModalProps) {
  const { currentUser, companyProfile, bankAccounts } = useERP();

  // Initial State from Transaction
  const [receiptNo, setReceiptNo] = useState(() => {
    if (transaction.referenceNo && transaction.referenceNo.startsWith('KWT/')) {
      return transaction.referenceNo;
    }
    return generateReceiptNumber();
  });

  const [receiptDate, setReceiptDate] = useState(
    transaction.receivedDate || transaction.date || new Date().toISOString().split('T')[0]
  );
  
  const [receivedFrom, setReceivedFrom] = useState(
    transaction.linkedEntityName || 'Instansi / Rombongan Sekolah Mitra D\'Kandang'
  );

  const [amount, setAmount] = useState<number>(transaction.amount || 0);
  const [manualWords, setManualWords] = useState<string>('');
  const [useManualWords, setUseManualWords] = useState<boolean>(false);

  const autoWords = useMemo(() => {
    return terbilangRupiah(amount);
  }, [amount]);

  const effectiveWords = useManualWords && manualWords.trim() ? manualWords : autoWords;

  // Description / Payment For
  const [paymentFor, setPaymentFor] = useState(() => {
    if (transaction.description) return transaction.description;
    let desc = 'Pembayaran Tiket & Fasilitas Wisata Edukasi D\'Kandang Amazing Farm';
    if (transaction.incomeSource === 'school_visit') {
      const stageLabel = transaction.paymentStage === 'dp' 
        ? 'Uang Muka (DP 30%)' 
        : transaction.paymentStage === 'installment' 
        ? 'Cicilan Termin 2' 
        : transaction.paymentStage === 'settlement' 
        ? 'Pelunasan 100%' 
        : 'Biaya Kunjungan';
      desc = `Pembayaran ${stageLabel} Paket Agrowisata Edukasi Pertanian & Peternakan untuk ${transaction.linkedEntityName || 'Rombongan Sekolah'}`;
    }
    return desc;
  });

  const [paymentMethod, setPaymentMethod] = useState('Transfer Bank / EDC');
  
  // Resolve bank name dynamically from transaction sourceAccount or registered bankAccounts
  const initialBank = useMemo(() => {
    if (transaction.sourceAccount) {
      const matched = findTargetBankAccount(bankAccounts, transaction.sourceAccount);
      if (matched) return matched.bankName;
      return transaction.sourceAccount;
    }
    return bankAccounts[0]?.bankName || 'Bank Syariah Indonesia (BSI) Sawangan - Tabungan Edukasi & CSR';
  }, [transaction.sourceAccount, bankAccounts]);

  const [bankAccount, setBankAccount] = useState(initialBank);

  useEffect(() => {
    setBankAccount(initialBank);
  }, [initialBank]);
  const [signatoryName, setSignatoryName] = useState(currentUser.name || 'Fikri Firmansyah');
  const [signatoryRole, setSignatoryRole] = useState('Finance & Treasury D\'Kandang Farm');
  const [includeStamp, setIncludeStamp] = useState(true);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(true);

  const [copiedWA, setCopiedWA] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);

  // Address defaults
  const companyAddress = companyProfile?.address || "Jl. Raya Sawangan No.88, Mampang, Kec. Pancoran Mas, Kota Depok, Jawa Barat 16433";
  const companyPhone = companyProfile?.phone || "0812-9100-0066";
  const companyInstagram = "@dkandangamazingfarm";

  const kwitansiPayload: KwitansiData = useMemo(() => ({
    receiptNo,
    date: receiptDate,
    receivedFrom,
    amount,
    amountInWords: effectiveWords,
    paymentFor,
    paymentStage: transaction.paymentStage,
    paymentMethod,
    bankAccount,
    signatoryName,
    signatoryRole,
    includeStamp,
    includeSignature,
    companyName: "D'Kandang Amazing Farm",
    companyAddress,
    companyPhone,
    companyInstagram
  }), [
    receiptNo,
    receiptDate,
    receivedFrom,
    amount,
    effectiveWords,
    paymentFor,
    transaction.paymentStage,
    paymentMethod,
    bankAccount,
    signatoryName,
    signatoryRole,
    includeStamp,
    includeSignature,
    companyAddress,
    companyPhone,
    companyInstagram
  ]);

  const handlePrint = () => {
    printKwitansi(kwitansiPayload);
  };

  const handleDownload = () => {
    downloadKwitansiHtmlFile(kwitansiPayload);
  };

  const handleCopyWhatsApp = () => {
    const text = `*KWITANSI PENERIMAAN UANG RESMI*\n*D'KANDANG AMAZING FARM*\n` +
      `-----------------------------------------\n` +
      `📄 No. Kwitansi : ${receiptNo}\n` +
      `📅 Tanggal      : ${formatTanggalIndo(receiptDate)}\n` +
      `👤 Telah Terima Dari : ${receivedFrom}\n` +
      `💰 Jumlah Uang  : Rp ${formatRupiahKwitansi(amount)} ,-\n` +
      `📝 Terbilang    : ${effectiveWords}\n` +
      `📌 Untuk        : ${paymentFor}\n` +
      `🏦 Pembayaran   : ${paymentMethod} (${bankAccount})\n` +
      `-----------------------------------------\n` +
      `Status: LUNAS / TERVERIFIKASI SISTEM ERP D'KANDANG\n` +
      `Petugas: ${signatoryName} (${signatoryRole})\n` +
      `📍 Alamat: ${companyAddress}\n` +
      `📞 Kontak: ${companyPhone} | IG: ${companyInstagram}`;

    navigator.clipboard.writeText(text);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-6xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Header Modal Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white tracking-wide">
                  Generator Kwitansi Resmi D'Kandang Amazing Farm
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Design Terstandarisasi 1:1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Fitur Keamanan: Dibuat dari Verifikasi Histori Transaksi ({transaction.referenceNo || 'ID: ' + transaction.id.slice(0, 8)})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                showSettingsDrawer 
                  ? 'bg-slate-800 text-amber-400 border border-amber-500/30' 
                  : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              {showSettingsDrawer ? 'Sembunyikan Form Editor' : 'Sesuaikan Data Kwitansi'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left/Top is Editor Drawer, Right/Bottom is Live Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
          
          {/* Form Editor Panel (Collapsible or Sidebar) */}
          {showSettingsDrawer && (
            <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 shrink-0 text-xs overflow-y-auto max-h-[75vh]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Pengaturan Data Kwitansi
                </h4>
                <button
                  type="button"
                  onClick={() => setReceiptNo(generateReceiptNumber())}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Generate Nomor Kwitansi Baru"
                >
                  <RefreshCw className="w-3 h-3" /> No. Baru
                </button>
              </div>

              {/* No & Tanggal */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Kwitansi:</label>
                  <input
                    type="text"
                    value={receiptNo}
                    onChange={(e) => setReceiptNo(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-blue-700 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Kwitansi:</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Telah Terima Dari */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Telah Terima Dari (Nama / Sekolah):</label>
                <input
                  type="text"
                  value={receivedFrom}
                  onChange={(e) => setReceivedFrom(e.target.value)}
                  placeholder="Contoh: SD Islam Al-Azhar 46 Depok"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                />
              </div>

              {/* Nominal & Terbilang */}
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2.5">
                <div>
                  <label className="font-bold text-amber-950 block mb-1">Nominal Diterima (Rp):</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-white border border-amber-300 rounded-xl text-slate-900 font-mono font-bold text-sm"
                  />
                  <div className="text-[11px] text-emerald-700 font-bold font-mono mt-1">
                    {formatRupiah(amount)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-amber-950">Terbilang (Kalimat):</label>
                    <button
                      type="button"
                      onClick={() => setUseManualWords(!useManualWords)}
                      className="text-[10px] text-amber-700 font-semibold underline cursor-pointer"
                    >
                      {useManualWords ? 'Gunakan Otomatis' : 'Edit Manual'}
                    </button>
                  </div>
                  {useManualWords ? (
                    <textarea
                      rows={2}
                      value={manualWords}
                      onChange={(e) => setManualWords(e.target.value)}
                      placeholder="Ketik kalimat terbilang..."
                      className="w-full p-2 bg-white border border-amber-300 rounded-xl text-slate-800 text-xs italic"
                    />
                  ) : (
                    <div className="p-2 bg-white/90 border border-amber-200 rounded-xl text-slate-700 italic text-xs leading-relaxed font-medium">
                      # {autoWords} #
                    </div>
                  )}
                </div>
              </div>

              {/* Untuk Pembayaran */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Untuk Pembayaran:</label>
                <textarea
                  rows={2}
                  value={paymentFor}
                  onChange={(e) => setPaymentFor(e.target.value)}
                  placeholder="Keterangan pembayaran paket atau kegiatan..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>

              {/* Metode & Bank */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Metode Bayar:</label>
                  <input
                    type="text"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Rekening Kas / Bank:</label>
                  {bankAccounts.length > 0 ? (
                    <select
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.bankName}>
                          {b.bankName} (No. {simulateDecrypt(b.accountNumber)})
                        </option>
                      ))}
                      {!bankAccounts.some(b => b.bankName === bankAccount) && (
                        <option value={bankAccount}>{bankAccount}</option>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                    />
                  )}
                </div>
              </div>

              {/* Penandatangan */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nama Petugas:</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan:</label>
                  <input
                    type="text"
                    value={signatoryRole}
                    onChange={(e) => setSignatoryRole(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  Opsi Tampilan Dokumen:
                </span>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeStamp}
                    onChange={(e) => setIncludeStamp(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Stempel Resmi LUNAS D'Kandang</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSignature}
                    onChange={(e) => setIncludeSignature(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Tanda Tangan Digital Resmi</span>
                </label>
                <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWatermark}
                    onChange={(e) => setIncludeWatermark(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Watermark Ilustrasi Peternakan</span>
                </label>
              </div>
            </div>
          )}

          {/* Live Preview Container (1:1 Exact Design Canvas) */}
          <div className="flex-1 flex flex-col items-center justify-start overflow-x-auto">
            
            {/* Visual Notice & Quick Actions Toolbar */}
            <div className="w-full max-w-4xl flex items-center justify-between mb-3 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="font-semibold">Pratinjau Dokumen Siap Cetak & Ekspor PDF</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyWhatsApp}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  title="Salin Teks Ringkasan untuk WhatsApp"
                >
                  {copiedWA ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedWA ? 'Tersalin!' : 'Salin WhatsApp'}
                </button>

                <button
                  onClick={handleDownload}
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  title="Unduh Berkas HTML Siap Cetak"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> Unduh Dokumen
                </button>

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  title="Cetak Langsung atau Simpan sebagai PDF"
                >
                  <Printer className="w-4 h-4" /> Cetak / Unduh PDF
                </button>
              </div>
            </div>

            {/* THE KWITANSI CANVAS CARD (EXACT 1:1 REPLICA OF THE UPLOADED PHOTO) */}
            <div 
              className="w-full max-w-4xl bg-[#FAF8F5] border-[1.5px] border-[#0C2340] rounded-[4px] relative p-6 sm:p-8 shadow-xl overflow-hidden text-[#0C2340] select-none"
              style={{ minHeight: '500px' }}
            >
              {/* Top Left Corner Geometric Accents */}
              <div 
                className="absolute top-0 left-0 w-0 h-0 border-t-[42px] border-t-[#0C2340] border-r-[42px] border-r-transparent z-10"
              />
              <div 
                className="absolute top-0 left-0 w-0 h-0 border-t-[24px] border-t-[#F37021] border-r-[24px] border-r-transparent z-20"
              />

              {/* Bottom Edge Accent Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[6px] bg-[#F37021] z-10 overflow-hidden">
                <div 
                  className="absolute right-0 bottom-0 w-44 h-full bg-[#0C2340]"
                  style={{ clipPath: 'polygon(15px 0, 100% 0, 100% 100%, 0 100%)' }}
                />
              </div>

              {/* Watermark Illustration (Farm Barn & Silo) */}
              {includeWatermark && (
                <div 
                  className="absolute top-5 right-4 w-80 h-60 opacity-20 pointer-events-none z-0"
                  dangerouslySetInnerHTML={{ __html: getFarmWatermarkSvg() }}
                />
              )}

              {/* Header Grid */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between relative z-10 mb-6 gap-4">
                <div className="flex items-center gap-4">
                  {/* D'KANDANG AMAZING FARM Logo SVG */}
                  <div 
                    className="w-44 h-16 shrink-0"
                    dangerouslySetInnerHTML={{ __html: getDKandangLogoSvg() }}
                  />
                  {/* Vertical Divider */}
                  <div className="w-[2px] h-14 bg-[#0C2340] shrink-0 hidden sm:block" />
                  {/* Title & Subtitle */}
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-[#0C2340] tracking-wider leading-none">
                      KWITANSI
                    </h1>
                    <p className="text-xs sm:text-sm font-extrabold text-[#557F56] tracking-[0.25em] mt-1.5 uppercase">
                      PENERIMAAN UANG
                    </p>
                  </div>
                </div>

                {/* Top Right Meta: No. & Tanggal */}
                <div className="text-xs sm:text-sm font-semibold text-[#0C2340] w-full sm:w-auto min-w-[240px]">
                  <div className="flex items-baseline mb-2">
                    <span className="w-20 font-bold">No.</span>
                    <span className="flex-1 font-mono font-bold border-b-[1.5px] border-dotted border-slate-500 pb-0.5 px-1 text-[#0C2340]">
                      {receiptNo}
                    </span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="w-20 font-bold">Tanggal :</span>
                    <span className="flex-1 font-medium border-b-[1.5px] border-dotted border-slate-500 pb-0.5 px-1 text-[#0C2340]">
                      {formatTanggalIndo(receiptDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Body Form */}
              <div className="relative z-10 space-y-4 text-xs sm:text-sm mb-6">
                {/* Row 1: Telah terima dari */}
                <div className="flex items-start">
                  <div className="w-36 sm:w-44 font-bold text-[#0C2340] pt-0.5 shrink-0">
                    Telah terima dari
                  </div>
                  <div className="w-4 font-bold text-[#0C2340] pt-0.5 shrink-0">:</div>
                  <div className="flex-1 font-bold text-[#0C2340] border-b-[1.5px] border-dotted border-slate-500 px-2 pb-0.5 min-h-[26px] leading-relaxed">
                    {receivedFrom}
                  </div>
                </div>

                {/* Row 2: Uang sejumlah (Terbilang Box) */}
                <div className="flex items-start">
                  <div className="w-36 sm:w-44 font-bold text-[#0C2340] pt-2 shrink-0">
                    Uang sejumlah
                  </div>
                  <div className="w-4 font-bold text-[#0C2340] pt-2 shrink-0">:</div>
                  <div className="flex-1 bg-[#F4EFE6] border border-[#E7DFD3] rounded-lg p-2.5 sm:p-3">
                    <div className="border-b-[1.5px] border-dotted border-slate-400 font-bold text-[#0C2340] italic text-xs sm:text-sm pb-1 leading-relaxed">
                      # {effectiveWords} #
                    </div>
                  </div>
                </div>

                {/* Row 3: Untuk pembayaran */}
                <div className="flex items-start">
                  <div className="w-36 sm:w-44 font-bold text-[#0C2340] pt-0.5 shrink-0">
                    Untuk pembayaran
                  </div>
                  <div className="w-4 font-bold text-[#0C2340] pt-0.5 shrink-0">:</div>
                  <div className="flex-1 space-y-1.5">
                    <div className="border-b-[1.5px] border-dotted border-slate-500 px-2 pb-0.5 font-semibold text-[#0C2340] min-h-[24px] leading-relaxed">
                      {paymentFor}
                    </div>
                    {paymentMethod && (
                      <div className="border-b-[1.5px] border-dotted border-slate-500 px-2 pb-0.5 text-xs text-slate-700">
                        Metode Transaksi: <strong>{paymentMethod}</strong> {bankAccount ? `(${bankAccount})` : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Amount Badge + Signature Block */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between relative z-10 mt-6 mb-6 gap-6">
                
                {/* JUMLAH Angle Badge */}
                <div className="flex items-stretch border-[1.5px] border-[#0C2340] rounded-[3px] overflow-hidden max-w-md w-full sm:w-auto shadow-2xs">
                  {/* Dark Navy Label with Slanted Right Edge */}
                  <div 
                    className="bg-[#0C2340] text-white font-black text-sm sm:text-base tracking-wider px-4 sm:px-6 py-2.5 flex items-center relative"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 82% 100%, 0 100%)' }}
                  >
                    JUMLAH
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#F37021]" />
                  </div>
                  {/* Value container with Orange Border & Dotted tail */}
                  <div className="flex-1 bg-white px-4 py-2.5 flex items-center font-black font-mono text-base sm:text-lg text-[#0C2340] border-l-2 border-[#F37021]">
                    <span>Rp. {formatRupiahKwitansi(amount)} ,-</span>
                    <div className="flex-1 border-b-[1.5px] border-dotted border-slate-500 ml-3 h-3" />
                  </div>
                </div>

                {/* Signature Box */}
                <div className="text-center min-w-[220px] relative self-end sm:self-auto">
                  <div className="text-xs sm:text-sm font-semibold text-[#0C2340] mb-2">
                    Hormat kami,
                  </div>
                  <div className="h-16 flex items-center justify-center relative">
                    {/* Stamp */}
                    {includeStamp && (
                      <div className="absolute transform -rotate-12 border-2 border-emerald-600 bg-emerald-50/80 text-emerald-800 px-3 py-1 rounded-md font-black text-[11px] tracking-wider uppercase shadow-xs">
                        ✓ LUNAS
                        <div className="text-[8px] font-bold text-emerald-700">D'KANDANG FINANCE</div>
                      </div>
                    )}
                    {/* Digital Signature Stroke */}
                    {includeSignature && (
                      <svg width="110" height="45" viewBox="0 0 120 50" className="opacity-75">
                        <path d="M 15 35 Q 35 10 50 25 T 75 15 Q 90 40 105 20" fill="none" stroke="#0C2340" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-[#0C2340] border-b-[1.5px] border-dotted border-slate-500 pb-1 px-4 inline-block min-w-[180px]">
                    ( {signatoryName} )
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {signatoryRole}
                  </div>
                </div>
              </div>

              {/* Horizontal Divider Line */}
              <div className="w-full h-[1.5px] bg-[#0C2340] mb-3 relative z-10" />

              {/* Footer Information */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-700 relative z-10 gap-2">
                <div className="flex items-start gap-1.5 max-w-lg">
                  <span className="text-[#F37021] text-xs mt-0.5">📍</span>
                  <div>
                    <strong className="text-[#0C2340] block">D'Kandang Amazing Farm</strong>
                    <span className="text-[10px] text-slate-600">{companyAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <span className="text-[#F37021]">📞</span>
                    <span>{companyPhone}</span>
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-slate-800">
                    <span className="text-[#F37021]">📸</span>
                    <span>{companyInstagram}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Security Info Card */}
            <div className="w-full max-w-4xl mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  Kwitansi ini dibuat secara sah dari rekaman transaksi tersimpan nomor <strong>{transaction.referenceNo}</strong> bernilai <strong>{formatRupiah(transaction.amount)}</strong>.
                </span>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300">
                AUDIT-VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Format cetak dioptimalkan untuk ukuran Landscape Kwitansi & Folio A4.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" /> Unduh Berkas
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Cetak / Unduh PDF Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
