import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead, LeadAdditionalItem } from '../../types';
import { 
  X, 
  School, 
  Calendar, 
  Users, 
  DollarSign, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  Trash2,
  Sparkles,
  Building2,
  GraduationCap,
  HeartHandshake,
  ShoppingBag,
  Info,
  CheckCircle2,
  Award,
  HelpCircle,
  Layers,
  UserCheck,
  Tag,
  Percent
} from 'lucide-react';
import { formatRupiah } from '../../utils/crypto';
import { 
  STUDENT_PACKAGES, 
  TEACHER_PACKAGES, 
  COMPANION_PACKAGES, 
  ADDITIONAL_CATALOG_PRESETS,
  PackageDefinition
} from '../../data/packagesData';

// Re-export for compatibility across other components
export { 
  STUDENT_PACKAGES, 
  TEACHER_PACKAGES, 
  COMPANION_PACKAGES, 
  ADDITIONAL_CATALOG_PRESETS 
};

// Aliases for legacy imports
export const STUDENT_PACKAGE_PRESETS = STUDENT_PACKAGES.map(p => ({
  name: p.name,
  defaultPrice: 0,
  target: p.category
}));

export const COMPANION_PACKAGE_PRESETS = COMPANION_PACKAGES.map(p => ({
  name: p.name,
  defaultPrice: 0,
  target: p.category
}));

interface NewProspectModalProps {
  onClose: () => void;
}

export default function NewProspectModal({ onClose }: NewProspectModalProps) {
  const { addLead, currentUser } = useERP();

  // ---------------- SECTION 1: PROFIL INSTITUSI & PIC ----------------
  const [company, setCompany] = useState('');
  const [institutionType, setInstitutionType] = useState<Lead['institutionType']>('SD');
  const [name, setName] = useState('');
  const [picRole, setPicRole] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  // ---------------- SECTION 2: PAKET SISWA (ANAK) ----------------
  const [selectedStudentPackage, setSelectedStudentPackage] = useState<string>(STUDENT_PACKAGES[0].name);
  const [studentPricePerPax, setStudentPricePerPax] = useState<string>('95000');
  const [studentCount, setStudentCount] = useState<string>('100');

  // ---------------- SECTION 3: PAKET GURU (DIPISAHKAN) ----------------
  const [selectedTeacherPackage, setSelectedTeacherPackage] = useState<string>(TEACHER_PACKAGES[0].name);
  const [teacherCount, setTeacherCount] = useState<string>('10');
  const [freeTeacherQuota, setFreeTeacherQuota] = useState<string>('10'); // FOC 10 guru
  const [teacherPricePerPax, setTeacherPricePerPax] = useState<string>('0'); // Biaya jika melebihi kuota gratis

  // ---------------- SECTION 4: PAKET PENDAMPING / ORANG TUA (DIPISAHKAN) ----------------
  const [selectedCompanionPackage, setSelectedCompanionPackage] = useState<string>(COMPANION_PACKAGES[0].name);
  const [companionCount, setCompanionCount] = useState<string>('20');
  const [companionPricePerPax, setCompanionPricePerPax] = useState<string>('50000');

  // ---------------- SECTION 5: ADDITIONAL ITEMS ----------------
  const [additionalItems, setAdditionalItems] = useState<LeadAdditionalItem[]>([
    {
      id: `add_${Date.now()}_1`,
      name: "Susu Murni Segar Pasteurisasi Botol D'Kandang (250 ml)",
      category: 'fnb',
      quantity: 100,
      unitPrice: 12000,
      total: 1200000,
      unitName: 'botol'
    },
    {
      id: `add_${Date.now()}_2`,
      name: 'Souvenir Caping Lukis Bambu Petani',
      category: 'souvenir',
      quantity: 100,
      unitPrice: 15000,
      total: 1500000,
      unitName: 'pcs'
    }
  ]);

  // ---------------- SECTION 6: JADWAL, STAGE & DISKON ----------------
  const [eventDate, setEventDate] = useState('');
  const [surveyDate, setSurveyDate] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [initialStage, setInitialStage] = useState<Lead['stage']>('lead');
  const [salesRep, setSalesRep] = useState('');
  const [notes, setNotes] = useState('');

  // Diskon / Potongan Harga Rombongan
  const [discountType, setDiscountType] = useState<'nominal' | 'percentage'>('nominal');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [discountNote, setDiscountNote] = useState<string>('');

  // Quick catalog modal state
  const [showCatalogSelector, setShowCatalogSelector] = useState(false);

  // Selected package details for informative preview
  const currentStudentPkgDef = useMemo(() => {
    if (!selectedStudentPackage) return null;
    return STUDENT_PACKAGES.find(p => p.name === selectedStudentPackage) || null;
  }, [selectedStudentPackage]);

  const currentTeacherPkgDef = useMemo(() => {
    if (!selectedTeacherPackage) return null;
    return TEACHER_PACKAGES.find(p => p.name === selectedTeacherPackage) || null;
  }, [selectedTeacherPackage]);

  const currentCompanionPkgDef = useMemo(() => {
    if (!selectedCompanionPackage) return null;
    return COMPANION_PACKAGES.find(p => p.name === selectedCompanionPackage) || null;
  }, [selectedCompanionPackage]);

  // Additional items actions
  const handleAddPresetItem = (preset: typeof ADDITIONAL_CATALOG_PRESETS[0]) => {
    const totalPax = (Number(studentCount) || 0) + (Number(teacherCount) || 0) + (Number(companionCount) || 0);
    const qty = preset.unitName === 'event' || preset.unitName === 'banner' ? 1 : (totalPax > 0 ? totalPax : 50);
    const newItem: LeadAdditionalItem = {
      id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: preset.name,
      category: preset.category,
      quantity: qty,
      unitPrice: preset.defaultPrice,
      total: qty * preset.defaultPrice,
      unitName: preset.unitName
    };
    setAdditionalItems(prev => [...prev, newItem]);
    setShowCatalogSelector(false);
  };

  const handleAddBlankCustomItem = () => {
    const totalPax = (Number(studentCount) || 0) + (Number(teacherCount) || 0) + (Number(companionCount) || 0);
    const defaultQty = totalPax > 0 ? totalPax : 50;
    const newItem: LeadAdditionalItem = {
      id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Item Tambahan Custom',
      category: 'wahana',
      quantity: defaultQty,
      unitPrice: 15000,
      total: defaultQty * 15000,
      unitName: 'pax'
    };
    setAdditionalItems(prev => [...prev, newItem]);
  };

  const handleUpdateAdditionalItem = (id: string, updates: Partial<LeadAdditionalItem>) => {
    setAdditionalItems(prev => prev.map(item => {
      if (item.id === id) {
        const merged = { ...item, ...updates };
        merged.total = (merged.quantity || 0) * (merged.unitPrice || 0);
        return merged;
      }
      return item;
    }));
  };

  const handleRemoveAdditionalItem = (id: string) => {
    setAdditionalItems(prev => prev.filter(item => item.id !== id));
  };

  // ---------------- KALKULASI MULTI-TIER REALTIME ----------------
  // 1. Siswa
  const numStudents = selectedStudentPackage ? (Number(studentCount) || 0) : 0;
  const numStudentPrice = selectedStudentPackage ? (Number(studentPricePerPax) || 0) : 0;
  const studentSubtotal = numStudents * numStudentPrice;

  // 2. Guru
  const numTeachers = selectedTeacherPackage ? (Number(teacherCount) || 0) : 0;
  const numFreeTeachers = selectedTeacherPackage ? (Number(freeTeacherQuota) || 0) : 0;
  const payingTeachers = Math.max(0, numTeachers - numFreeTeachers);
  const numTeacherPrice = selectedTeacherPackage ? (Number(teacherPricePerPax) || 0) : 0;
  const teacherSubtotal = payingTeachers * numTeacherPrice;

  // 3. Pendamping (Orang Tua)
  const numCompanions = selectedCompanionPackage ? (Number(companionCount) || 0) : 0;
  const numCompanionPrice = selectedCompanionPackage ? (Number(companionPricePerPax) || 0) : 0;
  const companionSubtotal = numCompanions * numCompanionPrice;

  // 4. Additional
  const additionalSubtotal = additionalItems.reduce((acc, it) => acc + (it.total || 0), 0);

  // 5. Subtotal Kotor (Sebelum Diskon)
  const grossSubtotal = studentSubtotal + teacherSubtotal + companionSubtotal + additionalSubtotal;

  // 6. Kalkulasi Diskon / Potongan
  const numDiscountValue = typeof discountValue === 'number' ? discountValue : 0;
  const rawDiscountAmount = discountType === 'percentage'
    ? Math.round((grossSubtotal * numDiscountValue) / 100)
    : numDiscountValue;
  const effectiveDiscountAmount = Math.min(grossSubtotal, Math.max(0, rawDiscountAmount));

  // 7. Grand Deal Value (Total Bersih setelah Diskon)
  const grandTotalDealValue = Math.max(0, grossSubtotal - effectiveDiscountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !name.trim()) return;

    // Generate dynamic composition note
    const compParts: string[] = [];
    if (selectedStudentPackage && numStudents > 0) compParts.push(`${numStudents} Siswa (${selectedStudentPackage})`);
    if (selectedTeacherPackage && numTeachers > 0) compParts.push(`${numTeachers} Guru (${selectedTeacherPackage}, ${numFreeTeachers} FOC)`);
    if (selectedCompanionPackage && numCompanions > 0) compParts.push(`${numCompanions} Pendamping (${selectedCompanionPackage})`);
    if (compParts.length === 0) compParts.push(`Rombongan Khusus / Additional Only (${company})`);
    const discountText = effectiveDiscountAmount > 0 
      ? ` Diskon: -${formatRupiah(effectiveDiscountAmount)}${discountNote.trim() ? ` (${discountNote.trim()})` : ''}.` 
      : '';
    const autoNotes = `Kunjungan ${compParts.join(', ')}. Additional: ${additionalItems.length} items.${discountText}`;

    await addLead({
      company: company.trim(),
      institutionType,
      name: name.trim(),
      picRole: picRole.trim() || 'Koordinator Rombongan / PIC',
      phone: phone.trim() || '+62 812-0000-0000',
      email: email.trim() || `info@${company.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      address: address.trim() || 'Depok / Jabodetabek',
      
      // Paket Siswa
      packageChosen: selectedStudentPackage || undefined,
      participantCount: numStudents,
      pricePerPax: numStudentPrice,
      studentSubtotal: studentSubtotal,

      // Paket Guru (Tersendiri)
      teacherPackageChosen: selectedTeacherPackage || undefined,
      teacherCount: numTeachers,
      freeTeacherQuota: numFreeTeachers,
      paidTeacherCount: payingTeachers,
      teacherPricePerPax: numTeacherPrice,
      teacherSubtotal: teacherSubtotal,

      // Paket Pendamping (Tersendiri)
      companionPackageChosen: selectedCompanionPackage || undefined,
      companionCount: numCompanions,
      companionPricePerPax: numCompanionPrice,
      companionSubtotal: companionSubtotal,

      // Additional
      additionalItems: additionalItems,
      additionalSubtotal: additionalSubtotal,

      // Diskon / Potongan
      discountAmount: effectiveDiscountAmount > 0 ? effectiveDiscountAmount : undefined,
      discountType: effectiveDiscountAmount > 0 ? discountType : undefined,
      discountValue: effectiveDiscountAmount > 0 && typeof discountValue === 'number' ? discountValue : undefined,
      discountNote: effectiveDiscountAmount > 0 && discountNote.trim() ? discountNote.trim() : undefined,

      dealValue: grandTotalDealValue,
      eventDate: eventDate || undefined,
      surveyDate: surveyDate || undefined,
      specialRequests: specialRequests.trim() || undefined,
      stage: initialStage,
      assignedTo: currentUser.name,
      salesRep: salesRep.trim() || undefined,
      probability: initialStage === 'won' ? 100 : initialStage === 'negotiation' ? 80 : initialStage === 'proposal' ? 60 : 30,
      paymentStatus: 'unpaid',
      dpAmount: 0,
      notes: notes.trim() || autoNotes,
      followUpHistory: [
        {
          id: `fup_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          user: currentUser.name,
          action: 'WhatsApp',
          note: `Pencatatan prospek baru oleh ${currentUser.name}. Estimasi deal value: ${formatRupiah(grandTotalDealValue)}${effectiveDiscountAmount > 0 ? ` (Diskon: -${formatRupiah(effectiveDiscountAmount)})` : ''}.`
        }
      ]
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Input Kunjungan Sekolah & Rombongan Field Trip</h3>
              <p className="text-[11px] text-slate-500">Formulir konfigurasi paket Siswa, Guru (FOC/Berbayar), Pendamping, dan Additional kustom</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-6 text-xs">
          
          {/* Helpful Flexibility Banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-blue-900">
            <div className="p-1 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-xs text-blue-900">Fleksibilitas Instansi & Rombongan Komersial</p>
              <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                Kolom <strong>Jumlah Siswa</strong>, <strong>Guru</strong>, maupun <strong>Pendamping</strong> dapat diisi angka <strong>0 (nol)</strong> apabila pelanggan merupakan instansi perusahaan, dinas, komunitas dewasa, atau sewa venue yang tidak membawa siswa.
              </p>
            </div>
          </div>

          {/* SECTION 1: PROFIL INSTITUSI & PIC */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" /> 1. Profil Sekolah & PIC Lapangan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah / Lembaga *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SDIT Nurul Fikri Sawangan Depok"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenjang Pendidikan *</label>
                <select
                  value={institutionType}
                  onChange={(e) => setInstitutionType(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium"
                >
                  <option value="TK / PAUD">TK / PAUD</option>
                  <option value="SD">SD (Sekolah Dasar)</option>
                  <option value="SMP / SMA">SMP / SMA</option>
                  <option value="Corporate / B2B">Corporate / B2B</option>
                  <option value="Komunitas">Komunitas / Umum</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kontak PIC *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dra. Endang Wahyuni"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jabatan PIC</label>
                <input
                  type="text"
                  placeholder="Contoh: Koordinator Field Trip / Kepala Sekolah"
                  value={picRole}
                  onChange={(e) => setPicRole(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / HP *</label>
                <input
                  type="text"
                  required
                  placeholder="+62 812-..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email Sekolah / PIC</label>
                <input
                  type="email"
                  placeholder="kontak@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Alamat Sekolah</label>
              <input
                type="text"
                placeholder="Jl. Raya Sawangan No. ..., Depok / Jabodetabek"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
              />
            </div>
          </div>

          {/* SECTION 2: PAKET SISWA (PESERTA UTAMA / ANAK) */}
          <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-700" /> 2. Rincian Paket Siswa (Peserta Utama)
                </h4>
                <p className="text-[10px] text-slate-500">Pilih dari 51 paket edukasi resmi D'Kandang Farm & atur harga custom sesuai deal</p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 font-mono">
                Subtotal Siswa: {formatRupiah(studentSubtotal)}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilihan Paket Wisata Edukasi Siswa (Database Resmi):</label>
              <select
                value={selectedStudentPackage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedStudentPackage(val);
                  if (!val) {
                    setStudentCount('0');
                    setStudentPricePerPax('0');
                  } else if (studentPricePerPax === '0' || !studentPricePerPax) {
                    setStudentPricePerPax('95000');
                    if (studentCount === '0' || !studentCount) setStudentCount('50');
                  }
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium text-xs"
              >
                <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Siswa (0 Siswa / Instansi Non-Siswa) --</option>
                {STUDENT_PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    [{pkg.category}] {pkg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Package Activities Info Badge or Empty Badge */}
            {currentStudentPkgDef ? (
              <div className="p-2.5 rounded-xl bg-white border border-emerald-200/80 text-[11px] space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {currentStudentPkgDef.category}
                  </span>
                  <span className="font-semibold text-slate-800">{currentStudentPkgDef.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Kegiatan Paket: </span>
                  <span className="text-slate-700 font-medium">{currentStudentPkgDef.activities.join(' • ')}</span>
                </div>
                {currentStudentPkgDef.optionalActivities && currentStudentPkgDef.optionalActivities.length > 0 && (
                  <div>
                    <span className="text-emerald-700 font-semibold">Pilihan Tambahan: </span>
                    <span className="text-slate-600">{currentStudentPkgDef.optionalActivities.join(' • ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Opsi Kosong: Rombongan ini <strong>tidak mengambil paket wisata siswa</strong> (kunjungan instansi / komunitas / rombongan non-sekolah).</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Jumlah Siswa (Pax):
                  <span className="text-[10px] font-normal text-slate-500 ml-1">(Isi 0 jika non-siswa / instansi)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0 jika tidak ada siswa"
                  value={studentCount}
                  onChange={(e) => setStudentCount(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Harga Kesepakatan per Siswa (Rp):
                  <span className="text-[10px] font-normal text-slate-500 ml-1">(Custom Sesuai Deal)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Masukkan nominal harga kesepakatan"
                  value={studentPricePerPax}
                  onChange={(e) => setStudentPricePerPax(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-emerald-700 font-mono font-bold text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: PAKET GURU (DIPISAHKAN DARI PENDAMPING) */}
          <div className="space-y-3 p-4 rounded-xl bg-blue-50/50 border border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-700" /> 3. Rincian Paket Guru (Fasilitator Sekolah)
                </h4>
                <p className="text-[10px] text-slate-500">Konfigurasi kuota guru gratis (FOC) dan biaya guru berbayar jika ada</p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 font-mono">
                Subtotal Guru: {formatRupiah(teacherSubtotal)}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilihan Paket Guru:</label>
              <select
                value={selectedTeacherPackage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedTeacherPackage(val);
                  if (!val) {
                    setTeacherCount('0');
                    setFreeTeacherQuota('0');
                    setTeacherPricePerPax('0');
                  } else if (teacherCount === '0' || !teacherCount) {
                    setTeacherCount('5');
                    setFreeTeacherQuota('5');
                  }
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium text-xs"
              >
                <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Guru (0 Guru / Tanpa Paket Guru) --</option>
                {TEACHER_PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} ({pkg.activities.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Package Activities Info Badge or Empty Badge */}
            {currentTeacherPkgDef ? (
              <div className="p-2.5 rounded-xl bg-white border border-blue-200/80 text-[11px] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{currentTeacherPkgDef.name}</span>
                  <span className="text-slate-500">• {currentTeacherPkgDef.description}</span>
                </div>
                {currentTeacherPkgDef.optionalActivities && currentTeacherPkgDef.optionalActivities.length > 0 && (
                  <div className="text-blue-700">
                    <span className="font-semibold">Fasilitas / Pilihan: </span>
                    <span>{currentTeacherPkgDef.optionalActivities.join(' • ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Opsi Kosong: Rombongan ini <strong>tidak mengambil paket guru / fasilitator</strong>.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Total Guru (Orang):</label>
                <input
                  type="number"
                  min={0}
                  value={teacherCount}
                  onChange={(e) => setTeacherCount(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1" title="Jumlah guru yang dibebaskan biaya tiket">
                  Kuota Guru Gratis (FOC):
                </label>
                <input
                  type="number"
                  min={0}
                  value={freeTeacherQuota}
                  onChange={(e) => setFreeTeacherQuota(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-amber-700 font-mono font-bold"
                  title="Jumlah guru yang dibebaskan biaya tiket (Free of Charge)"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Bebas Biaya (FOC)
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Guru Berbayar:</label>
                <div className="w-full p-2 bg-slate-100 border border-slate-300 rounded-xl text-slate-700 font-mono font-bold text-center">
                  {payingTeachers} Orang
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Melebihi Kuota FOC
                </span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Harga Guru / Pax (Rp):</label>
                <input
                  type="number"
                  min={0}
                  value={teacherPricePerPax}
                  onChange={(e) => setTeacherPricePerPax(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-blue-700 font-mono font-bold"
                  placeholder="0 jika gratis"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Rp 0 jika semua gratis
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: PAKET PENDAMPING (ORANG TUA / WALI) - DIPISAHKAN */}
          <div className="space-y-3 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-amber-700" /> 4. Rincian Paket Pendamping (Orang Tua / Wali Murid)
                </h4>
                <p className="text-[10px] text-slate-500">Konfigurasi paket dan biaya untuk orang tua siswa yang turut mendampingi</p>
              </div>
              <span className="text-[11px] font-bold text-amber-700 font-mono">
                Subtotal Pendamping: {formatRupiah(companionSubtotal)}
              </span>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Pilihan Paket Pendamping (Orang Tua):</label>
              <select
                value={selectedCompanionPackage}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedCompanionPackage(val);
                  if (!val) {
                    setCompanionCount('0');
                    setCompanionPricePerPax('0');
                  } else if (companionCount === '0' || !companionCount) {
                    setCompanionCount('10');
                    if (companionPricePerPax === '0' || !companionPricePerPax) setCompanionPricePerPax('50000');
                  }
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-medium text-xs"
              >
                <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Pendamping (0 Pendamping / Tanpa Paket) --</option>
                {COMPANION_PACKAGES.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name} ({pkg.activities.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Companion Package Activities Info Badge or Empty Badge */}
            {currentCompanionPkgDef ? (
              <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 text-[11px] space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{currentCompanionPkgDef.name}</span>
                  <span className="text-slate-500">• {currentCompanionPkgDef.description}</span>
                </div>
                {currentCompanionPkgDef.optionalActivities && currentCompanionPkgDef.optionalActivities.length > 0 && (
                  <div className="text-amber-700">
                    <span className="font-semibold">Fasilitas / Pilihan: </span>
                    <span>{currentCompanionPkgDef.optionalActivities.join(' • ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Opsi Kosong: Rombongan ini <strong>tidak mengambil paket pendamping / orang tua</strong>.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Total Orang Tua / Pendamping (Orang):</label>
                <input
                  type="number"
                  min={0}
                  value={companionCount}
                  onChange={(e) => setCompanionCount(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Harga Kesepakatan Pendamping per Pax (Rp):
                  <span className="text-[10px] font-normal text-slate-500 ml-1">(Custom Sesuai Deal)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="Contoh: 35000 / 50000"
                  value={companionPricePerPax}
                  onChange={(e) => setCompanionPricePerPax(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-amber-700 font-mono font-bold text-sm"
                />
              </div>
            </div>
          </div>

          {/* SECTION 5: ADDITIONAL ITEMS (WAHANA, F&B, SOUVENIR, FASILITAS) */}
          <div className="space-y-3 p-4 rounded-xl bg-amber-50/40 border border-amber-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-700" /> 5. Additional & Add-ons (Wahana, F&B, Souvenir, Fasilitas)
                </h4>
                <p className="text-[10px] text-slate-500">Tambahan wahana seru, konsumsi saung resto, souvenir edukasi & fasilitas</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-amber-700 font-mono">
                  Subtotal Additional: {formatRupiah(additionalSubtotal)}
                </span>
              </div>
            </div>

            {/* Additional Items Table / List */}
            {additionalItems.length > 0 ? (
              <div className="space-y-2">
                {additionalItems.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-sm">
                    <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        item.category === 'wahana' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.category === 'fnb' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        item.category === 'souvenir' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.category}
                      </span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateAdditionalItem(item.id, { name: e.target.value })}
                        className="p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs flex-1 font-medium focus:bg-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">Qty:</span>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleUpdateAdditionalItem(item.id, { quantity: Number(e.target.value) || 0 })}
                          className="w-16 p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono text-center text-xs focus:bg-white"
                        />
                        <span className="text-[10px] text-slate-500">{item.unitName || 'pax'}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500">@Rp</span>
                        <input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateAdditionalItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                          className="w-24 p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono text-right text-xs focus:bg-white"
                        />
                      </div>

                      <div className="text-right min-w-[85px]">
                        <span className="font-bold text-amber-700 font-mono text-xs block">
                          {formatRupiah(item.total)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Hapus item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic p-3 text-center bg-white rounded-xl border border-slate-200">
                Belum ada item additional yang ditambahkan.
              </p>
            )}

            {/* Add Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCatalogSelector(!showCatalogSelector)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Pilih dari Katalog Additional
              </button>
              <button
                type="button"
                onClick={handleAddBlankCustomItem}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center gap-1.5 border border-slate-300 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Custom Item
              </button>
            </div>

            {/* Catalog Selector Drawer */}
            {showCatalogSelector && (
              <div className="p-3.5 rounded-xl bg-white border border-amber-300 shadow-md space-y-2 mt-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="font-bold text-amber-800 text-xs">Pilih Item dari Katalog Agrowisata D'Kandang:</span>
                  <button type="button" onClick={() => setShowCatalogSelector(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                  {ADDITIONAL_CATALOG_PRESETS.map((preset, pIdx) => (
                    <button
                      type="button"
                      key={pIdx}
                      onClick={() => handleAddPresetItem(preset)}
                      className="p-2 rounded-lg bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left transition-all flex items-center justify-between gap-2"
                    >
                      <div className="truncate">
                        <span className="text-[11px] font-semibold text-slate-800 block truncate">{preset.name}</span>
                        <span className="text-[10px] text-slate-500 capitalize">{preset.category} • @Rp {preset.defaultPrice.toLocaleString('id-ID')} / {preset.unitName}</span>
                      </div>
                      <Plus className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6: TOTAL RINGKASAN BIAYA & LOGISTIK */}
          <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" /> 6. Potongan Diskon & Rekapitulasi Biaya Rombongan
              </h4>
              {effectiveDiscountAmount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                  <Tag className="w-3 h-3 text-rose-600" /> Diskon Aktif: -{formatRupiah(effectiveDiscountAmount)}
                </span>
              )}
            </div>

            {/* Dedicated Discount Input Panel */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Kolom Input Diskon Rombongan</span>
                    <span className="text-[11px] text-slate-500">Berikan potongan nominal (Rp) atau persentase (%) untuk rombongan sekolah</span>
                  </div>
                </div>

                {/* Toggle Type: Nominal (Rp) vs Persen (%) */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('nominal');
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-md transition-all cursor-pointer ${
                      discountType === 'nominal'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Nominal (Rp)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                    }}
                    className={`flex-1 sm:flex-initial px-3 py-1 rounded-md transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Persentase (%)
                  </button>
                </div>
              </div>

              {/* Discount Value Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-5">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    {discountType === 'percentage' ? 'Persentase Potongan (%):' : 'Besaran Diskon (Rp):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      {discountType === 'percentage' ? '%' : 'Rp'}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={discountType === 'percentage' ? 100 : grossSubtotal}
                      placeholder={discountType === 'percentage' ? 'Misal: 10' : 'Misal: 500000'}
                      value={discountValue}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                        setDiscountValue(val);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                  </div>
                </div>

                {/* Quick % chips if percentage, or quick Rp presets if nominal */}
                <div className="sm:col-span-7">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Pilihan Cepat Diskon:
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {discountType === 'percentage' ? (
                      <>
                        {[5, 10, 15, 20].map((pct) => (
                          <button
                            type="button"
                            key={pct}
                            onClick={() => setDiscountValue(pct)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              discountValue === pct
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDiscountValue('')}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    ) : (
                      <>
                        {[250000, 500000, 1000000, 2000000].map((nom) => (
                          <button
                            type="button"
                            key={nom}
                            onClick={() => setDiscountValue(nom)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                              discountValue === nom
                                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            Rp {(nom / 1000).toLocaleString('id-ID')}rb
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setDiscountValue('')}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                        >
                          Reset
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Note / Keterangan Diskon */}
                <div className="sm:col-span-12">
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Keterangan / Alasan Diskon (Opsional):
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Diskon Rombongan > 100 Siswa, Kerjasama Yayasan, Promo Hari Guru"
                    value={discountNote}
                    onChange={(e) => setDiscountNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Calculation Breakdown Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm">
                <span className="text-[10px] text-emerald-800 block font-semibold">1. Subtotal Siswa</span>
                <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                  {formatRupiah(studentSubtotal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {numStudents > 0 ? `${numStudents} Siswa x Rp ${numStudentPrice.toLocaleString('id-ID')}` : '0 Siswa'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 shadow-sm">
                <span className="text-[10px] text-blue-800 block font-semibold">2. Subtotal Guru</span>
                <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                  {formatRupiah(teacherSubtotal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {numTeachers > 0 ? `${payingTeachers} Berbayar (${numFreeTeachers} FOC)` : '0 Guru'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 shadow-sm">
                <span className="text-[10px] text-amber-800 block font-semibold">3. Subtotal Pendamping</span>
                <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                  {formatRupiah(companionSubtotal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {numCompanions > 0 ? `${numCompanions} Orang Tua` : '0 Pendamping'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 shadow-sm">
                <span className="text-[10px] text-amber-800 block font-semibold">4. Subtotal Additional</span>
                <span className="text-xs font-bold text-slate-800 font-mono block mt-0.5">
                  {formatRupiah(additionalSubtotal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {additionalItems.length} Item Add-on
                </span>
              </div>

              <div className={`p-2.5 rounded-xl border shadow-sm transition-all ${
                effectiveDiscountAmount > 0 
                  ? 'bg-rose-50 border-rose-200' 
                  : 'bg-slate-100 border-dashed border-slate-200'
              }`}>
                <span className={`text-[10px] block font-semibold ${effectiveDiscountAmount > 0 ? 'text-rose-800' : 'text-slate-500'}`}>
                  5. Diskon Rombongan
                </span>
                <span className={`text-xs font-bold font-mono block mt-0.5 ${effectiveDiscountAmount > 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                  {effectiveDiscountAmount > 0 ? `-${formatRupiah(effectiveDiscountAmount)}` : 'Rp 0'}
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  {effectiveDiscountAmount > 0 
                    ? (discountNote.trim() || (discountType === 'percentage' ? `${discountValue}% Potongan` : 'Potongan Khusus'))
                    : 'Tanpa Diskon'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-700 border-2 border-emerald-600 text-white shadow-sm">
                <span className="text-[10px] text-emerald-100 block font-bold uppercase">Grand Deal Value</span>
                <span className="text-sm font-black text-white font-mono block mt-0.5">
                  {formatRupiah(grandTotalDealValue)}
                </span>
                <span className="text-[10px] text-emerald-100">
                  {effectiveDiscountAmount > 0 ? 'Net Setelah Diskon' : 'Total Estimasi'}
                </span>
              </div>
            </div>

            {/* Jadwal & Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Rencana Tanggal Kunjungan:</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jadwal Survey Lokasi:</label>
                <input
                  type="date"
                  value={surveyDate}
                  onChange={(e) => setSurveyDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tahapan Prospek (Stage):</label>
                <select
                  value={initialStage}
                  onChange={(e) => setInitialStage(e.target.value as any)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-blue-700 font-semibold"
                >
                  <option value="lead">1. Prospek Baru (Pipeline Awal)</option>
                  <option value="contacted">2. Terkontak (Survey Lokasi)</option>
                  <option value="qualified">3. Kualifikasi Kuota</option>
                  <option value="proposal">4. Penawaran (Proposal QTN)</option>
                  <option value="negotiation">5. Negosiasi & Draft DP</option>
                  <option value="won">6. DEAL / WON (Terkonfirmasi)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Sales / Marketing:</label>
                <input
                  type="text"
                  placeholder="Nama Sales"
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Permintaan Khusus & Logistik Lapangan:</label>
              <textarea
                rows={2}
                placeholder="Contoh: Butuh parkir 6 bus besar, saung transit VIP ber-AC, menu saung resto bebas alergen kacang..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:bg-white"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Simpan Prospek Field Trip ({formatRupiah(grandTotalDealValue)})
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
