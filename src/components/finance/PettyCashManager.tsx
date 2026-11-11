import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  PettyCashWallet, 
  PettyCashExpense, 
  ReimbursementClaim 
} from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { 
  Wallet, 
  Receipt, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  UploadCloud, 
  Eye, 
  Filter, 
  Search, 
  Building2, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Check, 
  X, 
  ShieldCheck,
  Send,
  Sparkles,
  Layers,
  Calendar,
  RotateCcw
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  animal_feed_supplements: { label: 'Pakan & Suplemen Satwa', color: 'bg-emerald-100 text-emerald-800' },
  fuel_transport: { label: 'BBM & Parkir Lapangan', color: 'bg-blue-100 text-blue-800' },
  fnb_refreshment: { label: 'Konsumsi Tamu & Guide', color: 'bg-amber-100 text-amber-800' },
  maintenance_urgent: { label: 'Perbaikan Darurat & Baut', color: 'bg-rose-100 text-rose-800' },
  office_stationery: { label: 'ATK & Fotokopi Form', color: 'bg-purple-100 text-purple-800' },
  other: { label: 'Lain-lain', color: 'bg-slate-100 text-slate-700' }
};

export default function PettyCashManager() {
  const { 
    pettyCashWallets, 
    pettyCashExpenses, 
    reimbursementClaims, 
    bankAccounts, 
    addPettyCashWallet, 
    recordPettyCashExpense, 
    submitReimbursementClaim, 
    approveReimbursementClaim, 
    disburseReimbursementClaim,
    currentUser,
    checkPermission,
    showNotification
  } = useERP();

  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'claims' | 'wallets'>('expenses');

  // Sub-Tab Filter & Search States
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'unclaimed' | 'claimed' | 'reimbursed'>('all');
  const [expenseWalletFilter, setExpenseWalletFilter] = useState<string>('all');
  const [expenseSearchQuery, setExpenseSearchQuery] = useState('');

  const [claimStatusFilter, setClaimStatusFilter] = useState<'all' | 'submitted' | 'approved' | 'disbursed'>('all');
  const [claimSearchQuery, setClaimSearchQuery] = useState('');

  // New Wallet Form modal
  const [showAddWalletModal, setShowAddWalletModal] = useState<boolean>(false);
  const [walletName, setWalletName] = useState<string>('');
  const [walletCode, setWalletCode] = useState<string>('');
  const [walletCustodian, setWalletCustodian] = useState<string>(currentUser.name);
  const [walletCeiling, setWalletCeiling] = useState<string>('2000000');
  const [walletDept, setWalletDept] = useState<string>('Operasional Edukasi Farm');

  // Record Expense Form states
  const [selectedWalletId, setSelectedWalletId] = useState<string>(pettyCashWallets[0]?.id || '');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseCategory, setExpenseCategory] = useState<any>('fuel_transport');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState<boolean>(false);

  // New Claim Draft states
  const [claimWalletId, setClaimWalletId] = useState<string>(pettyCashWallets[0]?.id || '');
  const [claimTitle, setClaimTitle] = useState<string>('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState<boolean>(false);

  // Disburse modal
  const [disbursingClaim, setDisbursingClaim] = useState<ReimbursementClaim | null>(null);
  const [disburseSourceBank, setDisburseSourceBank] = useState<string>(bankAccounts[0]?.bankName || '');
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);

  // Image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const canApprove = checkPermission('finance', 'approve') || currentUser.role === 'super_admin' || currentUser.role === 'director' || currentUser.role === 'direktur_utama' || currentUser.role === 'finance_manager';

  // Handle simulate file upload for expense receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new wallet
  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletName.trim()) return;
    await addPettyCashWallet({
      name: walletName.trim(),
      code: walletCode.trim() || `KAS-${Date.now().toString().slice(-4)}`,
      custodianName: walletCustodian.trim(),
      ceilingAmount: Number(walletCeiling) || 2000000,
      department: walletDept.trim()
    });
    setShowAddWalletModal(false);
    setWalletName('');
    setWalletCode('');
  };

  // Submit new expense
  const handleRecordExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!selectedWalletId || isNaN(amt) || amt <= 0 || !expenseDescription.trim()) {
      showNotification('Lengkapi seluruh data pengeluaran dengan benar', 'warning');
      return;
    }

    try {
      setIsSubmittingExpense(true);
      await recordPettyCashExpense({
        walletId: selectedWalletId,
        date: expenseDate,
        amount: amt,
        category: expenseCategory,
        description: expenseDescription.trim(),
        receiptNumber: receiptNumber.trim() || undefined,
        receiptImageUrl: receiptImageUrl || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=60'
      });
      setExpenseAmount('');
      setExpenseDescription('');
      setReceiptNumber('');
      setReceiptImageUrl('');
    } catch (err) {
      console.error(err);
      showNotification('Gagal mencatat pengeluaran kas kecil', 'error');
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  // Filter un-claimed expenses for the selected claim wallet
  const unclaimedExpenses = useMemo(() => {
    return pettyCashExpenses.filter(e => e.walletId === claimWalletId && e.status === 'recorded');
  }, [pettyCashExpenses, claimWalletId]);

  // Handle toggle select expense for claim
  const handleToggleExpense = (id: string) => {
    if (selectedExpenseIds.includes(id)) {
      setSelectedExpenseIds(selectedExpenseIds.filter(x => x !== id));
    } else {
      setSelectedExpenseIds([...selectedExpenseIds, id]);
    }
  };

  const handleSelectAllUnclaimed = () => {
    if (selectedExpenseIds.length === unclaimedExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(unclaimedExpenses.map(e => e.id));
    }
  };

  const totalClaimAmount = useMemo(() => {
    return unclaimedExpenses
      .filter(e => selectedExpenseIds.includes(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [unclaimedExpenses, selectedExpenseIds]);

  // Submit Reimbursement Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExpenseIds.length === 0) {
      showNotification('Pilih minimal satu nota pengeluaran untuk diajukan klaim reimbursement', 'warning');
      return;
    }

    try {
      setIsSubmittingClaim(true);
      await submitReimbursementClaim(
        claimWalletId,
        selectedExpenseIds
      );
      setSelectedExpenseIds([]);
      setClaimTitle('');
      setActiveSubTab('claims');
    } catch (err) {
      console.error(err);
      showNotification('Gagal mengajukan klaim reimbursement', 'error');
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Disburse claim
  const handleExecuteDisburse = async () => {
    if (!disbursingClaim) return;
    try {
      setIsDisbursing(true);
      await disburseReimbursementClaim(
        disbursingClaim.id,
        disburseSourceBank
      );
      setDisbursingClaim(null);
    } catch (err) {
      console.error(err);
      showNotification('Gagal mencairkan dana reimbursement', 'error');
    } finally {
      setIsDisbursing(false);
    }
  };

  // Expenses Filtered & Paginated
  const filteredExpenses = useMemo(() => {
    return pettyCashExpenses.filter(exp => {
      if (expenseStatusFilter !== 'all' && exp.status !== expenseStatusFilter) return false;
      if (expenseWalletFilter !== 'all' && exp.walletId !== expenseWalletFilter) return false;
      if (expenseSearchQuery.trim()) {
        const q = expenseSearchQuery.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchRef = (exp.receiptNumber || '').toLowerCase().includes(q);
        const matchBy = (exp.recordedBy || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchBy) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [pettyCashExpenses, expenseStatusFilter, expenseWalletFilter, expenseSearchQuery]);

  const {
    currentData: paginatedExpenses,
    currentPage: expenseCurrentPage,
    totalPages: expenseTotalPages,
    totalItems: expenseTotalItems,
    itemsPerPage: expenseItemsPerPage,
    nextPage: expenseNextPage,
    prevPage: expensePrevPage
  } = usePagination(filteredExpenses, 8);

  // Claims Filtered & Paginated
  const filteredClaims = useMemo(() => {
    return reimbursementClaims.filter(claim => {
      if (claimStatusFilter !== 'all' && claim.status !== claimStatusFilter) return false;
      if (claimSearchQuery.trim()) {
        const q = claimSearchQuery.toLowerCase();
        const matchNum = claim.claimNumber.toLowerCase().includes(q);
        const matchTitle = (claim.title || '').toLowerCase().includes(q);
        const matchBy = claim.submittedBy.toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchBy) return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [reimbursementClaims, claimStatusFilter, claimSearchQuery]);

  const {
    currentData: paginatedClaims,
    currentPage: claimCurrentPage,
    totalPages: claimTotalPages,
    totalItems: claimTotalItems,
    itemsPerPage: claimItemsPerPage,
    nextPage: claimNextPage,
    prevPage: claimPrevPage
  } = usePagination(filteredClaims, 8);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Wallets Carousel */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Manajemen Kas Kecil (Petty Cash & Imprest Fund)</h2>
                <p className="text-xs text-slate-500">
                  Pengelolaan saldo kas fisik lapangan, pencatatan bon belanja darurat, dan pengisian kembali dana (reimbursement) otomatis.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddWalletModal(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-center cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Dompet Kas Baru
          </button>
        </div>

        {/* Wallets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pettyCashWallets.map((wallet) => {
            const pctRemaining = (wallet.currentBalance / wallet.ceilingAmount) * 100;
            const isLow = pctRemaining < 25;

            return (
              <div 
                key={wallet.id} 
                className={`p-4 rounded-2xl bg-white border transition-all shadow-xs flex flex-col justify-between space-y-3 ${
                  isLow ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">{wallet.code}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isLow 
                        ? 'bg-rose-100 text-rose-800 flex items-center gap-1' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isLow && <AlertTriangle className="w-3 h-3" />}
                      {isLow ? 'Perlu Diisi Ulang' : 'Saldo Aman'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-1">{wallet.name}</h3>
                  <div className="text-[11px] text-slate-500 mt-0.5">PIC: <strong className="text-slate-700">{wallet.custodianName}</strong> ({wallet.department})</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">Sisa Saldo Tunai:</span>
                    <span className="text-base font-black font-mono text-slate-900">
                      {formatRupiah(wallet.currentBalance)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        isLow ? 'bg-rose-500' : pctRemaining < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, pctRemaining))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Plafon: {formatRupiah(wallet.ceilingAmount)}</span>
                    <span className="font-bold">{pctRemaining.toFixed(0)}% Tersedia</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sub-Tabs Bar */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'expenses'
              ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Bon & Bukti Belanja Lapangan ({pettyCashExpenses.length})
        </button>

        <button
          onClick={() => setActiveSubTab('claims')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'claims'
              ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Pengajuan & Pencairan Reimbursement ({reimbursementClaims.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: RECORD & VIEW EXPENSES                                         */}
      {/* ========================================================================= */}
      {activeSubTab === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Form to Record Expense (4 Cols) */}
          <div className="lg:col-span-4">
            <form onSubmit={handleRecordExpense} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Catat Bon Belanja Lapangan</h3>
                  <p className="text-[10px] text-slate-500">Keluarkan dana tunai dari kas kecil</p>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Pilih Dompet Kas Kecil*</label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                >
                  {pettyCashWallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} (Sisa {formatRupiah(w.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Tanggal Bon*</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nominal Bon (Rp)*</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 150000"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Kategori Keperluan*</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                >
                  <option value="fuel_transport">BBM & Parkir Lapangan</option>
                  <option value="animal_feed_supplements">Pakan & Suplemen Satwa Darurat</option>
                  <option value="fnb_refreshment">Konsumsi Tamu & Pemandu Wisata</option>
                  <option value="maintenance_urgent">Perbaikan Baut/Kawat/Pipa Kandang</option>
                  <option value="office_stationery">ATK, Fotokopi & Lembar Panduan Siswa</option>
                  <option value="other">Keperluan Lapangan Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Deskripsi Pengeluaran*</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Beli kawat kandang kelinci & paku saung..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nomor Nota / Bon Toko (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: NOTA-TB-8812"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-mono"
                />
              </div>

              {/* Upload Receipt */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Foto Bukti Nota / Bon</label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl bg-slate-50 hover:bg-emerald-50/30 cursor-pointer transition-colors text-xs text-slate-600 font-medium">
                    <UploadCloud className="w-4 h-4 text-slate-400" />
                    <span>Upload Foto Struk</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleReceiptUpload}
                      className="hidden"
                    />
                  </label>

                  {receiptImageUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(receiptImageUrl)}
                      className="px-2.5 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingExpense}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Receipt className="w-4 h-4" />
                {isSubmittingExpense ? 'Mencatat...' : 'Simpan Bon & Kurangi Saldo'}
              </button>
            </form>
          </div>

          {/* Expenses Table (8 Cols) */}
          <div className="lg:col-span-8 space-y-3">
            {/* Header with Title & Stats */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-800">Daftar Pengeluaran Kas Kecil Tercatat</h3>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                Menampilkan {paginatedExpenses.length} dari {filteredExpenses.length} Bon
              </span>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              {/* Tab Filter Status Bon */}
              <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-semibold pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    expenseStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Semua ({pettyCashExpenses.length})
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('unclaimed')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    expenseStatusFilter === 'unclaimed'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Belum Diklaim ({pettyCashExpenses.filter(e => e.status === 'unclaimed').length})
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('claimed')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    expenseStatusFilter === 'claimed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  Sedang Diajukan ({pettyCashExpenses.filter(e => e.status === 'claimed').length})
                </button>

                <button
                  type="button"
                  onClick={() => setExpenseStatusFilter('reimbursed')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    expenseStatusFilter === 'reimbursed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sudah Cair ({pettyCashExpenses.filter(e => e.status === 'reimbursed').length})
                </button>
              </div>

              {/* Search Engine & Wallet Dropdown */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 text-xs">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari deskripsi bon, nomor bukti, pencatat..."
                    value={expenseSearchQuery}
                    onChange={(e) => setExpenseSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  {expenseSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setExpenseSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={expenseWalletFilter}
                    onChange={(e) => setExpenseWalletFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none font-medium"
                  >
                    <option value="all">Semua Dompet Kas</option>
                    {pettyCashWallets.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>

                  {(expenseSearchQuery || expenseStatusFilter !== 'all' || expenseWalletFilter !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpenseSearchQuery('');
                        setExpenseStatusFilter('all');
                        setExpenseWalletFilter('all');
                      }}
                      className="px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {paginatedExpenses.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-slate-600 text-sm">Tidak ada bon kas kecil yang cocok</p>
                  <p className="text-xs text-slate-400 mt-0.5">Coba ganti filter tabulasi atau kata kunci pencarian.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">Tanggal & Deskripsi</th>
                        <th className="py-2.5 px-3">Dompet Kas</th>
                        <th className="py-2.5 px-3">Kategori</th>
                        <th className="py-2.5 px-3 text-right">Nominal</th>
                        <th className="py-2.5 px-3 text-center">Status Klaim</th>
                        <th className="py-2.5 px-3 text-center">Bukti</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedExpenses.map((exp) => {
                        const w = pettyCashWallets.find(x => x.id === exp.walletId);
                        const cat = CATEGORY_LABELS[exp.category] || CATEGORY_LABELS.other;

                        return (
                          <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-800">{exp.description}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{formatDate(exp.date)}</span>
                                {exp.receiptNumber && <span>• Ref: {exp.receiptNumber}</span>}
                                <span>• Oleh: {exp.recordedBy}</span>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className="font-medium text-slate-700">{w?.name || exp.walletId}</span>
                            </td>

                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cat.color}`}>
                                {cat.label}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              Rp {exp.amount.toLocaleString('id-ID')}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                exp.status === 'reimbursed'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : exp.status === 'claimed'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {exp.status === 'reimbursed' ? 'Sudah Diganti (Cair)' : exp.status === 'claimed' ? 'Sedang Diajukan' : 'Belum Diajukan'}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-center">
                              {exp.receiptImageUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImageUrl(exp.receiptImageUrl!)}
                                  className="p-1 text-slate-500 hover:text-emerald-700 rounded cursor-pointer"
                                  title="Lihat Foto Struk"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              <Pagination
                currentPage={expenseCurrentPage}
                totalPages={expenseTotalPages}
                totalItems={expenseTotalItems}
                itemsPerPage={expenseItemsPerPage}
                onNext={expenseNextPage}
                onPrev={expensePrevPage}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: REIMBURSEMENT CLAIMS & DISBURSEMENT                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'claims' && (
        <div className="space-y-6">
          
          {/* Section: Buat Pengajuan Klaim Baru */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Ajukan Pengisian Kembali Kas Kecil (Reimbursement Imprest)</h3>
                  <p className="text-[10px] text-slate-500">Pilih dompet dan centang bon-bon belanja yang ingin diganti oleh rekening giro utama</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Pilih Dompet:</span>
                <select
                  value={claimWalletId}
                  onChange={(e) => {
                    setClaimWalletId(e.target.value);
                    setSelectedExpenseIds([]);
                  }}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {pettyCashWallets.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {unclaimedExpenses.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs">
                Tidak ada bon belanja baru yang belum diajukan di dompet ini. Semua bon sudah diproses klaim.
              </div>
            ) : (
              <form onSubmit={handleSubmitClaim} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllUnclaimed}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {selectedExpenseIds.length === unclaimedExpenses.length ? 'Batal Pilih Semua' : 'Pilih Semua Bon'}
                    </button>
                    <span className="text-xs text-slate-500">
                      {selectedExpenseIds.length} dari {unclaimedExpenses.length} bon dipilih
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-medium">Total Nominal Reimbursement:</span>
                    <span className="text-sm font-black text-emerald-800 font-mono">
                      {formatRupiah(totalClaimAmount)}
                    </span>
                  </div>
                </div>

                {/* Selectable Expenses Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-8">Pilih</th>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Keterangan</th>
                        <th className="py-2 px-3">Kategori</th>
                        <th className="py-2 px-3 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {unclaimedExpenses.map(exp => (
                        <tr 
                          key={exp.id} 
                          onClick={() => handleToggleExpense(exp.id)}
                          className={`cursor-pointer transition-colors ${
                            selectedExpenseIds.includes(exp.id) ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={selectedExpenseIds.includes(exp.id)}
                              onChange={() => {}}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{formatDate(exp.date)}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{exp.description}</td>
                          <td className="py-2.5 px-3 text-[11px] text-slate-500">
                            {CATEGORY_LABELS[exp.category]?.label || exp.category}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            Rp {exp.amount.toLocaleString('id-ID')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Judul pengajuan (misal: Reimbursement Bon Lapangan Minggu III September)..."
                      value={claimTitle}
                      onChange={(e) => setClaimTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmittingClaim || selectedExpenseIds.length === 0}
                      className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSubmittingClaim ? 'Mengajukan...' : 'Kirim Pengajuan ke Direktur'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Section: Riwayat & Persetujuan Klaim */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" /> Daftar Berkas Klaim Reimbursement ({reimbursementClaims.length})
              </h4>
              <span className="text-[10px] text-slate-400">Otorisasi Direktur & Finance</span>
            </div>

            {reimbursementClaims.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada pengajuan klaim reimbursement yang dibuat.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {reimbursementClaims.map((claim) => {
                  const w = pettyCashWallets.find(x => x.id === claim.walletId);

                  return (
                    <div key={claim.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{claim.claimNumber}</span>
                          <span className="text-[11px] text-slate-500">• {w?.name || claim.walletId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            claim.status === 'disbursed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'approved'
                              ? 'bg-blue-100 text-blue-800'
                              : claim.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {claim.status === 'disbursed' ? 'Dana Dicairkan (Selesai)' : claim.status === 'approved' ? 'Disetujui Direktur' : claim.status === 'rejected' ? 'Ditolak' : 'Menunggu Approval'}
                          </span>
                        </div>

                        <div className="text-slate-600 font-medium">{claim.title}</div>

                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>{claim.expenseIds.length} bon nota</span>
                          <span>•</span>
                          <span>Diajukan oleh: {claim.submittedBy} ({formatDate(claim.createdAt)})</span>
                          {claim.approvedBy && (
                            <>
                              <span>•</span>
                              <span>Disetujui: {claim.approvedBy}</span>
                            </>
                          )}
                          {claim.disbursedBy && (
                            <>
                              <span>•</span>
                              <span>Cair via: {claim.disbursementSourceBank}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Total Penggantian:</span>
                          <span className="text-base font-black text-emerald-800 font-mono">
                            {formatRupiah(claim.totalAmount)}
                          </span>
                        </div>

                        {/* Action buttons based on status & role */}
                        <div className="flex items-center gap-1.5">
                          {claim.status === 'submitted' && canApprove && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Setujui pengajuan reimbursement ${claim.claimNumber}?`)) {
                                  await approveReimbursementClaim(claim.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> Setujui Klaim
                            </button>
                          )}

                          {claim.status === 'approved' && canApprove && (
                            <button
                              type="button"
                              onClick={() => {
                                setDisbursingClaim(claim);
                                setDisburseSourceBank(bankAccounts[0]?.bankName || '');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <DollarSign className="w-3.5 h-3.5" /> Cairkan Dana
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Tambah Dompet Kas Baru */}
      {showAddWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Buat Dompet Kas Kecil Baru</h3>
                  <p className="text-[10px] text-slate-500">Plafon imprest fund untuk unit lapangan</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddWalletModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWallet} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Buku Kas Kecil*</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kas Kecil Edukasi & Wahana Lapangan"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Kode Akun*</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: KAS-EDU-01"
                    value={walletCode}
                    onChange={(e) => setWalletCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Plafon Dana (Rp)*</label>
                  <input
                    type="number"
                    required
                    step="100000"
                    placeholder="2000000"
                    value={walletCeiling}
                    onChange={(e) => setWalletCeiling(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Pemegang Kas (Custodian)*</label>
                <input
                  type="text"
                  required
                  placeholder="Nama staf PIC kas..."
                  value={walletCustodian}
                  onChange={(e) => setWalletCustodian(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Departemen / Unit</label>
                <input
                  type="text"
                  placeholder="Contoh: Operasional Farm / Resto / Tiket"
                  value={walletDept}
                  onChange={(e) => setWalletDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddWalletModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                >
                  Simpan Dompet Kas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cairkan Dana Reimbursement */}
      {disbursingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Pencairan Dana Reimbursement</h3>
                  <p className="text-[10px] text-slate-500">Keluarkan dana dari rekening bank untuk isi saldo kas kecil</p>
                </div>
              </div>
              <button 
                onClick={() => setDisbursingClaim(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">No. Klaim:</span>
                <span className="font-bold text-slate-900 font-mono">{disbursingClaim.claimNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total Pencairan:</span>
                <span className="font-black text-emerald-900 font-mono text-sm">{formatRupiah(disbursingClaim.totalAmount)}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Pilih Rekening Bank Sumber Penarikan:
              </label>
              <select
                value={disburseSourceBank}
                onChange={(e) => setDisburseSourceBank(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
              >
                {bankAccounts.filter(b => b.status === 'active').map(b => (
                  <option key={b.id} value={b.bankName}>
                    {b.bankName} (Saldo: {formatRupiah(b.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisbursingClaim(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDisbursing}
                onClick={handleExecuteDisburse}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDisbursing ? 'Memproses...' : 'Cairkan & Pulihkan Saldo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview Image Nota */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 border border-slate-200 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800">Lampiran Bukti Nota Fisik</h4>
              <button 
                onClick={() => setPreviewImageUrl(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="w-full max-h-80 overflow-hidden rounded-xl bg-slate-900 flex items-center justify-center">
              <img src={previewImageUrl} alt="Preview Bukti" className="max-h-80 w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
