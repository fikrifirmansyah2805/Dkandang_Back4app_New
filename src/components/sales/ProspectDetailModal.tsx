import React, { useState, useMemo } from 'react';
import { Lead, LeadFollowUp, LeadAdditionalItem } from '../../types';
import { useERP } from '../../context/ERPContext';
import { formatRupiah, formatCompactRupiah, formatDate } from '../../utils/crypto';
import { printElementById } from '../../utils/printHelper';
import { 
  X, 
  School, 
  Calendar, 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Sparkles, 
  Send, 
  Printer, 
  MessageSquare, 
  FileText, 
  AlertCircle,
  TrendingUp,
  Shield,
  ShieldCheck,
  Landmark,
  Utensils,
  Bus,
  Edit3,
  Save,
  Check,
  Plus,
  Trash2,
  GraduationCap,
  HeartHandshake,
  ShoppingBag,
  Layers,
  ArrowRight,
  UserCheck,
  Lock,
  Building2,
  Tag,
  Percent
} from 'lucide-react';
import { 
  STUDENT_PACKAGES, 
  TEACHER_PACKAGES, 
  COMPANION_PACKAGES, 
  ADDITIONAL_CATALOG_PRESETS 
} from '../../data/packagesData';
import { CustomQuotationModal } from './CustomQuotationModal';
import { QuotationDetailModal } from './QuotationDetailModal';

interface ProspectDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onSelectQuotation?: (companyName: string) => void;
}

export default function ProspectDetailModal({ lead, onClose, onSelectQuotation }: ProspectDetailModalProps) {
  const { 
    updateLeadStage, 
    addLeadFollowUp, 
    updateLeadDetails, 
    deleteLead,
    addQuotation,
    addCashTransaction,
    bankAccounts,
    cashTransactions,
    currentUser, 
    quotations, 
    salesOrders,
    showNotification
  } = useERP();

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManageSchools = currentUser?.role === 'super_admin' || currentUser?.role === 'direktur_utama';
  const [activeTab, setActiveTab] = useState<'details' | 'followup' | 'documents'>('details');
  const [showCustomQuoteModal, setShowCustomQuoteModal] = useState(false);
  const [selectedQuotationIdForModal, setSelectedQuotationIdForModal] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-tier subtotal calculations
  const currentStudentSubtotal = lead.studentSubtotal ?? ((lead.participantCount || 0) * (lead.pricePerPax || 0));
  
  // Guru
  const totalTeachers = lead.teacherCount ?? (lead.companionCount && lead.freeTeacherQuota ? Math.min(lead.freeTeacherQuota, lead.companionCount) : 0);
  const currentFreeTeachers = lead.freeTeacherQuota ?? 0;
  const currentPaidTeachers = lead.paidTeacherCount ?? Math.max(0, totalTeachers - currentFreeTeachers);
  const currentTeacherSubtotal = lead.teacherSubtotal ?? (currentPaidTeachers * (lead.teacherPricePerPax || 0));

  // Pendamping (Orang Tua)
  const totalCompanions = lead.companionCount ?? 0;
  const currentCompanionSubtotal = lead.companionSubtotal ?? (totalCompanions * (lead.companionPricePerPax || 0));

  // Additional
  const currentAdditionalSubtotal = lead.additionalSubtotal ?? (lead.additionalItems?.reduce((acc, it) => acc + (it.total || 0), 0) || 0);

  // Computed Grand Deal & Discount
  const currentGrossSubtotal = currentStudentSubtotal + currentTeacherSubtotal + currentCompanionSubtotal + currentAdditionalSubtotal;
  const currentDiscountAmount = lead.discountAmount || 0;
  const computedGrandDeal = Math.max(0, currentGrossSubtotal - currentDiscountAmount);
  const effectiveDealValue = lead.dealValue > 0 ? lead.dealValue : computedGrandDeal;

  // Realtime integration with Cash & Bank Inflows
  const linkedCashInflows = useMemo(() => {
    return (cashTransactions || []).filter(t => 
      t.type === 'inflow' && (
        (t.linkedEntityId && t.linkedEntityId === lead.id) ||
        (t.linkedEntityName && (
          t.linkedEntityName.toLowerCase() === lead.company.toLowerCase() ||
          t.linkedEntityName.toLowerCase() === lead.name.toLowerCase()
        ))
      )
    );
  }, [cashTransactions, lead.id, lead.company, lead.name]);

  const totalPaidFromCash = useMemo(() => {
    return linkedCashInflows.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [linkedCashInflows]);

  // Synchronized Paid Amount directly from Finance Cash Inflows
  const effectivePaidAmount = useMemo(() => {
    if (linkedCashInflows.length > 0) {
      return totalPaidFromCash;
    }
    // Only use lead.dpAmount if specifically recorded
    if (lead.dpAmount && lead.dpAmount > 0) {
      return Math.min(lead.dpAmount, effectiveDealValue);
    }
    return 0;
  }, [linkedCashInflows.length, totalPaidFromCash, lead.dpAmount, effectiveDealValue]);

  const effectivePaymentStatus: 'paid' | 'dp_paid' | 'unpaid' = useMemo(() => {
    if (effectiveDealValue > 0 && effectivePaidAmount >= effectiveDealValue) {
      return 'paid';
    }
    if (effectivePaidAmount > 0) {
      return 'dp_paid';
    }
    return 'unpaid';
  }, [effectivePaidAmount, effectiveDealValue]);

  const effectiveRemaining = Math.max(0, effectiveDealValue - effectivePaidAmount);
  const paymentPercentage = effectiveDealValue > 0 ? Math.min(100, Math.round((effectivePaidAmount / effectiveDealValue) * 100)) : 0;

  // Follow-up form state
  const [followUpAction, setFollowUpAction] = useState<LeadFollowUp['action']>('WhatsApp');
  const [followUpNote, setFollowUpNote] = useState('');
  const [isSubmittingFup, setIsSubmittingFup] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit: Identitas Sekolah & PIC (Super Admin Only untuk Nama Sekolah)
  const [editCompany, setEditCompany] = useState(lead.company || '');
  const [editInstitutionType, setEditInstitutionType] = useState(lead.institutionType || 'SD');
  const [editName, setEditName] = useState(lead.name || '');
  const [editPicRole, setEditPicRole] = useState(lead.picRole || '');
  const [editPhone, setEditPhone] = useState(lead.phone || '');
  const [editEmail, setEditEmail] = useState(lead.email || '');
  const [editAddress, setEditAddress] = useState(lead.address || '');

  // Edit: Siswa
  const [editPackage, setEditPackage] = useState(lead.packageChosen || '');
  const [editParticipants, setEditParticipants] = useState(lead.participantCount?.toString() || '0');
  const [editPricePerPax, setEditPricePerPax] = useState(lead.pricePerPax?.toString() || '0');

  // Edit: Guru (Tersendiri)
  const [editTeacherPackage, setEditTeacherPackage] = useState(lead.teacherPackageChosen || '');
  const [editTeacherCount, setEditTeacherCount] = useState(lead.teacherCount?.toString() || '0');
  const [editFreeTeachers, setEditFreeTeachers] = useState(lead.freeTeacherQuota?.toString() || '0');
  const [editTeacherPrice, setEditTeacherPrice] = useState(lead.teacherPricePerPax?.toString() || '0');

  // Edit: Pendamping (Tersendiri)
  const [editCompanionPackage, setEditCompanionPackage] = useState(lead.companionPackageChosen || '');
  const [editCompanionCount, setEditCompanionCount] = useState(lead.companionCount?.toString() || '0');
  const [editCompanionPrice, setEditCompanionPrice] = useState(lead.companionPricePerPax?.toString() || '0');

  // Edit: Additional Items
  const [editAdditionalItems, setEditAdditionalItems] = useState<LeadAdditionalItem[]>(
    lead.additionalItems ? JSON.parse(JSON.stringify(lead.additionalItems)) : []
  );
  const [showCatalogInEdit, setShowCatalogInEdit] = useState(false);

  // Edit: Diskon Rombongan
  const [editDiscountType, setEditDiscountType] = useState<'nominal' | 'percentage'>(lead.discountType || 'nominal');
  const [editDiscountValue, setEditDiscountValue] = useState<number | ''>(
    typeof lead.discountValue === 'number' ? lead.discountValue : (typeof lead.discountAmount === 'number' ? lead.discountAmount : '')
  );
  const [editDiscountNote, setEditDiscountNote] = useState<string>(lead.discountNote || '');

  // Edit: Jadwal & Lokasi
  const [editEventDate, setEditEventDate] = useState(lead.eventDate || '');
  const [editSurveyDate, setEditSurveyDate] = useState(lead.surveyDate || '');
  const [editSpecialReq, setEditSpecialReq] = useState(lead.specialRequests || '');
  const [editSalesRep, setEditSalesRep] = useState(lead.salesRep || '');

  // WhatsApp quick template state
  const [showWhatsAppTemplate, setShowWhatsAppTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'greeting' | 'quote_followup' | 'dp_confirm' | 'sop_reminder'>('greeting');

  // Print Mode
  const [isPrinting, setIsPrinting] = useState(false);

  const matchedQuotes = quotations.filter(q => q.companyName.toLowerCase() === lead.company.toLowerCase());
  const matchedSO = salesOrders.filter(s => s.customerName.toLowerCase() === lead.company.toLowerCase());

  // Realtime calculated values in edit mode
  const editNumStudents = editPackage ? (Number(editParticipants) || 0) : 0;
  const editNumStudentPrice = editPackage ? (Number(editPricePerPax) || 0) : 0;
  const editStudentSubtotal = editNumStudents * editNumStudentPrice;

  const editNumTeachers = editTeacherPackage ? (Number(editTeacherCount) || 0) : 0;
  const editNumFreeTeachers = editTeacherPackage ? (Number(editFreeTeachers) || 0) : 0;
  const editPayingTeachers = Math.max(0, editNumTeachers - editNumFreeTeachers);
  const editNumTeacherPrice = editTeacherPackage ? (Number(editTeacherPrice) || 0) : 0;
  const editTeacherSubtotal = editPayingTeachers * editNumTeacherPrice;

  const editNumCompanions = editCompanionPackage ? (Number(editCompanionCount) || 0) : 0;
  const editNumCompanionPrice = editCompanionPackage ? (Number(editCompanionPrice) || 0) : 0;
  const editCompanionSubtotal = editNumCompanions * editNumCompanionPrice;

  const editAdditionalSubtotal = editAdditionalItems.reduce((acc, it) => acc + (it.total || 0), 0);
  const editGrossDeal = editStudentSubtotal + editTeacherSubtotal + editCompanionSubtotal + editAdditionalSubtotal;
  
  // Realtime edit discount calculation
  const numEditDiscountVal = typeof editDiscountValue === 'number' ? editDiscountValue : 0;
  const editRawDiscountAmount = editDiscountType === 'percentage'
    ? Math.round((editGrossDeal * numEditDiscountVal) / 100)
    : numEditDiscountVal;
  const editDiscountAmount = Math.min(editGrossDeal, Math.max(0, editRawDiscountAmount));
  const editGrandDeal = Math.max(0, editGrossDeal - editDiscountAmount);

  // Additional item handlers in edit mode
  const handleAddPresetToEdit = (preset: typeof ADDITIONAL_CATALOG_PRESETS[0]) => {
    const totalPax = (Number(editParticipants) || 0) + (Number(editTeacherCount) || 0) + (Number(editCompanionCount) || 0);
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
    setEditAdditionalItems(prev => [...prev, newItem]);
    setShowCatalogInEdit(false);
  };

  const handleAddCustomToEdit = () => {
    const totalPax = (Number(editParticipants) || 0) + (Number(editTeacherCount) || 0) + (Number(editCompanionCount) || 0);
    const defaultQty = totalPax > 0 ? totalPax : 50;
    const newItem: LeadAdditionalItem = {
      id: `add_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Item Tambahan Custom Baru',
      category: 'wahana',
      quantity: defaultQty,
      unitPrice: 15000,
      total: defaultQty * 15000,
      unitName: 'pax'
    };
    setEditAdditionalItems(prev => [...prev, newItem]);
  };

  const handleUpdateEditItem = (id: string, updates: Partial<LeadAdditionalItem>) => {
    setEditAdditionalItems(prev => prev.map(item => {
      if (item.id === id) {
        const merged = { ...item, ...updates };
        merged.total = (merged.quantity || 0) * (merged.unitPrice || 0);
        return merged;
      }
      return item;
    }));
  };

  const handleRemoveEditItem = (id: string) => {
    setEditAdditionalItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpNote.trim()) return;

    setIsSubmittingFup(true);
    await addLeadFollowUp(lead.id, followUpAction, followUpNote.trim());
    setFollowUpNote('');
    setIsSubmittingFup(false);
  };

  const handleSaveEdits = async () => {
    const trimmedCompany = editCompany.trim();
    if (isSuperAdmin && !trimmedCompany) {
      showNotification('Nama sekolah / lembaga tidak boleh kosong!', 'warning');
      return;
    }

    await updateLeadDetails(lead.id, {
      ...(isSuperAdmin && trimmedCompany ? { company: trimmedCompany } : {}),
      institutionType: editInstitutionType || lead.institutionType,
      name: editName.trim() || lead.name,
      picRole: editPicRole.trim() || lead.picRole,
      phone: editPhone.trim() || lead.phone,
      email: editEmail.trim() || lead.email,
      address: editAddress.trim() || lead.address,

      packageChosen: editPackage || undefined,
      participantCount: editNumStudents,
      pricePerPax: editNumStudentPrice,
      studentSubtotal: editStudentSubtotal,

      // Guru
      teacherPackageChosen: editTeacherPackage || undefined,
      teacherCount: editNumTeachers,
      freeTeacherQuota: editNumFreeTeachers,
      paidTeacherCount: editPayingTeachers,
      teacherPricePerPax: editNumTeacherPrice,
      teacherSubtotal: editTeacherSubtotal,

      // Pendamping
      companionPackageChosen: editCompanionPackage || undefined,
      companionCount: editNumCompanions,
      companionPricePerPax: editNumCompanionPrice,
      companionSubtotal: editCompanionSubtotal,

      additionalItems: editAdditionalItems,
      additionalSubtotal: editAdditionalSubtotal,

      // Diskon Rombongan
      discountAmount: editDiscountAmount > 0 ? editDiscountAmount : undefined,
      discountType: editDiscountAmount > 0 ? editDiscountType : undefined,
      discountValue: editDiscountAmount > 0 && typeof editDiscountValue === 'number' ? editDiscountValue : undefined,
      discountNote: editDiscountAmount > 0 && editDiscountNote.trim() ? editDiscountNote.trim() : undefined,

      dealValue: editGrandDeal,
      eventDate: editEventDate,
      surveyDate: editSurveyDate,
      specialRequests: editSpecialReq,
      ...(isSuperAdmin && { salesRep: editSalesRep }),
      paymentStatus: lead.paymentStatus,
      dpAmount: lead.dpAmount,
      stage: lead.stage,
      probability: lead.probability
    });

    setIsEditing(false);
  };

  // Convert this Lead directly into a full quotation with all itemized lines
  const handleGenerateFullQuotation = async () => {
    const items: { sku: string; name: string; quantity: number; unitPrice: number; total: number }[] = [];

    // Line 1: Siswa (hanya jika ada paket siswa dan qty > 0)
    if (lead.packageChosen && lead.participantCount && lead.participantCount > 0 && (lead.pricePerPax || 0) > 0) {
      items.push({
        sku: 'PKG-SISWA-01',
        name: `${lead.packageChosen} (${lead.participantCount} Siswa)`,
        quantity: lead.participantCount,
        unitPrice: lead.pricePerPax || 0,
        total: (lead.participantCount) * (lead.pricePerPax || 0)
      });
    }

    // Line 2: Guru Berbayar (hanya jika ada paket guru & guru berbayar)
    if (lead.teacherPackageChosen && currentPaidTeachers > 0 && (lead.teacherPricePerPax || 0) > 0) {
      items.push({
        sku: 'PKG-GURU-01',
        name: `${lead.teacherPackageChosen} (${currentPaidTeachers} Guru Berbayar, ${currentFreeTeachers} Guru FOC)`,
        quantity: currentPaidTeachers,
        unitPrice: lead.teacherPricePerPax || 0,
        total: currentPaidTeachers * (lead.teacherPricePerPax || 0)
      });
    }

    // Line 3: Pendamping (hanya jika ada paket pendamping & orang tua > 0)
    if (lead.companionPackageChosen && lead.companionCount && lead.companionCount > 0 && (lead.companionPricePerPax || 0) > 0) {
      items.push({
        sku: 'PKG-PENDAMPING-01',
        name: `${lead.companionPackageChosen} (${lead.companionCount} Orang)`,
        quantity: lead.companionCount,
        unitPrice: lead.companionPricePerPax || 0,
        total: lead.companionCount * (lead.companionPricePerPax || 0)
      });
    }

    // Line 4+: Additionals
    if (lead.additionalItems && lead.additionalItems.length > 0) {
      lead.additionalItems.forEach((add, idx) => {
        items.push({
          sku: `ADD-${add.category.toUpperCase()}-${idx + 1}`,
          name: `${add.name} [${add.category}]`,
          quantity: add.quantity,
          unitPrice: add.unitPrice,
          total: add.total
        });
      });
    }

    if (items.length === 0) {
      items.push({
        sku: 'KUNJUNGAN-01',
        name: `Kunjungan Rombongan Instansi / Kustom (${lead.company})`,
        quantity: 1,
        unitPrice: lead.dealValue || 0,
        total: lead.dealValue || 0
      });
    }

    const subtotal = items.reduce((acc, it) => acc + it.total, 0);

    await addQuotation({
      customerName: lead.name,
      companyName: lead.company,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      items,
      subtotal,
      tax: 0,
      grandTotal: subtotal
    });

    setActiveTab('documents');
    showNotification(`Surat Penawaran resmi berhasil diterbitkan untuk ${lead.company}!`, 'success');
  };

  const STAGE_LABELS: Record<Lead['stage'], { label: string; bg: string; text: string; border: string }> = {
    lead: { label: 'Prospek Baru (Pipeline Awal)', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
    contacted: { label: 'Terkontak & Survey Lokasi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    qualified: { label: 'Kualifikasi Kuota & Tanggal', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    proposal: { label: 'Penawaran Resmi (Proposal)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    negotiation: { label: 'Negosiasi Akhir & Draft DP', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    won: { label: 'DEAL / BOOKING TERKONFIRMASI', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    lost: { label: 'Batal / Dibatalkan (Lost)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }
  };

  const getWhatsAppMessage = () => {
    const addsText = lead.additionalItems && lead.additionalItems.length > 0
      ? `\n*Item Tambahan / Add-ons:*\n` + lead.additionalItems.map(it => `- ${it.name} (${it.quantity} ${it.unitName || 'pax'} @Rp ${it.unitPrice.toLocaleString('id-ID')})`).join('\n')
      : '';

    const isNonStudent = (lead.participantCount || 0) === 0;
    const totalAdults = totalTeachers + totalCompanions;

    switch (selectedTemplate) {
      case 'greeting': {
        const studentLine = !isNonStudent
          ? `- *Paket Siswa:* ${lead.packageChosen || '-'} (${lead.participantCount} Siswa @Rp ${lead.pricePerPax?.toLocaleString('id-ID')})\n`
          : `- *Peserta Siswa:* 0 (Kunjungan Khusus Instansi / Non-Siswa)\n`;
        const teacherLine = totalTeachers > 0
          ? `- *Paket Guru/Fasilitator:* ${lead.teacherPackageChosen || 'Sesuai Kuota FOC'} (${totalTeachers} Guru, ${currentFreeTeachers} Gratis FOC)\n`
          : '';
        const companionLine = totalCompanions > 0
          ? `- *Paket Pendamping/Dewasa:* ${lead.companionPackageChosen || '-'} (${totalCompanions} Orang @Rp ${lead.companionPricePerPax?.toLocaleString('id-ID')})`
          : '';

        return `Halo Yth. ${lead.name} (${lead.picRole || 'Bapak/Ibu Pimpinan'}) dari ${lead.company},\n\nTerima kasih atas minatnya untuk mengadakan kegiatan di D'Kandang Amazing Farm Depok.\n\nBerikut ringkasan simulasi paket rombongan ${lead.company}:\n${studentLine}${teacherLine}${companionLine}${addsText}\n\n*Estimasi Total Nilai Kesepakatan:* ${formatRupiah(lead.dealValue)}\n\nApakah jadwal survey lokasi ke D'Kandang Farm bisa diagendakan minggu ini? Terima kasih. Salam hangat, ${currentUser.name} (Marketing D'Kandang Farm Depok).`;
      }
      case 'quote_followup': {
        const paxDesc = !isNonStudent
          ? `perkiraan ${lead.participantCount} siswa & ${totalAdults} pendamping`
          : `perkiraan ${totalAdults > 0 ? totalAdults : 'rombongan'} peserta`;
        return `Yth. ${lead.name} dari ${lead.company},\n\nSemoga dalam keadaan sehat selalu. Melanjutkan diskusi mengenai rencana kunjungan rombongan ${lead.company} ke D'Kandang Farm Depok dengan ${paxDesc}.\n\nSurat penawaran resmi itemized telah kami terbitkan. Apakah ada jadwal luang untuk survey lokasi langsung ke Pasir Putih Sawangan Depok? Terima kasih!`;
      }
      case 'dp_confirm':
        return `Yth. ${lead.name} - ${lead.company},\n\nTerima kasih, pembayaran DP / Tanda Jadi untuk booking tanggal kunjungan ${lead.eventDate ? formatDate(lead.eventDate) : 'kunjungan'} telah kami terima dan tercatat di Sistem ERP D'Kandang Farm.\n\nKuota area saung dan fasilitator edukasi telah kami kunci khusus untuk rombongan ${lead.company}.`;
      case 'sop_reminder':
        return `Yth. Panitia Rombongan ${lead.company},\n\nMenjelang hari pelaksanaan kunjungan pada ${lead.eventDate ? formatDate(lead.eventDate) : 'jadwal yang telah ditentukan'}, berikut kami lampirkan SOP Kunjungan D'Kandang Farm (pakaian ganti, alas kaki yang nyaman, serta nomor kontak pemandu lapangan PIC kami). Sampai jumpa di D'Kandang Farm Depok!`;
    }
  };

  const handlePrint = () => {
    printElementById('printable-fieldtrip-confirmation', `Konfirmasi_FieldTrip_${lead.company.replace(/[^a-zA-Z0-9_-]/g, '_')}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <School className="w-3.5 h-3.5" />
                {lead.institutionType || 'SD / Instansi'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${STAGE_LABELS[lead.stage].bg} ${STAGE_LABELS[lead.stage].text} ${STAGE_LABELS[lead.stage].border}`}>
                {STAGE_LABELS[lead.stage].label}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                effectivePaymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                effectivePaymentStatus === 'dp_paid' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {effectivePaymentStatus === 'paid' ? 'LUNAS (100% - Kas Masuk Terverifikasi)' :
                 effectivePaymentStatus === 'dp_paid' ? `DP MASUK (Rp ${effectivePaidAmount.toLocaleString('id-ID')})` :
                 'BELUM BAYAR (MENUNGGU FINANCE)'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                {lead.company}
              </h2>
              {isSuperAdmin && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setActiveTab('details');
                  }}
                  className="px-2 py-0.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors shadow-xs"
                  title="Klik untuk Merubah Nama Sekolah (Hak Akses Khusus Super Admin)"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Ubah Nama Sekolah
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              <span>PIC: <strong className="text-slate-700">{lead.name}</strong> {lead.picRole ? `(${lead.picRole})` : ''}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 font-mono"><Phone className="w-3 h-3 text-emerald-600" /> {lead.phone}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600"><Mail className="w-3 h-3 text-blue-600" /> {lead.email}</span>
              {lead.salesRep && (
                <>
                  <span>•</span>
                  <span>Sales: <strong className="text-slate-700">{lead.salesRep}</strong></span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsPrinting(!isPrinting)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all shadow-sm"
              title="Cetak Lembar Konfirmasi & Invoice Field Trip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Summary Highlights Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3.5 bg-slate-50 border-b border-slate-200 text-xs">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-500 font-medium block">Total Kesepakatan (Deal)</span>
            <strong className="text-sm font-bold text-emerald-700 font-mono">
              {formatRupiah(lead.dealValue)}
            </strong>
            <span className="text-[10px] text-slate-400 block">
              Siswa + Guru + Pendamping + Add-ons
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-500 font-medium block">Komposisi Rombongan</span>
            <strong className="text-sm font-bold text-slate-800">
              {lead.participantCount || 0} Siswa
            </strong>
            <span className="text-[10px] text-blue-700 block font-medium">
              + {totalTeachers} Guru ({currentFreeTeachers} FOC) + {totalCompanions} Pendamping
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-500 font-medium block">Jadwal Kunjungan</span>
            <strong className="text-sm font-bold text-blue-700">
              {lead.eventDate ? formatDate(lead.eventDate) : 'Belum Dijadwalkan'}
            </strong>
            <span className="text-[10px] text-slate-400 block">
              Survey: {lead.surveyDate ? formatDate(lead.surveyDate) : 'Belum'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 font-medium block">Update Stage Pipeline</span>
            <select
              value={lead.stage}
              onChange={(e) => updateLeadStage(lead.id, e.target.value as any)}
              className="w-full mt-1 p-1 bg-slate-50 border border-slate-300 rounded-lg text-[11px] font-semibold text-blue-700 focus:ring-1 focus:ring-blue-500"
            >
              <option value="lead">1. Prospek Baru (Pipeline Awal)</option>
              <option value="contacted">2. Terkontak (Survey Lokasi)</option>
              <option value="qualified">3. Kualifikasi Kuota</option>
              <option value="proposal">4. Penawaran (Proposal QTN)</option>
              <option value="negotiation">5. Negosiasi & Draft DP</option>
              <option value="won">6. DEAL / WON (Terkonfirmasi)</option>
              <option value="lost">7. Batal (Lost)</option>
            </select>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-5 pt-2 gap-2 text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab('details')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'details' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <School className="w-3.5 h-3.5" /> Rincian Paket Siswa, Guru & Pendamping
          </button>
          <button
            onClick={() => setActiveTab('followup')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'followup' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Riwayat Follow-Up ({lead.followUpHistory?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'documents' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Penawaran & Dokumen ({matchedQuotes.length + matchedSO.length})
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1 bg-slate-50/40">
          
          {/* TAB 1: DETAILS & MULTI-TIER PRICING */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              
              {/* Action Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setShowWhatsAppTemplate(!showWhatsAppTemplate)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Chat WhatsApp PIC
                  </button>
                  <button
                    onClick={handleGenerateFullQuotation}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" /> Terbitkan Surat Penawaran (QTN)
                  </button>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                      isEditing ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Batal Edit' : 'Edit Rincian Paket'}
                  </button>

                  {/* Super Admin & Direktur Delete Button (Strict RBAC DOM) */}
                  {canManageSchools && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Hapus Data Sekolah & Rombongan (Otoritas Super Admin & Direktur)"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Hapus Sekolah
                    </button>
                  )}
                </div>

                {isEditing && (
                  <button
                    onClick={handleSaveEdits}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Semua Perubahan ({formatRupiah(editGrandDeal)})
                  </button>
                )}
              </div>

              {/* WhatsApp Quick Template Drawer */}
              {showWhatsAppTemplate && (
                <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-700" /> WhatsApp Template Generator (PIC: {lead.phone})
                    </span>
                    <button onClick={() => setShowWhatsAppTemplate(false)} className="text-slate-400 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                      onClick={() => setSelectedTemplate('greeting')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                        selectedTemplate === 'greeting' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      1. Salam Awal & Rincian Paket
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('quote_followup')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                        selectedTemplate === 'quote_followup' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      2. Follow-Up Penawaran & Survey
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('dp_confirm')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                        selectedTemplate === 'dp_confirm' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      3. Konfirmasi Booking & DP
                    </button>
                    <button
                      onClick={() => setSelectedTemplate('sop_reminder')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap ${
                        selectedTemplate === 'sop_reminder' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      4. SOP H-3 Kunjungan
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {getWhatsAppMessage()}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getWhatsAppMessage());
                        showNotification('Teks WhatsApp berhasil disalin ke clipboard!', 'success');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300"
                    >
                      Salin Teks
                    </button>
                    <a
                      href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(getWhatsAppMessage())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" /> Buka WhatsApp Web
                    </a>
                  </div>
                </div>
              )}

              {/* EDIT MODE CONTAINER */}
              {isEditing ? (
                <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-100">
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-amber-600" /> Mode Edit: Data Sekolah & Rincian Paket
                    </h4>
                    {isSuperAdmin ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-700" /> Akses Super Admin: Izin Ubah Nama Sekolah Aktif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Nama Sekolah Dikunci (Khusus Super Admin)
                      </span>
                    )}
                  </div>

                  {/* 0. Identitas Sekolah & Kontak PIC (Hak Edit Nama Sekolah Khusus Super Admin) */}
                  <div className={`p-3.5 rounded-xl border space-y-3 ${
                    isSuperAdmin ? 'bg-amber-50/40 border-amber-300 shadow-xs' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <School className="w-4 h-4 text-emerald-700" />
                        Identitas Sekolah / Instansi & Kontak PIC
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                          Nama Sekolah / Instansi Rombongan:
                          {isSuperAdmin ? (
                            <span className="text-[9px] text-amber-800 font-bold bg-amber-200/80 px-1.5 py-0.2 rounded border border-amber-300">
                              ★ Super Admin Access
                            </span>
                          ) : (
                            <span className="text-[9px] text-rose-600 font-medium">(Hanya Super Admin)</span>
                          )}
                        </label>
                        {isSuperAdmin ? (
                          <div className="relative">
                            <input
                              type="text"
                              value={editCompany}
                              onChange={(e) => setEditCompany(e.target.value)}
                              placeholder="Masukkan nama resmi sekolah / instansi"
                              className="w-full p-2 pl-3 pr-9 bg-white border-2 border-amber-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 rounded-lg text-xs font-bold text-slate-900 shadow-xs"
                            />
                            <ShieldCheck className="w-4 h-4 text-amber-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        ) : (
                          <div className="relative">
                            <input
                              type="text"
                              value={lead.company}
                              disabled
                              className="w-full p-2 pl-3 pr-8 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-500 cursor-not-allowed font-semibold"
                            />
                            <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                        )}
                        {!isSuperAdmin && (
                          <p className="text-[10px] text-slate-500 italic mt-1">
                            * Nama sekolah tidak dapat diubah oleh staf sales. Hubungi <strong>Super Admin</strong> jika perlu mengganti nama sekolah.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-slate-600 block mb-1">Jenjang / Tipe:</label>
                        <select
                          value={editInstitutionType}
                          onChange={(e) => setEditInstitutionType(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium"
                        >
                          <option value="TK / PAUD">TK / PAUD</option>
                          <option value="SD">SD</option>
                          <option value="SMP / SMA">SMP / SMA</option>
                          <option value="Perguruan Tinggi">Perguruan Tinggi</option>
                          <option value="Corporate / B2B">Corporate / B2B</option>
                          <option value="Instansi / BUMN">Instansi / BUMN</option>
                          <option value="Komunitas">Komunitas</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Nama PIC / Panitia:</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Jabatan / Peran:</label>
                        <input
                          type="text"
                          value={editPicRole}
                          onChange={(e) => setEditPicRole(e.target.value)}
                          placeholder="Kepala Sekolah / Guru"
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">No. HP / WhatsApp:</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Email:</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-600 block mb-0.5">Alamat Lengkap Sekolah / Domisili:</label>
                      <input
                        type="text"
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Alamat sekolah / kota asal rombongan"
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Edit Jadwal & Logistik Lapangan */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Tanggal Kunjungan:</label>
                        <input
                          type="date"
                          value={editEventDate}
                          onChange={(e) => setEditEventDate(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Tanggal Survey:</label>
                        <input
                          type="date"
                          value={editSurveyDate}
                          onChange={(e) => setEditSurveyDate(e.target.value)}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-600 block mb-0.5">Permintaan Khusus & Logistik Lapangan:</label>
                      <textarea
                        rows={2}
                        value={editSpecialReq}
                        onChange={(e) => setEditSpecialReq(e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
                      />
                    </div>

                    {isSuperAdmin && (
                      <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-xl">
                        <label className="text-[10px] font-bold text-rose-800 block mb-1 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5" /> Ganti Nama Sales (Super Admin Only)
                        </label>
                        <input
                          type="text"
                          value={editSalesRep}
                          onChange={(e) => setEditSalesRep(e.target.value)}
                          placeholder="Nama Sales"
                          className="w-full p-1.5 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:border-rose-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* 1. Edit Siswa */}
                  <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 text-xs flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-700" /> 1. Paket Siswa (Peserta Utama / Anak)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 font-mono">
                        Subtotal: {formatRupiah(editStudentSubtotal)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Pilihan Paket Wisata Siswa (51 Paket Resmi):</label>
                        <select
                          value={editPackage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditPackage(val);
                            if (!val) {
                              setEditParticipants('0');
                              setEditPricePerPax('0');
                            } else if (editPricePerPax === '0' || !editPricePerPax) {
                              setEditPricePerPax('95000');
                              if (editParticipants === '0' || !editParticipants) setEditParticipants('50');
                            }
                          }}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium"
                        >
                          <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Siswa (0 Siswa / Instansi) --</option>
                          {STUDENT_PACKAGES.map((pkg) => (
                            <option key={pkg.id} value={pkg.name}>
                              [{pkg.category}] {pkg.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">
                            Jumlah Siswa (Pax):
                            <span className="text-[9px] text-slate-400 ml-1">(Isi 0 jika non-siswa)</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0 jika tidak ada siswa"
                            value={editParticipants}
                            onChange={(e) => setEditParticipants(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Harga Siswa / Pax (Rp) (Custom Deal):</label>
                          <input
                            type="number"
                            min={0}
                            value={editPricePerPax}
                            onChange={(e) => setEditPricePerPax(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-emerald-700 font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Edit Guru (Tersendiri) */}
                  <div className="p-3 rounded-xl bg-blue-50/40 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-800 text-xs flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-blue-700" /> 2. Paket Guru (Fasilitator Sekolah)
                      </span>
                      <span className="text-[11px] font-bold text-blue-700 font-mono">
                        Subtotal: {formatRupiah(editTeacherSubtotal)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Pilihan Paket Guru:</label>
                        <select
                          value={editTeacherPackage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditTeacherPackage(val);
                            if (!val) {
                              setEditTeacherCount('0');
                              setEditFreeTeachers('0');
                              setEditTeacherPrice('0');
                            } else if (editTeacherCount === '0' || !editTeacherCount) {
                              setEditTeacherCount('5');
                              setEditFreeTeachers('5');
                            }
                          }}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium"
                        >
                          <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Guru (0 Guru / Tanpa Paket) --</option>
                          {TEACHER_PACKAGES.map((pkg) => (
                            <option key={pkg.id} value={pkg.name}>
                              {pkg.name} ({pkg.activities.join(', ')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Total Guru:</label>
                          <input
                            type="number"
                            min={0}
                            value={editTeacherCount}
                            onChange={(e) => setEditTeacherCount(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Guru Gratis (FOC):</label>
                          <input
                            type="number"
                            min={0}
                            value={editFreeTeachers}
                            onChange={(e) => setEditFreeTeachers(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-amber-700 font-bold font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Guru Berbayar:</label>
                          <div className="w-full p-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 font-mono font-bold text-center">
                            {editPayingTeachers} Orang
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Harga Guru / Pax (Rp):</label>
                          <input
                            type="number"
                            min={0}
                            value={editTeacherPrice}
                            onChange={(e) => setEditTeacherPrice(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-blue-700 font-bold font-mono"
                            placeholder="0 jika gratis"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Edit Pendamping (Orang Tua / Wali) (Tersendiri) */}
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 text-xs flex items-center gap-1">
                        <HeartHandshake className="w-3.5 h-3.5 text-amber-700" /> 3. Paket Pendamping (Orang Tua / Wali Murid)
                      </span>
                      <span className="text-[11px] font-bold text-amber-700 font-mono">
                        Subtotal: {formatRupiah(editCompanionSubtotal)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-600 block mb-0.5">Pilihan Paket Pendamping:</label>
                        <select
                          value={editCompanionPackage}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditCompanionPackage(val);
                            if (!val) {
                              setEditCompanionCount('0');
                              setEditCompanionPrice('0');
                            } else if (editCompanionCount === '0' || !editCompanionCount) {
                              setEditCompanionCount('10');
                              if (editCompanionPrice === '0' || !editCompanionPrice) setEditCompanionPrice('50000');
                            }
                          }}
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-medium"
                        >
                          <option value="">-- [OPSI KOSONG] Tidak Mengambil Paket Pendamping (0 Pendamping / Tanpa Paket) --</option>
                          {COMPANION_PACKAGES.map((pkg) => (
                            <option key={pkg.id} value={pkg.name}>
                              {pkg.name} ({pkg.activities.join(', ')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Total Pendamping (Orang):</label>
                          <input
                            type="number"
                            min={0}
                            value={editCompanionCount}
                            onChange={(e) => setEditCompanionCount(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-600 block mb-0.5">Harga Pendamping / Pax (Rp) (Custom):</label>
                          <input
                            type="number"
                            min={0}
                            value={editCompanionPrice}
                            onChange={(e) => setEditCompanionPrice(e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-amber-700 font-bold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Edit Additional Items */}
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-800 text-xs">4. Additional Items (Wahana, F&B, Souvenir, Fasilitas)</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold">
                        Subtotal: {formatRupiah(editAdditionalSubtotal)}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {editAdditionalItems.map((item) => (
                        <div key={item.id} className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 text-xs shadow-sm">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateEditItem(item.id, { name: e.target.value })}
                            className="p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs flex-1 focus:bg-white"
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-500">Qty:</span>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleUpdateEditItem(item.id, { quantity: Number(e.target.value) || 0 })}
                              className="w-14 p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono text-center text-xs focus:bg-white"
                            />
                            <span className="text-[10px] text-slate-500">@Rp</span>
                            <input
                              type="number"
                              min={0}
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateEditItem(item.id, { unitPrice: Number(e.target.value) || 0 })}
                              className="w-20 p-1 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono text-right text-xs focus:bg-white"
                            />
                            <span className="font-bold text-amber-700 font-mono text-xs w-20 text-right">
                              {formatRupiah(item.total)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditItem(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowCatalogInEdit(!showCatalogInEdit)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Tambah dari Katalog
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomToEdit}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Custom Item
                      </button>
                    </div>

                    {showCatalogInEdit && (
                      <div className="p-2.5 rounded-lg bg-white border border-amber-300 shadow-md grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                        {ADDITIONAL_CATALOG_PRESETS.map((preset, pIdx) => (
                          <button
                            type="button"
                            key={pIdx}
                            onClick={() => handleAddPresetToEdit(preset)}
                            className="p-1.5 rounded bg-slate-50 hover:bg-amber-50 border border-slate-200 text-left flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate text-slate-800">{preset.name}</span>
                            <span className="text-amber-700 font-mono shrink-0 ml-1">@Rp {preset.defaultPrice.toLocaleString('id-ID')}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. Potongan Diskon Rombongan */}
                  <div className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-rose-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-rose-600" />
                        <div>
                          <span className="font-bold text-rose-900 text-xs block">5. Potongan Diskon Rombongan</span>
                          <span className="text-[11px] text-slate-500">Sesuaikan diskon nominal atau persentase</span>
                        </div>
                      </div>

                      {/* Toggle Nominal vs Persen */}
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => setEditDiscountType('nominal')}
                          className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                            editDiscountType === 'nominal'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Nominal (Rp)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDiscountType('percentage')}
                          className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${
                            editDiscountType === 'percentage'
                              ? 'bg-white text-slate-900 shadow-2xs font-bold'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Persentase (%)
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          {editDiscountType === 'percentage' ? 'Persentase Diskon (%):' : 'Besaran Diskon (Rp):'}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            {editDiscountType === 'percentage' ? '%' : 'Rp'}
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={editDiscountType === 'percentage' ? 100 : editGrossDeal}
                            placeholder={editDiscountType === 'percentage' ? 'Misal: 10' : 'Misal: 500000'}
                            value={editDiscountValue}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                              setEditDiscountValue(val);
                            }}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-7">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Pilihan Cepat Diskon:
                        </label>
                        <div className="flex flex-wrap items-center gap-1">
                          {editDiscountType === 'percentage' ? (
                            <>
                              {[5, 10, 15, 20].map((pct) => (
                                <button
                                  type="button"
                                  key={pct}
                                  onClick={() => setEditDiscountValue(pct)}
                                  className={`px-2 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                                    editDiscountValue === pct
                                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {pct}%
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEditDiscountValue('')}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
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
                                  onClick={() => setEditDiscountValue(nom)}
                                  className={`px-2 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                                    editDiscountValue === nom
                                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold shadow-2xs'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  Rp {(nom / 1000).toLocaleString('id-ID')}rb
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setEditDiscountValue('')}
                                className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                              >
                                Reset
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="sm:col-span-12">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Alasan / Catatan Diskon:
                        </label>
                        <input
                          type="text"
                          placeholder="Alasan potongan harga atau kesepakatan khusus..."
                          value={editDiscountNote}
                          onChange={(e) => setEditDiscountNote(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white"
                        />
                      </div>
                    </div>

                    {/* Live calculation banner */}
                    <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-slate-600">
                        Subtotal Kotor: <strong className="font-mono text-slate-800">{formatRupiah(editGrossDeal)}</strong>
                      </span>
                      <span className="text-rose-700 font-semibold">
                        Diskon: <strong className="font-mono">-{formatRupiah(editDiscountAmount)}</strong>
                      </span>
                      <span className="text-emerald-800 font-bold">
                        Deal Value Bersih: <strong className="font-mono text-emerald-900">{formatRupiah(editGrandDeal)}</strong>
                      </span>
                    </div>
                  </div>

                  {/* 6. Status Keuangan & Jadwal */}
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" /> Status Pembayaran & Kas Masuk
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        effectivePaymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                        effectivePaymentStatus === 'dp_paid' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {effectivePaymentStatus === 'paid' ? 'LUNAS (100%)' :
                         effectivePaymentStatus === 'dp_paid' ? `DP MASUK (${paymentPercentage}%)` :
                         'MENUNGGU PEMBAYARAN (0%)'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-1 pt-1 border-t border-emerald-200/50">
                      <span>Total Kas Masuk Terverifikasi: <strong className="font-mono text-emerald-800">{formatRupiah(effectivePaidAmount)}</strong></span>
                      <span>Sisa Tagihan: <strong className="font-mono text-amber-800">{formatRupiah(effectiveRemaining)}</strong></span>
                    </div>
                    <p className="text-[10px] text-slate-500 italic pt-0.5">
                      * Tim Sales tidak berwenang menginput uang masuk. Seluruh pencatatan pembayaran & kas masuk dilakukan oleh Bagian Keuangan (Finance) melalui modul Kas & Bank.
                    </p>
                  </div>
                </div>
              ) : (
                /* VIEW MODE: 4 BREAKDOWN CARDS (SISWA, GURU, PENDAMPING, REKAPITULASI) */
                <div className="space-y-4">
                  
                  {/* Logistics & Special Requests Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Jadwal & Logistik Lapangan
                      </span>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tanggal Kunjungan:</span>
                          <strong className="text-blue-700">{lead.eventDate ? formatDate(lead.eventDate) : 'Belum Ditentukan'}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Survey Lokasi Farm:</span>
                          <span className="text-slate-700">{lead.surveyDate ? formatDate(lead.surveyDate) : 'Belum Ada Jadwal'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Sales PIC D'Kandang:</span>
                          <span className="text-emerald-700 font-semibold">{lead.assignedTo || currentUser.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Rincian Kegiatan, Aktivitas & Catatan Khusus
                      </span>
                      <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line font-normal space-y-2">
                        {lead.notes && (
                          <div className="text-slate-800">
                            {lead.notes}
                          </div>
                        )}
                        {lead.specialRequests && lead.specialRequests !== lead.notes && (
                          <div className="pt-2 border-t border-slate-200 text-emerald-900 font-medium">
                            <span className="font-bold text-[10px] uppercase text-emerald-700 block mb-0.5">Catatan Logistik:</span>
                            {lead.specialRequests}
                          </div>
                        )}
                        {!lead.notes && !lead.specialRequests && (
                          <span className="text-slate-400 italic">Tidak ada catatan logistik khusus.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid 4 Cards: Siswa, Guru, Pendamping, Rekapitulasi */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {/* Card 1: Paket Siswa */}
                    <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-emerald-700" /> 1. Siswa (Anak)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.packageChosen && (lead.participantCount || 0) > 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {lead.packageChosen && (lead.participantCount || 0) > 0 ? `${lead.participantCount} Siswa` : 'Kosong (0 Siswa)'}
                        </span>
                      </div>
                      
                      <h5 className="font-bold text-slate-800 text-xs leading-snug">
                        {lead.packageChosen || <span className="text-slate-400 italic">Tidak Mengambil Paket Siswa</span>}
                      </h5>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Harga / Siswa:</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          Rp {(lead.pricePerPax || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">Subtotal Siswa:</span>
                        <span className="font-mono text-emerald-700 font-bold text-sm">
                          {formatRupiah(currentStudentSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: Paket Guru (DIPISAHKAN) */}
                    <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-700" /> 2. Guru (Sekolah)
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.teacherPackageChosen && totalTeachers > 0
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {lead.teacherPackageChosen && totalTeachers > 0 ? `${totalTeachers} Guru` : 'Kosong (0 Guru)'}
                        </span>
                      </div>

                      <h5 className="font-bold text-slate-800 text-xs leading-snug">
                        {lead.teacherPackageChosen || <span className="text-slate-400 italic">Tidak Mengambil Paket Guru</span>}
                      </h5>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Kuota Gratis (FOC):</span>
                        <span className="font-mono text-amber-700 font-bold">
                          {currentFreeTeachers} Guru FOC
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Berbayar ({currentPaidTeachers} pax):</span>
                        <span className="font-mono text-slate-700">
                          @Rp {(lead.teacherPricePerPax || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">Subtotal Guru:</span>
                        <span className="font-mono text-blue-700 font-bold text-sm">
                          {formatRupiah(currentTeacherSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Card 3: Paket Pendamping (Orang Tua / Wali) (DIPISAHKAN) */}
                    <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-2 relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                          <HeartHandshake className="w-3.5 h-3.5 text-amber-700" /> 3. Pendamping
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          lead.companionPackageChosen && totalCompanions > 0
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {lead.companionPackageChosen && totalCompanions > 0 ? `${totalCompanions} Orang Tua` : 'Kosong (0 Pendamping)'}
                        </span>
                      </div>

                      <h5 className="font-bold text-slate-800 text-xs leading-snug">
                        {lead.companionPackageChosen || <span className="text-slate-400 italic">Tidak Mengambil Paket Pendamping</span>}
                      </h5>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Harga / Pendamping:</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          Rp {(lead.companionPricePerPax || 0).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-500">Subtotal Pendamping:</span>
                        <span className="font-mono text-amber-700 font-bold text-sm">
                          {formatRupiah(currentCompanionSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Rekapitulasi & Pembayaran */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-300 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                          Grand Total Deal
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          paymentPercentage >= 100 
                            ? 'bg-emerald-600 text-white' 
                            : paymentPercentage > 0 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-slate-300 text-slate-700'
                        }`}>
                          {paymentPercentage >= 100 ? 'Lunas (100%)' : paymentPercentage > 0 ? `DP ${paymentPercentage}%` : 'Belum Bayar'}
                        </span>
                      </div>

                      <div className="py-1">
                        <span className="text-lg font-black text-emerald-800 font-mono block">
                          {formatRupiah(effectiveDealValue)}
                        </span>
                        {currentDiscountAmount > 0 && (
                          <div className="mt-1 flex items-center justify-between text-[11px] bg-white/80 px-2 py-1 rounded-lg border border-rose-200 shadow-2xs">
                            <span className="text-slate-500 line-through">
                              {formatRupiah(currentGrossSubtotal)}
                            </span>
                            <span className="text-rose-700 font-bold font-mono flex items-center gap-1">
                              <Tag className="w-3 h-3 text-rose-600" /> Diskon: -{formatRupiah(currentDiscountAmount)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress bar pembayaran */}
                      <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${paymentPercentage}%` }}
                        />
                      </div>

                      <div className="pt-1 border-t border-emerald-200 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Dana Masuk (DP):</span>
                          <span className="font-mono text-blue-700 font-bold">{formatRupiah(effectivePaidAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Sisa Tagihan:</span>
                          <span className="font-mono text-amber-800 font-bold">
                            {formatRupiah(effectiveRemaining)}
                          </span>
                        </div>
                        
                        <div className="pt-2">
                          <div className="p-2 bg-emerald-100/60 rounded-lg border border-emerald-200 text-center">
                            <span className="text-[10px] text-emerald-800 font-semibold block">
                              Penerimaan Kas & Pelunasan
                            </span>
                            <span className="text-[10px] text-slate-500 italic block">
                              Divalidasi langsung oleh Bagian Finance
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Additional Items Section Card */}
                  <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-700" /> 4. Rincian Additional & Add-on Items ({lead.additionalItems?.length || 0})
                      </h4>
                      <span className="text-xs font-bold text-amber-800 font-mono">
                        Subtotal Additional: {formatRupiah(currentAdditionalSubtotal)}
                      </span>
                    </div>

                    {lead.additionalItems && lead.additionalItems.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50">
                              <th className="py-2 px-2">Kategori</th>
                              <th className="py-2 px-2">Nama Item Wahana / F&B / Souvenir</th>
                              <th className="py-2 px-2 text-center">Jumlah (Qty)</th>
                              <th className="py-2 px-2 text-right">Harga Satuan</th>
                              <th className="py-2 px-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {lead.additionalItems.map((item, idx) => (
                              <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2 px-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    item.category === 'wahana' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                    item.category === 'fnb' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                    item.category === 'souvenir' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                    'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}>
                                    {item.category}
                                  </span>
                                </td>
                                <td className="py-2 px-2 font-medium text-slate-800">
                                  {item.name}
                                </td>
                                <td className="py-2 px-2 text-center font-mono text-slate-600">
                                  {item.quantity} {item.unitName || 'pax'}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-slate-600">
                                  Rp {item.unitPrice.toLocaleString('id-ID')}
                                </td>
                                <td className="py-2 px-2 text-right font-mono font-bold text-amber-700">
                                  {formatRupiah(item.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic py-1">
                        Tidak ada item additional / add-ons khusus yang dipesan untuk prospek ini.
                      </p>
                    )}
                  </div>

                </div>
              )}

              {/* Printable Confirmation Preview (If Activated) */}
              {isPrinting && (
                <div id="printable-fieldtrip-confirmation" className="printable-document p-6 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-xl space-y-5 print:block">
                  <div className="flex items-center justify-between border-b-2 border-emerald-800 pb-3">
                    <div>
                      <h3 className="font-black text-base text-emerald-900 tracking-tight">D'KANDANG AMAZING FARM DEPOK</h3>
                      <p className="text-[11px] text-slate-600">Jl. Pasir Putih No. 18, Sawangan, Kota Depok, Jawa Barat • Telp: (021) 7788-9900</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold uppercase text-emerald-800 px-2.5 py-1 bg-emerald-100 rounded">
                        LEMBAR KONFIRMASI FIELD TRIP
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">Ref ID: {lead.id.toUpperCase()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p><strong>Nama Sekolah / Instansi:</strong> {lead.company}</p>
                      <p><strong>PIC & No. Kontak:</strong> {lead.name} ({lead.phone})</p>
                      <p><strong>Jenjang Pendidikan:</strong> {lead.institutionType || 'SD'}</p>
                      <p><strong>Alamat:</strong> {lead.address || 'Depok / Jabodetabek'}</p>
                    </div>
                    <div>
                      <p><strong>Tanggal Kunjungan:</strong> {lead.eventDate ? formatDate(lead.eventDate) : '-'}</p>
                      <p><strong>Total Siswa:</strong> {lead.participantCount || 0} Siswa</p>
                      <p><strong>Guru:</strong> {totalTeachers} Orang ({currentFreeTeachers} Guru Gratis FOC, {currentPaidTeachers} Berbayar)</p>
                      <p><strong>Pendamping (Ortu):</strong> {totalCompanions} Orang</p>
                      <p><strong>Status Pembayaran:</strong> <span className="font-bold uppercase text-emerald-800">{lead.paymentStatus || 'UNPAID'}</span></p>
                    </div>
                  </div>

                  {/* Multi-tier itemized table in print sheet */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                        <tr>
                          <th className="p-2">Uraian Paket & Fasilitas</th>
                          <th className="p-2 text-center">Jumlah (Qty)</th>
                          <th className="p-2 text-right">Harga Satuan</th>
                          <th className="p-2 text-right">Total (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {/* Siswa */}
                        {lead.packageChosen && (lead.participantCount || 0) > 0 && (
                          <tr>
                            <td className="p-2">
                              <strong>{lead.packageChosen}</strong>
                              <span className="block text-[10px] text-slate-500">Paket Edukasi & Wahana Pertanian Utama Siswa</span>
                            </td>
                            <td className="p-2 text-center font-mono">{lead.participantCount || 0} Siswa</td>
                            <td className="p-2 text-right font-mono">Rp {(lead.pricePerPax || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-mono font-semibold">{formatRupiah(currentStudentSubtotal)}</td>
                          </tr>
                        )}

                        {/* Guru Berbayar */}
                        {currentPaidTeachers > 0 && (
                          <tr>
                            <td className="p-2">
                              <strong>{lead.teacherPackageChosen || 'Paket Guru'}</strong>
                              <span className="block text-[10px] text-slate-500">
                                Guru Pendamping Berbayar (di luar kuota {currentFreeTeachers} FOC)
                              </span>
                            </td>
                            <td className="p-2 text-center font-mono">{currentPaidTeachers} Guru</td>
                            <td className="p-2 text-right font-mono">Rp {(lead.teacherPricePerPax || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-mono font-semibold">{formatRupiah(currentTeacherSubtotal)}</td>
                          </tr>
                        )}

                        {/* Pendamping */}
                        {totalCompanions > 0 && (
                          <tr>
                            <td className="p-2">
                              <strong>{lead.companionPackageChosen || 'Paket Pendamping (Orang Tua)'}</strong>
                              <span className="block text-[10px] text-slate-500">
                                Orang Tua / Wali Siswa Pendamping
                              </span>
                            </td>
                            <td className="p-2 text-center font-mono">{totalCompanions} Orang</td>
                            <td className="p-2 text-right font-mono">Rp {(lead.companionPricePerPax || 0).toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-mono font-semibold">{formatRupiah(currentCompanionSubtotal)}</td>
                          </tr>
                        )}

                        {/* Additionals */}
                        {lead.additionalItems?.map((add, aIdx) => (
                          <tr key={aIdx}>
                            <td className="p-2">
                              {add.name} <span className="text-[10px] text-slate-500 uppercase">[{add.category}]</span>
                            </td>
                            <td className="p-2 text-center font-mono">{add.quantity} {add.unitName || 'pax'}</td>
                            <td className="p-2 text-right font-mono">Rp {add.unitPrice.toLocaleString('id-ID')}</td>
                            <td className="p-2 text-right font-mono font-semibold">{formatRupiah(add.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                        {currentDiscountAmount > 0 && (
                          <>
                            <tr>
                              <td colSpan={3} className="p-2 text-right text-slate-600 font-normal">Subtotal Kotor:</td>
                              <td className="p-2 text-right font-mono text-slate-700 font-normal">{formatRupiah(currentGrossSubtotal)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="p-2 text-right text-rose-700 font-normal">
                                Potongan Diskon {lead.discountNote ? `(${lead.discountNote})` : ''}:
                              </td>
                              <td className="p-2 text-right font-mono text-rose-700 font-normal">-{formatRupiah(currentDiscountAmount)}</td>
                            </tr>
                          </>
                        )}
                        <tr>
                          <td colSpan={3} className="p-2 text-right">Grand Total Kesepakatan:</td>
                          <td className="p-2 text-right font-mono text-emerald-800">{formatRupiah(effectiveDealValue)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-2 text-right text-slate-600 font-normal">Telah Dibayarkan (DP):</td>
                          <td className="p-2 text-right font-mono text-blue-700 font-normal">{formatRupiah(lead.dpAmount || 0)}</td>
                        </tr>
                        <tr>
                          <td colSpan={3} className="p-2 text-right text-slate-900">Sisa Pelunasan:</td>
                          <td className="p-2 text-right font-mono text-amber-800">
                            {formatRupiah(Math.max(0, lead.dealValue - (lead.dpAmount || 0)))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {lead.specialRequests && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                      <strong>Catatan Khusus & Fasilitas Lapangan:</strong> {lead.specialRequests}
                    </div>
                  )}

                  <div className="flex justify-between pt-6 text-center text-xs">
                    <div>
                      <p className="text-slate-600">PIC Sekolah / Instansi</p>
                      <div className="h-14"></div>
                      <p className="font-bold underline">{lead.name}</p>
                      <p className="text-[10px] text-slate-500">{lead.company}</p>
                    </div>
                    <div>
                      <p className="text-slate-600">Marketing & Sales Agrowisata</p>
                      <div className="h-14"></div>
                      <p className="font-bold underline">{currentUser.name}</p>
                      <p className="text-[10px] text-slate-500">PT D'Kandang Amazing Farm</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 no-print">
                    <button
                      onClick={handlePrint}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <Printer className="w-4 h-4" /> Cetak Lembar Konfirmasi (PDF)
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: FOLLOW-UP TIMELINE */}
          {activeTab === 'followup' && (
            <div className="space-y-5">
              
              {/* New Follow Up Box */}
              <form onSubmit={handleAddFollowUp} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Catat Aktivitas Follow-Up Baru
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 block mb-1">Kanal Interaksi:</label>
                    <select
                      value={followUpAction}
                      onChange={(e) => setFollowUpAction(e.target.value as any)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telepon">Telepon Langsung</option>
                      <option value="Survey Lokasi">Survey Lokasi Farm</option>
                      <option value="Meeting Proposal">Meeting Proposal</option>
                      <option value="Email">Email Resmi</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] text-slate-600 block mb-1">Rangkuman Hasil Follow-Up & Respon PIC:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Diskusi dengan PIC mengenai kuota guru gratis dan penambahan souvenir caping..."
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingFup || !followUpNote.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Simpan Catatan Follow-Up
                  </button>
                </div>
              </form>

              {/* Timeline List */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                  Riwayat Komunikasi & Progress Prospek ({lead.followUpHistory?.length || 0})
                </h4>

                {lead.followUpHistory && lead.followUpHistory.length > 0 ? (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {lead.followUpHistory.map((fup) => (
                      <div key={fup.id} className="relative group">
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 group-hover:scale-110 transition-transform"></div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1 hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {fup.action}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {formatDate(fup.date)} • oleh {fup.user}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed pt-1">
                            {fup.note}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-slate-400">
                    Belum ada riwayat follow-up yang dicatat.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: DOCUMENTS & INTEGRATIONS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              
              {/* Riwayat Pembayaran Kas & Bank (Inflow Terverifikasi Finance) */}
              <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Riwayat Penerimaan Uang Kas Terverifikasi (Finance)
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-800 font-mono bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    Total Masuk: {formatRupiah(effectivePaidAmount)}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="text-[11px]">
                    Seluruh penerimaan kas masuk dicatat & divalidasi oleh <strong>Bagian Keuangan (Finance)</strong> melalui menu Kas & Bank.
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    {linkedCashInflows.length}x Transaksi Terverifikasi
                  </span>
                </div>

                {linkedCashInflows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse table-auto">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase bg-slate-50">
                          <th className="py-2.5 px-3 w-[22%]">Waktu & No. Ref</th>
                          <th className="py-2.5 px-3 w-[40%]">Keterangan / Tahap</th>
                          <th className="py-2.5 px-3 w-[20%]">Rekening Kas/Bank</th>
                          <th className="py-2.5 px-3 text-right w-[18%]">Nominal Masuk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {linkedCashInflows.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 align-top">
                              <div className="text-slate-800 font-semibold">{formatDate(t.receivedDate || t.date)}</div>
                              <div className="font-mono text-[11px] text-blue-700 font-bold mt-0.5">{t.referenceNo || '-'}</div>
                              {t.receivedDate && t.receivedDate !== t.date && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">Dok: {formatDate(t.date)}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-top">
                              <div className="font-semibold text-slate-900 leading-relaxed break-words">{t.description}</div>
                              {t.paymentStage && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                  {t.paymentStage === 'dp' ? 'Uang Muka (DP)' : t.paymentStage === 'installment' ? 'Cicilan' : 'Pelunasan'}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-top text-slate-600 text-[11px]">
                              <div className="font-semibold text-slate-700">{t.sourceAccount}</div>
                            </td>
                            <td className="py-2.5 px-3 align-top text-right font-mono font-bold text-emerald-700 whitespace-nowrap text-xs sm:text-sm">
                              +{formatRupiah(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                    Belum ada bukti transaksi kas masuk yang dicatat untuk prospek ini.
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider">
                    Surat Penawaran Resmi (Quotations)
                  </h4>
                  <button
                    onClick={() => setShowCustomQuoteModal(true)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Kustomisasi & Terbitkan Penawaran Resmi
                  </button>
                </div>

                {matchedQuotes.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {matchedQuotes.map(q => {
                      const isApproved = q.status === 'approved' || q.status === 'sent' || q.status === 'converted';
                      const isPending = q.status === 'pending_approval' || q.status === 'draft';
                      const isRejected = q.status === 'rejected';

                      return (
                        <div key={q.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                          <div>
                            <button
                              onClick={() => setSelectedQuotationIdForModal(q.id)}
                              className="font-mono font-bold text-blue-700 hover:underline flex items-center gap-1 text-left"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>{q.quotationNumber}</span>
                            </button>
                            <p className="text-[11px] text-slate-500">
                              Terbit: {formatDate(q.date)} • Berlaku: {formatDate(q.validUntil)} • {q.items?.length || 0} Baris Item
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <span className="font-mono font-bold text-slate-800">{formatRupiah(q.grandTotal)}</span>
                              <span className={`block text-[10px] font-bold uppercase ${
                                q.status === 'approved' ? 'text-emerald-700' :
                                q.status === 'sent' ? 'text-blue-700' :
                                q.status === 'converted' ? 'text-blue-700' :
                                q.status === 'rejected' ? 'text-rose-700' :
                                'text-amber-700'
                              }`}>
                                {q.status === 'pending_approval' ? '⏳ Menunggu Approval' :
                                 q.status === 'approved' ? '✓ Disetujui Direksi' :
                                 q.status === 'rejected' ? '✕ Ditolak' :
                                 q.status === 'sent' ? '✉ Terkirim' :
                                 q.status === 'converted' ? '★ Jadi SO' : q.status}
                              </span>
                            </div>
                            <button
                              onClick={() => setSelectedQuotationIdForModal(q.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              Buka Surat
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-2">Belum ada surat penawaran resmi untuk sekolah ini.</p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <h4 className="font-bold text-blue-800 text-xs uppercase tracking-wider">
                  Sales Orders & Konfirmasi Booking (SO)
                </h4>

                {matchedSO.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {matchedSO.map(so => (
                      <div key={so.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-mono font-bold text-blue-700">{so.soNumber}</span>
                          <p className="text-[11px] text-slate-500">Ref Penawaran: {so.quotationRef || '-'}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-800">{formatRupiah(so.totalAmount)}</span>
                          <span className={`block text-[10px] font-bold uppercase ${
                            so.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            Pembayaran: {so.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-2">Belum ada Sales Order aktif untuk sekolah ini.</p>
                )}
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            Terdaftar di CRM sejak: <strong className="text-slate-700">{formatDate(lead.createdAt)}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* MODAL 1: KUSTOMISASI SURAT PENAWARAN */}
      {showCustomQuoteModal && (
        <CustomQuotationModal
          defaultLeadId={lead.id}
          onClose={() => setShowCustomQuoteModal(false)}
          onSaved={(newQuote) => {
            setSelectedQuotationIdForModal(newQuote.id);
          }}
        />
      )}

      {/* MODAL 2: PRATINJAU KOP D'KANDANG RESMI & APPROVAL DIREKSI */}
      {selectedQuotationIdForModal && (
        <QuotationDetailModal
          quotationId={selectedQuotationIdForModal}
          onClose={() => setSelectedQuotationIdForModal(null)}
        />
      )}

      {/* MODAL 3: KONFIRMASI HAPUS DATA SEKOLAH (SUPER ADMIN ONLY) */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Hapus Data Sekolah & Rombongan</h3>
                <p className="text-xs text-rose-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Otoritas Super Admin & Direktur
                </p>
              </div>
            </div>
            
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs space-y-1.5">
              <p className="text-slate-700 font-medium">Apakah Anda yakin ingin menghapus data calon rombongan berikut?</p>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-700" /> {lead.company}
              </div>
              <div className="text-slate-600 flex items-center gap-2 pt-1 border-t border-rose-100/60">
                <span>PIC: <strong>{lead.name}</strong></span>
                <span>•</span>
                <span>Nilai Deal: <strong className="text-emerald-700 font-mono">{formatRupiah(lead.dealValue)}</strong></span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus data sekolah, riwayat komunikasi, dan catatan prospek secara permanen dari basis data cloud Firestore dan sistem ERP D'Kandang Farm.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  const res = await deleteLead(lead.id);
                  setIsDeleting(false);
                  if (res.success) {
                    setShowDeleteModal(false);
                    onClose();
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>Menghapus...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Permanen</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
