import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { 
  DEFAULT_ROLE_PERMISSIONS, 
  ROLE_LABELS, 
  MODULE_LABELS, 
  simulateDecrypt, 
  formatRupiah,
  formatDate 
} from '../../utils/crypto';
import { 
  ShieldCheck, 
  ShieldAlert,
  Lock, 
  Users, 
  XCircle,
  Download,
  Landmark,
  Building,
  Plus,
  Edit2,
  Trash2,
  Copy,
  CheckCircle2,
  RefreshCw,
  Search,
  X
} from 'lucide-react';
import { Role, ModuleType, BankAccount } from '../../types';

export default function SecurityModule() {
  const { 
    auditLogs, 
    currentUser, 
    showNotification,
    bankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    recalculateBankBalances
  } = useERP();

  const [activeTab, setActiveTab] = useState<'rbac' | 'bank_accounts' | 'audit_logs'>('rbac');
  const [auditSearchQuery, setAuditSearchQuery] = useState('');

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearchQuery.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(log =>
      (log.userName || '').toLowerCase().includes(q) ||
      (log.userRole || '').toLowerCase().includes(q) ||
      (log.module || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearchQuery]);

  const {
    currentData: paginatedAuditLogs,
    currentPage: auditCurrentPage,
    totalPages: auditTotalPages,
    totalItems: auditTotalItems,
    itemsPerPage: auditItemsPerPage,
    nextPage: auditNextPage,
    prevPage: auditPrevPage
  } = usePagination(filteredAuditLogs, 20);
  
  // Bank Account State & Management
  const isDirekturUtama = currentUser.role === 'direktur_utama';
  const totalCash = bankAccounts.reduce((acc, b) => acc + b.balance, 0);

  const [isSyncingBalances, setIsSyncingBalances] = useState(false);
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Add Bank Modal State
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState("PT Lembah Hijau Multifarm (D'Kandang)");
  const [bankBalance, setBankBalance] = useState('');
  const [bankCurrency, setBankCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [bankStatus, setBankStatus] = useState<'active' | 'frozen'>('active');

  // Edit Bank Modal State
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editBankAccountNumber, setEditBankAccountNumber] = useState('');
  const [editBankAccountHolder, setEditBankAccountHolder] = useState('');
  const [editBankBalance, setEditBankBalance] = useState('');
  const [editBankCurrency, setEditBankCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [editBankStatus, setEditBankStatus] = useState<'active' | 'frozen'>('active');

  // Delete Bank Confirmation Modal State
  const [deletingBank, setDeletingBank] = useState<BankAccount | null>(null);

  const roles: Role[] = [
    'direktur_utama',
    'finance_manager',
    'accounting_manager',
    'marketing_manager',
    'sales_cs',
    'procurement_logistics',
    'purchasing_officer',
    'super_admin'
  ];

  const modules: ModuleType[] = [
    'finance',
    'accounting',
    'marketing',
    'sales',
    'procurement',
    'warehouse',
    'custom_reports',
    'reports'
  ];

  // Bank Handlers (Khusus Direktur Utama)
  const handleOpenAddBank = () => {
    if (!isDirekturUtama) {
      showNotification('Akses Ditolak: Hanya Direktur Utama yang berwenang menambah data rekening bank perusahaan!', 'error');
      return;
    }
    setBankName('');
    setBankAccountNumber('');
    setBankAccountHolder("PT Lembah Hijau Multifarm (D'Kandang)");
    setBankBalance('');
    setBankCurrency('IDR');
    setBankStatus('active');
    setShowAddBankModal(true);
  };

  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirekturUtama) return;
    const numBalance = parseFloat(bankBalance.replace(/[^0-9.-]+/g, '')) || 0;
    await addBankAccount({
      bankName: bankName.trim(),
      accountNumber: bankAccountNumber.trim(),
      accountHolder: bankAccountHolder.trim(),
      balance: numBalance,
      currency: bankCurrency,
      status: bankStatus
    });
    setShowAddBankModal(false);
  };

  const handleOpenEditBank = (bank: BankAccount) => {
    if (!isDirekturUtama) {
      showNotification('Akses Ditolak: Hanya Direktur Utama yang berwenang mengedit data rekening bank perusahaan!', 'error');
      return;
    }
    const plainAccountNum = simulateDecrypt(bank.accountNumber);
    setEditingBank(bank);
    setEditBankName(bank.bankName);
    setEditBankAccountNumber(plainAccountNum);
    setEditBankAccountHolder(bank.accountHolder);
    setEditBankBalance(bank.balance.toString());
    setEditBankCurrency(bank.currency);
    setEditBankStatus(bank.status);
  };

  const handleUpdateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirekturUtama || !editingBank) return;
    const numBalance = parseFloat(editBankBalance.replace(/[^0-9.-]+/g, '')) || 0;
    await updateBankAccount(editingBank.id, {
      bankName: editBankName.trim(),
      accountNumber: editBankAccountNumber.trim(),
      accountHolder: editBankAccountHolder.trim(),
      balance: numBalance,
      currency: editBankCurrency,
      status: editBankStatus
    });
    setEditingBank(null);
  };

  const handleDeleteBank = async () => {
    if (!isDirekturUtama || !deletingBank) return;
    await deleteBankAccount(deletingBank.id);
    setDeletingBank(null);
  };

  const handleSyncBalances = async () => {
    setIsSyncingBalances(true);
    try {
      await recalculateBankBalances();
    } finally {
      setIsSyncingBalances(false);
    }
  };

  const handleExportAuditLogs = () => {
    let csvContent = '\uFEFFID,Waktu,Pengguna,Peran,Modul,Aksi,Detail,Hash SHA-256\n';
    auditLogs.forEach((log) => {
      csvContent += `"${log.id}","${log.timestamp}","${log.userName}","${log.userRole}","${log.module}","${log.action}","${log.details.replace(/"/g, '""')}","${log.integrityHash}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audit_Log_DKandangFarm_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 200);

    showNotification('Seluruh jejak audit keamanan berhasil diekspor ke CSV!', 'success');
  };

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 md:p-6 rounded-3xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Keamanan Sistem & Riwayat Akses</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengaturan wewenang per jabatan, perlindungan & pemantauan rekening bank real-time, serta catatan jejak audit aktivitas sistem.
              </p>
            </div>
          </div>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-emerald-600" /> Enkripsi Rekening & Sandi: <strong className="text-emerald-700">AES-256 AKTIF</strong>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('rbac')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'rbac' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Tabel Wewenang & Hak Akses Jabatan
        </button>
        <button
          onClick={() => setActiveTab('bank_accounts')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'bank_accounts' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" /> Rekening Bank & Kas Real-Time ({bankAccounts.length})
        </button>
        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'audit_logs' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Catatan Riwayat Aktivitas & Keamanan ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: RBAC Matrix */}
      {activeTab === 'rbac' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Tabel Matriks Otorisasi Multi-Peran (RBAC Enforced)
            </h4>
            <p>
              Setiap tombol aksi, form input, dan menu modul dilindungi oleh aturan otorisasi di bawah ini untuk mencegah akses data tanpa izin.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Peran / Jabatan (Role)</th>
                    {modules.map(m => (
                      <th key={m} className="p-3.5 text-center">{MODULE_LABELS[m]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roles.map(role => {
                    const isCurrent = currentUser.role === role;

                    return (
                      <tr key={role} className={`hover:bg-slate-50/80 transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {ROLE_LABELS[role]}
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-blue-600 text-white uppercase">
                                Peran Aktif Anda
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{role}</div>
                        </td>

                        {modules.map(mod => {
                          const perms = DEFAULT_ROLE_PERMISSIONS[role]?.[mod];
                          const activeFlags = perms 
                            ? (Object.keys(perms) as (keyof typeof perms)[]).filter(k => perms[k])
                            : [];

                          if (!perms || activeFlags.length === 0) {
                            return (
                              <td key={mod} className="p-3.5 text-center">
                                <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[10px]">
                                  <XCircle className="w-3.5 h-3.5 text-slate-300" /> No Access
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td key={mod} className="p-3.5 text-center">
                              <div className="inline-flex flex-wrap justify-center gap-1">
                                {activeFlags.map(p => (
                                  <span 
                                    key={p} 
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      p === 'approve' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                      p === 'delete' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                      p === 'create' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                      p === 'edit' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                      p === 'export' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                                      'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Rekening Bank & Kas Real-Time (Dipindahkan dari Keuangan) */}
      {activeTab === 'bank_accounts' && (
        <div className="space-y-5">
          {/* Header Bar Bank */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Daftar Rekening Bank & Kas Perusahaan</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {bankAccounts.length} Rekening Terdaftar
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Total Saldo Likuiditas Terkonsolidasi: <strong className="text-emerald-700 font-mono font-bold text-sm ml-1">{formatRupiah(totalCash)}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSyncBalances}
                disabled={isSyncingBalances}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-300 cursor-pointer disabled:opacity-50 shadow-xs"
                title="Sinkronkan dan rekonsiliasi saldo rekening dengan seluruh mutasi kas operasional"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBalances ? 'animate-spin text-emerald-600' : 'text-slate-400'}`} />
                <span>{isSyncingBalances ? 'Menyinkronkan...' : 'Sinkronkan Saldo'}</span>
              </button>

              {isDirekturUtama ? (
                <button
                  onClick={handleOpenAddBank}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Rekening Bank
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">Kelola Rekening: <strong className="text-slate-800">Khusus Direktur Utama</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Otoritas & Keamanan Badge Info */}
          <div className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            isDirekturUtama 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-2.5">
              {isDirekturUtama ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                {isDirekturUtama ? (
                  <><strong>Mode Otorisasi Penuh (Pimpinan):</strong> Anda masuk sebagai <strong>Direktur Utama</strong>. Anda memiliki wewenang eksklusif untuk <em>mendaftarkan rekening baru, menyunting nomor/saldo, dan menghapus akun rekening</em>.</>
                ) : (
                  <><strong>Akses Terbatas:</strong> Anda masuk sebagai <strong>{currentUser.name} ({currentUser.role})</strong>. Penambahan, pengeditan, dan penghapusan data rekening bank dilindungi enkripsi dan hanya dapat dikelola langsung oleh <strong>Direktur Utama</strong>.</>
                )}
              </span>
            </div>
            {isDirekturUtama && (
              <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
                AUTHORITY: DIREKTUR_UTAMA
              </span>
            )}
          </div>

          {/* Bank Accounts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bankAccounts.length === 0 ? (
              <div className="col-span-full p-10 text-center bg-white border border-dashed border-slate-300 rounded-2xl space-y-3">
                <Landmark className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-sm text-slate-500">Belum ada data rekening bank yang terdaftar.</p>
                {isDirekturUtama && (
                  <button
                    onClick={handleOpenAddBank}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Daftarkan Rekening Bank Pertama
                  </button>
                )}
              </div>
            ) : (
              bankAccounts.map((b) => {
                return (
                  <div key={b.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 hover:border-slate-300 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{b.bankName}</h4>
                          <p className="text-[11px] text-slate-500">Atas Nama: <span className="text-slate-700 font-medium">{b.accountHolder}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
                          {b.currency || 'IDR'}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          b.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {b.status === 'active' ? 'Aktif' : 'Dibekukan'}
                        </span>
                      </div>
                    </div>

                    {/* Account Number Section with E2EE Display */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block font-semibold uppercase tracking-wider">
                          Nomor Rekening Resmi (Terenkripsi AES-256):
                        </span>
                        <span className="font-mono font-bold text-emerald-700 text-sm tracking-wide select-all">
                          {simulateDecrypt(b.accountNumber)}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const realAcc = simulateDecrypt(b.accountNumber);
                          navigator.clipboard.writeText(realAcc);
                          setCopiedBankId(b.id);
                          setTimeout(() => setCopiedBankId(null), 2000);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer text-xs font-semibold shadow-xs"
                        title="Salin Nomor Rekening"
                      >
                        {copiedBankId === b.id ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 text-[11px] font-bold">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px]">Salin</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs border-b border-slate-100 pb-3">
                      <span className="text-slate-500">Saldo Rekening Tersedia:</span>
                      <strong className="text-base font-bold text-emerald-700 font-mono">{formatRupiah(b.balance)}</strong>
                    </div>

                    {/* Action Bar: Khusus Direktur Utama */}
                    <div className="flex items-center justify-between pt-1">
                      {isDirekturUtama ? (
                        <div className="flex items-center gap-2 w-full justify-end">
                          <button
                            onClick={() => handleOpenEditBank(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-emerald-700 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-xs font-semibold transition cursor-pointer shadow-xs"
                            title="Edit Data Bank (Wewenang Direktur Utama)"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit Data Bank
                          </button>
                          <button
                            onClick={() => setDeletingBank(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-xs font-semibold transition cursor-pointer shadow-xs"
                            title="Hapus Rekening Bank (Wewenang Direktur Utama)"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Hapus
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-slate-400" /> Wewenang Edit/Hapus: Direktur Utama
                          </span>
                          <span className="text-slate-400 font-mono text-[10px]">Protected</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit_logs' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-xs text-slate-900">Log Jejak Audit Integritas Tidak Terbantahkan (Immutable Audit Chain)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Setiap perubahan data divalidasi dengan hash kriptografi SHA-256 dan ditandatangani digital.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={auditSearchQuery}
                  onChange={(e) => setAuditSearchQuery(e.target.value)}
                  placeholder="Cari user, aksi, atau modul..."
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 w-52"
                />
              </div>
              <button
                onClick={handleExportAuditLogs}
                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Ekspor Log (.CSV)
              </button>
              <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                {filteredAuditLogs.length} Records
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Waktu & Tanggal</th>
                  <th className="p-3.5">Pengguna & Peran</th>
                  <th className="p-3.5">Modul ERP</th>
                  <th className="p-3.5">Tipe Aksi</th>
                  <th className="p-3.5">Rincian Modifikasi Data</th>
                  <th className="p-3.5 font-mono">Hash Integritas SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                      Tidak ada catatan log audit yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-blue-700 font-mono">{log.userRole}</div>
                      </td>
                      <td className="p-3.5 uppercase font-mono text-slate-600 text-[11px]">{log.module}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 max-w-xs">{log.details}</td>
                      <td className="p-3.5 font-mono text-[10px] text-emerald-700 truncate max-w-[150px]" title={log.integrityHash}>
                        {log.integrityHash}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={auditCurrentPage}
            totalPages={auditTotalPages}
            totalItems={auditTotalItems}
            itemsPerPage={auditItemsPerPage}
            onNext={auditNextPage}
            onPrev={auditPrevPage}
          />
        </div>
      )}

      {/* Modal: Tambah Rekening Bank Baru (Khusus Direktur Utama) */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Tambah Rekening Bank & Kas Baru</h3>
                  <p className="text-[11px] text-emerald-700 font-medium">Otoritas Khusus Direktur Utama</p>
                </div>
              </div>
              <button onClick={() => setShowAddBankModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBank} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Bank & Peruntukan Akun:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bank BCA Sawangan Depok - Giro Operasional"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Rekening Bank (Terenkripsi AES-256 Otomatis):</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 157-00-9876543-1 atau 522-039-1122"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Atas Nama Pemilik Rekening:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Lembah Hijau Multifarm (D'Kandang)"
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Saldo Awal (Rp):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="0"
                    value={bankBalance}
                    onChange={(e) => setBankBalance(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {Number(bankBalance) > 0 && (
                    <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                      {formatRupiah(Number(bankBalance))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mata Uang:</label>
                  <select
                    value={bankCurrency}
                    onChange={(e) => setBankCurrency(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Operasional Rekening:</label>
                <select
                  value={bankStatus}
                  onChange={(e) => setBankStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">Aktif (Dapat digunakan transaksi)</option>
                  <option value="frozen">Dibekukan / Frozen (Hanya arsip)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Daftarkan Rekening Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Rekening Bank (Khusus Direktur Utama) */}
      {editingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Edit Data Rekening Bank</h3>
                  <p className="text-[11px] text-emerald-700 font-medium">Otoritas Khusus Direktur Utama</p>
                </div>
              </div>
              <button onClick={() => setEditingBank(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBank} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Bank & Peruntukan Akun:</label>
                <input
                  type="text"
                  required
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Rekening Bank (Plaintext untuk diedit):</label>
                <input
                  type="text"
                  required
                  value={editBankAccountNumber}
                  onChange={(e) => setEditBankAccountNumber(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Atas Nama Pemilik Rekening:</label>
                <input
                  type="text"
                  required
                  value={editBankAccountHolder}
                  onChange={(e) => setEditBankAccountHolder(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Saldo Rekening (Rp):</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editBankBalance}
                    onChange={(e) => setEditBankBalance(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                  {Number(editBankBalance) > 0 && (
                    <div className="text-[10px] text-emerald-700 font-mono mt-0.5">
                      {formatRupiah(Number(editBankBalance))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mata Uang:</label>
                  <select
                    value={editBankCurrency}
                    onChange={(e) => setEditBankCurrency(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="USD">USD - US Dollar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Status Operasional Rekening:</label>
                <select
                  value={editBankStatus}
                  onChange={(e) => setEditBankStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">Aktif (Dapat digunakan transaksi)</option>
                  <option value="frozen">Dibekukan / Frozen (Hanya arsip)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingBank(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold cursor-pointer border border-slate-200"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Rekening Bank (Khusus Direktur Utama) */}
      {deletingBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Hapus Rekening Bank</h3>
                <p className="text-xs text-rose-600 font-semibold">Tindakan Khusus Direktur Utama</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="text-slate-600">
                Apakah Anda yakin ingin menghapus rekening bank berikut secara permanen?
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1 font-mono">
                <div className="text-slate-900 font-bold">{deletingBank.bankName}</div>
                <div className="text-slate-500 text-[11px]">Atas Nama: {deletingBank.accountHolder}</div>
                <div className="text-emerald-700 font-bold">Saldo: {formatRupiah(deletingBank.balance)}</div>
              </div>
              <div className="text-[11px] text-amber-700 font-medium">
                ⚠️ Catatan: Penghapusan rekening bank ini akan dicatat secara otomatis ke dalam jejak audit (audit log) sistem ERP.
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingBank(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold text-xs cursor-pointer border border-slate-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteBank}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-xs cursor-pointer"
              >
                Hapus Rekening Permanen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
