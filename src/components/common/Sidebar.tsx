import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { ModuleType } from '../../types';
import DKandangLogo from './DKandangLogo';
import { 
  LayoutDashboard, 
  Wallet, 
  BookOpenCheck, 
  Megaphone, 
  TrendingUp, 
  LineChart, 
  ShoppingCart, 
  Warehouse, 
  FileSpreadsheet, 
  ShieldCheck, 
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Lock,
  Sparkles
} from 'lucide-react';

interface NavItem {
  id: ModuleType;
  label: string;
  shortLabel?: string;
  category: 'core' | 'system';
  icon: React.ElementType;
  badge?: string | number;
}

export default function Sidebar() {
  const { 
    activeModule, 
    setActiveModule, 
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    toggleSidebarCollapsed,
    checkPermission,
    inventory,
    salesInvoices,
    purchaseRequisitions,
    recurringBills,
    cashTransactions,
    paymentProofs
  } = useERP();

  const [hoveredModule, setHoveredModule] = useState<string | null>(null);

  const lowStockCount = inventory.filter(i => i.stockQty <= i.minStockLevel).length;
  const unpaidInvoices = salesInvoices.filter(i => i.status === 'issued').length;
  const pendingPRs = purchaseRequisitions.filter(p => p.status === 'pending').length;
  const pendingProofsCount = (paymentProofs || []).filter(p => p.status === 'pending_verification').length;

  const currentDay = new Date().getDate();
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const dueBillsCount = recurringBills.filter(bill => {
    if (!bill.isActive) return false;
    const isPaid = cashTransactions.some(t => t.linkedEntityId === bill.id && t.type === 'outflow' && t.date.startsWith(currentMonthStr));
    if (isPaid) return false;
    return (bill.dueDay - currentDay) <= 3;
  }).length;

  const totalFinanceAlerts = dueBillsCount + pendingProofsCount;

  const MODUL_UTAMA: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Ringkasan Bisnis & Penjualan',
      shortLabel: 'Dashboard',
      category: 'core',
      icon: LayoutDashboard
    },
    {
      id: 'finance',
      label: 'Keuangan & Kasir Tiket',
      shortLabel: 'Keuangan',
      category: 'core',
      icon: Wallet,
      badge: totalFinanceAlerts > 0 ? totalFinanceAlerts : undefined
    },
    {
      id: 'accounting',
      label: 'Akuntansi & Pembukuan',
      shortLabel: 'Akuntansi',
      category: 'core',
      icon: BookOpenCheck
    },
    {
      id: 'marketing',
      label: 'Pemasaran & Promosi',
      shortLabel: 'Marketing',
      category: 'core',
      icon: Megaphone
    },
    {
      id: 'sales',
      label: 'Penjualan & Rombongan',
      shortLabel: 'Penjualan',
      category: 'core',
      icon: TrendingUp,
      badge: unpaidInvoices > 0 ? unpaidInvoices : undefined
    },
    {
      id: 'procurement',
      label: 'Purchasing (Pembelian)',
      shortLabel: 'Purchasing',
      category: 'core',
      icon: ShoppingCart,
      badge: pendingPRs > 0 ? pendingPRs : undefined
    },
    {
      id: 'warehouse',
      label: 'Logistik & Gudang',
      shortLabel: 'Gudang',
      category: 'core',
      icon: Warehouse,
      badge: lowStockCount > 0 ? lowStockCount : undefined
    },
  ];

  const MODUL_SISTEM: NavItem[] = [
    {
      id: 'sales_progress',
      label: 'Progress & Pipeline Sales',
      shortLabel: 'Pipeline',
      category: 'system',
      icon: LineChart
    },
    {
      id: 'custom_reports',
      label: 'Laporan Transaksi Terfilter',
      shortLabel: 'Filter Laporan',
      category: 'system',
      icon: SlidersHorizontal
    },
    {
      id: 'reports',
      label: 'Laporan Keuangan & Usaha',
      shortLabel: 'Laporan',
      category: 'system',
      icon: FileSpreadsheet
    },
    {
      id: 'security',
      label: 'Pusat Keamanan & Riwayat Akses',
      shortLabel: 'Keamanan',
      category: 'system',
      icon: ShieldCheck
    }
  ];

  const handleModuleClick = (moduleId: ModuleType) => {
    setActiveModule(moduleId);
    // Otomatis hidden/ciutkan sidebar ke mode logo saja untuk memaksimalkan ruang kerja modul
    setIsSidebarCollapsed(true);
  };

  const renderNavGroup = (title: string, items: NavItem[]) => {
    const visibleItems = items.filter(item => checkPermission(item.id, 'view'));
    if (visibleItems.length === 0) return null;

    return (
      <div className={`space-y-1.5 ${isSidebarCollapsed ? 'mb-4' : 'mb-6'}`}>
        {/* Section Heading */}
        {!isSidebarCollapsed ? (
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 flex items-center justify-between">
            <span>{title}</span>
          </div>
        ) : (
          <div className="w-8 h-px bg-slate-200 mx-auto my-2.5" />
        )}

        {visibleItems.map((item) => {
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          if (isSidebarCollapsed) {
            // Mode Ciut / Icon Saja (Logo Modul)
            return (
              <div key={item.id} className="relative flex justify-center group my-1">
                <button
                  onClick={() => handleModuleClick(item.id)}
                  onMouseEnter={() => setHoveredModule(item.id)}
                  onMouseLeave={() => setHoveredModule(null)}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 relative cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/40 scale-105'
                      : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 hover:shadow-xs'
                  }`}
                  aria-label={item.label}
                >
                  <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />

                  {/* Badge Notifikasi Mini pada Mode Ikon */}
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-xs ring-2 ring-white">
                      {item.badge}
                    </span>
                  )}
                </button>

                {/* Floating Tooltip Label saat Hover di Mode Ciut */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none animate-in fade-in duration-150">
                  <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap flex items-center gap-2 border border-slate-800">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
              </div>
            );
          }

          // Mode Penuh (Expanded)
          return (
            <button
              key={item.id}
              onClick={() => handleModuleClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group cursor-pointer ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/80 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="text-sm truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-600 text-white' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside 
      className={`bg-[#fafcfb] border-r border-slate-200/90 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] hidden md:flex transition-all duration-300 ease-in-out select-none relative ${
        isSidebarCollapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      
      {/* Header Logo & Identitas Sistem / Tombol Collapse */}
      <div className={`p-3.5 border-b border-slate-200/80 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isSidebarCollapsed ? (
          <>
            <div className="overflow-hidden">
              <DKandangLogo size="md" showText={true} />
            </div>
            <button
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Ciutkan Sidebar (Hanya Logo Modul)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleSidebarCollapsed}
              className="group cursor-pointer p-0.5 rounded-xl transition-transform hover:scale-105"
              title="Klik untuk Perluas Menu Sidebar"
            >
              <DKandangLogo size="sm" showText={false} />
            </button>
            <button
              onClick={toggleSidebarCollapsed}
              className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              title="Perluas Sidebar Menu"
            >
              <PanelLeftOpen className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Navigasi Modul */}
      <nav className={`flex-1 overflow-y-auto ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
        {renderNavGroup('Modul Utama', MODUL_UTAMA)}
        {renderNavGroup('Sistem & Pelaporan', MODUL_SISTEM)}
      </nav>

      {/* Footer Status Keamanan / Expand Helper */}
      <div className={`border-t border-slate-200/80 ${isSidebarCollapsed ? 'p-2' : 'p-4'}`}>
        {!isSidebarCollapsed ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Terenkripsi E2EE</span>
              </div>
              <Lock className="w-3 h-3 text-emerald-600" />
            </div>
            <div className="text-[10px] text-slate-600 leading-tight">
              Semua modul otomatis terenkripsi AES-256. Klik modul untuk memperluas ruang kerja.
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center group relative">
            <button
              onClick={toggleSidebarCollapsed}
              className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
              title="Klik untuk membuka menu sidebar lengkap"
            >
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </button>
            <div className="absolute bottom-full mb-2 left-full ml-2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1.5 rounded-xl shadow-xl whitespace-nowrap border border-slate-800">
                🛡️ E2EE Protected • Klik untuk Perluas
              </div>
            </div>
          </div>
        )}
      </div>

    </aside>
  );
}

