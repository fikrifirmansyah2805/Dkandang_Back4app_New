import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  Copy, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  Sparkles, 
  Stamp, 
  Building2, 
  Phone, 
  Instagram, 
  MapPin, 
  Info,
  Lock
} from 'lucide-react';
import { CashTransaction, Role } from '../../types';
import { formatTerbilangResmi } from '../../utils/terbilang';
import { printKwitansiDocument, KwitansiData } from '../../utils/kwitansiPrinter';

interface KwitansiGeneratorModalProps {
  transaction: CashTransaction;
  onClose: () => void;
  currentUser: {
    id?: string;
    name: string;
    role: Role;
    department?: string;
  };
}

export default function KwitansiGeneratorModal({
  transaction,
  onClose,
  currentUser
}: KwitansiGeneratorModalProps) {
  // Professional RBAC check: Only Finance, Accounting, Direktur Utama, and Super Admin
  const allowedRoles: Role[] = [
    'finance_manager',
    'accounting_manager',
    'direktur_utama',
    'super_admin'
  ];

  const hasAccess = allowedRoles.includes(currentUser.role);

  // Formatting date in Indonesian
  const formatIndonesianDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Form State
  const initialKwitansiNo = `KW-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${transaction.referenceNo ? transaction.referenceNo.replace(/[^a-zA-Z0-9]/g, '').slice(-4) : Math.floor(1000 + Math.random() * 9000)}`;
  
  const [kwitansiNumber, setKwitansiNumber] = useState(initialKwitansiNo);
  const [date, setDate] = useState(formatIndonesianDate(transaction.receivedDate || transaction.date));
  const [receivedFrom, setReceivedFrom] = useState(
    transaction.linkedEntityName || 
    (transaction.description.includes('-') ? transaction.description.split('-').pop()?.trim() : '') ||
    'Bapak / Ibu Pelanggan D\'Kandang Farm'
  );
  const [amount, setAmount] = useState<number>(transaction.amount || 0);
  const [amountInWords, setAmountInWords] = useState<string>(formatTerbilangResmi(transaction.amount || 0));
  const [isManualTerbilang, setIsManualTerbilang] = useState(false);
  
  // Payment description
  const [paymentFor, setPaymentFor] = useState(
    transaction.description || 
    `Penerimaan Pembayaran ${transaction.incomeSource === 'school_visit' ? 'Wisata Edukasi' : 'Transaksi Farm'} D'Kandang`
  );
  const [paymentForLine2, setPaymentForLine2] = useState(
    `Metode: ${transaction.sourceAccount || 'Transfer Bank Rekening Resmi Perusahaan'}`
  );
  
  const [signerName, setSignerName] = useState(currentUser.name || 'Bagian Keuangan');
  const [signerTitle, setSignerTitle] = useState(
    currentUser.role === 'direktur_utama' ? 'Direktur Utama' :
    currentUser.role === 'finance_manager' ? 'Finance & Cashier' :
    currentUser.role === 'accounting_manager' ? 'Accounting Officer' :
    'Staff Keuangan & Kasir'
  );
  
  const [copiedText, setCopiedText] = useState(false);

  // Auto calculate terbilang when amount changes unless manual
  useEffect(() => {
    if (!isManualTerbilang) {
      setAmountInWords(formatTerbilangResmi(amount));
    }
  }, [amount, isManualTerbilang]);

  const handlePrintPdf = () => {
    if (!hasAccess) return;

    const data: KwitansiData = {
      kwitansiNumber,
      date,
      receivedFrom,
      amount,
      amountInWords,
      paymentFor,
      paymentForLine2,
      signerName,
      signerTitle
    };

    printKwitansiDocument(data);
  };

  const handleCopySummary = () => {
    const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    const summary = `*KWITANSI PENERIMAAN UANG RESMI - D'KANDANG AMAZING FARM*
No. Kwitansi: ${kwitansiNumber}
Tanggal: ${date}
Telah Terima Dari: ${receivedFrom}
Uang Sejumlah: ${amountInWords}
Nominal: ${formatted}
Untuk Pembayaran: ${paymentFor} ${paymentForLine2 ? `(${paymentForLine2})` : ''}
Penerima: ${signerName} (${signerTitle})
_Dokumen resmi tervalidasi sistem Enterprise ERP D'Kandang Farm._`;

    navigator.clipboard.writeText(summary);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  const formattedNominal = new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);

  if (!hasAccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Akses Kwitansi Dibatasi (RBAC)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Demi kepatuhan finansial dan audit keamanan sistem, fitur pembuatan dan ekspor kwitansi resmi hanya dapat diakses oleh role <strong>Finance</strong>, <strong>Accounting</strong>, <strong>Direktur Utama</strong>, dan <strong>Super Admin</strong>.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 font-mono">
            Role Anda saat ini: <strong className="text-slate-700">{currentUser.role}</strong>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-slate-100 border border-slate-300 rounded-3xl max-w-6xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[96vh]">
        
        {/* Header Modal Bar */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-wide text-white">Generator Kwitansi Penerimaan Uang Resmi</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold font-mono">
                  RBAC Validated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dokumen tanda terima transaksi sah berstandar agrowisata D'Kandang Farm
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Salin Ringkasan Format Teks"
            >
              {copiedText ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Unduh PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Split Layout (Controls Left & Pixel-Perfect Preview Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1 bg-slate-200/60">
          
          {/* Controls Form Column (4 Columns on Desktop) */}
          <div className="lg:col-span-4 p-5 bg-white border-r border-slate-200 space-y-4 overflow-y-auto max-h-full text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Edit3 className="w-3.5 h-3.5 text-blue-600" /> Parameter Kwitansi
              </span>
              <span className="text-[11px] text-slate-400 font-mono">ID: {transaction.referenceNo || transaction.id}</span>
            </div>

            {/* No Kwitansi & Tanggal */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Kwitansi:</label>
                <input
                  type="text"
                  value={kwitansiNumber}
                  onChange={(e) => setKwitansiNumber(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Cetak:</label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Contoh: 26 Agustus 2026"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Telah Terima Dari */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Telah Terima Dari (Nama / Sekolah / Lembaga):</label>
              <input
                type="text"
                value={receivedFrom}
                onChange={(e) => setReceivedFrom(e.target.value)}
                placeholder="Nama pihak yang menyerahkan uang..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold text-xs"
              />
            </div>

            {/* Nominal (IDR) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700">Nominal Penerimaan (Rp):</label>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">
                  Rp {formattedNominal}
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-sm"
              />
            </div>

            {/* Terbilang Huruf */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">Uang Sejumlah (Terbilang):</label>
                <button
                  type="button"
                  onClick={() => setIsManualTerbilang(!isManualTerbilang)}
                  className="text-[10px] text-blue-700 hover:underline font-semibold"
                >
                  {isManualTerbilang ? '🔄 Otomatis Sistem' : '✏️ Kustom Teks'}
                </button>
              </div>
              <textarea
                rows={2}
                value={amountInWords}
                onChange={(e) => {
                  setIsManualTerbilang(true);
                  setAmountInWords(e.target.value);
                }}
                className="w-full p-2 bg-amber-50/60 border border-amber-200 rounded-xl text-slate-800 font-medium italic text-xs leading-relaxed"
              />
            </div>

            {/* Untuk Pembayaran Baris 1 & 2 */}
            <div className="space-y-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Untuk Pembayaran (Baris 1):</label>
                <input
                  type="text"
                  value={paymentFor}
                  onChange={(e) => setPaymentFor(e.target.value)}
                  placeholder="Contoh: Pembayaran Uang Muka Paket Edukasi Wisata..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Keterangan / Metode (Baris 2):</label>
                <input
                  type="text"
                  value={paymentForLine2}
                  onChange={(e) => setPaymentForLine2(e.target.value)}
                  placeholder="Contoh: Transfer Bank Mandiri Tiketing Wisata..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Penandatangan / Kasir */}
            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Penandatangan:</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jabatan / Otoritas:</label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs"
                />
              </div>
            </div>

            {/* Action Bar Inside Form */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Dokumen Kwitansi (PDF)</span>
              </button>
            </div>
          </div>

          {/* Canvas Preview Column (8 Columns on Desktop) */}
          <div className="lg:col-span-8 p-4 sm:p-6 flex items-center justify-center overflow-x-auto">
            
            {/* The Actual Kwitansi Card Representation (Fidelity Match to Official Standard) */}
            <div className="w-full max-w-[780px] bg-[#fbfbf9] border-[2.5px] border-[#0f172a] rounded-sm p-6 sm:p-8 shadow-xl relative overflow-hidden text-[#0f172a] select-none min-h-[460px] flex flex-col justify-between">
              
              {/* Geometric Corner Accents */}
              <div className="absolute top-0 left-0 w-0 h-0 border-t-[14px] border-t-[#0f172a] border-r-[14px] border-r-transparent pointer-events-none" />
              <div className="absolute top-0 left-[42%] w-20 h-1.5 bg-[#0f172a] [clip-path:polygon(0_0,100%_0,85%_100%,15%_100%)] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[42%] h-2 bg-[#ea580c] [clip-path:polygon(0_0,95%_0,100%_100%,0_100%)] pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-[58%] h-2 bg-[#0f172a] [clip-path:polygon(0_0,100%_0,100%_100%,3%_100%)] pointer-events-none" />

              {/* Watermark Line Art of Farm Barn, Silo, Fence */}
              <svg 
                className="absolute top-4 right-4 w-72 h-48 opacity-[0.12] pointer-events-none z-0" 
                viewBox="0 0 300 200" 
                fill="none" 
                stroke="#78716c" 
                strokeWidth="1.2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polygon points="150,40 190,75 190,140 110,140 110,75" fill="none" />
                <line x1="150" y1="40" x2="150" y2="75" />
                <line x1="110" y1="75" x2="190" y2="75" />
                <rect x="135" y="95" width="30" height="45" />
                <line x1="135" y1="95" x2="165" y2="140" />
                <line x1="165" y1="95" x2="135" y2="140" />
                <path d="M205,60 C205,45 235,45 235,60 L235,140 L205,140 Z" />
                <line x1="205" y1="75" x2="235" y2="75" />
                <line x1="205" y1="95" x2="235" y2="95" />
                <line x1="205" y1="115" x2="235" y2="115" />
                <line x1="40" y1="130" x2="110" y2="130" />
                <line x1="40" y1="140" x2="110" y2="140" />
                <line x1="50" y1="120" x2="50" y2="145" />
                <line x1="75" y1="120" x2="75" y2="145" />
                <line x1="100" y1="120" x2="100" y2="145" />
                <path d="M60,115 C45,100 40,80 55,65 C65,55 85,55 95,68 C105,75 105,95 90,110 C85,115 75,118 60,115 Z" />
                <line x1="75" y1="115" x2="75" y2="140" strokeWidth="2" />
                <path d="M20,145 Q100,135 180,145 T300,140" />
              </svg>

              {/* Watercolor wash bottom right */}
              <div className="absolute -bottom-8 -right-8 w-64 h-48 bg-gradient-to-tl from-emerald-500/10 via-blue-500/5 to-transparent rounded-full blur-xl pointer-events-none z-0" />

              {/* Header Row */}
              <div className="flex items-start justify-between relative z-10 mb-5">
                <div className="flex items-center gap-4">
                  {/* Area Kosong untuk Menaruh Logo Manual / Fisik */}
                  <div className="w-[195px] h-[75px] shrink-0" />

                  {/* Vertical Divider */}
                  <div className="w-[1.5px] h-14 bg-[#0f172a]" />

                  {/* KWITANSI / PENERIMAAN UANG */}
                  <div className="flex flex-col">
                    <span className="text-2xl sm:text-3xl font-black text-[#0b2545] tracking-wider leading-none">
                      KWITANSI
                    </span>
                    <span className="text-[11px] sm:text-xs font-extrabold text-[#438058] tracking-[0.25em] uppercase mt-1">
                      PENERIMAAN UANG
                    </span>
                  </div>
                </div>

                {/* Top Right: No & Tanggal */}
                <div className="w-56 text-right text-xs space-y-2 mt-1">
                  <div className="flex items-end">
                    <span className="w-14 text-left font-bold text-slate-900">No.</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-mono font-bold text-blue-800 text-left pl-2">
                      {kwitansiNumber}
                    </span>
                  </div>
                  <div className="flex items-end">
                    <span className="w-14 text-left font-bold text-slate-900">Tanggal :</span>
                    <span className="flex-1 border-b border-dotted border-slate-500 font-semibold text-slate-800 text-left pl-2">
                      {date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Content Body */}
              <div className="relative z-10 space-y-3.5 text-xs sm:text-sm my-2">
                {/* Row 1: Telah Terima Dari */}
                <div className="flex items-end gap-2">
                  <span className="w-36 font-semibold text-slate-800 shrink-0">Telah terima dari</span>
                  <span className="font-bold">:</span>
                  <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-slate-900 pb-0.5 px-2">
                    {receivedFrom || '...................................................................................................................'}
                  </span>
                </div>

                {/* Row 2: Uang Sejumlah (Cream container with terbilang text) */}
                <div className="flex items-center gap-2">
                  <span className="w-36 font-semibold text-slate-800 shrink-0">Uang sejumlah</span>
                  <span className="font-bold">:</span>
                  <div className="flex-1 bg-[#f4efe6] rounded-xl px-4 py-2.5 shadow-xs border border-[#e8dfcf]">
                    <div className="border-b border-dotted border-slate-400 font-bold italic text-slate-900 text-xs sm:text-sm tracking-wide leading-relaxed">
                      {amountInWords}
                    </div>
                    <div className="border-b border-dotted border-slate-300 mt-1.5 h-2" />
                  </div>
                </div>

                {/* Row 3: Untuk Pembayaran */}
                <div className="flex items-start gap-2 pt-1">
                  <span className="w-36 font-semibold text-slate-800 shrink-0 pt-0.5">Untuk pembayaran</span>
                  <span className="font-bold pt-0.5">:</span>
                  <div className="flex-1 space-y-2">
                    <div className="border-b border-dotted border-slate-500 font-semibold text-slate-900 pb-0.5 px-2 min-h-[22px]">
                      {paymentFor || '...................................................................................................................'}
                    </div>
                    <div className="border-b border-dotted border-slate-500 font-semibold text-slate-800 pb-0.5 px-2 min-h-[20px]">
                      {paymentForLine2 || '...................................................................................................................'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="flex items-end justify-between relative z-10 pt-4 mt-2">
                
                {/* Bottom Left: Badge JUMLAH Rp & Company Details */}
                <div className="w-[58%] space-y-2.5">
                  <div className="flex items-center">
                    <div className="bg-[#0b2545] text-white font-black text-sm px-4 py-1.5 [clip-path:polygon(0_0,100%_0,85%_100%,0%_100%)] tracking-wider">
                      JUMLAH
                    </div>
                    <div className="flex-1 max-w-[280px] -ml-1 border-b-2 border-dotted border-[#0f172a] px-3 py-0.5 flex items-baseline gap-2 font-mono">
                      <span className="text-base font-black text-[#0b2545]">Rp.</span>
                      <span className="text-lg font-black text-[#0f172a] tracking-wide">{formattedNominal}</span>
                    </div>
                  </div>

                  <div className="w-full h-[1.5px] bg-[#0f172a]" />

                  {/* Company Address & Contacts */}
                  <div className="flex items-start gap-3 text-[10px] text-slate-700 leading-tight">
                    <div className="flex gap-1.5 flex-1">
                      <MapPin className="w-3.5 h-3.5 text-[#ea580c] shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-slate-900 font-extrabold text-[10.5px]">D'Kandang Amazing Farm</strong>
                        <span>Jl. Penarikan, RT.01/RW.02, Pasir Putih,</span><br />
                        <span>Kec. Sawangan, Kota Depok, Jawa Barat 16519</span>
                      </div>
                    </div>

                    <div className="pl-3 border-l border-slate-300 space-y-1 font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-blue-700" />
                        <span>0857-1997-7773</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Instagram className="w-3 h-3 text-[#ea580c]" />
                        <span>@dkandang</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Right: Tempat Tanda Tangan */}
                <div className="text-center w-52 relative">
                  <div className="text-xs font-semibold text-slate-800 mb-1">Hormat kami,</div>
                  
                  {/* Area Bersih untuk Ruang TTD (Tanpa Stempel) */}
                  <div className="h-16 flex items-center justify-center relative" />

                  <div className="font-bold text-xs text-slate-900 border-b border-dotted border-slate-500 pb-0.5 inline-block min-w-[180px]">
                    ( {signerName || '................................................'} )
                  </div>
                  {signerTitle && (
                    <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {signerTitle}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
