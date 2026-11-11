import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate 
} from '../../utils/crypto';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Sparkles, 
  ShieldCheck, 
  Ticket, 
  School, 
  ShoppingBag, 
  Utensils, 
  Layers, 
  RefreshCw, 
  Info, 
  SlidersHorizontal, 
  X,
  Search,
  Scale,
  Building2,
  Crown,
  ChevronDown,
  ChevronUp,
  Receipt,
  ArrowUpRight,
  Percent,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Coins
} from 'lucide-react';
import { BudgetAllocation } from '../../types';

interface BudgetAllocationManagerProps {
  onOpenAddTransactionModal?: (preselectedBudgetId?: string) => void;
}

export const BudgetAllocationManager: React.FC<BudgetAllocationManagerProps> = ({ onOpenAddTransactionModal }) => {
  const { 
    budgetAllocations, 
    addBudgetAllocation, 
    updateBudgetAllocation, 
    deleteBudgetAllocation,
    clearAllOutflowTransactions,
    cashTransactions,
    currentUser,
    checkPermission,
    showNotification
  } = useERP();
  const [isPurgingOutflows, setIsPurgingOutflows] = useState(false);

  // Filter & Basis state
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedBudgetId, setExpandedBudgetId] = useState<string | null>(null);

  // Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingBudget, setEditingBudget] = useState<BudgetAllocation | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<BudgetAllocation | null>(null);
  const [showAutoDistributeModal, setShowAutoDistributeModal] = useState<boolean>(false);

  // Form State (Add) - Percentage of Revenue based
  const [bgDepartment, setBgDepartment] = useState<string>('');
  const [bgCategory, setBgCategory] = useState<string>('Biaya Operasional');
  const [bgPercentage, setBgPercentage] = useState<string>('20');
  const [bgAllocated, setBgAllocated] = useState<string>('');
  const [bgFiscalYear, setBgFiscalYear] = useState<number>(2026);

  // Form State (Edit) - Percentage of Revenue based
  const [editBgDept, setEditBgDept] = useState<string>('');
  const [editBgCat, setEditBgCat] = useState<string>('');
  const [editBgPercentage, setEditBgPercentage] = useState<string>('20');
  const [editBgAllocated, setEditBgAllocated] = useState<string>('');
  const [editBgFiscalYear, setEditBgFiscalYear] = useState<number>(2026);

  const canManageBudget = checkPermission('finance', 'edit') || 
    ['finance_manager', 'accounting_manager', 'direktur_utama', 'super_admin'].includes(currentUser.role);

  // 1. Total Dana Masuk Riil (Gross Inflow / Omset Basis)
  const inflows = useMemo(() => {
    return cashTransactions.filter(t => t.type === 'inflow');
  }, [cashTransactions]);

  // Breakdown per sumber dana
  const sourceBreakdown = useMemo(() => {
    const data: Record<string, { total: number; count: number; label: string; icon: any; color: string }> = {
      ticket_gate: { total: 0, count: 0, label: 'Kasir Tiket Masuk & Wahana Gate', icon: Ticket, color: 'text-amber-700 bg-amber-50 border-amber-200' },
      school_visit: { total: 0, count: 0, label: 'Wisata Edukasi Sekolah (Field Trip)', icon: School, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      dairy_product: { total: 0, count: 0, label: 'Produk Olahan Susu Farm', icon: ShoppingBag, color: 'text-blue-700 bg-blue-50 border-blue-200' },
      resto_fnb: { total: 0, count: 0, label: 'Saung Resto & F&B Farm', icon: Utensils, color: 'text-rose-700 bg-rose-50 border-rose-200' },
      other: { total: 0, count: 0, label: 'Pendapatan Lain-lain & Mitra', icon: Layers, color: 'text-slate-700 bg-slate-50 border-slate-200' }
    };

    inflows.forEach(tx => {
      const src = tx.incomeSource || 'other';
      if (data[src]) {
        data[src].total += tx.amount;
        data[src].count += 1;
      } else {
        data.other.total += tx.amount;
        data.other.count += 1;
      }
    });

    return data;
  }, [inflows]);

  // Total Basis Omset yang dipilih (Semua vs Spesifik Sumber)
  const totalRevenueBasis = useMemo(() => {
    if (selectedSourceFilter === 'all') {
      return inflows.reduce((acc, t) => acc + (t.amount || 0), 0);
    }
    return sourceBreakdown[selectedSourceFilter]?.total || 0;
  }, [inflows, selectedSourceFilter, sourceBreakdown]);

  // Total Pengeluaran Kas Riil (Outflows)
  const totalOutflows = useMemo(() => {
    return cashTransactions.filter(t => t.type === 'outflow').reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [cashTransactions]);

  // 2. Kalkulasi Kebijakan Alokasi 70% Perusahaan & 30% Owner berbasis Omset
  const recommendedCompanyRate = 0.70; // 70% dari Omset
  const ownerShareRate = 0.30;         // 30% dari Omset

  const recommendedCompanyAmount = Math.round(totalRevenueBasis * recommendedCompanyRate);
  const ownerShareAmount = Math.round(totalRevenueBasis * ownerShareRate);

  // Helper to match transactions for budget realization
  const matchDeptKeyword = (dept: string, desc?: string) => {
    if (!desc) return false;
    const d = dept.toLowerCase();
    const t = desc.toLowerCase();
    if (d.includes('wisata') || d.includes('edukasi') || d.includes('lapangan') || d.includes('guide') || d.includes('fasilitator')) {
      return t.includes('wisata') || t.includes('edukasi') || t.includes('fasilitator') || t.includes('tiket') || t.includes('lapangan');
    }
    if (d.includes('ternak') || d.includes('pakan') || d.includes('satwa') || d.includes('hewan')) {
      return t.includes('pakan') || t.includes('konsentrat') || t.includes('rumput') || t.includes('dokter') || t.includes('obat') || t.includes('sapi') || t.includes('kambing');
    }
    if (d.includes('resto') || d.includes('kuliner') || d.includes('f&b') || d.includes('saung')) {
      return t.includes('resto') || t.includes('makan') || t.includes('f&b') || t.includes('catering') || t.includes('dapur') || t.includes('konsumsi');
    }
    if (d.includes('fasilitas') || d.includes('sarpras') || d.includes('pemeliharaan') || d.includes('kebersihan')) {
      return t.includes('listrik') || t.includes('air') || t.includes('renovasi') || t.includes('kebersihan') || t.includes('sarpras') || t.includes('pemeliharaan');
    }
    if (d.includes('pemasaran') || d.includes('promosi') || d.includes('marketing') || d.includes('administrasi') || d.includes('kantor')) {
      return t.includes('brosur') || t.includes('iklan') || t.includes('banner') || t.includes('marketing') || t.includes('atk') || t.includes('promosi');
    }
    return false;
  };

  // Get live transactions associated with a specific budget pocket
  const getBudgetTransactions = (b: BudgetAllocation) => {
    return cashTransactions.filter(t => t.type === 'outflow' && (
      t.budgetId === b.id ||
      (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase()) ||
      (!t.budgetId && !t.budgetName && matchDeptKeyword(b.department, t.description))
    ));
  };

  // Get live spent amount associated with a budget pocket
  const getBudgetSpentAmount = (b: BudgetAllocation) => {
    const txs = getBudgetTransactions(b);
    return txs.reduce((sum, t) => sum + (t.amount || 0), 0);
  };

  // 3. Filter Alokasi Anggaran Departemen
  const filteredBudgets = useMemo(() => {
    return budgetAllocations.filter(b => {
      const matchYear = !selectedYear || b.fiscalYear === selectedYear;
      const matchQuery = !searchQuery || 
        b.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchYear && matchQuery;
    });
  }, [budgetAllocations, selectedYear, searchQuery]);

  // Total Plafon Seluruh Dompet Perusahaan yang Telah Ditetapkan (Nominal Total Alokasi Perusahaan)
  const totalCompanyAllocatedAmount = useMemo(() => {
    return budgetAllocations.reduce((acc, b) => acc + (b.allocatedAmount || 0), 0);
  }, [budgetAllocations]);

  // Total Persentase Seluruh Dompet Perusahaan terhadap OMSET (Misal 70% dari Omset)
  const totalCompanyAllocatedPercentageOfOmset = useMemo(() => {
    return budgetAllocations.reduce((acc, b) => {
      if (b.percentageOfRevenue !== undefined) {
        return acc + b.percentageOfRevenue;
      }
      if (b.percentageOfCompanyShare !== undefined) {
        // Jika data lama dalam persentase dari 70%, konversi ke % dari omset (misal 30% dari 70% = 21% omset)
        return acc + (b.percentageOfCompanyShare * 0.70);
      }
      return acc + (totalRevenueBasis > 0 ? (b.allocatedAmount / totalRevenueBasis) * 100 : 0);
    }, 0);
  }, [budgetAllocations, totalRevenueBasis]);

  // Total Realisasi Pengeluaran Kas Seluruh Dompet (Dihitung Real-time dari Kas Keluar)
  const totalCompanySpentAmount = useMemo(() => {
    return budgetAllocations.reduce((acc, b) => acc + getBudgetSpentAmount(b), 0);
  }, [budgetAllocations, cashTransactions]);

  // Total Sisa Saldo Tersedia di Seluruh Dompet Perusahaan
  const totalCompanyRemainingBalance = Math.max(0, totalCompanyAllocatedAmount - totalCompanySpentAmount);

  // Sisa Kuota Menuju Target 70% Rekomendasi Alokasi Perusahaan
  const remainingPercentageTo70 = Math.max(0, 70 - totalCompanyAllocatedPercentageOfOmset);
  const remainingNominalTo70 = Math.max(0, recommendedCompanyAmount - totalCompanyAllocatedAmount);
  const isExceeding70 = totalCompanyAllocatedPercentageOfOmset > 70.05 || (recommendedCompanyAmount > 0 && totalCompanyAllocatedAmount > recommendedCompanyAmount);
  
  // Persentase Penggunaan Plafon Dompet Perusahaan
  const companySpentUsagePercent = totalCompanyAllocatedAmount > 0 
    ? Math.min(100, Math.round((totalCompanySpentAmount / totalCompanyAllocatedAmount) * 100)) 
    : 0;

  // Sync nominal when % of Omset changes in Add Form
  const handlePercentageChangeAdd = (pctStr: string) => {
    setBgPercentage(pctStr);
    const pct = parseFloat(pctStr);
    if (!isNaN(pct) && totalRevenueBasis > 0) {
      const calculated = Math.round((totalRevenueBasis * pct) / 100);
      setBgAllocated(String(calculated));
    }
  };

  // Sync % of Omset when nominal changes in Add Form
  const handleAllocatedChangeAdd = (allocStr: string) => {
    setBgAllocated(allocStr);
    const alloc = parseFloat(allocStr);
    if (!isNaN(alloc) && totalRevenueBasis > 0) {
      const calculatedPct = ((alloc / totalRevenueBasis) * 100).toFixed(1);
      setBgPercentage(calculatedPct);
    }
  };

  // Sync nominal when % of Omset changes in Edit Form
  const handlePercentageChangeEdit = (pctStr: string) => {
    setEditBgPercentage(pctStr);
    const pct = parseFloat(pctStr);
    if (!isNaN(pct) && totalRevenueBasis > 0) {
      const calculated = Math.round((totalRevenueBasis * pct) / 100);
      setEditBgAllocated(String(calculated));
    }
  };

  // Sync % of Omset when nominal changes in Edit Form
  const handleAllocatedChangeEdit = (allocStr: string) => {
    setEditBgAllocated(allocStr);
    const alloc = parseFloat(allocStr);
    if (!isNaN(alloc) && totalRevenueBasis > 0) {
      const calculatedPct = ((alloc / totalRevenueBasis) * 100).toFixed(1);
      setEditBgPercentage(calculatedPct);
    }
  };

  // Handler: Distribusi Otomatis Standar (Total 70% Omset) ke Dompet-Dompet Operasional Terpisah
  const handleApplyAutoDistribution = async () => {
    if (totalRevenueBasis <= 0) {
      showNotification('Total omset / penerimaan kas masih Rp 0. Belum ada omset untuk dialokasikan.', 'error');
      return;
    }

    // 5 Dompet Operasional Standar dengan Persentase Langsung terhadap OMSET (Total = 70% Omset)
    const standardDepts = [
      { 
        name: "Divisi Wisata Edukasi, Wahana Satwa & Lapangan", 
        category: "Operasional Eduwisata & Fasilitator", 
        percentageOfRevenue: 20 // 20% dari Omset
      },
      { 
        name: "Divisi Peternakan, Pakan Ternak & Kesehatan Satwa", 
        category: "Pakan, Nutrisi & Pemeliharaan Satwa", 
        percentageOfRevenue: 18 // 18% dari Omset
      },
      { 
        name: "Divisi Saung Resto, Kuliner & F&B Farm", 
        category: "Bahan Baku Resto & Catering", 
        percentageOfRevenue: 14 // 14% dari Omset
      },
      { 
        name: "Divisi Pemeliharaan Fasilitas & Sarpras Agrowisata", 
        category: "Listrik, Air & Sarana Prasarana", 
        percentageOfRevenue: 10 // 10% dari Omset
      },
      { 
        name: "Divisi Pemasaran, Promosi Sekolah & Administrasi", 
        category: "Pemasaran, Brosur & Operasional Kantor", 
        percentageOfRevenue: 8  // 8% dari Omset
      }
    ];

    try {
      // Hapus dompet anggaran lama terlebih dahulu jika ada
      for (const b of budgetAllocations) {
        await deleteBudgetAllocation(b.id);
      }

      // Tambahkan 5 dompet baru dengan persentase berbasis omset
      for (const dept of standardDepts) {
        const allocatedForDept = Math.round(totalRevenueBasis * (dept.percentageOfRevenue / 100));
        await addBudgetAllocation({
          department: dept.name,
          category: dept.category,
          percentageOfRevenue: dept.percentageOfRevenue,
          percentageOfCompanyShare: dept.percentageOfRevenue,
          allocatedAmount: allocatedForDept,
          quarter: 'Q1',
          fiscalYear: selectedYear || 2026
        });
      }

      setShowAutoDistributeModal(false);
      showNotification('Distribusi 70% Omset ke 5 Dompet Anggaran Operasional berhasil diterapkan!', 'success');
    } catch (err: any) {
      showNotification('Gagal menerapkan distribusi otomatis: ' + err?.message, 'error');
    }
  };

  // Sinkronkan Realisasi Belanja dari Kas Keluar Riil
  const handleSyncRealizationWithOutflows = async () => {
    if (budgetAllocations.length === 0) {
      showNotification('Belum ada data dompet anggaran untuk disinkronkan.', 'info');
      return;
    }

    let totalUpdated = 0;
    for (const b of budgetAllocations) {
      const realSpent = getBudgetSpentAmount(b);
      if (realSpent !== b.spentAmount) {
        await updateBudgetAllocation(b.id, { spentAmount: realSpent });
        totalUpdated++;
      }
    }

    showNotification(`Sinkronisasi realisasi selesai. ${totalUpdated} dompet anggaran diperbarui dari arus kas keluar riil.`, 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Ringkas & Tombol Aksi Dompet Anggaran */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Alokasi & Realisasi Anggaran (Dompet Operasional)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan pos anggaran sebagai dompet terpisah dengan kalkulasi persentase berbasis Total Omset Agrowisata
          </p>
        </div>

        {canManageBudget && (
          <div className="flex flex-wrap items-center gap-2">
            {totalOutflows > 0 && (
              <button
                onClick={async () => {
                  setIsPurgingOutflows(true);
                  try {
                    await clearAllOutflowTransactions({ silent: false });
                  } finally {
                    setIsPurgingOutflows(false);
                  }
                }}
                disabled={isPurgingOutflows}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Hapus seluruh rincian belanja kas keluar, jurnal beban terkait, dan reset realisasi anggaran ke Rp 0"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>{isPurgingOutflows ? 'Mereset Belanja...' : 'Bersihkan Rincian Belanja (Reset Rp 0)'}</span>
              </button>
            )}
            <button
              onClick={() => setShowAutoDistributeModal(true)}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs"
              title="Distribusi otomatis 70% omset ke 5 dompet operasional standar"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" /> Distribusi Otomatis 70% Omset
            </button>
            <button
              onClick={() => {
                setBgDepartment('');
                setBgCategory('Biaya Operasional');
                const initialPct = remainingPercentageTo70 > 0 ? Math.min(20, Math.round(remainingPercentageTo70)) : 15;
                setBgPercentage(String(initialPct));
                if (totalRevenueBasis > 0) {
                  setBgAllocated(String(Math.round((totalRevenueBasis * initialPct) / 100)));
                } else {
                  setBgAllocated('');
                }
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Dompet Anggaran (%)
            </button>
          </div>
        )}
      </div>

      {/* 2. Filter Sumber Pendapatan & Parameter Basis Omset */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Basis Total Omset Agrowisata</h3>
              <p className="text-[11px] text-slate-500">Pilih basis penerimaan omset untuk kalkulasi alokasi persentase pos anggaran</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value={2026}>Tahun Fiskal 2026</option>
              <option value={2025}>Tahun Fiskal 2025</option>
            </select>
          </div>
        </div>

        {/* Source Pills Switcher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          <button
            onClick={() => setSelectedSourceFilter('all')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Semua Omset (Total)</span>
              <Layers className="w-3 h-3" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'all' ? 'text-emerald-300' : 'text-slate-900'}`}>
              {formatCompactRupiah(inflows.reduce((a, t) => a + t.amount, 0))}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{inflows.length} transaksi</div>
          </button>

          {/* Kasir Tiket Gate */}
          <button
            onClick={() => setSelectedSourceFilter('ticket_gate')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'ticket_gate'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Kasir Tiket Gate</span>
              <Ticket className="w-3 h-3 text-amber-600" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'ticket_gate' ? 'text-amber-100' : 'text-amber-900'}`}>
              {formatCompactRupiah(sourceBreakdown.ticket_gate.total)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{sourceBreakdown.ticket_gate.count} transaksi</div>
          </button>

          {/* Kunjungan Sekolah */}
          <button
            onClick={() => setSelectedSourceFilter('school_visit')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'school_visit'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Wisata Sekolah</span>
              <School className="w-3 h-3 text-emerald-600" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'school_visit' ? 'text-emerald-100' : 'text-emerald-900'}`}>
              {formatCompactRupiah(sourceBreakdown.school_visit.total)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{sourceBreakdown.school_visit.count} rombongan</div>
          </button>

          {/* Olahan Susu */}
          <button
            onClick={() => setSelectedSourceFilter('dairy_product')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'dairy_product'
                ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                : 'bg-blue-50/70 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Olahan Susu</span>
              <ShoppingBag className="w-3 h-3 text-blue-600" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'dairy_product' ? 'text-blue-100' : 'text-blue-900'}`}>
              {formatCompactRupiah(sourceBreakdown.dairy_product.total)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{sourceBreakdown.dairy_product.count} transaksi</div>
          </button>

          {/* Saung Resto */}
          <button
            onClick={() => setSelectedSourceFilter('resto_fnb')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'resto_fnb'
                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                : 'bg-rose-50/70 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Saung Resto & F&B</span>
              <Utensils className="w-3 h-3 text-rose-600" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'resto_fnb' ? 'text-rose-100' : 'text-rose-900'}`}>
              {formatCompactRupiah(sourceBreakdown.resto_fnb.total)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{sourceBreakdown.resto_fnb.count} pesanan</div>
          </button>

          {/* Lain-lain */}
          <button
            onClick={() => setSelectedSourceFilter('other')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              selectedSourceFilter === 'other'
                ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span>Lain-lain</span>
              <Layers className="w-3 h-3 text-slate-500" />
            </div>
            <div className={`text-xs font-mono font-bold mt-1 ${selectedSourceFilter === 'other' ? 'text-slate-100' : 'text-slate-800'}`}>
              {formatCompactRupiah(sourceBreakdown.other.total)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">{sourceBreakdown.other.count} transaksi</div>
          </button>
        </div>
      </div>

      {/* 3. Panel Ringkasan Total Alokasi Perusahaan vs Hak Owner 30% */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Card 1: Total Alokasi yang Dimiliki Perusahaan (Plafon Seluruh Dompet) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white p-5 rounded-3xl border-2 border-emerald-300 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                  Total Alokasi Perusahaan (Dompet Operasional)
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Plafon & Realisasi Seluruh Dompet Perusahaan
                </h3>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`px-3 py-1 font-extrabold text-xs rounded-xl font-mono shadow-xs ${
                isExceeding70 ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'
              }`}>
                {totalCompanyAllocatedPercentageOfOmset.toFixed(1)}% Omset
              </span>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                Panduan: 70.0% Omset ({formatCompactRupiah(recommendedCompanyAmount)})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Plafon Total Perusahaan */}
            <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium block">Total Nominal Plafon Dompet:</span>
              <div className="text-xl font-black font-mono text-emerald-900">
                {formatRupiah(totalCompanyAllocatedAmount)}
              </div>
              <div className="text-[10px] text-emerald-700 font-semibold">
                Akumulasi {budgetAllocations.length} Dompet Aktif
              </div>
            </div>

            {/* Realisasi Belanja Keluar */}
            <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium block">Total Realisasi Kas Keluar:</span>
              <div className="text-xl font-black font-mono text-rose-700">
                {formatRupiah(totalCompanySpentAmount)}
              </div>
              <div className="text-[10px] text-rose-600 font-semibold">
                {companySpentUsagePercent}% Terpakai dari Plafon
              </div>
            </div>

            {/* Sisa Saldo Dompet */}
            <div className="p-3.5 bg-white/90 rounded-2xl border border-emerald-200/80 space-y-1">
              <span className="text-[11px] text-slate-500 font-medium block">Sisa Saldo Dompet Perusahaan:</span>
              <div className="text-xl font-black font-mono text-emerald-800">
                {formatRupiah(totalCompanyRemainingBalance)}
              </div>
              <div className="text-[10px] text-slate-500 font-semibold">
                Siap Dibelanjakan Operasional
              </div>
            </div>
          </div>

          {/* Bar Status Penggunaan Plafon Dompet Perusahaan */}
          <div className="p-3 bg-white/80 rounded-2xl border border-emerald-200 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Realisasi Pengeluaran Kas terhadap Plafon:</span>
              <strong className="font-mono text-slate-800">
                {formatRupiah(totalCompanySpentAmount)} / {formatRupiah(totalCompanyAllocatedAmount)} ({companySpentUsagePercent}%)
              </strong>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  companySpentUsagePercent >= 90 ? 'bg-rose-500' : companySpentUsagePercent >= 75 ? 'bg-amber-500' : 'bg-emerald-600'
                }`} 
                style={{ width: `${Math.min(100, companySpentUsagePercent)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span>Total Omset Basis: <strong className="text-slate-800 font-mono font-bold">{formatRupiah(totalRevenueBasis)}</strong></span>
              <span>Kapasitas Tambahan ke 70%: <strong className="text-emerald-700 font-mono font-bold">{remainingPercentageTo70.toFixed(1)}% ({formatCompactRupiah(remainingNominalTo70)})</strong></span>
            </div>
          </div>
        </div>

        {/* Card 2: 30% Porsi Owner (Equity Terproteksi) */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-5 rounded-3xl border-2 border-amber-300 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                    🔒 Terkunci Hak Pemilik
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    30% Porsi Owner (Equity)
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-600 text-white font-extrabold text-xs rounded-xl font-mono shadow-xs">
                30.0%
              </span>
            </div>

            <div className="p-3.5 bg-white/90 rounded-2xl border border-amber-200/80 space-y-1">
              <span className="text-xs text-slate-500 block font-medium">Total Hak Bagi Hasil Pemilik (30% Omset):</span>
              <div className="text-2xl font-black font-mono text-amber-900">
                {formatRupiah(ownerShareAmount)}
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" /> Proteksi Hak Bagi Hasil Owner
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Porsi <strong className="text-slate-800 font-bold">30% dari total omset</strong> merupakan hak pemilik / dividen terproteksi dan tidak boleh digunakan untuk belanja dompet operasional.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Status Proteksi:</span>
            <span className="font-semibold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Terkunci Aman
            </span>
          </div>
        </div>

      </div>

      {/* 4. Action & Control Bar for Department Budget Pockets */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama dompet anggaran / kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 font-medium"
            />
          </div>

          <button
            onClick={handleSyncRealizationWithOutflows}
            className="p-2 sm:px-3 sm:py-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
            title="Sinkronkan realisasi belanja dari transaksi kas keluar riil"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Sinkron Realisasi Kas</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500">
            {filteredBudgets.length} Dompet Anggaran Terpisah
          </span>
          {canManageBudget && (
            <button
              onClick={() => {
                setBgDepartment('');
                setBgCategory('Biaya Operasional');
                const initialPct = remainingPercentageTo70 > 0 ? Math.min(20, Math.round(remainingPercentageTo70)) : 15;
                setBgPercentage(String(initialPct));
                if (totalRevenueBasis > 0) {
                  setBgAllocated(String(Math.round((totalRevenueBasis * initialPct) / 100)));
                } else {
                  setBgAllocated('');
                }
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Dompet (%)
            </button>
          )}
        </div>
      </div>

      {/* 5. Dedicated Pocket Budgeting Cards Grid (Dompet Anggaran Terpisah) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBudgets.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white border border-slate-200 rounded-3xl p-6 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
              <Wallet className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Belum Ada Dompet Anggaran Terpisah</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Gunakan tombol <strong>"Distribusi Otomatis 70% Omset"</strong> di atas untuk membagikan porsi omset ke 5 dompet operasional agrowisata secara instan.
            </p>
            {canManageBudget && (
              <button
                onClick={() => setShowAutoDistributeModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-2 shadow-xs cursor-pointer mt-2"
              >
                <Sparkles className="w-4 h-4" /> Terapkan Distribusi 70% Sekarang
              </button>
            )}
          </div>
        ) : (
          filteredBudgets.map((b) => {
            const realSpent = getBudgetSpentAmount(b);
            const percent = b.allocatedAmount > 0 ? Math.min(100, Math.round((realSpent / b.allocatedAmount) * 100)) : 0;
            const remaining = b.allocatedAmount - realSpent;
            const isOverbudget = remaining < 0;
            const isWarning = percent >= 75 && !isOverbudget;
            
            // Persentase langsung dari Omset
            const deptPctOfRevenue = b.percentageOfRevenue !== undefined 
              ? b.percentageOfRevenue 
              : (b.percentageOfCompanyShare !== undefined 
                  ? b.percentageOfCompanyShare * 0.70 
                  : (totalRevenueBasis > 0 ? ((b.allocatedAmount / totalRevenueBasis) * 100) : 0));
            
            const linkedTxs = getBudgetTransactions(b);
            const isExpanded = expandedBudgetId === b.id;

            return (
              <div 
                key={b.id} 
                className={`p-5 rounded-3xl bg-white border shadow-xs space-y-3.5 relative group transition-all flex flex-col justify-between ${
                  isOverbudget 
                    ? 'border-rose-300 hover:border-rose-400 bg-rose-50/10' 
                    : isWarning 
                    ? 'border-amber-300 hover:border-amber-400' 
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Dompet Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                        isOverbudget 
                          ? 'bg-rose-100 text-rose-700' 
                          : isWarning 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{b.department}</h4>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                            👛 {Number(deptPctOfRevenue).toFixed(1)}% dari Total Omset
                          </span>
                          <span className="text-[11px] text-slate-500">
                            • {b.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                        isOverbudget
                          ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                          : isWarning 
                          ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isOverbudget ? (
                          <>
                            <AlertCircle className="w-3 h-3 text-rose-600" /> Overbudget ({percent}%)
                          </>
                        ) : isWarning ? (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Menipis ({percent}%)
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Aman ({percent}%)
                          </>
                        )}
                      </span>

                      {canManageBudget && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBudget(b);
                              setEditBgDept(b.department);
                              setEditBgCat(b.category);
                              const pctVal = deptPctOfRevenue ? String(Number(deptPctOfRevenue).toFixed(1)) : '20';
                              setEditBgPercentage(pctVal);
                              setEditBgAllocated(String(b.allocatedAmount));
                              setEditBgFiscalYear(b.fiscalYear);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 text-slate-600 hover:text-white transition cursor-pointer"
                            title="Edit Persentase & Plafon Dompet"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setBudgetToDelete(b)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 text-slate-600 hover:text-white transition cursor-pointer"
                            title="Hapus Dompet Anggaran"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar Dompet */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverbudget ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      />
                    </div>
                  </div>

                  {/* 3-Column Stat Grid (Dompet Financial Status) */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="p-2 bg-slate-50/80 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Plafon Dompet:</span>
                      <strong className="text-slate-900 font-mono text-xs sm:text-sm font-bold">{formatCompactRupiah(b.allocatedAmount)}</strong>
                    </div>
                    <div className="p-2 bg-rose-50/50 rounded-xl border border-rose-100">
                      <span className="text-[10px] text-rose-700 block uppercase font-medium">Realisasi Debet:</span>
                      <strong className="text-rose-700 font-mono text-xs sm:text-sm font-bold">{formatCompactRupiah(realSpent)}</strong>
                    </div>
                    <div className={`p-2 rounded-xl border ${
                      isOverbudget ? 'bg-rose-100/60 border-rose-200' : 'bg-emerald-50/50 border-emerald-100'
                    }`}>
                      <span className={`text-[10px] block uppercase font-medium ${isOverbudget ? 'text-rose-800' : 'text-emerald-700'}`}>
                        {isOverbudget ? 'Defisit Dompet:' : 'Sisa Saldo Dompet:'}
                      </span>
                      <strong className={`font-mono text-xs sm:text-sm font-bold ${isOverbudget ? 'text-rose-800' : 'text-emerald-800'}`}>
                        {isOverbudget ? `-${formatCompactRupiah(Math.abs(remaining))}` : formatCompactRupiah(remaining)}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Footer Controls: Rincian Mutasi & Catat Pengeluaran Langsung ke Dompet */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedBudgetId(isExpanded ? null : b.id)}
                    className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{linkedTxs.length} Mutasi Kas Keluar</span>
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {onOpenAddTransactionModal && (
                    <button
                      onClick={() => onOpenAddTransactionModal(b.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Catat transaksi kas keluar dan debet langsung dompet ini"
                    >
                      <ArrowUpRight className="w-3 h-3 text-emerald-700" /> Catat Kas Keluar
                    </button>
                  )}
                </div>

                {/* Expanded Transactions List (Mutasi Kas Dompet) */}
                {isExpanded && (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mt-2 text-xs animate-in fade-in duration-150">
                    <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                      <span>Rincian Pengeluaran yang Mendebet Dompet Ini:</span>
                      <span className="text-rose-700 font-mono font-bold">{formatRupiah(realSpent)}</span>
                    </div>

                    {linkedTxs.length === 0 ? (
                      <div className="text-slate-400 text-center py-2 text-[11px]">
                        Belum ada transaksi kas keluar yang membebankan dompet ini.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {linkedTxs.map((tx, idx) => (
                          <div key={`${tx.id}-${idx}`} className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-800 truncate text-[11px]">{tx.description}</div>
                              <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                                <span>{formatDate(tx.receivedDate || tx.date)}</span>
                                <span>•</span>
                                <span className="text-blue-700 font-bold">{tx.referenceNo}</span>
                                <span>•</span>
                                <span>{tx.sourceAccount}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-mono font-bold text-rose-700 text-xs">-{formatRupiah(tx.amount)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 6. Modal: Tambah Dompet Anggaran Baru Berdasarkan Persentase Omset */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Tambah Dompet Anggaran Operasional</h3>
                  <p className="text-[11px] text-emerald-700 font-semibold">Persentase dihitung langsung dari Total Omset</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Kapasitas Omset & Live Calculation */}
            <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-emerald-900 font-bold">Total Omset Agrowisata (Basis):</span>
                <strong className="font-mono text-emerald-800">{formatRupiah(totalRevenueBasis)}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700">Total Alokasi Saat Ini:</span>
                <strong className="font-mono text-slate-800 font-bold">
                  {totalCompanyAllocatedPercentageOfOmset.toFixed(1)}% Omset ({formatRupiah(totalCompanyAllocatedAmount)})
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200">
                <span className="text-slate-600">Sisa Kapasitas Menuju Rekomendasi 70%:</span>
                <strong className="font-mono text-emerald-900 font-bold">
                  {remainingPercentageTo70.toFixed(1)}% Omset ({formatRupiah(remainingNominalTo70)})
                </strong>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!bgDepartment || !bgAllocated) return;
              
              const pctNum = Number(bgPercentage) || 0;
              const allocatedNum = Number(bgAllocated);

              if (pctNum > remainingPercentageTo70 && remainingPercentageTo70 > 0) {
                if (!window.confirm(`Perhatian: Persentase alokasi (${pctNum}%) akan membuat total alokasi perusahaan melebihi panduan 70% omset. Apakah Anda tetap ingin melanjutkan?`)) {
                  return;
                }
              }

              await addBudgetAllocation({
                department: bgDepartment,
                category: bgCategory || 'Biaya Operasional',
                percentageOfRevenue: pctNum,
                percentageOfCompanyShare: pctNum,
                allocatedAmount: allocatedNum,
                quarter: 'Q1',
                fiscalYear: Number(bgFiscalYear) || 2026
              });
              setShowAddModal(false);
              setBgDepartment('');
              setBgCategory('Biaya Operasional');
              setBgAllocated('');
            }} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Dompet / Unit Operasional:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Divisi Wahana Satwa & Pakan Ternak"
                  value={bgDepartment}
                  onChange={(e) => setBgDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Belanja Operasional:</label>
                <input
                  type="text"
                  placeholder="Contoh: Pakan Ternak, Pemeliharaan Wahana, Promosi Edukasi..."
                  value={bgCategory}
                  onChange={(e) => setBgCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {/* Input Persentase dari Omset & Kalkulasi Nominal Otomatis */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" />
                    Persentase dari Total Omset (% Omset):
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Panduan Sisa: {remainingPercentageTo70.toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    required
                    placeholder="Contoh: 18"
                    value={bgPercentage}
                    onChange={(e) => handlePercentageChangeAdd(e.target.value)}
                    className="w-28 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-base text-center"
                  />
                  <div className="text-sm font-bold text-slate-600">%</div>

                  {/* Preset Buttons */}
                  <div className="flex items-center gap-1 flex-wrap flex-1 justify-end">
                    {[5, 8, 10, 14, 18, 20].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePercentageChangeAdd(String(p))}
                        className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs cursor-pointer transition ${
                          bgPercentage === String(p)
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hasil Kalkulasi Nominal Rp */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Plafon Dompet Hasil Hitung:</span>
                    <strong className="text-sm font-mono font-bold text-emerald-800">
                      {formatRupiah(Number(bgAllocated) || 0)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Penyesuaian Manual Plafon (Rp):</span>
                    <input
                      type="number"
                      value={bgAllocated}
                      onChange={(e) => handleAllocatedChangeAdd(e.target.value)}
                      className="w-36 p-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tahun Anggaran:</label>
                <input
                  type="number"
                  required
                  value={bgFiscalYear}
                  onChange={(e) => setBgFiscalYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                />
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
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Dompet Anggaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal: Edit Dompet Anggaran Berdasarkan Persentase Omset */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Edit Plafon & Persentase Dompet</h3>
                  <p className="text-[11px] text-blue-700 font-semibold">Persentase dihitung langsung dari Total Omset</p>
                </div>
              </div>
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
                percentageOfRevenue: Number(editBgPercentage) || 0,
                percentageOfCompanyShare: Number(editBgPercentage) || 0,
                allocatedAmount: Number(editBgAllocated) || 0,
                quarter: editingBudget.quarter || 'Q1',
                fiscalYear: Number(editBgFiscalYear) || 2026
              });
              setEditingBudget(null);
            }} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Dompet / Unit Operasional:</label>
                <input
                  type="text"
                  required
                  value={editBgDept}
                  onChange={(e) => setEditBgDept(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kategori Belanja:</label>
                <input
                  type="text"
                  value={editBgCat}
                  onChange={(e) => setEditBgCat(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              {/* Input Persentase dari Omset & Kalkulasi Nominal Otomatis */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-blue-700" />
                    Persentase dari Total Omset (% Omset):
                  </label>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Basis Omset: {formatCompactRupiah(totalRevenueBasis)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="100"
                    required
                    value={editBgPercentage}
                    onChange={(e) => handlePercentageChangeEdit(e.target.value)}
                    className="w-28 p-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-base text-center"
                  />
                  <div className="text-sm font-bold text-slate-600">%</div>

                  <div className="flex items-center gap-1 flex-wrap flex-1 justify-end">
                    {[5, 8, 10, 14, 18, 20].map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePercentageChangeEdit(String(p))}
                        className={`px-2.5 py-1.5 rounded-lg font-mono font-bold text-xs cursor-pointer transition ${
                          editBgPercentage === String(p)
                            ? 'bg-blue-700 text-white'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hasil Kalkulasi Nominal Rp */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Plafon Dompet Hasil Hitung:</span>
                    <strong className="text-sm font-mono font-bold text-blue-900">
                      {formatRupiah(Number(editBgAllocated) || 0)}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Penyesuaian Manual Plafon (Rp):</span>
                    <input
                      type="number"
                      value={editBgAllocated}
                      onChange={(e) => handleAllocatedChangeEdit(e.target.value)}
                      className="w-36 p-1 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono font-bold text-xs text-right"
                    />
                  </div>
                </div>
              </div>

              {/* Status Realisasi Belanja */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-amber-800 block text-[11px] font-semibold">Realisasi Debet Kas Riil:</span>
                  <strong className="text-rose-700 font-mono font-bold text-sm">
                    {formatRupiah(getBudgetSpentAmount(editingBudget))}
                  </strong>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-semibold">
                  Tersinkron Otomatis dari Arus Kas
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tahun Anggaran:</label>
                <input
                  type="number"
                  required
                  value={editBgFiscalYear}
                  onChange={(e) => setEditBgFiscalYear(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono font-bold"
                />
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
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal: Konfirmasi Distribusi Otomatis 70% Omset */}
      {showAutoDistributeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Distribusi Cerdas 70% Omset Agrowisata</h3>
                  <p className="text-xs text-slate-500">Membagi plafon ke 5 dompet operasional terpisah berdasarkan % Total Omset</p>
                </div>
              </div>
              <button onClick={() => setShowAutoDistributeModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 block text-[11px]">Total Omset Agrowisata:</span>
                  <strong className="text-base font-mono font-bold text-slate-900">{formatRupiah(totalRevenueBasis)}</strong>
                </div>
                <div className="text-right">
                  <span className="text-emerald-700 block text-[11px]">Total 70% Alokasi Perusahaan:</span>
                  <strong className="text-sm font-mono font-bold text-emerald-800">{formatRupiah(recommendedCompanyAmount)}</strong>
                </div>
              </div>

              <div className="text-slate-700 font-bold flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-700" />
                Rencana Pembagian 5 Dompet Anggaran Operasional (Total = 70% Omset):
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">1. Divisi Wisata Edukasi, Wahana Satwa & Lapangan</div>
                    <div className="text-[11px] text-slate-500">Fasilitator, guide, tiket & wahana interaktif</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">20% Omset</span>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {formatRupiah(Math.round(totalRevenueBasis * 0.20))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">2. Divisi Peternakan, Pakan Ternak & Kesehatan Satwa</div>
                    <div className="text-[11px] text-slate-500">Pakan sapi perah, kambing etawa, konsentrat & dokter hewan</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">18% Omset</span>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {formatRupiah(Math.round(totalRevenueBasis * 0.18))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">3. Divisi Saung Resto, Kuliner & F&B Farm</div>
                    <div className="text-[11px] text-slate-500">Bahan baku makanan, resto saung & catering rombongan</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">14% Omset</span>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {formatRupiah(Math.round(totalRevenueBasis * 0.14))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">4. Divisi Pemeliharaan Fasilitas & Sarpras Agrowisata</div>
                    <div className="text-[11px] text-slate-500">Listrik, air, kebersihan lahan & perbaikan kandang</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">10% Omset</span>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {formatRupiah(Math.round(totalRevenueBasis * 0.10))}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-800">5. Divisi Pemasaran, Promosi Sekolah & Administrasi</div>
                    <div className="text-[11px] text-slate-500">Marketing sekolah, brosur promo & ATK kantor</div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] font-mono">8% Omset</span>
                    <div className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                      {formatRupiah(Math.round(totalRevenueBasis * 0.08))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Penerapan ini akan mendistribusikan total <strong className="font-bold">70% dari Omset</strong> ke 5 dompet mandiri, dan menyisakan <strong className="font-bold">30% Omset ({formatRupiah(ownerShareAmount)})</strong> sebagai Hak Bagi Hasil Pemilik.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAutoDistributeModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyAutoDistribution}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Terapkan Distribusi 70% Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Konfirmasi Hapus Pos Anggaran */}
      {budgetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Hapus Dompet Anggaran</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan dompet anggaran operasional</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-medium">Dompet / Unit:</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px]">{budgetToDelete.department}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Kategori Belanja:</span>
                <span className="font-semibold text-slate-700">{budgetToDelete.category}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Plafon Dompet:</span>
                <span className="font-mono font-bold text-emerald-800">{formatRupiah(budgetToDelete.allocatedAmount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Realisasi Debet Kas:</span>
                <span className="font-mono font-bold text-rose-700">{formatRupiah(getBudgetSpentAmount(budgetToDelete))}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Apakah Anda yakin ingin menghapus dompet anggaran ini? Transaksi mutasi arus kas keluar yang terkait akan tetap tersimpan dalam buku kas.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBudgetToDelete(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (budgetToDelete) {
                    await deleteBudgetAllocation(budgetToDelete.id);
                    setBudgetToDelete(null);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
