import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  Bell, 
  Search, 
  Monitor, 
  Tablet, 
  Smartphone, 
  ChevronDown, 
  CheckCircle2,
  FileText,
  ShoppingCart,
  Package,
  Clock,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { ROLE_LABELS, MODULE_LABELS } from '../../utils/crypto';
import UserRoleAvatar from './UserRoleAvatar';
import DKandangLogo from './DKandangLogo';

export default function Header() {
  const { 
    currentUser, 
    activeModule, 
    setActiveModule,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    viewportMode, 
    setViewportMode,
    showRoleSwitcher,
    setShowRoleSwitcher,
    inventory,
    salesInvoices,
    showNotification,
    notifications,
    unreadNotificationsCount,
    pendingApprovalsCount,
    setShowNotificationCenterModal,
    quickApproveFromNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead
  } = useERP();

  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [dropdownTab, setDropdownTab] = useState<'approvals' | 'all' | 'system'>('approvals');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Hitung notifikasi operasional
  const lowStockCount = inventory.filter(i => i.stockQty <= i.minStockLevel).length;
  const overdueInvoiceCount = salesInvoices.filter(i => i.status === 'issued').length;
  const totalAlerts = pendingApprovalsCount + (unreadNotificationsCount > 0 ? 1 : 0) + (lowStockCount > 0 ? 1 : 0);

  const pendingApprovalNotifs = notifications.filter(n => n.type === 'approval_request' && n.actionStatus === 'pending');
  const displayNotifs = dropdownTab === 'approvals' 
    ? pendingApprovalNotifs 
    : dropdownTab === 'system'
    ? notifications.filter(n => n.type !== 'approval_request')
    : notifications;

  const handleQuickApprove = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    setProcessingId(notifId);
    try {
      const res = await quickApproveFromNotification(notifId);
      if (res.success) {
        showNotification(res.message, 'success');
      } else {
        showNotification(res.message, 'error');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 text-slate-800 shrink-0 sticky top-0 z-30 shadow-xs">
      
      {/* Kiri: Judul & Konteks Modul */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button di Desktop/Tablet */}
        <button
          onClick={toggleSidebarCollapsed}
          title={isSidebarCollapsed ? "Perluas Sidebar Menu" : "Ciutkan Sidebar (Hanya Logo Modul)"}
          className="hidden md:flex p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200/80 transition-all cursor-pointer items-center justify-center shadow-xs group"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-emerald-700 group-hover:scale-110 transition-transform" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-600 group-hover:scale-110 transition-transform" />
          )}
        </button>

        <div className="md:hidden">
          <DKandangLogo size="sm" showText={false} />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
            {MODULE_LABELS[activeModule] || 'Dashboard Agrowisata'}
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            D'Kandang Amazing Farm Depok • Sistem ERP Agrowisata & Edukasi Terpadu
          </p>
        </div>
      </div>

      {/* Tengah: Pencarian Cepat */}
      <div className="flex-1 max-w-xs lg:max-w-md mx-4 hidden md:block">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari transaksi, SKU gudang, PO, SO, jurnal, akun..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
          />
        </div>
      </div>

      {/* Kanan: Aksi Cepat, Perangkat & Pengguna */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Switcher Mode Tampilan Perangkat */}
        <div className="hidden lg:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200" title="Simulasi Akses Multi-Platform">
          <button
            onClick={() => setViewportMode('desktop')}
            title="Tampilan Desktop Penuh"
            className={`p-1.5 rounded-md transition-all ${viewportMode === 'desktop' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewportMode('tablet')}
            title="Simulasi Akses Tablet"
            className={`p-1.5 rounded-md transition-all ${viewportMode === 'tablet' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewportMode('mobile')}
            title="Simulasi Akses Smartphone"
            className={`p-1.5 rounded-md transition-all ${viewportMode === 'mobile' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Notifikasi Lonceng & Pengingat Approval Otomatis */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
            className={`relative p-2 rounded-lg border transition-all ${
              pendingApprovalsCount > 0 
                ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-200/60' 
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
            title="Pemberitahuan & Pengingat Approval Sistem"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 min-w-[16px] px-1 bg-rose-600 text-[9px] font-bold text-white items-center justify-center">
                  {pendingApprovalsCount}
                </span>
              </span>
            ) : unreadNotificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-amber-500 rounded-full">
                {unreadNotificationsCount}
              </span>
            ) : null}
          </button>

          {/* Panel Dropdown Notifikasi & Approval Otomatis */}
          {showNotificationsDropdown && (
            <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-0 z-50 overflow-hidden animate-in fade-in duration-150">
              
              {/* Header Dropdown */}
              <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs">Pusat Notifikasi & Pengingat</h3>
                    <p className="text-[10px] text-slate-400">Automasi Approval Real-Time</p>
                  </div>
                </div>
                {pendingApprovalsCount > 0 && (
                  <span className="text-[10px] bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded-full font-bold">
                    {pendingApprovalsCount} Approval Menunggu
                  </span>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center border-b border-slate-100 bg-slate-50 px-3 py-1.5 gap-1 text-[11px]">
                <button
                  onClick={() => setDropdownTab('approvals')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    dropdownTab === 'approvals' 
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Approval ({pendingApprovalNotifs.length})
                </button>
                <button
                  onClick={() => setDropdownTab('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    dropdownTab === 'all' 
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setDropdownTab('system')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                    dropdownTab === 'system' 
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-200' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sistem ({notifications.filter(n => n.type !== 'approval_request').length})
                </button>
              </div>

              {/* List Content */}
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto text-xs bg-slate-50/50">
                {displayNotifs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-80" />
                    <p className="font-semibold text-slate-700">Tidak ada pengingat tertunda</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Semua permohonan persetujuan telah diselesaikan.</p>
                  </div>
                ) : (
                  displayNotifs.slice(0, 6).map((notif) => {
                    const isApproval = notif.type === 'approval_request';
                    const isPending = notif.actionStatus === 'pending';

                    return (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationAsRead(notif.id);
                          if (notif.module) {
                            setActiveModule(notif.module);
                            setShowNotificationsDropdown(false);
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          !notif.read && isPending
                            ? 'bg-white border-rose-300 shadow-xs ring-1 ring-rose-200'
                            : notif.read
                            ? 'bg-white border-slate-200 hover:bg-slate-50'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isApproval 
                                ? isPending ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {notif.category === 'quotation' ? (
                                <FileText className="w-3.5 h-3.5" />
                              ) : notif.category === 'purchase_requisition' ? (
                                <ShoppingCart className="w-3.5 h-3.5" />
                              ) : notif.category === 'stock_opname' ? (
                                <Package className="w-3.5 h-3.5" />
                              ) : (
                                <Bell className="w-3.5 h-3.5" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-slate-900 text-xs truncate">
                                  {notif.title}
                                </h4>
                                {isPending && (
                                  <span className="text-[9px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded border border-rose-200 shrink-0">
                                    Butuh Tindakan
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                {notif.message}
                              </p>
                              {notif.referenceNumber && (
                                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                                  <span className="font-mono text-emerald-700 font-semibold">{notif.referenceNumber}</span>
                                  <span>{notif.creatorDepartment || notif.createdBy || ''}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Footer in Dropdown */}
                        {isPending && (
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400">Klik item untuk membuka modul</span>
                            <button
                              onClick={(e) => handleQuickApprove(e, notif.id)}
                              disabled={processingId === notif.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all"
                            >
                              <Check className="w-3 h-3" />
                              {processingId === notif.id ? 'Memproses...' : 'Setujui Cepat'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {/* Additional operational warnings */}
                {lowStockCount > 0 && (
                  <div 
                    onClick={() => {
                      setActiveModule('warehouse');
                      setShowNotificationsDropdown(false);
                    }}
                    className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-amber-800">⚠️ Peringatan Stok ({lowStockCount} SKU)</p>
                      <span className="text-[10px] text-amber-700 font-bold underline">Buka Gudang &rarr;</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mt-0.5">Ada pakan/barang di bawah batas minimum.</p>
                  </div>
                )}
              </div>

              {/* Dropdown Footer: Open Full Center */}
              <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
                <button
                  onClick={() => {
                    markAllNotificationsAsRead();
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Tandai Dibaca
                </button>

                <button
                  onClick={() => {
                    setShowNotificationsDropdown(false);
                    setShowNotificationCenterModal(true);
                  }}
                  className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span>Buka Pusat Approval Lengkap</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Profil Pengguna Aktif & Pengganti Peran (RBAC) */}
        <button
          onClick={() => setShowRoleSwitcher(true)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all text-left group shadow-xs"
          title="Klik untuk Ganti Profil & Uji Hak Akses (RBAC)"
        >
          <UserRoleAvatar
            role={currentUser?.role}
            name={currentUser?.name}
            size="sm"
          />
          <div className="hidden sm:block leading-tight">
            <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
              {currentUser?.name?.split(',')[0] || 'Pengguna'}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
            <div className="text-[10px] text-emerald-700 font-medium truncate max-w-[120px]">
              {ROLE_LABELS[currentUser?.role] || 'Pengguna'}
            </div>
          </div>
        </button>

      </div>
    </header>
  );
}
