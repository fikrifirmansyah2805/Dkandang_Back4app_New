import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Send
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { Quotation, QuotationItem } from '../../types';
import { STUDENT_PACKAGES, TEACHER_PACKAGES, COMPANION_PACKAGES, ADDITIONAL_CATALOG_PRESETS } from '../../data/packagesData';
import { terbilangRupiah } from '../../utils/quotationExporter';
import { simulateDecrypt } from '../../utils/crypto';

interface CustomQuotationModalProps {
  initialQuotation?: Quotation | null;
  defaultLeadId?: string;
  onClose: () => void;
  onSaved?: (quote: Quotation) => void;
}

export const CustomQuotationModal: React.FC<CustomQuotationModalProps> = ({
  initialQuotation,
  defaultLeadId,
  onClose,
  onSaved
}) => {
  const { leads, companyProfile, addQuotation, updateQuotation, bankAccounts, showNotification } = useERP();

  // Find lead if supplied
  const defaultLead = leads.find(l => l.id === defaultLeadId);

  // Form State
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialQuotation?.leadId || defaultLeadId || (leads.length > 0 ? leads[0].id : '')
  );

  const [companyName, setCompanyName] = useState<string>(
    initialQuotation?.companyName || defaultLead?.company || ''
  );
  const [customerName, setCustomerName] = useState<string>(
    initialQuotation?.customerName || defaultLead?.name || ''
  );
  const [recipientTitle, setRecipientTitle] = useState<string>(
    initialQuotation?.recipientTitle || 'Kepala Sekolah / Panitia Field Trip'
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    initialQuotation?.customerPhone || defaultLead?.phone || ''
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    initialQuotation?.customerEmail || defaultLead?.email || ''
  );
  const [customerAddress, setCustomerAddress] = useState<string>(
    initialQuotation?.customerAddress || defaultLead?.address || ''
  );
  const [eventDate, setEventDate] = useState<string>(
    initialQuotation?.eventDate || defaultLead?.eventDate || ''
  );

  // Letter Metadata
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const defaultLetterNumber = `QTN/DKANDANG/${currentYear}/${currentMonth}/${Math.floor(100 + Math.random() * 900)}`;

  const [quotationNumber, setQuotationNumber] = useState<string>(
    initialQuotation?.quotationNumber || defaultLetterNumber
  );
  const [subject, setSubject] = useState<string>(
    initialQuotation?.subject || "Penawaran Harga Paket Wisata Edukasi & Rekreasi D'Kandang Amazing Farm"
  );
  const [date, setDate] = useState<string>(
    initialQuotation?.date || new Date().toISOString().split('T')[0]
  );
  const [validUntil, setValidUntil] = useState<string>(
    initialQuotation?.validUntil || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  // Line Items
  const getInitialItems = (): QuotationItem[] => {
    if (initialQuotation?.items && initialQuotation.items.length > 0) {
      return initialQuotation.items;
    }
    if (defaultLead) {
      const items: QuotationItem[] = [];
      if (defaultLead.packageChosen && (defaultLead.participantCount || 0) > 0) {
        items.push({
          sku: 'PKG-SISWA-01',
          name: `Paket Siswa: ${defaultLead.packageChosen}`,
          description: 'Aktivitas edukasi peternakan, pertanian, pemandu lapangan, dan tiket wahana utama',
          unit: 'Pax',
          quantity: defaultLead.participantCount || 50,
          unitPrice: defaultLead.pricePerPax || 95000,
          total: (defaultLead.participantCount || 50) * (defaultLead.pricePerPax || 95000)
        });
      }
      if (defaultLead.paidTeacherCount && defaultLead.paidTeacherCount > 0) {
        items.push({
          sku: 'PKG-GURU-01',
          name: `Paket Guru Berbayar (${defaultLead.teacherPackageChosen || 'Standar Guru'})`,
          description: `Guru pendamping di atas kuota gratis FOC (${defaultLead.freeTeacherQuota || 0} Guru Gratis)`,
          unit: 'Pax',
          quantity: defaultLead.paidTeacherCount,
          unitPrice: defaultLead.teacherPricePerPax || 50000,
          total: defaultLead.paidTeacherCount * (defaultLead.teacherPricePerPax || 50000)
        });
      }
      if (defaultLead.companionCount && defaultLead.companionCount > 0) {
        items.push({
          sku: 'PKG-PENDAMPING-01',
          name: `Paket Orang Tua / Pendamping: ${defaultLead.companionPackageChosen || 'MAGER'}`,
          description: 'Tiket masuk area santai, welcome drink & pendampingan rombongan',
          unit: 'Pax',
          quantity: defaultLead.companionCount,
          unitPrice: defaultLead.companionPricePerPax || 50000,
          total: defaultLead.companionCount * (defaultLead.companionPricePerPax || 50000)
        });
      }
      if (defaultLead.additionalItems && defaultLead.additionalItems.length > 0) {
        defaultLead.additionalItems.forEach((add, idx) => {
          items.push({
            sku: `ADD-${idx + 1}`,
            name: `${add.name} [${add.category}]`,
            description: 'Fasilitas / konsumsi tambahan rombongan',
            unit: 'Unit',
            quantity: add.quantity,
            unitPrice: add.unitPrice,
            total: add.total
          });
        });
      }
      if (items.length > 0) return items;
    }

    // Default sample items
    return [
      {
        sku: 'PKG-EDUKASI-01',
        name: "Paket Siswa: LITTLE FARMER (Edukasi Pertanian & Peternakan)",
        description: 'Memerah Sapi, Menanam Tanaman Hias, Menyusui Cempe, Pakan Ternak & Ice Breaking',
        unit: 'Pax',
        quantity: 100,
        unitPrice: 95000,
        total: 9500000
      },
      {
        sku: 'FNB-LUNCH-01',
        name: 'Makan Siang Saung Resto & Susu Pasteurisasi Murni',
        description: 'Menu Bento Box Sehat (Nasi, Ayam Goreng Madu, Sayur Capcay, Buah) + Susu Segar',
        unit: 'Porsi',
        quantity: 100,
        unitPrice: 35000,
        total: 3500000
      }
    ];
  };

  const [items, setItems] = useState<QuotationItem[]>(getInitialItems());
  const [discountAmount, setDiscountAmount] = useState<number>(initialQuotation?.discountAmount || 0);
  const [includeTax, setIncludeTax] = useState<boolean>((initialQuotation?.tax || 0) > 0);

  // Terms and Conditions
  const [terms, setTerms] = useState<string[]>(
    initialQuotation?.termsAndConditions || [
      "Harga paket sudah mencakup pemandu edukasi lapangan (Field Guide) & seluruh tiket aktivitas yang tertera.",
      "Setiap kelipatan 10 siswa berhak mendapatkan 1 guru pendamping gratis (FOC).",
      "Konfirmasi final jumlah rombongan selambat-lambatnya H-5 sebelum tanggal pelaksanaan kunjungan.",
      "Reschedule tanggal kegiatan dapat dilakukan maksimal 1 kali dengan pemberitahuan tertulis H-7."
    ]
  );
  const [newTermText, setNewTermText] = useState('');

  // Payment Terms & Bank Info
  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialQuotation?.paymentTerms || 
    `1. Uang Muka (DP) minimal 30% dibayarkan saat konfirmasi pemesanan jadwal kunjungan.\n2. Pelunasan sisa tagihan selambat-lambatnya H-3 sebelum tanggal pelaksanaan kegiatan.\n3. Pembayaran wajib ditransfer ke rekening resmi ${companyProfile.ptName}.`
  );

  const [bankDetails, setBankDetails] = useState({
    bankName: initialQuotation?.bankDetails?.bankName || companyProfile.defaultBankName || "Bank Mandiri Cabang Depok Margonda",
    accountNumber: simulateDecrypt(initialQuotation?.bankDetails?.accountNumber || companyProfile.defaultBankAccount || "137-00-1928374-1"),
    accountHolder: initialQuotation?.bankDetails?.accountHolder || companyProfile.defaultAccountHolder || companyProfile.ptName
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper when lead selection changes
  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    const targetLead = leads.find(l => l.id === leadId);
    if (targetLead) {
      setCompanyName(targetLead.company || '');
      setCustomerName(targetLead.name || '');
      setCustomerPhone(targetLead.phone || '');
      setCustomerEmail(targetLead.email || '');
      setCustomerAddress(targetLead.address || '');
      setEventDate(targetLead.eventDate || '');
    }
  };

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  const taxableAmount = Math.max(0, subtotal - (Number(discountAmount) || 0));
  const tax = includeTax ? Math.round(taxableAmount * 0.11) : 0;
  const grandTotal = taxableAmount + tax;

  // Item Management
  const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = Number(field === 'quantity' ? value : item.quantity) || 0;
      const p = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
      item.total = q * p;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        sku: `ITEM-${prev.length + 1}`,
        name: 'Item / Fasilitas Tambahan Kustom',
        description: '',
        unit: 'Pax',
        quantity: 1,
        unitPrice: 50000,
        total: 50000
      }
    ]);
  };

  const handleAddPresetPackage = (type: 'student' | 'teacher' | 'companion' | 'facility', name: string) => {
    let newItem: QuotationItem | null = null;
    
    if (type === 'student') {
      const pkg = STUDENT_PACKAGES.find(p => p.name === name);
      newItem = {
        sku: `PKG-STU-${pkg?.id || '01'}`,
        name: `Paket Siswa: ${name}`,
        description: pkg ? `Aktivitas: ${pkg.activities.join(', ')}` : '',
        unit: 'Pax',
        quantity: 50,
        unitPrice: 95000,
        total: 50 * 95000
      };
    } else if (type === 'teacher') {
      const pkg = TEACHER_PACKAGES.find(p => p.name === name);
      newItem = {
        sku: `PKG-TCH-${pkg?.id || '01'}`,
        name: `Paket Guru: ${name}`,
        description: pkg ? `Fasilitas: ${pkg.activities.join(', ')}` : '',
        unit: 'Pax',
        quantity: 5,
        unitPrice: name.includes('GRATIS') ? 0 : 50000,
        total: name.includes('GRATIS') ? 0 : 5 * 50000
      };
    } else if (type === 'companion') {
      const pkg = COMPANION_PACKAGES.find(p => p.name === name);
      newItem = {
        sku: `PKG-CMP-${pkg?.id || '01'}`,
        name: `Paket Pendamping: ${name}`,
        description: pkg ? `Fasilitas: ${pkg.activities.join(', ')}` : '',
        unit: 'Pax',
        quantity: 10,
        unitPrice: 50000,
        total: 10 * 50000
      };
    } else if (type === 'facility') {
      const fac = ADDITIONAL_CATALOG_PRESETS.find(f => f.name === name);
      newItem = {
        sku: `FAC-${fac?.category || '01'}`,
        name: name,
        description: `Kategori: ${fac?.category || 'Fasilitas & Konsumsi'}`,
        unit: 'Unit',
        quantity: 1,
        unitPrice: fac?.defaultPrice || 250000,
        total: fac?.defaultPrice || 250000
      };
    }

    if (newItem) {
      setItems(prev => [...prev, newItem!]);
    }
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Term management
  const handleAddTerm = () => {
    if (newTermText.trim()) {
      setTerms(prev => [...prev, newTermText.trim()]);
      setNewTermText('');
    }
  };

  const handleRemoveTerm = (index: number) => {
    setTerms(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || items.length === 0) {
      showNotification("Harap lengkapi nama sekolah/instansi dan minimal 1 item penawaran!", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      if (initialQuotation) {
        // Edit mode
        await updateQuotation(initialQuotation.id, {
          quotationNumber,
          leadId: selectedLeadId || undefined,
          companyName,
          customerName,
          recipientTitle,
          customerPhone,
          customerEmail,
          customerAddress,
          eventDate,
          subject,
          date,
          validUntil,
          items,
          subtotal,
          discountAmount: Number(discountAmount) || 0,
          tax,
          grandTotal,
          termsAndConditions: terms,
          paymentTerms,
          bankDetails
        });
        if (onSaved) onSaved({ ...initialQuotation, items, subtotal, grandTotal });
      } else {
        // New creation mode - default status is pending_approval
        const createdQuote = await addQuotation({
          quotationNumber,
          leadId: selectedLeadId || undefined,
          companyName,
          customerName,
          recipientTitle,
          customerPhone,
          customerEmail,
          customerAddress,
          eventDate,
          subject,
          date,
          validUntil,
          items,
          subtotal,
          discountAmount: Number(discountAmount) || 0,
          tax,
          grandTotal,
          termsAndConditions: terms,
          paymentTerms,
          bankDetails,
          status: 'pending_approval'
        });
        if (onSaved && createdQuote) onSaved(createdQuote);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-emerald-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg text-white flex items-center gap-2">
                {initialQuotation ? 'Edit Surat Penawaran Resmi' : 'Kustomisasi Surat Penawaran Harga Resmi'}
              </h3>
              <p className="text-xs text-emerald-200/90">
                Kop Resmi PT. D'Kandang Amazing Farm • Format Resmi Siap Approval Direksi & Ekspor
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          
          {/* SECTION 1: HEADER & METADATA SURAT */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" /> 1. Identitas Surat & Instansi Pemesan
              </span>
              {leads.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Tautkan ke Prospek CRM:</span>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => handleLeadSelect(e.target.value)}
                    className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Prospek Kustom Bebas (Tanpa Tautan CRM) --</option>
                    {leads.map(ld => (
                      <option key={ld.id} value={ld.id}>
                        {ld.company} (PIC: {ld.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nomor Surat Penawaran:</label>
                <input
                  type="text"
                  required
                  value={quotationNumber}
                  onChange={(e) => setQuotationNumber(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-blue-700 focus:border-emerald-500"
                  placeholder="QTN/DKANDANG/2026/08/001"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Terbit Surat:</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Berlaku Sampai Dengan:</label>
                <input
                  type="date"
                  required
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-amber-800 font-semibold focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Perihal Surat:</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ditujukan Kepada (Jabatan):</label>
                <input
                  type="text"
                  required
                  value={recipientTitle}
                  onChange={(e) => setRecipientTitle(e.target.value)}
                  placeholder="Kepala Sekolah / Ketua Panitia Field Trip"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Sekolah / Lembaga:</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="SDIT Nurul Fikri Depok"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama PIC Pemesan:</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Dra. Hj. Nurul Hidayah"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">No. WhatsApp / Telepon PIC:</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alamat Instansi / Sekolah:</label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Jl. Raya Tugu No. 12, Cimanggis, Kota Depok"
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanggal Rencana Pelaksanaan Kegiatan:</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-semibold focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: RINCIAN KOMPONEN BIAYA PENAWARAN */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" /> 2. Rincian Paket & Komponen Biaya Kegiatan
                </span>
                <p className="text-[11px] text-slate-500">
                  Dapat ditambah dari 51 katalog paket resmi D'Kandang atau ketik uraian kustom sendiri.
                </p>
              </div>

              {/* PRESET QUICK ADD BUTTONS */}
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPresetPackage('student', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">+ Tambah Paket Siswa (51 Paket)...</option>
                  {STUDENT_PACKAGES.map(p => (
                    <option key={p.id} value={p.name}>[{p.category}] {p.name}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPresetPackage('teacher', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="p-1.5 bg-blue-50 text-blue-800 border border-blue-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">+ Tambah Paket Guru...</option>
                  {TEACHER_PACKAGES.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>

                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddPresetPackage('companion', e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="p-1.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">+ Tambah Paket Pendamping...</option>
                  {COMPANION_PACKAGES.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-2.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-black transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Baris Kustom
                </button>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 text-center w-8">#</th>
                    <th className="p-2.5">Uraian Paket / Fasilitas</th>
                    <th className="p-2.5 w-24 text-center">Qty</th>
                    <th className="p-2.5 w-24 text-center">Satuan</th>
                    <th className="p-2.5 w-36 text-right">Harga Satuan (Rp)</th>
                    <th className="p-2.5 w-36 text-right">Subtotal (Rp)</th>
                    <th className="p-2.5 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="p-2 space-y-1">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Nama Paket / Uraian Fasilitas"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 text-xs"
                        />
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Keterangan tambahan / rincian aktivitas (opsional)"
                          className="w-full p-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-center font-mono font-bold text-slate-800 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={item.unit || 'Pax'}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-center text-xs font-medium"
                        >
                          <option value="Pax">Pax</option>
                          <option value="Orang">Orang</option>
                          <option value="Porsi">Porsi</option>
                          <option value="Unit">Unit</option>
                          <option value="Paket">Paket</option>
                          <option value="Hari">Hari</option>
                          <option value="Sesi">Sesi</option>
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          required
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono text-slate-800 text-xs font-semibold"
                        />
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-700">
                        Rp {item.total.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          disabled={items.length === 1}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-all disabled:opacity-30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTAL CALCULATION BLOCK */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* DISKON & PPN */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-semibold text-slate-800">Penyesuaian Diskon & Pajak:</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-600">Potongan Harga / Diskon (Rp):</span>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
                    className="w-40 p-1.5 bg-white border border-slate-300 rounded-lg text-right font-mono text-xs font-semibold text-amber-700"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={includeTax}
                      onChange={(e) => setIncludeTax(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    Termasuk PPN 11%
                  </label>
                  <span className="font-mono text-slate-700 font-semibold">
                    Rp {tax.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* SUMMARY BOX */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Rincian:</span>
                  <span className="font-mono font-semibold text-slate-800">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Diskon Khusus:</span>
                    <span className="font-mono font-semibold">- Rp {discountAmount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN (11%):</span>
                    <span className="font-mono font-semibold text-slate-800">Rp {tax.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-emerald-300 flex justify-between items-baseline">
                  <span className="font-bold text-emerald-900 text-sm">Grand Total Penawaran:</span>
                  <span className="font-mono font-bold text-emerald-800 text-lg">
                    Rp {grandTotal.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[11px] text-emerald-800 italic pt-1">
                  <strong>Terbilang:</strong> {terbilangRupiah(grandTotal)}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: SYARAT & KETENTUAN (TERMS & CONDITIONS) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> 3. Syarat & Ketentuan Kegiatan
            </span>
            
            <div className="space-y-1.5">
              {terms.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-emerald-700 font-mono w-5">{idx + 1}.</span>
                  <span className="flex-1 text-slate-700">{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTerm(idx)}
                    className="text-slate-400 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTermText}
                onChange={(e) => setNewTermText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTerm();
                  }
                }}
                placeholder="Ketik poin syarat & ketentuan baru..."
                className="flex-1 p-2 bg-white border border-slate-300 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddTerm}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Poin
              </button>
            </div>
          </div>

          {/* SECTION 4: PEMBAYARAN & REKENING RESMI */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" /> 4. Ketentuan Pembayaran & Rekening Resmi Perusahaan
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                🔒 Rekening Terdaftar & Terverifikasi ERP
              </span>
            </div>
            
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Ketentuan Termin Pembayaran (Term of Payment):</label>
              <textarea
                rows={3}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-normal text-slate-800"
              />
            </div>

            {/* Dropdown Pemilihan Rekening Bank & Kas Resmi Perusahaan */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="font-semibold text-slate-800 block mb-1 text-xs">
                  Pilih Rekening Bank / Kas Perusahaan:
                </label>
                <select
                  value={bankDetails.bankName}
                  onChange={(e) => {
                    const selected = bankAccounts.find(b => b.bankName === e.target.value);
                    if (selected) {
                      setBankDetails({
                        bankName: selected.bankName,
                        accountNumber: simulateDecrypt(selected.accountNumber),
                        accountHolder: selected.accountHolder || companyProfile.ptName
                      });
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.bankName}>
                      {b.bankName} — No. Rek: {simulateDecrypt(b.accountNumber)} (A.N. {b.accountHolder})
                    </option>
                  ))}
                  {bankAccounts.length === 0 && (
                    <option value={companyProfile.defaultBankName || "Bank Mandiri Margonda Depok"}>
                      {companyProfile.defaultBankName || "Bank Mandiri Margonda Depok"} — No. Rek: {simulateDecrypt(companyProfile.defaultBankAccount || "137-00-1928374-1")}
                    </option>
                  )}
                </select>
              </div>

              {/* Rincian Rekening Terpilih (Read-Only Terproteksi) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block">Nama Bank & Cabang:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{bankDetails.bankName}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Nomor Rekening Resmi:</span>
                  <div className="font-mono font-bold text-emerald-800 mt-0.5 text-sm">
                    {bankDetails.accountNumber}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Atas Nama (A.N):</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{bankDetails.accountHolder}</div>
                </div>
              </div>
            </div>
          </div>

          {/* APPROVAL NOTICE */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Alur Otorisasi & Approval Direksi:</div>
              <p className="text-[11px] text-amber-800/90 leading-relaxed mt-0.5">
                Surat penawaran yang baru dibuat akan berstatus <span className="font-bold underline">Menunggu Approval Direksi</span>. Dokumen baru dapat diekspor ke Word/Docs atau dikirimkan ke pihak customer setelah diverifikasi dan disetujui oleh Direktur Utama.
              </p>
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {initialQuotation ? 'Simpan Perubahan Penawaran' : 'Terbitkan & Ajukan Approval Direksi'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
