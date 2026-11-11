import React, { useState, useMemo, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate, 
  simulateDecrypt, 
  maskSensitive,
  ROLE_LABELS 
} from '../../utils/crypto';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Plus, 
  Filter, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Clock, 
  PieChart, 
  TrendingUp, 
  Building, 
  Building2,
  Receipt,
  X,
  FileSpreadsheet,
  School,
  ShoppingBag,
  Ticket,
  Utensils,
  Sprout,
  Users,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  Edit2,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Calendar,
  Copy,
  RefreshCw,
  Check,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  CalendarDays,
  RotateCcw,
  Maximize2,
  Minimize2,
  Target,
  AlertTriangle,
  AlertCircle,
  Download,
  CalendarClock
} from 'lucide-react';
import { exportToCSV } from '../../utils/exportHelper';
import { findTargetBankAccount } from '../../utils/bankMatcher';
import {
  getRelevantCOAAccountsForActivity,
  suggestContraAccountForTransaction,
  getCOACashFlowCategory
} from '../../utils/dataRecoveryHelper';
import { IncomeSourceCategory, PaymentStageType, BudgetAllocation, CashTransaction, Role } from '../../types';
import KwitansiGeneratorModal from './KwitansiGeneratorModal';
import InvoiceGeneratorModal from './InvoiceGeneratorModal';
import { BudgetAllocationManager } from './BudgetAllocationManager';
import TicketCashierPOS from './TicketCashierPOS';
import RecurringBillsPanel from './RecurringBillsPanel';
import AccountsPayablePanel from './AccountsPayablePanel';
import PettyCashManager from './PettyCashManager';
import FilterDrawer from '../common/FilterDrawer';
import { DataImportSyncModal } from './DataImportSyncModal';

interface RevenueSourceStat {
  total: number;
  count: number;
  label: string;
  icon: any;
  color: string;
}

export default function FinanceModule() {
  const { 
    bankAccounts, 
    cashTransactions, 
    budgetAllocations, 
    chartOfAccounts,
    leads,
    salesOrders,
    salesInvoices,
    paymentProofs,
    debts,
    addCashTransaction, 
    updateCashTransaction,
    deleteCashTransaction,
    addBudgetAllocation,
    updateBudgetAllocation,
    deleteBudgetAllocation,
    recalculateBankBalances,
    restoreSystemData,
    clearAllOutflowTransactions,
    sheetSyncConfigs,
    runGoogleSheetSync,
    currentUser,
    checkPermission,
    setActiveModule,
    showNotification
  } = useERP();

  const isDirekturUtama = currentUser.role === 'direktur_utama';
  const isSuperAdmin = currentUser.role === 'super_admin';
  const allowedKwitansiRoles: Role[] = ['finance_manager', 'accounting_manager', 'direktur_utama', 'super_admin'];
  const canAccessKwitansi = allowedKwitansiRoles.includes(currentUser.role);
  const canManageTransactions = isSuperAdmin || isDirekturUtama;
  const canEditTransactions = canManageTransactions || canAccessKwitansi;

  const pendingProofsCount = (paymentProofs || []).filter(p => p.status === 'pending_verification').length;
  const activeDebtsCount = (debts || []).filter(d => d.status !== 'paid' && d.status !== 'cancelled').length;

  const [activeTab, setActiveTab] = useState<'cashflow' | 'pos' | 'revenue_breakdown' | 'budget' | 'school_receivables' | 'recurring_bills' | 'debts' | 'payment_verification' | 'petty_cash'>('cashflow');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow' | 'mutation'>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterActivityCategory, setFilterActivityCategory] = useState<'all' | 'operating' | 'investing' | 'financing'>('all');
  const [filterCoaCode, setFilterCoaCode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportSyncModal, setShowImportSyncModal] = useState(false);
  const [showClearOutflowsModal, setShowClearOutflowsModal] = useState(false);
  const [isClearingOutflows, setIsClearingOutflows] = useState(false);
  const [syncingSheetId, setSyncingSheetId] = useState<string | null>(null);
  const [selectedInvoiceLead, setSelectedInvoiceLead] = useState<any>(null);

  // Date Filter & Sort & Scroll View States
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateFilterField, setDateFilterField] = useState<'receivedDate' | 'date'>('receivedDate');
  const [sortBy, setSortBy] = useState<'receivedDate' | 'date' | 'amount' | 'referenceNo' | 'description'>('receivedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Transaction Edit & Delete States (Akses Khusus Super Admin & Direktur Utama)
  const [editingTx, setEditingTx] = useState<CashTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<CashTransaction | null>(null);
  const [kwitansiTx, setKwitansiTx] = useState<CashTransaction | null>(null);
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxReceivedDate, setEditTxReceivedDate] = useState('');
  const [editTxReference, setEditTxReference] = useState('');
  const [editTxType, setEditTxType] = useState<'inflow' | 'outflow' | 'mutation'>('inflow');
  const [editTxCategory, setEditTxCategory] = useState<'operating' | 'investing' | 'financing'>('operating');
  const [editTxIncomeSource, setEditTxIncomeSource] = useState<IncomeSourceCategory>('school_visit');
  const [editTxPaymentStage, setEditTxPaymentStage] = useState<PaymentStageType>('dp');
  const [editTxDescription, setEditTxDescription] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxSourceAccount, setEditTxSourceAccount] = useState('');
  const [editTxTargetAccount, setEditTxTargetAccount] = useState('');
  const [editTxStatus, setEditTxStatus] = useState<'completed' | 'pending' | 'reconciled'>('completed');
  const [editTxLinkedEntityName, setEditTxLinkedEntityName] = useState('');
  const [editTxBudgetId, setEditTxBudgetId] = useState('');
  const [editTxBudgetName, setEditTxBudgetName] = useState('');
  const [editTxContraCoaCode, setEditTxContraCoaCode] = useState('4110');
  const [showAllCoaInEditModal, setShowAllCoaInEditModal] = useState(false);

  // Tab 5: Tagihan & Piutang Wisata Filter, Search & Sort States
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [schoolPaymentStatusFilter, setSchoolPaymentStatusFilter] = useState<'all' | 'unpaid' | 'dp' | 'paid'>('all');
  const [schoolStageFilter, setSchoolStageFilter] = useState<string>('all');
  const [schoolSortBy, setSchoolSortBy] = useState<'dealValue' | 'remaining' | 'paid' | 'company' | 'students'>('dealValue');
  const [schoolSortDirection, setSchoolSortDirection] = useState<'asc' | 'desc'>('desc');



  // Budget Modal State
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetAllocation | null>(null);

  // Budget Form State (Tambah)
  const [bgDepartment, setBgDepartment] = useState('');
  const [bgCategory, setBgCategory] = useState('');
  const [bgAllocated, setBgAllocated] = useState('');
  const [bgQuarter, setBgQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [bgFiscalYear, setBgFiscalYear] = useState<number>(2026);

  // Budget Form State (Edit)
  const [editBgDept, setEditBgDept] = useState('');
  const [editBgCat, setEditBgCat] = useState('');
  const [editBgAllocated, setEditBgAllocated] = useState('');
  const [editBgSpent, setEditBgSpent] = useState('');
  const [editBgQuarter, setEditBgQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q3');
  const [editBgFiscalYear, setEditBgFiscalYear] = useState<number>(2026);

  // Form State (Transaksi Arus Kas)
  const [txDate, setTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txReceivedDate, setTxReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txType, setTxType] = useState<'inflow' | 'outflow' | 'mutation'>('inflow');
  const [txCategory, setTxCategory] = useState<'operating' | 'investing' | 'financing'>('operating');
  const [txIncomeSource, setTxIncomeSource] = useState<IncomeSourceCategory>('school_visit');
  const [txPaymentStage, setTxPaymentStage] = useState<PaymentStageType>('dp');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [customEntityName, setCustomEntityName] = useState<string>('');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txSourceAccount, setTxSourceAccount] = useState<string>(
    bankAccounts[0]?.bankName || "Bank Syariah Indonesia (BSI) Sawangan - Tabungan Edukasi & CSR"
  );
  const [txTargetAccount, setTxTargetAccount] = useState<string>(
    bankAccounts[1]?.bankName || bankAccounts[0]?.bankName || ''
  );
  const [txReference, setTxReference] = useState('');
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [selectedBudgetName, setSelectedBudgetName] = useState<string>('');
  const [txContraCoaCode, setTxContraCoaCode] = useState<string>('4110');
  const [showAllCoaInAddModal, setShowAllCoaInAddModal] = useState<boolean>(false);

  // Auto-suggest COA contra account in Add Transaction Modal when activity category, type, source, budget, or description changes
  const suggestedAddCoa = useMemo(() => {
    return suggestContraAccountForTransaction(
      {
        type: txType,
        category: txCategory,
        incomeSource: txType === 'inflow' ? txIncomeSource : undefined,
        budgetName: txType === 'outflow' ? selectedBudgetName : undefined,
        description: txDescription
      },
      chartOfAccounts
    );
  }, [txType, txCategory, txIncomeSource, selectedBudgetName, txDescription, chartOfAccounts]);

  useEffect(() => {
    if (suggestedAddCoa?.code) {
      setTxContraCoaCode(suggestedAddCoa.code);
    }
  }, [suggestedAddCoa.code]);

  const availableCoaForAdd = useMemo(() => {
    if (showAllCoaInAddModal) {
      return chartOfAccounts.filter(a => a.code !== '1110');
    }
    const filtered = getRelevantCOAAccountsForActivity(chartOfAccounts, txType, txCategory);
    if (txContraCoaCode && !filtered.some(a => a.code === txContraCoaCode)) {
      const currentSelected = chartOfAccounts.find(a => a.code === txContraCoaCode);
      if (currentSelected) return [currentSelected, ...filtered];
    }
    return filtered;
  }, [chartOfAccounts, txType, txCategory, showAllCoaInAddModal, txContraCoaCode]);

  const suggestedEditCoa = useMemo(() => {
    return suggestContraAccountForTransaction(
      {
        type: editTxType,
        category: editTxCategory,
        incomeSource: editTxType === 'inflow' ? editTxIncomeSource : undefined,
        budgetName: editTxType === 'outflow' ? editTxBudgetName : undefined,
        description: editTxDescription
      },
      chartOfAccounts
    );
  }, [editTxType, editTxCategory, editTxIncomeSource, editTxBudgetName, editTxDescription, chartOfAccounts]);

  const availableCoaForEdit = useMemo(() => {
    if (showAllCoaInEditModal) {
      return chartOfAccounts.filter(a => a.code !== '1110');
    }
    const filtered = getRelevantCOAAccountsForActivity(chartOfAccounts, editTxType, editTxCategory);
    if (editTxContraCoaCode && !filtered.some(a => a.code === editTxContraCoaCode)) {
      const currentSelected = chartOfAccounts.find(a => a.code === editTxContraCoaCode);
      if (currentSelected) return [currentSelected, ...filtered];
    }
    return filtered;
  }, [chartOfAccounts, editTxType, editTxCategory, showAllCoaInEditModal, editTxContraCoaCode]);

  // Sync default bank account if bankAccounts is loaded/updated
  useEffect(() => {
    if (!txSourceAccount && bankAccounts.length > 0) {
      setTxSourceAccount(bankAccounts[0].bankName);
    }
    if (!txTargetAccount && bankAccounts.length > 1) {
      setTxTargetAccount(bankAccounts[1].bankName);
    } else if (!txTargetAccount && bankAccounts.length === 1) {
      setTxTargetAccount(bankAccounts[0].bankName);
    }
  }, [bankAccounts, txSourceAccount, txTargetAccount]);

  const totalCash = bankAccounts.reduce((acc, b) => acc + b.balance, 0);
  const totalInflows = cashTransactions.filter(t => t.type === 'inflow').reduce((acc, t) => acc + t.amount, 0);
  const outflowTransactions = cashTransactions.filter(t => t.type === 'outflow');
  const outflowCount = outflowTransactions.length;
  const totalOutflows = outflowTransactions.reduce((acc, t) => acc + t.amount, 0);
  const netCashFlow = totalInflows - totalOutflows;

  // Breakdown per sumber pendapatan
  const revenueBySource: Record<string, RevenueSourceStat> = useMemo(() => {
    const inflows = cashTransactions.filter(t => t.type === 'inflow');
    const result: Record<string, RevenueSourceStat> = {
      school_visit: { total: 0, count: 0, label: 'Kunjungan Sekolah & Rombongan (Field Trip)', icon: School, color: 'text-emerald-900 border-emerald-200 bg-emerald-50/70' },
      dairy_product: { total: 0, count: 0, label: 'Penjualan Produk Olahan (Susu & Yogurt)', icon: ShoppingBag, color: 'text-blue-900 border-blue-200 bg-blue-50/70' },
      ticket_gate: { total: 0, count: 0, label: 'Tiket Masuk Loket Gate & Wahana Wisata', icon: Ticket, color: 'text-amber-900 border-amber-200 bg-amber-50/70' },
      resto_fnb: { total: 0, count: 0, label: "Saung Resto & F&B D'Kandang Farm", icon: Utensils, color: 'text-rose-900 border-rose-200 bg-rose-50/70' },
      other: { total: 0, count: 0, label: 'Pendapatan Lain-lain & Kemitraan', icon: Layers, color: 'text-slate-800 border-slate-200 bg-slate-50/70' }
    };

    inflows.forEach(tx => {
      const src = tx.incomeSource || 'other';
      if (result[src]) {
        result[src].total += tx.amount;
        result[src].count += 1;
      } else {
        result.other.total += tx.amount;
        result.other.count += 1;
      }
    });

    return result;
  }, [cashTransactions]);

  // Date preset handler
  const handleDatePresetChange = (preset: 'all' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom') => {
    setDateFilterPreset(preset);
    const now = new Date();
    const toDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const str = toDateStr(now);
      setStartDate(str);
      setEndDate(str);
    } else if (preset === 'this_week') {
      const curr = new Date();
      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
      const firstDay = new Date(curr.setDate(first));
      const lastDay = new Date(curr.setDate(first + 6));
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (preset === 'this_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (preset === 'last_month') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);
      setStartDate(toDateStr(firstDay));
      setEndDate(toDateStr(lastDay));
    } else if (preset === 'this_year') {
      const year = now.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(`${year}-12-31`);
    }
  };

  // Sort toggle handler
  const handleSort = (field: 'receivedDate' | 'date' | 'amount' | 'referenceNo' | 'description') => {
    if (sortBy === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDirection(field === 'amount' || field === 'receivedDate' || field === 'date' ? 'desc' : 'asc');
    }
  };

  // Reset all filters
  const resetAllCashFilters = () => {
    setFilterType('all');
    setFilterSource('all');
    setFilterActivityCategory('all');
    setFilterCoaCode('all');
    setSearchQuery('');
    setDateFilterPreset('all');
    setStartDate('');
    setEndDate('');
    setDateFilterField('receivedDate');
    setSortBy('receivedDate');
    setSortDirection('desc');
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const list = cashTransactions.filter(t => {
      // Type filter
      if (filterType !== 'all' && t.type !== filterType) return false;

      // Activity Category filter (Operating / Investing / Financing)
      if (filterActivityCategory !== 'all' && (t.category || 'operating') !== filterActivityCategory) return false;

      // COA Contra Account filter
      if (filterCoaCode !== 'all') {
        const resolvedCoaCode = t.contraAccountCode || suggestContraAccountForTransaction(t, chartOfAccounts).code;
        if (resolvedCoaCode !== filterCoaCode) return false;
      }

      // Source filter
      if (filterSource !== 'all') {
        if (filterSource === 'other' && (!t.incomeSource || t.incomeSource === 'other' || t.incomeSource === 'agriculture' || t.incomeSource === 'b2b_corporate')) {
          // match other
        } else if (t.incomeSource !== filterSource) {
          return false;
        }
      }

      // Date filtering
      const txTargetDate = dateFilterField === 'receivedDate' ? (t.receivedDate || t.date) : t.date;
      if (startDate && txTargetDate < startDate) return false;
      if (endDate && txTargetDate > endDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchRef = t.referenceNo.toLowerCase().includes(q);
        const matchAcc = t.sourceAccount.toLowerCase().includes(q);
        const matchEntity = (t.linkedEntityName || '').toLowerCase().includes(q);
        const matchDate = (t.date || '').includes(q) || (t.receivedDate || '').includes(q);
        const matchCoa = (t.contraAccountCode || '').toLowerCase().includes(q) || (t.contraAccountName || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchAcc && !matchEntity && !matchDate && !matchCoa) return false;
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'receivedDate') {
        const dateA = a.receivedDate || a.date || '';
        const dateB = b.receivedDate || b.date || '';
        comparison = dateA.localeCompare(dateB);
      } else if (sortBy === 'date') {
        comparison = (a.date || '').localeCompare(b.date || '');
      } else if (sortBy === 'amount') {
        comparison = (a.amount || 0) - (b.amount || 0);
      } else if (sortBy === 'referenceNo') {
        comparison = (a.referenceNo || '').localeCompare(b.referenceNo || '');
      } else if (sortBy === 'description') {
        comparison = (a.description || '').localeCompare(b.description || '');
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [cashTransactions, filterType, filterActivityCategory, filterCoaCode, filterSource, searchQuery, dateFilterField, startDate, endDate, sortBy, sortDirection, chartOfAccounts]);

  // Summary Metrics of Filtered Transactions
  const filteredMetrics = useMemo(() => {
    let inflowTotal = 0;
    let outflowTotal = 0;
    let mutationTotal = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'inflow') inflowTotal += t.amount || 0;
      else if (t.type === 'outflow') outflowTotal += t.amount || 0;
      else if (t.type === 'mutation') mutationTotal += t.amount || 0;
    });
    return {
      inflowTotal,
      outflowTotal,
      mutationTotal,
      netTotal: inflowTotal - outflowTotal,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  const {
    currentData: paginatedTransactions,
    currentPage: cashflowCurrentPage,
    totalPages: cashflowTotalPages,
    totalItems: cashflowTotalItems,
    itemsPerPage: cashflowItemsPerPage,
    nextPage: cashflowNextPage,
    prevPage: cashflowPrevPage
  } = usePagination(filteredTransactions, 25);

  // Tab 5: Tagihan & Piutang Wisata Data & Calculation
  const leadFinancials = useMemo(() => {
    return leads.map(ld => {
      const inflows = cashTransactions.filter(t => 
        t.type === 'inflow' && (
          (t.linkedEntityId && t.linkedEntityId === ld.id) ||
          (t.linkedEntityName && (
            t.linkedEntityName.toLowerCase() === ld.company.toLowerCase() ||
            t.linkedEntityName.toLowerCase() === ld.name.toLowerCase()
          ))
        )
      );
      const totalPaid = inflows.reduce((sum, t) => sum + (t.amount || 0), 0);
      const effectivePaid = totalPaid > 0 ? totalPaid : (ld.dpAmount || 0);
      const remaining = Math.max(0, ld.dealValue - effectivePaid);
      const isPaid = ld.dealValue > 0 && effectivePaid >= ld.dealValue;
      const isDp = effectivePaid > 0 && !isPaid;
      const isUnpaid = effectivePaid === 0;
      const percentPaid = ld.dealValue > 0 ? Math.min(100, Math.round((effectivePaid / ld.dealValue) * 100)) : 0;
      return {
        lead: ld,
        inflows,
        totalPaid,
        effectivePaid,
        remaining,
        isPaid,
        isDp,
        isUnpaid,
        percentPaid
      };
    });
  }, [leads, cashTransactions]);

  const filteredLeadFinancials = useMemo(() => {
    return leadFinancials.filter(item => {
      if (schoolPaymentStatusFilter === 'unpaid' && !item.isUnpaid) return false;
      if (schoolPaymentStatusFilter === 'dp' && !item.isDp) return false;
      if (schoolPaymentStatusFilter === 'paid' && !item.isPaid) return false;

      if (schoolStageFilter !== 'all' && item.lead.stage !== schoolStageFilter) return false;

      if (schoolSearchQuery.trim()) {
        const q = schoolSearchQuery.toLowerCase();
        const matchCompany = item.lead.company?.toLowerCase().includes(q);
        const matchName = item.lead.name?.toLowerCase().includes(q);
        const matchPhone = item.lead.phone?.toLowerCase().includes(q);
        const matchPackage = item.lead.packageChosen?.toLowerCase().includes(q);
        const matchId = item.lead.id?.toLowerCase().includes(q);
        if (!matchCompany && !matchName && !matchPhone && !matchPackage && !matchId) return false;
      }

      return true;
    }).sort((a, b) => {
      let diff = 0;
      if (schoolSortBy === 'dealValue') diff = a.lead.dealValue - b.lead.dealValue;
      else if (schoolSortBy === 'remaining') diff = a.remaining - b.remaining;
      else if (schoolSortBy === 'paid') diff = a.effectivePaid - b.effectivePaid;
      else if (schoolSortBy === 'company') diff = a.lead.company.localeCompare(b.lead.company);
      else if (schoolSortBy === 'students') diff = (a.lead.participantCount || 0) - (b.lead.participantCount || 0);
      return schoolSortDirection === 'desc' ? -diff : diff;
    });
  }, [leadFinancials, schoolPaymentStatusFilter, schoolStageFilter, schoolSearchQuery, schoolSortBy, schoolSortDirection]);

  const {
    currentData: paginatedSchoolReceivables,
    currentPage: schoolCurrentPage,
    totalPages: schoolTotalPages,
    totalItems: schoolTotalItems,
    itemsPerPage: schoolItemsPerPage,
    nextPage: schoolNextPage,
    prevPage: schoolPrevPage
  } = usePagination(filteredLeadFinancials, 10);

  const handleExportSchoolReceivables = () => {
    try {
      const headers = [
        'ID Prospek',
        'Sekolah / Lembaga',
        'Nama PIC',
        'No Telepon',
        'Jumlah Peserta',
        'Paket Wisata',
        'Status CRM',
        'Nilai Deal (Rp)',
        'Kas Masuk Finance (Rp)',
        'Sisa Piutang (Rp)',
        'Status Pembayaran',
        'Persentase Pelunasan (%)'
      ];
      const rows = filteredLeadFinancials.map(item => [
        item.lead.id,
        item.lead.company,
        item.lead.name,
        item.lead.phone,
        item.lead.participantCount || 0,
        item.lead.packageChosen || '-',
        item.lead.stage,
        item.lead.dealValue,
        item.effectivePaid,
        item.remaining,
        item.isPaid ? 'Lunas' : item.isDp ? 'DP / Sebagian' : 'Belum Bayar',
        `${item.percentPaid}%`
      ]);
      exportToCSV(`tagihan_piutang_wisata_${new Date().toISOString().split('T')[0]}`, headers, rows);
      showNotification('Laporan Tagihan & Piutang Wisata berhasil diekspor!', 'success');
    } catch (e) {
      showNotification('Gagal mengekspor laporan tagihan & piutang wisata.', 'error');
    }
  };

  const handleExportCashTransactions = () => {
    const headers = [
      'No Referensi',
      'Tanggal Transaksi',
      'Tanggal Kas Masuk',
      'Keterangan Transaksi',
      'Entitas / Pelanggan',
      'Sumber Kas / Bank',
      'Tahap Pembayaran',
      'Tipe Transaksi',
      'Kategori Aktivitas (PSAK 2)',
      'Kode Akun COA Lawan',
      'Nama Akun COA Lawan',
      'Status',
      'Nominal (Rp)',
      'Kategori Pendapatan',
      'Dicatat Oleh'
    ];

    const rows = filteredTransactions.map(t => {
      const typeLabel = t.type === 'inflow' ? 'Kas Masuk' : t.type === 'outflow' ? 'Kas Keluar' : 'Mutasi';
      const stageLabel = t.paymentStage === 'dp' ? 'DP' : t.paymentStage === 'installment' ? 'Termin' : t.paymentStage === 'settlement' ? 'Pelunasan' : 'Penuh';
      const activityLabel = t.category === 'investing' ? 'Investasi' : t.category === 'financing' ? 'Pendanaan' : 'Operasional';
      const resolvedCoa = t.contraAccountCode
        ? { code: t.contraAccountCode, name: t.contraAccountName || chartOfAccounts.find(a => a.code === t.contraAccountCode)?.name || '-' }
        : suggestContraAccountForTransaction(t, chartOfAccounts);
      return [
        t.referenceNo,
        t.date,
        t.receivedDate || t.date,
        t.description,
        t.linkedEntityName || '-',
        t.sourceAccount,
        stageLabel,
        typeLabel,
        activityLabel,
        resolvedCoa.code,
        resolvedCoa.name,
        t.status,
        t.amount,
        t.incomeSource || '-',
        t.recordedBy || '-'
      ];
    });

    const filename = `Transaksi_Kas_Bank_DKandang_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Data transaksi kas & bank berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor data transaksi kas.', 'error');
    }
  };

  // Helper saat memilih sekolah di modal
  const handleSelectSchool = (leadId: string) => {
    setSelectedLeadId(leadId);
    const targetLead = leads.find(l => l.id === leadId);
    if (targetLead) {
      setCustomEntityName(targetLead.company);
      
      const existingInflows = (cashTransactions || [])
        .filter(t => t.type === 'inflow' && (
          (t.linkedEntityId && t.linkedEntityId === targetLead.id) ||
          (t.linkedEntityName && (
            t.linkedEntityName.toLowerCase() === targetLead.company.toLowerCase() ||
            t.linkedEntityName.toLowerCase() === targetLead.name.toLowerCase()
          ))
        ))
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const remainingBalance = Math.max(0, targetLead.dealValue - existingInflows);

      // Auto-suggest nominal & deskripsi
      let nominal = 0;
      let stageLabel = 'Uang Muka (DP)';
      
      if (txPaymentStage === 'dp') {
        nominal = existingInflows > 0 ? existingInflows : Math.round(targetLead.dealValue * 0.4);
        stageLabel = 'Uang Muka (DP)';
      } else if (txPaymentStage === 'settlement') {
        nominal = remainingBalance > 0 ? remainingBalance : targetLead.dealValue;
        stageLabel = 'Pelunasan Akhir';
      } else if (txPaymentStage === 'installment') {
        nominal = Math.round(targetLead.dealValue * 0.3);
        stageLabel = 'Cicilan Termin';
      } else {
        nominal = remainingBalance > 0 ? remainingBalance : targetLead.dealValue;
        stageLabel = 'Pembayaran Penuh 100%';
      }

      setTxAmount(nominal > 0 ? String(nominal) : String(targetLead.dealValue));
      setTxDescription(`Penerimaan ${stageLabel} Paket Field Trip (${targetLead.participantCount || 0} Siswa) - ${targetLead.company}`);
      setTxReference(`INV-${targetLead.company.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
    }
  };

  const handleSourceChange = (newSource: IncomeSourceCategory) => {
    setTxIncomeSource(newSource);
    if (newSource === 'dairy_product') {
      setTxDescription("Penjualan Susu Sapi Murni Pasteurisasi & Fresh Yogurt D'Kandang");
      setTxReference(`INV-MILK-${Date.now().toString().slice(-4)}`);
    } else if (newSource === 'ticket_gate') {
      setTxDescription("Penerimaan Tiket Masuk Gate Utama, Wahana Satwa & Naik Kuda Poni");
      setTxReference(`TKT-${Date.now().toString().slice(-6)}`);
    } else if (newSource === 'resto_fnb') {
      setTxDescription("Penerimaan Saung Resto Sunda & Minuman Olahan D'Kandang");
      setTxReference(`RESTO-${Date.now().toString().slice(-4)}`);
    } else if (newSource === 'school_visit' && selectedLeadId) {
      handleSelectSchool(selectedLeadId);
    }
  };

  const handleStageChange = (newStage: PaymentStageType) => {
    setTxPaymentStage(newStage);
    if (txIncomeSource === 'school_visit' && selectedLeadId) {
      const targetLead = leads.find(l => l.id === selectedLeadId);
      if (targetLead) {
        let nominal = 0;
        let stageLabel = 'Uang Muka (DP)';
        if (newStage === 'dp') {
          nominal = Math.round(targetLead.dealValue * 0.4);
          stageLabel = 'Uang Muka (DP)';
        } else if (newStage === 'settlement') {
          nominal = Math.max(0, targetLead.dealValue - (targetLead.dpAmount || 0));
          stageLabel = 'Pelunasan Akhir';
        } else if (newStage === 'installment') {
          nominal = Math.round(targetLead.dealValue * 0.3);
          stageLabel = 'Cicilan Termin';
        } else {
          nominal = targetLead.dealValue;
          stageLabel = 'Pembayaran Penuh 100%';
        }
        setTxAmount(nominal > 0 ? String(nominal) : String(targetLead.dealValue));
        setTxDescription(`Penerimaan ${stageLabel} Paket Field Trip (${targetLead.participantCount || 0} Siswa) - ${targetLead.company}`);
      }
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription || !txAmount || Number(txAmount) <= 0 || isSubmitting) return;

    if (txType === 'mutation') {
      if (!txTargetAccount || txTargetAccount === txSourceAccount) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const linkedLead = leads.find(l => l.id === selectedLeadId);
      const linkedName = linkedLead ? linkedLead.company : (customEntityName || undefined);
      const selectedBudget = budgetAllocations.find(b => b.id === selectedBudgetId);
      const selectedCoaObj = chartOfAccounts.find(a => a.code === txContraCoaCode) || suggestedAddCoa;

      const payload = {
        date: txDate || new Date().toISOString().split('T')[0],
        receivedDate: txReceivedDate || txDate || new Date().toISOString().split('T')[0],
        type: txType,
        category: txCategory,
        description: txDescription,
        amount: Number(txAmount),
        sourceAccount: txSourceAccount,
        targetAccount: txType === 'mutation' ? txTargetAccount : undefined,
        referenceNo: txReference || (txType === 'mutation' ? `MUT-${Date.now().toString().slice(-6)}` : `TRX-${Date.now().toString().slice(-6)}`),
        incomeSource: txType === 'inflow' ? txIncomeSource : undefined,
        paymentStage: txType === 'inflow' && txIncomeSource === 'school_visit' ? txPaymentStage : undefined,
        linkedEntityId: selectedLeadId || undefined,
        linkedEntityName: linkedName,
        budgetId: txType === 'outflow' ? (selectedBudgetId || undefined) : undefined,
        budgetName: txType === 'outflow' ? (selectedBudgetName || (selectedBudget ? `${selectedBudget.department} (${selectedBudget.category})` : undefined)) : undefined,
        contraAccountCode: txType === 'mutation' ? '1110' : selectedCoaObj.code,
        contraAccountName: txType === 'mutation' ? 'Kas & Setara Kas' : selectedCoaObj.name
      };

      await addCashTransaction(payload);

      setShowAddModal(false);
      const today = new Date().toISOString().split('T')[0];
      setTxDate(today);
      setTxReceivedDate(today);
      setTxDescription('');
      setTxAmount('');
      setTxReference('');
      setSelectedLeadId('');
      setCustomEntityName('');
      setSelectedBudgetId('');
      setSelectedBudgetName('');
      setShowAllCoaInAddModal(false);
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyimpan transaksi kas', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isSyncingBanks, setIsSyncingBanks] = useState(false);
  const handleSyncBanks = async () => {
    if (isSyncingBanks) return;
    setIsSyncingBanks(true);
    try {
      await restoreSystemData();
    } finally {
      setIsSyncingBanks(false);
    }
  };

  const handleOpenEditTx = (tx: CashTransaction) => {
    setEditingTx(tx);
    setEditTxDate(tx.date || new Date().toISOString().split('T')[0]);
    setEditTxReceivedDate(tx.receivedDate || tx.date || new Date().toISOString().split('T')[0]);
    setEditTxReference(tx.referenceNo || '');
    setEditTxType(tx.type);
    setEditTxCategory(tx.category);
    setEditTxIncomeSource(tx.incomeSource || 'other');
    setEditTxPaymentStage(tx.paymentStage || 'full');
    setEditTxDescription(tx.description || '');
    setEditTxAmount(String(tx.amount || 0));
    setEditTxBudgetId(tx.budgetId || '');
    setEditTxBudgetName(tx.budgetName || '');
    const resolvedEditCoa = tx.contraAccountCode
      ? tx.contraAccountCode
      : suggestContraAccountForTransaction(tx, chartOfAccounts).code;
    setEditTxContraCoaCode(resolvedEditCoa);
    setShowAllCoaInEditModal(false);
    
    // Resolve matching bank account using canonical bankMatcher
    const matched = findTargetBankAccount(bankAccounts, tx.sourceAccount);
    setEditTxSourceAccount(matched ? matched.bankName : (tx.sourceAccount || bankAccounts[0]?.bankName || ''));
    setEditTxTargetAccount(tx.targetAccount || (bankAccounts.find(b => b.bankName !== (matched?.bankName || tx.sourceAccount))?.bankName || ''));
    setEditTxStatus(tx.status);
    setEditTxLinkedEntityName(tx.linkedEntityName || '');
  };

  const handleUpdateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    const amt = Number(editTxAmount);
    if (isNaN(amt) || amt <= 0) return;

    if (editTxType === 'mutation' && (!editTxTargetAccount || editTxTargetAccount === editTxSourceAccount)) {
      return;
    }

    const targetId = editingTx.id;
    const matchedBudget = budgetAllocations.find(b => b.id === editTxBudgetId);
    const matchedEditCoa = chartOfAccounts.find(a => a.code === editTxContraCoaCode) || suggestedEditCoa;

    const updates = {
      date: editTxDate,
      receivedDate: editTxReceivedDate || editTxDate,
      referenceNo: editTxReference.trim() || editingTx.referenceNo,
      type: editTxType,
      category: editTxCategory,
      incomeSource: editTxType === 'inflow' ? editTxIncomeSource : undefined,
      paymentStage: editTxType === 'inflow' && editTxIncomeSource === 'school_visit' ? editTxPaymentStage : undefined,
      description: editTxDescription.trim() || editingTx.description,
      amount: amt,
      sourceAccount: editTxSourceAccount,
      targetAccount: editTxType === 'mutation' ? editTxTargetAccount : undefined,
      status: editTxStatus,
      linkedEntityName: editTxLinkedEntityName.trim() || undefined,
      budgetId: editTxType === 'outflow' ? (editTxBudgetId || undefined) : undefined,
      budgetName: editTxType === 'outflow' ? (editTxBudgetName || (matchedBudget ? `${matchedBudget.department} (${matchedBudget.category})` : undefined)) : undefined,
      contraAccountCode: editTxType === 'mutation' ? '1110' : matchedEditCoa.code,
      contraAccountName: editTxType === 'mutation' ? 'Kas & Setara Kas' : matchedEditCoa.name
    };

    // Close modal immediately
    setEditingTx(null);

    // Run update in background
    updateCashTransaction(targetId, updates);
  };

  const handleDeleteTx = () => {
    if (!deletingTx) return;
    const targetId = deletingTx.id;
    setDeletingTx(null);
    deleteCashTransaction(targetId);
  };

  const getSourceBadge = (tx: typeof cashTransactions[0]) => {
    if (tx.type === 'mutation') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3 text-blue-600" /> Mutasi Rekening
        </span>
      );
    }

    if (tx.type === 'outflow') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3 text-rose-600" /> Pengeluaran Kas
        </span>
      );
    }

    switch (tx.incomeSource) {
      case 'school_visit':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <School className="w-3 h-3 text-emerald-600" /> 
            <span>Kunjungan Sekolah</span>
            {tx.paymentStage === 'dp' && <strong className="text-amber-700 ml-0.5">(DP)</strong>}
            {tx.paymentStage === 'installment' && <strong className="text-blue-700 ml-0.5">(Termin)</strong>}
            {tx.paymentStage === 'settlement' && <strong className="text-emerald-700 ml-0.5">(Lunas)</strong>}
          </span>
        );
      case 'dairy_product':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-blue-600" /> Olahan Susu & Yogurt
          </span>
        );
      case 'ticket_gate':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Ticket className="w-3 h-3 text-amber-600" /> Tiket Loket Gate Wisata
          </span>
        );
      case 'resto_fnb':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <Utensils className="w-3 h-3 text-rose-600" /> Saung Resto F&B
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" /> Kas Masuk Operasional
          </span>
        );
    }
  };

  const canCreate = checkPermission('finance', 'create');



  const hasFinanceAccess = checkPermission('finance', 'view') && 
    ['finance_manager', 'accounting_manager', 'direktur_utama', 'super_admin', 'internal_auditor'].includes(currentUser.role);

  if (!hasFinanceAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-rose-200 rounded-3xl space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Akses Ditolak: Modul Keuangan Terkunci</h2>
          <p className="text-xs text-rose-600 font-semibold">
            Role-Based Access Control (RBAC) Strict Enforcement
          </p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md">
          Peran Anda saat ini (<strong className="text-slate-900 font-bold">{ROLE_LABELS[currentUser.role] || currentUser.role}</strong>) tidak memiliki hak akses untuk melihat ataupun mengelola saldo rekening bank, arus kas, dan anggaran pada <strong className="text-slate-800">Modul Keuangan & Kasir</strong>.
        </p>
        <div className="pt-2">
          <button
            onClick={() => setActiveModule('dashboard')}
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Kembali ke Menu Utama (Dashboard)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <Wallet className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Manajemen Kas, Bank & Arus Kas Masuk</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan uang masuk berdasarkan sumber pendapatan (kunjungan sekolah bertahap, produk susu, tiket wisata), likuiditas bank, dan anggaran.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowImportSyncModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Hybrid Bulk Data Importer (Excel/CSV) & Google Sheets Live Sync (URL/OAuth/Webhook Apps Script)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Import Excel / Google Sheets Sync</span>
            {sheetSyncConfigs && sheetSyncConfigs.filter(c => c.autoSyncEnabled).length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-700 text-white rounded-full font-mono tabular-nums">
                {sheetSyncConfigs.filter(c => c.autoSyncEnabled).length} Live
              </span>
            )}
          </button>

          <button
            onClick={handleSyncBanks}
            disabled={isSyncingBanks}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Pulihkan & sinkronkan ulang seluruh data transaksi, rekening bank, anggaran, jurnal umum, dan saldo COA ke Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBanks ? 'animate-spin text-emerald-600' : 'text-slate-500'}`} />
            <span>{isSyncingBanks ? 'Memulihkan & Menyinkronkan...' : 'Pulihkan & Sinkronkan Data'}</span>
          </button>

          {canEditTransactions && (
            <button
              onClick={() => setShowClearOutflowsModal(true)}
              disabled={isClearingOutflows}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Hapus seluruh transaksi pengeluaran (kas keluar), jurnal beban terkait, reset realisasi anggaran, dan rekalkulasi saldo rekening bank dari sisa pemasukan"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Hapus Semua Pengeluaran</span>
              {outflowCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-rose-600 text-white rounded-full font-mono tabular-nums">
                  {outflowCount}
                </span>
              )}
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => {
                setTxType('inflow');
                setTxIncomeSource('school_visit');
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Catat Uang Masuk / Arus Kas Baru
            </button>
          )}
        </div>
      </div>

      {/* Active Google Sheets Live Auto-Sync Bar */}
      {sheetSyncConfigs && sheetSyncConfigs.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  Google Sheets Auto-Update Terhubung ({sheetSyncConfigs.length} Spreadsheet)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                  Rekonsiliasi Otomatis Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {sheetSyncConfigs.map(c => `${c.name}${c.lastSyncedAt ? ` (Sync: ${new Date(c.lastSyncedAt).toLocaleTimeString('id-ID')})` : ''}`).join(' • ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {sheetSyncConfigs.slice(0, 2).map(cfg => (
              <button
                key={cfg.id}
                onClick={async () => {
                  setSyncingSheetId(cfg.id);
                  try {
                    await runGoogleSheetSync(cfg.id, { silent: false });
                  } finally {
                    setSyncingSheetId(null);
                  }
                }}
                disabled={syncingSheetId === cfg.id}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingSheetId === cfg.id ? 'animate-spin' : ''}`} />
                <span>Sync {cfg.name}</span>
              </button>
            ))}
            <button
              onClick={() => setShowImportSyncModal(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kelola Koneksi
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Saldo Kas & Bank Fisik */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Saldo Kas & Bank</span>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{formatRupiah(totalCash)}</div>
          </div>
          <div className="text-[10px] text-emerald-700 flex items-center gap-1 mt-3 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> Saldo Real-Time
          </div>
        </div>

        {/* Card 2: Total Pendapatan / Omset Usaha */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Kas Masuk (Inflow)</span>
            <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">+{formatRupiah(totalInflows)}</div>
          </div>
          <div className="text-[10px] text-slate-500 mt-3">
            Dari {cashTransactions.filter(t => t.type === 'inflow').length} transaksi kas masuk
          </div>
        </div>

        {/* Card 3: Realisasi Beban Kas Keluar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Total Kas Keluar (Outflow)</span>
            <div className="text-xl font-bold text-rose-700 mt-1 font-mono">-{formatRupiah(totalOutflows)}</div>
          </div>
          <div className="text-[10px] text-slate-500 mt-3">
            Realisasi operasional & belanja
          </div>
        </div>

        {/* Card 4: Arus Kas Bersih (Net Cash Flow) */}
        {(() => {
          const netCashFlow = totalInflows - totalOutflows;
          const isPositive = netCashFlow >= 0;
          return (
            <div className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between ${
              isPositive ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Arus Kas Bersih (Net)</span>
                <div className={`text-xl font-extrabold mt-1 font-mono ${isPositive ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {isPositive ? '+' : ''}{formatRupiah(netCashFlow)}</div>
              </div>
              <div className={`text-[10px] font-bold mt-3 ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                {isPositive ? '● Arus Kas Surplus' : '▲ Defisit Kas'}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1.5 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('cashflow')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'cashflow' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" /> Mutasi Arus Kas Real-time
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'pos' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-3.5 h-3.5" /> Kasir POS Tiket & Wahana
        </button>
        <button
          onClick={() => setActiveTab('revenue_breakdown')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'revenue_breakdown' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" /> Rekap Sumber Pendapatan
        </button>
        <button
          onClick={() => setActiveTab('budget')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'budget' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Alokasi & Realisasi Anggaran
        </button>
        <button
          onClick={() => setActiveTab('school_receivables')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'school_receivables' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-3.5 h-3.5" /> Tagihan & Piutang Wisata
        </button>
        <button
          onClick={() => setActiveTab('recurring_bills')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'recurring_bills' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5" /> Tagihan Bulanan
        </button>
        <button
          onClick={() => setActiveTab('debts')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'debts' ? 'border-rose-600 text-rose-800 bg-rose-50/50 rounded-t-xl font-semibold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-rose-600" /> Pencatatan Hutang
          {activeDebtsCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white">
              {activeDebtsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('petty_cash')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'petty_cash' ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-xl' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" /> Kas Kecil & Reimbursement
        </button>
      </div>

      {/* Tab 1: Mutasi Arus Kas */}
      {activeTab === 'cashflow' && (
        <div className="space-y-4">
          
          {/* Filter & Control Bar - Progressive Disclosure */}
          {(() => {
            const activeFiltersCount = 
              (filterType !== 'all' ? 1 : 0) + 
              (filterActivityCategory !== 'all' ? 1 : 0) +
              (filterCoaCode !== 'all' ? 1 : 0) +
              (filterSource !== 'all' ? 1 : 0) + 
              (dateFilterPreset !== 'all' ? 1 : 0) + 
              (sortBy !== 'receivedDate' || sortDirection !== 'desc' ? 1 : 0);

            return (
              <>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                  {/* Quick Search */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari transaksi cepat (no. referensi, deskripsi, akun COA)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-md"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Actions & Filter Drawer Trigger */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsFilterDrawerOpen(true)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all cursor-pointer ${
                        activeFiltersCount > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Filter Parameter</span>
                      {activeFiltersCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {activeFiltersCount}
                        </span>
                      )}
                    </button>

                    {/* Reset Button */}
                    {(activeFiltersCount > 0 || searchQuery !== '') && (
                      <button
                        onClick={resetAllCashFilters}
                        className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Reset Semua Filter"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Filter Drawer */}
                <FilterDrawer
                  isOpen={isFilterDrawerOpen}
                  onClose={() => setIsFilterDrawerOpen(false)}
                  title="Filter Mutasi Arus Kas"
                  subtitle="Atur kriteria tanggal, kategori aktivitas PSAK 2, akun COA & pengurutan"
                  activeCount={activeFiltersCount}
                  onReset={resetAllCashFilters}
                >
                  <div className="space-y-5">
                    {/* 1. Periode Tanggal */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Rentang & Periode Waktu</label>
                      <select
                        value={dateFilterPreset}
                        onChange={(e) => handleDatePresetChange(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">Semua Waktu</option>
                        <option value="today">Hari Ini</option>
                        <option value="this_week">Minggu Ini</option>
                        <option value="this_month">Bulan Ini</option>
                        <option value="this_year">Tahun Ini</option>
                        <option value="custom">Kustom Rentang Tanggal</option>
                      </select>

                      {dateFilterPreset === 'custom' && (
                        <div className="pt-2 grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 block mb-1">Mulai Dari</span>
                            <input
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-semibold text-slate-500 block mb-1">Sampai Tanggal</span>
                            <input
                              type="date"
                              value={endDate}
                              onChange={(e) => setEndDate(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 2. Tipe Mutasi */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Tipe Mutasi Keuangan</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">Semua Tipe Transaksi</option>
                        <option value="inflow">Uang Masuk (Inflow)</option>
                        <option value="outflow">Uang Keluar (Outflow)</option>
                        <option value="mutation">Mutasi Antar Rekening</option>
                      </select>
                    </div>

                    {/* 2b. Kategori Aktivitas PSAK 2 */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Kategori Aktivitas Keuangan (PSAK 2)</label>
                      <select
                        value={filterActivityCategory}
                        onChange={(e) => setFilterActivityCategory(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">Semua Kategori Aktivitas</option>
                        <option value="operating">Operasional (Operating Cash Flow)</option>
                        <option value="investing">Investasi / Aset & Satwa (Investing)</option>
                        <option value="financing">Pendanaan / Modal & Pinjaman (Financing)</option>
                      </select>
                    </div>

                    {/* 2c. Akun Lawan COA */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Filter Akun Lawan COA (Bagan Akun)</label>
                      <select
                        value={filterCoaCode}
                        onChange={(e) => setFilterCoaCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">Semua Akun COA</option>
                        {chartOfAccounts.filter(a => a.code !== '1110').map(a => (
                          <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* 3. Sumber Pendapatan */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Sumber Pendapatan Operasional</label>
                      <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="all">Semua Sumber Pendapatan</option>
                        <option value="school_visit">Paket Edukasi / Kunjungan Sekolah</option>
                        <option value="dairy_product">Produk Olahan Susu & Yogurt</option>
                        <option value="ticket_gate">Loket Tiket & Wisata</option>
                        <option value="resto_fnb">Saung Resto & F&B</option>
                      </select>
                    </div>

                    {/* 4. Pengurutan Data (Sorting) */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Urutkan Data</label>
                      <select
                        value={`${sortBy}_${sortDirection}`}
                        onChange={(e) => {
                          const [field, dir] = e.target.value.split('_') as [any, any];
                          setSortBy(field);
                          setSortDirection(dir);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="receivedDate_desc">Terbaru (Tanggal Masuk Kas)</option>
                        <option value="receivedDate_asc">Terlama (Tanggal Masuk Kas)</option>
                        <option value="amount_desc">Nominal Terbesar</option>
                        <option value="amount_asc">Nominal Terkecil</option>
                      </select>
                    </div>
                  </div>
                </FilterDrawer>
              </>
            );
          })()}

          {/* Rekap Kas Terfilter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 text-[11px]">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">
                Menampilkan {filteredTransactions.length} dari {cashTransactions.length} transaksi
              </span>
              <button
                onClick={handleExportCashTransactions}
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Ekspor daftar transaksi kas/bank terfilter ke CSV/Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor CSV
              </button>
            </div>
            <div className="flex items-center gap-4 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <ArrowDownRight className="w-3.5 h-3.5" /> +{formatCompactRupiah(filteredMetrics.inflowTotal)}
              </div>
              <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                <ArrowUpRight className="w-3.5 h-3.5" /> -{formatCompactRupiah(filteredMetrics.outflowTotal)}
              </div>
              <div className={`font-extrabold px-2 py-0.5 rounded-md ${
                filteredMetrics.netTotal >= 0 
                  ? 'bg-emerald-100 text-emerald-900' 
                  : 'bg-rose-100 text-rose-900'
              }`}>
                Net: {filteredMetrics.netTotal >= 0 ? '+' : ''}{formatCompactRupiah(filteredMetrics.netTotal)}
              </div>
            </div>
          </div>

          {/* Info Banner Hak Akses Transaksi */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-200 rounded-2xl flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <div className="font-bold text-blue-950 flex items-center gap-2">
                Pencatatan Rekening Bank Terintegrasi & Akses Koreksi Histori Transaksi
                {canManageTransactions && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Akses Diberikan: {currentUser.role === 'super_admin' ? 'Super Admin' : 'Direktur Utama'}
                  </span>
                )}
              </div>
              <p className="text-blue-800 mt-0.5">
                Setiap transaksi kas masuk / keluar langsung disinkronisasikan ke saldo rekening bank yang bersangkutan secara spesifik tanpa duplikasi. 
                {canManageTransactions 
                  ? ' Anda memiliki wewenang khusus (Super Admin / Direktur Utama) untuk Mengedit detail atau Menghapus histori transaksi jika terjadi koreksi data (saldo rekening bank akan disesuaikan otomatis).'
                  : ' Hak mengedit & menghapus histori transaksi dibatasi secara ketat hanya untuk Super Admin dan Direktur Utama.'}
              </p>
            </div>
          </div>

          {/* Dedicated Scroll Container with Sticky Header - Full Width No Horizontal Scroll */}
          <div 
            className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-y-auto relative transition-all duration-200"
            style={{ maxHeight: '640px' }}
          >
            <table className="w-full text-left text-xs text-slate-700 border-collapse table-auto">
              <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px] z-20 shadow-xs">
                <tr>
                  <th 
                    onClick={() => handleSort('receivedDate')}
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[17%]"
                    title="Klik untuk urutkan berdasarkan Tanggal / Waktu Masuk"
                  >
                    <div className="flex items-center gap-1 text-emerald-900 font-extrabold">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Waktu & Ref</span>
                      {sortBy === 'receivedDate' ? (
                        sortDirection === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-3 w-[15%]">Kategori & Sumber</th>
                  <th 
                    onClick={() => handleSort('description')}
                    className="p-3 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[35%]"
                    title="Klik untuk urutkan berdasarkan Deskripsi Transaksi"
                  >
                    <div className="flex items-center gap-1">
                      <span>Uraian / Deskripsi</span>
                      {sortBy === 'description' ? (
                        sortDirection === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-blue-700" /> : <ArrowUp className="w-3.5 h-3.5 text-blue-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-3 w-[17%]">Rekening Kas / Bank</th>
                  <th 
                    onClick={() => handleSort('amount')}
                    className="p-3 text-right cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[12%]"
                    title="Klik untuk urutkan berdasarkan Nominal"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Nominal (Rp)</span>
                      {sortBy === 'amount' ? (
                        sortDirection === 'desc' ? <ArrowDown className="w-3.5 h-3.5 text-emerald-700" /> : <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="p-3 text-center w-[4%]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar className="w-8 h-8 text-slate-300" />
                        <div className="font-semibold text-slate-600 text-sm">Tidak ada transaksi yang cocok dengan filter</div>
                        <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian, rentang tanggal, atau reset filter.</p>
                        <button
                          onClick={resetAllCashFilters}
                          className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx, idx) => (
                    <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Waktu & No. Ref */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col">
                          <div className="font-mono font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              tx.type === 'inflow' ? 'bg-emerald-500' : tx.type === 'outflow' ? 'bg-rose-500' : 'bg-blue-500'
                            }`}></span>
                            <span>{formatDate(tx.receivedDate || tx.date)}</span>
                          </div>
                          <div className="font-mono text-blue-700 font-bold text-[11px] mt-0.5 pl-3.5 flex items-center gap-1">
                            <span>{tx.referenceNo}</span>
                          </div>
                          {tx.receivedDate && tx.receivedDate !== tx.date && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 pl-3.5">
                              Faktur: {formatDate(tx.date)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 2. Kategori & Sumber */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col gap-1 items-start">
                          {getSourceBadge(tx)}
                          <div className="flex flex-wrap items-center gap-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              tx.type === 'inflow' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                                : tx.type === 'outflow'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                            }`}>
                              {tx.type === 'inflow' ? '📥 Kas Masuk' : tx.type === 'outflow' ? '📤 Kas Keluar' : '🔄 Mutasi Saldo'}
                            </span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                              tx.category === 'investing'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : tx.category === 'financing'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {tx.category === 'investing' ? '🏗️ Investasi' : tx.category === 'financing' ? '🏦 Pendanaan' : '⚙️ Operasional'}
                            </span>
                          </div>
                          {tx.type !== 'mutation' && (() => {
                            const coaInfo = tx.contraAccountCode
                              ? { code: tx.contraAccountCode, name: tx.contraAccountName || chartOfAccounts.find(a => a.code === tx.contraAccountCode)?.name || 'Akun COA' }
                              : suggestContraAccountForTransaction(tx, chartOfAccounts);
                            return (
                              <span
                                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950/5 text-emerald-900 border border-emerald-300/60"
                                title={`Akun Lawan COA: ${coaInfo.code} - ${coaInfo.name}`}
                              >
                                COA {coaInfo.code}: {coaInfo.name}
                              </span>
                            );
                          })()}
                        </div>
                      </td>

                      {/* 3. Deskripsi & Entitas */}
                      <td className="p-3 align-top">
                        <div className="text-slate-800 text-xs font-medium leading-relaxed break-words">
                          {tx.description}
                        </div>
                        {tx.linkedEntityName && (
                          <div className="text-[11px] text-emerald-800 font-semibold mt-1 flex items-center gap-1.5 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/70 w-fit">
                            <School className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{tx.linkedEntityName}</span>
                          </div>
                        )}
                        {tx.type === 'outflow' && (
                          <div className="mt-1.5">
                            {(() => {
                              const linkedBg = budgetAllocations.find(b => b.id === tx.budgetId);
                              const displayName = tx.budgetName || (linkedBg ? `${linkedBg.department} (${linkedBg.category})` : null);

                              if (displayName) {
                                return (
                                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 text-[10px] font-semibold">
                                    <Target className="w-3 h-3 text-blue-600 shrink-0" />
                                    <span>Pos Anggaran: <strong className="font-bold">{displayName}</strong></span>
                                  </div>
                                );
                              }

                              return (
                                <div className="inline-flex items-center gap-1.5 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                    Belum Dikaitkan Anggaran
                                  </span>
                                  {budgetAllocations.length > 0 && canEditTransactions && (
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        const bgId = e.target.value;
                                        if (!bgId) return;
                                        const selectedBg = budgetAllocations.find(b => b.id === bgId);
                                        updateCashTransaction(tx.id, {
                                          budgetId: bgId,
                                          budgetName: selectedBg ? `${selectedBg.department} (${selectedBg.category})` : undefined
                                        });
                                      }}
                                      className="text-[10px] p-0.5 bg-white border border-slate-300 rounded text-slate-700 cursor-pointer focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="">+ Tautkan Pos Anggaran (70%)...</option>
                                      {budgetAllocations.map(bg => (
                                        <option key={bg.id} value={bg.id}>
                                          {bg.department} (Sisa: {formatCompactRupiah(Math.max(0, bg.allocatedAmount - (bg.spentAmount || 0)))})
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </td>

                      {/* 4. Rekening Bank / Kasir */}
                      <td className="p-3 align-top">
                        {tx.type === 'mutation' ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="font-semibold text-slate-800 leading-tight">Dari: {tx.sourceAccount}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="font-semibold text-slate-800 leading-tight">Ke: {tx.targetAccount || '-'}</span>
                            </div>
                          </div>
                        ) : (
                          (() => {
                            const matched = findTargetBankAccount(bankAccounts, tx.sourceAccount);
                            const displayName = matched ? matched.bankName : (tx.sourceAccount || '-');
                            return (
                              <div className="flex flex-col">
                                <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                  <Building className="w-3 h-3 text-blue-600 shrink-0" />
                                  <span className="leading-tight">{displayName}</span>
                                </div>
                                {matched && (
                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-4.5">
                                    <span>No. {simulateDecrypt(matched.accountNumber)}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })()
                        )}
                      </td>

                      {/* 5. Nominal & Status */}
                      <td className="p-3 align-top text-right whitespace-nowrap">
                        <div className={`font-bold font-mono text-xs sm:text-sm ${
                          tx.type === 'inflow' ? 'text-emerald-700' : tx.type === 'outflow' ? 'text-rose-700' : 'text-blue-700'
                        }`}>
                          {tx.type === 'inflow' ? '+' : tx.type === 'outflow' ? '-' : '⇄ '}{formatRupiah(tx.amount)}
                        </div>
                        {tx.type === 'mutation' && (
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                            Net: Rp 0 (Mutasi Saldo)
                          </div>
                        )}
                        <div className="mt-1 flex justify-end">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {tx.status}
                          </span>
                        </div>
                      </td>

                      {/* 6. Aksi (Strict RBAC DOM - dihilangkan sepenuhnya jika tidak berwenang) */}
                      <td className="p-3 align-top text-center whitespace-nowrap">
                        {canEditTransactions && (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEditTx(tx)}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 transition-colors cursor-pointer"
                              title="Buka / Edit Detail Transaksi & Kwitansi Resmi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {canManageTransactions && (
                              <button
                                onClick={() => setDeletingTx(tx)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 transition-colors cursor-pointer"
                                title="Hapus Histori Transaksi & Kembalikan Saldo (Super Admin / Direktur Utama)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <Pagination
            currentPage={cashflowCurrentPage}
            totalPages={cashflowTotalPages}
            totalItems={cashflowTotalItems}
            itemsPerPage={cashflowItemsPerPage}
            onNext={cashflowNextPage}
            onPrev={cashflowPrevPage}
          />
        </div>
      )}

      {/* Tab Recurring Bills */}
      {activeTab === 'recurring_bills' && (
        <RecurringBillsPanel />
      )}

      {/* Tab Pencatatan Hutang & Kewajiban Usaha (Accounts Payable) */}
      {activeTab === 'debts' && (
        <AccountsPayablePanel />
      )}

      {/* Tab Kas Kecil & Reimbursement Lapangan */}
      {activeTab === 'petty_cash' && (
        <PettyCashManager />
      )}

      {/* Tab POS: Kasir POS Tiket & Wahana Farm */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          <TicketCashierPOS />
        </div>
      )}

      {/* Tab 2: Rekap Sumber Pendapatan */}
      {activeTab === 'revenue_breakdown' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(revenueBySource).map(([key, data]) => {
              const Icon = data.icon;
              const percent = totalInflows > 0 ? Math.round((data.total / totalInflows) * 100) : 0;
              const avgTicket = data.count > 0 ? Math.round(data.total / data.count) : 0;

              return (
                <div key={key} className={`p-5 rounded-2xl border ${data.color} space-y-4 shadow-xs flex flex-col justify-between`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white/90 shadow-xs flex items-center justify-center text-slate-800">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-800 font-mono shadow-xs border border-slate-200/60">
                          {percent}% Total
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{data.label}</h4>
                      <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{formatRupiah(data.total)}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                    <span>Transaksi: <strong className="text-slate-800">{data.count} Kali</strong></span>
                    <span>Rata-rata: <strong className="text-slate-800 font-mono">{formatCompactRupiah(avgTicket)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* School Visits Payment Stage Breakdown */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-800">Status Pembayaran Rombongan Sekolah Terhubung</h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Total Deal: {formatCompactRupiah(leads.filter(l => l.stage === 'won' || l.stage === 'proposal' || l.stage === 'negotiation').reduce((acc, l) => acc + l.dealValue, 0))}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {leads.filter(l => l.stage === 'won' || l.stage === 'negotiation' || l.stage === 'proposal').map(lead => {
                const paid = lead.dpAmount || 0;
                const remaining = Math.max(0, lead.dealValue - paid);
                const percentPaid = lead.dealValue > 0 ? Math.min(100, Math.round((paid / lead.dealValue) * 100)) : 0;

                return (
                  <div key={lead.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{lead.company}</h4>
                        <p className="text-[10px] text-slate-500">{lead.participantCount} Siswa • {lead.packageChosen?.substring(0, 30)}...</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        lead.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                        lead.paymentStatus === 'dp_paid' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-slate-200 text-slate-700 border border-slate-300'
                      }`}>
                        {lead.paymentStatus === 'paid' ? 'Lunas 100%' : lead.paymentStatus === 'dp_paid' ? 'DP Masuk' : 'Belum Bayar'}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${lead.paymentStatus === 'paid' ? 'bg-emerald-600' : 'bg-amber-500'}`}
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">Terbayar: <strong className="text-emerald-700 font-mono">{formatCompactRupiah(paid)}</strong></span>
                      <span className="text-slate-500">Sisa: <strong className="text-rose-700 font-mono">{formatCompactRupiah(remaining)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Alokasi & Realisasi Anggaran (Kebijakan 70% Perusahaan & 30% Owner) */}
      {activeTab === 'budget' && (
        <BudgetAllocationManager 
          onOpenAddTransactionModal={(budgetId) => {
            setTxType('outflow');
            setTxCategory('operating');
            if (budgetId) {
              const found = budgetAllocations.find(b => b.id === budgetId);
              setSelectedBudgetId(budgetId);
              setSelectedBudgetName(found ? `${found.department} (${found.category})` : '');
              setTxDescription(`Pengeluaran Operasional - ${found?.department || ''}`);
            }
            setShowAddModal(true);
          }}
        />
      )}

      {/* Tab 5: Tagihan & Piutang Kunjungan Sekolah (Wisata) */}
      {activeTab === 'school_receivables' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Kesepakatan (Deal Wisata)</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatRupiah(leadFinancials.reduce((s, x) => s + (x.lead.dealValue || 0), 0))}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dari total {leadFinancials.length} prospek / booking sekolah
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Kas Masuk Terverifikasi (Finance)</span>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                {formatRupiah(leadFinancials.reduce((s, x) => s + x.effectivePaid, 0))}
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dana riil di kas & bank
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Sisa Piutang Sekolah (Belum Masuk Kas)</span>
              <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
                {formatRupiah(leadFinancials.reduce((s, x) => s + x.remaining, 0))}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Menunggu pembayaran DP / Pelunasan
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Tingkat Kolektibilitas / Lunas</span>
              {(() => {
                const totalDeal = leadFinancials.reduce((s, x) => s + (x.lead.dealValue || 0), 0);
                const totalPaid = leadFinancials.reduce((s, x) => s + x.effectivePaid, 0);
                const rate = totalDeal > 0 ? Math.round((totalPaid / totalDeal) * 100) : 0;
                return (
                  <>
                    <div className="text-xl font-bold text-blue-700 mt-1 font-mono">
                      {rate}% Terbayar
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {leadFinancials.filter(x => x.isPaid).length} dari {leadFinancials.length} sekolah lunas
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Clean Tab Filter Bar & Search Engine */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
            {/* Tab Filter Status Pelunasan */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSchoolPaymentStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    schoolPaymentStatusFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Semua Tagihan
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    schoolPaymentStatusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {leadFinancials.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSchoolPaymentStatusFilter('unpaid')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    schoolPaymentStatusFilter === 'unpaid'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Belum Bayar
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    schoolPaymentStatusFilter === 'unpaid' ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {leadFinancials.filter(x => x.isUnpaid).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSchoolPaymentStatusFilter('dp')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    schoolPaymentStatusFilter === 'dp'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  DP / Sebagian
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    schoolPaymentStatusFilter === 'dp' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {leadFinancials.filter(x => x.isDp).length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSchoolPaymentStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    schoolPaymentStatusFilter === 'paid'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Lunas 100%
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    schoolPaymentStatusFilter === 'paid' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {leadFinancials.filter(x => x.isPaid).length}
                  </span>
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportSchoolReceivables}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Unduh data tagihan dan piutang sekolah ke format CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>

            {/* Search Engine & Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama sekolah, PIC, nomor telepon, atau paket wisata..."
                  value={schoolSearchQuery}
                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                {schoolSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSchoolSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* CRM Stage & Sort Dropdowns */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-medium hidden md:inline">Tahap:</span>
                  <select
                    value={schoolStageFilter}
                    onChange={(e) => setSchoolStageFilter(e.target.value)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="all">Semua Tahap CRM</option>
                    <option value="won">Deal Won (Closing)</option>
                    <option value="negotiation">Negosiasi</option>
                    <option value="proposal">Kirim Proposal</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-medium hidden md:inline">Urutan:</span>
                  <select
                    value={schoolSortBy}
                    onChange={(e) => setSchoolSortBy(e.target.value as any)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="dealValue">Nilai Kesepakatan</option>
                    <option value="remaining">Sisa Piutang Terbesar</option>
                    <option value="paid">Kas Masuk Terbanyak</option>
                    <option value="company">Nama Sekolah (A-Z)</option>
                    <option value="students">Jumlah Peserta</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSchoolSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 cursor-pointer"
                    title={`Arah urutan: ${schoolSortDirection === 'desc' ? 'Menurun (Tertinggi)' : 'Menaik (Terendah)'}`}
                  >
                    {schoolSortDirection === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {(schoolSearchQuery || schoolPaymentStatusFilter !== 'all' || schoolStageFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchoolSearchQuery('');
                      setSchoolPaymentStatusFilter('all');
                      setSchoolStageFilter('all');
                      setSchoolSortBy('dealValue');
                      setSchoolSortDirection('desc');
                    }}
                    className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table List of Schools */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <School className="w-4 h-4 text-emerald-700" /> Pengawasan Kas Masuk & Piutang Kunjungan Sekolah
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Bagian Finance adalah otoritas tunggal yang memvalidasi pembayaran dan mencatat kas masuk ke rekening bank.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                Menampilkan {paginatedSchoolReceivables.length} dari {filteredLeadFinancials.length} Sekolah
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse table-auto">
                <thead className="bg-slate-50 text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-[26%]">Sekolah / Lembaga</th>
                    <th className="p-3 w-[12%]">Status CRM</th>
                    <th className="p-3 text-right w-[14%]">Nilai Deal</th>
                    <th className="p-3 text-right w-[14%]">Kas Masuk (Finance)</th>
                    <th className="p-3 text-right w-[14%]">Sisa Tagihan</th>
                    <th className="p-3 text-center w-[12%]">Status & Progres</th>
                    <th className="p-3 text-center w-[10%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSchoolReceivables.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <School className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600 text-sm">Tidak ada tagihan sekolah yang cocok</p>
                        <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau reset filter tabulasi.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedSchoolReceivables.map((item) => {
                      const { lead: ld, inflows, effectivePaid, remaining, isPaid, isDp, percentPaid } = item;

                      return (
                        <tr key={ld.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <School className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{ld.company}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              PIC: <strong className="text-slate-700">{ld.name}</strong> • {ld.phone}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {ld.participantCount || 0} Siswa • {ld.packageChosen || 'Paket Wisata Edukasi'}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                              ld.stage === 'won' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              ld.stage === 'negotiation' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              ld.stage === 'proposal' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {ld.stage === 'won' ? 'DEAL WON' : ld.stage}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800 text-xs">
                            {formatRupiah(ld.dealValue)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700 text-xs">
                            {formatRupiah(effectivePaid)}
                            {inflows.length > 0 && (
                              <span className="block text-[10px] text-slate-500 font-normal">
                                ({inflows.length}x mutasi kas)
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-amber-800 text-xs">
                            {formatRupiah(remaining)}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                isDp ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isPaid ? 'LUNAS 100%' :
                                 isDp ? `DP (${percentPaid}%)` :
                                 'BELUM BAYAR'}
                              </span>

                              <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${isPaid ? 'bg-emerald-600' : isDp ? 'bg-amber-500' : 'bg-rose-400'}`}
                                  style={{ width: `${percentPaid}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {canCreate ? (
                              <div className="flex flex-col gap-1.5 items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTxType('inflow');
                                    setTxIncomeSource('school_visit');
                                    setTxPaymentStage(effectivePaid > 0 ? 'settlement' : 'dp');
                                    handleSelectSchool(ld.id);
                                    setShowAddModal(true);
                                  }}
                                  className="w-full px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                                >
                                  <Plus className="w-3 h-3" /> Catat Kas
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedInvoiceLead(ld)}
                                  className="w-full px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                                >
                                  <Printer className="w-3 h-3" /> Invoice
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Akses Terbatas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={schoolCurrentPage}
              totalPages={schoolTotalPages}
              totalItems={schoolTotalItems}
              itemsPerPage={schoolItemsPerPage}
              onNext={schoolNextPage}
              onPrev={schoolPrevPage}
            />
          </div>
        </div>
      )}


      {/* Invoice Generator Modal */}
      <InvoiceGeneratorModal 
        isOpen={!!selectedInvoiceLead} 
        onClose={() => setSelectedInvoiceLead(null)} 
        defaultLead={selectedInvoiceLead} 
      />

      {/* Modal: Catat Arus Kas Baru dengan Pemilihan Sumber Pendapatan & Tahap Pembayaran */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" /> Pencatatan Arus Kas Masuk / Keluar
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-3.5 text-xs">
              
              {/* Tanggal Uang Masuk, Tanggal Dokumen & Arah Arus Kas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-emerald-900 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    {txType === 'inflow' ? 'Tanggal Uang Masuk:' : txType === 'outflow' ? 'Tanggal Kas Keluar:' : 'Tanggal Mutasi Kas:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={txReceivedDate}
                    onChange={(e) => setTxReceivedDate(e.target.value)}
                    className="w-full p-2 bg-emerald-50/50 border border-emerald-300 rounded-xl text-slate-800 font-medium"
                  />
                  <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                    {txType === 'inflow' ? 'Kapan dana masuk ke rekening' : txType === 'outflow' ? 'Kapan kas dikeluarkan' : 'Kapan mutasi dana dieksekusi'}
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Dokumen / Faktur:
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tanggal pencatatan transaksi
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Arah Arus Kas:</label>
                  <select
                    value={txType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setTxType(val);
                      if (val === 'mutation') {
                        if (!txTargetAccount || txTargetAccount === txSourceAccount) {
                          const other = bankAccounts.find(b => b.bankName !== txSourceAccount);
                          if (other) setTxTargetAccount(other.bankName);
                        }
                        if (!txDescription || txDescription.startsWith('Penerimaan') || txDescription.startsWith('Pengeluaran')) {
                          setTxDescription(`Mutasi Dana: Transfer Antar Rekening`);
                        }
                      }
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                  >
                    <option value="inflow">Uang Masuk (Inflow)</option>
                    <option value="outflow">Uang Keluar (Outflow)</option>
                    <option value="mutation">Mutasi Keuangan (Pindah Saldo Antar Rekening)</option>
                  </select>
                </div>
              </div>

              {/* Khusus Mutasi: Tampilkan Selector Rekening Asal -> Rekening Tujuan */}
              {txType === 'mutation' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <ArrowUpDown className="w-4 h-4 text-blue-700" /> Mutasi Saldo Antar Rekening:
                    </label>
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                      Net: Rp 0 (Pindah Buku)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Memindahkan saldo dari <strong>Rekening Asal</strong> (berkurang) ke <strong>Rekening Tujuan</strong> (bertambah) secara otomatis tanpa mengubah total saldo kas & bank perusahaan.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-rose-900 block mb-1 flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                        Rekening Asal (Sumber Dana - Berkurang):
                      </label>
                      <select
                        value={txSourceAccount}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTxSourceAccount(val);
                          if (txTargetAccount === val) {
                            const other = bankAccounts.find(b => b.bankName !== val);
                            if (other) setTxTargetAccount(other.bankName);
                          }
                        }}
                        className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName} - Saldo: {formatCompactRupiah(b.balance)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-emerald-900 block mb-1 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        Rekening Tujuan (Penerima Dana - Bertambah):
                      </label>
                      <select
                        value={txTargetAccount}
                        onChange={(e) => setTxTargetAccount(e.target.value)}
                        className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName} - Saldo: {formatCompactRupiah(b.balance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {txSourceAccount === txTargetAccount && (
                    <div className="text-rose-700 font-semibold text-[11px] bg-rose-100/80 p-2 rounded-xl border border-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      Rekening Asal dan Rekening Tujuan tidak boleh sama. Silakan pilih rekening tujuan yang berbeda.
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Aktivitas Keuangan:</label>
                  <select
                    value={txCategory}
                    onChange={(e) => setTxCategory(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="operating">Operasional (Operating Cash Flow)</option>
                    <option value="investing">Investasi / Fasilitas (Investing)</option>
                    <option value="financing">Pendanaan (Financing)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nomor Referensi Dokumen / Faktur:</label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-2026-089 atau TKT-2026-08"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              {/* Jika Uang Masuk: Tampilkan Pemilihan Sumber Pendapatan */}
              {txType === 'inflow' && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-700" /> Sumber Pendapatan (Revenue Stream):
                    </label>
                    <span className="text-[10px] text-slate-500">Pilihan ini menentukan otomatisasi pembukuan</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSourceChange('school_visit')}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer ${
                        txIncomeSource === 'school_visit' 
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <School className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <div>
                        <div className="text-xs">Kunjungan Sekolah (Field Trip)</div>
                        <div className="text-[10px] font-normal text-slate-500">DP & Pelunasan Rombongan</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSourceChange('dairy_product')}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer ${
                        txIncomeSource === 'dairy_product' 
                          ? 'bg-blue-100 border-blue-300 text-blue-900 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <ShoppingBag className="w-4 h-4 text-blue-700 flex-shrink-0" />
                      <div>
                        <div className="text-xs">Produk Olahan Susu & Yogurt</div>
                        <div className="text-[10px] font-normal text-slate-500">Distribusi Mitra & Penjualan</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSourceChange('ticket_gate')}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer ${
                        txIncomeSource === 'ticket_gate' 
                          ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Ticket className="w-4 h-4 text-amber-700 flex-shrink-0" />
                      <div>
                        <div className="text-xs">Tiket Masuk Loket Gate</div>
                        <div className="text-[10px] font-normal text-slate-500">Wisata Harian & Kuda Poni</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSourceChange('resto_fnb')}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 cursor-pointer ${
                        txIncomeSource === 'resto_fnb' 
                          ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold' 
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Utensils className="w-4 h-4 text-rose-700 flex-shrink-0" />
                      <div>
                        <div className="text-xs">Saung Resto & F&B Farm</div>
                        <div className="text-[10px] font-normal text-slate-500">Konsumsi Prasmanan & Minuman</div>
                      </div>
                    </button>
                  </div>

                  {/* Detail Tambahan Jika Memilih Kunjungan Sekolah */}
                  {txIncomeSource === 'school_visit' && (
                    <div className="pt-2 border-t border-emerald-200 space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Hubungkan ke Sekolah / Rombongan:</label>
                          <select
                            value={selectedLeadId}
                            onChange={(e) => handleSelectSchool(e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs"
                          >
                            <option value="">-- Pilih Sekolah / Input Manual --</option>
                            {leads.map((ld) => (
                              <option key={ld.id} value={ld.id}>
                                {ld.company} ({formatCompactRupiah(ld.dealValue)})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 block mb-1">Tahap Pembayaran:</label>
                          <select
                            value={txPaymentStage}
                            onChange={(e) => handleStageChange(e.target.value as any)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold"
                          >
                            <option value="dp">1. Uang Muka / DP (30% - 50%)</option>
                            <option value="installment">2. Cicilan Bertahap / Termin 2</option>
                            <option value="settlement">3. Pelunasan Akhir (100%)</option>
                            <option value="full">4. Bayar Penuh Sekaligus (100%)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Jika Uang Keluar: Tampilkan Pemilihan Dompet Anggaran Operasional (Debet Dompet Terpisah) */}
              {txType === 'outflow' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                      <Target className="w-4 h-4 text-emerald-700" /> Bebankan ke Dompet Anggaran (Debet Dompet Terpisah):
                    </label>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                      Otomatis Debet Saldo Dompet
                    </span>
                  </div>

                  <select
                    value={selectedBudgetId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedBudgetId(id);
                      const bg = budgetAllocations.find(b => b.id === id);
                      if (bg) {
                        setSelectedBudgetName(`${bg.department} (${bg.category})`);
                        if (!txDescription) {
                          setTxDescription(`Pengeluaran Operasional - ${bg.department}`);
                        }
                      } else {
                        setSelectedBudgetName('');
                      }
                    }}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Bebas / Tanpa Alokasi Dompet Khusus --</option>
                    {budgetAllocations.map((bg) => {
                      const remaining = Math.max(0, bg.allocatedAmount - (bg.spentAmount || 0));
                      const percentUsed = bg.allocatedAmount > 0 ? Math.round(((bg.spentAmount || 0) / bg.allocatedAmount) * 100) : 0;
                      const pctOfRev = bg.percentageOfRevenue !== undefined 
                        ? `${bg.percentageOfRevenue}% Omset` 
                        : (bg.percentageOfCompanyShare !== undefined ? `${(bg.percentageOfCompanyShare * 0.7).toFixed(1)}% Omset` : '');
                      return (
                        <option key={bg.id} value={bg.id}>
                          👛 {bg.department} [{bg.category}] {pctOfRev ? `— ${pctOfRev}` : ''} — Sisa: {formatRupiah(remaining)} ({percentUsed}% terpakai)
                        </option>
                      );
                    })}
                  </select>

                  {selectedBudgetId && (
                    <div className="text-[11px] text-emerald-900 bg-white/90 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between flex-wrap gap-2">
                      {(() => {
                        const bg = budgetAllocations.find(b => b.id === selectedBudgetId);
                        if (!bg) return null;
                        const remaining = Math.max(0, bg.allocatedAmount - (bg.spentAmount || 0));
                        return (
                          <>
                            <span>Plafon Dompet: <strong>{formatCompactRupiah(bg.allocatedAmount)}</strong></span>
                            <span>Sudah Terdebet: <strong className="text-rose-700">{formatCompactRupiah(bg.spentAmount || 0)}</strong></span>
                            <span>Sisa Saldo: <strong className="text-emerald-700 font-bold font-mono">{formatCompactRupiah(remaining)}</strong></span>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi / Keterangan Transaksi:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Penerimaan pembayaran DP 50% Paket Field Trip SD..."
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {txType !== 'mutation' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Layers className="w-4 h-4 text-emerald-700" /> Akun Lawan Bagan Akun (COA Modul Akuntansi):
                    </label>
                    <div className="flex items-center gap-2">
                      {txContraCoaCode === suggestedAddCoa.code && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-700" /> Saran Otomatis ({suggestedAddCoa.code})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAllCoaInAddModal(prev => !prev)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                      >
                        {showAllCoaInAddModal ? 'Hanya Sesuai Kategori Aktivitas' : 'Tampilkan Semua COA'}
                      </button>
                    </div>
                  </div>

                  <select
                    value={txContraCoaCode}
                    onChange={(e) => setTxContraCoaCode(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableCoaForAdd.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        [{acc.code}] {acc.name} — ({acc.category} • {getCOACashFlowCategory(acc) === 'investing' ? 'Investasi' : getCOACashFlowCategory(acc) === 'financing' ? 'Pendanaan' : 'Operasional'})
                      </option>
                    ))}
                  </select>

                  {/* Live Double-Entry Journal Preview */}
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[11px] space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center justify-between">
                      <span>Pratinjau Pembukuan Jurnal Umum Otomatis (Double-Entry):</span>
                      <span className="text-[10px] font-mono text-emerald-700">PSAK 2: {txCategory === 'investing' ? 'Arus Kas Investasi' : txCategory === 'financing' ? 'Arus Kas Pendanaan' : 'Arus Kas Operasional'}</span>
                    </div>
                    {(() => {
                      const chosenCoa = chartOfAccounts.find(a => a.code === txContraCoaCode) || suggestedAddCoa;
                      const amtDisplay = Number(txAmount) > 0 ? formatRupiah(Number(txAmount)) : 'Rp 0';
                      const debitLabel = txType === 'inflow'
                        ? `[1110] Kas & Setara Kas (${txSourceAccount})`
                        : `[${chosenCoa.code}] ${chosenCoa.name}`;
                      const creditLabel = txType === 'inflow'
                        ? `[${chosenCoa.code}] ${chosenCoa.name}`
                        : `[1110] Kas & Setara Kas (${txSourceAccount})`;
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
                          <div className="p-1.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex justify-between items-center gap-2">
                            <span className="truncate"><strong>DEBIT:</strong> {debitLabel}</span>
                            <span className="font-bold shrink-0">{amtDisplay}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 flex justify-between items-center gap-2">
                            <span className="truncate"><strong>KREDIT:</strong> {creditLabel}</span>
                            <span className="font-bold shrink-0">{amtDisplay}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className={txType === 'mutation' ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Nominal {txType === 'mutation' ? 'Mutasi Saldo' : 'Uang'} (Rp):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="Contoh: 15000000"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-sm"
                  />
                  {Number(txAmount) > 0 && (
                    <div className="text-[10px] text-emerald-700 font-mono mt-0.5 font-semibold">
                      {formatRupiah(Number(txAmount))}
                    </div>
                  )}
                </div>
                {txType !== 'mutation' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Rekening Bank Tujuan / Sumber:</label>
                    <select
                      value={txSourceAccount}
                      onChange={(e) => setTxSourceAccount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.bankName}>
                          {b.bankName} [No. Rek: {simulateDecrypt(b.accountNumber)}] - Saldo: {formatCompactRupiah(b.balance)}
                        </option>
                      ))}
                      {bankAccounts.length === 0 && (
                        <option value="Kas Tunai Operasional">Kas Tunai Operasional D'Kandang</option>
                      )}
                    </select>
                  </div>
                )}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> {isSubmitting ? 'Menyimpan...' : 'Simpan & Bukukan Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Alokasi Anggaran Baru */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Tambah Alokasi Anggaran Departemen
              </h3>
              <button onClick={() => setShowAddBudgetModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!bgDepartment || !bgAllocated) return;
              await addBudgetAllocation({
                department: bgDepartment,
                category: bgCategory || 'Biaya Operasional',
                allocatedAmount: Number(bgAllocated),
                quarter: bgQuarter,
                fiscalYear: Number(bgFiscalYear) || 2026
              });
              setShowAddBudgetModal(false);
              setBgDepartment('');
              setBgCategory('');
              setBgAllocated('');
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Departemen / Unit Usaha:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pemeliharaan Satwa & Pakan Ternak atau Pemasaran Eduwisata"
                  value={bgDepartment}
                  onChange={(e) => setBgDepartment(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Belanja:</label>
                  <input
                    type="text"
                    placeholder="Contoh: Operasional, Perawatan, Promosi..."
                    value={bgCategory}
                    onChange={(e) => setBgCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plafon Anggaran (Rp):</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 120000000"
                    value={bgAllocated}
                    onChange={(e) => setBgAllocated(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periode Kuartal:</label>
                  <select
                    value={bgQuarter}
                    onChange={(e) => setBgQuarter(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Q1">Kuartal 1 (Jan - Mar)</option>
                    <option value="Q2">Kuartal 2 (Apr - Jun)</option>
                    <option value="Q3">Kuartal 3 (Jul - Sep)</option>
                    <option value="Q4">Kuartal 4 (Okt - Des)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tahun Anggaran (Fiskal):</label>
                  <input
                    type="number"
                    required
                    value={bgFiscalYear}
                    onChange={(e) => setBgFiscalYear(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Anggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Alokasi Anggaran */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" /> Edit Plafon & Realisasi Anggaran
              </h3>
              <button onClick={() => setEditingBudget(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingBudget) return;
              await updateBudgetAllocation(editingBudget.id, {
                department: editBgDept,
                category: editBgCat,
                allocatedAmount: Number(editBgAllocated) || 0,
                spentAmount: Number(editBgSpent) || 0,
                quarter: editBgQuarter,
                fiscalYear: Number(editBgFiscalYear) || 2026
              });
              setEditingBudget(null);
            }} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Departemen:</label>
                <input
                  type="text"
                  required
                  value={editBgDept}
                  onChange={(e) => setEditBgDept(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Belanja:</label>
                <input
                  type="text"
                  value={editBgCat}
                  onChange={(e) => setEditBgCat(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plafon Anggaran (Rp):</label>
                  <input
                    type="number"
                    required
                    value={editBgAllocated}
                    onChange={(e) => setEditBgAllocated(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Realisasi Belanja (Rp):</label>
                  <input
                    type="number"
                    required
                    value={editBgSpent}
                    onChange={(e) => setEditBgSpent(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-rose-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Periode Kuartal:</label>
                  <select
                    value={editBgQuarter}
                    onChange={(e) => setEditBgQuarter(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Q1">Kuartal 1 (Jan - Mar)</option>
                    <option value="Q2">Kuartal 2 (Apr - Jun)</option>
                    <option value="Q3">Kuartal 3 (Jul - Sep)</option>
                    <option value="Q4">Kuartal 4 (Okt - Des)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tahun Anggaran:</label>
                  <input
                    type="number"
                    required
                    value={editBgFiscalYear}
                    onChange={(e) => setEditBgFiscalYear(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal: Edit Histori Transaksi Kas (Akses Khusus Super Admin & Direktur Utama) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 shadow-xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Edit Histori Transaksi Kas</h3>
                  <p className="text-xs text-blue-700 font-semibold">Otoritas Khusus Super Admin & Direktur Utama</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTx} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-emerald-900 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    {editTxType === 'inflow' ? 'Tanggal Uang Masuk:' : editTxType === 'outflow' ? 'Tanggal Kas Keluar:' : 'Tanggal Mutasi Kas:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={editTxReceivedDate}
                    onChange={(e) => setEditTxReceivedDate(e.target.value)}
                    className="w-full p-2.5 bg-emerald-50/50 border border-emerald-300 rounded-xl text-slate-800 font-medium"
                  />
                  <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">
                    {editTxType === 'inflow' ? 'Kapan dana masuk ke rekening' : editTxType === 'outflow' ? 'Kapan kas dikeluarkan' : 'Kapan mutasi dana dieksekusi'}
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Dokumen / Faktur:
                  </label>
                  <input
                    type="date"
                    required
                    value={editTxDate}
                    onChange={(e) => setEditTxDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Tanggal pencatatan transaksi
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">No. Referensi Faktur / Resi:</label>
                  <input
                    type="text"
                    required
                    value={editTxReference}
                    onChange={(e) => setEditTxReference(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-blue-700 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Arus Kas:</label>
                  <select
                    value={editTxType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setEditTxType(val);
                      if (val === 'mutation') {
                        if (!editTxTargetAccount || editTxTargetAccount === editTxSourceAccount) {
                          const other = bankAccounts.find(b => b.bankName !== editTxSourceAccount);
                          if (other) setEditTxTargetAccount(other.bankName);
                        }
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                  >
                    <option value="inflow">Kas Masuk (Inflow / Penerimaan)</option>
                    <option value="outflow">Kas Keluar (Outflow / Pengeluaran)</option>
                    <option value="mutation">Mutasi Keuangan (Pindah Saldo Antar Rekening)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Aktivitas Kas:</label>
                  <select
                    value={editTxCategory}
                    onChange={(e) => setEditTxCategory(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="operating">Operasional (Operating)</option>
                    <option value="investing">Investasi (Investing)</option>
                    <option value="financing">Pendanaan (Financing)</option>
                  </select>
                </div>
              </div>

              {/* Khusus Mutasi saat Edit */}
              {editTxType === 'mutation' && (
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-blue-950 flex items-center gap-1.5 text-xs">
                      <ArrowUpDown className="w-4 h-4 text-blue-700" /> Mutasi Saldo Antar Rekening:
                    </label>
                    <span className="text-[10px] text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200">
                      Net: Rp 0 (Pindah Buku)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-rose-900 block mb-1 flex items-center gap-1">
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                        Rekening Asal (Sumber Dana - Berkurang):
                      </label>
                      <select
                        value={editTxSourceAccount}
                        onChange={(e) => setEditTxSourceAccount(e.target.value)}
                        className="w-full p-2.5 bg-white border border-rose-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName} - Saldo: {formatCompactRupiah(b.balance)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-emerald-900 block mb-1 flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                        Rekening Tujuan (Penerima Dana - Bertambah):
                      </label>
                      <select
                        value={editTxTargetAccount}
                        onChange={(e) => setEditTxTargetAccount(e.target.value)}
                        className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {bankAccounts.map((b) => (
                          <option key={b.id} value={b.bankName}>
                            {b.bankName} - Saldo: {formatCompactRupiah(b.balance)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {editTxSourceAccount === editTxTargetAccount && (
                    <div className="text-rose-700 font-semibold text-[11px] bg-rose-100/80 p-2 rounded-xl border border-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      Rekening Asal dan Rekening Tujuan tidak boleh sama.
                    </div>
                  )}
                </div>
              )}

              {editTxType === 'inflow' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200">
                  <div>
                    <label className="font-semibold text-emerald-950 block mb-1">Sumber Pendapatan:</label>
                    <select
                      value={editTxIncomeSource}
                      onChange={(e) => setEditTxIncomeSource(e.target.value as any)}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-800"
                    >
                      <option value="school_visit">Kunjungan Wisata Sekolah & Edukasi</option>
                      <option value="dairy_product">Produk Olahan Susu Sapi & Yogurt</option>
                      <option value="ticket_gate">Tiket Gate Loket & Wahana</option>
                      <option value="resto_fnb">Resto Saung & F&B Farm</option>
                      <option value="other">Pendapatan Lain-lain</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-emerald-950 block mb-1">Tahap Pembayaran:</label>
                    <select
                      value={editTxPaymentStage}
                      onChange={(e) => setEditTxPaymentStage(e.target.value as any)}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-slate-800"
                    >
                      <option value="dp">Uang Muka (DP)</option>
                      <option value="installment">Cicilan Termin</option>
                      <option value="settlement">Pelunasan Akhir</option>
                      <option value="full">Pembayaran Penuh 100%</option>
                    </select>
                  </div>
                </div>
              )}

              {editTxType === 'outflow' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                  <label className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                    <Target className="w-4 h-4 text-emerald-700" /> Bebankan ke Dompet Anggaran (Debet Dompet Terpisah):
                  </label>
                  <select
                    value={editTxBudgetId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setEditTxBudgetId(id);
                      const bg = budgetAllocations.find(b => b.id === id);
                      setEditTxBudgetName(bg ? `${bg.department} (${bg.category})` : '');
                    }}
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Bebas / Tanpa Alokasi Dompet Khusus --</option>
                    {budgetAllocations.map((bg) => {
                      const remaining = Math.max(0, bg.allocatedAmount - (bg.spentAmount || 0));
                      const pctOfRev = bg.percentageOfRevenue !== undefined 
                        ? `${bg.percentageOfRevenue}% Omset` 
                        : (bg.percentageOfCompanyShare !== undefined ? `${(bg.percentageOfCompanyShare * 0.7).toFixed(1)}% Omset` : '');
                      return (
                        <option key={bg.id} value={bg.id}>
                          👛 {bg.department} [{bg.category}] {pctOfRev ? `— ${pctOfRev}` : ''} — Sisa: {formatRupiah(remaining)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hubungkan Sekolah / Pelanggan (Opsional):</label>
                <input
                  type="text"
                  value={editTxLinkedEntityName}
                  onChange={(e) => setEditTxLinkedEntityName(e.target.value)}
                  placeholder="Contoh: SD Al-Azhar Pasir Putih"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Deskripsi / Uraian Transaksi:</label>
                <textarea
                  rows={2}
                  required
                  value={editTxDescription}
                  onChange={(e) => setEditTxDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className={editTxType === 'mutation' ? 'space-y-3' : 'grid grid-cols-2 gap-3'}>
                {editTxType !== 'mutation' && (
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Rekening Bank Tujuan / Sumber:</label>
                    <select
                      value={editTxSourceAccount}
                      onChange={(e) => setEditTxSourceAccount(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium text-xs cursor-pointer focus:border-emerald-500 focus:outline-none"
                    >
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.bankName}>
                          {b.bankName} [No. Rek: {simulateDecrypt(b.accountNumber)}] - Saldo: {formatCompactRupiah(b.balance)}
                        </option>
                      ))}
                      {editTxSourceAccount && !bankAccounts.some(b => b.bankName === editTxSourceAccount) && (
                        <option value={editTxSourceAccount}>
                          {editTxSourceAccount} (Sumber Lainnya)
                        </option>
                      )}
                    </select>
                  </div>
                )}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Transaksi:</label>
                  <select
                    value={editTxStatus}
                    onChange={(e) => setEditTxStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                  >
                    <option value="completed">Completed (Selesai)</option>
                    <option value="pending">Pending (Menunggu Verifikasi)</option>
                    <option value="reconciled">Reconciled (Terekonsiliasi)</option>
                  </select>
                </div>
              </div>

              {editTxType !== 'mutation' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <Layers className="w-4 h-4 text-blue-700" /> Akun Lawan Bagan Akun (COA Modul Akuntansi):
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditTxContraCoaCode(suggestedEditCoa.code)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 cursor-pointer"
                        title="Terapkan saran otomatis COA sesuai kategori & deskripsi"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-700" /> Pakai Saran ({suggestedEditCoa.code})
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAllCoaInEditModal(prev => !prev)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                      >
                        {showAllCoaInEditModal ? 'Hanya Sesuai Kategori Aktivitas' : 'Tampilkan Semua COA'}
                      </button>
                    </div>
                  </div>

                  <select
                    value={editTxContraCoaCode}
                    onChange={(e) => setEditTxContraCoaCode(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {availableCoaForEdit.map((acc) => (
                      <option key={acc.code} value={acc.code}>
                        [{acc.code}] {acc.name} — ({acc.category} • {getCOACashFlowCategory(acc) === 'investing' ? 'Investasi' : getCOACashFlowCategory(acc) === 'financing' ? 'Pendanaan' : 'Operasional'})
                      </option>
                    ))}
                  </select>

                  <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 text-[11px] space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Pratinjau Sinkronisasi Jurnal Umum (Double-Entry):</span>
                      <span className="text-[10px] font-mono text-blue-700">PSAK 2: {editTxCategory === 'investing' ? 'Arus Kas Investasi' : editTxCategory === 'financing' ? 'Arus Kas Pendanaan' : 'Arus Kas Operasional'}</span>
                    </div>
                    {(() => {
                      const chosenCoa = chartOfAccounts.find(a => a.code === editTxContraCoaCode) || suggestedEditCoa;
                      const amtDisplay = Number(editTxAmount) > 0 ? formatRupiah(Number(editTxAmount)) : 'Rp 0';
                      const debitLabel = editTxType === 'inflow'
                        ? `[1110] Kas & Setara Kas (${editTxSourceAccount})`
                        : `[${chosenCoa.code}] ${chosenCoa.name}`;
                      const creditLabel = editTxType === 'inflow'
                        ? `[${chosenCoa.code}] ${chosenCoa.name}`
                        : `[1110] Kas & Setara Kas (${editTxSourceAccount})`;
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 font-mono text-[10px]">
                          <div className="p-1.5 rounded bg-emerald-50/70 border border-emerald-200 text-emerald-900 flex justify-between items-center gap-2">
                            <span className="truncate"><strong>DEBIT:</strong> {debitLabel}</span>
                            <span className="font-bold shrink-0">{amtDisplay}</span>
                          </div>
                          <div className="p-1.5 rounded bg-slate-50 border border-slate-200 text-slate-800 flex justify-between items-center gap-2">
                            <span className="truncate"><strong>KREDIT:</strong> {creditLabel}</span>
                            <span className="font-bold shrink-0">{amtDisplay}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nominal Transaksi (Rp):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editTxAmount}
                  onChange={(e) => setEditTxAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold text-sm"
                />
                {Number(editTxAmount) > 0 && (
                  <div className="text-xs text-emerald-700 font-mono font-semibold mt-1">
                    {formatRupiah(Number(editTxAmount))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Sinkronisasi Saldo Rekening Bank & Jurnal COA Otomatis:
                </div>
                <div>
                  Sistem akan membatalkan dampak nominal transaksi lama, memperbarui voucher Jurnal Umum & saldo Bagan Akun (COA), serta mengalokasikan nominal baru ke rekening bank yang dipilih secara akurat tanpa duplikasi.
                </div>
              </div>

              {/* Fitur Keamanan: Generator Kwitansi Khusus dari Histori Transaksi Tersimpan */}
              <div className="p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Cetak Kwitansi Penerimaan Uang Resmi</div>
                    <div className="text-[11px] text-slate-600">Design resmi D'Kandang Farm (1:1), siap cetak & unduh PDF.</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentTxData: CashTransaction = {
                      ...editingTx,
                      date: editTxDate,
                      receivedDate: editTxReceivedDate || editTxDate,
                      referenceNo: editTxReference.trim() || editingTx.referenceNo,
                      type: editTxType,
                      category: editTxCategory,
                      incomeSource: editTxType === 'inflow' ? editTxIncomeSource : undefined,
                      paymentStage: editTxType === 'inflow' && editTxIncomeSource === 'school_visit' ? editTxPaymentStage : undefined,
                      description: editTxDescription.trim() || editingTx.description,
                      amount: Number(editTxAmount) || editingTx.amount,
                      sourceAccount: editTxSourceAccount,
                      status: editTxStatus,
                      linkedEntityName: editTxLinkedEntityName.trim() || undefined
                    };
                    setKwitansiTx(currentTxData);
                  }}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5" /> Buat Kwitansi Resmi
                </button>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const currentTxData: CashTransaction = {
                      ...editingTx,
                      date: editTxDate,
                      receivedDate: editTxReceivedDate || editTxDate,
                      referenceNo: editTxReference.trim() || editingTx.referenceNo,
                      type: editTxType,
                      category: editTxCategory,
                      incomeSource: editTxType === 'inflow' ? editTxIncomeSource : undefined,
                      paymentStage: editTxType === 'inflow' && editTxIncomeSource === 'school_visit' ? editTxPaymentStage : undefined,
                      description: editTxDescription.trim() || editingTx.description,
                      amount: Number(editTxAmount) || editingTx.amount,
                      sourceAccount: editTxSourceAccount,
                      status: editTxStatus,
                      linkedEntityName: editTxLinkedEntityName.trim() || undefined
                    };
                    setKwitansiTx(currentTxData);
                  }}
                  className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-orange-600" /> Cetak Kwitansi
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Histori Transaksi (Akses Khusus Super Admin & Direktur Utama) */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Hapus Histori Transaksi Kas</h3>
                <p className="text-xs text-rose-700 font-semibold">Otoritas Khusus Super Admin & Direktur Utama</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="text-slate-600">
                Apakah Anda yakin ingin menghapus data histori transaksi berikut?
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 font-mono">
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>{formatDate(deletingTx.date)}</span>
                  <span className="text-blue-700 font-bold">{deletingTx.referenceNo}</span>
                </div>
                <div className="text-slate-900 font-bold text-xs">{deletingTx.description}</div>
                {deletingTx.linkedEntityName && (
                  <div className="text-emerald-700 text-[11px] font-sans font-semibold">
                    Instansi: {deletingTx.linkedEntityName}
                  </div>
                )}
                <div className="text-slate-600 text-[11px]">
                  Rekening Bank: <span className="font-bold text-slate-800">{deletingTx.sourceAccount}</span>
                </div>
                <div className={`text-sm font-bold ${deletingTx.type === 'inflow' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {deletingTx.type === 'inflow' ? '+' : '-'}{formatRupiah(deletingTx.amount)}
                </div>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="font-bold">⚠️ Efek Pengembalian Saldo:</div>
                <div>
                  Saldo pada rekening <span className="font-semibold">{deletingTx.sourceAccount}</span> akan {deletingTx.type === 'inflow' ? 'dikurangi' : 'ditambahkan kembali'} sebesar <span className="font-bold">{formatRupiah(deletingTx.amount)}</span> untuk mengembalikan kondisi kas yang sebenarnya.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteTx}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Hapus Transaksi & Koreksi Saldo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Kwitansi Resmi D'Kandang Farm (Cetak & Unduh PDF) */}
      {kwitansiTx && (
        <KwitansiGeneratorModal
          transaction={kwitansiTx}
          onClose={() => setKwitansiTx(null)}
          currentUser={currentUser}
        />
      )}

      {/* Modal: Konfirmasi Hapus Seluruh Data Pengeluaran */}
      {showClearOutflowsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Hapus Semua Data Pengeluaran</h3>
                <p className="text-xs text-rose-700 font-semibold">
                  Pembersihan Kas Keluar, Jurnal Beban & Reset Anggaran
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="text-slate-600">
                Tindakan ini akan membersihkan seluruh data pengeluaran dari database Cloud Firestore & cache lokal:
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Total Baris Kas Keluar (`outflow`):</span>
                  <span className="font-bold font-mono text-rose-700">{outflowCount} Transaksi</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Total Nominal Pengeluaran:</span>
                  <span className="font-bold font-mono text-rose-700">{formatRupiah(totalOutflows)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Realisasi Anggaran (`spentAmount`):</span>
                  <span className="font-bold text-emerald-700">Direset ke Rp 0</span>
                </div>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
                <div className="font-bold">Rekalkulasi Saldo Otomatis:</div>
                <div>
                  Saldo seluruh Rekening Bank (`BCA Manajemen`, `BCA - IBU`, `BSI - IBU`, `FINANCE CASH`) dan Bagan Akun (`COA`) akan dihitung ulang murni dari sisa transaksi pemasukan (`inflow`) & mutasi. Data pemasukan tetap aman.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingOutflows}
                onClick={() => setShowClearOutflowsModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isClearingOutflows}
                onClick={async () => {
                  setIsClearingOutflows(true);
                  try {
                    await clearAllOutflowTransactions({ silent: false });
                    setShowClearOutflowsModal(false);
                  } finally {
                    setIsClearingOutflows(false);
                  }
                }}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded-xl text-xs shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isClearingOutflows ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus & Merekalkulasi...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Semua Pengeluaran</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hybrid Bulk Data Importer & Google Sheets Live Sync */}
      <DataImportSyncModal
        isOpen={showImportSyncModal}
        onClose={() => setShowImportSyncModal(false)}
      />

    </div>
  );
}
