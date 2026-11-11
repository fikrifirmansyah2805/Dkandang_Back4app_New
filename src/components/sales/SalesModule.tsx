import React, { useState, useMemo } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { useERP } from '../../context/ERPContext';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate 
} from '../../utils/crypto';
import { 
  TrendingUp, 
  Plus, 
  FileText, 
  CheckCircle2, 
  Truck, 
  Receipt, 
  UserCheck, 
  ArrowRight, 
  Building2, 
  DollarSign, 
  Clock, 
  X,
  Phone,
  Mail,
  ChevronRight,
  ExternalLink,
  School,
  Calendar,
  Users,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Sparkles,
  Award,
  HelpCircle,
  LayoutGrid,
  List,
  Layers,
  Send,
  AlertTriangle,
  Trash2,
  ShieldCheck,
  Lock,
  Edit2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  SlidersHorizontal,
  Calculator
} from 'lucide-react';
import { Lead, Quotation } from '../../types';
import ProspectDetailModal from './ProspectDetailModal';
import NewProspectModal from './NewProspectModal';
import { CustomQuotationModal } from './CustomQuotationModal';
import { QuotationDetailModal } from './QuotationDetailModal';
import { CompanyProfileModal } from './CompanyProfileModal';
import { exportQuotationToWord } from '../../utils/quotationExporter';
import PackageCostingSimulator from './PackageCostingSimulator';
import SchoolPortalModal from './SchoolPortalModal';

export default function SalesModule() {
  const { 
    leads, 
    quotations, 
    salesOrders, 
    salesInvoices, 
    cashTransactions,
    companyProfile,
    updateLeadStage, 
    updateSchoolName,
    deleteLead,
    addQuotation, 
    deleteQuotation,
    convertQuotationToSO, 
    processSalesOrderDelivery, 
    markInvoicePaid,
    restoreSchoolAndSalesData,
    currentUser,
    checkPermission,
    showNotification
  } = useERP();

  const [isRestoringSchools, setIsRestoringSchools] = useState(false);

  const handleRestoreSchools = async () => {
    if (isRestoringSchools) return;
    setIsRestoringSchools(true);
    try {
      await restoreSchoolAndSalesData();
    } finally {
      setIsRestoringSchools(false);
    }
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const canManageSchools = currentUser?.role === 'super_admin' || currentUser?.role === 'direktur_utama';

  // Helper for real-time payment verification from Finance Cash Transactions
  const getLeadPaymentStatus = (lead: Lead) => {
    const inflows = (cashTransactions || []).filter(t => 
      t.type === 'inflow' && (
        (t.linkedEntityId && t.linkedEntityId === lead.id) ||
        (t.linkedEntityName && (
          t.linkedEntityName.toLowerCase() === lead.company.toLowerCase() ||
          t.linkedEntityName.toLowerCase() === lead.name.toLowerCase()
        ))
      )
    );
    const totalInflow = inflows.reduce((sum, t) => sum + (t.amount || 0), 0);
    const effectivePaid = totalInflow > 0 ? totalInflow : (lead.dpAmount || 0);
    const isPaid = lead.dealValue > 0 && effectivePaid >= lead.dealValue;
    const isDp = effectivePaid > 0 && !isPaid;

    return {
      status: isPaid ? 'paid' : isDp ? 'dp_paid' : 'unpaid',
      paidAmount: effectivePaid,
      hasRealCash: totalInflow > 0
    };
  };

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'prospects' | 'pipeline' | 'quotations' | 'orders' | 'invoices' | 'costing'>('prospects');

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showAddQuoteModal, setShowAddQuoteModal] = useState(false);
  const [showCompanyProfileModal, setShowCompanyProfileModal] = useState(false);
  const [showSchoolPortalModal, setShowSchoolPortalModal] = useState(false);
  const [portalInvoiceId, setPortalInvoiceId] = useState<string | undefined>(undefined);
  const [quoteDefaultLeadId, setQuoteDefaultLeadId] = useState<string | undefined>(undefined);
  const [selectedQuotationIdForModal, setSelectedQuotationIdForModal] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Super Admin: Rename school state
  const [leadToRename, setLeadToRename] = useState<Lead | null>(null);
  const [newSchoolNameInput, setNewSchoolNameInput] = useState('');
  const [isRenamingLead, setIsRenamingLead] = useState(false);

  const selectedLeadForDetail = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  );

  // Prospect Filters & Sort State
  const [statusFilter, setStatusFilter] = useState<'all' | 'won' | 'new_active' | 'negotiation' | 'lost'>('all');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'unpaid' | 'dp_paid' | 'paid'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Sorting
  const [sortBy, setSortBy] = useState<'created' | 'eventDate' | 'name' | 'dealValue' | 'participants' | 'stage'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [leadsPerPage, setLeadsPerPage] = useState<number>(48);

  const SORT_OPTIONS = [
    { value: 'created-desc', label: 'Terbaru Ditambahkan', sortBy: 'created', sortOrder: 'desc' },
    { value: 'created-asc', label: 'Terlama Ditambahkan', sortBy: 'created', sortOrder: 'asc' },
    { value: 'eventDate-asc', label: 'Tgl Kunjungan (Terdekat)', sortBy: 'eventDate', sortOrder: 'asc' },
    { value: 'eventDate-desc', label: 'Tgl Kunjungan (Terjauh)', sortBy: 'eventDate', sortOrder: 'desc' },
    { value: 'name-asc', label: 'Nama Sekolah (A - Z)', sortBy: 'name', sortOrder: 'asc' },
    { value: 'name-desc', label: 'Nama Sekolah (Z - A)', sortBy: 'name', sortOrder: 'desc' },
    { value: 'dealValue-desc', label: 'Nilai Deal (Tertinggi)', sortBy: 'dealValue', sortOrder: 'desc' },
    { value: 'dealValue-asc', label: 'Nilai Deal (Terendah)', sortBy: 'dealValue', sortOrder: 'asc' },
    { value: 'participants-desc', label: 'Jumlah Peserta (Terbanyak)', sortBy: 'participants', sortOrder: 'desc' },
    { value: 'participants-asc', label: 'Jumlah Peserta (Tersedikit)', sortBy: 'participants', sortOrder: 'asc' },
  ] as const;

  // Dynamic available event months from leads
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    leads.forEach(l => {
      const d = l.eventDate || l.targetEventDate;
      if (d && d.length >= 7) {
        months.add(d.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [leads]);

  const formatMonthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month} ${year}`;
  };

  const isFilterActive = statusFilter !== 'all' || 
    institutionFilter !== 'all' || 
    paymentFilter !== 'all' || 
    monthFilter !== 'all' || 
    searchQuery.trim() !== '' || 
    sortBy !== 'created' || 
    sortOrder !== 'desc';

  const handleResetFilters = () => {
    setStatusFilter('all');
    setInstitutionFilter('all');
    setPaymentFilter('all');
    setMonthFilter('all');
    setSearchQuery('');
    setSortBy('created');
    setSortOrder('desc');
    setLeadsCurrentPage(1);
  };

  const handleToggleTableSort = (field: 'created' | 'eventDate' | 'name' | 'dealValue' | 'participants' | 'stage') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'eventDate' ? 'asc' : 'desc');
    }
  };

  // Quotation Modal form state
  const [quoteCustomer, setQuoteCustomer] = useState('');
  const [quoteCompany, setQuoteCompany] = useState('');
  const [quoteValidUntil, setQuoteValidUntil] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [quoteItems, setQuoteItems] = useState([
    { sku: 'PKG-EDUKASI-01', name: 'Paket Edukasi Peternak Cilik & Pertanian Organik', quantity: 200, unitPrice: 95000, total: 19000000 },
    { sku: 'FNB-KATERING-01', name: 'Paket Makan Siang Saung Resto & Susu Segar Pasteurisasi', quantity: 200, unitPrice: 25000, total: 5000000 },
    { sku: 'SOUV-CAPING-01', name: 'Souvenir Caping Lukis Bambu Edukasi & Bibit Sayur', quantity: 200, unitPrice: 10000, total: 2000000 }
  ]);

  // Calculations for KPI
  const wonLeads = useMemo(() => leads.filter(l => l.stage === 'won'), [leads]);
  const newActiveLeads = useMemo(() => leads.filter(l => l.stage !== 'won' && l.stage !== 'lost'), [leads]);
  
  const totalPipelineVal = leads.filter(l => l.stage !== 'lost').reduce((acc, l) => acc + l.dealValue, 0);
  const totalWonVal = wonLeads.reduce((acc, l) => acc + l.dealValue, 0);
  const totalNewActiveVal = newActiveLeads.reduce((acc, l) => acc + l.dealValue, 0);
  
  const totalWonStudents = wonLeads.reduce((acc, l) => acc + (l.participantCount || 0), 0);
  const totalActiveStudents = newActiveLeads.reduce((acc, l) => acc + (l.participantCount || 0), 0);
  
  const winRate = leads.length > 0 ? Math.round((wonLeads.length / leads.length) * 100) : 0;
  const avgDealSize = wonLeads.length > 0 ? Math.round(totalWonVal / wonLeads.length) : 0;

  const totalOrdersVal = salesOrders.reduce((acc, so) => acc + so.totalAmount, 0);
  const totalInvoicesVal = salesInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    const list = leads.filter(lead => {
      // Status Filter
      if (statusFilter === 'won' && lead.stage !== 'won') return false;
      if (statusFilter === 'new_active' && (lead.stage === 'won' || lead.stage === 'lost')) return false;
      if (statusFilter === 'negotiation' && lead.stage !== 'negotiation' && lead.stage !== 'proposal') return false;
      if (statusFilter === 'lost' && lead.stage !== 'lost') return false;

      // Institution Filter
      if (institutionFilter !== 'all' && lead.institutionType !== institutionFilter) return false;

      // Payment Filter
      if (paymentFilter !== 'all') {
        const paymentInfo = getLeadPaymentStatus(lead);
        if (paymentFilter === 'paid' && paymentInfo.status !== 'paid') return false;
        if (paymentFilter === 'dp_paid' && paymentInfo.status !== 'dp_paid') return false;
        if (paymentFilter === 'unpaid' && paymentInfo.status !== 'unpaid') return false;
      }

      // Month Filter
      if (monthFilter !== 'all') {
        const d = lead.eventDate || lead.targetEventDate;
        if (!d || !d.startsWith(monthFilter)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCompany = lead.company.toLowerCase().includes(q);
        const matchName = lead.name.toLowerCase().includes(q);
        const matchNotes = (lead.notes || '').toLowerCase().includes(q);
        const matchPackage = (lead.packageChosen || '').toLowerCase().includes(q);
        const matchPhone = lead.phone.toLowerCase().includes(q);
        const matchAddress = (lead.address || '').toLowerCase().includes(q);
        if (!matchCompany && !matchName && !matchNotes && !matchPackage && !matchPhone && !matchAddress) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.company.localeCompare(b.company, 'id', { sensitivity: 'base' });
          break;
        case 'eventDate': {
          const dateA = a.eventDate || a.targetEventDate || '9999-99-99';
          const dateB = b.eventDate || b.targetEventDate || '9999-99-99';
          comparison = dateA.localeCompare(dateB);
          break;
        }
        case 'dealValue':
          comparison = (a.dealValue || 0) - (b.dealValue || 0);
          break;
        case 'participants': {
          const paxA = (a.participantCount || 0) + (a.companionCount || 0) + (a.teacherCount || 0);
          const paxB = (b.participantCount || 0) + (b.companionCount || 0) + (b.teacherCount || 0);
          comparison = paxA - paxB;
          break;
        }
        case 'stage': {
          const stageOrder: Record<Lead['stage'], number> = {
            lead: 1,
            contacted: 2,
            qualified: 3,
            proposal: 4,
            negotiation: 5,
            won: 6,
            lost: 7
          };
          comparison = (stageOrder[a.stage] || 0) - (stageOrder[b.stage] || 0);
          break;
        }
        case 'created':
        default: {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          comparison = timeA - timeB;
          break;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [leads, statusFilter, institutionFilter, paymentFilter, monthFilter, searchQuery, sortBy, sortOrder]);

  // Pagination for Leads (Daftar Calon Rombongan)
  const {
    currentData: paginatedLeads,
    currentPage: leadsCurrentPage,
    totalPages: leadsTotalPages,
    totalItems: leadsTotalItems,
    itemsPerPage: leadsItemsPerPage,
    nextPage: leadsNextPage,
    prevPage: leadsPrevPage,
    setCurrentPage: setLeadsCurrentPage
  } = usePagination(filteredLeads, leadsPerPage);

  // Pagination for Quotations
  const {
    currentData: paginatedQuotations,
    currentPage: quotationsCurrentPage,
    totalPages: quotationsTotalPages,
    totalItems: quotationsTotalItems,
    itemsPerPage: quotationsItemsPerPage,
    nextPage: quotationsNextPage,
    prevPage: quotationsPrevPage
  } = usePagination(quotations, 25);

  // Pagination for Orders
  const {
    currentData: paginatedOrders,
    currentPage: ordersCurrentPage,
    totalPages: ordersTotalPages,
    totalItems: ordersTotalItems,
    itemsPerPage: ordersItemsPerPage,
    nextPage: ordersNextPage,
    prevPage: ordersPrevPage
  } = usePagination(salesOrders, 25);

  // Pagination for Invoices
  const {
    currentData: paginatedInvoices,
    currentPage: invoicesCurrentPage,
    totalPages: invoicesTotalPages,
    totalItems: invoicesTotalItems,
    itemsPerPage: invoicesItemsPerPage,
    nextPage: invoicesNextPage,
    prevPage: invoicesPrevPage
  } = usePagination(salesInvoices, 25);

  const PIPELINE_STAGES: { id: Lead['stage']; label: string; color: string; countColor: string }[] = [
    { id: 'lead', label: 'Prospek Baru Masuk', color: 'border-slate-200 bg-slate-50/80', countColor: 'bg-slate-200 text-slate-700' },
    { id: 'contacted', label: 'Sudah Dihubungi / Survei', color: 'border-blue-200 bg-blue-50/60', countColor: 'bg-blue-100 text-blue-800' },
    { id: 'qualified', label: 'Kepastian Jumlah Peserta', color: 'border-blue-200 bg-blue-50/60', countColor: 'bg-blue-100 text-blue-800' },
    { id: 'proposal', label: 'Surat Penawaran Terkirim', color: 'border-amber-200 bg-amber-50/60', countColor: 'bg-amber-100 text-amber-800' },
    { id: 'negotiation', label: 'Negosiasi & Pembayaran DP', color: 'border-amber-200 bg-amber-50/60', countColor: 'bg-amber-100 text-amber-800' },
    { id: 'won', label: 'Pemesanan Resmi (Sepakat)', color: 'border-emerald-200 bg-emerald-50/60', countColor: 'bg-emerald-100 text-emerald-800' }
  ];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConvertingQuoteId, setIsConvertingQuoteId] = useState<string | null>(null);

  const handleConvertQuote = async (id: string) => {
    if (isConvertingQuoteId) return;
    try {
      setIsConvertingQuoteId(id);
      await convertQuotationToSO(id);
    } catch (error) {
      console.error(error);
      showNotification('Gagal mengonversi ke Sales Order', 'error');
    } finally {
      setIsConvertingQuoteId(null);
    }
  };

  const [isDeliveringSOId, setIsDeliveringSOId] = useState<string | null>(null);
  const [isPayingInvoiceId, setIsPayingInvoiceId] = useState<string | null>(null);

  const handleProcessDelivery = async (id: string) => {
    if (isDeliveringSOId) return;
    try {
      setIsDeliveringSOId(id);
      await processSalesOrderDelivery(id);
    } catch (error) {
      console.error(error);
      showNotification('Gagal memproses pengiriman', 'error');
    } finally {
      setIsDeliveringSOId(null);
    }
  };

  const handlePayInvoice = async (id: string) => {
    if (isPayingInvoiceId) return;
    try {
      setIsPayingInvoiceId(id);
      await markInvoicePaid(id);
    } catch (error) {
      console.error(error);
      showNotification('Gagal mengonfirmasi pelunasan', 'error');
    } finally {
      setIsPayingInvoiceId(null);
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteCustomer || !quoteCompany || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const subtotal = quoteItems.reduce((acc, it) => acc + it.total, 0);
      const tax = 0; // Bebas PPN Edukasi Wisata
      const grandTotal = subtotal + tax;

      await addQuotation({
        customerName: quoteCustomer,
        companyName: quoteCompany,
        date: new Date().toISOString().split('T')[0],
        validUntil: quoteValidUntil,
        items: quoteItems,
        subtotal,
        tax,
        grandTotal
      });

      setShowAddQuoteModal(false);
      setQuoteCustomer('');
      setQuoteCompany('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal membuat penawaran', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenQuoteForCompany = (companyName: string) => {
    const matched = leads.find(l => l.company.toLowerCase() === companyName.toLowerCase());
    setQuoteDefaultLeadId(matched?.id);
    setShowAddQuoteModal(true);
    if (selectedLeadForDetail) {
      setSelectedLeadId(null);
    }
  };

  const canCreate = checkPermission('sales', 'create');

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Paket Kunjungan Sekolah & Rombongan (B2B)</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar prospek sekolah, jadwal kunjungan field trip, surat penawaran harga, dan surat pesanan resmi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRestoreSchools}
            disabled={isRestoringSchools}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            title="Muat ulang dan sinkronkan 48 data sekolah resmi dari CSV Progress Sales beserta SPH, SO, dan Faktur Tagihan"
          >
            <RotateCcw className={`w-4 h-4 text-amber-700 ${isRestoringSchools ? 'animate-spin' : ''}`} />
            {isRestoringSchools ? 'Menyinkronkan Data...' : 'Sinkronkan 48 Data Sekolah Resmi'}
          </button>
          <button
            onClick={() => {
              setPortalInvoiceId(undefined);
              setShowSchoolPortalModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-emerald-700" /> Portal Klien Sekolah
          </button>
          {canCreate && (
            <>
              <button
                onClick={() => setShowAddQuoteModal(true)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <FileText className="w-4 h-4 text-blue-600" /> Buat Penawaran Harga Resmi
              </button>
              <button
                onClick={() => setShowAddLeadModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Catat Calon Rombongan Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Comparison Cards (Deals Won vs. Prospek Baru) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Deal Won / Terkonfirmasi */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Pesanan Sudah Sepakat
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              {wonLeads.length} Sekolah
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2 font-mono">{formatRupiah(totalWonVal)}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span><strong>{totalWonStudents.toLocaleString('id-ID')} Siswa</strong> Siap Hadir</span>
          </div>
        </div>

        {/* Card 2: Prospek Baru & Pipeline Berjalan */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-blue-50/30 border border-blue-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-800 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Calon Rombongan Sedang Proses
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {newActiveLeads.length} Sekolah
            </span>
          </div>
          <div className="text-2xl font-black text-slate-800 mt-2 font-mono">{formatRupiah(totalNewActiveVal)}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>Perkiraan <strong>{totalActiveStudents.toLocaleString('id-ID')} Siswa</strong></span>
          </div>
        </div>

        {/* Card 3: Konversi & Rata-rata Nilai */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Tingkat Keberhasilan Deal</span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-2">{winRate}% Berhasil</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rata-rata: <strong className="text-slate-800">{formatCompactRupiah(avgDealSize)}</strong> per Rombongan
          </div>
        </div>

        {/* Card 4: Sales Orders & Faktur Terbit */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Surat Pesanan & Tagihan</span>
            <Receipt className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-800 mt-2">{salesOrders.length} Pesanan Aktif</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Tagihan Faktur: <strong className="text-slate-800">{formatCompactRupiah(totalInvoicesVal)}</strong>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('prospects')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'prospects' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" /> Daftar Calon Rombongan ({leads.length})
        </button>
        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pipeline' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> Papan Tahapan Penawaran
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'quotations' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Surat Penawaran Harga ({quotations.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'orders' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" /> Surat Pesanan & Jadwal Kunjungan ({salesOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'invoices' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Faktur Tagihan ({salesInvoices.length})
        </button>
        <button
          onClick={() => setActiveTab('costing')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'costing' ? 'border-emerald-600 text-emerald-800 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calculator className="w-4 h-4" /> Kalkulator HPP Paket
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RINCIAN PROSPEK SEKOLAH & INSTANSI (MAIN HUB)                       */}
      {/* ========================================================================= */}
      {activeTab === 'prospects' && (
        <div className="space-y-4">
          
          {/* Simple & Clean Sort & Filter Bar */}
          <div className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-sm">
            
            {/* Row 1: Search Box + Sort Selector + View Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              {/* Search Box with instant Clear */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama sekolah, PIC, alamat, paket, atau nomor HP/WA..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title="Hapus kata kunci pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector Dropdown */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs shrink-0">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="text-[11px] font-medium text-slate-400 shrink-0 hidden md:inline">Urutan:</span>
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const opt = SORT_OPTIONS.find(o => o.value === e.target.value);
                    if (opt) {
                      setSortBy(opt.sortBy as any);
                      setSortOrder(opt.sortOrder as any);
                    }
                  }}
                  className="bg-transparent border-0 text-xs font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer pr-1"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Tampilan Grid Kartu"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Tampilan Tabel Matriks"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Row 2: Status Pipeline Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                Semua ({leads.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('won')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'won' ? 'bg-emerald-700 text-white' : 'bg-slate-50 text-emerald-700 hover:text-emerald-800 border border-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Deal Won ({wonLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('new_active')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                  statusFilter === 'new_active' ? 'bg-blue-700 text-white' : 'bg-slate-50 text-blue-700 hover:text-blue-800 border border-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> Prospek Baru & Aktif ({newActiveLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('negotiation')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'negotiation' ? 'bg-amber-700 text-white' : 'bg-slate-50 text-amber-700 hover:text-amber-800 border border-slate-200'
                }`}
              >
                Negosiasi & Proposal
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('lost')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === 'lost' ? 'bg-rose-700 text-white' : 'bg-slate-50 text-rose-700 hover:text-rose-800 border border-slate-200'
                }`}
              >
                Batal / Lost
              </button>
            </div>

            {/* Row 3: Secondary Clean Dropdown Filters & Counter */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Jenjang Dropdown */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
                  <span className="text-[11px] text-slate-400 font-medium">Jenjang:</span>
                  <select
                    value={institutionFilter}
                    onChange={(e) => setInstitutionFilter(e.target.value)}
                    className="bg-transparent border-0 text-[11px] font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Jenjang</option>
                    <option value="TK / PAUD">TK / PAUD</option>
                    <option value="SD">SD</option>
                    <option value="SMP / SMA">SMP / SMA</option>
                    <option value="Corporate / B2B">Corporate / B2B</option>
                    <option value="Komunitas">Komunitas</option>
                  </select>
                </div>

                {/* Status Pembayaran Dropdown */}
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
                  <span className="text-[11px] text-slate-400 font-medium">Bayar:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="bg-transparent border-0 text-[11px] font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Status Bayar</option>
                    <option value="paid">Lunas</option>
                    <option value="dp_paid">Sudah DP</option>
                    <option value="unpaid">Belum Bayar</option>
                  </select>
                </div>

                {/* Jadwal Bulan Dropdown */}
                {availableMonths.length > 0 && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700">
                    <span className="text-[11px] text-slate-400 font-medium">Jadwal:</span>
                    <select
                      value={monthFilter}
                      onChange={(e) => setMonthFilter(e.target.value)}
                      className="bg-transparent border-0 text-[11px] font-semibold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer"
                    >
                      <option value="all">Semua Jadwal Kunjungan</option>
                      {availableMonths.map(m => (
                        <option key={m} value={m}>{formatMonthLabel(m)}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Reset Filters button */}
                {isFilterActive && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    title="Kembalikan semua filter dan urutan ke pengaturan awal"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filter
                  </button>
                )}
              </div>

              {/* Counter Text & Per Page Selector */}
              <div className="text-[11px] text-slate-500 font-medium ml-auto flex items-center gap-2.5">
                <span>
                  Menampilkan <strong className="text-slate-800 font-bold">{filteredLeads.length === 0 ? 0 : (leadsCurrentPage - 1) * leadsItemsPerPage + 1} - {Math.min(leadsCurrentPage * leadsItemsPerPage, filteredLeads.length)}</strong> dari <strong className="text-slate-800 font-bold">{filteredLeads.length}</strong> rombongan {filteredLeads.length !== leads.length && `(total ${leads.length})`}
                </span>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700">
                  <span className="text-[10px] text-slate-400 font-medium">Per hal:</span>
                  <select
                    value={leadsPerPage}
                    onChange={(e) => {
                      setLeadsPerPage(Number(e.target.value));
                      setLeadsCurrentPage(1);
                    }}
                    className="bg-transparent border-0 text-[10px] font-bold text-slate-800 focus:ring-0 focus:outline-none cursor-pointer"
                  >
                    <option value={12}>12</option>
                    <option value={24}>24</option>
                    <option value={48}>48</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Results Display */}
          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-sm">
                <School className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">
                  {leads.length === 0 ? 'Data Prospek Sales Bersih (0 Calon Rombongan)' : 'Tidak ada data prospek yang cocok'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {leads.length === 0 
                    ? 'Seluruh data pipeline sales telah dikosongkan. Anda dapat mulai mencatat calon rombongan sekolah dan membuat penawaran harga riil dari awal.'
                    : 'Coba sesuaikan kata kunci pencarian atau ganti filter status di atas untuk melihat data prospek lainnya.'}
                </p>
              </div>
              {leads.length === 0 && (
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreSchools}
                    disabled={isRestoringSchools}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw className={`w-4 h-4 ${isRestoringSchools ? 'animate-spin' : ''}`} />
                    {isRestoringSchools ? 'Menyinkronkan 48 Sekolah...' : 'Muat 48 Data Sekolah Resmi (CSV)'}
                  </button>
                  {canCreate && (
                    <>
                      <button
                        onClick={() => setShowAddLeadModal(true)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                      >
                        <Plus className="w-4 h-4" /> Catat Calon Rombongan Pertama
                      </button>
                      <button
                        onClick={() => setShowAddQuoteModal(true)}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <FileText className="w-4 h-4 text-blue-600" /> Buat Penawaran
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedLeads.map((lead) => {
                const isWon = lead.stage === 'won';
                return (
                  <div
                    key={lead.id}
                    className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group hover:shadow-md ${
                      isWon
                        ? 'bg-white border-emerald-200 hover:border-emerald-400'
                        : 'bg-white border-slate-200/80 hover:border-blue-400'
                    }`}
                  >
                    {/* Top status header */}
                    <div className={`p-4 border-b ${
                      isWon ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/80 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {lead.institutionType || 'Sekolah'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isWon ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          lead.stage === 'negotiation' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          lead.stage === 'proposal' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {isWon ? 'DEAL WON' : lead.stage.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 mt-2">
                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-emerald-700 transition-colors flex-1" title={lead.company}>
                          {lead.company}
                        </h3>
                        {canManageSchools && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLeadToRename(lead);
                              setNewSchoolNameInput(lead.company);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-amber-700 hover:bg-amber-100/70 transition-colors shrink-0"
                            title="Ubah Nama Sekolah (Super Admin & Direktur)"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          <span>PIC: <strong className="text-slate-700">{lead.name}</strong></span>
                          <span>•</span>
                          <span className="font-mono text-emerald-700 font-semibold">{lead.phone}</span>
                        </p>
                        {lead.salesRep && (
                          <p className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span className="text-slate-400">Sales:</span> <strong className="text-slate-700">{lead.salesRep}</strong>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle Content */}
                    <div className="p-4 space-y-3 text-xs flex-1">
                      
                      {/* Package name & Multi-tier breakdown badges */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-semibold">Paket Kunjungan:</span>
                          {lead.pricePerPax && (
                            <span className="text-[10px] text-emerald-700 font-mono font-semibold">
                              @Rp {lead.pricePerPax.toLocaleString('id-ID')}/siswa
                            </span>
                          )}
                        </div>
                        <span className="font-semibold text-slate-800 line-clamp-1 block">
                          {lead.packageChosen || 'Paket Edukasi Peternak Cilik & Agro Farm'}
                        </span>
                      </div>

                      {/* Multi-tier Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">Siswa (Utama):</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Users className="w-3 h-3 text-emerald-600" /> {lead.participantCount || 0} Siswa
                          </span>
                        </div>
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-500 block">Guru & Pendamping:</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Users className="w-3 h-3 text-blue-600" /> 
                            {lead.companionCount || 0} Pax 
                            {lead.freeTeacherQuota ? <span className="text-[9px] text-amber-700">({lead.freeTeacherQuota} FOC)</span> : ''}
                          </span>
                        </div>
                      </div>

                      {/* Additional items pill */}
                      {lead.additionalItems && lead.additionalItems.length > 0 && (
                        <div className="p-1.5 px-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between text-[10px]">
                          <span className="text-amber-800 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-600" /> {lead.additionalItems.length} Additional Item
                          </span>
                          <span className="text-slate-600 font-mono">
                            {formatCompactRupiah(lead.additionalSubtotal || lead.additionalItems.reduce((a, b) => a + b.total, 0))}
                          </span>
                        </div>
                      )}

                      {/* Date Pill */}
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-[10px] text-slate-500">Tgl Kunjungan:</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" /> 
                          {lead.eventDate ? formatDate(lead.eventDate) : 'Belum Dijadwalkan'}
                        </span>
                      </div>

                      {/* Deal Value */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Total Kesepakatan (Deal):</span>
                          <strong className="text-sm font-bold text-emerald-700 font-mono">
                            {formatRupiah(lead.dealValue)}
                          </strong>
                        </div>
                        {(() => {
                          const payInfo = getLeadPaymentStatus(lead);
                          return (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Status Kas / Bayar:</span>
                              <span className={`text-[10px] font-bold uppercase ${
                                payInfo.status === 'paid' ? 'text-emerald-700' :
                                payInfo.status === 'dp_paid' ? 'text-blue-700' :
                                'text-amber-700'
                              }`}>
                                {payInfo.status === 'paid' ? 'LUNAS (100%)' :
                                 payInfo.status === 'dp_paid' ? `DP (Rp ${payInfo.paidAmount.toLocaleString('id-ID')})` :
                                 'BELUM BAYAR'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white hover:bg-emerald-600 text-slate-600 hover:text-white border border-slate-200 transition-colors shadow-sm"
                        title="Chat WhatsApp PIC"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-emerald-700 text-slate-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" /> Rincian Lengkap & Survey
                      </button>

                      {canManageSchools && (
                        <button
                          onClick={() => setLeadToDelete(lead)}
                          className="p-2 rounded-xl bg-white hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-200 hover:border-rose-600 transition-colors shadow-sm"
                          title="Hapus Data Sekolah (Super Admin & Direktur)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
              </div>

              {/* Grid View Pagination */}
              <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
                <Pagination
                  currentPage={leadsCurrentPage}
                  totalPages={leadsTotalPages}
                  totalItems={leadsTotalItems}
                  itemsPerPage={leadsItemsPerPage}
                  onNext={leadsNextPage}
                  onPrev={leadsPrevPage}
                />
              </div>
            </div>
          ) : (
            /* Table View */
            <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th 
                        onClick={() => handleToggleTableSort('name')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        title="Klik untuk urutkan berdasarkan Nama Sekolah"
                      >
                        <div className="flex items-center gap-1">
                          <span>Nama Sekolah / Lembaga</span>
                          {sortBy === 'name' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" /> : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th className="p-3.5">Jenjang</th>
                      <th className="p-3.5">Kontak PIC</th>
                      <th className="p-3.5">Paket Field Trip</th>
                      <th 
                        onClick={() => handleToggleTableSort('participants')}
                        className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        title="Klik untuk urutkan berdasarkan Jumlah Siswa & Peserta"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Siswa & Guru</span>
                          {sortBy === 'participants' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" /> : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th className="p-3.5 text-center">Add-ons</th>
                      <th 
                        onClick={() => handleToggleTableSort('eventDate')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        title="Klik untuk urutkan berdasarkan Tanggal Kunjungan"
                      >
                        <div className="flex items-center gap-1">
                          <span>Tgl Kunjungan</span>
                          {sortBy === 'eventDate' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" /> : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleToggleTableSort('dealValue')}
                        className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        title="Klik untuk urutkan berdasarkan Nilai Deal"
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Nilai Deal</span>
                          {sortBy === 'dealValue' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" /> : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleToggleTableSort('stage')}
                        className="p-3.5 text-center cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                        title="Klik untuk urutkan berdasarkan Status Pipeline"
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Status</span>
                          {sortBy === 'stage' ? (
                            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600 font-bold" /> : <ArrowDown className="w-3 h-3 text-emerald-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedLeads.map((lead) => {
                      const isWon = lead.stage === 'won';
                      return (
                        <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-semibold text-slate-800">
                            <div className="flex items-center gap-2">
                              {isWon ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              ) : (
                                <School className="w-4 h-4 text-blue-600 shrink-0" />
                              )}
                              <span>{lead.company}</span>
                              {canManageSchools && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setLeadToRename(lead);
                                    setNewSchoolNameInput(lead.company);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-amber-700 hover:bg-amber-100/70 transition-colors"
                                  title="Ubah Nama Sekolah (Super Admin & Direktur)"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 block ml-6">{lead.address || 'Depok'}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                              {lead.institutionType || 'SD'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-medium text-slate-800">{lead.name}</div>
                            <div className="text-[11px] text-emerald-700 font-mono">{lead.phone}</div>
                          </td>
                          <td className="p-3.5 max-w-[180px] truncate text-slate-600">
                            {lead.packageChosen || 'Paket Edukasi Peternak Cilik'}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="font-bold text-slate-800 font-mono block text-xs">{lead.participantCount || 0} Siswa</span>
                            <span className="text-[10px] text-blue-700 block font-mono">+{lead.companionCount || 0} Guru ({lead.freeTeacherQuota || 0} FOC)</span>
                          </td>
                          <td className="p-3.5 text-center">
                            {lead.additionalItems && lead.additionalItems.length > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                {lead.additionalItems.length} Item
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-700 font-medium whitespace-nowrap">
                            {lead.eventDate ? formatDate(lead.eventDate) : '-'}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(lead.dealValue)}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isWon ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                                lead.stage === 'negotiation' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                lead.stage === 'proposal' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {isWon ? 'DEAL WON' : lead.stage}
                              </span>
                              {(() => {
                                const payInfo = getLeadPaymentStatus(lead);
                                return (
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                    payInfo.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    payInfo.status === 'dp_paid' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {payInfo.status === 'paid' ? 'LUNAS' :
                                     payInfo.status === 'dp_paid' ? `DP Rp ${payInfo.paidAmount.toLocaleString('id-ID')}` :
                                     'BELUM BAYAR'}
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => setSelectedLeadId(lead.id)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-700 text-slate-700 hover:text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 border border-slate-200 shadow-sm"
                              >
                                <Eye className="w-3.5 h-3.5" /> Buka Rincian
                              </button>

                              {canManageSchools && (
                                <button
                                  onClick={() => setLeadToDelete(lead)}
                                  className="p-1 rounded-lg bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 transition-all shadow-sm"
                                  title="Hapus Data Sekolah (Super Admin & Direktur)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table View Pagination */}
              <Pagination
                currentPage={leadsCurrentPage}
                totalPages={leadsTotalPages}
                totalItems={leadsTotalItems}
                itemsPerPage={leadsItemsPerPage}
                onNext={leadsNextPage}
                onPrev={leadsPrevPage}
              />
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KANBAN PIPELINE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 min-h-[500px] overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter(l => l.stage === stage.id);
            const stageTotal = stageLeads.reduce((acc, l) => acc + l.dealValue, 0);

            return (
              <div
                key={stage.id}
                className={`p-3 rounded-2xl border ${stage.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-bold text-xs text-slate-800 truncate">{stage.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stage.countColor}`}>
                      {stageLeads.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">
                    {formatCompactRupiah(stageTotal)}
                  </div>

                  <div className="space-y-2 mt-3">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => setSelectedLeadId(lead.id)}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-500 shadow-sm space-y-1.5 transition-all text-xs cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {lead.institutionType || 'Sekolah'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-700 font-mono">
                            {formatCompactRupiah(lead.dealValue)}
                          </span>
                        </div>

                        <div className="font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                          {lead.company}
                        </div>
                        <div className="text-[11px] text-slate-500">{lead.name} ({lead.participantCount || 0} Siswa)</div>

                        {lead.eventDate && (
                          <div className="text-[10px] text-blue-700 flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" /> {formatDate(lead.eventDate)}
                          </div>
                        )}

                        {/* Stage mover quick buttons */}
                        <div 
                          className="pt-1 flex items-center justify-between text-[10px] border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-slate-500">Pindah:</span>
                          <select
                            value={lead.stage}
                            onChange={(e) => updateLeadStage(lead.id, e.target.value as any)}
                            className="bg-slate-50 text-emerald-800 font-semibold px-1 py-0.5 rounded text-[10px] border border-slate-200"
                          >
                            <option value="lead">Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="proposal">Proposal</option>
                            <option value="negotiation">Negotiation</option>
                            <option value="won">Won</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: QUOTATIONS                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'quotations' && (
        <div className="space-y-4">
          
          {/* TOP STATS & ACTIONS BAR */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Daftar Surat Penawaran Harga Resmi</h3>
                <p className="text-xs text-slate-500">
                  Total: <strong>{quotations.length} Dokumen</strong> • Wajib Approval Direksi sebelum diekspor ke Word/Docs atau dikirim ke klien.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCompanyProfileModal(true)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                title="Sesuaikan Data Badan Hukum PT, KOP Resmi, Alamat & Rekening Bank"
              >
                <Building2 className="w-4 h-4 text-emerald-700" /> Profil KOP & Bank
              </button>

              {canCreate && (
                <button
                  onClick={() => {
                    setQuoteDefaultLeadId(undefined);
                    setShowAddQuoteModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Kustomisasi & Buat Surat Penawaran Baru
                </button>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            {quotations.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800">Belum Ada Surat Penawaran Harga</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Surat penawaran resmi yang diterbitkan untuk calon rombongan sekolah akan muncul di sini.
                </p>
                {canCreate && (
                  <button
                    onClick={() => {
                      setQuoteDefaultLeadId(undefined);
                      setShowAddQuoteModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Plus className="w-4 h-4" /> Buat Penawaran Harga Baru
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">No. Penawaran</th>
                      <th className="p-3.5">Klien / Sekolah</th>
                      <th className="p-3.5">Tanggal Terbit</th>
                      <th className="p-3.5">Berlaku Sampai</th>
                      <th className="p-3.5 text-right">Grand Total (Inc. PPN)</th>
                      <th className="p-3.5 text-center">Status Approval Direksi</th>
                      <th className="p-3.5 text-center">Aksi Dokumen & Otorisasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedQuotations.map((q) => {
                      const isApproved = q.status === 'approved' || q.status === 'sent' || q.status === 'converted';
                      const isPending = q.status === 'pending_approval' || q.status === 'draft';
                      const isRejected = q.status === 'rejected';
                      const canDelete = currentUser.role === 'direktur_utama' || 
                                        currentUser.role === 'super_admin' || 
                                        currentUser.role === 'sales_director';

                      return (
                        <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-blue-700">
                            <button
                              onClick={() => setSelectedQuotationIdForModal(q.id)}
                              className="hover:underline flex items-center gap-1 text-left"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{q.quotationNumber}</span>
                            </button>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{q.companyName}</div>
                            <div className="text-[11px] text-slate-500">PIC: {q.customerName}</div>
                          </td>
                          <td className="p-3.5 text-slate-600">{formatDate(q.date)}</td>
                          <td className="p-3.5 text-slate-600">{formatDate(q.validUntil)}</td>
                          <td className="p-3.5 text-right font-mono font-bold text-emerald-800">
                            {formatRupiah(q.grandTotal)}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              q.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                              q.status === 'sent' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              q.status === 'converted' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              q.status === 'rejected' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                              'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {isPending && <Clock className="w-3 h-3" />}
                              {isApproved && <CheckCircle2 className="w-3 h-3" />}
                              {isRejected && <AlertTriangle className="w-3 h-3" />}
                              <span>
                                {q.status === 'pending_approval' ? 'Menunggu Approval' :
                                 q.status === 'approved' ? 'Approved Direksi' :
                                 q.status === 'rejected' ? 'Ditolak / Revisi' :
                                 q.status === 'sent' ? 'Terkirim ke Klien' :
                                 q.status === 'converted' ? 'Telah Jadi SO' : q.status}
                              </span>
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => setSelectedQuotationIdForModal(q.id)}
                                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                                title="Buka Pratinjau Surat Resmi Kop D'Kandang & Form Approval"
                              >
                                <Eye className="w-3.5 h-3.5" /> Buka Surat
                              </button>

                              {isApproved && (
                                <button
                                  onClick={() => exportQuotationToWord(q, companyProfile)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-all"
                                  title="Unduh Dokumen Word (.docx)"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isApproved && q.status !== 'converted' && (
                                <button
                                  onClick={() => handleConvertQuote(q.id)}
                                  disabled={isConvertingQuoteId === q.id}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                                  title="Konversi ke Sales Order & Faktur"
                                >
                                  {isConvertingQuoteId === q.id ? (
                                    <>Memproses...</>
                                  ) : (
                                    <><CheckCircle2 className="w-3.5 h-3.5" /> Jadi SO</>
                                  )}
                                </button>
                              )}

                              {canDelete && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Hapus surat penawaran ${q.quotationNumber} (${q.companyName}) secara permanen?`)) {
                                      deleteQuotation(q.id);
                                    }
                                  }}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-all"
                                  title="Hapus Surat Penawaran (Khusus Direksi & Super Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <Pagination
              currentPage={quotationsCurrentPage}
              totalPages={quotationsTotalPages}
              totalItems={quotationsTotalItems}
              itemsPerPage={quotationsItemsPerPage}
              onNext={quotationsNextPage}
              onPrev={quotationsPrevPage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SALES ORDERS                                                       */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {salesOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Truck className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Surat Pesanan (Sales Order)</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Setelah penawaran harga disetujui atau dikonversi, surat pesanan dan jadwal pelaksanaan rombongan akan tercatat di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">No. Sales Order</th>
                    <th className="p-3.5">Ref. Penawaran</th>
                    <th className="p-3.5">Nama Klien</th>
                    <th className="p-3.5">Tgl Pesanan</th>
                    <th className="p-3.5">Tgl Pelaksanaan Kunjungan</th>
                    <th className="p-3.5 text-right">Total Nilai</th>
                    <th className="p-3.5 text-center">Status Pengiriman</th>
                    <th className="p-3.5 text-center">Status Bayar</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{so.soNumber}</td>
                      <td className="p-3.5 font-mono text-slate-500">{so.quotationRef || '-'}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{so.customerName}</td>
                      <td className="p-3.5 text-slate-600">{formatDate(so.date)}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{formatDate(so.deliveryDate)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">{formatRupiah(so.totalAmount)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          so.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          so.status === 'shipped' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {so.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          so.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {so.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {so.status === 'processing' && (
                          <button
                            onClick={() => handleProcessDelivery(so.id)}
                            disabled={isDeliveringSOId === so.id}
                            className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto shadow-sm transition-all"
                          >
                            {isDeliveringSOId === so.id ? 'Memproses...' : <><Truck className="w-3.5 h-3.5" /> Konfirmasi Pelaksanaan</>}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <Pagination
            currentPage={ordersCurrentPage}
            totalPages={ordersTotalPages}
            totalItems={ordersTotalItems}
            itemsPerPage={ordersItemsPerPage}
            onNext={ordersNextPage}
            onPrev={ordersPrevPage}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INVOICES                                                           */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          {salesInvoices.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Belum Ada Faktur Tagihan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Faktur tagihan kunjungan rombongan yang diterbitkan akan ditampilkan dan dipantau pembayarannya di sini.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">No. Faktur</th>
                    <th className="p-3.5">Ref. Sales Order</th>
                    <th className="p-3.5">Klien / Sekolah</th>
                    <th className="p-3.5">Tgl Terbit</th>
                    <th className="p-3.5">Jatuh Tempo</th>
                    <th className="p-3.5 text-right">Total Tagihan</th>
                    <th className="p-3.5 text-center">Status Piutang</th>
                    <th className="p-3.5 text-center">Aksi Pelunasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-mono text-slate-500">{inv.soReference}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{inv.customerName}</td>
                      <td className="p-3.5 text-slate-600">{formatDate(inv.issueDate)}</td>
                      <td className="p-3.5 text-slate-600">{formatDate(inv.dueDate)}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">{formatRupiah(inv.totalAmount)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          inv.status === 'issued' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {inv.status !== 'paid' ? (
                            checkPermission('finance', 'create') ? (
                              <button
                                onClick={() => handlePayInvoice(inv.id)}
                                disabled={isPayingInvoiceId === inv.id}
                                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                              >
                                {isPayingInvoiceId === inv.id ? 'Memproses...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi Lunas (Masuk Kas)</>}
                              </button>
                            ) : (
                              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Menunggu Kas Masuk (Finance)
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Lunas di Kas/Bank
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setPortalInvoiceId(inv.id);
                              setShowSchoolPortalModal(true);
                            }}
                            title="Buka Portal Klien Sekolah & Upload Bukti"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={invoicesCurrentPage}
            totalPages={invoicesTotalPages}
            totalItems={invoicesTotalItems}
            itemsPerPage={invoicesItemsPerPage}
            onNext={invoicesNextPage}
            onPrev={invoicesPrevPage}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: KALKULATOR & SIMULASI HPP PAKET WISATA                             */}
      {/* ========================================================================= */}
      {activeTab === 'costing' && (
        <PackageCostingSimulator
          onApplyToQuotation={(quotationId) => {
            setSelectedQuotationIdForModal(quotationId);
            setActiveTab('quotations');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* Modal: Portal Klien Sekolah & Pembayaran */}
      {showSchoolPortalModal && (
        <SchoolPortalModal
          initialInvoiceId={portalInvoiceId}
          onClose={() => {
            setShowSchoolPortalModal(false);
            setPortalInvoiceId(undefined);
          }}
        />
      )}

      {/* Modal 1: Rincian Lengkap Prospek Sekolah (Prospect Detail Drawer) */}
      {selectedLeadForDetail && (
        <ProspectDetailModal
          lead={selectedLeadForDetail}
          onClose={() => setSelectedLeadId(null)}
          onSelectQuotation={handleOpenQuoteForCompany}
        />
      )}

      {/* Modal 2: Tambah Prospek Baru */}
      {showAddLeadModal && (
        <NewProspectModal onClose={() => setShowAddLeadModal(false)} />
      )}

      {/* Modal 3: Kustomisasi & Buat Surat Penawaran Resmi */}
      {showAddQuoteModal && (
        <CustomQuotationModal
          defaultLeadId={quoteDefaultLeadId}
          onClose={() => {
            setShowAddQuoteModal(false);
            setQuoteDefaultLeadId(undefined);
          }}
          onSaved={(newQuote) => {
            setSelectedQuotationIdForModal(newQuote.id);
          }}
        />
      )}

      {/* Modal 4: Pratinjau Surat Penawaran Resmi, Approval Direksi & Ekspor Word/Docs */}
      {selectedQuotationIdForModal && (
        <QuotationDetailModal
          quotationId={selectedQuotationIdForModal}
          onClose={() => setSelectedQuotationIdForModal(null)}
        />
      )}

      {/* Modal 5: Pengaturan KOP Surat Resmi & Rekening Bank Perusahaan */}
      {showCompanyProfileModal && (
        <CompanyProfileModal
          onClose={() => setShowCompanyProfileModal(false)}
        />
      )}

      {/* Modal 6: Konfirmasi Hapus Data Sekolah (Khusus Super Admin) */}
      {leadToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Hapus Data Sekolah & Rombongan</h3>
                <p className="text-xs text-rose-600 font-semibold">Otoritas Super Admin & Direktur</p>
              </div>
            </div>
            
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs space-y-1.5">
              <p className="text-slate-700 font-medium">Apakah Anda yakin ingin menghapus data rombongan sekolah berikut?</p>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <School className="w-4 h-4 text-emerald-700" /> {leadToDelete.company}
              </div>
              <div className="text-slate-600 flex items-center gap-2 pt-1 border-t border-rose-100/60">
                <span>PIC: <strong>{leadToDelete.name}</strong></span>
                <span>•</span>
                <span>Nilai Deal: <strong className="text-emerald-700 font-mono">{formatRupiah(leadToDelete.dealValue)}</strong></span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Tindakan ini akan menghapus data sekolah secara permanen dari basis data cloud Firestore dan sistem ERP D'Kandang Farm.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingLead}
                onClick={() => setLeadToDelete(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                type="button"
                disabled={isDeletingLead}
                onClick={async () => {
                  setIsDeletingLead(true);
                  const res = await deleteLead(leadToDelete.id);
                  setIsDeletingLead(false);
                  if (res.success) {
                    setLeadToDelete(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeletingLead ? (
                  <>Menghapus...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Permanen</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Quick Rename School Modal */}
      {leadToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-300">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Ubah Nama Sekolah / Lembaga</h3>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                    Otoritas Super Admin & Direktur
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setLeadToRename(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newSchoolNameInput.trim()) return;
                setIsRenamingLead(true);
                const res = await updateSchoolName(leadToRename.id, newSchoolNameInput.trim());
                setIsRenamingLead(false);
                if (res.success) {
                  setLeadToRename(null);
                  setNewSchoolNameInput('');
                }
              }}
              className="space-y-3.5"
            >
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <span className="text-[10px] text-slate-500 block">Nama Sekolah Saat Ini:</span>
                <span className="font-semibold text-slate-800 line-through text-slate-500 block">
                  {leadToRename.company}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Nama Sekolah / Lembaga Baru:
                </label>
                <input
                  type="text"
                  required
                  value={newSchoolNameInput}
                  onChange={(e) => setNewSchoolNameInput(e.target.value)}
                  placeholder="Contoh: SD Islam Al-Azhar 46 Grand Depok City"
                  className="w-full p-2.5 bg-white border-2 border-amber-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs font-bold text-slate-900 shadow-xs"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * Perubahan nama sekolah akan otomatis disinkronkan ke Surat Penawaran (QTN) dan Sales Order terkait.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isRenamingLead}
                  onClick={() => setLeadToRename(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Batalkan
                </button>
                <button
                  type="submit"
                  disabled={isRenamingLead || !newSchoolNameInput.trim() || newSchoolNameInput.trim() === leadToRename.company}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isRenamingLead ? (
                    <>Menyimpan...</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5" /> Simpan Nama Baru</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
