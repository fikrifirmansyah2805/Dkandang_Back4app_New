import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { DebtRecord, DebtCategory, DebtStatus, DebtPaymentRecord, PurchaseOrder } from '../../types';
import { formatRupiah, formatDate } from '../../utils/crypto';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  ArrowDownRight, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  X, 
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  CreditCard,
  Building,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';

const CATEGORY_LABELS: Record<DebtCategory, { label: string; badgeClass: string }> = {
  supplier_po: { 
    label: 'PO Pemasok / Bahan', 
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' 
  },
  vendor_operasional: { 
    label: 'Vendor Operasional', 
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' 
  },
  bank_loan: { 
    label: 'Pinjaman Bank', 
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' 
  },
  tax_payable: { 
    label: 'Kewajiban Pajak', 
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' 
  },
  salary_payable: { 
    label: 'Kewajiban Gaji/Karyawan', 
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' 
  },
  facility_lease: { 
    label: 'Sewa Lahan / Wahana', 
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200' 
  },
  other: { 
    label: 'Kewajiban Lainnya', 
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' 
  }
};

const STATUS_CONFIG: Record<DebtStatus, { label: string; bg: string; text: string; icon: any }> = {
  unpaid: { 
    label: 'Belum Dibayar', 
    bg: 'bg-rose-50 border-rose-200', 
    text: 'text-rose-700', 
    icon: Clock 
  },
  partial: { 
    label: 'Dicicil (Sebagian)', 
    bg: 'bg-amber-50 border-amber-200', 
    text: 'text-amber-700', 
    icon: AlertTriangle 
  },
  paid: { 
    label: 'Lunas', 
    bg: 'bg-emerald-50 border-emerald-200', 
    text: 'text-emerald-700', 
    icon: CheckCircle2 
  },
  overdue: { 
    label: 'Jatuh Tempo', 
    bg: 'bg-red-100 border-red-300', 
    text: 'text-red-800 font-bold', 
    icon: AlertCircle 
  },
  cancelled: { 
    label: 'Dibatalkan', 
    bg: 'bg-slate-100 border-slate-300', 
    text: 'text-slate-600', 
    icon: X 
  }
};

export default function AccountsPayablePanel() {
  const { 
    debts = [], 
    addDebt, 
    updateDebt, 
    deleteDebt, 
    recordDebtPayment, 
    importPOAsDebt,
    purchaseOrders = [],
    bankAccounts = [],
    currentUser,
    showNotification
  } = useERP();

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedDebtDetail, setSelectedDebtDetail] = useState<DebtRecord | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showImportPOModal, setShowImportPOModal] = useState(false);
  const [targetDebtForPayment, setTargetDebtForPayment] = useState<DebtRecord | null>(null);

  // Payment Form State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState<'cash' | 'transfer' | 'giro'>('transfer');
  const [payBankId, setPayBankId] = useState<string>('');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payReceiptNo, setPayReceiptNo] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Add Debt Form State
  const [formData, setFormData] = useState({
    creditorName: '',
    creditorContact: '',
    creditorPhone: '',
    category: 'supplier_po' as DebtCategory,
    description: '',
    invoiceNumber: '',
    totalAmount: 0,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    paymentTerms: 'NET 30',
    notes: ''
  });

  // Calculate Statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let totalActiveDebt = 0;
    let totalPaidDebt = 0;
    let overdueCount = 0;
    let overdueAmount = 0;
    let dueThisWeekCount = 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split('T')[0];

    debts.forEach(d => {
      totalPaidDebt += d.paidAmount || 0;
      if (d.status !== 'paid' && d.status !== 'cancelled') {
        totalActiveDebt += d.remainingAmount || 0;
        if (d.dueDate && d.dueDate < today) {
          overdueCount += 1;
          overdueAmount += d.remainingAmount;
        } else if (d.dueDate && d.dueDate <= sevenDaysStr) {
          dueThisWeekCount += 1;
        }
      }
    });

    return {
      totalActiveDebt,
      totalPaidDebt,
      overdueCount,
      overdueAmount,
      dueThisWeekCount,
      totalRecords: debts.length
    };
  }, [debts]);

  // Filtered Debt List
  const filteredDebts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return debts.filter(d => {
      const matchSearch = 
        d.debtNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.creditorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (d.relatedPoNumber && d.relatedPoNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = categoryFilter === 'all' || d.category === categoryFilter;

      let matchStatus = true;
      if (statusFilter === 'overdue') {
        matchStatus = (d.status !== 'paid' && d.status !== 'cancelled') && (d.dueDate < today);
      } else if (statusFilter !== 'all') {
        matchStatus = d.status === statusFilter;
      }

      return matchSearch && matchCat && matchStatus;
    }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [debts, searchTerm, categoryFilter, statusFilter]);

  // Unlinked POs that can be imported
  const eligiblePOs = useMemo(() => {
    const existingPoIds = new Set(debts.map(d => d.relatedPoId).filter(Boolean));
    return purchaseOrders.filter(po => !existingPoIds.has(po.id) && po.status !== 'cancelled');
  }, [purchaseOrders, debts]);

  // Open Payment Modal
  const handleOpenPayModal = (debt: DebtRecord) => {
    setTargetDebtForPayment(debt);
    setPayAmount(debt.remainingAmount);
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayMethod('transfer');
    setPayBankId(bankAccounts[0]?.id || '');
    setPayRefNo(`TRF-PAY-${debt.debtNumber}`);
    setPayReceiptNo('');
    setPayNotes(`Pelunasan / cicilan untuk ${debt.creditorName}`);
    setShowPayModal(true);
  };

  // Submit Payment Action
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDebtForPayment) return;

    if (payAmount <= 0) {
      showNotification('Nominal pembayaran harus lebih dari 0', 'error');
      return;
    }
    if (payAmount > targetDebtForPayment.remainingAmount) {
      showNotification(`Nominal melebihi sisa hutang (Rp ${targetDebtForPayment.remainingAmount.toLocaleString('id-ID')})`, 'error');
      return;
    }
    if (!payBankId) {
      showNotification('Pilih rekening sumber dana kas/bank', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const res = await recordDebtPayment(targetDebtForPayment.id, {
        amount: payAmount,
        paymentDate: payDate,
        paymentMethod: payMethod,
        sourceAccountId: payBankId,
        referenceNo: payRefNo,
        receiptNumber: payReceiptNo,
        notes: payNotes
      });

      if (res.success) {
        setShowPayModal(false);
        setTargetDebtForPayment(null);
        if (selectedDebtDetail?.id === targetDebtForPayment.id) {
          // Refresh detail view
          const updated = debts.find(d => d.id === targetDebtForPayment.id);
          if (updated) setSelectedDebtDetail(updated);
        }
      }
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Submit Add Debt Form
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creditorName.trim()) {
      showNotification('Nama pihak kreditur/pemasok wajib diisi', 'error');
      return;
    }
    if (formData.totalAmount <= 0) {
      showNotification('Total pokok hutang harus lebih besar dari 0', 'error');
      return;
    }
    if (!formData.dueDate) {
      showNotification('Tanggal jatuh tempo wajib ditentukan', 'error');
      return;
    }

    try {
      await addDebt({
        creditorName: formData.creditorName.trim(),
        creditorContact: formData.creditorContact.trim() || undefined,
        creditorPhone: formData.creditorPhone.trim() || undefined,
        category: formData.category,
        description: formData.description.trim() || 'Kewajiban Pembayaran Usaha',
        invoiceNumber: formData.invoiceNumber.trim() || undefined,
        totalAmount: Number(formData.totalAmount),
        issueDate: formData.issueDate,
        dueDate: formData.dueDate,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes.trim() || undefined
      });

      setShowAddModal(false);
      setFormData({
        creditorName: '',
        creditorContact: '',
        creditorPhone: '',
        category: 'supplier_po',
        description: '',
        invoiceNumber: '',
        totalAmount: 0,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        paymentTerms: 'NET 30',
        notes: ''
      });
    } catch (err) {
      // Error handled in ERPContext
    }
  };

  // Import PO Handler
  const handleImportPO = async (po: PurchaseOrder) => {
    const res = await importPOAsDebt(po.id);
    if (res.success) {
      setShowImportPOModal(false);
    }
  };

  // Quick export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Nomor Hutang', 'Pihak Kreditur / Vendor', 'Kategori', 'Deskripsi', 'Total Pokok', 'Sudah Dibayar', 'Sisa Hutang', 'Tgl Timbul', 'Jatuh Tempo', 'Status', 'No Ref PO/Inv'],
      ...filteredDebts.map(d => [
        d.debtNumber,
        d.creditorName,
        CATEGORY_LABELS[d.category]?.label || d.category,
        `"${d.description.replace(/"/g, '""')}"`,
        d.totalAmount,
        d.paidAmount,
        d.remainingAmount,
        d.issueDate,
        d.dueDate,
        d.status,
        d.relatedPoNumber || d.invoiceNumber || '-'
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Hutang_DKandang_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isOverdue = (debt: DebtRecord) => {
    if (debt.status === 'paid' || debt.status === 'cancelled') return false;
    const today = new Date().toISOString().split('T')[0];
    return debt.dueDate < today;
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pencatatan Hutang & Kewajiban Usaha (Accounts Payable)</h2>
              <p className="text-sm text-slate-500">
                Kelola kewajiban jatuh tempo pemasok pakan, tagihan vendor operasional, fasilitas kredit, dan integrasi pengeluaran kas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setShowImportPOModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl text-sm font-semibold transition-all cursor-pointer"
            title="Tarik Purchase Order dari Modul Pengadaan yang belum dibayar"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Tarik dari PO ({eligiblePOs.length})
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Hutang Baru
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sisa Hutang Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Sisa Hutang Aktif</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatRupiah(stats.totalActiveDebt)}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span>Dari total {stats.totalRecords} tagihan tercatat</span>
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-rose-50 rounded-full opacity-40 pointer-events-none" />
        </div>

        {/* Card 2: Hutang Overdue (Jatuh Tempo) */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-red-600">Lewat Jatuh Tempo</span>
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-red-700">{formatRupiah(stats.overdueAmount)}</div>
            <div className="text-xs text-red-600 mt-1 font-medium">
              {stats.overdueCount > 0 ? `⚠️ ${stats.overdueCount} faktur perlu segera dilunasi!` : 'Semua pembayaran tepat waktu'}
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-red-50 rounded-full opacity-40 pointer-events-none" />
        </div>

        {/* Card 3: Jatuh Tempo 7 Hari Mendatang */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Jatuh Tempo Pekan Ini</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">{stats.dueThisWeekCount} Faktur</div>
            <div className="text-xs text-slate-500 mt-1">
              Siapkan likuiditas kas & bank
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-50 rounded-full opacity-40 pointer-events-none" />
        </div>

        {/* Card 4: Total Sudah Dilunasi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Realisasi Pembayaran</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">{formatRupiah(stats.totalPaidDebt)}</div>
            <div className="text-xs text-slate-500 mt-1">
              Tercatat pada arus kas keluar
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-emerald-50 rounded-full opacity-40 pointer-events-none" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor hutang, nama kreditur, nomor invoice, deskripsi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Semua Kategori</option>
              <option value="supplier_po">PO Pemasok / Pakan</option>
              <option value="vendor_operasional">Vendor Operasional</option>
              <option value="bank_loan">Pinjaman Bank</option>
              <option value="tax_payable">Kewajiban Pajak</option>
              <option value="salary_payable">Kewajiban Gaji</option>
              <option value="facility_lease">Sewa Lahan</option>
              <option value="other">Kewajiban Lainnya</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <option value="all">Semua Status</option>
              <option value="overdue">⚠️ Jatuh Tempo (Overdue)</option>
              <option value="unpaid">Belum Dibayar</option>
              <option value="partial">Dicicil Sebagian</option>
              <option value="paid">Lunas</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-500" />
          Ekspor CSV
        </button>
      </div>

      {/* Table of Debts */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">No. Hutang / Ref</th>
                <th className="py-3.5 px-4">Kreditur / Pemasok</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Jatuh Tempo</th>
                <th className="py-3.5 px-4 text-right">Total Pokok</th>
                <th className="py-3.5 px-4 text-right">Sudah Dibayar</th>
                <th className="py-3.5 px-4 text-right">Sisa Hutang</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                    <p className="font-medium text-slate-600">Tidak ada pencatatan hutang yang sesuai filter</p>
                    <p className="text-xs text-slate-400 mt-1">Gunakan tombol "Catat Hutang Baru" atau "Tarik dari PO" untuk menambahkan data.</p>
                  </td>
                </tr>
              ) : (
                filteredDebts.map(debt => {
                  const overdue = isOverdue(debt);
                  const statusInfo = overdue 
                    ? STATUS_CONFIG.overdue 
                    : (STATUS_CONFIG[debt.status] || STATUS_CONFIG.unpaid);
                  const StatusIcon = statusInfo.icon;
                  const catInfo = CATEGORY_LABELS[debt.category] || CATEGORY_LABELS.other;

                  return (
                    <tr 
                      key={debt.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${overdue ? 'bg-red-50/30' : ''}`}
                    >
                      {/* No Hutang & Ref */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          {debt.debtNumber}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          {debt.relatedPoNumber && (
                            <span className="inline-block px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded-sm font-mono text-[10px]">
                              {debt.relatedPoNumber}
                            </span>
                          )}
                          {debt.invoiceNumber && (
                            <span className="text-slate-400">Inv: {debt.invoiceNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* Kreditur */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{debt.creditorName}</div>
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{debt.description}</div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${catInfo.badgeClass}`}>
                          {catInfo.label}
                        </span>
                      </td>

                      {/* Tanggal Jatuh Tempo */}
                      <td className="py-3.5 px-4">
                        <div className={`text-xs font-medium flex items-center gap-1.5 ${overdue ? 'text-red-700 font-bold' : 'text-slate-700'}`}>
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(debt.dueDate)}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {debt.paymentTerms || 'Tempo Regular'}
                        </div>
                      </td>

                      {/* Total Pokok */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-800">
                        {formatRupiah(debt.totalAmount)}
                      </td>

                      {/* Sudah Dibayar */}
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-medium">
                        {formatRupiah(debt.paidAmount)}
                        {debt.payments && debt.payments.length > 0 && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {debt.payments.length}x bayar
                          </div>
                        )}
                      </td>

                      {/* Sisa Hutang */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {debt.remainingAmount > 0 ? (
                          <span className={overdue ? 'text-red-700' : 'text-slate-900'}>
                            {formatRupiah(debt.remainingAmount)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold">LUNAS</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.text}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {debt.remainingAmount > 0 && debt.status !== 'cancelled' && (
                            <button
                              onClick={() => handleOpenPayModal(debt)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              title="Bayar / Cicil Hutang"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Bayar
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedDebtDetail(debt)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Rincian & Riwayat Pembayaran"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {debt.paidAmount === 0 && (
                            <button
                              onClick={() => {
                                if (confirm(`Yakin ingin menghapus data hutang ${debt.debtNumber}?`)) {
                                  deleteDebt(debt.id);
                                }
                              }}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Hutang"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Catat Pembayaran / Cicilan Hutang */}
      {showPayModal && targetDebtForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Pembayaran Hutang Usaha</h3>
                  <p className="text-xs text-slate-500">{targetDebtForPayment.debtNumber} - {targetDebtForPayment.creditorName}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPayModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="mt-4 space-y-4">
              {/* Info Sisa Hutang */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-500">Sisa Pokok Hutang:</div>
                  <div className="text-lg font-bold text-rose-600">{formatRupiah(targetDebtForPayment.remainingAmount)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayAmount(targetDebtForPayment.remainingAmount)}
                  className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  Lunasi Penuh (100%)
                </button>
              </div>

              {/* Nominal Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={targetDebtForPayment.remainingAmount}
                  required
                  value={payAmount || ''}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  placeholder="0"
                />
              </div>

              {/* Rekening Sumber Dana */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Dana Kas / Bank <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={payBankId}
                  onChange={e => setPayBankId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Pilih Rekening / Kas --</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} (Saldo: {formatRupiah(b.balance)})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Saldo rekening akan otomatis berkurang dan tercatat di arus kas keluar.
                </p>
              </div>

              {/* Tanggal & Metode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Bayar <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Metode Pembayaran
                  </label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="transfer">Transfer Bank</option>
                    <option value="cash">Tunai / Kas</option>
                    <option value="giro">Giro / Bilyet</option>
                  </select>
                </div>
              </div>

              {/* No Ref & No Bukti */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No Referensi Transfer
                  </label>
                  <input
                    type="text"
                    value={payRefNo}
                    onChange={e => setPayRefNo(e.target.value)}
                    placeholder="Contoh: TRF-091823"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No Kwitansi Vendor
                  </label>
                  <input
                    type="text"
                    value={payReceiptNo}
                    onChange={e => setPayReceiptNo(e.target.value)}
                    placeholder="Contoh: KWT-AGRO-01"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Pembayaran
                </label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Keterangan tambahan untuk bagian akuntansi..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmittingPayment ? 'Memproses...' : 'Konfirmasi & Catat Pengeluaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Tambah Pencatatan Hutang Manual */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Catat Hutang / Kewajiban Baru</h3>
                  <p className="text-xs text-slate-500">Mendaftarkan kewajiban pembayaran tempo kepada mitra atau vendor</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              {/* Nama Kreditur & Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Pemasok / Kreditur <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creditorName}
                    onChange={e => setFormData({ ...formData, creditorName: e.target.value })}
                    placeholder="Contoh: CV Agro Nutrisi / PT PLN"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori Kewajiban <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as DebtCategory })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="supplier_po">PO Pemasok / Pakan Ternak</option>
                    <option value="vendor_operasional">Vendor Operasional / Servis</option>
                    <option value="bank_loan">Pinjaman Bank / Modal Kerja</option>
                    <option value="tax_payable">Kewajiban Pajak Badan/PPh</option>
                    <option value="salary_payable">Kewajiban Gaji & Bonus</option>
                    <option value="facility_lease">Sewa Lahan / Wahana</option>
                    <option value="other">Kewajiban Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Kontak & Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama PIC / Kontak Vendor
                  </label>
                  <input
                    type="text"
                    value={formData.creditorContact}
                    onChange={e => setFormData({ ...formData, creditorContact: e.target.value })}
                    placeholder="Bpk. Hendra Gunawan"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.creditorPhone}
                    onChange={e => setFormData({ ...formData, creditorPhone: e.target.value })}
                    placeholder="0812-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Deskripsi Barang/Jasa */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi Pengadaan / Pekerjaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Pengadaan konsentrat sapi 50 karung / Perbaikan wahana kolam lumpur..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* No Invoice & Total Nilai Pokok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. Invoice / Faktur Fisik
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="INV/2026/02-881"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Pokok Hutang (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalAmount || ''}
                    onChange={e => setFormData({ ...formData, totalAmount: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Tanggal Terbit & Jatuh Tempo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Timbul Hutang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={e => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Terms & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Termin Pembayaran
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                    placeholder="NET 30 / NET 14 / CBD"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catatan Internal
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Instruksi khusus finance..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Simpan Hutang Usaha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tarik dari Purchase Order (Pengadaan) */}
      {showImportPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Tarik dari Purchase Order (PO Pengadaan)</h3>
                  <p className="text-xs text-slate-500">Pilih PO yang sudah disetujui untuk dicatat otomatis ke buku hutang usaha</p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportPOModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {eligiblePOs.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
                  <p className="font-semibold text-slate-700">Semua Purchase Order Sudah Tercatat</p>
                  <p className="text-xs text-slate-500 mt-1">Tidak ada PO yang belum terdaftar di buku hutang.</p>
                </div>
              ) : (
                eligiblePOs.map(po => (
                  <div key={po.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-2">
                        <span>{po.poNumber}</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                          {po.vendorName}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Item: {po.items?.map(i => `${i.inventoryItemName} (${i.quantity}x)`).join(', ') || 'Pembelian Barang'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Tgl PO: {formatDate(po.orderDate)} • Status PO: {po.status}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">{formatRupiah(po.totalAmount)}</div>
                      <button
                        onClick={() => handleImportPO(po)}
                        className="mt-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Catat ke Hutang
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setShowImportPOModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL 4: Rincian Hutang & Riwayat Pembayaran */}
      {selectedDebtDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Rincian & Riwayat Pembayaran</h3>
                  <p className="text-xs text-slate-500">{selectedDebtDetail.debtNumber}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedDebtDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Ringkasan */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Pihak Kreditur / Pemasok:</span>
                  <span className="font-bold text-slate-800">{selectedDebtDetail.creditorName}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-medium text-slate-700">{CATEGORY_LABELS[selectedDebtDetail.category]?.label || selectedDebtDetail.category}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Deskripsi:</span>
                  <span className="font-medium text-slate-700 text-right max-w-xs">{selectedDebtDetail.description}</span>
                </div>
                {selectedDebtDetail.relatedPoNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Terkait Purchase Order:</span>
                    <span className="font-mono text-blue-600 font-bold">{selectedDebtDetail.relatedPoNumber}</span>
                  </div>
                )}
                {selectedDebtDetail.invoiceNumber && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">No. Invoice Fisik:</span>
                    <span className="font-mono text-slate-700">{selectedDebtDetail.invoiceNumber}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-500">Status Pembayaran:</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-800">
                    {selectedDebtDetail.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Progress Pembayaran */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Realisasi Cicilan:</span>
                  <span className="font-bold text-slate-800">
                    {Math.round((selectedDebtDetail.paidAmount / selectedDebtDetail.totalAmount) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 transition-all duration-300" 
                    style={{ width: `${Math.min(100, (selectedDebtDetail.paidAmount / selectedDebtDetail.totalAmount) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs mt-2">
                  <div>
                    <span className="text-slate-400">Total Pokok: </span>
                    <span className="font-semibold text-slate-700">{formatRupiah(selectedDebtDetail.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sisa: </span>
                    <span className="font-bold text-rose-600">{formatRupiah(selectedDebtDetail.remainingAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Riwayat Pembayaran */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Riwayat Cicilan ({selectedDebtDetail.payments?.length || 0})
                </h4>
                {(!selectedDebtDetail.payments || selectedDebtDetail.payments.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    Belum ada catatan pembayaran untuk tagihan ini.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDebtDetail.payments.map((p, idx) => (
                      <div key={p.id || idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-2">
                            <span>{formatRupiah(p.amount)}</span>
                            <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded-sm font-medium text-[10px]">
                              {p.paymentMethod.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Sumber: {p.sourceAccountName} • Tgl: {formatDate(p.paymentDate)}
                          </div>
                          {p.referenceNo && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Ref: {p.referenceNo}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          <div>Oleh: {p.paidBy}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
              {selectedDebtDetail.remainingAmount > 0 ? (
                <button
                  onClick={() => {
                    const d = selectedDebtDetail;
                    setSelectedDebtDetail(null);
                    handleOpenPayModal(d);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  Bayar Sekarang
                </button>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Tagihan telah lunas sepenuhnya
                </span>
              )}

              <button
                onClick={() => setSelectedDebtDetail(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
