import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  ShieldCheck, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Building2, 
  ArrowRight,
  HelpCircle,
  X,
  ShieldAlert
} from 'lucide-react';
import { ROLE_LABELS } from '../../utils/crypto';
import UserRoleAvatar from '../common/UserRoleAvatar';

export default function LoginScreen() {
  const { login, users } = useERP();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAccountListModal, setShowAccountListModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!username.trim()) {
      setErrorMessage('Silakan masukkan Username / ID Akun.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Silakan masukkan Kata Sandi (Password).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMessage(res.message || 'Otorisasi gagal! Periksa kembali username & password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan otorisasi sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  // Only auto-fill User ID (username). Password remains blank for system security.
  const handleQuickFill = (targetUsername: string) => {
    setUsername(targetUsername);
    setPassword('');
    setShowAccountListModal(false);
    setErrorMessage('');
    setInfoMessage(`ID Akun "${targetUsername}" telah dipilih. Silakan masukkan kata sandi Anda.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none translate-y-1/2"></div>

      {/* Header bar */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-sm">
            D
          </div>
          <div>
            <div className="font-extrabold text-slate-800 text-base tracking-tight flex items-center gap-2">
              D'KANDANG AMAZING FARM
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                ERP v4.0 SECURE
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Sistem Operasional, Keuangan & Logistik Agrowisata Terpadu Depok
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAccountListModal(true)}
          className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-all shadow-xs cursor-pointer"
        >
          <HelpCircle className="w-4 h-4 text-emerald-700" />
          Pilih User ID Akun
        </button>
      </header>

      {/* Login Card Main */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl relative">
          
          {/* Badge & Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Gerbang Autentikasi Zero-Trust
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Masuk ke Sistem ERP
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Masukkan Username dan Kata Sandi resmi untuk mengakses modul sesuai wewenang jabatan Anda.
            </p>
          </div>

          {/* Info Banner */}
          {infoMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {infoMessage}
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username / ID Akun
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: Creatna_direksidk"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi..."
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Memverifikasi Kredensial...
                </>
              ) : (
                <>
                  Masuk ke Aplikasi
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Help Link on Mobile */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Pilih role pengguna?</span>
            <button
              onClick={() => setShowAccountListModal(true)}
              className="text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1 cursor-pointer"
            >
              Daftar User ID Akun &rarr;
            </button>
          </div>
        </div>
      </main>

      {/* Footer info */}
      <footer className="p-4 text-center text-xs text-slate-500 border-t border-slate-200 bg-white/60 z-10">
        D'Kandang Amazing Farm Depok • Hak Cipta Dilindungi • Otorisasi Berbasis Peran (RBAC) Terproteksi SHA-256 Audit Trail
      </footer>

      {/* Account Master Helper Modal - ONLY USER ID SHOWN (SECURITY COMPLIANT) */}
      {showAccountListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Daftar User ID Akun Terdaftar
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih akun untuk mengisi ID Pengguna. Demi keamanan sistem, kata sandi diisi secara manual.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountListModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-xs"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <UserRoleAvatar
                          role={u.role}
                          name={u.name}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-emerald-800 truncate">
                            {ROLE_LABELS[u.role] || u.role}
                          </div>
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {u.department}
                          </div>
                        </div>
                      </div>

                      {/* Security Compliant Display: Only Username / ID shown */}
                      <div className="mt-3 space-y-1 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px] font-mono">
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="text-slate-400">User ID:</span>
                          <span className="text-emerald-700 font-bold">{u.username}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 text-[10px]">
                          <span className="text-slate-400">Status:</span>
                          <span className="text-slate-600 flex items-center gap-1 font-sans">
                            <Lock className="w-3 h-3 text-slate-400" /> Sandi Terenkripsi
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleQuickFill(u.username)}
                      className="mt-3 w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Pilih User ID Ini
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowAccountListModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
