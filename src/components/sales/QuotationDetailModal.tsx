import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Copy, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Edit3, 
  Share2, 
  ExternalLink,
  Lock,
  ArrowRight,
  Trash2,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Quotation } from '../../types';
import { 
  exportQuotationToWord, 
  copyQuotationToClipboardForGoogleDocs, 
  extractPlainText,
  formatTanggalIndo, 
  terbilangRupiah 
} from '../../utils/quotationExporter';
import { simulateDecrypt } from '../../utils/crypto';
import { printElementById } from '../../utils/printHelper';
import { CustomQuotationModal } from './CustomQuotationModal';
import { CompanyProfileModal } from './CompanyProfileModal';

interface QuotationDetailModalProps {
  quotationId: string;
  onClose: () => void;
}

export const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({
  quotationId,
  onClose
}) => {
  const { 
    quotations, 
    currentUser, 
    companyProfile,
    approveQuotation, 
    rejectQuotation, 
    sendQuotationToCustomer, 
    convertQuotationToSO,
    deleteQuotation,
    showNotification
  } = useERP();

  const quote = quotations.find(q => q.id === quotationId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [approvalNotesInput, setApprovalNotesInput] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [copiedDocsSuccess, setCopiedDocsSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!quote) return null;

  // Check if current user has Director / Executive privileges to approve/reject
  const canApprove = currentUser.role === 'direktur_utama' || 
                     currentUser.role === 'super_admin' || 
                     currentUser.role === 'sales_director' ||
                     currentUser.role === 'marketing_manager';

  // Check if current user has permissions to DELETE quotation (HANYA DIREKSI & SUPER ADMIN)
  const canDelete = currentUser.role === 'direktur_utama' || 
                    currentUser.role === 'super_admin' || 
                    currentUser.role === 'sales_director';

  const isApproved = quote.status === 'approved' || quote.status === 'sent' || quote.status === 'converted';
  const isPending = quote.status === 'pending_approval' || quote.status === 'draft';
  const isRejected = quote.status === 'rejected';

  // Dynamic Company Details (from global companyProfile)
  const ptName = companyProfile.ptName || "PT. WISATA AGRO EDUKASI SEJAHTERA";
  const brandName = companyProfile.name || "D'Kandang Amazing Farm";
  const tagline = companyProfile.tagline || "WISATA EDUKASI AGRO PERTANIAN & PETERNAKAN RAMAH KELUARGA";
  const address = companyProfile.address || "Jl. Penarikan RT 01 / RW 02, Kel. Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519";
  const phone = companyProfile.phone || "(021) 7788-9000 / 0812-1111-2233";
  const email = companyProfile.email || "sales@dkandang.id";
  const website = companyProfile.website || "www.dkandang.id";
  const directorName = quote.approvedBy || companyProfile.directorName || "H. Muh. Ridwan, S.Pt";
  const directorTitle = quote.approvedByTitle || companyProfile.directorTitle || "Direktur Utama";
  const bankName = quote.bankDetails?.bankName || companyProfile.defaultBankName || "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata";
  const bankAccount = simulateDecrypt(quote.bankDetails?.accountNumber || companyProfile.defaultBankAccount || "137-00-1928374-1");
  const accountHolder = quote.bankDetails?.accountHolder || companyProfile.defaultAccountHolder || ptName;

  // Handle Export Word
  const handleExportWord = () => {
    if (!isApproved) {
      showNotification("Mengekspor draft Surat Penawaran ke dokumen Word...", "info");
    } else {
      showNotification("Mengekspor Surat Penawaran resmi ke dokumen Word...", "success");
    }
    exportQuotationToWord(quote, companyProfile);
  };

  // Handle Google Docs
  const handleCopyForGoogleDocs = async () => {
    const success = await copyQuotationToClipboardForGoogleDocs(quote, companyProfile);
    if (success) {
      setCopiedDocsSuccess(true);
      showNotification("Format surat penawaran berhasil disalin! Silakan paste (Ctrl+V) di Google Docs.", "success");
      setTimeout(() => setCopiedDocsSuccess(false), 4000);
    }
  };

  const handleOpenGoogleDocs = () => {
    window.open('https://docs.google.com/document/create', '_blank');
  };

  // Handle WhatsApp
  const handleSendWhatsApp = async () => {
    if (!isApproved) {
      showNotification("Surat penawaran harus disetujui Direksi terlebih dahulu sebelum dapat dikirim ke customer!", "warning");
      return;
    }
    const text = encodeURIComponent(extractPlainText(quote, companyProfile));
    const phoneNum = quote.customerPhone ? quote.customerPhone.replace(/[^0-9]/g, '') : '';
    const cleanPhone = phoneNum.startsWith('0') ? '62' + phoneNum.slice(1) : phoneNum;
    
    await sendQuotationToCustomer(quote.id);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  // Handle Print
  const handlePrint = () => {
    printElementById('printable-quotation-letter', `Surat_Penawaran_${quote.quotationNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  };

  // Handle Approval Action
  const handleConfirmApprove = async () => {
    await approveQuotation(quote.id, approvalNotesInput);
    setShowApprovalModal(false);
  };

  const handleConfirmReject = async () => {
    if (!rejectionReasonInput.trim()) {
      showNotification("Harap cantumkan alasan penolakan / catatan revisi untuk tim sales.", "warning");
      return;
    }
    await rejectQuotation(quote.id, rejectionReasonInput);
    setShowRejectModal(false);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQuotation(quote.id);
      setShowDeleteModal(false);
      onClose();
    } catch (err: any) {
      showNotification(err.message || "Gagal menghapus surat penawaran.", "error");
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL ACTION BAR (Hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>{quote.quotationNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  quote.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                  quote.status === 'sent' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  quote.status === 'converted' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                  quote.status === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                  'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {quote.status === 'pending_approval' ? 'Menunggu Approval Direksi' :
                   quote.status === 'approved' ? 'Disetujui Direksi (Approved)' :
                   quote.status === 'rejected' ? 'Ditolak / Perlu Revisi' :
                   quote.status === 'sent' ? 'Telah Dikirim ke Customer' :
                   quote.status === 'converted' ? 'Telah Jadi Sales Order' : quote.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                {quote.companyName} • PIC: {quote.customerName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* BUTTON UBAH PROFIL KOP PERUSAHAAN */}
            <button
              onClick={() => setShowCompanyModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
              title="Sesuaikan Data Perusahaan, Nama PT, Bank, Alamat KOP"
            >
              <Building2 className="w-3.5 h-3.5" /> Profil KOP & Bank
            </button>

            {/* BUTTON EDIT SURAT */}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Rincian
            </button>

            {/* BUTTON PRINT */}
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / PDF
            </button>

            {/* BUTTON DELETE SURAT (RESTRICTED TO DIREKSI & SUPER ADMIN) */}
            {canDelete && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-red-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-red-800/80"
                title="Hapus Surat Penawaran (Khusus Direksi & Super Admin)"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" /> Hapus
              </button>
            )}

            {/* CLOSE BUTTON */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* APPROVAL NOTICE & ACTION BANNER (Hidden in print) */}
        <div className="print:hidden">
          {/* BANNER 1: MENUNGGU APPROVAL DIREKSI */}
          {isPending && (
            <div className="px-6 py-3.5 bg-amber-50 border-b border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs md:text-sm text-amber-900 flex items-center gap-1.5">
                    Surat Penawaran Menunggu Approval Direksi ({directorTitle})
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-tight mt-0.5">
                    {canApprove 
                      ? 'Sebagai Direksi, Anda dapat meninjau rincian penawaran di bawah ini dan memberikan otorisasi resmi atau meminta revisi.'
                      : 'Fitur Ekspor Word, Google Docs, dan Pengiriman Resmi ke Customer dikunci sampai disetujui oleh Direktur Utama.'}
                  </p>
                </div>
              </div>

              {canApprove ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-xl text-xs flex items-center gap-1.5 border border-red-300 transition-all shadow-sm"
                  >
                    <XCircle className="w-4 h-4 text-red-700" /> Tolak / Minta Revisi
                  </button>
                  <button
                    onClick={() => setShowApprovalModal(true)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" /> Setujui Penawaran (Approve)
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 font-semibold px-3 py-1.5 bg-amber-100/80 rounded-xl border border-amber-300">
                  <Lock className="w-3.5 h-3.5 text-amber-700" /> Menunggu Review Direktur
                </div>
              )}
            </div>
          )}

          {/* BANNER 2: TELAH DISETUJUI DIREKSI */}
          {isApproved && (
            <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-emerald-900">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-200 text-emerald-900 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-800" />
                </div>
                <div>
                  <div className="font-bold text-xs md:text-sm text-emerald-900 flex items-center gap-2">
                    <span>Dokumen Resmi Telah Disetujui Direksi</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-200 text-emerald-900 font-mono">
                      {quote.approvedAt ? formatTanggalIndo(quote.approvedAt) : 'Approved'}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 mt-0.5">
                    Disetujui oleh: <strong>{directorName}</strong> ({directorTitle})
                    {quote.approvalNotes && ` • Catatan: "${quote.approvalNotes}"`}
                  </p>
                </div>
              </div>

              {/* ACTION EXPORTS */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleExportWord}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  title="Unduh dokumen Word (.docx / .doc) dengan Kop Resmi D'Kandang"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh Word (.docx)
                </button>

                <button
                  onClick={handleCopyForGoogleDocs}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  title="Salin isi dokumen berformat untuk Google Docs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedDocsSuccess ? 'Tersalin untuk Docs!' : 'Salin Format Docs'}
                </button>

                <button
                  onClick={handleOpenGoogleDocs}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition-all"
                  title="Buka Google Docs di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSendWhatsApp}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  title="Kirim penawaran via WhatsApp resmi ke nomor PIC"
                >
                  <Share2 className="w-3.5 h-3.5" /> Kirim WhatsApp
                </button>

                {quote.status !== 'converted' && (
                  <button
                    onClick={() => convertQuotationToSO(quote.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ArrowRight className="w-3.5 h-3.5" /> Konversi ke SO
                  </button>
                )}
              </div>
            </div>
          )}

          {/* BANNER 3: DITOLAK DIREKSI */}
          {isRejected && (
            <div className="px-6 py-3.5 bg-red-50 border-b border-red-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-red-900">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-200 text-red-900 shrink-0 mt-0.5">
                  <XCircle className="w-5 h-5 text-red-800" />
                </div>
                <div>
                  <div className="font-bold text-xs md:text-sm text-red-900">
                    Surat Penawaran Ditolak / Diminta Revisi oleh Direksi
                  </div>
                  <p className="text-[11px] text-red-800/90 mt-0.5">
                    <strong>Catatan Revisi:</strong> {quote.rejectionReason || 'Silakan sesuaikan kembali rincian harga atau jumlah peserta.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all self-start md:self-auto shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit & Ajukan Ulang
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL LETTER PREVIEW (A4 DOCUMENT WITH OFFICIAL KOP D'KANDANG)        */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 flex justify-center print:bg-white print:p-0 print:overflow-visible">
          <div id="printable-quotation-letter" className="printable-document bg-white border border-slate-300 shadow-xl rounded-2xl max-w-4xl w-full p-8 md:p-12 text-slate-800 space-y-6 print:border-none print:shadow-none print:p-0 print:rounded-none font-sans text-sm leading-relaxed">
            
            {/* 1. KOP SURAT RESMI (DYNAMIC BASED ON COMPANY PROFILE) */}
            <div className="flex items-center gap-4 pb-2">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border-2 border-amber-400 text-white flex items-center justify-center text-3xl font-black shrink-0 shadow-md">
                {companyProfile.logoEmoji || '🌿'}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black text-emerald-900 uppercase tracking-wide leading-none">
                  {brandName}
                </h1>
                <div className="text-xs font-bold text-emerald-700 tracking-wide mt-1">
                  {tagline}
                </div>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  {ptName}
                </div>
                <div className="text-[10px] text-slate-600 leading-tight mt-1">
                  {address}<br />
                  <strong>Hotline / WA:</strong> {phone} | <strong>Email:</strong> {email} | <strong>Website:</strong> {website}
                </div>
              </div>
            </div>

            {/* DOUBLE BORDER LINE */}
            <div className="border-t-[3px] border-b border-emerald-900 h-1 my-2"></div>

            {/* 2. NOMOR & TANGGAL SURAT */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="flex">
                  <span className="w-20 font-bold text-slate-600">Nomor</span>
                  <span className="w-4">:</span>
                  <span className="font-mono font-bold text-emerald-900">{quote.quotationNumber}</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-bold text-slate-600">Lampiran</span>
                  <span className="w-4">:</span>
                  <span className="text-slate-800">1 Berkas Rundown & Fasilitas Kegiatan</span>
                </div>
                <div className="flex">
                  <span className="w-20 font-bold text-slate-600">Perihal</span>
                  <span className="w-4">:</span>
                  <span className="font-bold text-slate-900">{quote.subject || "Penawaran Harga Paket Wisata Edukasi"}</span>
                </div>
              </div>

              <div className="text-right space-y-1">
                <div>Depok, <strong>{formatTanggalIndo(quote.date)}</strong></div>
                <div className="text-amber-800 text-[11px]">
                  Berlaku s/d: <strong>{formatTanggalIndo(quote.validUntil)}</strong>
                </div>
              </div>
            </div>

            {/* 3. TUJUAN SURAT */}
            <div className="pt-2 text-xs space-y-0.5">
              <div>Kepada Yth.</div>
              <div className="font-bold text-slate-900 text-sm">
                {quote.recipientTitle || 'Bapak / Ibu Kepala Sekolah & Panitia Kegiatan'}
              </div>
              <div className="font-bold text-emerald-900 text-sm">{quote.companyName}</div>
              {quote.customerName && <div className="text-slate-700">UP: {quote.customerName}</div>}
              <div className="text-slate-600">{quote.customerAddress || 'Di Tempat'}</div>
            </div>

            {/* 4. SALAM PEMBUKA & PENGANTAR */}
            <div className="text-xs text-justify space-y-2 text-slate-700 leading-relaxed">
              <p>Dengan hormat,</p>
              <p>
                Semoga Bapak/Ibu beserta seluruh keluarga besar <strong>{quote.companyName}</strong> senantiasa dalam keadaan sehat dan penuh berkah.
              </p>
              <p>
                Menindaklanjuti rencana pelaksanaan agenda kegiatan <em>Outdoor Learning / Field Trip / Wisata Edukasi</em> pada estimasi tanggal <strong>{quote.eventDate ? formatTanggalIndo(quote.eventDate) : 'Sesuai Kesepakatan Jadwal'}</strong>, bersama ini kami dari <strong>{brandName}</strong> ({ptName}) mengajukan rincian penawaran harga resmi sebagai berikut:
              </p>
            </div>

            {/* 5. TABEL RINCIAN BIAYA PENAWARAN */}
            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-emerald-50/80 text-emerald-900 font-bold uppercase text-[10px] border-b border-slate-300">
                  <tr>
                    <th className="p-2.5 text-center w-8 border-r border-slate-200">NO</th>
                    <th className="p-2.5 border-r border-slate-200">URAIAN PAKET & FASILITAS KEGIATAN</th>
                    <th className="p-2.5 text-center w-16 border-r border-slate-200">QTY</th>
                    <th className="p-2.5 text-center w-16 border-r border-slate-200">SATUAN</th>
                    <th className="p-2.5 text-right w-28 border-r border-slate-200">HARGA SATUAN</th>
                    <th className="p-2.5 text-right w-32">SUBTOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {quote.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-500 font-bold border-r border-slate-200">{idx + 1}</td>
                      <td className="p-2.5 border-r border-slate-200">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold border-r border-slate-200">{item.quantity}</td>
                      <td className="p-2.5 text-center border-r border-slate-200">{item.unit || 'Pax'}</td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-200">
                        Rp {item.unitPrice.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                        Rp {item.total.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-300 font-semibold text-xs">
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="p-2.5 text-right text-slate-700">SUBTOTAL:</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                      Rp {quote.subtotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                  {quote.discountAmount && quote.discountAmount > 0 ? (
                    <tr className="bg-amber-50/50 text-amber-800">
                      <td colSpan={5} className="p-2 text-right font-semibold">POTONGAN HARGA / DISKON KHUSUS:</td>
                      <td className="p-2 text-right font-mono font-bold text-amber-800">
                        - Rp {quote.discountAmount.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ) : null}
                  {quote.tax > 0 ? (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="p-2 text-right text-slate-700">PPN (11%):</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-800">
                        Rp {quote.tax.toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ) : null}
                  <tr className="bg-emerald-100/70 text-emerald-950 text-sm">
                    <td colSpan={5} className="p-3 text-right font-black">GRAND TOTAL PENAWARAN:</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-900">
                      Rp {quote.grandTotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* TERBILANG BOX */}
            <div className="p-3 rounded-xl bg-slate-50 border-l-4 border-emerald-700 text-xs">
              <span className="font-bold text-slate-700">Terbilang: </span>
              <span className="italic font-semibold text-emerald-950">{terbilangRupiah(quote.grandTotal)}</span>
            </div>

            {/* 6. SYARAT & KETENTUAN */}
            <div className="text-xs space-y-1.5">
              <div className="font-bold text-emerald-900 uppercase">Syarat & Ketentuan Kegiatan:</div>
              <ol className="list-decimal pl-5 space-y-1 text-slate-700 text-[11px] leading-relaxed">
                {(quote.termsAndConditions && quote.termsAndConditions.length > 0) ? (
                  quote.termsAndConditions.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))
                ) : (
                  <>
                    <li>Harga sudah termasuk seluruh fasilitas tiket wahana & pemandu edukasi lapangan (Field Guide).</li>
                    <li>Setiap kelipatan 10 siswa berhak mendapatkan 1 guru pendamping gratis (FOC).</li>
                    <li>Konfirmasi final jumlah rombongan selambat-lambatnya H-5 sebelum tanggal pelaksanaan kunjungan.</li>
                    <li>Reschedule tanggal dapat dilakukan maksimal 1 kali dengan konfirmasi tertulis minimal H-7.</li>
                  </>
                )}
              </ol>
            </div>

            {/* 7. PEMBAYARAN & REKENING RESMI (DYNAMIC BASED ON COMPANY PROFILE) */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1.5">
              <div className="font-bold text-emerald-900">Sistem Pembayaran & Rekening Bank Resmi:</div>
              <div className="text-[11px] text-slate-700 whitespace-pre-line leading-relaxed">
                {quote.paymentTerms || "1. Pembayaran DP minimal 30% saat konfirmasi pemesanan jadwal kunjungan.\n2. Pelunasan selambat-lambatnya H-3 sebelum tanggal pelaksanaan kegiatan."}
              </div>
              <div className="pt-1.5 mt-1 border-t border-emerald-200 text-[11px] text-slate-800">
                <strong>Transfer Rekening Resmi Perusahaan:</strong><br />
                <span className="text-emerald-950 font-semibold">{bankName}</span><br />
                No. Rekening: <span className="font-mono font-bold text-emerald-900 text-sm">{bankAccount}</span><br />
                A.N: <strong>{accountHolder}</strong>
              </div>
            </div>

            {/* 8. PENUTUP */}
            <div className="text-xs text-justify text-slate-700 leading-relaxed">
              Demikian surat penawaran ini kami sampaikan. Kami siap memberikan pengalaman edukasi terbaik dan berkesan bagi seluruh siswa & rombongan <strong>{quote.companyName}</strong>. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.
            </div>

            {/* 9. TANDA TANGAN (2 KOLOM RESMI) */}
            <div className="grid grid-cols-2 gap-8 pt-4 text-center text-xs">
              <div className="space-y-1">
                <div>Dibuat Oleh,</div>
                <div className="font-bold text-slate-800">{brandName}</div>
                <div className="h-16 flex items-center justify-center">
                  <span className="text-[10px] text-slate-400 italic">[Tanda Tangan Digital Sales]</span>
                </div>
                <div className="font-bold text-slate-900 underline">{quote.preparedBy || 'Sales Executive'}</div>
                <div className="text-[11px] text-slate-500">{quote.preparedByTitle || 'Sales & Marketing Team'}</div>
              </div>

              <div className="space-y-1">
                <div>Mengetahui & Menyetujui,</div>
                <div className="font-bold text-slate-800">Direksi {brandName}</div>
                <div className="h-16 flex items-center justify-center">
                  {isApproved ? (
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-900 border-2 border-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                      ✓ APPROVED BY DIREKSI<br />
                      <span className="font-normal text-[9px]">{quote.approvedAt ? formatTanggalIndo(quote.approvedAt) : ''}</span>
                    </div>
                  ) : (
                    <div className="px-3 py-1 bg-amber-100 text-amber-800 border border-dashed border-amber-400 rounded-lg text-[10px] font-bold">
                      [Menunggu Approval Direksi]
                    </div>
                  )}
                </div>
                <div className="font-bold text-slate-900 underline">{directorName}</div>
                <div className="text-[11px] text-slate-500">{directorTitle}</div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL DELETE CONFIRMATION (DIREKSI & SUPER ADMIN ONLY) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white border border-red-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-800">
              <div className="p-3 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Hapus Surat Penawaran</h4>
                <p className="text-xs text-red-600 font-semibold">Otoritas Khusus Direksi & Super Admin</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-xs space-y-1.5 text-slate-700">
              <p>Apakah Anda yakin ingin menghapus surat penawaran ini secara permanen?</p>
              <div className="font-bold text-slate-900">{quote.companyName}</div>
              <div className="text-slate-600">Nomor Surat: <span className="font-mono font-bold text-red-800">{quote.quotationNumber}</span></div>
              <div className="font-bold text-emerald-800">Nilai: Rp {quote.grandTotal.toLocaleString('id-ID')}</div>
            </div>

            <div className="text-[11px] text-slate-500 italic">
              Tindakan ini tidak dapat dibatalkan dan surat penawaran akan dihapus dari arsip sales.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20 flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL APPROVAL CONFIRMATION */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Setujui Surat Penawaran</h4>
                <p className="text-xs text-slate-500">Otorisasi Resmi {directorTitle}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{quote.companyName}</div>
              <div className="text-slate-600">Nomor: <span className="font-mono">{quote.quotationNumber}</span></div>
              <div className="font-bold text-emerald-700">Total: Rp {quote.grandTotal.toLocaleString('id-ID')}</div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">Catatan Approval (Opsional):</label>
              <textarea
                rows={2}
                value={approvalNotesInput}
                onChange={(e) => setApprovalNotesInput(e.target.value)}
                placeholder="Disetujui untuk penawaran rombongan sekolah..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmApprove}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20"
              >
                Konfirmasi Persetujuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REJECTION CONFIRMATION */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-red-800">
              <div className="p-3 bg-red-100 rounded-2xl">
                <XCircle className="w-6 h-6 text-red-700" />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Tolak / Minta Revisi Penawaran</h4>
                <p className="text-xs text-slate-500">Kirim instruksi perbaikan ke tim sales</p>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1 text-xs">Alasan Penolakan / Catatan Revisi:</label>
              <textarea
                rows={3}
                required
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Contoh: Harga per pax mohon disesuaikan, atau kuota guru gratis melebihi batas..."
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20"
              >
                Tolak & Minta Revisi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <CustomQuotationModal
          initialQuotation={quote}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* COMPANY PROFILE & KOP MODAL */}
      {showCompanyModal && (
        <CompanyProfileModal
          onClose={() => setShowCompanyModal(false)}
        />
      )}

    </div>
  );
};
