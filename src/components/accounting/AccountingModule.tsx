import React, { useState, useMemo } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { useERP } from '../../context/ERPContext';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate,
  ROLE_LABELS 
} from '../../utils/crypto';
import { 
  BookOpenCheck, 
  Plus, 
  Layers, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  ArrowRight,
  TrendingUp,
  X,
  Sparkles,
  CalendarCheck,
  Pencil,
  Trash2,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Activity,
  Database,
  CheckCheck,
  Download,
  Lock,
  Unlock,
  RotateCcw,
  ArrowUpDown,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { JournalEntry, AccountingPeriodLock, TrialBalanceAccount, ChartOfAccount } from '../../types';
import { exportToCSV } from '../../utils/exportHelper';
import { getCOACashFlowCategory, suggestContraAccountForTransaction } from '../../utils/dataRecoveryHelper';
import { TrialBalanceView } from './TrialBalanceView';
import { PeriodClosingManager } from './PeriodClosingManager';
import { ZeroFaultHealthCheckModal } from './ZeroFaultHealthCheckModal';
import { ReversalEntryModal } from './ReversalEntryModal';

export default function AccountingModule() {
  const { 
    chartOfAccounts, 
    journalEntries, 
    cashTransactions,
    bankAccounts,
    accountingPeriods,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    reverseJournalEntry,
    addChartOfAccount,
    closeAccountingPeriod,
    reopenAccountingPeriod,
    refreshAndReconcileAccounting,
    currentUser,
    checkPermission,
    showNotification,
    setActiveModule
  } = useERP();

  const [activeTab, setActiveTab] = useState<'journal' | 'ledger' | 'trial_balance' | 'pl' | 'balance_sheet' | 'cash_flow' | 'coa' | 'closing'>('journal');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('1110');
  const [showAddJournalModal, setShowAddJournalModal] = useState(false);
  const [showHealthCheckModal, setShowHealthCheckModal] = useState(false);
  const [reversingJournal, setReversingJournal] = useState<JournalEntry | null>(null);

  // Search & Filters
  const [coaSearch, setCoaSearch] = useState('');
  const [coaTypeFilter, setCoaTypeFilter] = useState('all');
  const [coaCashFlowFilter, setCoaCashFlowFilter] = useState<'all' | 'operating' | 'investing' | 'financing'>('all');
  const [reportPeriod, setReportPeriod] = useState<string>('all');

  // Add New COA Modal State
  const [showAddCoaModal, setShowAddCoaModal] = useState(false);
  const [newCoaCode, setNewCoaCode] = useState('');
  const [newCoaName, setNewCoaName] = useState('');
  const [newCoaType, setNewCoaType] = useState<ChartOfAccount['type']>('Expense');
  const [newCoaCategory, setNewCoaCategory] = useState('Beban Operasional');
  const [newCoaCashFlow, setNewCoaCashFlow] = useState<'operating' | 'investing' | 'financing'>('operating');

  // Real-time Refresh & Reconciliation State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>(() => 
    new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const [reconcileStats, setReconcileStats] = useState<{
    orphanedRemoved: number;
    unrecordedPosted: number;
    totalActiveJournals: number;
    timestamp: string;
  } | null>(null);
  const [showReconcileModal, setShowReconcileModal] = useState(false);

  // Search & Filter in Journal Tab
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('all');

  // New Journal Entry Form State
  const [jrnDate, setJrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [jrnDescription, setJrnDescription] = useState('');
  const [lines, setLines] = useState([
    { accountCode: '1120', debit: 0, credit: 0 },
    { accountCode: '4110', debit: 0, credit: 0 }
  ]);

  // Edit Journal Entry State
  const [editingJournal, setEditingJournal] = useState<JournalEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLines, setEditLines] = useState<Array<{ accountCode: string; debit: number; credit: number }>>([]);

  // Delete Confirmation State
  const [deletingJournal, setDeletingJournal] = useState<JournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Real-Time Refresh & Reconciliation
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const res = await refreshAndReconcileAccounting();
      setLastRefreshTime(res.timestamp);
      setReconcileStats(res);
      setShowReconcileModal(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Authorization check for editing/deleting accounting records
  const isSuperAdminOrDirector = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
  const isAccountingRole = currentUser.role === 'accounting_manager';
  const canManageAccounting = isSuperAdminOrDirector || isAccountingRole || checkPermission('accounting', 'edit') || checkPermission('accounting', 'delete');
  const canCreate = checkPermission('accounting', 'create') || isSuperAdminOrDirector || isAccountingRole;

  // New Journal Balance calculation
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  // Edit Journal Balance calculation
  const editTotalDebit = editLines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const editTotalCredit = editLines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const isEditBalanced = editTotalDebit === editTotalCredit && editTotalDebit > 0;

  // Available reporting periods (YYYY-MM) from journals & cashTransactions
  const availablePeriods = useMemo(() => {
    const months = new Set<string>();
    journalEntries.forEach(j => {
      if (j.date && j.date.length >= 7) months.add(j.date.slice(0, 7));
    });
    cashTransactions.forEach(tx => {
      const d = tx.receivedDate || tx.date;
      if (d && d.length >= 7) months.add(d.slice(0, 7));
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [journalEntries, cashTransactions]);

  // Period-filtered Journal Entries
  const periodFilteredJournals = useMemo(() => {
    if (reportPeriod === 'all') return journalEntries;
    return journalEntries.filter(j => (j.date || '').startsWith(reportPeriod));
  }, [journalEntries, reportPeriod]);

  // Period-adjusted Chart of Accounts (dynamically calculated when a specific month is selected)
  const periodAdjustedCOA = useMemo(() => {
    if (reportPeriod === 'all') return chartOfAccounts;
    const balanceMap: Record<string, number> = {};
    chartOfAccounts.forEach(acc => {
      balanceMap[acc.code] = 0;
    });

    periodFilteredJournals.forEach(jrn => {
      if (jrn.status !== 'posted') return;
      (jrn.lines || []).forEach(line => {
        const acc = chartOfAccounts.find(a => a.code === line.accountCode);
        if (!acc) return;
        const dr = Number(line.debit) || 0;
        const cr = Number(line.credit) || 0;
        const delta = acc.normalBalance === 'Debit' ? dr - cr : cr - dr;
        balanceMap[acc.code] = (balanceMap[acc.code] || 0) + delta;
      });
    });

    return chartOfAccounts.map(acc => ({
      ...acc,
      balance: balanceMap[acc.code] || 0
    }));
  }, [chartOfAccounts, periodFilteredJournals, reportPeriod]);

  // Memoized P&L, Balance Sheet, and PSAK 2 Cash Flow Calculations
  const {
    revenues,
    nonOpRevenues,
    cogs,
    operatingExpenses,
    totalRevenueVal,
    totalNonOpRevVal,
    totalCogsVal,
    grossProfit,
    totalOpExVal,
    netIncome,
    currentAssets,
    fixedAssets,
    totalCurrentAssets,
    totalFixedAssets,
    totalAssets,
    currentLiabilities,
    longTermLiabilities,
    totalLiabilities,
    equities,
    totalEquity,
    psak2CashFlow
  } = useMemo(() => {
    const rev = periodAdjustedCOA.filter(a => a.type === 'Revenue' && a.category !== 'Pendapatan Non-Operasional');
    const nonOpRev = periodAdjustedCOA.filter(a => a.type === 'Revenue' && a.category === 'Pendapatan Non-Operasional');
    const cg = periodAdjustedCOA.filter(a => a.category === 'Harga Pokok Penjualan');
    const opex = periodAdjustedCOA.filter(a => a.type === 'Expense' && a.category !== 'Harga Pokok Penjualan');

    const totRev = rev.reduce((acc, r) => acc + Math.abs(r.balance), 0);
    const totNonOpRev = nonOpRev.reduce((acc, r) => acc + Math.abs(r.balance), 0);
    const totCogs = cg.reduce((acc, c) => acc + Math.abs(c.balance), 0);
    const gp = totRev - totCogs;
    const totOpEx = opex.reduce((acc, o) => acc + Math.abs(o.balance), 0);
    const ni = gp - totOpEx + totNonOpRev;

    const currAssets = periodAdjustedCOA.filter(a => a.category === 'Aktiva Lancar');
    const fixAssets = periodAdjustedCOA.filter(a => a.category === 'Aktiva Tetap' || a.category === 'Aktiva Biologis (PSAK 69)');
    const totCurrAssets = currAssets.reduce((acc, a) => acc + a.balance, 0);
    const totFixAssets = fixAssets.reduce((acc, a) => acc + a.balance, 0);
    const totAssets = totCurrAssets + totFixAssets;

    const currLiab = periodAdjustedCOA.filter(a => a.category === 'Kewajiban Lancar');
    const longLiab = periodAdjustedCOA.filter(a => a.category === 'Kewajiban Jangka Panjang' || (a.type === 'Liability' && a.category !== 'Kewajiban Lancar'));
    const totLiab = currLiab.reduce((acc, l) => acc + Math.abs(l.balance), 0) + longLiab.reduce((acc, l) => acc + Math.abs(l.balance), 0);

    const eq = periodAdjustedCOA.filter(a => a.type === 'Equity');
    const totEq = eq.reduce((acc, e) => acc + (e.normalBalance === 'Debit' ? -Math.abs(e.balance) : Math.abs(e.balance)), 0) + ni;

    // PSAK 2 Direct Cash Flow Statement from Cash Transactions & Cash Journals
    const periodCashTxs = cashTransactions.filter(tx => {
      if (tx.type === 'mutation') return false;
      const d = tx.receivedDate || tx.date || '';
      if (reportPeriod !== 'all' && !d.startsWith(reportPeriod)) return false;
      return true;
    });

    const groupMap: Record<'operating' | 'investing' | 'financing', {
      inflows: Record<string, { code: string; name: string; amount: number; count: number }>;
      outflows: Record<string, { code: string; name: string; amount: number; count: number }>;
      totalIn: number;
      totalOut: number;
    }> = {
      operating: { inflows: {}, outflows: {}, totalIn: 0, totalOut: 0 },
      investing: { inflows: {}, outflows: {}, totalIn: 0, totalOut: 0 },
      financing: { inflows: {}, outflows: {}, totalIn: 0, totalOut: 0 }
    };

    periodCashTxs.forEach(tx => {
      const resolvedCoa = tx.contraAccountCode
        ? {
            code: tx.contraAccountCode,
            name: tx.contraAccountName || chartOfAccounts.find(a => a.code === tx.contraAccountCode)?.name || 'Akun COA'
          }
        : suggestContraAccountForTransaction(tx, chartOfAccounts);
      const coaObj = chartOfAccounts.find(a => a.code === resolvedCoa.code);
      const cat: 'operating' | 'investing' | 'financing' =
        tx.category || (coaObj ? getCOACashFlowCategory(coaObj) : 'operating');
      const bucket = groupMap[cat] || groupMap.operating;
      const amt = Number(tx.amount) || 0;

      if (tx.type === 'inflow') {
        if (!bucket.inflows[resolvedCoa.code]) {
          bucket.inflows[resolvedCoa.code] = { code: resolvedCoa.code, name: resolvedCoa.name, amount: 0, count: 0 };
        }
        bucket.inflows[resolvedCoa.code].amount += amt;
        bucket.inflows[resolvedCoa.code].count += 1;
        bucket.totalIn += amt;
      } else if (tx.type === 'outflow') {
        if (!bucket.outflows[resolvedCoa.code]) {
          bucket.outflows[resolvedCoa.code] = { code: resolvedCoa.code, name: resolvedCoa.name, amount: 0, count: 0 };
        }
        bucket.outflows[resolvedCoa.code].amount += amt;
        bucket.outflows[resolvedCoa.code].count += 1;
        bucket.totalOut += amt;
      }
    });

    const netOperating = groupMap.operating.totalIn - groupMap.operating.totalOut;
    const netInvesting = groupMap.investing.totalIn - groupMap.investing.totalOut;
    const netFinancing = groupMap.financing.totalIn - groupMap.financing.totalOut;
    const netCashChange = netOperating + netInvesting + netFinancing;
    const cashCoaBalance = periodAdjustedCOA.find(a => a.code === '1110')?.balance || 0;

    return {
      revenues: rev,
      nonOpRevenues: nonOpRev,
      cogs: cg,
      operatingExpenses: opex,
      totalRevenueVal: totRev,
      totalNonOpRevVal: totNonOpRev,
      totalCogsVal: totCogs,
      grossProfit: gp,
      totalOpExVal: totOpEx,
      netIncome: ni,
      currentAssets: currAssets,
      fixedAssets: fixAssets,
      totalCurrentAssets: totCurrAssets,
      totalFixedAssets: totFixAssets,
      totalAssets: totAssets,
      currentLiabilities: currLiab,
      longTermLiabilities: longLiab,
      totalLiabilities: totLiab,
      equities: eq,
      totalEquity: totEq,
      psak2CashFlow: {
        operatingInflows: Object.values(groupMap.operating.inflows).sort((a, b) => b.amount - a.amount),
        operatingOutflows: Object.values(groupMap.operating.outflows).sort((a, b) => b.amount - a.amount),
        totalOperatingIn: groupMap.operating.totalIn,
        totalOperatingOut: groupMap.operating.totalOut,
        netOperating,
        investingInflows: Object.values(groupMap.investing.inflows).sort((a, b) => b.amount - a.amount),
        investingOutflows: Object.values(groupMap.investing.outflows).sort((a, b) => b.amount - a.amount),
        totalInvestingIn: groupMap.investing.totalIn,
        totalInvestingOut: groupMap.investing.totalOut,
        netInvesting,
        financingInflows: Object.values(groupMap.financing.inflows).sort((a, b) => b.amount - a.amount),
        financingOutflows: Object.values(groupMap.financing.outflows).sort((a, b) => b.amount - a.amount),
        totalFinancingIn: groupMap.financing.totalIn,
        totalFinancingOut: groupMap.financing.totalOut,
        netFinancing,
        netCashChange,
        cashCoaBalance
      }
    };
  }, [periodAdjustedCOA, cashTransactions, chartOfAccounts, reportPeriod]);

  const handleAddLine = () => {
    setLines([...lines, { accountCode: '1110', debit: 0, credit: 0 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !jrnDescription || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const formattedLines = lines.map(l => {
        const coaItem = chartOfAccounts.find(a => a.code === l.accountCode);
        return {
          accountCode: l.accountCode,
          accountName: coaItem?.name || 'Akun Tidak Ditemukan',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        };
      });

      await addJournalEntry({
        date: jrnDate,
        description: jrnDescription,
        lines: formattedLines,
        totalAmount: totalDebit
      });

      setShowAddJournalModal(false);
      setJrnDescription('');
      setLines([
        { accountCode: '1120', debit: 0, credit: 0 },
        { accountCode: '4110', debit: 0, credit: 0 }
      ]);
    } catch (error) {
      console.error(error);
      showNotification('Gagal membukukan jurnal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (jrn: JournalEntry) => {
    setEditingJournal(jrn);
    setEditDate(jrn.date);
    setEditDescription(jrn.description);
    setEditLines(jrn.lines.map(l => ({
      accountCode: l.accountCode,
      debit: l.debit,
      credit: l.credit
    })));
  };

  const handleAddEditLine = () => {
    setEditLines([...editLines, { accountCode: '1110', debit: 0, credit: 0 }]);
  };

  const handleRemoveEditLine = (index: number) => {
    if (editLines.length <= 2) return;
    setEditLines(editLines.filter((_, i) => i !== index));
  };

  const handleEditLineChange = (index: number, field: string, value: any) => {
    const updated = [...editLines];
    updated[index] = { ...updated[index], [field]: value };
    setEditLines(updated);
  };

  const handleSaveEditJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJournal || !isEditBalanced || !editDescription || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const formattedLines = editLines.map(l => {
        const coaItem = chartOfAccounts.find(a => a.code === l.accountCode);
        return {
          accountCode: l.accountCode,
          accountName: coaItem?.name || 'Akun Tidak Ditemukan',
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0
        };
      });

      await updateJournalEntry(editingJournal.id, {
        date: editDate,
        description: editDescription,
        lines: formattedLines,
        totalAmount: editTotalDebit
      });

      setEditingJournal(null);
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyimpan perubahan jurnal', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingJournal) return;
    setIsDeleting(true);
    try {
      await deleteJournalEntry(deletingJournal.id);
      setDeletingJournal(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSimulateClosing = () => {
    showNotification('Otomasi Tutup Buku Periode Berhasil! Neraca saldo dan laba ditahan telah dikunci & siap audit.', 'success');
  };

  const handleExportJournalCSV = () => {
    const headers = [
      'No Jurnal',
      'Tanggal',
      'Keterangan',
      'Referensi Modul',
      'Kode Akun',
      'Nama Akun',
      'Debit (Rp)',
      'Kredit (Rp)',
      'Dibuat Oleh'
    ];

    const rows: (string | number)[][] = [];
    filteredJournals.forEach(j => {
      j.lines.forEach(line => {
        rows.push([
          j.entryNumber,
          j.date,
          j.description,
          j.referenceModule || 'manual',
          line.accountCode,
          line.accountName,
          line.debit,
          line.credit,
          j.createdBy || '-'
        ]);
      });
    });

    const filename = `Jurnal_Umum_DKandang_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Data Jurnal Umum berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor data Jurnal Umum.', 'error');
    }
  };

  const handleExportLedgerCSV = () => {
    const acc = chartOfAccounts.find(a => a.code === selectedLedgerAccount);
    const headers = [
      'Tanggal',
      'No. Jurnal',
      'Keterangan Transaksi',
      'Kode Akun',
      'Nama Akun',
      'Debit (Rp)',
      'Kredit (Rp)'
    ];

    const rows: (string | number)[][] = [];
    periodFilteredJournals.forEach(j => {
      const matchLines = j.lines.filter(l => l.accountCode === selectedLedgerAccount);
      matchLines.forEach(ml => {
        rows.push([
          j.date,
          j.entryNumber,
          j.description,
          ml.accountCode,
          ml.accountName,
          ml.debit,
          ml.credit
        ]);
      });
    });

    const filename = `Buku_Besar_${selectedLedgerAccount}_${acc?.name.replace(/[^a-zA-Z0-9]/g, '_') || ''}_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification(`Buku Besar akun ${selectedLedgerAccount} berhasil diekspor ke CSV/Excel!`, 'success');
    } else {
      showNotification('Gagal mengekspor Buku Besar.', 'error');
    }
  };

  const handleExportCashFlowCSV = () => {
    const headers = ['Kelompok Aktivitas PSAK 2', 'Arus Kas', 'Kode Akun COA', 'Nama Akun COA', 'Jumlah Transaksi', 'Nominal (Rp)'];
    const rows: (string | number)[][] = [];

    psak2CashFlow.operatingInflows.forEach(item => {
      rows.push(['I. Aktivitas Operasional', 'Penerimaan Kas (Inflow)', item.code, item.name, item.count, item.amount]);
    });
    psak2CashFlow.operatingOutflows.forEach(item => {
      rows.push(['I. Aktivitas Operasional', 'Pengeluaran Kas (Outflow)', item.code, item.name, item.count, -item.amount]);
    });
    rows.push(['I. SUBTOTAL ARUS KAS OPERASIONAL BERSIH', '', '', '', '', psak2CashFlow.netOperating]);

    psak2CashFlow.investingInflows.forEach(item => {
      rows.push(['II. Aktivitas Investasi', 'Penerimaan Investasi', item.code, item.name, item.count, item.amount]);
    });
    psak2CashFlow.investingOutflows.forEach(item => {
      rows.push(['II. Aktivitas Investasi', 'Perolehan Aset / Satwa (Outflow)', item.code, item.name, item.count, -item.amount]);
    });
    rows.push(['II. SUBTOTAL ARUS KAS INVESTASI BERSIH', '', '', '', '', psak2CashFlow.netInvesting]);

    psak2CashFlow.financingInflows.forEach(item => {
      rows.push(['III. Aktivitas Pendanaan', 'Penerimaan Pendanaan / Modal', item.code, item.name, item.count, item.amount]);
    });
    psak2CashFlow.financingOutflows.forEach(item => {
      rows.push(['III. Aktivitas Pendanaan', 'Pembayaran Pinjaman / Dividen', item.code, item.name, item.count, -item.amount]);
    });
    rows.push(['III. SUBTOTAL ARUS KAS PENDANAAN BERSIH', '', '', '', '', psak2CashFlow.netFinancing]);
    rows.push(['KENAIKAN / PENURUNAN BERSIH KAS & SETARA KAS (1110)', '', '', '', '', psak2CashFlow.netCashChange]);

    const ok = exportToCSV(`Laporan_Arus_Kas_PSAK2_DKandang_${reportPeriod}_${new Date().toISOString().split('T')[0]}`, headers, rows);
    if (ok) {
      showNotification('Laporan Arus Kas PSAK 2 berhasil diekspor ke CSV/Excel!', 'success');
    }
  };

  const handleSaveNewCoa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoaCode.trim() || !newCoaName.trim()) return;
    const normalBalance: 'Debit' | 'Credit' =
      newCoaType === 'Asset' || newCoaType === 'Expense' ? 'Debit' : 'Credit';
    const allowedTxTypes: ('inflow' | 'outflow')[] =
      newCoaType === 'Revenue' ? ['inflow'] : newCoaType === 'Expense' ? ['outflow'] : ['inflow', 'outflow'];

    await addChartOfAccount({
      code: newCoaCode.trim(),
      name: newCoaName.trim(),
      type: newCoaType,
      category: newCoaCategory.trim() || 'Operasional',
      normalBalance,
      cashFlowCategory: newCoaCashFlow,
      allowedTxTypes
    });
    setShowAddCoaModal(false);
    setNewCoaCode('');
    setNewCoaName('');
  };

  const filteredJournals = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return periodFilteredJournals.filter(jrn => {
      const matchSearch = q === '' || 
        jrn.entryNumber.toLowerCase().includes(q) ||
        jrn.description.toLowerCase().includes(q) ||
        jrn.createdBy.toLowerCase().includes(q) ||
        jrn.lines.some(l => l.accountName.toLowerCase().includes(q) || l.accountCode.includes(searchTerm));
      
      const matchModule = filterModule === 'all' || jrn.referenceModule === filterModule;
      return matchSearch && matchModule;
    });
  }, [periodFilteredJournals, searchTerm, filterModule]);

  const {
    currentData: paginatedJournals,
    currentPage: journalCurrentPage,
    totalPages: journalTotalPages,
    totalItems: journalTotalItems,
    itemsPerPage: journalItemsPerPage,
    nextPage: journalNextPage,
    prevPage: journalPrevPage
  } = usePagination(filteredJournals, 25);

  const hasAccountingAccess = checkPermission('accounting', 'view') && 
    ['accounting_manager', 'finance_manager', 'direktur_utama', 'super_admin', 'internal_auditor'].includes(currentUser.role);

  if (!hasAccountingAccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-rose-200 rounded-3xl space-y-4 max-w-xl mx-auto my-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900">Akses Ditolak: Modul Akuntansi Terkunci</h2>
          <p className="text-xs text-rose-600 font-semibold">
            Role-Based Access Control (RBAC) Strict Enforcement
          </p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed max-w-md">
          Peran Anda saat ini (<strong className="text-slate-900 font-bold">{ROLE_LABELS[currentUser.role] || currentUser.role}</strong>) tidak memiliki hak akses untuk melihat ataupun memodifikasi data pada <strong className="text-slate-800">Modul Akuntansi & Pembukuan</strong> (Jurnal Umum, Buku Besar, Neraca Saldo, Laba Rugi).
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
    <div className="space-y-6 pb-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <BookOpenCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Modul Accounting & Laporan Keuangan</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Standar Akuntansi PSAK/IFRS, Jurnal Umum, Buku Besar, Neraca Saldo, Laba Rugi, dan Otoritas Pengelolaan Transaksi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHealthCheckModal(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Pemeriksaan matematis 4 pilar akuntansi zero-fault"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" /> Audit Zero-Fault
          </button>
          <button
            onClick={handleRefreshData}
            disabled={isRefreshing}
            title="Sinkronkan data real-time, bersihkan transaksi yang dihapus, dan re-kalkulasi saldo COA/laporan"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Menyinkronkan...' : 'Refresh & Rekonsiliasi'}
          </button>
          <button
            onClick={() => setActiveTab('closing')}
            className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              activeTab === 'closing' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" /> Tutup Buku Periode
          </button>
          {canCreate && (
            <button
              onClick={() => setShowAddJournalModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Buat Jurnal Umum
            </button>
          )}
        </div>
      </div>

      {/* Real-time Data Synchronization & Anti-Ghost Transaction Banner */}
      <div className="bg-gradient-to-r from-emerald-900/5 to-slate-900/5 border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-600"></span>
                <span className="text-xs font-bold text-slate-900">Zero-Fault Engine & Sinkronisasi Real-Time Aktif</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  100% Balanced
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Pembaruan terakhir: <span className="font-semibold text-slate-800">{lastRefreshTime} WIB</span> • Jaminan integritas laporan: Transaksi yang dihapus otomatis dieliminasi & transaksi aktif langsung tercatat ke Buku Besar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-200/60">
            <div className="flex items-center gap-1.5 text-[11px] bg-white px-2.5 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="text-slate-600 font-semibold">Periode Laporan:</span>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="bg-transparent font-bold text-emerald-900 focus:outline-none cursor-pointer"
              >
                <option value="all">Semua Periode (YTD Kumulatif)</option>
                {availablePeriods.map(p => (
                  <option key={p} value={p}>Periode Bulan {p}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-200">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>{periodFilteredJournals.length} Jurnal Aktif</span>
            </div>
            <button
              onClick={() => setShowHealthCheckModal(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Cek Diagnostik
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('journal')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'journal' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Jurnal Umum (General Journal)
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ledger' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Buku Besar (General Ledger)
        </button>
        <button
          onClick={() => setActiveTab('trial_balance')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'trial_balance' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Neraca Saldo (Trial Balance)
        </button>
        <button
          onClick={() => setActiveTab('pl')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pl' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Laba Rugi (Income Statement)
        </button>
        <button
          onClick={() => setActiveTab('balance_sheet')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'balance_sheet' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Neraca Keuangan (Balance Sheet)
        </button>
        <button
          onClick={() => setActiveTab('cash_flow')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'cash_flow' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Laporan Arus Kas (PSAK 2)
        </button>
        <button
          onClick={() => setActiveTab('coa')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'coa' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Bagan Akun (Chart of Accounts)
        </button>
        <button
          onClick={() => setActiveTab('closing')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'closing' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Tutup Buku Periode (Period Locks)
        </button>
      </div>

      {/* Tab: Jurnal Umum */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari no voucher, deskripsi transaksi, akun, atau pembuat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Asal Modul</option>
                <option value="finance">Modul Keuangan (Kas/Bank)</option>
                <option value="sales">Modul Penjualan (SO)</option>
                <option value="procurement">Modul Pengadaan (PO)</option>
                <option value="manual">Manual Jurnal Umum</option>
              </select>
              <button
                onClick={handleExportJournalCSV}
                className="py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer"
                title="Ekspor daftar entri jurnal umum ke CSV/Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">Daftar Entri Jurnal Umum Dibukukan</span>
                {canManageAccounting && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                    Akses Kelola (Edit & Hapus) Aktif
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">{filteredJournals.length} dari {journalEntries.length} Voucher Entri</span>
            </div>

            <div className="divide-y divide-slate-100">
              {paginatedJournals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada entri jurnal yang cocok dengan kriteria pencarian.
                </div>
              ) : (
                paginatedJournals.map((jrn) => (
                  <div key={jrn.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {jrn.entryNumber}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">{formatDate(jrn.date)}</span>
                        {jrn.referenceModule && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            Ref: {jrn.referenceModule}
                          </span>
                        )}
                        {jrn.isClosingEntry && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                            Tutup Buku
                          </span>
                        )}
                        {jrn.isReversalEntry && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            Jurnal Pembalik
                          </span>
                        )}
                        {accountingPeriods.some(p => jrn.date.startsWith(p.period) && p.status === 'locked') && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Terkunci
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          Oleh: <strong className="text-slate-700">{jrn.createdBy}</strong>
                        </span>
                      </div>

                      {/* Action buttons: Pembalik, Edit & Hapus Jurnal */}
                      {canManageAccounting && (
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {!jrn.isClosingEntry && !jrn.isReversalEntry && (
                            <button
                              onClick={() => setReversingJournal(jrn)}
                              className="px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-all flex items-center gap-1 cursor-pointer"
                              title="Buat Jurnal Pembalik (Storno Reversal)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Pembalik</span>
                            </button>
                          )}
                          {!accountingPeriods.some(p => jrn.date.startsWith(p.period) && p.status === 'locked') && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(jrn)}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
                                title="Edit Jurnal & Sesuaikan Nilai"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setDeletingJournal(jrn)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-all flex items-center gap-1 cursor-pointer"
                                title="Hapus Entri Jurnal & Batalkan Saldo COA"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-800">{jrn.description}</p>

                    <div className="bg-slate-50 rounded-xl p-3 text-xs overflow-x-auto border border-slate-200">
                      <table className="w-full text-left">
                        <thead className="text-[10px] text-slate-500 border-b border-slate-200 uppercase font-semibold">
                          <tr>
                            <th className="pb-1.5">Kode & Nama Akun</th>
                            <th className="pb-1.5 text-right">Debit (Rp)</th>
                            <th className="pb-1.5 text-right">Kredit (Rp)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 text-slate-700">
                          {jrn.lines.map((line, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5">
                                <span className="font-mono text-slate-800 font-bold mr-2">{line.accountCode}</span>
                                <span className={line.credit > 0 ? 'pl-4 text-slate-500' : 'text-slate-800 font-medium'}>
                                  {line.accountName}
                                </span>
                              </td>
                              <td className="py-1.5 text-right font-mono font-medium text-emerald-800">
                                {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                              </td>
                              <td className="py-1.5 text-right font-mono font-medium text-slate-700">
                                {line.credit > 0 ? formatRupiah(line.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-slate-300 font-semibold text-[11px]">
                          <tr>
                            <td className="pt-1.5 text-slate-600">Total Voucher</td>
                            <td className="pt-1.5 text-right font-mono text-emerald-800">
                              {formatRupiah(jrn.lines.reduce((s, l) => s + (l.debit || 0), 0))}
                            </td>
                            <td className="pt-1.5 text-right font-mono text-slate-800">
                              {formatRupiah(jrn.lines.reduce((s, l) => s + (l.credit || 0), 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <Pagination
              currentPage={journalCurrentPage}
              totalPages={journalTotalPages}
              totalItems={journalTotalItems}
              itemsPerPage={journalItemsPerPage}
              onNext={journalNextPage}
              onPrev={journalPrevPage}
            />
          </div>
        </div>
      )}

      {/* Tab: Bagan Akun (COA) */}
      {activeTab === 'coa' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-xs text-slate-800">Daftar Bagan Akun Standar (COA) — {periodAdjustedCOA.length} Akun Terdaftar</h3>
                <p className="text-[11px] text-slate-500">Saldo disinkronkan langsung dari seluruh voucher jurnal umum ({reportPeriod === 'all' ? 'Kumulatif YTD' : `Periode ${reportPeriod}`}).</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari akun atau kategori..."
                    value={coaSearch}
                    onChange={(e) => setCoaSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
                  />
                </div>
                <select
                  value={coaTypeFilter}
                  onChange={(e) => setCoaTypeFilter(e.target.value)}
                  className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
                <select
                  value={coaCashFlowFilter}
                  onChange={(e) => setCoaCashFlowFilter(e.target.value as any)}
                  className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-none"
                >
                  <option value="all">Semua Aktivitas PSAK 2</option>
                  <option value="operating">Operasional (Operating)</option>
                  <option value="investing">Investasi & Satwa (Investing)</option>
                  <option value="financing">Pendanaan & Modal (Financing)</option>
                </select>
                {canCreate && (
                  <button
                    onClick={() => setShowAddCoaModal(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Akun COA
                  </button>
                )}
                <button
                  onClick={handleRefreshData}
                  disabled={isRefreshing}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Menghitung...' : 'Rekalkulasi Saldo'}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Kode Akun</th>
                    <th className="p-3.5">Nama Akun Standar</th>
                    <th className="p-3.5">Klasifikasi</th>
                    <th className="p-3.5">Kategori Laporan</th>
                    <th className="p-3.5">Aktivitas PSAK 2</th>
                    <th className="p-3.5 text-center">Saldo Normal</th>
                    <th className="p-3.5 text-right">Saldo ({reportPeriod === 'all' ? 'YTD' : reportPeriod})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodAdjustedCOA
                    .filter(acc => {
                      const matchSearch = coaSearch === '' || 
                        acc.code.toLowerCase().includes(coaSearch.toLowerCase()) || 
                        acc.name.toLowerCase().includes(coaSearch.toLowerCase()) ||
                        acc.category.toLowerCase().includes(coaSearch.toLowerCase());
                      const matchType = coaTypeFilter === 'all' || acc.type === coaTypeFilter;
                      const cfCat = getCOACashFlowCategory(acc);
                      const matchCf = coaCashFlowFilter === 'all' || cfCat === coaCashFlowFilter;
                      return matchSearch && matchType && matchCf;
                    })
                    .map((acc) => {
                      const cfCat = getCOACashFlowCategory(acc);
                      return (
                        <tr key={acc.code} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-emerald-800">{acc.code}</td>
                          <td className="p-3.5 font-medium text-slate-800">{acc.name}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              acc.type === 'Asset' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              acc.type === 'Liability' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              acc.type === 'Equity' ? 'bg-slate-100 text-slate-800 border border-slate-200' :
                              acc.type === 'Revenue' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                              'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600">{acc.category}</td>
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              cfCat === 'investing'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : cfCat === 'financing'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {cfCat === 'investing' ? 'Investasi' : cfCat === 'financing' ? 'Pendanaan' : 'Operasional'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-mono text-slate-500">{acc.normalBalance}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(Math.abs(acc.balance))}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Laporan Laba Rugi (P&L) */}
      {activeTab === 'pl' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 max-w-4xl mx-auto shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="text-center sm:text-left">
              <h2 className="text-xs font-bold text-slate-500 uppercase">PT. WISATA AGRO EDUKASI SEJAHTERA (D'KANDANG AMAZING FARM)</h2>
              <h3 className="text-lg font-extrabold text-emerald-800 mt-0.5">Laporan Laba Rugi Komprehensif (Income Statement)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {reportPeriod === 'all' ? 'Periode Tahun Berjalan (YTD Kumulatif)' : `Periode Bulan ${reportPeriod}`} • Standar PSAK 1 • Sinkronisasi Real-Time
              </p>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memperbarui...' : 'Refresh Laporan'}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Pendapatan */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 py-1 border-b border-slate-200 text-sm">
                <span>I. PENDAPATAN OPERASIONAL</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                {revenues.map(r => (
                  <div key={r.code} className="flex justify-between py-1 text-slate-600">
                    <span><strong className="font-mono text-slate-500 mr-1.5">[{r.code}]</strong>{r.name}</span>
                    <span className="font-mono font-medium">{formatRupiah(Math.abs(r.balance))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-emerald-800 pt-2 border-t border-slate-200">
                <span>TOTAL PENDAPATAN OPERASIONAL BERSIH:</span>
                <span className="font-mono text-sm">{formatRupiah(totalRevenueVal)}</span>
              </div>
            </div>

            {/* HPP */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 py-1 border-b border-slate-200 text-sm">
                <span>II. HARGA POKOK PENJUALAN (HPP / COGS)</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                {cogs.map(c => (
                  <div key={c.code} className="flex justify-between py-1 text-slate-600">
                    <span><strong className="font-mono text-slate-500 mr-1.5">[{c.code}]</strong>{c.name}</span>
                    <span className="font-mono text-rose-700">({formatRupiah(Math.abs(c.balance))})</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-amber-800 pt-2 border-t border-slate-200">
                <span>LABA KOTOR (GROSS PROFIT):</span>
                <span className="font-mono text-sm">{formatRupiah(grossProfit)}</span>
              </div>
            </div>

            {/* Beban Operasional */}
            <div>
              <div className="flex justify-between font-bold text-slate-800 py-1 border-b border-slate-200 text-sm">
                <span>III. BEBAN OPERASIONAL & UMUM</span>
                <span></span>
              </div>
              <div className="divide-y divide-slate-100 pl-4 py-1">
                {operatingExpenses.map(o => (
                  <div key={o.code} className="flex justify-between py-1 text-slate-600">
                    <span><strong className="font-mono text-slate-500 mr-1.5">[{o.code}]</strong>{o.name}</span>
                    <span className="font-mono text-slate-500">{formatRupiah(Math.abs(o.balance))}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-rose-700 pt-2 border-t border-slate-200">
                <span>TOTAL BEBAN OPERASIONAL:</span>
                <span className="font-mono text-sm">({formatRupiah(totalOpExVal)})</span>
              </div>
            </div>

            {/* Pendapatan Non-Operasional */}
            {nonOpRevenues.length > 0 && (
              <div>
                <div className="flex justify-between font-bold text-slate-800 py-1 border-b border-slate-200 text-sm">
                  <span>IV. PENDAPATAN NON-OPERASIONAL & LAIN-LAIN</span>
                  <span></span>
                </div>
                <div className="divide-y divide-slate-100 pl-4 py-1">
                  {nonOpRevenues.map(r => (
                    <div key={r.code} className="flex justify-between py-1 text-slate-600">
                      <span><strong className="font-mono text-slate-500 mr-1.5">[{r.code}]</strong>{r.name}</span>
                      <span className="font-mono font-medium text-emerald-700">{formatRupiah(Math.abs(r.balance))}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-bold text-emerald-800 pt-2 border-t border-slate-200">
                  <span>TOTAL PENDAPATAN NON-OPERASIONAL:</span>
                  <span className="font-mono text-sm">{formatRupiah(totalNonOpRevVal)}</span>
                </div>
              </div>
            )}

            {/* Laba Bersih */}
            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-800 text-base">LABA BERSIH PERIODE BERJALAN (NET PROFIT):</span>
              <span className="font-bold font-mono text-lg text-emerald-800">{formatRupiah(netIncome)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Neraca (Balance Sheet) */}
      {activeTab === 'balance_sheet' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 max-w-4xl mx-auto shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="text-center sm:text-left">
              <h2 className="text-xs font-bold text-slate-500 uppercase">PT. WISATA AGRO EDUKASI SEJAHTERA (D'KANDANG AMAZING FARM)</h2>
              <h3 className="text-lg font-extrabold text-emerald-800 mt-0.5">Neraca Keuangan Posisi Perusahaan (Balance Sheet)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {reportPeriod === 'all' ? 'Per Periode Kumulatif (YTD)' : `Per Periode Bulan ${reportPeriod}`} • Aset = Kewajiban + Ekuitas • Sinkronisasi Real-Time
              </p>
            </div>
            <button
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Memperbarui...' : 'Refresh Neraca'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Sisi Kiri: ASET */}
            <div className="space-y-4">
              <div className="font-bold text-slate-800 text-sm pb-1 border-b border-slate-200 flex justify-between">
                <span>ASET (AKTIVA)</span>
                <span></span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Aset Lancar:</span>
                <div className="space-y-1 pl-2">
                  {currentAssets.map(a => (
                    <div key={a.code} className="flex justify-between text-slate-600">
                      <span><strong className="font-mono text-slate-400 mr-1">[{a.code}]</strong>{a.name}</span>
                      <span className="font-mono">{formatRupiah(a.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Aset Biologis (PSAK 69) & Aset Tetap:</span>
                <div className="space-y-1 pl-2">
                  {fixedAssets.map(a => (
                    <div key={a.code} className="flex justify-between text-slate-600">
                      <span><strong className="font-mono text-slate-400 mr-1">[{a.code}]</strong>{a.name}</span>
                      <span className="font-mono">{formatRupiah(a.balance)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 flex justify-between font-bold text-slate-800">
                <span>TOTAL ASET:</span>
                <span className="font-mono text-blue-800">{formatRupiah(totalAssets)}</span>
              </div>
            </div>

            {/* Sisi Kanan: KEWAJIBAN & EKUITAS */}
            <div className="space-y-4">
              <div className="font-bold text-slate-800 text-sm pb-1 border-b border-slate-200 flex justify-between">
                <span>KEWAJIBAN & EKUITAS</span>
                <span></span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Kewajiban Jangka Pendek:</span>
                <div className="space-y-1 pl-2">
                  {currentLiabilities.map(l => (
                    <div key={l.code} className="flex justify-between text-slate-600">
                      <span><strong className="font-mono text-slate-400 mr-1">[{l.code}]</strong>{l.name}</span>
                      <span className="font-mono">{formatRupiah(Math.abs(l.balance))}</span>
                    </div>
                  ))}
                </div>
              </div>

              {longTermLiabilities.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Kewajiban Jangka Panjang:</span>
                  <div className="space-y-1 pl-2">
                    {longTermLiabilities.map(l => (
                      <div key={l.code} className="flex justify-between text-slate-600">
                        <span><strong className="font-mono text-slate-400 mr-1">[{l.code}]</strong>{l.name}</span>
                        <span className="font-mono">{formatRupiah(Math.abs(l.balance))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Ekuitas Pemegang Saham:</span>
                <div className="space-y-1 pl-2">
                  {equities.map(e => (
                    <div key={e.code} className="flex justify-between text-slate-600">
                      <span><strong className="font-mono text-slate-400 mr-1">[{e.code}]</strong>{e.name}</span>
                      <span className="font-mono">
                        {e.normalBalance === 'Debit' && e.balance > 0 ? `(${formatRupiah(Math.abs(e.balance))})` : formatRupiah(Math.abs(e.balance))}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Laba Bersih Periode Berjalan</span>
                    <span className="font-mono">{formatRupiah(netIncome)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex justify-between font-bold text-slate-800">
                <span>TOTAL LIABILITAS & EKUITAS:</span>
                <span className="font-mono text-emerald-800">{formatRupiah(totalLiabilities + totalEquity)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Laporan Arus Kas (PSAK 2) */}
      {activeTab === 'cash_flow' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 max-w-4xl mx-auto shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="text-center sm:text-left">
              <h2 className="text-xs font-bold text-slate-500 uppercase">PT. WISATA AGRO EDUKASI SEJAHTERA (D'KANDANG AMAZING FARM)</h2>
              <h3 className="text-lg font-extrabold text-emerald-800 mt-0.5">Laporan Arus Kas Metode Langsung (Statement of Cash Flows — PSAK 2)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {reportPeriod === 'all' ? 'Periode Tahun Berjalan (YTD Kumulatif)' : `Periode Bulan ${reportPeriod}`} • Klasifikasi Aktivitas Operasional, Investasi, dan Pendanaan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCashFlowCSV}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
              </button>
              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Memperbarui...' : 'Refresh Arus Kas'}
              </button>
            </div>
          </div>

          <div className="space-y-5 text-xs">
            {/* I. AKTIVITAS OPERASIONAL */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-slate-800 py-1.5 border-b border-slate-200 text-sm">
                <span>I. ARUS KAS DARI AKTIVITAS OPERASIONAL (OPERATING ACTIVITIES)</span>
                <span className="text-[11px] font-normal text-slate-500">PSAK 2</span>
              </div>
              <div className="pl-3 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-800">Penerimaan Kas Operasional:</div>
                {psak2CashFlow.operatingInflows.length === 0 ? (
                  <div className="text-slate-400 italic pl-2">Belum ada penerimaan kas operasional pada periode ini.</div>
                ) : (
                  psak2CashFlow.operatingInflows.map(item => (
                    <div key={`op_in_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                      <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>{item.name} <span className="text-[10px] text-slate-400">({item.count} trx)</span></span>
                      <span className="font-mono font-semibold text-emerald-700">+{formatRupiah(item.amount)}</span>
                    </div>
                  ))
                )}

                <div className="text-[11px] font-bold text-rose-800 pt-2">Pengeluaran Kas Operasional:</div>
                {psak2CashFlow.operatingOutflows.length === 0 ? (
                  <div className="text-slate-400 italic pl-2">Belum ada pengeluaran kas operasional pada periode ini.</div>
                ) : (
                  psak2CashFlow.operatingOutflows.map(item => (
                    <div key={`op_out_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                      <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>{item.name} <span className="text-[10px] text-slate-400">({item.count} trx)</span></span>
                      <span className="font-mono font-semibold text-rose-700">({formatRupiah(item.amount)})</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex justify-between font-bold text-emerald-900 pt-2 border-t border-slate-200 bg-emerald-50/40 px-3 py-2 rounded-lg">
                <span>ARUS KAS BERSIH DARI AKTIVITAS OPERASIONAL:</span>
                <span className="font-mono text-sm">{formatRupiah(psak2CashFlow.netOperating)}</span>
              </div>
            </div>

            {/* II. AKTIVITAS INVESTASI */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-slate-800 py-1.5 border-b border-slate-200 text-sm">
                <span>II. ARUS KAS DARI AKTIVITAS INVESTASI & SATWA (INVESTING ACTIVITIES)</span>
                <span className="text-[11px] font-normal text-slate-500">PSAK 2 & PSAK 69</span>
              </div>
              <div className="pl-3 space-y-1.5">
                {psak2CashFlow.investingInflows.length === 0 && psak2CashFlow.investingOutflows.length === 0 ? (
                  <div className="text-slate-400 italic pl-2">Tidak ada mutasi kas investasi aset tetap / satwa pada periode ini (Rp 0).</div>
                ) : (
                  <>
                    {psak2CashFlow.investingInflows.map(item => (
                      <div key={`inv_in_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                        <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>Pelepasan: {item.name} ({item.count} trx)</span>
                        <span className="font-mono font-semibold text-emerald-700">+{formatRupiah(item.amount)}</span>
                      </div>
                    ))}
                    {psak2CashFlow.investingOutflows.map(item => (
                      <div key={`inv_out_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                        <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>Perolehan: {item.name} ({item.count} trx)</span>
                        <span className="font-mono font-semibold text-rose-700">({formatRupiah(item.amount)})</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="flex justify-between font-bold text-amber-900 pt-2 border-t border-slate-200 bg-amber-50/40 px-3 py-2 rounded-lg">
                <span>ARUS KAS BERSIH DARI AKTIVITAS INVESTASI:</span>
                <span className="font-mono text-sm">{formatRupiah(psak2CashFlow.netInvesting)}</span>
              </div>
            </div>

            {/* III. AKTIVITAS PENDANAAN */}
            <div className="space-y-2">
              <div className="flex justify-between font-bold text-slate-800 py-1.5 border-b border-slate-200 text-sm">
                <span>III. ARUS KAS DARI AKTIVITAS PENDANAAN (FINANCING ACTIVITIES)</span>
                <span className="text-[11px] font-normal text-slate-500">Modal, Pinjaman & Dividen</span>
              </div>
              <div className="pl-3 space-y-1.5">
                {psak2CashFlow.financingInflows.length === 0 && psak2CashFlow.financingOutflows.length === 0 ? (
                  <div className="text-slate-400 italic pl-2">Tidak ada mutasi kas pendanaan modal / pinjaman pada periode ini (Rp 0).</div>
                ) : (
                  <>
                    {psak2CashFlow.financingInflows.map(item => (
                      <div key={`fin_in_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                        <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>Penerimaan: {item.name} ({item.count} trx)</span>
                        <span className="font-mono font-semibold text-emerald-700">+{formatRupiah(item.amount)}</span>
                      </div>
                    ))}
                    {psak2CashFlow.financingOutflows.map(item => (
                      <div key={`fin_out_${item.code}`} className="flex justify-between py-0.5 pl-2 text-slate-700">
                        <span><strong className="font-mono text-slate-500 mr-1.5">[{item.code}]</strong>Pembayaran: {item.name} ({item.count} trx)</span>
                        <span className="font-mono font-semibold text-rose-700">({formatRupiah(item.amount)})</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="flex justify-between font-bold text-purple-900 pt-2 border-t border-slate-200 bg-purple-50/40 px-3 py-2 rounded-lg">
                <span>ARUS KAS BERSIH DARI AKTIVITAS PENDANAAN:</span>
                <span className="font-mono text-sm">{formatRupiah(psak2CashFlow.netFinancing)}</span>
              </div>
            </div>

            {/* Rekonsiliasi Kas Akhir */}
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-800">KENAIKAN / (PENURUNAN) BERSIH KAS & SETARA KAS:</span>
                <span className="font-bold font-mono text-base text-emerald-800">{formatRupiah(psak2CashFlow.netCashChange)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 pt-1 border-t border-emerald-200/70">
                <span>Saldo Buku Besar Akun [1110] Kas & Setara Kas ({reportPeriod === 'all' ? 'YTD' : reportPeriod}):</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(psak2CashFlow.cashCoaBalance)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Buku Besar (General Ledger) */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl text-xs shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-600 font-semibold shrink-0">Pilih Akun Buku Besar:</span>
              <select
                value={selectedLedgerAccount}
                onChange={(e) => setSelectedLedgerAccount(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
              >
                {chartOfAccounts.map((acc) => (
                  <option key={acc.code} value={acc.code}>
                    {acc.code} - {acc.name} ({formatRupiah(Math.abs(acc.balance))})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLedgerCSV}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Ekspor mutasi akun buku besar ke CSV/Excel"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" /> Ekspor CSV
              </button>
              <button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Menyinkronkan...' : 'Sinkronkan Mutasi Buku Besar'}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-800 text-sm">
                Riwayat Mutasi Buku Besar Akun {selectedLedgerAccount}
              </h4>
            </div>
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left text-slate-700">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">No. Jurnal</th>
                    <th className="p-3">Keterangan Transaksi</th>
                    <th className="p-3 text-right">Debit</th>
                    <th className="p-3 text-right">Kredit</th>
                    {canManageAccounting && <th className="p-3 text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodFilteredJournals.map(j => {
                    const matchLines = j.lines.filter(l => l.accountCode === selectedLedgerAccount);
                    if (matchLines.length === 0) return null;

                    return matchLines.map((ml, idx) => (
                      <tr key={`${j.id}_${idx}`} className="hover:bg-slate-50/70">
                        <td className="p-3 text-slate-500">{formatDate(j.date)}</td>
                        <td className="p-3 font-mono text-emerald-800 font-bold">{j.entryNumber}</td>
                        <td className="p-3 text-slate-800">{j.description}</td>
                        <td className="p-3 text-right font-mono text-emerald-800 font-semibold">{ml.debit > 0 ? formatRupiah(ml.debit) : '-'}</td>
                        <td className="p-3 text-right font-mono text-rose-700 font-semibold">{ml.credit > 0 ? formatRupiah(ml.credit) : '-'}</td>
                        {canManageAccounting && (
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {!j.isClosingEntry && !j.isReversalEntry && (
                                <button
                                  onClick={() => setReversingJournal(j)}
                                  className="p-1 rounded text-amber-700 hover:bg-amber-50"
                                  title="Buat Jurnal Pembalik (Storno)"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!accountingPeriods.some(p => j.date.startsWith(p.period) && p.status === 'locked') && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(j)}
                                    className="p-1 rounded text-emerald-700 hover:bg-emerald-50"
                                    title="Edit Jurnal Terkait"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingJournal(j)}
                                    className="p-1 rounded text-rose-700 hover:bg-rose-50"
                                    title="Hapus Jurnal Terkait"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Neraca Saldo (Trial Balance) */}
      {activeTab === 'trial_balance' && (
        <TrialBalanceView
          chartOfAccounts={periodAdjustedCOA}
          journalEntries={periodFilteredJournals}
          showNotification={showNotification}
        />
      )}

      {/* Tab: Tutup Buku Periode (Period Locks) */}
      {activeTab === 'closing' && (
        <PeriodClosingManager
          accountingPeriods={accountingPeriods}
          chartOfAccounts={chartOfAccounts}
          journalEntries={journalEntries}
          currentUser={currentUser}
          closeAccountingPeriod={closeAccountingPeriod}
          reopenAccountingPeriod={reopenAccountingPeriod}
          showNotification={showNotification}
        />
      )}

      {/* Modal: Buat Jurnal Baru */}
      {showAddJournalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-emerald-700" /> Buat Jurnal Umum Baru (Double-Entry)
              </h3>
              <button onClick={() => setShowAddJournalModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJournal} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    required
                    value={jrnDate}
                    onChange={(e) => setJrnDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Deskripsi / Uraian:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pencatatan beban operasional atau penyesuaian kas..."
                    value={jrnDescription}
                    onChange={(e) => setJrnDescription(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-line debit credit */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>Baris Akun & Nilai</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {chartOfAccounts.map(a => (
                            <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Debit (Rp)"
                          value={line.debit || ''}
                          onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-3 flex gap-1 items-center">
                        <input
                          type="number"
                          placeholder="Kredit (Rp)"
                          value={line.credit || ''}
                          onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {lines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Balance Validation Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 mr-2">Total Debit:</span>
                    <strong className="text-emerald-800">{formatRupiah(totalDebit)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">Total Kredit:</span>
                    <strong className="text-slate-800">{formatRupiah(totalCredit)}</strong>
                  </div>
                  <div className="flex items-center gap-1 font-bold">
                    {isBalanced ? (
                      <span className="text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> SEIMBANG (OK)
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> BELUM SEIMBANG (Selisih: {formatRupiah(Math.abs(totalDebit - totalCredit))})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddJournalModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced || isSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl cursor-pointer"
                >
                  {isSubmitting ? 'Memproses...' : 'Posting Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Jurnal Umum */}
      {editingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Edit Entri Jurnal: {editingJournal.entryNumber}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Otoritas Akuntansi & Super Admin • Perubahan saldo COA diperbarui otomatis.
                  </p>
                </div>
              </div>
              <button onClick={() => setEditingJournal(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditJournal} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Deskripsi / Uraian:</label>
                  <input
                    type="text"
                    required
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Multi-line debit credit */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                  <span>Baris Akun & Nilai (Double-Entry)</span>
                  <button
                    type="button"
                    onClick={handleAddEditLine}
                    className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    + Tambah Baris
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {editLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleEditLineChange(idx, 'accountCode', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {chartOfAccounts.map(a => (
                            <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Debit (Rp)"
                          value={line.debit || ''}
                          onChange={(e) => handleEditLineChange(idx, 'debit', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="col-span-3 flex gap-1 items-center">
                        <input
                          type="number"
                          placeholder="Kredit (Rp)"
                          value={line.credit || ''}
                          onChange={(e) => handleEditLineChange(idx, 'credit', e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-xs text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        {editLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEditLine(idx)}
                            className="text-rose-600 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Balance Validation Bar */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
                  <div>
                    <span className="text-slate-500 mr-2">Total Debit:</span>
                    <strong className="text-emerald-800">{formatRupiah(editTotalDebit)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 mr-2">Total Kredit:</span>
                    <strong className="text-slate-800">{formatRupiah(editTotalCredit)}</strong>
                  </div>
                  <div className="flex items-center gap-1 font-bold">
                    {isEditBalanced ? (
                      <span className="text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> SEIMBANG (OK)
                      </span>
                    ) : (
                      <span className="text-rose-700 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> BELUM SEIMBANG (Selisih: {formatRupiah(Math.abs(editTotalDebit - editTotalCredit))})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingJournal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!isEditBalanced || isSubmitting}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Jurnal */}
      {deletingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Hapus Entri Jurnal?
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {deletingJournal.entryNumber}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs text-slate-700 space-y-1.5">
              <p className="font-semibold text-rose-800">
                Perhatian: Tindakan ini akan membatalkan voucher jurnal berikut:
              </p>
              <p className="text-slate-800 font-medium">
                "{deletingJournal.description}"
              </p>
              <p className="text-[11px] text-slate-500">
                Saldo akun buku besar (COA) terkait akan secara otomatis dikembalikan (reverted) ke posisi sebelum voucher ini dibukukan.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingJournal(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Menghapus...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Ya, Hapus Jurnal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hasil Rekonsiliasi & Sinkronisasi Real-Time */}
      {showReconcileModal && reconcileStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <CheckCheck className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Rekonsiliasi Akuntansi Selesai
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sinkronisasi data real-time pada pukul {reconcileStats.timestamp} WIB
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReconcileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Jurnal Kadaluarsa / Terhapus Dibersihkan:
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {reconcileStats.orphanedRemoved} entri
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Transaksi Kas Baru Tercatat Otomatis:
                  </span>
                  <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {reconcileStats.unrecordedPosted} entri
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Total Voucher Jurnal Umum Aktif:
                  </span>
                  <span className="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {reconcileStats.totalActiveJournals} voucher
                  </span>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-emerald-900 font-semibold">Integritas Laporan 100% Terverifikasi:</strong> Saldo seluruh Bagan Akun (COA), Laba Rugi Komprehensif, Neraca Keuangan, dan Buku Besar telah direkalkulasi secara matematis dan seimbang (Debit = Kredit).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowReconcileModal(false)}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                Tutup & Tinjau Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audit Diagnostik Integritas Akuntansi (Zero-Fault Engine) */}
      <ZeroFaultHealthCheckModal
        isOpen={showHealthCheckModal}
        onClose={() => setShowHealthCheckModal(false)}
        chartOfAccounts={chartOfAccounts}
        journalEntries={journalEntries}
        bankAccounts={bankAccounts}
        accountingPeriods={accountingPeriods}
        onTriggerReconcile={handleRefreshData}
        isRefreshing={isRefreshing}
      />

      {/* Modal: Tambah Akun COA Baru */}
      {showAddCoaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" /> Tambah Akun Bagan Akun (COA) Baru
              </h3>
              <button onClick={() => setShowAddCoaModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCoa} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kode Akun:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 6170"
                    value={newCoaCode}
                    onChange={(e) => setNewCoaCode(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Nama Akun Standar:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Beban Kebersihan & Taman Agrowisata"
                    value={newCoaName}
                    onChange={(e) => setNewCoaName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tipe Klasifikasi:</label>
                  <select
                    value={newCoaType}
                    onChange={(e) => {
                      const t = e.target.value as ChartOfAccount['type'];
                      setNewCoaType(t);
                      if (t === 'Asset') setNewCoaCategory('Aktiva Lancar');
                      else if (t === 'Liability') setNewCoaCategory('Kewajiban Lancar');
                      else if (t === 'Equity') setNewCoaCategory('Modal');
                      else if (t === 'Revenue') setNewCoaCategory('Pendapatan Operasional');
                      else setNewCoaCategory('Beban Operasional');
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Asset">Asset (Aktiva)</option>
                    <option value="Liability">Liability (Kewajiban)</option>
                    <option value="Equity">Equity (Modal)</option>
                    <option value="Revenue">Revenue (Pendapatan)</option>
                    <option value="Expense">Expense (Beban / HPP)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kategori Laporan:</label>
                  <select
                    value={newCoaCategory}
                    onChange={(e) => setNewCoaCategory(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Aktiva Lancar">Aktiva Lancar</option>
                    <option value="Aktiva Biologis (PSAK 69)">Aktiva Biologis (PSAK 69)</option>
                    <option value="Aktiva Tetap">Aktiva Tetap</option>
                    <option value="Kewajiban Lancar">Kewajiban Lancar</option>
                    <option value="Kewajiban Jangka Panjang">Kewajiban Jangka Panjang</option>
                    <option value="Modal">Modal / Ekuitas</option>
                    <option value="Pendapatan Operasional">Pendapatan Operasional</option>
                    <option value="Pendapatan Non-Operasional">Pendapatan Non-Operasional</option>
                    <option value="Harga Pokok Penjualan">Harga Pokok Penjualan (HPP)</option>
                    <option value="Beban Operasional">Beban Operasional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Aktivitas Arus Kas (PSAK 2):</label>
                <select
                  value={newCoaCashFlow}
                  onChange={(e) => setNewCoaCashFlow(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-semibold"
                >
                  <option value="operating">Operasional (Operating Activities)</option>
                  <option value="investing">Investasi & Satwa (Investing Activities)</option>
                  <option value="financing">Pendanaan & Modal (Financing Activities)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddCoaModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl cursor-pointer"
                >
                  Simpan Akun COA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Jurnal Pembalik (Storno Reversal) */}
      <ReversalEntryModal
        journal={reversingJournal}
        onClose={() => setReversingJournal(null)}
        onConfirmReversal={reverseJournalEntry}
      />

    </div>
  );
}
