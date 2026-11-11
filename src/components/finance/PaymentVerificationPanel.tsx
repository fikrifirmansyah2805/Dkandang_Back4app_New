import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { PaymentProof } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Eye, 
  Receipt, 
  Building2, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  AlertTriangle,
  ExternalLink,
  Filter,
  Check,
  X
} from 'lucide-react';
import SchoolPortalModal from '../sales/SchoolPortalModal';

export default function PaymentVerificationPanel() {
  const { 
    paymentProofs, 
    verifyPaymentProof, 
    salesInvoices, 
    bankAccounts,
    currentUser,
    checkPermission,
    showNotification
  } = useERP();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_verification' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProofForReview, setSelectedProofForReview] = useState<PaymentProof | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [selectedBankDestination, setSelectedBankDestination] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showPortalModal, setShowPortalModal] = useState<boolean>(false);
  const [portalTargetInvoiceId, setPortalTargetInvoiceId] = useState<string | undefined>(undefined);

  const canApprove = checkPermission('finance', 'approve') || checkPermission('finance', 'edit') || currentUser.role === 'super_admin' || currentUser.role === 'finance_manager' || currentUser.role === 'director' || currentUser.role === 'direktur_utama';

  // Filtered proofs
  const filteredProofs = paymentProofs.filter(proof => {
    if (statusFilter !== 'all' && proof.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSchool = proof.schoolName.toLowerCase().includes(q);
      const matchInv = proof.invoiceNumber.toLowerCase().includes(q);
      const matchRef = (proof.referenceNumber || '').toLowerCase().includes(q);
      const matchSender = (proof.senderAccountName || '').toLowerCase().includes(q);
      if (!matchSchool && !matchInv && !matchRef && !matchSender) return false;
    }
    return true;
  });

  const pendingCount = paymentProofs.filter(p => p.status === 'pending_verification').length;
  const verifiedCount = paymentProofs.filter(p => p.status === 'verified').length;
  const totalVerifiedAmount = paymentProofs
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleOpenReview = (proof: PaymentProof) => {
    setSelectedProofForReview(proof);
    setSelectedBankDestination(proof.bankDestination);
    setRejectionReason('');
  };

  const handleApprove = async () => {
    if (!selectedProofForReview) return;
    try {
      setIsProcessing(true);
      await verifyPaymentProof(
        selectedProofForReview.id,
        true,
        undefined,
        selectedBankDestination || selectedProofForReview.bankDestination
      );
      setSelectedProofForReview(null);
    } catch (err) {
      console.error(err);
      showNotification('Gagal memverifikasi bukti pembayaran', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProofForReview) return;
    if (!rejectionReason.trim()) {
      showNotification('Tuliskan alasan penolakan agar pihak sekolah mendapat konfirmasi yang jelas', 'warning');
      return;
    }
    try {
      setIsProcessing(true);
      await verifyPaymentProof(
        selectedProofForReview.id,
        false,
        rejectionReason.trim()
      );
      setSelectedProofForReview(null);
    } catch (err) {
      console.error(err);
      showNotification('Gagal menolak bukti pembayaran', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Stat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Menunggu Verifikasi</span>
            <div className="text-2xl font-bold text-amber-700 mt-1 font-mono">{pendingCount} Berkas</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Bukti Transfer Sah (Verified)</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{verifiedCount} Transaksi</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Dana Masuk Rombongan</span>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatRupiah(totalVerifiedAmount)}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control & Filter Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari sekolah, no faktur, pengirim, atau no resi transfer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {(['all', 'pending_verification', 'verified', 'rejected'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'all' && 'Semua'}
              {st === 'pending_verification' && `Perlu Dicek (${pendingCount})`}
              {st === 'verified' && 'Terverifikasi'}
              {st === 'rejected' && 'Ditolak'}
            </button>
          ))}
        </div>

        {/* Button to open School Portal View */}
        <button
          onClick={() => {
            setPortalTargetInvoiceId(undefined);
            setShowPortalModal(true);
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Buka Portal Publik Sekolah
        </button>
      </div>

      {/* Proofs List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredProofs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Tidak ada bukti transfer yang cocok dengan filter saat ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Sekolah & No. Faktur</th>
                  <th className="py-2.5 px-3 text-right">Nominal Transfer</th>
                  <th className="py-2.5 px-3">Rekening Tujuan</th>
                  <th className="py-2.5 px-3">Pengirim & Tgl Transfer</th>
                  <th className="py-2.5 px-3 text-center">Status Verifikasi</th>
                  <th className="py-2.5 px-3 text-center">Aksi / Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProofs.map((prf) => {
                  const matchedInv = salesInvoices.find(i => i.id === prf.invoiceId || i.invoiceNumber === prf.invoiceNumber);
                  return (
                    <tr key={prf.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{prf.schoolName}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{prf.invoiceNumber}</span>
                          {matchedInv && (
                            <span className="text-[10px] text-slate-400">
                              (Tagihan Rp {matchedInv.totalAmount.toLocaleString('id-ID')})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-emerald-800 font-mono text-sm">
                          Rp {prf.amount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase">
                          {prf.paymentStage === 'dp' ? 'Uang Muka (DP)' : prf.paymentStage === 'installment' ? 'Cicilan' : 'Pelunasan'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{prf.bankDestination.split(' - ')[0]}</div>
                        <div className="text-[10px] text-slate-400">Ref: {prf.referenceNumber}</div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium">{prf.senderAccountName}</div>
                        <div className="text-[10px] text-slate-400">
                          {prf.senderBank} • {formatDate(prf.transferDate)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          prf.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : prf.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {prf.status === 'verified' ? <CheckCircle2 className="w-3 h-3" /> : prf.status === 'rejected' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {prf.status === 'verified' ? 'Sah / Terverifikasi' : prf.status === 'rejected' ? 'Ditolak' : 'Menunggu Dicek'}
                        </span>
                        {prf.verifiedBy && (
                          <div className="text-[9px] text-slate-400 mt-0.5">Oleh: {prf.verifiedBy}</div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReview(prf)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                          >
                            <Eye className="w-3 h-3" /> Periksa & Validasi
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setPortalTargetInvoiceId(prf.invoiceId);
                              setShowPortalModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                            title="Buka Faktur Sekolah Ini"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Review & Approval Drawer */}
      {selectedProofForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pemeriksaan Bukti Transfer Masuk</h3>
                  <p className="text-[11px] text-slate-500">Cocokkan dengan mutasi rekening koran D'Kandang</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProofForReview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Summary Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Data Sekolah</span>
                <div className="font-bold text-slate-800 text-sm">{selectedProofForReview.schoolName}</div>
                <div className="text-slate-600">No. Faktur: <strong className="font-mono text-slate-800">{selectedProofForReview.invoiceNumber}</strong></div>
                <div className="text-slate-600">Nama Pengirim: <strong>{selectedProofForReview.senderAccountName} ({selectedProofForReview.senderBank})</strong></div>
                <div className="text-slate-600">No. Referensi: <strong className="font-mono">{selectedProofForReview.referenceNumber}</strong></div>
                <div className="text-slate-600">Tgl Transfer: {formatDate(selectedProofForReview.transferDate)}</div>
              </div>

              <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1.5">
                <span className="text-[10px] text-emerald-700 font-bold uppercase">Nominal & Bank Tujuan</span>
                <div className="text-xl font-black text-emerald-900 font-mono">
                  Rp {selectedProofForReview.amount.toLocaleString('id-ID')}
                </div>
                <div className="text-emerald-800 font-medium">
                  Tujuan: {selectedProofForReview.bankDestination}
                </div>
                <div className="text-[10px] text-emerald-700">
                  Tahap: {selectedProofForReview.paymentStage === 'dp' ? 'Uang Muka (DP)' : selectedProofForReview.paymentStage === 'installment' ? 'Cicilan' : 'Pelunasan'}
                </div>
                {selectedProofForReview.notes && (
                  <div className="text-[11px] text-slate-600 bg-white/60 p-1.5 rounded border border-emerald-100">
                    Catatan: {selectedProofForReview.notes}
                  </div>
                )}
              </div>
            </div>

            {/* Slip Transfer Photo Preview */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">Gambar Bukti / Slip Transfer:</span>
              {selectedProofForReview.proofFileUrl ? (
                <div className="w-full max-h-60 rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img
                    src={selectedProofForReview.proofFileUrl}
                    alt="Slip Transfer"
                    className="max-h-60 w-auto object-contain"
                  />
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  Tidak ada lampiran gambar slip.
                </div>
              )}
            </div>

            {/* Verification Form Section */}
            {canApprove && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Otorisasi Tim Finance</h4>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Konfirmasi Rekening Kas/Bank yang Menerima Uang:
                  </label>
                  <select
                    value={selectedBankDestination}
                    onChange={(e) => setSelectedBankDestination(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium"
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.bankName}>{b.bankName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Alasan Penolakan (Hanya diisi jika ingin menolak):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Dana belum masuk rekening koran / Nominal kurang..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleReject}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Tolak Bukti Transfer
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleApprove}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isProcessing ? 'Memproses...' : 'Setujui & Catat Kas Masuk'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* School Portal Public View Modal */}
      {showPortalModal && (
        <SchoolPortalModal
          initialInvoiceId={portalTargetInvoiceId}
          onClose={() => setShowPortalModal(false)}
        />
      )}
    </div>
  );
}
