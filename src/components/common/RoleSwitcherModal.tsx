import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { User, Role, ModuleType } from '../../types';
import { ROLE_LABELS, DEFAULT_ROLE_PERMISSIONS, MODULE_LABELS } from '../../utils/crypto';
import UserRoleAvatar from './UserRoleAvatar';
import { 
  X, 
  Shield, 
  CheckCircle2, 
  UserCheck, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  KeyRound, 
  LogOut, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Table,
  Check,
  Minus
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function RoleSwitcherModal({ onClose }: Props) {
  const { users, currentUser, switchUserWithAuth, logout } = useERP();
  const [activeTab, setActiveTab] = useState<'switch' | 'matrix'>('switch');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSelectUser = (user: User) => {
    if (user.id === currentUser.id) {
      return; // Sudah aktif
    }
    setSelectedUser(user);
    setPasswordInput('');
    setAuthError('');
  };

  const handleVerifyAndSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (!passwordInput.trim()) {
      setAuthError('Silakan masukkan kata sandi akun target.');
      return;
    }

    setIsVerifying(true);
    setAuthError('');
    try {
      const res = await switchUserWithAuth(selectedUser.id, passwordInput);
      if (res.success) {
        onClose();
      } else {
        setAuthError(res.message || 'Kata sandi salah! Akses ditolak demi keamanan data.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Terjadi kesalahan verifikasi sandi.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  const modulesList: ModuleType[] = [
    'finance',
    'accounting',
    'marketing',
    'sales',
    'sales_progress',
    'procurement',
    'warehouse',
    'custom_reports',
    'reports'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Otorisasi & Manajemen Sesi Pengguna
              </h2>
              <p className="text-xs text-slate-500">
                Pilih akun karyawan dan masukkan kata sandi resmi untuk berpindah profil wewenang kerja.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Kunci sesi & keluar ke halaman login"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden sm:inline">Kunci Sesi / Keluar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/40 px-5 pt-3">
          <button
            onClick={() => setActiveTab('switch')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'switch'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Ganti Akun Terotorisasi ({users.length} User)
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            Matriks Hak Akses (RBAC Matrix)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'switch' ? (
            <>
              {/* If a user is selected for password verification */}
              {selectedUser ? (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-4">
                    <div className="flex items-center gap-3">
                      <UserRoleAvatar
                        role={selectedUser.role}
                        name={selectedUser.name}
                        size="md"
                      />
                      <div>
                        <div className="text-xs font-bold text-emerald-800">
                          {ROLE_LABELS[selectedUser.role]}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900">
                          {selectedUser.name} ({selectedUser.department})
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          Username: <strong className="text-slate-700">{selectedUser.username}</strong>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-xs text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 shadow-xs"
                    >
                      Batal
                    </button>
                  </div>

                  {authError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>{authError}</div>
                    </div>
                  )}

                  <form onSubmit={handleVerifyAndSwitch} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Masukkan Kata Sandi untuk Akun Ini ({selectedUser.username}):
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoFocus
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="Masukkan kata sandi akun..."
                          className="w-full pl-10 pr-10 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        {isVerifying ? 'Memverifikasi...' : 'Verifikasi & Ganti Akun'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedUser(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                </div>
              ) : null}

              {/* Users Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isSelected = selectedUser?.id === u.id;
                  const permissions = DEFAULT_ROLE_PERMISSIONS[u.role];
                  const accessibleModulesCount = Object.values(permissions).filter((p: any) => p && p.view).length;

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                          : isSelected
                          ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300'
                          : 'bg-white border-slate-200/90 hover:bg-slate-50/80 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {isCurrent && (
                        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" /> Sedang Aktif
                        </span>
                      )}

                      <div className="flex items-start gap-3">
                        <UserRoleAvatar
                          role={u.role}
                          name={u.name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0 pr-10">
                          <h4 className="font-bold text-sm text-slate-900 truncate">
                            {u.name}
                          </h4>
                          <p className="text-xs font-semibold text-emerald-700 truncate">
                            {ROLE_LABELS[u.role] || u.role}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {u.department}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            User: <strong className="text-slate-700">{u.username}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          Akses: <strong className="text-slate-700">{accessibleModulesCount} dari 9 Modul</strong>
                        </span>
                        <button 
                          type="button"
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                            isCurrent 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white'
                          }`}
                        >
                          {isCurrent ? 'Aktif' : 'Pilih Akun'} <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Security info */}
              <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-xs text-slate-600 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">Sistem Keamanan Otorisasi Ganti Akun:</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Setiap pergantian akun wajib menginput kata sandi resmi untuk menjamin tidak ada pengguna yang salah masuk akun dan seluruh perubahan audit tercatat dengan hash SHA-256.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Tab 2: RBAC Matrix */
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-700">
                Matriks Hak Akses & Wewenang Departemen D'Kandang Farm Depok (View, Create, Edit, Delete, Approve, Export):
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3">Peran / Jabatan</th>
                      <th className="p-3">Keuangan</th>
                      <th className="p-3">Akuntansi</th>
                      <th className="p-3">Pemasaran</th>
                      <th className="p-3">Penjualan</th>
                      <th className="p-3">Purchasing</th>
                      <th className="p-3">Logistik</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {users.map((u) => {
                      const perms = DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.super_admin;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80">
                          <td className="p-3 font-semibold text-slate-900">
                            <div>{ROLE_LABELS[u.role]}</div>
                            <div className="text-[10px] text-slate-500 font-mono font-normal">@{u.username}</div>
                          </td>
                          {modulesList.map((m) => {
                            const p = perms[m];
                            const actions: string[] = [];
                            if (p?.view) actions.push('V');
                            if (p?.create) actions.push('C');
                            if (p?.edit) actions.push('E');
                            if (p?.delete) actions.push('D');
                            if (p?.approve) actions.push('A');
                            if (p?.export) actions.push('Ex');

                            return (
                              <td key={m} className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {actions.map((act) => (
                                    <span
                                      key={act}
                                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                        act === 'A'
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : act === 'D'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                                      }`}
                                    >
                                      {act}
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

              <div className="text-[11px] text-slate-600 flex flex-wrap gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-800">Keterangan Singkatan:</span>
                <span><strong className="text-slate-800">V:</strong> View (Baca)</span>
                <span><strong className="text-slate-800">C:</strong> Create (Tambah)</span>
                <span><strong className="text-slate-800">E:</strong> Edit (Ubah)</span>
                <span><strong className="text-rose-700">D:</strong> Delete (Hapus)</span>
                <span><strong className="text-amber-700">A:</strong> Approve (Otorisasi)</span>
                <span><strong className="text-slate-800">Ex:</strong> Export (Unduh Laporan)</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center">
          <div className="text-xs text-slate-600">
            Akun Aktif: <strong className="text-emerald-700">{currentUser.name}</strong> ({currentUser.username})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
