import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { printElementById } from '../../utils/printHelper';
import { exportRawCSV } from '../../utils/exportHelper';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate,
  formatDateTime,
  simulateDecrypt
} from '../../utils/crypto';
import { findTargetBankAccount, getAccountShortLabel } from '../../utils/bankMatcher';
import { suggestContraAccountForTransaction } from '../../utils/dataRecoveryHelper';
import { 
  SlidersHorizontal,
  Calendar,
  Filter,
  Download,
  Printer,
  School,
  Ticket,
  ShoppingBag,
  Utensils,
  Sprout,
  Building2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Search,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Wallet,
  X,
  FileText,
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  CalendarRange,
  ArrowRight,
  Receipt,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import { CashTransaction, IncomeSourceCategory, BankAccount } from '../../types';

export default function CustomTransactionReportsModule() {
  const { 
    cashTransactions, 
    bankAccounts, 
    chartOfAccounts,
    companyProfile, 
    addCashTransaction,
    clearAllCashTransactions,
    showNotification,
    currentUser,
    checkPermission
  } = useERP();

  // Modal konfirmasi bersihkan data transaksi
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Mode Periode: 'daily' (harian) atau 'period' (rentang tanggal tertentu)
  const [periodMode, setPeriodMode] = useState<'daily' | 'period'>('period');
  
  // Tanggal default harian
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Rentang tanggal default per-periode (Bulan Ini)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Basis tanggal filter: 'date' (pencatatan) vs 'receivedDate' (realisasi kas masuk)
  const [dateFieldBasis, setDateFieldBasis] = useState<'date' | 'receivedDate'>('date');

  // Filter Kategori Bisnis Agrowisata
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'school_visit',
    'ticket_gate',
    'dairy_product',
    'resto_fnb',
    'agriculture',
    'b2b_corporate',
    'other',
    'outflow'
  ]);

  // Filter Sumber Rekening Bank & Kas
  const [selectedSourceAccount, setSelectedSourceAccount] = useState<string>('ALL');

  // Helper pencocokan rekening bank & sumber kas terpusat (unifikasi via bankMatcher)
  const getBankInfo = (accountIdentifier?: string): BankAccount | undefined => {
    if (!accountIdentifier || bankAccounts.length === 0) return undefined;
    return findTargetBankAccount(bankAccounts, accountIdentifier);
  };

  const getAccountDisplayName = (accountStr: string): string => {
    if (!accountStr) return '-';
    const matched = getBankInfo(accountStr);
    if (matched) {
      return `${matched.bankName} (${matched.accountNumber})`;
    }
    return accountStr;
  };

  const getAccountShortName = (accountStr: string): string => {
    if (!accountStr) return '-';
    return getAccountShortLabel(bankAccounts, accountStr);
  };

  // Daftar Opsi Sumber Kas / Rekening Terdaftar
  const availableSourceOptions = useMemo(() => {
    const options: { value: string; label: string; accountNumber?: string; balance?: number }[] = [
      { value: 'ALL', label: `Semua Rekening & Sumber Kas (${bankAccounts.length} Akun Aktif)` }
    ];

    bankAccounts.forEach(b => {
      options.push({
        value: b.bankName,
        label: `${b.bankName} • No. ${b.accountNumber}`,
        accountNumber: b.accountNumber,
        balance: b.balance
      });
    });

    // Masukkan akun dari histori transaksi jika ada yang berbeda
    cashTransactions.forEach(tx => {
      if (tx.sourceAccount) {
        const alreadyIn = options.some(o => 
          o.value === tx.sourceAccount || 
          o.value.toLowerCase() === tx.sourceAccount.toLowerCase()
        );
        if (!alreadyIn) {
          options.push({
            value: tx.sourceAccount,
            label: `${tx.sourceAccount} (Sumber Lainnya)`
          });
        }
      }
    });

    return options;
  }, [bankAccounts, cashTransactions]);

  // Filter Tahap Pembayaran
  const [selectedPaymentStage, setSelectedPaymentStage] = useState<string>('ALL');

  // Filter Tipe Transaksi: 'ALL' | 'inflow' | 'outflow'
  const [selectedTxType, setSelectedTxType] = useState<'ALL' | 'inflow' | 'outflow'>('ALL');

  // Filter Status: 'ALL' | 'completed' | 'reconciled' | 'pending'
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Pencarian Teks
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State
  const [selectedTxDetail, setSelectedTxDetail] = useState<CashTransaction | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Transaction Form State
  const [newTxDate, setNewTxDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newTxType, setNewTxType] = useState<'inflow' | 'outflow'>('inflow');
  const [newTxCategory, setNewTxCategory] = useState<IncomeSourceCategory>('school_visit');
  const [newTxDescription, setNewTxDescription] = useState<string>('');
  const [newTxAmount, setNewTxAmount] = useState<number>(1500000);
  const [newTxSourceAccount, setNewTxSourceAccount] = useState<string>(
    bankAccounts[0]?.bankName || "Kas Loket Gate & Saung Resto D'Kandang Farm"
  );
  const [newTxPaymentStage, setNewTxPaymentStage] = useState<'dp' | 'installment' | 'settlement' | 'full'>('full');
  const [newTxEntityName, setNewTxEntityName] = useState<string>('');

  // Quick Preset Handlers
  const handleSetPreset = (preset: 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'all') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setPeriodMode('daily');
      setSelectedSingleDate(todayStr);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      setPeriodMode('daily');
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setSelectedSingleDate(yStr);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last7') {
      setPeriodMode('period');
      const past = new Date(today);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      setPeriodMode('period');
      const past = new Date(today);
      past.setDate(past.getDate() - 29);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      setPeriodMode('period');
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'lastMonth') {
      setPeriodMode('period');
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
    } else if (preset === 'all') {
      setPeriodMode('period');
      setStartDate('2020-01-01');
      setEndDate('2030-12-31');
    }
  };

  // Toggle Category Checkbox
  const toggleCategory = (catKey: string) => {
    setSelectedCategories(prev => 
      prev.includes(catKey) ? prev.filter(c => c !== catKey) : [...prev, catKey]
    );
  };

  // Helper cek apakah rekening termasuk Kas / Finance Cash
  const isCashOrFinanceAccount = (strOrAccount?: string | BankAccount): boolean => {
    if (!strOrAccount) return false;
    const text = (typeof strOrAccount === 'string' ? strOrAccount : `${strOrAccount.bankName} ${strOrAccount.accountNumber} ${strOrAccount.accountHolder || ''} ${strOrAccount.id}`).toLowerCase();
    return text.includes('cash') || 
           text.includes('kas') || 
           text.includes('finance') || 
           text.includes('brankas') || 
           text.includes('loket') || 
           text.includes('tunai') ||
           text.includes('petty');
  };

  // Transaksi yang Di-Expand (Setiap mutasi menghasilkan 2 entri: Keluar dari Sumber & Masuk pada Tujuan)
  const expandedTransactions = useMemo(() => {
    const result: (CashTransaction & { isMutationIn?: boolean; isMutationOut?: boolean })[] = [];

    cashTransactions.forEach((tx) => {
      if (tx.type === 'mutation') {
        const sourceName = tx.sourceAccount;
        const targetName = tx.targetAccount || 'Kas Finance / Loket';
        const sourceShort = getAccountShortName(sourceName);
        const targetShort = getAccountShortName(targetName);

        // 1. Mutasi Kas Keluar dari Rekening Asal (Outflow)
        result.push({
          ...tx,
          id: `${tx.id}_out`,
          type: 'outflow',
          description: tx.description 
            ? `${tx.description} (Transfer Keluar)`
            : `Mutasi Saldo ke ${targetShort}`,
          sourceAccount: sourceName,
          targetAccount: targetName,
          linkedEntityName: tx.linkedEntityName || `Tujuan: ${targetShort}`,
          isMutationOut: true
        });

        // 2. Mutasi Kas Masuk pada Rekening Tujuan (Inflow)
        result.push({
          ...tx,
          id: `${tx.id}_in`,
          type: 'inflow',
          description: tx.description 
            ? `${tx.description} (Kas Masuk Mutasi)`
            : `Mutasi Kas Masuk dari ${sourceShort}`,
          sourceAccount: targetName,
          targetAccount: sourceName,
          linkedEntityName: tx.linkedEntityName || `Sumber: ${sourceShort}`,
          isMutationIn: true
        });
      } else {
        result.push(tx);
      }
    });

    return result;
  }, [cashTransactions, bankAccounts]);

  // Filter Data Transaksi (Diurutkan Berdasarkan Tanggal Kronologis)
  const filteredTransactions = useMemo(() => {
    const list = expandedTransactions.filter((tx) => {
      // 1. Filter Tanggal
      const txDate = dateFieldBasis === 'receivedDate' ? (tx.receivedDate || tx.date) : tx.date;
      if (periodMode === 'daily') {
        if (txDate !== selectedSingleDate) return false;
      } else {
        if (startDate && txDate < startDate) return false;
        if (endDate && txDate > endDate) return false;
      }

      // 2. Filter Tipe Transaksi
      if (selectedTxType !== 'ALL' && tx.type !== selectedTxType) return false;

      // 3. Filter Kategori
      if (tx.isMutationIn || tx.isMutationOut) {
        if (tx.isMutationOut && !selectedCategories.includes('outflow')) return false;
      } else if (tx.type === 'outflow') {
        if (!selectedCategories.includes('outflow')) return false;
      } else {
        const cat = tx.incomeSource || 'other';
        if (!selectedCategories.includes(cat)) return false;
      }

      // 4. Filter Sumber Rekening Kas
      if (selectedSourceAccount !== 'ALL') {
        const selectedBank = bankAccounts.find(b => b.bankName === selectedSourceAccount || b.id === selectedSourceAccount);
        const isMatch = tx.sourceAccount === selectedSourceAccount ||
          (selectedBank && (
            tx.sourceAccount === selectedBank.id ||
            tx.sourceAccount === selectedBank.bankName ||
            tx.sourceAccount === selectedBank.accountNumber ||
            tx.sourceAccount.toLowerCase().includes(selectedBank.bankName.toLowerCase()) ||
            selectedBank.bankName.toLowerCase().includes(tx.sourceAccount.toLowerCase())
          ));
        if (!isMatch) return false;
      }

      // 5. Filter Tahap Pembayaran
      if (selectedPaymentStage !== 'ALL') {
        if (tx.paymentStage !== selectedPaymentStage) return false;
      }

      // 6. Filter Status
      if (selectedStatus !== 'ALL' && tx.status !== selectedStatus) return false;

      // 7. Filter Pencarian Keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const refMatch = tx.referenceNo.toLowerCase().includes(q);
        const descMatch = tx.description.toLowerCase().includes(q);
        const entityMatch = tx.linkedEntityName?.toLowerCase().includes(q);
        const srcMatch = tx.sourceAccount.toLowerCase().includes(q);
        if (!refMatch && !descMatch && !entityMatch && !srcMatch) return false;
      }

      return true;
    });

    // Urutkan secara kronologis berdasarkan tanggal transaksi (bukan pemasukan di atas & pengeluaran di bawah)
    return list.sort((a, b) => {
      const dateA = dateFieldBasis === 'receivedDate' ? (a.receivedDate || a.date) : a.date;
      const dateB = dateFieldBasis === 'receivedDate' ? (b.receivedDate || b.date) : b.date;
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return (a.referenceNo || '').localeCompare(b.referenceNo || '');
    });
  }, [
    expandedTransactions,
    periodMode,
    selectedSingleDate,
    startDate,
    endDate,
    dateFieldBasis,
    selectedTxType,
    selectedCategories,
    selectedSourceAccount,
    selectedPaymentStage,
    selectedStatus,
    searchQuery,
    bankAccounts
  ]);

  // Agregasi & Metrik Terfilter
  const metrics = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let schoolInflow = 0;
    let schoolCount = 0;
    let ticketInflow = 0;
    let ticketCount = 0;
    let dairyInflow = 0;
    let dairyCount = 0;
    let restoInflow = 0;
    let restoCount = 0;
    let otherInflow = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'inflow') {
        totalInflow += tx.amount;
        if (tx.incomeSource === 'school_visit') {
          schoolInflow += tx.amount;
          schoolCount += 1;
        } else if (tx.incomeSource === 'ticket_gate') {
          ticketInflow += tx.amount;
          ticketCount += 1;
        } else if (tx.incomeSource === 'dairy_product') {
          dairyInflow += tx.amount;
          dairyCount += 1;
        } else if (tx.incomeSource === 'resto_fnb') {
          restoInflow += tx.amount;
          restoCount += 1;
        } else {
          otherInflow += tx.amount;
        }
      } else {
        totalOutflow += tx.amount;
      }
    });

    const netCashFlow = totalInflow - totalOutflow;

    return {
      totalInflow,
      totalOutflow,
      netCashFlow,
      schoolInflow,
      schoolCount,
      ticketInflow,
      ticketCount,
      dairyInflow,
      dairyCount,
      restoInflow,
      restoCount,
      otherInflow,
      totalCount: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Data Pie Chart Komposisi Pendapatan
  const pieChartData = useMemo(() => {
    const data = [
      { name: 'Paketan Sekolah', value: metrics.schoolInflow, color: '#059669' },
      { name: 'Penjualan Tiket', value: metrics.ticketInflow, color: '#d97706' },
      { name: 'Produk Olahan Susu', value: metrics.dairyInflow, color: '#0284c7' },
      { name: 'Saung Resto & F&B', value: metrics.restoInflow, color: '#9333ea' },
      { name: 'Lainnya / Mutasi / Agrikultur', value: metrics.otherInflow, color: '#64748b' }
    ].filter(item => item.value > 0);

    return data.length > 0 ? data : [{ name: 'Belum Ada Data Terfilter', value: 1, color: '#cbd5e1' }];
  }, [metrics]);

  // Data Breakdown per Sumber Rekening Kas & Bank Terdaftar (Terbagi 2 Kelompok: Bank BSI/BCA & Finance Cash)
  const {
    bankOfficialGroup,
    financeCashGroup,
    allAccountsBreakdown,
    bankSubtotalInflow,
    bankSubtotalOutflow,
    bankSubtotalBalance,
    cashSubtotalInflow,
    cashSubtotalOutflow,
    cashSubtotalBalance,
    totalConsolidatedInflow,
    totalConsolidatedOutflow,
    totalConsolidatedBalance
  } = useMemo(() => {
    const map: Record<string, {
      id: string;
      name: string;
      fullName: string;
      accountNumber: string;
      accountHolder: string;
      currentBalance: number;
      inflow: number;
      outflow: number;
      count: number;
      isCash: boolean;
    }> = {};

    // 1. Inisialisasi seluruh rekening bank & kas resmi yang terdaftar
    bankAccounts.forEach(b => {
      const shortName = getAccountShortName(b.bankName);
      const isCash = isCashOrFinanceAccount(b);
      map[b.id] = {
        id: b.id,
        name: shortName,
        fullName: b.bankName,
        accountNumber: b.accountNumber,
        accountHolder: b.accountHolder,
        currentBalance: b.balance,
        inflow: 0,
        outflow: 0,
        count: 0,
        isCash
      };
    });

    // 2. Perhitungan Transaksi Operasional & Mutasi Terfilter
    filteredTransactions.forEach(tx => {
      const matched = getBankInfo(tx.sourceAccount);
      const key = matched ? matched.id : tx.sourceAccount;

      if (!map[key]) {
        const isCash = isCashOrFinanceAccount(tx.sourceAccount);
        map[key] = {
          id: key,
          name: getAccountShortName(tx.sourceAccount),
          fullName: tx.sourceAccount,
          accountNumber: matched?.accountNumber || '-',
          accountHolder: matched?.accountHolder || '-',
          currentBalance: matched?.balance || 0,
          inflow: 0,
          outflow: 0,
          count: 0,
          isCash
        };
      }

      if (tx.type === 'inflow') {
        map[key].inflow += tx.amount;
      } else {
        map[key].outflow += tx.amount;
      }
      map[key].count += 1;
    });

    const allList = Object.values(map);
    const bankOfficial = allList.filter(item => !item.isCash);
    const financeCash = allList.filter(item => item.isCash);

    const bSubInflow = bankOfficial.reduce((acc, b) => acc + b.inflow, 0);
    const bSubOutflow = bankOfficial.reduce((acc, b) => acc + b.outflow, 0);
    const bSubBalance = bankOfficial.reduce((acc, b) => acc + b.currentBalance, 0);

    const cSubInflow = financeCash.reduce((acc, b) => acc + b.inflow, 0);
    const cSubOutflow = financeCash.reduce((acc, b) => acc + b.outflow, 0);
    const cSubBalance = financeCash.reduce((acc, b) => acc + b.currentBalance, 0);

    return {
      bankOfficialGroup: bankOfficial,
      financeCashGroup: financeCash,
      allAccountsBreakdown: allList,
      bankSubtotalInflow: bSubInflow,
      bankSubtotalOutflow: bSubOutflow,
      bankSubtotalBalance: bSubBalance,
      cashSubtotalInflow: cSubInflow,
      cashSubtotalOutflow: cSubOutflow,
      cashSubtotalBalance: cSubBalance,
      totalConsolidatedInflow: bSubInflow + cSubInflow,
      totalConsolidatedOutflow: bSubOutflow + cSubOutflow,
      totalConsolidatedBalance: bSubBalance + cSubBalance
    };
  }, [filteredTransactions, bankAccounts]);

  const bankBreakdownData = allAccountsBreakdown;

  // Handle Muat Data Contoh Transaksi Agrowisata untuk Trial Layout
  const handleSeedSampleData = async () => {
    setIsSeeding(true);
    try {
      const now = new Date();
      const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
      
      const today = formatDateStr(now);
      const yesterday = formatDateStr(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const twoDaysAgo = formatDateStr(new Date(now.getTime() - 48 * 60 * 60 * 1000));

      const bankBCA = bankAccounts.find(b => b.bankName.toLowerCase().includes('bca'))?.bankName || bankAccounts[0]?.bankName || "BCA KCP Sawangan Depok - Giro Operasional";
      const bankMandiri = bankAccounts.find(b => b.bankName.toLowerCase().includes('mandiri'))?.bankName || bankAccounts[1]?.bankName || "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata";
      const bankBSI = bankAccounts.find(b => b.bankName.toLowerCase().includes('bsi') || b.bankName.toLowerCase().includes('syariah'))?.bankName || bankAccounts[2]?.bankName || "Bank Syariah Indonesia (BSI) Sawangan - Tabungan Edukasi & CSR";
      const kasLoket = bankAccounts.find(b => b.bankName.toLowerCase().includes('kas') || b.bankName.toLowerCase().includes('loket'))?.bankName || bankAccounts[3]?.bankName || "Kas Loket Gate & Saung Resto D'Kandang Farm";

      const samples: Omit<CashTransaction, 'id' | 'status'>[] = [
        {
          date: today,
          receivedDate: today,
          type: 'inflow',
          category: 'operating',
          description: 'DP 30% Paket Field Trip Edukasi Menanam & Memerah Sapi (120 Siswa)',
          amount: 5400000,
          sourceAccount: bankMandiri,
          referenceNo: `CR-SCH-${Date.now().toString().slice(-4)}1`,
          incomeSource: 'school_visit',
          paymentStage: 'dp',
          linkedEntityName: 'SDIT Al-Barkah Jakarta Selatan'
        },
        {
          date: today,
          receivedDate: today,
          type: 'inflow',
          category: 'operating',
          description: 'Pelunasan 100% Paket Wisata Ceria Sahabat Satwa (65 Siswa)',
          amount: 4875000,
          sourceAccount: bankBSI,
          referenceNo: `CR-SCH-${Date.now().toString().slice(-4)}2`,
          incomeSource: 'school_visit',
          paymentStage: 'settlement',
          linkedEntityName: 'TK & PAUD Permata Bunda Depok'
        },
        {
          date: today,
          receivedDate: today,
          type: 'inflow',
          category: 'operating',
          description: 'Tiket Masuk Loket Gate Reguler & Terusan Wahana Edukasi (350 Pengunjung)',
          amount: 8750000,
          sourceAccount: kasLoket,
          referenceNo: `CR-TKT-${Date.now().toString().slice(-4)}3`,
          incomeSource: 'ticket_gate',
          paymentStage: 'full',
          linkedEntityName: 'Loket Tiket Utama Gate Wisata'
        },
        {
          date: today,
          receivedDate: today,
          type: 'inflow',
          category: 'operating',
          description: 'Penjualan Susu Murni Pasteurisasi 1L (120 Botol) & Yogurt Aneka Rasa (80 Cup)',
          amount: 4200000,
          sourceAccount: bankBCA,
          referenceNo: `CR-DRY-${Date.now().toString().slice(-4)}4`,
          incomeSource: 'dairy_product',
          paymentStage: 'full',
          linkedEntityName: "Outlet Fresh Dairy D'Kandang Shop"
        },
        {
          date: today,
          receivedDate: today,
          type: 'inflow',
          category: 'operating',
          description: 'Paket Makan Siang Gurame Bakar & Es Kelapa Muda Rombongan Sekolah',
          amount: 3600000,
          sourceAccount: kasLoket,
          referenceNo: `CR-FNB-${Date.now().toString().slice(-4)}5`,
          incomeSource: 'resto_fnb',
          paymentStage: 'full',
          linkedEntityName: "Saung Resto Kuliner D'Kandang"
        },
        {
          date: yesterday,
          receivedDate: yesterday,
          type: 'inflow',
          category: 'operating',
          description: 'Pembayaran Termin 2 Paket Outbound Leadership Agrowisata (180 Siswa)',
          amount: 9000000,
          sourceAccount: bankBCA,
          referenceNo: `CR-SCH-${Date.now().toString().slice(-4)}6`,
          incomeSource: 'school_visit',
          paymentStage: 'installment',
          linkedEntityName: 'SMP Labschool Cibubur'
        },
        {
          date: yesterday,
          receivedDate: yesterday,
          type: 'inflow',
          category: 'operating',
          description: 'Penjualan Bibit Tanaman Buah Tabulampot & Pupuk Kompos Organik Kasgot',
          amount: 2350000,
          sourceAccount: bankMandiri,
          referenceNo: `CR-AGR-${Date.now().toString().slice(-4)}7`,
          incomeSource: 'agriculture',
          paymentStage: 'full',
          linkedEntityName: 'Greenhouse & Agro Nursery'
        },
        {
          date: twoDaysAgo,
          receivedDate: twoDaysAgo,
          type: 'inflow',
          category: 'operating',
          description: 'Pemesanan Paket Fun Farming & Cooking Class Mini Chef (40 Anak)',
          amount: 3200000,
          sourceAccount: bankBSI,
          referenceNo: `CR-SCH-${Date.now().toString().slice(-4)}8`,
          incomeSource: 'school_visit',
          paymentStage: 'full',
          linkedEntityName: 'Homeschooling Kak Seto Depok'
        },
        {
          date: today,
          receivedDate: today,
          type: 'outflow',
          category: 'operating',
          description: 'Pembelian Konsentrat Pakan Sapi Perah & Kambing Etawa 2 Ton',
          amount: 4500000,
          sourceAccount: bankBCA,
          referenceNo: `CD-EXP-${Date.now().toString().slice(-4)}9`,
          linkedEntityName: 'CV Pakan Ternak Mandiri Depok'
        },
        {
          date: yesterday,
          receivedDate: yesterday,
          type: 'outflow',
          category: 'operating',
          description: 'Biaya Pemeliharaan Rutin Wahana Flying Fox & Area Berkuda Edukasi',
          amount: 1850000,
          sourceAccount: kasLoket,
          referenceNo: `CD-EXP-${Date.now().toString().slice(-4)}0`,
          linkedEntityName: 'Tim Maintenance & Sarpras Farm'
        },
        {
          date: today,
          receivedDate: today,
          type: 'mutation',
          category: 'operating',
          description: 'Tarik Kas Operasional Resto & Wahana dari Bank BCA ke Kas Loket/Finance',
          amount: 3500000,
          sourceAccount: bankBCA,
          targetAccount: kasLoket,
          referenceNo: `MUT-BNK-${Date.now().toString().slice(-4)}1`,
          linkedEntityName: 'Finance Cash & Resto'
        }
      ];

      for (const s of samples) {
        await addCashTransaction(s);
      }
      showNotification('10 data contoh transaksi agrowisata berhasil dimuat sesuai rekening aktif!', 'success');
    } catch (err) {
      showNotification('Gagal memuat data contoh transaksi', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Handle Bersihkan Seluruh Transaksi
  const handleClearAllTransactions = async () => {
    setIsClearing(true);
    try {
      await clearAllCashTransactions();
      setShowClearConfirmModal(false);
    } catch (err) {
      showNotification('Gagal membersihkan data transaksi', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  // Submit Transaksi Baru Langsung dari Modul Report
  const handleCreateNewTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxDescription.trim() || newTxAmount <= 0) {
      showNotification('Harap lengkapi rincian keterangan dan nominal transaksi!', 'error');
      return;
    }

    const refPrefix = newTxType === 'inflow' ? 'CR' : 'CD';
    const catCode = newTxCategory === 'school_visit' ? 'SCH' : newTxCategory === 'ticket_gate' ? 'TKT' : newTxCategory === 'dairy_product' ? 'DRY' : 'GEN';
    const suggestedCoa = suggestContraAccountForTransaction(
      {
        type: newTxType,
        category: 'operating',
        incomeSource: newTxType === 'inflow' ? newTxCategory : undefined,
        description: newTxDescription
      },
      chartOfAccounts
    );

    await addCashTransaction({
      date: newTxDate,
      receivedDate: newTxDate,
      type: newTxType,
      category: 'operating',
      description: newTxDescription,
      amount: newTxAmount,
      sourceAccount: newTxSourceAccount,
      referenceNo: `${refPrefix}-${catCode}-${Date.now().toString().slice(-4)}`,
      incomeSource: newTxType === 'inflow' ? newTxCategory : undefined,
      paymentStage: newTxType === 'inflow' ? newTxPaymentStage : undefined,
      linkedEntityName: newTxEntityName || undefined,
      contraAccountCode: suggestedCoa.code,
      contraAccountName: suggestedCoa.name
    });

    setShowAddModal(false);
    setNewTxDescription('');
    setNewTxEntityName('');
    showNotification('Transaksi baru berhasil dicatat dan masuk ke laporan terfilter!', 'success');
  };

  // Unduh CSV / Excel
  const handleExportCSV = () => {
    let csv = 'No,No Referensi,Tanggal Transaksi,Tanggal Kas Masuk,Kategori,Aktivitas PSAK 2,Kode COA Lawan,Nama Akun COA Lawan,Keterangan,Entitas / Pelanggan,Sumber Kas / Bank,Tahap Pembayaran,Tipe,Status,Nominal (Rp)\n';
    filteredTransactions.forEach((tx, idx) => {
      const isMutIn = (tx as any).isMutationIn;
      const isMutOut = (tx as any).isMutationOut;
      const catLabel = isMutIn ? 'Mutasi Kas Masuk' :
        isMutOut ? 'Mutasi Kas Keluar' :
        tx.type === 'outflow' ? 'Beban Operasional' :
        tx.incomeSource === 'school_visit' ? 'Paketan Sekolah' :
        tx.incomeSource === 'ticket_gate' ? 'Penjualan Tiket' :
        tx.incomeSource === 'dairy_product' ? 'Produk Olahan Susu' :
        tx.incomeSource === 'resto_fnb' ? 'Saung Resto & F&B' :
        tx.incomeSource === 'agriculture' ? 'Agrikultur & Bibit' :
        tx.incomeSource === 'b2b_corporate' ? 'B2B & CSR' : 'Lainnya';

      const activityLabel = tx.category === 'investing' ? 'Investasi' : tx.category === 'financing' ? 'Pendanaan' : 'Operasional';
      const coaInfo = (isMutIn || isMutOut)
        ? { code: '1110', name: 'Kas & Setara Kas' }
        : tx.contraAccountCode
        ? { code: tx.contraAccountCode, name: tx.contraAccountName || chartOfAccounts.find(a => a.code === tx.contraAccountCode)?.name || '-' }
        : suggestContraAccountForTransaction(tx, chartOfAccounts);

      const stageLabel = tx.paymentStage === 'dp' ? 'DP' : tx.paymentStage === 'installment' ? 'Termin' : tx.paymentStage === 'settlement' ? 'Pelunasan' : 'Penuh';

      csv += `"${idx + 1}","${tx.referenceNo}","${tx.date}","${tx.receivedDate || tx.date}","${catLabel}","${activityLabel}","${coaInfo.code}","${coaInfo.name.replace(/"/g, '""')}","${tx.description.replace(/"/g, '""')}","${(tx.linkedEntityName || '-').replace(/"/g, '""')}","${tx.sourceAccount}","${stageLabel}","${tx.type === 'inflow' ? 'Kas Masuk' : 'Kas Keluar'}","${tx.status}","${tx.amount}"\n`;
    });

    csv += `\n"","TOTAL KAS MASUK","","","","","","","","","","","","","${metrics.totalInflow}"\n`;
    csv += `"","TOTAL KAS KELUAR","","","","","","","","","","","","","${metrics.totalOutflow}"\n`;
    csv += `"","NET ARUS KAS","","","","","","","","","","","","","${metrics.netCashFlow}"\n`;

    const periodLabel = periodMode === 'daily' ? selectedSingleDate : `${startDate}_sd_${endDate}`;
    const filename = `Laporan_Transaksi_Terfilter_DKandang_${periodLabel}.csv`;
    const success = exportRawCSV(filename, csv);
    if (success) {
      showNotification('File CSV Laporan Transaksi Terfilter berhasil diunduh!', 'success');
    } else {
      showNotification('Gagal mengunduh file CSV Laporan Transaksi.', 'error');
    }
  };

  const renderIncomeBadge = (tx: CashTransaction & { isMutationIn?: boolean; isMutationOut?: boolean }) => {
    if (tx.isMutationIn) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
          <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Mutasi Kas Masuk
        </span>
      );
    }

    if (tx.isMutationOut) {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-amber-600" /> Mutasi Keluar
        </span>
      );
    }

    if (tx.type === 'outflow') {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
          <ArrowDownRight className="w-3 h-3 text-rose-600" /> Beban Operasional
        </span>
      );
    }

    switch (tx.incomeSource) {
      case 'school_visit':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <School className="w-3 h-3 text-emerald-600" /> Paketan Sekolah
            {tx.paymentStage === 'dp' && <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px]">DP</span>}
            {tx.paymentStage === 'installment' && <span className="bg-blue-100 text-blue-800 px-1 rounded text-[9px]">Termin</span>}
            {tx.paymentStage === 'settlement' && <span className="bg-emerald-100 text-emerald-800 px-1 rounded text-[9px]">Lunas</span>}
          </span>
        );
      case 'ticket_gate':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
            <Ticket className="w-3 h-3 text-amber-600" /> Penjualan Tiket
          </span>
        );
      case 'dairy_product':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-blue-700" /> Produk Olahan Susu
          </span>
        );
      case 'resto_fnb':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-850 border border-amber-200 inline-flex items-center gap-1">
            <Utensils className="w-3 h-3 text-amber-700" /> Saung Resto & F&B
          </span>
        );
      case 'agriculture':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <Sprout className="w-3 h-3 text-emerald-700" /> Agrikultur Kebun
          </span>
        );
      case 'b2b_corporate':
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 inline-flex items-center gap-1">
            <Building2 className="w-3 h-3 text-slate-700" /> Mitra B2B & CSR
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" /> Kas Masuk Lainnya
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Laporan Transaksi & Filter Agrowisata
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-full uppercase tracking-wider">
                  Real-Time Query
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Filter transaksi harian & per-periode: Paketan Sekolah, Tiket Loket, Produk Olahan Susu, Resto F&B, dan Sumber Rekening Bank.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedSampleData}
            disabled={isSeeding}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            title="Muat data contoh transaksi agrowisata untuk uji coba & trial layout laporan"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Memuat Data...' : 'Tambah Data Contoh'}
          </button>

          {cashTransactions.length > 0 && (
            <button
              onClick={() => setShowClearConfirmModal(true)}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Bersihkan seluruh data transaksi kas"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Bersihkan Transaksi
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Catat Transaksi Baru
          </button>

          <button
            onClick={() => setShowPrintModal(true)}
            disabled={filteredTransactions.length === 0}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak Laporan Resmi
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Ekspor Excel (CSV)
          </button>
        </div>
      </div>

      {/* 2. Control Filter Panel */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">Panel Pengaturan Filter Transaksi</h2>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setPeriodMode('daily')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                periodMode === 'daily'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Harian (Daily)
            </button>
            <button
              onClick={() => setPeriodMode('period')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                periodMode === 'period'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Laporan Per-Periode (Date Range)
            </button>
          </div>
        </div>

        {/* Row 1: Tanggal & Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Kolom Pemilih Tanggal */}
          <div className="lg:col-span-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            {periodMode === 'daily' ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Pilih Tanggal Laporan Harian:
                  </label>
                  <input
                    type="date"
                    value={selectedSingleDate}
                    onChange={(e) => setSelectedSingleDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex items-center gap-1.5 pt-4 sm:pt-0">
                  <button
                    onClick={() => handleSetPreset('today')}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => handleSetPreset('yesterday')}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Kemarin
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal Mulai (Start):
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                  <div className="flex items-center justify-center pt-4 sm:pt-5 text-slate-400">
                    <ArrowRight className="w-4 h-4 hidden sm:block" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tanggal Akhir (End):
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 mr-1">Preset:</span>
                  <button
                    onClick={() => handleSetPreset('today')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 cursor-pointer"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => handleSetPreset('last7')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 cursor-pointer"
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    onClick={() => handleSetPreset('thisMonth')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => handleSetPreset('lastMonth')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 cursor-pointer"
                  >
                    Bulan Lalu
                  </button>
                  <button
                    onClick={() => handleSetPreset('all')}
                    className="px-2 py-0.5 bg-white hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-medium text-slate-700 cursor-pointer"
                  >
                    Semua Data
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Kolom Basis Tanggal & Sumber Dana */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Basis Tanggal Transaksi:
              </label>
              <select
                value={dateFieldBasis}
                onChange={(e: any) => setDateFieldBasis(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                <option value="date">Tanggal Pencatatan / Faktur (Date)</option>
                <option value="receivedDate">Tanggal Kas Masuk Bank (Realized)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-slate-500" /> Sumber Rekening Bank & Kas:
              </label>
              <select
                value={selectedSourceAccount}
                onChange={(e) => setSelectedSourceAccount(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              >
                {availableSourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Filter Kategori Transaksi (Sesuai Permintaan Spesifik User) */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600" /> Kategori Transaksi yang Disertakan:
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategories(['school_visit', 'ticket_gate', 'dairy_product', 'resto_fnb', 'agriculture', 'b2b_corporate', 'other', 'outflow'])}
                className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Pilih Semua
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => setSelectedCategories(['school_visit', 'ticket_gate', 'dairy_product'])}
                className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
              >
                Hanya Wisata Edukasi & Farm (Sekolah + Tiket + Susu)
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Paketan Sekolah */}
            <button
              onClick={() => toggleCategory('school_visit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('school_visit')
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <School className="w-3.5 h-3.5" /> Paketan Sekolah & Field Trip
            </button>

            {/* Penjualan Tiket */}
            <button
              onClick={() => toggleCategory('ticket_gate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('ticket_gate')
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Ticket className="w-3.5 h-3.5" /> Penjualan Tiket Loket
            </button>

            {/* Penjualan Produk Olahan Susu */}
            <button
              onClick={() => toggleCategory('dairy_product')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('dairy_product')
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Penjualan Produk Olahan Susu
            </button>

            {/* Resto F&B */}
            <button
              onClick={() => toggleCategory('resto_fnb')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('resto_fnb')
                  ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" /> Saung Resto & F&B
            </button>

            {/* Agrikultur */}
            <button
              onClick={() => toggleCategory('agriculture')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('agriculture')
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Sprout className="w-3.5 h-3.5" /> Agrikultur Kebun
            </button>

            {/* B2B / CSR */}
            <button
              onClick={() => toggleCategory('b2b_corporate')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('b2b_corporate')
                  ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> B2B / CSR
            </button>

            {/* Pengeluaran Kas Keluar */}
            <button
              onClick={() => toggleCategory('outflow')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                selectedCategories.includes('outflow')
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" /> Beban / Kas Keluar
            </button>
          </div>
        </div>

        {/* Row 3: Filter Tambahan (Tahap Pembayaran & Search) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Tahap Pembayaran:</label>
            <select
              value={selectedPaymentStage}
              onChange={(e) => setSelectedPaymentStage(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
            >
              <option value="ALL">Semua Tahap Pembayaran</option>
              <option value="dp">Uang Muka (DP)</option>
              <option value="installment">Termin / Cicilan</option>
              <option value="settlement">Pelunasan (Settlement)</option>
              <option value="full">Pembayaran Penuh (Full)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Tipe Arus Kas:</label>
            <select
              value={selectedTxType}
              onChange={(e: any) => setSelectedTxType(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800"
            >
              <option value="ALL">Semua (Kas Masuk & Kas Keluar)</option>
              <option value="inflow">Hanya Pendapatan / Kas Masuk</option>
              <option value="outflow">Hanya Pengeluaran / Kas Keluar</option>
            </select>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Cari Keterangan / Nama Sekolah / No. Ref:</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ketik kata kunci pencarian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Kas Masuk Terfilter */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Kas Masuk Terfilter</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-emerald-700">
            {formatRupiah(metrics.totalInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Dari total {metrics.totalCount} transaksi terfilter</span>
          </div>
        </div>

        {/* Omzet Paketan Sekolah */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Omzet Paketan Sekolah</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <School className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(metrics.schoolInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{metrics.schoolCount} kunjungan rombongan</span>
            <span className="font-bold text-emerald-700">
              {metrics.totalInflow > 0 ? ((metrics.schoolInflow / metrics.totalInflow) * 100).toFixed(1) : 0}% share
            </span>
          </div>
        </div>

        {/* Omzet Penjualan Tiket */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Omzet Penjualan Tiket</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(metrics.ticketInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{metrics.ticketCount} transaksi loket gate</span>
            <span className="font-bold text-amber-700">
              {metrics.totalInflow > 0 ? ((metrics.ticketInflow / metrics.totalInflow) * 100).toFixed(1) : 0}% share
            </span>
          </div>
        </div>

        {/* Omzet Produk Olahan Susu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Omzet Produk Olahan Susu</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatRupiah(metrics.dairyInflow)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{metrics.dairyCount} transaksi susu & yogurt</span>
            <span className="font-bold text-blue-700">
              {metrics.totalInflow > 0 ? ((metrics.dairyInflow / metrics.totalInflow) * 100).toFixed(1) : 0}% share
            </span>
          </div>
        </div>
      </div>

      {/* 4. Visual Analytics & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Pie Chart: Komposisi Pendapatan */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-700" />
              Komposisi Sumber Pendapatan Terfilter
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Proporsi (%)</span>
          </div>

          <div className="h-60 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => formatRupiah(Number(value))}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            {pieChartData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate text-[11px]">{item.name}:</span>
                <span className="font-bold text-slate-900 text-[11px] ml-auto">{formatCompactRupiah(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart: Distribusi Realisasi per Rekening Kas & Bank */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              Aliran Kas per Akun Bank & Kasir Loket
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Inflow vs Outflow</span>
          </div>

          <div className="h-60 w-full flex-1">
            {bankBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bankBreakdownData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis tickFormatter={(v) => formatCompactRupiah(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => formatRupiah(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="inflow" name="Kas Masuk (Pendapatan)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="outflow" name="Kas Keluar (Beban)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                Tidak ada data arus kas untuk rekening pada filter terpilih.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4b. Status & Posisi Rekening Bank & Kas Terdaftar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-700" />
              Posisi Saldo & Perputaran Arus Kas per Rekening Terdaftar
            </h3>
            <p className="text-xs text-slate-500">
              Sinkronisasi data saldo kas realtime dengan mutasi periode {periodMode === 'daily' ? formatDate(selectedSingleDate) : `${formatDate(startDate)} s/d ${formatDate(endDate)}`}
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
            {bankAccounts.length} Rekening Aktif
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {bankBreakdownData.map((b) => (
            <div key={b.id} className={`p-3.5 rounded-2xl border transition-colors flex flex-col justify-between ${
              b.isCash 
                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70' 
                : 'border-slate-200 bg-slate-50/70 hover:bg-slate-50'
            }`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 line-clamp-1">{b.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    b.isCash ? 'bg-amber-100/80 text-amber-900 border-amber-300' : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                    {b.isCash ? 'Finance Cash' : 'Rekening Bank'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={b.fullName}>
                  {b.fullName}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Saldo Realtime:</span>
                  <span className="font-bold text-slate-900">{formatRupiah(b.currentBalance)}</span>
                </div>
                <div className="flex justify-between items-center text-emerald-700">
                  <span className="text-[10px]">
                    {b.isCash ? 'Kas Masuk (Mutasi):' : 'Kas Masuk:'}
                  </span>
                  <span className="font-semibold">+{formatRupiah(b.inflow)}</span>
                </div>
                {b.outflow > 0 && (
                  <div className="flex justify-between items-center text-rose-600">
                    <span className="text-[10px]">Kas Keluar:</span>
                    <span className="font-semibold">-{formatRupiah(b.outflow)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Tabel Transaksi Terfilter */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              Daftar Transaksi Terfilter
              <span className="text-xs font-normal text-slate-500">
                ({filteredTransactions.length} transaksi ditemukan)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Periode:{' '}
              <strong className="text-slate-800">
                {periodMode === 'daily' ? formatDate(selectedSingleDate) : `${formatDate(startDate)} s/d ${formatDate(endDate)}`}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Net Arus Kas Terfilter:</span>
            <span className={`text-sm font-bold px-3 py-1 rounded-xl ${
              metrics.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {formatRupiah(metrics.netCashFlow)}
            </span>
          </div>
        </div>

        {/* Table Container - Full Width No Horizontal Scroll */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left border-collapse text-xs table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-[11px] font-bold text-slate-700">
                <th className="p-3 w-[16%]">No. Ref & Tanggal</th>
                <th className="p-3 w-[15%]">Kategori</th>
                <th className="p-3 w-[36%]">Keterangan & Entitas</th>
                <th className="p-3 w-[16%]">Rekening Bank</th>
                <th className="p-3 text-right w-[12%]">Nominal (Rp)</th>
                <th className="p-3 text-center w-[5%]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx, idx) => {
                const isPositive = tx.type === 'inflow';
                const matchedBank = getBankInfo(tx.sourceAccount);
                return (
                  <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 align-top">
                      <div className="font-mono font-bold text-slate-800 text-xs">
                        {tx.referenceNo}
                      </div>
                      <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                        {formatDate(tx.date)}
                      </div>
                      {tx.receivedDate && tx.receivedDate !== tx.date && (
                        <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                          Kas: {formatDate(tx.receivedDate)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex flex-col gap-1 items-start">
                        {renderIncomeBadge(tx)}
                        {tx.paymentStage && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {tx.paymentStage === 'dp' ? 'Uang Muka (DP)' : tx.paymentStage === 'installment' ? 'Termin' : tx.paymentStage === 'settlement' ? 'Pelunasan' : 'Penuh'}
                          </span>
                        )}
                        {!(tx as any).isMutationIn && !(tx as any).isMutationOut && (() => {
                          const coaInfo = tx.contraAccountCode
                            ? { code: tx.contraAccountCode, name: tx.contraAccountName || chartOfAccounts.find(a => a.code === tx.contraAccountCode)?.name || 'Akun COA' }
                            : suggestContraAccountForTransaction(tx, chartOfAccounts);
                          return (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/5 text-emerald-900 border border-emerald-300/60">
                              COA {coaInfo.code}: {coaInfo.name}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="font-medium text-slate-900 text-xs leading-relaxed break-words">{tx.description}</div>
                      {tx.linkedEntityName && (
                        <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 mt-1 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/70 w-fit">
                          <span>{tx.linkedEntityName}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top text-slate-700 font-medium text-[11px]">
                      <div className="font-semibold text-slate-800">{matchedBank ? matchedBank.bankName : tx.sourceAccount}</div>
                      {matchedBank && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">No. {matchedBank.accountNumber}</div>
                      )}
                    </td>
                    <td className={`p-3 align-top text-right font-bold whitespace-nowrap font-mono text-xs sm:text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {isPositive ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td className="p-3 align-top text-center">
                      <button
                        onClick={() => setSelectedTxDetail(tx)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-600">Tidak ada transaksi yang cocok dengan kriteria filter saat ini.</p>
                      <p className="text-[11px] text-slate-400">Silakan muat data contoh agrowisata untuk trial layout, atau catat transaksi baru.</p>
                      <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                        <button
                          onClick={handleSeedSampleData}
                          disabled={isSeeding}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? 'animate-spin' : ''}`} />
                          {isSeeding ? 'Memuat Data...' : 'Tambah Data Contoh Agrowisata'}
                        </button>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> Catat Transaksi Baru
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-200 text-xs">
                  <td colSpan={6} className="p-3 text-right text-slate-700">
                    TOTAL KAS MASUK TERFILTER:
                  </td>
                  <td className="p-3 text-right text-emerald-700">
                    {formatRupiah(metrics.totalInflow)}
                  </td>
                  <td></td>
                </tr>
                {metrics.totalOutflow > 0 && (
                  <tr className="bg-slate-50 font-bold text-xs">
                    <td colSpan={6} className="p-3 text-right text-slate-700">
                      TOTAL KAS KELUAR TERFILTER:
                    </td>
                    <td className="p-3 text-right text-rose-600">
                      -{formatRupiah(metrics.totalOutflow)}
                    </td>
                    <td></td>
                  </tr>
                )}
                <tr className="bg-emerald-50/80 font-bold text-xs border-t border-emerald-200">
                  <td colSpan={6} className="p-3 text-right text-emerald-900">
                    NET ARUS KAS BERSIH (SURPLUS / DEFISIT):
                  </td>
                  <td className="p-3 text-right text-emerald-800 text-sm">
                    {formatRupiah(metrics.netCashFlow)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 6. Modal Detail Transaksi */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Bukti Rincian Transaksi Kas</h3>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl space-y-2 border border-slate-200/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Nomor Referensi:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedTxDetail.referenceNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tanggal Pencatatan:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedTxDetail.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tanggal Kas Masuk Bank:</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedTxDetail.receivedDate || selectedTxDetail.date)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kategori Agrowisata:</span>
                  <div>{renderIncomeBadge(selectedTxDetail)}</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Sumber Kas / Rekening:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[200px]">{selectedTxDetail.sourceAccount}</span>
                </div>
                {selectedTxDetail.paymentStage && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Tahap Pembayaran:</span>
                    <span className="font-bold text-emerald-700 uppercase">
                      {selectedTxDetail.paymentStage === 'dp' ? 'Uang Muka (DP)' : selectedTxDetail.paymentStage === 'installment' ? 'Termin Cicilan' : selectedTxDetail.paymentStage === 'settlement' ? 'Pelunasan Akhir' : 'Pembayaran Penuh'}
                    </span>
                  </div>
                )}
                {selectedTxDetail.linkedEntityName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Entitas / Pelanggan:</span>
                    <span className="font-bold text-slate-900">{selectedTxDetail.linkedEntityName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Kategori Aktivitas (PSAK 2):</span>
                  <span className="font-bold text-slate-800">
                    {selectedTxDetail.category === 'investing' ? 'Investasi (Investing)' : selectedTxDetail.category === 'financing' ? 'Pendanaan (Financing)' : 'Operasional (Operating)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Akun Lawan COA:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {(() => {
                      const coaInfo = selectedTxDetail.contraAccountCode
                        ? { code: selectedTxDetail.contraAccountCode, name: selectedTxDetail.contraAccountName || chartOfAccounts.find(a => a.code === selectedTxDetail.contraAccountCode)?.name || 'Akun COA' }
                        : suggestContraAccountForTransaction(selectedTxDetail, chartOfAccounts);
                      return `[${coaInfo.code}] ${coaInfo.name}`;
                    })()}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block mb-1 font-semibold">Deskripsi Transaksi:</span>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-800 font-medium">
                  {selectedTxDetail.description}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl flex items-center justify-between border border-emerald-200">
                <span className="text-emerald-900 font-bold">Total Nominal Transaksi:</span>
                <span className="text-lg font-bold text-emerald-800">
                  {formatRupiah(selectedTxDetail.amount)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Cetak Laporan Resmi Standar D'Kandang (Print Preview A4) */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 md:p-8 flex justify-center items-start print:p-0 print:bg-white print:static print:overflow-visible">
          <div className="relative bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 md:p-10 shadow-2xl border border-slate-200 text-slate-800 my-2 sm:my-8 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full print:text-black">
            
            {/* Action Bar Modal - Sticky Toolbar */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md pb-4 pt-1 -mt-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Pratinjau Cetak Laporan Resmi Agrowisata</h3>
                  <p className="text-[11px] text-slate-500">Format dokumen siap cetak atau simpan sebagai file PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => printElementById('printable-transaction-report', `Laporan Rekapitulasi Kas - ${periodMode === 'daily' ? selectedSingleDate : `${startDate}_sd_${endDate}`}`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body (Standar Kop Surat Resmi D'Kandang) */}
            <div id="printable-transaction-report" className="printable-document space-y-6 text-slate-900 print:space-y-4">
              {/* Kop Surat */}
              <div className="border-b-2 border-slate-800 pb-4 text-center space-y-1">
                <div className="text-2xl font-black text-emerald-800 tracking-wide">
                  {companyProfile.name.toUpperCase()}
                </div>
                <div className="text-xs font-bold text-slate-700 tracking-widest uppercase">
                  {companyProfile.ptName}
                </div>
                <div className="text-[11px] text-slate-500 max-w-xl mx-auto">
                  {companyProfile.address} | Telp: {companyProfile.phone} | Email: {companyProfile.email}
                </div>
              </div>

              {/* Judul Dokumen */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold uppercase underline tracking-wider text-slate-900">
                  LAPORAN REKAPITULASI TRANSAKSI TERFILTER
                </h2>
                <p className="text-xs text-slate-600">
                  Periode Laporan:{' '}
                  <strong>
                    {periodMode === 'daily' ? formatDate(selectedSingleDate) : `${formatDate(startDate)} s/d ${formatDate(endDate)}`}
                  </strong>
                </p>
                <p className="text-[10px] text-slate-400">
                  Tanggal Terbit Dokumen: {formatDateTime(new Date().toISOString())}
                </p>
              </div>

              {/* Ringkasan Parameter Filter */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Basis Tanggal: </span>
                    <strong className="text-slate-800">{dateFieldBasis === 'date' ? 'Tanggal Pencatatan' : 'Tanggal Kas Masuk Realized'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Filter Sumber Rekening: </span>
                    <strong className="text-slate-800">
                      {selectedSourceAccount === 'ALL' 
                        ? `Semua Rekening & Kas (${bankAccounts.length} Akun Terdaftar)` 
                        : getAccountDisplayName(selectedSourceAccount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Jumlah Transaksi: </span>
                    <strong className="text-slate-800">{filteredTransactions.length} Item Transaksi</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Status Validasi: </span>
                    <strong className="text-emerald-700">Terverifikasi Sistem ERP</strong>
                  </div>
                </div>
              </div>

              {/* Tabel Ringkasan per Kategori */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">1. Ringkasan Perolehan per Kategori Bisnis</h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-semibold block">Paketan Sekolah & Field Trip</span>
                    <span className="text-sm font-bold text-emerald-900">{formatRupiah(metrics.schoolInflow)}</span>
                    <span className="text-[10px] text-emerald-700 block mt-0.5">{metrics.schoolCount} Transaksi</span>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-semibold block">Penjualan Tiket Loket Gate</span>
                    <span className="text-sm font-bold text-amber-900">{formatRupiah(metrics.ticketInflow)}</span>
                    <span className="text-[10px] text-amber-700 block mt-0.5">{metrics.ticketCount} Transaksi</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-800 font-semibold block">Produk Olahan Susu Farm</span>
                    <span className="text-sm font-bold text-blue-900">{formatRupiah(metrics.dairyInflow)}</span>
                    <span className="text-[10px] text-blue-700 block mt-0.5">{metrics.dairyCount} Transaksi</span>
                  </div>
                </div>
              </div>

              {/* Rincian Posisi Saldo & Perputaran Kas per Rekening Terdaftar (2 Kelompok: BSI & BCA, dan Finance Cash) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Rincian Posisi Saldo & Perputaran per Rekening Bank & Kas
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Terbagi 2 Kelompok: Rekening Bank Resmi (BSI & BCA) dan Finance Cash
                  </span>
                </div>

                {/* 2.1 Kelompok 1: Bank Syariah Indonesia (BSI) & Bank Central Asia (BCA) */}
                <div className="space-y-1">
                  <div className="bg-emerald-900/5 px-2.5 py-1 rounded-t-lg border-x border-t border-slate-300 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      2.1 Kelompok Rekening Bank: Bank Syariah Indonesia (BSI) & Bank Central Asia (BCA)
                    </span>
                    <span className="text-[9px] font-semibold text-emerald-800 uppercase tracking-wider">
                      Transaksi Rekening Bank
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl border border-slate-300 print:overflow-visible">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="p-2 border-r border-slate-300 w-[30%]">Nama Bank / Sumber Rekening</th>
                          <th className="p-2 border-r border-slate-300 w-[18%]">No. Rekening</th>
                          <th className="p-2 border-r border-slate-300 w-[20%]">Atas Nama</th>
                          <th className="p-2 border-r border-slate-300 text-right w-[11%]">Kas Masuk (Rp)</th>
                          <th className="p-2 border-r border-slate-300 text-right w-[11%]">Kas Keluar (Rp)</th>
                          <th className="p-2 text-right w-[10%]">Saldo Realtime (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {bankOfficialGroup.length > 0 ? (
                          bankOfficialGroup.map((b) => (
                            <tr key={b.id}>
                              <td className="p-2 border-r border-slate-200 font-semibold text-slate-900">{b.fullName}</td>
                              <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{b.accountNumber}</td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">{b.accountHolder}</td>
                              <td className="p-2 border-r border-slate-200 text-right text-emerald-800 font-bold">
                                +{formatRupiah(b.inflow)}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right text-rose-700 font-bold">
                                -{formatRupiah(b.outflow)}
                              </td>
                              <td className="p-2 text-right font-black text-slate-900">
                                {formatRupiah(b.currentBalance)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                              Tidak ada data rekening bank resmi yang aktif.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50/80 font-bold border-t border-slate-300 text-slate-900">
                          <td colSpan={3} className="p-2 text-right text-emerald-950 font-bold">
                            SUBTOTAL BANK (BSI & BCA):
                          </td>
                          <td className="p-2 text-right text-emerald-900 font-black">
                            +{formatRupiah(bankSubtotalInflow)}
                          </td>
                          <td className="p-2 text-right text-rose-800 font-black">
                            -{formatRupiah(bankSubtotalOutflow)}
                          </td>
                          <td className="p-2 text-right text-emerald-950 font-black">
                            {formatRupiah(bankSubtotalBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* 2.2 Kelompok 2: Finance Cash (Kas Operasional & Brankas Finance) */}
                <div className="space-y-1 pt-1">
                  <div className="bg-amber-900/5 px-2.5 py-1 rounded-t-lg border-x border-t border-slate-300 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                      2.2 Kelompok Kas: Finance Cash (Kas Operasional & Brankas)
                    </span>
                    <span className="text-[9px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200">
                      *Kas Masuk bersumber dari mutasi antar bank ke rekening kas
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-b-xl border border-slate-300 print:overflow-visible">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                          <th className="p-2 border-r border-slate-300 w-[30%]">Nama Kas / Sumber</th>
                          <th className="p-2 border-r border-slate-300 w-[18%]">Posisi / Lokasi</th>
                          <th className="p-2 border-r border-slate-300 w-[20%]">Penanggung Jawab</th>
                          <th className="p-2 border-r border-slate-300 text-right w-[11%]">Kas Masuk (Mutasi Bank) (Rp)</th>
                          <th className="p-2 border-r border-slate-300 text-right w-[11%]">Kas Keluar (Rp)</th>
                          <th className="p-2 text-right w-[10%]">Saldo Realtime (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {financeCashGroup.length > 0 ? (
                          financeCashGroup.map((b) => (
                            <tr key={b.id}>
                              <td className="p-2 border-r border-slate-200 font-semibold text-slate-900">{b.fullName}</td>
                              <td className="p-2 border-r border-slate-200 font-mono text-slate-700">{b.accountNumber}</td>
                              <td className="p-2 border-r border-slate-200 text-slate-700">{b.accountHolder}</td>
                              <td className="p-2 border-r border-slate-200 text-right text-emerald-800 font-bold">
                                +{formatRupiah(b.inflow)}
                              </td>
                              <td className="p-2 border-r border-slate-200 text-right text-rose-700 font-bold">
                                -{formatRupiah(b.outflow)}
                              </td>
                              <td className="p-2 text-right font-black text-slate-900">
                                {formatRupiah(b.currentBalance)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                              Tidak ada data akun Finance Cash / Kas operasional terdaftar.
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-50/80 font-bold border-t border-slate-300 text-slate-900">
                          <td colSpan={3} className="p-2 text-right text-amber-950 font-bold">
                            SUBTOTAL FINANCE CASH:
                          </td>
                          <td className="p-2 text-right text-emerald-900 font-black">
                            +{formatRupiah(cashSubtotalInflow)}
                          </td>
                          <td className="p-2 text-right text-rose-800 font-black">
                            -{formatRupiah(cashSubtotalOutflow)}
                          </td>
                          <td className="p-2 text-right text-amber-950 font-black">
                            {formatRupiah(cashSubtotalBalance)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Total Konsolidasi Seluruh Kas & Bank */}
                <div className="overflow-x-auto rounded-xl border-2 border-slate-400 print:overflow-visible bg-slate-100">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <tfoot>
                      <tr className="font-bold text-slate-900">
                        <td className="p-2.5 text-right uppercase tracking-wider w-[68%] font-black">
                          TOTAL KONSOLIDASI SELURUH POSISI SALDO & PERPUTARAN KAS & BANK:
                        </td>
                        <td className="p-2.5 text-right text-emerald-900 font-black whitespace-nowrap w-[11%]">
                          +{formatRupiah(totalConsolidatedInflow)}
                        </td>
                        <td className="p-2.5 text-right text-rose-800 font-black whitespace-nowrap w-[11%]">
                          -{formatRupiah(totalConsolidatedOutflow)}
                        </td>
                        <td className="p-2.5 text-right text-emerald-950 font-black text-xs whitespace-nowrap w-[10%]">
                          {formatRupiah(totalConsolidatedBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tabel Transaksi */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">3. Rincian Daftar Transaksi</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-300 print:overflow-visible">
                  <table className="w-full text-left border-collapse text-[11px] print:text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 font-bold">
                        <th className="p-2 border-r border-slate-300">No. Ref</th>
                        <th className="p-2 border-r border-slate-300">Tanggal</th>
                        <th className="p-2 border-r border-slate-300">Kategori</th>
                        <th className="p-2 border-r border-slate-300">Keterangan & Entitas</th>
                        <th className="p-2 border-r border-slate-300">Rekening Kas</th>
                        <th className="p-2 text-right">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredTransactions.map((tx, idx) => {
                        const matchedBank = getBankInfo(tx.sourceAccount);
                        const isMutIn = (tx as any).isMutationIn;
                        const isMutOut = (tx as any).isMutationOut;
                        
                        let catLabel = 'Lainnya';
                        if (isMutIn) {
                          catLabel = 'Mutasi Kas Masuk';
                        } else if (isMutOut) {
                          catLabel = 'Mutasi Kas Keluar';
                        } else if (tx.type === 'outflow') {
                          catLabel = 'Beban Operasional';
                        } else if (tx.incomeSource === 'school_visit') {
                          catLabel = 'Paketan Sekolah';
                        } else if (tx.incomeSource === 'ticket_gate') {
                          catLabel = 'Tiket Loket';
                        } else if (tx.incomeSource === 'dairy_product') {
                          catLabel = 'Olahan Susu';
                        } else if (tx.incomeSource === 'resto_fnb') {
                          catLabel = 'Saung Resto';
                        } else if (tx.incomeSource === 'agriculture') {
                          catLabel = 'Agrikultur';
                        } else if (tx.incomeSource === 'b2b_corporate') {
                          catLabel = 'Mitra B2B';
                        }

                        return (
                          <tr key={`${tx.id}-${idx}`}>
                            <td className="p-2 border-r border-slate-200 font-mono font-semibold">{tx.referenceNo}</td>
                            <td className="p-2 border-r border-slate-200 whitespace-nowrap">{formatDate(tx.date)}</td>
                            <td className="p-2 border-r border-slate-200">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isMutIn ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' :
                                isMutOut ? 'bg-amber-100 text-amber-950 border border-amber-300' :
                                tx.type === 'inflow' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                              }`}>
                                {catLabel}
                              </span>
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="font-medium">{tx.description}</div>
                              {tx.linkedEntityName && (
                                <div className="text-[10px] font-bold text-emerald-800">
                                  [{tx.linkedEntityName}]
                                </div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <div className="font-semibold">{matchedBank ? matchedBank.bankName : tx.sourceAccount}</div>
                              {matchedBank && matchedBank.accountNumber && (
                                <div className="text-[9px] text-slate-400 font-mono">No. {matchedBank.accountNumber}</div>
                              )}
                            </td>
                            <td className={`p-2 text-right font-bold ${tx.type === 'inflow' ? 'text-emerald-800' : 'text-rose-700'}`}>
                              {tx.type === 'inflow' ? '+' : '-'}{formatRupiah(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Posisi Sisa Saldo Akhir Setiap Rekening (Hanya muncul sekali di bagian akhir laporan, tidak berulang di setiap halaman cetak/PDF) */}
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-400 print:overflow-visible bg-slate-50 avoid-break print:break-inside-avoid">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-200/80 border-b border-slate-300 font-bold text-slate-800">
                        <th className="p-2 text-left uppercase tracking-wider text-[10px] font-black w-[70%]">
                          POSISI SISA SALDO AKHIR SETIAP REKENING (REALTIME / CLOSING BALANCE):
                        </th>
                        <th className="p-2 text-right uppercase tracking-wider text-[10px] font-black w-[30%]">
                          SISA SALDO AKHIR (RP)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allAccountsBreakdown.map((b) => (
                        <tr key={b.id} className="bg-white/80 font-medium text-slate-800">
                          <td className="p-2 text-left">
                            <span className="font-semibold text-slate-900">{b.fullName}</span>
                            {b.accountNumber && (
                              <span className="text-[9px] text-slate-500 font-mono ml-2">
                                (No. {b.accountNumber}{b.accountHolder ? ` - ${b.accountHolder}` : ''})
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-black text-slate-900 font-mono">
                            {formatRupiah(b.currentBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50 font-bold border-t-2 border-slate-400 text-slate-900">
                        <td className="p-2.5 text-right uppercase tracking-wider font-black text-emerald-950">
                          TOTAL SISA SALDO AKHIR KONSOLIDASI (SELURUH REKENING):
                        </td>
                        <td className="p-2.5 text-right font-black text-emerald-950 text-xs font-mono">
                          {formatRupiah(totalConsolidatedBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Bagian Tanda Tangan Resmi */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-center text-xs print:pt-6">
                <div>
                  <p className="text-slate-500 mb-14">Dibuat Oleh,</p>
                  <p className="font-bold underline">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500">Staff Keuangan & Kasir</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">Diperiksa Oleh,</p>
                  <p className="font-bold underline">Finance & Accounting Manager</p>
                  <p className="text-[10px] text-slate-500">Manajer Keuangan Usaha</p>
                </div>
                <div>
                  <p className="text-slate-500 mb-14">Disetujui Oleh,</p>
                  <p className="font-bold underline">{companyProfile.directorName}</p>
                  <p className="text-[10px] text-slate-500">{companyProfile.directorTitle}</p>
                </div>
              </div>
            </div>

            {/* Bottom Footer inside modal for easy closing on long reports */}
            <div className="pt-4 border-t border-slate-200 flex justify-end print:hidden">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal Catat Transaksi Baru Cepat */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 text-slate-800 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">Catat Transaksi Kas Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTx} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi:</label>
                  <input
                    type="date"
                    value={newTxDate}
                    onChange={(e) => setNewTxDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipe Transaksi:</label>
                  <select
                    value={newTxType}
                    onChange={(e: any) => setNewTxType(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="inflow">Kas Masuk (Pendapatan)</option>
                    <option value="outflow">Kas Keluar (Beban)</option>
                  </select>
                </div>
              </div>

              {newTxType === 'inflow' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori Agrowisata:</label>
                    <select
                      value={newTxCategory}
                      onChange={(e: any) => setNewTxCategory(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-emerald-800"
                    >
                      <option value="school_visit">🎓 Paketan Sekolah & Field Trip</option>
                      <option value="ticket_gate">🎟️ Penjualan Tiket Loket Gate</option>
                      <option value="dairy_product">🥛 Produk Olahan Susu & Yogurt</option>
                      <option value="resto_fnb">🍲 Saung Resto & F&B</option>
                      <option value="agriculture">🌱 Agrikultur & Bibit Kebun</option>
                      <option value="b2b_corporate">🏢 B2B & CSR</option>
                      <option value="other">📦 Lainnya</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tahap Pembayaran:</label>
                    <select
                      value={newTxPaymentStage}
                      onChange={(e: any) => setNewTxPaymentStage(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    >
                      <option value="full">Pembayaran Penuh (100%)</option>
                      <option value="dp">Uang Muka (DP)</option>
                      <option value="installment">Termin / Cicilan</option>
                      <option value="settlement">Pelunasan (Settlement)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Sumber Kas / Rekening Bank:</label>
                <select
                  value={newTxSourceAccount}
                  onChange={(e) => setNewTxSourceAccount(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.bankName}>
                      {b.bankName} • No. {b.accountNumber} ({b.accountHolder})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Entitas / Sekolah / Pelanggan (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: SDIT Al-Azhar, TK Permata Bunda, Pembeli Umum..."
                  value={newTxEntityName}
                  onChange={(e) => setNewTxEntityName(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Keterangan / Deskripsi Transaksi:</label>
                <input
                  type="text"
                  placeholder="Contoh: DP 30% Paket Wisata Edukasi Menanam 100 Siswa..."
                  value={newTxDescription}
                  onChange={(e) => setNewTxDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nominal Transaksi (Rp):</label>
                <input
                  type="number"
                  value={newTxAmount}
                  onChange={(e) => setNewTxAmount(Number(e.target.value))}
                  min={1000}
                  step={1000}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-800"
                  required
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal Konfirmasi Bersihkan Transaksi */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-rose-100 text-slate-800">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Bersihkan Data Transaksi?</h3>
                <p className="text-xs text-slate-500">Tindakan ini akan mengosongkan seluruh riwayat kas</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 leading-relaxed">
              Seluruh data transaksi kas, rekaman filter, dan data contoh yang telah tercatat akan dihapus secara permanen dari sistem untuk mengembalikan modul ke keadaan bersih (clean slate).
            </p>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                disabled={isClearing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleClearAllTransactions}
                disabled={isClearing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> {isClearing ? 'Membersihkan...' : 'Ya, Bersihkan Seluruh Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
