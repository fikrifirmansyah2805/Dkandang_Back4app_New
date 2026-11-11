import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  CreditCard, 
  Save, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  UserCheck, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { CompanyProfile } from '../../types';
import { INITIAL_COMPANY_PROFILE } from '../../data/mockData';
import { simulateDecrypt } from '../../utils/crypto';

interface CompanyProfileModalProps {
  onClose: () => void;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({ onClose }) => {
  const { 
    companyProfile, 
    updateCompanyProfile, 
    bankAccounts, 
    currentUser,
    showNotification
  } = useERP();

  const [formData, setFormData] = useState<CompanyProfile>(() => {
    const base = {
      ...INITIAL_COMPANY_PROFILE,
      ...companyProfile
    };
    if (base.defaultBankAccount) {
      base.defaultBankAccount = simulateDecrypt(base.defaultBankAccount);
    }
    return base;
  });

  const [isSaving, setIsSaving] = useState(false);

  // Check if current user has permission to edit company profile (Direksi / Super Admin / Sales Manager)
  const canEdit = currentUser.role === 'direktur_utama' || 
                  currentUser.role === 'super_admin' || 
                  currentUser.role === 'finance_manager' ||
                  currentUser.role === 'sales_director';

  const handleSelectBankFromERP = (bankId: string) => {
    const selected = bankAccounts.find(b => b.id === bankId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        defaultBankName: selected.bankName,
        defaultBankAccount: simulateDecrypt(selected.accountNumber),
        defaultAccountHolder: selected.accountHolder || prev.ptName
      }));
    }
  };

  const handleResetToDefault = () => {
    if (confirm("Kembalikan data profil perusahaan ke default resmi D'Kandang Amazing Farm?")) {
      setFormData({ ...INITIAL_COMPANY_PROFILE });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showNotification("Akses ditolak: Hanya Direksi dan Super Admin yang dapat mengubah data profil perusahaan.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await updateCompanyProfile(formData);
      onClose();
    } catch (err) {
      console.error(err);
      showNotification("Gagal menyimpan profil perusahaan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Pengaturan Profil Perusahaan & Kop Surat</h3>
              <p className="text-xs text-slate-400">
                Data ini otomatis ter-update di seluruh Surat Penawaran, KOP Resmi, Word, dan Google Docs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          
          {/* SECTION 1: IDENTITAS PERUSAHAAN & BRAND */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Identitas Badan Hukum & Merek
              </span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3 h-3" /> Reset Default
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Nama Badan Hukum / PT <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ptName}
                  onChange={e => setFormData({ ...formData, ptName: e.target.value })}
                  placeholder="Contoh: PT. WISATA AGRO EDUKASI SEJAHTERA"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Nama Merek Agrowisata <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: D'Kandang Amazing Farm"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Tagline Kop Surat
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Contoh: WISATA EDUKASI AGRO PERTANIAN & PETERNAKAN RAMAH KELUARGA"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION 2: ALAMAT & KONTAK */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <MapPin className="w-4 h-4 text-slate-600" /> Lokasi & Kontak Resmi KOP
            </span>

            <div>
              <label className="font-semibold text-slate-800 block mb-1">
                Alamat Lengkap Operasional & Wisata <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Penarikan RT 01 / RW 02, Kel. Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" /> Hotline / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(021) 7788-9000 / 0812-1111-2233"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" /> Email Resmi
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sales@dkandang.id"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-slate-500" /> Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.dkandang.id"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: REKENING BANK RESMI (TRANSFER PENAWARAN) */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
                <CreditCard className="w-4 h-4 text-blue-600" /> Rekening Bank Transfer Default (Penawaran & Invoice)
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Wajib dari Kas / Rekening ERP
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1 text-xs">
                  Pilih Rekening Bank / Kas Perusahaan:
                </label>
                <select 
                  onChange={e => handleSelectBankFromERP(e.target.value)}
                  value={bankAccounts.find(b => b.bankName === formData.defaultBankName)?.id || ""}
                  className="w-full p-2.5 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="" disabled>-- Pilih Rekening Bank Resmi --</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} — No. Rek: {simulateDecrypt(b.accountNumber)} (A.N. {b.accountHolder})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rincian Rekening Terpilih (Read-Only Terproteksi) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-blue-200 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Nama Bank & Cabang:</span>
                  <div className="font-bold text-slate-900 mt-0.5">{formData.defaultBankName}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Nomor Rekening:</span>
                  <div className="font-mono font-bold text-blue-900 mt-0.5 text-sm">{formData.defaultBankAccount}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block font-medium">Atas Nama Rekening:</span>
                  <div className="font-semibold text-slate-900 mt-0.5">{formData.defaultAccountHolder}</div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: DIREKSI & PENANDATANGAN RESMI */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs uppercase tracking-wide">
              <UserCheck className="w-4 h-4 text-amber-700" /> Penandatangan Surat & Otorisator Direksi
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Nama Direktur Utama / Pimpinan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.directorName}
                  onChange={e => setFormData({ ...formData, directorName: e.target.value })}
                  placeholder="H. Muh. Ridwan, S.Pt"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-800 block mb-1">
                  Jabatan Pimpinan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.directorTitle}
                  onChange={e => setFormData({ ...formData, directorTitle: e.target.value })}
                  placeholder="Direktur Utama"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-200">
            <div className="text-[11px] text-slate-500">
              * Perubahan langsung tersimpan di Cloud dan otomatis memperbarui preview serta file Word/Docs.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-all"
              >
                Batal
              </button>
              
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Profil & KOP'}
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
