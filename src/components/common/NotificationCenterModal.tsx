import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  FileText, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Check, 
  X, 
  Trash2, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  Sparkles,
  ShieldAlert,
  Send,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';
import { AppNotification, NotificationType, NotificationCategory } from '../../types';
import { soundManager } from '../../utils/sound';

export default function NotificationCenterModal() {
  const {
    currentUser,
    notifications,
    unreadNotificationsCount,
    pendingApprovalsCount,
    showNotificationCenterModal,
    setShowNotificationCenterModal,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    quickApproveFromNotification,
    quickRejectFromNotification,
    setActiveModule,
    quotations,
    purchaseRequisitions,
    stockOpnames,
    createNotification,
    showNotification,
    checkPermission
  } = useERP();

  const [filterCategory, setFilterCategory] = useState<'all' | 'approval' | 'system' | 'inventory' | 'sales'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());

  if (!showNotificationCenterModal) return null;

  const toggleSound = () => {
    const nextState = !isMuted;
    soundManager.setMuted(nextState);
    setIsMuted(nextState);
    showNotification(nextState ? 'Suara notifikasi dinonaktifkan' : 'Suara notifikasi aktif', 'info');
  };

  const handleQuickApprove = async (notifId: string) => {
    setIsProcessing(notifId);
    try {
      const res = await quickApproveFromNotification(notifId);
      if (res.success) {
        showNotification(res.message, 'success');
      } else {
        showNotification(res.message, 'error');
      }
    } finally {
      setIsProcessing(null);
    }
  };

  const handleQuickReject = async (notifId: string) => {
    if (!rejectReason.trim()) {
      showNotification('Harap masukkan alasan penolakan / catatan revisi', 'warning');
      return;
    }
    setIsProcessing(notifId);
    try {
      const res = await quickRejectFromNotification(notifId, rejectReason);
      showNotification(res.message, 'info');
      setRejectingId(null);
      setRejectReason('');
    } finally {
      setIsProcessing(null);
    }
  };

  // Filter list
  const filteredNotifications = notifications.filter(n => {
    // Category match
    if (filterCategory === 'approval' && n.type !== 'approval_request') return false;
    if (filterCategory === 'system' && n.category !== 'system' && n.type !== 'system_info') return false;
    if (filterCategory === 'inventory' && n.category !== 'inventory' && n.category !== 'stock_opname') return false;
    if (filterCategory === 'sales' && n.category !== 'quotation' && n.category !== 'sales_order') return false;

    // Status match
    if (filterStatus === 'pending' && n.actionStatus !== 'pending') return false;
    if (filterStatus === 'completed' && n.actionStatus === 'pending') return false;

    return true;
  });

  const getCategoryIcon = (category: NotificationCategory, type: NotificationType) => {
    if (type === 'approval_request') {
      switch (category) {
        case 'quotation': return <FileText className="w-4 h-4 text-emerald-600" />;
        case 'purchase_requisition': return <ShoppingCart className="w-4 h-4 text-blue-600" />;
        case 'stock_opname': return <Package className="w-4 h-4 text-amber-600" />;
        case 'cash_transaction': return <DollarSign className="w-4 h-4 text-blue-600" />;
        default: return <Clock className="w-4 h-4 text-emerald-600" />;
      }
    }
    switch (category) {
      case 'inventory': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'finance': return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'quotation': return <FileText className="w-4 h-4 text-blue-500" />;
      case 'sales_order': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      return `${diffDays} hari lalu`;
    } catch {
      return dateStr;
    }
  };

  // Helper to trigger test approval simulation for testing automation
  const triggerSimulation = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const amount = 8500000 + Math.floor(Math.random() * 15000000);
    createNotification({
      title: '🔔 [Simulasi Automation] Permintaan Approval Surat Penawaran',
      message: `Penawaran Edukasi Agrowisata QTN-2026/08/${randomNum} untuk SD Islam Terpadu Depok (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)}) diajukan oleh Sales & Marketing. Menunggu persetujuan Direksi.`,
      type: 'approval_request',
      category: 'quotation',
      referenceNumber: `QTN-2026/08/${randomNum}`,
      module: 'sales',
      requiresAction: true,
      actionStatus: 'pending',
      urgency: amount > 15000000 ? 'urgent' : 'high',
      targetRoles: ['direktur_utama', 'super_admin', 'sales_director'],
      createdBy: 'Dewi Sartika (Sales Representative)',
      creatorDepartment: 'Sales & Marketing',
      amount: amount
    });
    showNotification('Notifikasi permintaan approval otomatis berhasil disimulasikan!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200/90 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold relative">
              <Bell className="w-5 h-5" />
              {pendingApprovalsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[10px] text-white font-bold items-center justify-center">
                    {pendingApprovalsCount}
                  </span>
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Pusat Notifikasi & Pengingat Approval Otomatis
                </h2>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Auto-Sync Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Semua permintaan persetujuan (Penawaran, PR, Stock Opname) otomatis teragregasi sebagai pengingat operasional.
              </p>
            </div>
          </div>

          {/* Action buttons on header */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border text-xs font-semibold transition-all ${
                isMuted 
                  ? 'bg-slate-100 text-slate-500 border-slate-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
              title={isMuted ? 'Aktifkan suara lonceng' : 'Matikan suara notifikasi'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              onClick={triggerSimulation}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-all"
              title="Uji sistem automation dengan simulasi pengajuan approval"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Tes Pengingat</span>
            </button>

            <button
              onClick={() => setShowNotificationCenterModal(false)}
              className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Stats & Automation Banner */}
        <div className="bg-emerald-950 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">Status Otomasi:</span>
              <span className="bg-emerald-800/80 px-2.5 py-0.5 rounded-md font-medium text-emerald-200">
                100% Real-Time Auto-Generated
              </span>
            </div>
            <div className="h-3 w-px bg-emerald-800 hidden sm:block"></div>
            <div className="flex items-center gap-3 text-slate-300">
              <span>Menunggu Tindakan: <strong className="text-rose-400 font-bold">{pendingApprovalsCount} Berkas</strong></span>
              <span>•</span>
              <span>Belum Dibaca: <strong className="text-amber-400 font-bold">{unreadNotificationsCount}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={markAllNotificationsAsRead}
              className="px-2.5 py-1 bg-emerald-800/60 hover:bg-emerald-700 text-emerald-100 rounded-md font-semibold text-[11px] transition-all"
            >
              Tandai Semua Dibaca
            </button>
            <button
              onClick={clearAllNotifications}
              className="px-2.5 py-1 bg-rose-900/50 hover:bg-rose-800 text-rose-200 rounded-md font-semibold text-[11px] transition-all flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Bersihkan Riwayat
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Kategori:
            </span>
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'all' 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilterCategory('approval')}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                filterCategory === 'approval' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Permintaan Approval ({notifications.filter(n => n.type === 'approval_request').length})
            </button>
            <button
              onClick={() => setFilterCategory('sales')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'sales' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Penawaran & Sales
            </button>
            <button
              onClick={() => setFilterCategory('inventory')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterCategory === 'inventory' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Gudang & PR
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs bg-slate-50 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Menunggu Tindakan (Pending)</option>
              <option value="completed">Selesai / Ditindaklanjuti</option>
            </select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
          {filteredNotifications.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200/80 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Tidak Ada Notifikasi atau Pengingat yang Tertunda
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Sistem secara otomatis memantau seluruh permintaan persetujuan (Surat Penawaran, PR, Opname Stok). Setiap pengajuan baru akan muncul di sini secara langsung.
              </p>
              <button
                onClick={triggerSimulation}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Uji Simulasi Pengingat Approval
              </button>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isApproval = notif.type === 'approval_request';
              const isPending = notif.actionStatus === 'pending';
              const isBeingRejected = rejectingId === notif.id;

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-xl border transition-all ${
                    !notif.read 
                      ? isPending 
                        ? 'bg-white border-rose-300 shadow-sm ring-1 ring-rose-200' 
                        : 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-white border-slate-200 opacity-90'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    
                    {/* Left Icon & Content */}
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                        isApproval 
                          ? isPending ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {getCategoryIcon(notif.category, notif.type)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                            {notif.title}
                          </h4>
                          
                          {/* Urgency Badge */}
                          {notif.urgency === 'urgent' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200 flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Urgent
                            </span>
                          )}
                          {notif.urgency === 'high' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-full border border-amber-200">
                              Prioritas Tinggi
                            </span>
                          )}

                          {/* Action Status Badge */}
                          {notif.actionStatus === 'pending' && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                              ⏳ Butuh Persetujuan
                            </span>
                          )}
                          {notif.actionStatus === 'approved' && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200">
                              ✅ Disetujui
                            </span>
                          )}
                          {notif.actionStatus === 'rejected' && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-md border border-rose-200">
                              ❌ Ditolak / Revisi
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                            <Clock className="w-3 h-3" /> {formatTimeAgo(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          {notif.message}
                        </p>

                        {/* Metadata Details Bar */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          {notif.referenceNumber && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-700">
                              Ref: {notif.referenceNumber}
                            </span>
                          )}
                          {notif.creatorDepartment && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" /> Dept: {notif.creatorDepartment}
                            </span>
                          )}
                          {notif.createdBy && (
                            <span>Pemohon: <strong>{notif.createdBy}</strong></span>
                          )}
                          {notif.amount && (
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Nominal: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(notif.amount)}
                            </span>
                          )}
                        </div>

                        {/* Reject reason input prompt */}
                        {isBeingRejected && (
                          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-in fade-in">
                            <label className="text-xs font-bold text-rose-900 block">
                              Catatan Revisi / Alasan Penolakan untuk Pemohon:
                            </label>
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Contoh: Perlu koreksi diskon paket edukasi / periksa ketersediaan kuota..."
                              className="w-full text-xs p-2 bg-white border border-rose-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectReason('');
                                }}
                                className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleQuickReject(notif.id)}
                                disabled={isProcessing === notif.id}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg transition-all"
                              >
                                {isProcessing === notif.id ? 'Memproses...' : 'Kirim Penolakan & Catatan'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isPending && !isBeingRejected && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleQuickApprove(notif.id)}
                            disabled={isProcessing === notif.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
                            title="Otorisasi & Setujui Permintaan Secara Langsung"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Setujui Cepat</span>
                          </button>
                          
                          <button
                            onClick={() => setRejectingId(notif.id)}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-all"
                            title="Tolak atau Minta Revisi"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setActiveModule(notif.module);
                            setShowNotificationCenterModal(false);
                          }}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 hover:underline px-2 py-1 bg-slate-100 rounded-md"
                          title="Buka modul terkait"
                        >
                          <span>Buka Modul</span> <ArrowRight className="w-3 h-3" />
                        </button>
                        
                        <button
                          onClick={() => deleteNotification(notif.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Hapus notifikasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200/90 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Otorisasi pengguna aktif: <strong>{currentUser.name}</strong> ({currentUser.role})</span>
          </div>
          <button
            onClick={() => setShowNotificationCenterModal(false)}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-all"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
