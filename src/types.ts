export type Role = 
  | 'direktur_utama'
  | 'finance_manager' 
  | 'accounting_manager' 
  | 'marketing_manager' 
  | 'sales_cs' 
  | 'procurement_logistics' 
  | 'purchasing_officer' 
  | 'super_admin'
  // Compatibility aliases
  | 'sales_director'
  | 'procurement_officer'
  | 'warehouse_supervisor'
  | 'internal_auditor';

export type ModuleType = 
  | 'dashboard' 
  | 'finance' 
  | 'accounting' 
  | 'marketing' 
  | 'sales' 
  | 'sales_progress'
  | 'procurement' 
  | 'warehouse' 
  | 'reports' 
  | 'custom_reports'
  | 'security';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  avatar: string;
  status: 'active' | 'inactive';
  lastLogin: string;
  phone?: string;
  allowedModules: ModuleType[];
}

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export type RolePermissions = Record<Role, Record<ModuleType, Permission>>;

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: string;
  module: ModuleType;
  details: string;
  ipAddress: string;
  integrityHash: string;
  isEncrypted: boolean;
}

// ---------------- Finance & Accounting Types ----------------
export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string; // Encrypted in vault
  accountHolder: string;
  balance: number;
  currency: 'IDR' | 'USD';
  status: 'active' | 'frozen';
  isRestricted?: boolean; // Rekening khusus terproteksi sistem (read-only untuk semua user, mutasi otomatis 70%)
  description?: string;
}

export type IncomeSourceCategory = 
  | 'school_visit' 
  | 'dairy_product' 
  | 'ticket_gate' 
  | 'resto_fnb' 
  | 'agriculture' 
  | 'b2b_corporate' 
  | 'other';

export type PaymentStageType = 
  | 'dp' 
  | 'installment' 
  | 'settlement' 
  | 'full';

export interface RecurringBill {
  id: string;
  name: string;
  category: 'operating' | 'investing' | 'financing';
  estimatedAmount: number;
  dueDay: number;
  sourceAccount: string;
  isActive: boolean;
  notes?: string;
}

export interface CashTransaction {
  id: string;
  date: string; // Tanggal Pencatatan / Faktur
  receivedDate?: string; // Tanggal Uang Masuk / Kas Diterima Rekening
  type: 'inflow' | 'outflow' | 'mutation';
  category: 'operating' | 'investing' | 'financing';
  description: string;
  amount: number;
  sourceAccount: string;
  targetAccount?: string;
  referenceNo: string;
  status: 'completed' | 'pending' | 'reconciled';
  approvedBy?: string;
  incomeSource?: IncomeSourceCategory;
  paymentStage?: PaymentStageType;
  linkedEntityId?: string;
  linkedEntityName?: string;
  budgetId?: string;
  budgetName?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  activityCategory?: string;
  walletName?: string;
  notes?: string;
  contraAccountCode?: string;
  contraAccountName?: string;
  recordedBy?: string;
}

export interface BudgetAllocation {
  id: string;
  department: string;
  fiscalYear: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  percentageOfRevenue?: number; // Persentase dari Total Omset (misal: 20 untuk 20% dari Total Omset)
  percentageOfCompanyShare?: number; // Alias untuk kompatibilitas data
  allocatedAmount: number; // Plafon Dompet Anggaran (Rp)
  spentAmount: number; // Realisasi Kas Keluar (Debet Dompet)
  category: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface ChartOfAccount {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  balance: number;
  normalBalance: 'Debit' | 'Credit';
  isEncrypted?: boolean;
  cashFlowCategory?: 'operating' | 'investing' | 'financing';
  allowedTxTypes?: ('inflow' | 'outflow')[];
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  lines: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
  totalAmount: number;
  referenceModule?: ModuleType;
  referenceId?: string;
  createdBy: string;
  status: 'posted' | 'draft';
  isClosingEntry?: boolean;
  isReversalEntry?: boolean;
  reversedFromEntryNumber?: string;
  reversalReason?: string;
  isLocked?: boolean;
}

export interface AccountingPeriodLock {
  id: string;
  period: string; // YYYY-MM
  periodName: string;
  year: number;
  month: number;
  closedAt: string;
  closedBy: string;
  closingJournalId?: string;
  closingJournalNumber?: string;
  netIncome: number;
  status: 'locked' | 'open';
  notes?: string;
}

export interface TrialBalanceAccount {
  code: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  category: string;
  normalBalance: 'Debit' | 'Credit';
  startingDebit: number;
  startingCredit: number;
  mutationDebit: number;
  mutationCredit: number;
  endingDebit: number;
  endingCredit: number;
}

// ---------------- Marketing & Sales Types ----------------
export interface MarketingCampaign {
  id: string;
  name: string;
  channel: 'Google Ads' | 'Meta Ads' | 'Email Marketing' | 'SEO / Content' | 'Event Expo' | 'Partnership';
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'paused' | 'planning';
  leadsGenerated: number;
  conversions: number;
  targetAudience: string;
  roiPercentage: number;
}

export interface LeadFollowUp {
  id: string;
  date: string;
  user: string;
  action: 'WhatsApp' | 'Telepon' | 'Survey Lokasi' | 'Meeting Proposal' | 'Email';
  note: string;
  nextAction?: string;
  nextActionDate?: string;
  salesPerson?: string;
}

export interface LeadAdditionalItem {
  id: string;
  name: string;
  category: 'wahana' | 'fnb' | 'souvenir' | 'fasilitas' | 'lainnya';
  quantity: number;
  unitPrice: number;
  total: number;
  unitName?: string; // e.g. 'pax', 'cup', 'pcs', 'paket', 'event'
  notes?: string;
}

export interface Lead {
  id: string;
  name: string;
  picRole?: string;
  company: string;
  institutionType?: 'TK / PAUD' | 'SD' | 'SMP / SMA' | 'Perguruan Tinggi' | 'Corporate / B2B' | 'Instansi / BUMN' | 'Komunitas' | string;
  email: string;
  phone: string;
  address?: string;
  stage: 'lead' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  dealValue: number;
  invoiceNumber?: string;

  // Paket Siswa / Peserta Utama (Anak)
  packageChosen?: string;
  packageInterested?: string;
  participantCount?: number;
  participantsCount?: number;
  pricePerPax?: number;
  studentSubtotal?: number;

  // Paket Guru (DIPISAHKAN)
  teacherPackageChosen?: string;
  teacherCount?: number;
  freeTeacherQuota?: number; // Kuota guru gratis (FOC)
  paidTeacherCount?: number; // Jumlah guru yang berbayar jika kuota FOC terlampaui
  teacherPricePerPax?: number; // Harga per guru berbayar (Rp)
  teacherSubtotal?: number;

  // Paket Pendamping (Orang Tua / Wali) (DIPISAHKAN)
  companionPackageChosen?: string;
  companionCount?: number;
  companionPricePerPax?: number; // Harga per pendamping (Rp)
  companionSubtotal?: number;

  // Additional / Add-on Items
  additionalItems?: LeadAdditionalItem[];
  additionalSubtotal?: number;

  // Diskon / Potongan Harga Rombongan
  discountAmount?: number;
  discountType?: 'nominal' | 'percentage';
  discountValue?: number;
  discountNote?: string;

  eventDate?: string;
  targetEventDate?: string;
  surveyDate?: string;
  paymentStatus?: 'unpaid' | 'dp_paid' | 'paid' | 'cancelled';
  dpAmount?: number;
  specialRequests?: string;
  sourceCampaignId?: string;
  assignedTo: string;
  salesRep?: string;
  createdAt: string;
  probability: number;
  notes?: string;
  followUpHistory?: LeadFollowUp[];
}

export interface QuotationItem {
  sku: string;
  name: string;
  description?: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  leadId?: string;
  subject?: string;
  letterNumber?: string;
  recipientTitle?: string;
  customerName: string;
  companyName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  eventDate?: string;
  participantSummary?: string;
  activityPlan?: string;
  estimatedPax?: number;
  notes?: string;
  date: string;
  validUntil: string;
  items: QuotationItem[];
  subtotal: number;
  discountAmount?: number;
  tax: number;
  grandTotal: number;
  termsAndConditions?: string[];
  paymentTerms?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  closingNotes?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'accepted' | 'converted';
  preparedBy: string;
  preparedByTitle?: string;
  approvedBy?: string;
  approvedByTitle?: string;
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  quotationRef?: string;
  customerName: string;
  date: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  status: 'pending_approval' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  deliveryDate: string;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  soReference: string;
  customerName: string;
  issueDate: string;
  dueDate: string;
  visitDate?: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  discount: number;
  totalAmount: number;
  paidAmount: number;
  status: 'issued' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  bankAccount?: string;
  paymentProofs?: PaymentProof[];
  publicAccessToken?: string;
  portalNotes?: string;
}

// ---------------- Procurement Types ----------------
export interface Vendor {
  id: string;
  code: string;
  name: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  bankAccountEncrypted: string;
  rating: number; // 1 to 5
  paymentTerms: 'NET 15' | 'NET 30' | 'NET 60' | 'COD';
  status: 'active' | 'suspended' | 'blacklisted';
}

export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  requestedBy: string;
  department: string;
  requestDate: string;
  items: {
    itemName: string;
    quantity: number;
    estimatedCost: number;
    reason: string;
  }[];
  totalEstimated: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted_to_po';
  approvalNotes?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  prReference?: string;
  vendorId: string;
  vendorName: string;
  orderDate: string;
  expectedDelivery: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    total: number;
  }[];
  totalCost: number;
  status: 'draft' | 'issued' | 'goods_received' | 'completed' | 'cancelled';
  paymentTerms: string;
  threeWayMatched: boolean;
}

// ---------------- Warehouse & Inventory Types ----------------
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stockQty: number;
  minStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  warehouseLocation: string; // e.g. "Gudang Utama - Rak A-04"
  barcode: string;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  date: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  itemSku: string;
  itemName: string;
  quantity: number;
  referenceType: 'PO' | 'SO' | 'OPNAME' | 'TRANSFER';
  referenceNo: string;
  warehouse: string;
  operator: string;
  notes?: string;
}

export interface StockOpname {
  id: string;
  opnameNumber: string;
  date: string;
  warehouse: string;
  auditor: string;
  itemsAudited: number;
  discrepancyCount: number;
  totalVarianceValue: number;
  status: 'completed' | 'in_progress' | 'pending_approval';
}

// ---------------- Automated Reports Types ----------------
export interface ScheduledReport {
  id: string;
  title: string;
  module: ModuleType;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  lastGenerated: string;
  nextRun: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  status: 'active' | 'paused';
  summaryMetrics?: Record<string, string | number>;
}

// ---------------- Automated Notifications & Approval Types ----------------
export type NotificationType = 
  | 'approval_request' 
  | 'approval_status' 
  | 'inventory_alert' 
  | 'invoice_reminder' 
  | 'system_info';

export type NotificationCategory = 
  | 'quotation' 
  | 'purchase_requisition' 
  | 'cash_transaction' 
  | 'stock_opname' 
  | 'sales_order' 
  | 'inventory' 
  | 'finance' 
  | 'system';

export type NotificationUrgency = 'low' | 'medium' | 'high' | 'urgent';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  referenceId?: string;
  referenceNumber?: string; // e.g. "QTN-2026/08/001" or "PR-2026/08/001"
  module: ModuleType;
  createdAt: string;
  read: boolean;
  requiresAction?: boolean;
  actionStatus?: 'pending' | 'approved' | 'rejected' | 'completed' | 'dismissed';
  urgency?: NotificationUrgency;
  targetRoles?: Role[]; // Roles authorized/relevant to act or view
  createdBy?: string;
  creatorDepartment?: string;
  amount?: number;
  metadata?: Record<string, any>;
}

// ---------------- Company Profile & Settings Types ----------------
export interface CompanyProfile {
  id?: string;
  name: string; // "D'Kandang Amazing Farm"
  ptName: string; // "PT. WISATA AGRO EDUKASI SEJAHTERA"
  tagline: string; // "WISATA EDUKASI AGRO PERTANIAN & PETERNAKAN RAMAH KELUARGA"
  address: string; // "Jl. Penarikan RT 01 / RW 02, Kel. Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519"
  phone: string; // "(021) 7788-9000 / 0812-1111-2233"
  email: string; // "sales@dkandang.id"
  website: string; // "www.dkandang.id"
  directorName: string; // "H. Muh. Ridwan, S.Pt"
  directorTitle: string; // "Direktur Utama"
  defaultBankName: string; // "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata"
  defaultBankAccount: string; // "137-00-1928374-1"
  defaultAccountHolder: string; // "PT. WISATA AGRO EDUKASI SEJAHTERA"
  npwp?: string; // "02.891.234.5-412.000"
  logoEmoji?: string; // "🌿"
}

// Aliases for compatibility
export type ERPUserRole = Role;
export type ERPModule = ModuleType;
export type ReportSchedule = ScheduledReport;

// ---------------- School Portal & Payment Proof Types ----------------
export interface PaymentProof {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  schoolName: string;
  amount: number;
  transferDate: string;
  bankDestination: string; // 'BCA' | 'BSI' | 'MANDIRI' | string
  senderBankName?: string;
  senderAccountName?: string;
  receiptImageUrl?: string; // Data URL / file path
  notes?: string;
  uploadedAt: string;
  status: 'pending_verification' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  paymentStage?: 'dp' | 'settlement' | 'full';
}

// ---------------- Package Costing & Margin Simulator Types ----------------
export interface PackageCostItem {
  id: string;
  category: 'fnb' | 'feed_animal' | 'craft_materials' | 'guide_honor' | 'ticket_entrance' | 'overhead';
  name: string;
  unit: string;
  costPerUnit: number;
  qtyPerPax: number;
}

export interface PackageCostingSimulation {
  id: string;
  packageName: string;
  targetPax: number;
  costItems: {
    category: string;
    name: string;
    unitCost: number;
    qty: number;
    subtotal: number;
  }[];
  totalHPPPerPax: number;
  totalHPPBatch: number;
  proposedPricePerPax: number;
  grossProfitPerPax: number;
  grossProfitMarginPercent: number;
  breakEvenPax: number;
  maxRecommendedDiscount: number;
  simulatedBy: string;
  createdAt: string;
  notes?: string;
}

// ---------------- Petty Cash & Field Reimbursement Types ----------------
export interface PettyCashWallet {
  id: string;
  name: string;
  department: string;
  custodianName: string;
  ceilingAmount: number;
  currentBalance: number;
  status: 'active' | 'frozen';
  lastReimbursedAt?: string;
}

export interface PettyCashExpense {
  id: string;
  walletId: string;
  walletName: string;
  date: string;
  amount: number;
  category: 'pakan_darurat' | 'bbm_transport' | 'p3k_obat_hewan' | 'peralatan_resto' | 'kebersihan' | 'lainnya';
  spentBy: string;
  description: string;
  receiptAttachment?: string;
  claimId?: string;
  status: 'recorded' | 'claimed' | 'reimbursed';
}

export interface ReimbursementClaim {
  id: string;
  claimNumber: string;
  walletId: string;
  walletName: string;
  claimDate: string;
  totalAmount: number;
  expenseIds: string[];
  submittedBy: string;
  status: 'submitted' | 'approved_director' | 'disbursed' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  disbursedAt?: string;
  disbursedFromAccountId?: string;
  disbursedFromAccountName?: string;
  rejectionReason?: string;
}

// ---------------- Accounts Payable & Debt Management Types ----------------
export type DebtCategory = 
  | 'supplier_po'        // Hutang Pembelian Pakan / Bahan Baku (PO Pemasok)
  | 'vendor_operasional' // Hutang Vendor Listrik, Internet, Jasa Kebersihan, Renovasi
  | 'bank_loan'          // Pinjaman Modal Kerja / Investasi Perbankan
  | 'tax_payable'        // Kewajiban Pajak Badan / PPh / PPN Belum Disetor
  | 'salary_payable'     // Kewajiban Gaji & Tunjangan Karyawan
  | 'facility_lease'     // Sewa Lahan, Kandang, atau Alat Berat
  | 'other';             // Kewajiban / Hutang Lainnya

export type DebtStatus = 
  | 'unpaid'       // Belum Dibayar Sama Sekali
  | 'partial'      // Dicicil / Bayar Sebagian
  | 'paid'         // Lunas Sepenuhnya
  | 'overdue'      // Lewat Jatuh Tempo
  | 'cancelled';   // Dibatalkan / Disesuaikan

export interface DebtPaymentRecord {
  id: string;
  debtId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'cash' | 'transfer' | 'giro';
  sourceAccountId: string;
  sourceAccountName: string;
  referenceNo: string;
  receiptNumber?: string;
  notes?: string;
  paidBy: string;
  createdAt: string;
  journalEntryId?: string;
  cashTransactionId?: string;
}

export interface DebtRecord {
  id: string;
  debtNumber: string;                 // Format: HUT-YYYY-XXXXX
  creditorName: string;               // Nama Pemasok, Vendor, Kreditur, atau Bank
  creditorContact?: string;
  creditorPhone?: string;
  category: DebtCategory;
  description: string;
  invoiceNumber?: string;             // No Invoice Pemasok / Tagihan Fisik
  relatedPoId?: string;               // Link ke PO ID jika berasal dari Pembelian Bahan
  relatedPoNumber?: string;           // No PO, misal PO-2026-001
  totalAmount: number;                // Nilai Pokok Hutang Total
  paidAmount: number;                 // Total yang sudah dicicil/dibayar
  remainingAmount: number;            // Sisa pokok hutang
  issueDate: string;                  // Tanggal Mulai / Timbulnya Hutang
  dueDate: string;                    // Tanggal Jatuh Tempo Pembayaran
  status: DebtStatus;
  paymentTerms?: string;              // Misal 'NET 30', 'NET 14', 'CBD', 'Cicilan 12 Bulan'
  notes?: string;
  attachmentUrl?: string;             // Dokumen Tagihan / Nota / Kontrak
  payments: DebtPaymentRecord[];      // Riwayat transaksi pembayaran/cicilan
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------- Spreadsheet Import & Google Sheets Auto-Sync Types ----------------
export interface GoogleSheetSyncConfig {
  id: string;
  name: string;
  spreadsheetUrl: string;
  spreadsheetId: string;
  sheetName: string;
  gid?: string;
  authMode: 'public_link' | 'oauth';
  defaultType: 'auto' | 'inflow' | 'outflow';
  defaultSourceAccount: string;
  defaultIncomeSource?: IncomeSourceCategory;
  defaultBudgetId?: string;
  autoSyncEnabled: boolean;
  intervalMinutes: 1 | 5 | 15 | 30 | 60;
  lastSyncedAt?: string;
  lastSyncCount?: number;
  lastSkippedCount?: number;
  lastSyncStatus?: 'success' | 'error' | 'idle';
  lastSyncMessage?: string;
  columnMapping?: Record<string, string>;
  createdAt: string;
  createdBy: string;
}

export interface BulkImportTransactionInput extends Omit<CashTransaction, 'id' | 'status'> {
  contraAccountCode?: string;
  contraAccountName?: string;
  allowDuplicateOverride?: boolean;
}

export interface WebhookQueueItem {
  id: string;
  receivedAt: string;
  spreadsheetId?: string;
  spreadsheetName?: string;
  sheetName?: string;
  rawRow: Record<string, any>;
}

export interface BatchImportResult {
  success: boolean;
  importedCount: number;
  skippedDuplicateCount: number;
  rejectedLockedCount?: number;
  matchedLeadsCount: number;
  totalInflowAmount: number;
  totalOutflowAmount: number;
  integrityHash?: string;
  message: string;
}

