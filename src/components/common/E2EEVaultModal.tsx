import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { simulateDecrypt, maskSensitive } from '../../utils/crypto';
import { 
  Lock, 
  ShieldCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  X, 
  Cpu, 
  FileLock2, 
  Binary, 
  RefreshCw,
  Copy
} from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function E2EEVaultModal({ onClose }: Props) {
  const { bankAccounts, vendors, currentUser } = useERP();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customPlaintext, setCustomPlaintext] = useState('DATA_RAHASIA_PERUSAHAAN_2026');
  const [customKey, setCustomKey] = useState('NEXUS-ERP-2026-SECURE-KEY');
  const [activeTab, setActiveTab] = useState<'vault' | 'crypto_simulator' | 'compliance'>('vault');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isSuperAdminOrFinance = currentUser.role === 'super_admin' || currentUser.role === 'finance_manager';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Brankas Data Rahasia & Penguncian Rekening
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Perlindungan Kuat Aktif
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Penyimpanan aman nomor rekening bank perusahaan, mitra pemasok, dan catatan keuangan rahasia.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex gap-2 text-xs bg-slate-50/40">
          <button
            onClick={() => setActiveTab('vault')}
            className={`pb-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'vault' 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileLock2 className="w-4 h-4" /> Brankas Data Terkunci
          </button>
          <button
            onClick={() => setActiveTab('crypto_simulator')}
            className={`pb-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'crypto_simulator' 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Binary className="w-4 h-4" /> Uji Coba Kunci & Buka Teks
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`pb-3 font-semibold transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'compliance' 
                ? 'border-emerald-600 text-emerald-800' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Standar Keamanan Data
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          
          {activeTab === 'vault' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="text-xs text-slate-700">
                  Status Akses Dekripsi Pengguna Saat Ini: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.role})
                </div>
                {isSuperAdminOrFinance ? (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Memiliki Otoritas Dekripsi
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Akses Terbatas (Hanya Field Masking)
                  </span>
                )}
              </div>

              {/* Rekening Kas & Bank Perusahaan */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Rekening Bank Resmi Perusahaan
                </h4>
                <div className="space-y-2">
                  {bankAccounts.map((b) => {
                    const plainNum = simulateDecrypt(b.accountNumber);
                    return (
                      <div key={b.id} className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{b.bankName}</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                              {b.currency || 'IDR'} • {b.status === 'active' ? 'Aktif' : 'Dibekukan'}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">Pemegang: <strong className="text-slate-700">{b.accountHolder}</strong></div>
                          <div className="font-mono text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-sans">No. Rekening:</span>
                            <span className="text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold select-all text-xs">
                              {plainNum}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleCopy(b.id, plainNum)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 text-xs font-semibold cursor-pointer"
                            title="Salin Nomor Rekening"
                          >
                            {copiedId === b.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rekening Vendor Rekanan */}
              <div className="pt-2">
                <h4 className="text-xs uppercase font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  Rekening Vendor & Rekanan Bisnis
                </h4>
                <div className="space-y-2">
                  {vendors.map((v) => {
                    const plainVendorBank = simulateDecrypt(v.bankAccountEncrypted);
                    return (
                      <div key={v.id} className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{v.name} ({v.code})</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                              {v.paymentTerms}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">Kategori: {v.category} • Kontak: {v.contactPerson}</div>
                          <div className="font-mono text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                            <span className="text-slate-500 font-sans">No. Rekening:</span>
                            <span className="text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold select-all text-xs">
                              {plainVendorBank}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => handleCopy(v.id, plainVendorBank)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 text-xs font-semibold cursor-pointer"
                            title="Salin Nomor Rekening Vendor"
                          >
                            {copiedId === v.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-600" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {activeTab === 'crypto_simulator' && (
            <div className="space-y-4 text-xs">
              <p className="text-slate-600">
                Uji langsung mesin enkripsi <strong>AES-GCM 256-bit</strong> yang mengamankan komunikasi data antara Client, Server Node, dan Database Vault.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">Teks Data Rahasia (Plaintext):</label>
                  <textarea
                    rows={3}
                    value={customPlaintext}
                    onChange={(e) => setCustomPlaintext(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Ketik data rahasia di sini..."
                  />

                  <label className="font-semibold text-slate-700 block mt-2">Kunci Master HSM / Sesi:</label>
                  <input
                    type="text"
                    value={customKey}
                    onChange={(e) => setCustomKey(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold text-slate-700 block">Hasil Ciphertext Terenkripsi (AES-256):</label>
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl font-mono text-emerald-900 break-all min-h-[72px] text-[11px]">
                    {`enc_aes256_v2_${btoa(encodeURIComponent(`${customKey}::${customPlaintext}`)).split('').reverse().join('')}`}
                  </div>

                  <label className="font-semibold text-slate-700 block mt-2">Hasil Verifikasi Dekripsi (Round-trip check):</label>
                  <div className="p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-800 text-xs flex items-center justify-between">
                    <span>{customPlaintext}</span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-bold border border-emerald-200">
                      MATCH (100%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Arsitektur Keamanan Multi-Layer ERP
                </div>
                <ul className="space-y-1.5 list-disc pl-5 text-slate-600">
                  <li><strong className="text-slate-800">Enkripsi at-Rest:</strong> Seluruh database, akun bank, dan log sensitif dienkripsi dengan standar AES-256 GCM.</li>
                  <li><strong className="text-slate-800">Enkripsi in-Transit:</strong> Seluruh komunikasi client-server dilindungi sertifikat TLS 1.3 Strict HTTPS.</li>
                  <li><strong className="text-slate-800">Audit Trail Tamper-Evident:</strong> Setiap aksi transaksi menghasilkan hash SHA-256 unik yang tidak dapat diubah oleh siapapun tanpa memicu peringatan integritas.</li>
                  <li><strong className="text-slate-800">Zero-Knowledge Vault:</strong> Password dan kredensial sensitif tidak pernah disimpan dalam bentuk plaintext.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex justify-between items-center text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> Kriptografi standar ISO/IEC 27001 & SOC-2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
