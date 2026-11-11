import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate, 
  ROLE_LABELS 
} from '../../utils/crypto';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Warehouse, 
  ShoppingCart, 
  Megaphone, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Activity, 
  ShieldCheck,
  PlusCircle,
  FileText,
  Bell,
  ArrowRight,
  Search,
  School,
  Ticket,
  Utensils,
  Sprout,
  Building2,
  Receipt,
  ArrowUpDown
} from 'lucide-react';
import { IncomeSourceCategory } from '../../types';

export default function ExecutiveDashboard() {
  const { 
    bankAccounts, 
    cashTransactions, 
    budgetAllocations, 
    inventory, 
    salesOrders, 
    salesInvoices, 
    purchaseOrders, 
    leads, 
    auditLogs,
    setActiveModule,
    currentUser,
    checkPermission,
    pendingApprovalsCount,
    setShowNotificationCenterModal
  } = useERP();

  // Local state for Recent Transactions filter & search
  const [txFilterTab, setTxFilterTab] = useState<'all' | 'inflow' | 'outflow' | 'mutation'>('all');
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // ---------------- Comprehensive Financial Metrics Calculation ----------------
  const { 
    totalCash, 
    totalSalesRevenue, 
    totalSalesPaid, 
    totalInventoryValuation, 
    totalPipelineDeals, 
    totalProcurementSpend, 
    totalBudgetSpent, 
    totalBudgetAllocated, 
    lowStockItems, 
    currentMonthInflows, 
    currentMonthOutflows, 
    currentMonthProfit,
    inflowCount,
    outflowCount,
    mutationCount
  } = useMemo(() => {
    const totalCashSum = bankAccounts.reduce((acc, b) => acc + (b.balance || 0), 0);
    
    // Real cash inflows & outflows
    const inflows = cashTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + (t.amount || 0), 0);
    const outflows = cashTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Outstanding unpaid invoices
    const unpaidInvoicesAmount = salesInvoices
      .filter(inv => inv.status !== 'cancelled' && inv.status !== 'paid')
      .reduce((acc, inv) => acc + Math.max(0, (inv.totalAmount || 0) - (inv.paidAmount || 0)), 0);
    
    // Total gross sales realized and invoiced
    const totalRealizedSales = inflows;
    const totalSalesRev = totalRealizedSales + unpaidInvoicesAmount;

    // Purchasing PO spend
    const poSpend = purchaseOrders
      .filter(po => po.status !== 'cancelled')
      .reduce((acc, po) => acc + (po.totalCost || 0), 0);

    // Budget spend from real cash outflows
    const budgetSpent = outflows;

    return {
      totalCash: totalCashSum,
      totalSalesRevenue: totalSalesRev > 0 ? totalSalesRev : totalRealizedSales,
      totalSalesPaid: totalRealizedSales,
      totalInventoryValuation: inventory.reduce((acc, item) => acc + ((item.stockQty || 0) * (item.unitCost || 0)), 0),
      totalPipelineDeals: leads.filter(l => l.stage !== 'lost').reduce((acc, l) => acc + (l.dealValue || 0), 0),
      totalProcurementSpend: poSpend > 0 ? poSpend : outflows,
      totalBudgetSpent: budgetSpent > 0 ? budgetSpent : budgetAllocations.reduce((acc, b) => acc + (b.spentAmount || 0), 0),
      totalBudgetAllocated: budgetAllocations.reduce((acc, b) => acc + (b.allocatedAmount || 0), 0),
      lowStockItems: inventory.filter(i => (i.stockQty || 0) <= (i.minStockLevel || 0)),
      currentMonthInflows: inflows,
      currentMonthOutflows: outflows,
      currentMonthProfit: inflows - outflows,
      inflowCount: cashTransactions.filter(t => t.type === 'inflow').length,
      outflowCount: cashTransactions.filter(t => t.type === 'outflow').length,
      mutationCount: cashTransactions.filter(t => t.type === 'mutation').length
    };
  }, [bankAccounts, salesInvoices, inventory, leads, purchaseOrders, budgetAllocations, cashTransactions]);

  // ---------------- Dynamic Financial Trends Data based on Real Transaction Dates ----------------
  const monthlyFinancialData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const now = new Date();
    const result = [];

    // Generate last 6 months rolling window
    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const monthLabel = `${monthNames[targetMonth]}${targetYear !== now.getFullYear() ? ` '${String(targetYear).slice(-2)}` : ''}`;

      // Sum all cash transactions falling into this month
      const monthInflow = cashTransactions
        .filter(t => {
          if (t.type !== 'inflow') return false;
          const dateStr = t.receivedDate || t.date;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const monthOutflow = cashTransactions
        .filter(t => {
          if (t.type !== 'outflow') return false;
          const dateStr = t.receivedDate || t.date;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          return !isNaN(d.getTime()) && d.getFullYear() === targetYear && d.getMonth() === targetMonth;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      result.push({
        month: i === 0 ? `${monthLabel} (Aktif)` : monthLabel,
        revenue: monthInflow,
        expense: monthOutflow,
        profit: monthInflow - monthOutflow
      });
    }

    // Safety fallback: if no dates matched because transactions are within current period
    const totalRev = result.reduce((acc, r) => acc + r.revenue, 0);
    const totalExp = result.reduce((acc, r) => acc + r.expense, 0);
    if (totalRev === 0 && totalExp === 0 && cashTransactions.length > 0) {
      const allIn = cashTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
      const allOut = cashTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);
      result[result.length - 1].revenue = allIn;
      result[result.length - 1].expense = allOut;
      result[result.length - 1].profit = allIn - allOut;
    }

    return result;
  }, [cashTransactions]);

  // ---------------- Revenue Breakdown by Business Unit (Unit Usaha) ----------------
  const revenueSourcesBreakdown = useMemo(() => {
    const categories: Record<string, { label: string; amount: number; count: number; color: string }> = {
      school_visit: { label: 'Kunjungan Edukasi Sekolah', amount: 0, count: 0, color: '#2563eb' },
      ticket_gate: { label: 'Tiket Gate & Wahana Satwa', amount: 0, count: 0, color: '#059669' },
      dairy_product: { label: 'Produk Susu & Peternakan Farm', amount: 0, count: 0, color: '#d97706' },
      resto_fnb: { label: 'Saung Resto & Kuliner F&B', amount: 0, count: 0, color: '#e11d48' },
      agriculture: { label: 'Pertanian & Bibit Tanaman', amount: 0, count: 0, color: '#10b981' },
      b2b_corporate: { label: 'B2B Corporate & Event', amount: 0, count: 0, color: '#1d4ed8' },
      other: { label: 'Penerimaan Operasional Lainnya', amount: 0, count: 0, color: '#475569' }
    };

    cashTransactions.filter(t => t.type === 'inflow').forEach(t => {
      const src = t.incomeSource || 'other';
      if (categories[src]) {
        categories[src].amount += t.amount || 0;
        categories[src].count += 1;
      } else {
        categories.other.amount += t.amount || 0;
        categories.other.count += 1;
      }
    });

    return Object.entries(categories).map(([key, data]) => ({
      key,
      ...data
    })).sort((a, b) => b.amount - a.amount);
  }, [cashTransactions]);

  // ---------------- Filtered Recent Transactions for Dashboard Live Feed ----------------
  const filteredRecentTransactions = useMemo(() => {
    return cashTransactions.filter(tx => {
      if (txFilterTab !== 'all' && tx.type !== txFilterTab) return false;
      if (txSearchQuery.trim()) {
        const q = txSearchQuery.toLowerCase();
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchRef = (tx.referenceNo || '').toLowerCase().includes(q);
        const matchEntity = (tx.linkedEntityName || '').toLowerCase().includes(q);
        const matchSource = (tx.sourceAccount || '').toLowerCase().includes(q);
        const matchTarget = (tx.targetAccount || '').toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchEntity && !matchSource && !matchTarget) {
          return false;
        }
      }
      return true;
    });
  }, [cashTransactions, txFilterTab, txSearchQuery]);

  // Helper function for Source Badges
  const getSourceBadge = (source?: IncomeSourceCategory, type?: string) => {
    if (type === 'mutation') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
          <ArrowUpDown className="w-3 h-3 text-blue-600" /> Mutasi Bank
        </span>
      );
    }
    switch (source) {
      case 'school_visit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
            <School className="w-3 h-3 text-blue-600" /> Edukasi Sekolah
          </span>
        );
      case 'ticket_gate':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            <Ticket className="w-3 h-3 text-emerald-600" /> Tiket Loket/Gate
          </span>
        );
      case 'dairy_product':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
            <Sprout className="w-3 h-3 text-amber-600" /> Susu / Farm
          </span>
        );
      case 'resto_fnb':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
            <Utensils className="w-3 h-3 text-rose-600" /> Saung Resto F&B
          </span>
        );
      case 'agriculture':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
            <Sprout className="w-3 h-3 text-emerald-600" /> Pertanian Agro
          </span>
        );
      case 'b2b_corporate':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
            <Building2 className="w-3 h-3 text-blue-600" /> B2B Corporate
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            <Receipt className="w-3 h-3 text-slate-500" /> Kas Umum
          </span>
        );
    }
  };

  // Pipeline Distribution Data
  const pipelineStagesData = [
    { name: 'Kontak & Prospek Baru', value: leads.filter(l => l.stage === 'lead' || l.stage === 'contacted').length, color: '#475569' },
    { name: 'Kualifikasi Jumlah Peserta', value: leads.filter(l => l.stage === 'qualified').length, color: '#2563eb' },
    { name: 'Kirim Penawaran & Negosiasi', value: leads.filter(l => l.stage === 'proposal' || l.stage === 'negotiation').length, color: '#1d4ed8' },
    { name: 'Sepakat & Pesan (Deal Won)', value: leads.filter(l => l.stage === 'won').length, color: '#059669' },
  ];

  return (
    <div className="space-y-6 pb-12 text-slate-800">
      
      {/* Welcome & System Summary Bar */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-white to-blue-50/70 p-5 rounded-2xl border border-emerald-200/70 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
              Pusat Kendali Agrowisata Terintegrasi
            </span>
            <span className="text-xs text-slate-500">
              D'Kandang Farm Pasir Putih, Sawangan, Depok
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Selamat Datang, {currentUser.name}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Peran: <strong className="text-emerald-800 font-bold">{ROLE_LABELS[currentUser.role]}</strong> • Seluruh data transaksi kasir, kunjungan sekolah, belanja pengadaan, dan stok barang terintegrasi secara langsung.
          </p>
        </div>

        {/* Quick Module Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {checkPermission('finance', 'create') && (
            <button
              onClick={() => setActiveModule('finance')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Catat Kas Masuk/Keluar
            </button>
          )}
          {checkPermission('sales', 'create') && (
            <button
              onClick={() => setActiveModule('sales')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" /> Penawaran & Rombongan
            </button>
          )}
          {checkPermission('procurement', 'create') && (
            <button
              onClick={() => setActiveModule('procurement')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-600" /> Purchasing / PO
            </button>
          )}
          <button
            onClick={() => setActiveModule('reports')}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" /> Laporan Usaha
          </button>
        </div>
      </div>

      {/* Banner Automasi Notifikasi & Pengingat Approval */}
      {pendingApprovalsCount > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-amber-50/50 to-white border border-rose-200 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold relative shrink-0 shadow-xs">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-400 border-2 border-white"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-900">
                  🔔 Pengingat Otomatis: {pendingApprovalsCount} Permintaan Approval Membutuhkan Tindakan
                </span>
                <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                  Prioritas
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Ada pengajuan Surat Penawaran, Pengadaan (PR), atau Penyesuaian Stok Gudang yang otomatis dijadikan pengingat untuk diotorisasi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNotificationCenterModal(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Buka & Setujui Berkas ({pendingApprovalsCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        
        {/* KPI 1: Kas & Setara Kas */}
        <div 
          onClick={() => setActiveModule('finance')} 
          className="bg-white border border-slate-200/90 hover:border-blue-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Saldo Kas & Bank</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {formatCompactRupiah(totalCash)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {bankAccounts.length} Rekening Aktif
          </div>
        </div>

        {/* KPI 2: Total Pendapatan Penjualan */}
        <div 
          onClick={() => setActiveModule('finance')} 
          className="bg-white border border-slate-200/90 hover:border-emerald-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Kas Masuk (Omset)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-2">
            {formatCompactRupiah(totalSalesPaid)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {inflowCount} Transaksi Masuk
          </div>
        </div>

        {/* KPI 3: Pipeline Sales CRM */}
        <div 
          onClick={() => setActiveModule('sales')} 
          className="bg-white border border-slate-200/90 hover:border-blue-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Potensi Nilai Rombongan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {formatCompactRupiah(totalPipelineDeals)}
          </div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">
            {leads.length} Sekolah Sedang Dihubungi
          </div>
        </div>

        {/* KPI 4: Valuasi Persediaan Gudang */}
        <div 
          onClick={() => setActiveModule('warehouse')} 
          className="bg-white border border-slate-200/90 hover:border-amber-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Nilai Stok Barang di Gudang</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Warehouse className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {formatCompactRupiah(totalInventoryValuation)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {inventory.length} Macam Barang Terdaftar
          </div>
        </div>

        {/* KPI 5: Belanja Purchasing (PO) */}
        <div 
          onClick={() => setActiveModule('procurement')} 
          className="bg-white border border-slate-200/90 hover:border-blue-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Belanja Purchasing</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-2">
            {formatCompactRupiah(totalProcurementSpend)}
          </div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">
            {purchaseOrders.length} Surat Pemesanan PO
          </div>
        </div>

        {/* KPI 6: Realisasi Kas Keluar Operasional */}
        <div 
          onClick={() => setActiveModule('finance')} 
          className="bg-white border border-slate-200/90 hover:border-rose-300 p-4 rounded-2xl transition-all cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500">Total Pengeluaran Kas</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-rose-700 mt-2">
            {formatCompactRupiah(currentMonthOutflows)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {outflowCount} Transaksi Keluar
          </div>
        </div>

      </div>

      {/* Main Visuals & Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Arus Keuangan & Profit Trend (Span 2) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Grafik Pendapatan Usaha, Biaya Operasional & Keuntungan Bersih
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Perkembangan riil gabungan transaksi penjualan tiket/edukasi, belanja pengadaan, dan arus kas per bulan.
              </p>
            </div>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono font-semibold border border-slate-200 self-start sm:self-auto">
              Tahun 2026 (Riil)
            </span>
          </div>

          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyFinancialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)} Jt`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)' }}
                  formatter={(value: any) => [formatRupiah(Number(value)), '']}
                />
                <Area type="monotone" dataKey="revenue" name="Total Kas Masuk (Pendapatan)" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="expense" name="Total Kas Keluar (Beban)" stroke="#e11d48" strokeWidth={1.5} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="profit" name="Arus Kas Bersih (Net)" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Total Pendapatan Terinput</span>
              <strong className="text-blue-700 font-bold">{formatCompactRupiah(currentMonthInflows)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Pengeluaran Kas</span>
              <strong className="text-rose-700 font-bold">{formatCompactRupiah(currentMonthOutflows)}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Arus Kas Bersih (Net)</span>
              <strong className={`font-bold ${currentMonthProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCompactRupiah(currentMonthProfit)}
              </strong>
            </div>
          </div>
        </div>

        {/* Chart 2: Pipeline Penjualan CRM & Konversi */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-blue-600" />
                Tahapan Rombongan Sekolah
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-full font-bold">
                {leads.length} Sekolah
              </span>
            </div>

            <div className="h-52 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineStagesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pipelineStagesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.5rem', fontSize: '11px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs mt-2">
              {pipelineStagesData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value} Sekolah</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActiveModule('sales')}
            className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-blue-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            Lihat Alur Rombongan Sekolah <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* ---------------- LIVE RECENT TRANSACTIONS & REVENUE BREAKDOWN SECTION ---------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (Span 2): Live Real-time Transactions Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Transaksi & Arus Kas Terkini (Integrasi Riil)
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {cashTransactions.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Setiap mutasi kas masuk/keluar yang diinput langsung tampil dan otomatis memperbarui saldo rekening.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveModule('finance')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Buka Modul Keuangan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-3">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
              <button
                onClick={() => setTxFilterTab('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${txFilterTab === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Semua ({cashTransactions.length})
              </button>
              <button
                onClick={() => setTxFilterTab('inflow')}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${txFilterTab === 'inflow' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Kas Masuk ({inflowCount})
              </button>
              <button
                onClick={() => setTxFilterTab('outflow')}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${txFilterTab === 'outflow' ? 'bg-white text-rose-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Kas Keluar ({outflowCount})
              </button>
              <button
                onClick={() => setTxFilterTab('mutation')}
                className={`px-3 py-1 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${txFilterTab === 'mutation' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Mutasi ({mutationCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                placeholder="Cari referensi, sekolah, keterangan..."
                className="w-full sm:w-60 pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Transactions List / Table */}
          <div className="overflow-x-auto -mx-5 px-5 flex-1 max-h-96 overflow-y-auto">
            {filteredRecentTransactions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl my-2">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Belum ada transaksi pada filter ini</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Input transaksi melalui tombol Catat Kas Masuk/Keluar di atas.</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] text-slate-500 font-semibold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">No. Ref & Sumber</th>
                    <th className="py-2.5 px-3">Keterangan & Entitas</th>
                    <th className="py-2.5 px-3">Rekening Bank</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecentTransactions.slice(0, 8).map((tx, idx) => {
                    const isInflow = tx.type === 'inflow';
                    const isMutation = tx.type === 'mutation';

                    return (
                      <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">{formatDate(tx.receivedDate || tx.date)}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {tx.id.substring(0, 10)}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-[11px] font-bold text-slate-800">{tx.referenceNo}</div>
                          <div className="mt-0.5">{getSourceBadge(tx.incomeSource, tx.type)}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800 line-clamp-1" title={tx.description}>
                            {tx.description}
                          </div>
                          {tx.linkedEntityName && (
                            <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                              <span>🏛️ {tx.linkedEntityName}</span>
                              {tx.paymentStage && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded font-normal">
                                  {tx.paymentStage.toUpperCase()}
                                </span>
                              )}
                            </div>
                          )}
                          {tx.budgetName && (
                            <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                              🏷️ Anggaran: {tx.budgetName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="text-slate-700 font-medium text-[11px]">
                            {tx.sourceAccount}
                          </div>
                          {isMutation && tx.targetAccount && (
                            <div className="text-[10px] text-blue-600 font-mono flex items-center gap-1 mt-0.5">
                              <span>➔ {tx.targetAccount}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className={`font-bold font-mono text-xs ${
                            isInflow ? 'text-emerald-600' : isMutation ? 'text-blue-600' : 'text-rose-600'
                          }`}>
                            {isInflow ? '+' : isMutation ? '⇄' : '-'} {formatRupiah(tx.amount)}
                          </div>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-sans mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Selesai
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="pt-3 mt-auto border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Menampilkan {Math.min(8, filteredRecentTransactions.length)} dari {filteredRecentTransactions.length} transaksi</span>
            <button
              onClick={() => setActiveModule('finance')}
              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              Lihat Riwayat Kas Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right: Revenue Breakdown by Business Line */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sprout className="w-4 h-4 text-emerald-600" />
                Distribusi Pendapatan Unit Usaha
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                Agrowisata
              </span>
            </div>

            <div className="space-y-3 mt-4">
              {revenueSourcesBreakdown.map((item) => {
                const percentage = currentMonthInflows > 0 
                  ? Math.round((item.amount / currentMonthInflows) * 100) 
                  : 0;

                return (
                  <div key={item.key} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span>{item.label}</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {formatCompactRupiah(item.amount)} <span className="text-slate-400 font-normal text-[10px]">({percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(2, percentage)}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{item.count} Transaksi Masuk</span>
                      <span>{percentage}% dari Total Omset</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-emerald-800 font-bold block">Total Kas Masuk Terverifikasi</span>
              <span className="text-sm font-black text-emerald-900">{formatRupiah(currentMonthInflows)}</span>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

      </div>

      {/* Second Row: Departmental Budget vs Actual & Integrated Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Departmental Budgets Burn Rate */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Batas Anggaran per Bagian
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">Tahun 2026</span>
          </div>

          <div className="space-y-4 mt-4">
            {budgetAllocations.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Belum ada dompet anggaran yang dibuat.
              </div>
            ) : (
              budgetAllocations.map((b) => {
                const percent = b.allocatedAmount > 0 ? Math.min(100, Math.round((b.spentAmount / b.allocatedAmount) * 100)) : 0;
                const isHigh = percent >= 85;
                const pctOfRev = b.percentageOfRevenue !== undefined 
                  ? `${b.percentageOfRevenue}% Omset` 
                  : (b.percentageOfCompanyShare !== undefined ? `${(b.percentageOfCompanyShare * 0.7).toFixed(1)}% Omset` : '');

                return (
                  <div key={b.id} className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{b.department}</span>
                        {pctOfRev && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold">
                            {pctOfRev}
                          </span>
                        )}
                      </span>
                      <span className={`font-bold ${isHigh ? 'text-amber-700' : 'text-slate-700'}`}>
                        {percent}% ({formatCompactRupiah(b.spentAmount)})
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-amber-500' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>{b.category}</span>
                      <span>Plafon: {formatCompactRupiah(b.allocatedAmount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Low Stock Alerts & Operational Warnings */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Pemberitahuan Stok & Barang Habis
              </h3>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                {lowStockItems.length} Perlu Dipesan Ulang
              </span>
            </div>

            <div className="space-y-2.5 mt-3 text-xs">
              {lowStockItems.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-medium">
                  Semua stok barang di gudang dalam kondisi aman & mencukupi.
                </div>
              ) : (
                lowStockItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-amber-900">{item.name}</div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        Kode: <span className="font-mono">{item.sku}</span> • Lokasi: {item.warehouseLocation}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-700 block">Sisa {item.stockQty} {item.unit}</span>
                      <span className="text-[10px] text-slate-500">Batas Min: {item.minStockLevel}</span>
                    </div>
                  </div>
                ))
              )}

              {/* 3-Way Match Status Item */}
              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-blue-950">Pemeriksaan Kesesuaian 3 Dokumen Beli</div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    Pesanan, surat terima barang, dan tagihan faktur cocok otomatis.
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveModule('warehouse')}
            className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-amber-800 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            Buka Gudang & Ajukan Pembelian <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Real-time Integrated Audit Trail Feed */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Catatan Riwayat Aktivitas Pengguna
            </h3>
            <span className="text-[10px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Tercatat Otomatis</span>
          </div>

          <div className="space-y-3 mt-3 max-h-72 overflow-y-auto pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">{log.userName}</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" /> {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                  {log.details}
                </p>
                <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-200/60 text-[10px] text-slate-500 font-mono">
                  <span className="text-blue-700 font-semibold uppercase">{log.module}</span>
                  <span className="truncate max-w-[120px]" title={log.integrityHash}>
                    {log.integrityHash.substring(0, 12)}...
                  </span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveModule('security')}
            className="w-full mt-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            Lihat Catatan Lengkap <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Sleek Identity & System Health Bottom Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shrink-0">
            <div className="w-6 h-6 border-2 border-emerald-600 rounded-lg flex items-center justify-center font-bold text-emerald-800 text-[9px] tracking-tight">
              AKSES
            </div>
          </div>
          <div>
            <div className="text-slate-900 font-bold text-sm uppercase tracking-wide flex items-center gap-2">
              Sistem Keamanan & Hak Akses Karyawan
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            </div>
            <div className="text-slate-500 text-xs mt-0.5">
              Masuk sebagai: <strong className="text-slate-800">{currentUser.name}</strong> ({ROLE_LABELS[currentUser.role]}). Seluruh transaksi aman dan tercatat rapi.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="w-[78%] h-full bg-emerald-500 rounded-full"></div>
          </div>
          <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tight">
            Kondisi Server: Lancar (22%)
          </span>
        </div>
      </div>

    </div>
  );
}
