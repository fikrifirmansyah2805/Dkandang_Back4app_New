import { Lead, CashTransaction, Quotation } from '../types';
import { formatRupiah } from './crypto';

/**
 * Helper to get the student/main pax count from a Lead
 */
export function getLeadStudentPax(lead: Lead): number {
  return lead.participantCount ?? lead.participantsCount ?? 0;
}

/**
 * Helper to get total pax (students + companions + teachers)
 */
export function getLeadTotalPax(lead: Lead): number {
  const students = getLeadStudentPax(lead);
  const companions = lead.companionCount ?? 0;
  const teachers = (lead.teacherCount ?? 0) || (lead.paidTeacherCount ?? 0);
  const total = students + companions + teachers;
  return total > 0 ? total : students;
}

/**
 * Helper to get package name
 */
export function getLeadPackage(lead: Lead): string {
  if (lead.packageInterested && lead.packageInterested.trim()) {
    return lead.packageInterested;
  }
  if (lead.packageChosen && lead.packageChosen.trim()) {
    return lead.packageChosen;
  }
  return 'Paket Edukasi Custom';
}

/**
 * Helper to get target event date
 */
export function getLeadEventDate(lead: Lead): string {
  return lead.targetEventDate || lead.eventDate || lead.createdAt?.split('T')[0] || '';
}

/**
 * Helper to get sales representative / PIC name
 */
export function getLeadSalesRep(lead: Lead): string {
  if (lead.salesRep && lead.salesRep.trim()) {
    return lead.salesRep;
  }
  if (lead.assignedTo) {
    if (lead.assignedTo === 'usr_005') return 'Kak Naya (Sales & CS)';
    if (lead.assignedTo === 'usr_004') return 'Staff Marketing';
    if (lead.assignedTo === 'usr_001') return 'Direktur Utama';
    return lead.assignedTo;
  }
  return 'Staff Sales & CS';
}

/**
 * Helper to get probability based on stage or explicit value
 */
export function getLeadProbability(lead: Lead): number {
  if (lead.stage === 'won') return 100;
  if (lead.stage === 'lost') return 0;
  if (typeof lead.probability === 'number' && lead.probability >= 0) {
    return lead.probability;
  }
  if (lead.stage === 'negotiation') return 75;
  if (lead.stage === 'proposal') return 50;
  return 25;
}

/**
 * Contract Information for a Lead
 */
export function getLeadContractInfo(lead: Lead, quotations: Quotation[] = []) {
  const matchedQuote = quotations.find(q => 
    (q.leadId && q.leadId === lead.id) ||
    (q.companyName && lead.company && q.companyName.toLowerCase().trim() === lead.company.toLowerCase().trim())
  );

  const contractRef = matchedQuote 
    ? matchedQuote.quotationNumber 
    : `SPK-${lead.id.replace('lead_', '').replace(/_/g, '-').toUpperCase()}`;

  const contractStatus = matchedQuote
    ? (matchedQuote.status === 'accepted' ? 'Kontrak Disetujui' :
       matchedQuote.status === 'converted' ? 'Kontrak Final / SO' :
       matchedQuote.status === 'sent' ? 'Penawaran Terkirim' :
       matchedQuote.status === 'pending_approval' ? 'Menunggu Persetujuan' : 'Draft Penawaran')
    : (lead.stage === 'won' ? 'Won (Kontrak Final)' :
       lead.stage === 'negotiation' ? 'Negosiasi SPK' :
       lead.stage === 'proposal' ? 'SPH / Proposal' : 'Prospek Terverifikasi');

  return {
    matchedQuote,
    contractRef,
    contractStatus
  };
}

/**
 * Payment & Inflow Information for a Lead
 */
export function getLeadPaymentInfo(lead: Lead, cashTransactions: CashTransaction[] = []) {
  const studentSubtotal = lead.studentSubtotal || ((lead.participantCount || 0) * (lead.pricePerPax || 0));
  const teacherSubtotal = lead.teacherSubtotal || 0;
  const companionSubtotal = lead.companionSubtotal || 0;
  const additionalSubtotal = lead.additionalSubtotal || 0;
  const computedGrand = studentSubtotal + teacherSubtotal + companionSubtotal + additionalSubtotal;
  const dealValue = lead.dealValue > 0 ? lead.dealValue : (computedGrand > 0 ? computedGrand : 0);

  // Match cash transactions by entity ID or entity name
  const matchedCashInflows = cashTransactions.filter(t => 
    t.type === 'inflow' && (
      (t.linkedEntityId && t.linkedEntityId === lead.id) ||
      (t.linkedEntityName && lead.company && t.linkedEntityName.toLowerCase().trim() === lead.company.toLowerCase().trim()) ||
      (t.linkedEntityName && lead.name && t.linkedEntityName.toLowerCase().trim() === lead.name.toLowerCase().trim())
    )
  );

  const totalCashPaid = matchedCashInflows.reduce((sum, t) => sum + (t.amount || 0), 0);

  let paidAmount = 0;
  if (matchedCashInflows.length > 0) {
    paidAmount = totalCashPaid;
  } else if (lead.paymentStatus === 'paid') {
    paidAmount = dealValue;
  } else if (lead.dpAmount && lead.dpAmount > 0) {
    paidAmount = Math.min(lead.dpAmount, dealValue);
  }

  const remainingAmount = Math.max(0, dealValue - paidAmount);
  const paymentPercentage = dealValue > 0 ? Math.min(100, Math.round((paidAmount / dealValue) * 100)) : (paidAmount > 0 ? 100 : 0);

  let paymentStatus: 'paid' | 'dp_paid' | 'unpaid' = 'unpaid';
  if (dealValue > 0 && paidAmount >= dealValue) {
    paymentStatus = 'paid';
  } else if (paidAmount > 0) {
    paymentStatus = 'dp_paid';
  }

  return {
    dealValue,
    paidAmount,
    remainingAmount,
    paymentPercentage,
    paymentStatus,
    matchedCashInflows
  };
}

export type BillingUrgencyType = 'overdue' | 'today' | 'critical' | 'warning' | 'scheduled' | 'paid' | 'nodate';

/**
 * Conditional Formatting calculation based on Event Date & Payment Status
 */
export function calculateBillingUrgency(
  eventDateStr: string | undefined, 
  remainingAmount: number, 
  paidAmount: number, 
  dealValue: number, 
  refDate: Date = new Date()
) {
  // 1. Sudah Lunas
  if (remainingAmount <= 0 && dealValue > 0) {
    return {
      daysDiff: null,
      billingStatus: 'paid' as BillingUrgencyType,
      billingBadgeLabel: 'Lunas (Aman)',
      billingBadgeBg: 'bg-emerald-100',
      billingBadgeText: 'text-emerald-800 font-bold',
      billingBadgeBorder: 'border-emerald-300',
      rowHighlightClass: 'bg-emerald-50/20',
      borderAccent: 'border-l-4 border-l-emerald-500',
      recommendedAction: 'Pembayaran Lengkap (Tidak Perlu Ditagih)',
      urgencyLevel: 6,
      urgencyTag: 'Lunas'
    };
  }

  // 2. Tanggal Kunjungan Belum Pasti
  if (!eventDateStr || !eventDateStr.trim()) {
    return {
      daysDiff: null,
      billingStatus: 'nodate' as BillingUrgencyType,
      billingBadgeLabel: 'Tgl Belum Pasti',
      billingBadgeBg: 'bg-slate-100',
      billingBadgeText: 'text-slate-700 font-semibold',
      billingBadgeBorder: 'border-slate-300',
      rowHighlightClass: '',
      borderAccent: 'border-l-4 border-l-slate-300',
      recommendedAction: 'Konfirmasi Tanggal Kunjungan & Tagih DP',
      urgencyLevel: 5,
      urgencyTag: 'Belum Ada Tanggal'
    };
  }

  // Parse YYYY-MM-DD
  const parts = eventDateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const evDate = new Date(year, month, day);
  evDate.setHours(0, 0, 0, 0);

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  const diffTime = evDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // 3. JATUH TEMPO: Kunjungan Sudah Lewat tapi Masih Ada Sisa Tagihan (Tunggakan Pasca-Kunjungan)
  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      daysDiff: diffDays,
      billingStatus: 'overdue' as BillingUrgencyType,
      billingBadgeLabel: `Jatuh Tempo (${overdueDays} Hari)`,
      billingBadgeBg: 'bg-rose-100',
      billingBadgeText: 'text-rose-900 font-black',
      billingBadgeBorder: 'border-rose-400',
      rowHighlightClass: 'bg-rose-50/80',
      borderAccent: 'border-l-4 border-l-rose-600',
      recommendedAction: 'MENDESAK: Tagih Pelunasan (Kunjungan Selesai)',
      urgencyLevel: 1,
      urgencyTag: 'Jatuh Tempo'
    };
  }

  // 4. HARI H KUNJUNGAN: Hari ini adalah tanggal kunjungan
  if (diffDays === 0) {
    return {
      daysDiff: 0,
      billingStatus: 'today' as BillingUrgencyType,
      billingBadgeLabel: 'Hari H Kunjungan (Hari Ini)',
      billingBadgeBg: 'bg-amber-100',
      billingBadgeText: 'text-amber-950 font-black',
      billingBadgeBorder: 'border-amber-400',
      rowHighlightClass: 'bg-amber-50/90',
      borderAccent: 'border-l-4 border-l-amber-600',
      recommendedAction: 'TAGIH HARI INI: Kasir / Loket Masuk Sebelum Mulai',
      urgencyLevel: 2,
      urgencyTag: 'Hari H'
    };
  }

  // 5. KRITIKAL H-1 S.D H-3
  if (diffDays <= 3) {
    return {
      daysDiff: diffDays,
      billingStatus: 'critical' as BillingUrgencyType,
      billingBadgeLabel: `Kritikal (H-${diffDays})`,
      billingBadgeBg: 'bg-orange-100',
      billingBadgeText: 'text-orange-950 font-extrabold',
      billingBadgeBorder: 'border-orange-300',
      rowHighlightClass: 'bg-orange-50/60',
      borderAccent: 'border-l-4 border-l-orange-500',
      recommendedAction: `PRIORITAS TINGGI: Tagih Pelunasan H-${diffDays} Segera`,
      urgencyLevel: 3,
      urgencyTag: 'Kritikal H-3'
    };
  }

  // 6. PERINGATAN H-4 S.D H-7
  if (diffDays <= 7) {
    return {
      daysDiff: diffDays,
      billingStatus: 'warning' as BillingUrgencyType,
      billingBadgeLabel: `Peringatan (H-${diffDays})`,
      billingBadgeBg: 'bg-yellow-100',
      billingBadgeText: 'text-yellow-950 font-bold',
      billingBadgeBorder: 'border-yellow-300',
      rowHighlightClass: 'bg-yellow-50/40',
      borderAccent: 'border-l-4 border-l-yellow-500',
      recommendedAction: `PERLU DITAGIH: Kirim Invoice Reminder H-${diffDays}`,
      urgencyLevel: 4,
      urgencyTag: 'Peringatan H-7'
    };
  }

  // 7. TERJADWAL (> 7 Hari)
  if (paidAmount === 0) {
    return {
      daysDiff: diffDays,
      billingStatus: 'scheduled' as BillingUrgencyType,
      billingBadgeLabel: `Terjadwal (H-${diffDays}) - Belum DP`,
      billingBadgeBg: 'bg-blue-50',
      billingBadgeText: 'text-blue-800 font-semibold',
      billingBadgeBorder: 'border-blue-200',
      rowHighlightClass: 'bg-white',
      borderAccent: 'border-l-4 border-l-blue-400',
      recommendedAction: 'Follow-up Konfirmasi DP Booking',
      urgencyLevel: 5,
      urgencyTag: 'Terjadwal'
    };
  }

  return {
    daysDiff: diffDays,
    billingStatus: 'scheduled' as BillingUrgencyType,
    billingBadgeLabel: `Terjadwal (H-${diffDays}) - DP Terbayar`,
    billingBadgeBg: 'bg-slate-100',
    billingBadgeText: 'text-slate-800 font-semibold',
    billingBadgeBorder: 'border-slate-300',
    rowHighlightClass: 'bg-white',
    borderAccent: 'border-l-4 border-l-slate-300',
    recommendedAction: 'DP Masuk, Pelunasan Terjadwal H-7',
    urgencyLevel: 5,
    urgencyTag: 'Terjadwal'
  };
}

export interface LeadBillingSummary {
  lead: Lead;
  schoolName: string;
  institutionType: string;
  picName: string;
  picPhone: string;
  picRole: string;
  packageName: string;
  studentPax: number;
  totalPax: number;
  teacherPax: number;
  companionPax: number;
  eventDate: string;
  salesRep: string;
  contractRef: string;
  contractStatus: string;
  matchedQuote?: Quotation;
  dealValue: number;
  paidAmount: number;
  remainingAmount: number;
  paymentPercentage: number;
  paymentStatus: 'paid' | 'dp_paid' | 'unpaid';
  matchedCashInflows: CashTransaction[];
  daysDiff: number | null;
  billingStatus: BillingUrgencyType;
  billingBadgeLabel: string;
  billingBadgeBg: string;
  billingBadgeText: string;
  billingBadgeBorder: string;
  rowHighlightClass: string;
  borderAccent: string;
  recommendedAction: string;
  urgencyLevel: number;
  urgencyTag: string;
}

/**
 * Complete summary for a lead including Contract, Payment, and Event Date Urgency
 */
export function getLeadBillingSummary(
  lead: Lead,
  cashTransactions: CashTransaction[] = [],
  quotations: Quotation[] = [],
  refDate: Date = new Date()
): LeadBillingSummary {
  const contract = getLeadContractInfo(lead, quotations);
  const payment = getLeadPaymentInfo(lead, cashTransactions);
  const eventDate = getLeadEventDate(lead);
  const urgency = calculateBillingUrgency(eventDate, payment.remainingAmount, payment.paidAmount, payment.dealValue, refDate);

  return {
    lead,
    schoolName: lead.company || lead.name,
    institutionType: lead.institutionType || 'SD',
    picName: lead.name,
    picPhone: lead.phone || '-',
    picRole: lead.picRole || 'Koordinator Kunjungan',
    packageName: getLeadPackage(lead),
    studentPax: getLeadStudentPax(lead),
    totalPax: getLeadTotalPax(lead),
    teacherPax: (lead.teacherCount || 0) || (lead.paidTeacherCount || 0),
    companionPax: lead.companionCount || 0,
    eventDate,
    salesRep: getLeadSalesRep(lead),
    ...contract,
    ...payment,
    ...urgency
  };
}

/**
 * Filter leads by search query, PIC, month, stage, package
 */
export function filterLeadsList(
  leads: Lead[],
  filters: {
    searchQuery?: string;
    selectedPIC?: string;
    selectedMonth?: string;
    selectedStage?: string;
    selectedPackage?: string;
  }
): Lead[] {
  const { searchQuery = '', selectedPIC = 'all', selectedMonth = 'all', selectedStage = 'all', selectedPackage = 'all' } = filters;

  return leads.filter(lead => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const comp = (lead.company || '').toLowerCase();
      const name = (lead.name || '').toLowerCase();
      const pkg = getLeadPackage(lead).toLowerCase();
      const pic = getLeadSalesRep(lead).toLowerCase();
      const notes = (lead.notes || '').toLowerCase();
      if (!comp.includes(q) && !name.includes(q) && !pkg.includes(q) && !pic.includes(q) && !notes.includes(q)) {
        return false;
      }
    }

    // 2. PIC Filter
    if (selectedPIC !== 'all') {
      const pic = getLeadSalesRep(lead);
      if (!pic.toLowerCase().includes(selectedPIC.toLowerCase())) {
        return false;
      }
    }

    // 3. Month Filter
    if (selectedMonth !== 'all') {
      const evDate = getLeadEventDate(lead);
      if (!evDate || !evDate.startsWith(selectedMonth)) {
        return false;
      }
    }

    // 4. Stage Filter
    if (selectedStage !== 'all') {
      const currentStage = lead.stage || 'qualified';
      if (currentStage !== selectedStage) {
        return false;
      }
    }

    // 5. Package Filter
    if (selectedPackage !== 'all') {
      const pkg = getLeadPackage(lead);
      if (pkg !== selectedPackage) {
        return false;
      }
    }

    return true;
  });
}

export type ARScheduleBucket = 
  | 'all' 
  | 'overdue' 
  | 'today_critical' 
  | 'this_week' 
  | 'next_two_weeks' 
  | 'month' 
  | 'later' 
  | 'nodate' 
  | 'paid';

/**
 * Categorize a lead billing summary into an AR schedule aging/timing bucket
 */
export function getARScheduleBucket(item: LeadBillingSummary): ARScheduleBucket {
  if (item.remainingAmount <= 0 && item.dealValue > 0) {
    return 'paid';
  }
  if (item.daysDiff === null) {
    return 'nodate';
  }
  if (item.daysDiff < 0) {
    return 'overdue';
  }
  if (item.daysDiff <= 3) {
    return 'today_critical';
  }
  if (item.daysDiff <= 7) {
    return 'this_week';
  }
  if (item.daysDiff <= 14) {
    return 'next_two_weeks';
  }
  if (item.daysDiff <= 30) {
    return 'month';
  }
  return 'later';
}

export interface WeeklyARProjection {
  id: string;
  label: string;
  subLabel: string;
  startDate: string;
  endDate: string;
  totalRemaining: number;
  totalDeals: number;
  totalPax: number;
  items: LeadBillingSummary[];
  urgencyLevel: 'high' | 'medium' | 'normal';
}

/**
 * Group upcoming outstanding AR into rolling weekly periods
 */
export function getWeeklyARProjections(
  summaries: LeadBillingSummary[], 
  refDate: Date = new Date()
): WeeklyARProjection[] {
  const base = new Date(refDate);
  base.setHours(0, 0, 0, 0);

  // Helper to get date formatted YYYY-MM-DD
  const toYMD = (d: Date) => d.toISOString().split('T')[0];
  const formatIndoDate = (d: Date) => {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const outstanding = summaries.filter(s => s.remainingAmount > 0 && s.daysDiff !== null && s.daysDiff >= 0);

  // Define 4 rolling weekly intervals
  const weeks: WeeklyARProjection[] = [];

  const intervals = [
    { id: 'w1', label: 'Minggu Ini', daysStart: 0, daysEnd: 7, urgency: 'high' as const },
    { id: 'w2', label: 'Minggu Depan', daysStart: 8, daysEnd: 14, urgency: 'medium' as const },
    { id: 'w3', label: 'Minggu ke-3', daysStart: 15, daysEnd: 21, urgency: 'normal' as const },
    { id: 'w4', label: 'Minggu ke-4+', daysStart: 22, daysEnd: 35, urgency: 'normal' as const }
  ];

  intervals.forEach(inv => {
    const dStart = new Date(base);
    dStart.setDate(base.getDate() + inv.daysStart);
    const dEnd = new Date(base);
    dEnd.setDate(base.getDate() + inv.daysEnd);

    const matched = outstanding.filter(item => {
      if (item.daysDiff === null) return false;
      return item.daysDiff >= inv.daysStart && item.daysDiff <= inv.daysEnd;
    });

    weeks.push({
      id: inv.id,
      label: inv.label,
      subLabel: `${formatIndoDate(dStart)} - ${formatIndoDate(dEnd)}`,
      startDate: toYMD(dStart),
      endDate: toYMD(dEnd),
      totalRemaining: matched.reduce((sum, i) => sum + i.remainingAmount, 0),
      totalDeals: matched.length,
      totalPax: matched.reduce((sum, i) => sum + i.totalPax, 0),
      items: matched,
      urgencyLevel: inv.urgency
    });
  });

  return weeks;
}

/**
 * Generate formatted WhatsApp reminder message for payment collection
 */
export function generateARWhatsAppReminder(
  item: LeadBillingSummary,
  tone: 'polite' | 'formal' | 'urgent' = 'polite',
  bankAccounts: { bankName: string; accountNumber: string; accountHolder: string }[] = []
): string {
  const school = item.schoolName;
  const pic = item.picName;
  const eventDate = item.eventDate ? new Date(item.eventDate).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }) : 'Jadwal Ditentukan';
  const totalBill = formatRupiah(item.dealValue);
  const dpPaid = formatRupiah(item.paidAmount);
  const remaining = formatRupiah(item.remainingAmount);
  const repName = item.salesRep;
  const contractRef = item.contractRef || 'SPK/KONTRAK';

  const bankListText = bankAccounts && bankAccounts.length > 0 
    ? bankAccounts.map(b => `• Bank ${b.bankName}: *${b.accountNumber}* a/n ${b.accountHolder}`).join('\n')
    : `• Bank BCA: *088-349-2810* a/n Creatna Ella Yustisia\n• Bank BSI: *137-00-1928374-1* a/n CV Sawangan Farm Dairy`;

  if (tone === 'urgent') {
    return `*PEMBERITAHUAN MENDESAK: KONFIRMASI PELUNASAN KUNJUNGAN D'KANDANG*\n\n` +
      `Kepada Yth. Bapak/Ibu *${pic}*\n` +
      `Koordinator Rombongan *${school}*\n\n` +
      `Sehubungan dengan pelaksanaan kunjungan edukasi di D'Kandang Amazing Farm:\n` +
      `📅 *Hari/Tanggal:* ${eventDate}\n` +
      `👥 *Jumlah Peserta:* ${item.totalPax} Pax (${item.studentPax} Siswa)\n` +
      `📦 *Paket:* ${item.packageName}\n` +
      `📄 *No. Referensi:* ${contractRef}\n\n` +
      `*RINCIAN STATUS TAGIHAN (AR):*\n` +
      `• Total Biaya Paket: ${totalBill}\n` +
      `• Pembayaran Masuk (DP): ${dpPaid}\n` +
      `• *SISA PELUNASAN:* *${remaining}*\n\n` +
      `Mengingat jadwal kunjungan yang sudah sangat dekat/hari-H, mohon untuk segera melakukan pelunasan atau konfirmasi bukti transfer sebelum rombongan memasuki area wahana.\n\n` +
      `*Rekening Resmi PT D'Kandang Amazing Farm:*\n` +
      `${bankListText}\n\n` +
      `Mohon kirimkan struk/bukti transfer ke nomor ini. Terima kasih banyak atas kerjasamanya! 🙏\n\n` +
      `Hormat kami,\n` +
      `*${repName}* - Tim Finance & Kasir D'Kandang Farm`;
  }

  if (tone === 'formal') {
    return `*PEMBERITAHUAN RESMI: STATUS TAGIHAN KUNJUNGAN LAPANGAN*\n\n` +
      `Yth. Bapak/Ibu *${pic}*\n` +
      `Panitia Field Trip / Kunjungan *${school}*\n\n` +
      `Dengan hormat,\n` +
      `Kami dari Manajemen Keuangan & Sales PT D'Kandang Amazing Farm menyampaikan rincian jadwal pelunasan tagihan kunjungan wisata edukasi rombongan Bapak/Ibu:\n\n` +
      `• *Lembaga / Sekolah:* ${school}\n` +
      `• *Rencana Kunjungan:* ${eventDate}\n` +
      `• *Paket Kegiatan:* ${item.packageName} (${item.totalPax} Pax)\n` +
      `• *No. Dokumen / SPK:* ${contractRef}\n` +
      `• *Nilai Transaksi:* ${totalBill}\n` +
      `• *Uang Muka Diterima:* ${dpPaid}\n` +
      `• *SISA TAGIHAN:* *${remaining}*\n\n` +
      `Pelunasan dapat ditransferkan ke rekening resmi perusahaan:\n` +
      `${bankListText}\n\n` +
      `Bila pembayaran telah dilakukan, mohon kirimkan konfirmasi bukti bayar untuk penerbitan Kuitansi Pelunasan Resmi.\n\n` +
      `Salam hangat,\n` +
      `*${repName}* | D'Kandang Amazing Farm Depok`;
  }

  // Polite default tone
  return `Halo Bapak/Ibu *${pic}* dari *${school}*,\n\n` +
    `Salam hangat dari D'Kandang Amazing Farm! 😊\n\n` +
    `Kami ingin mengonfirmasi persiapan kunjungan edukasi *${item.packageName}* pada *${eventDate}* untuk ${item.totalPax} peserta.\n\n` +
    `Berdasarkan catatan administrasi kami (Ref: ${contractRef}):\n` +
    `💰 Total Biaya: ${totalBill}\n` +
    `✅ DP Masuk: ${dpPaid}\n` +
    `📌 *Sisa Pembayaran:* *${remaining}*\n\n` +
    `Pelunasan dapat dilakukan via transfer ke:\n` +
    `${bankListText}\n\n` +
    `Atau dapat juga diselesaikan di loket kasir saat kedatangan. Jika ada perubahan jumlah peserta atau pertanyaan, silakan hubungi kami. Terima kasih banyak! 🌿🐄`;
}

