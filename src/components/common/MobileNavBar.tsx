import React from 'react';
import { useERP } from '../../context/ERPContext';
import { ModuleType } from '../../types';
import { 
  LayoutDashboard, 
  Wallet, 
  BookOpenCheck, 
  Megaphone,
  TrendingUp, 
  LineChart,
  ShoppingCart, 
  Warehouse, 
  ShieldCheck,
  FileSpreadsheet,
  SlidersHorizontal
} from 'lucide-react';

export default function MobileNavBar() {
  const { activeModule, setActiveModule, checkPermission } = useERP();

  const NAV_ITEMS: { id: ModuleType; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Beranda', icon: LayoutDashboard },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
    { id: 'accounting', label: 'Akuntansi', icon: BookOpenCheck },
    { id: 'marketing', label: 'Marketing', icon: Megaphone },
    { id: 'sales', label: 'Penjualan', icon: TrendingUp },
    { id: 'sales_progress', label: 'Progress', icon: LineChart },
    { id: 'procurement', label: 'Purchasing', icon: ShoppingCart },
    { id: 'warehouse', label: 'Logistik', icon: Warehouse },
    { id: 'custom_reports', label: 'FilterLap', icon: SlidersHorizontal },
    { id: 'reports', label: 'Laporan', icon: FileSpreadsheet },
    { id: 'security', label: 'Keamanan', icon: ShieldCheck }
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
      <div className="flex items-center justify-around overflow-x-auto gap-1 py-1">
        {NAV_ITEMS.map((item) => {
          const hasAccess = checkPermission(item.id, 'view');
          if (!hasAccess) return null;
          const isActive = activeModule === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] py-1 px-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-800 font-bold bg-emerald-50 ring-1 ring-emerald-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
              <span className="text-[10px] tracking-tight truncate max-w-[50px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
