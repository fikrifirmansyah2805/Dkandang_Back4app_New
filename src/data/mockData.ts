import { 
  User, 
  BankAccount, 
  CashTransaction, 
  BudgetAllocation, 
  ChartOfAccount, 
  JournalEntry, 
  MarketingCampaign, 
  Lead, 
  Quotation, 
  SalesOrder, 
  SalesInvoice, 
  Vendor, 
  PurchaseRequisition, 
  PurchaseOrder, 
  InventoryItem, 
  StockMovement, 
  StockOpname, 
  ScheduledReport, 
  AuditLog,
  CompanyProfile,
  AppNotification,
  RecurringBill,
  PaymentProof,
  PettyCashWallet,
  PettyCashExpense,
  ReimbursementClaim,
  PackageCostingSimulation,
  DebtRecord
} from '../types';

// ---------------- 1. PENGGUNA SISTEM (USERS) ----------------
export const INITIAL_USERS: User[] = [
  {
    id: 'usr_001',
    username: 'Creatna_direksidk',
    password: 'direksi123789',
    name: 'Direktur Utama / Pimpinan',
    email: 'direksi@dkandangfarm.co.id',
    role: 'direktur_utama',
    department: 'Direksi Agrowisata & Manajemen Utama',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T08:30:00Z',
    phone: '+62 811-2345-6789',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports', 'security']
  },
  {
    id: 'usr_002',
    username: 'financedk_2026',
    password: 'finance123789',
    name: 'Staff Keuangan & Kasir',
    email: 'finance@dkandangfarm.co.id',
    role: 'finance_manager',
    department: 'Keuangan, Kasir & Tiketing',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T09:12:00Z',
    phone: '+62 812-3456-7890',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_003',
    username: 'accountingdk_2026',
    password: 'accounting123789',
    name: 'Staff Akuntansi & Pembukuan',
    email: 'accounting@dkandangfarm.co.id',
    role: 'accounting_manager',
    department: 'Akuntansi, Pajak & Buku Besar',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T08:45:00Z',
    phone: '+62 813-9876-5432',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_004',
    username: 'marketingdk_2026',
    password: 'omset1milyar/bulan',
    name: 'Staff Pemasaran & Promosi',
    email: 'marketing@dkandangfarm.co.id',
    role: 'marketing_manager',
    department: 'Pemasaran, Iklan & Promosi Wisata',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T08:15:00Z',
    phone: '+62 818-4455-6677',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_005',
    username: 'salescsdk_2026',
    password: 'omset12milyar/tahun',
    name: 'Staff Sales & CS Rombongan',
    email: 'sales@dkandangfarm.co.id',
    role: 'sales_cs',
    department: 'Penjualan, CS & Field Trip Edukasi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T09:30:00Z',
    phone: '+62 815-1122-3344',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_006',
    username: 'forecastdk_2026',
    password: 'hpp25persen',
    name: 'Staff Procurement & Logistics',
    email: 'logistics@dkandangfarm.co.id',
    role: 'procurement_logistics',
    department: 'Pengadaan Fisik, Perencanaan & Multi-Gudang',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T07:50:00Z',
    phone: '+62 819-7788-9900',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_007',
    username: 'kebutuhannya_banyak',
    password: 'belanjanyaharusdikit',
    name: 'Staff Purchasing',
    email: 'purchasing@dkandangfarm.co.id',
    role: 'purchasing_officer',
    department: 'Purchasing & Pembelian Vendor',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T08:05:00Z',
    phone: '+62 817-6655-4433',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'procurement', 'warehouse', 'reports']
  },
  {
    id: 'usr_008',
    username: 'superadmin_2026',
    password: 'superbanget123789',
    name: 'Super Admin Sistem ERP',
    email: 'superadmin@dkandangfarm.co.id',
    role: 'super_admin',
    department: 'Administrasi Sistem & Keamanan TI',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    status: 'active',
    lastLogin: '2026-08-20T09:00:00Z',
    phone: '+62 812-9988-7766',
    allowedModules: ['dashboard', 'finance', 'accounting', 'marketing', 'sales', 'sales_progress', 'procurement', 'warehouse', 'reports', 'security']
  }
];

// ---------------- 2. REKENING BANK & KAS LOKET ----------------
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank_003',
    bankName: 'BCA Manajemen',
    accountNumber: '869-188-9901',
    accountHolder: "PT Lembah Hijau Multifarm (D'Kandang) - Manajemen",
    balance: 0,
    currency: 'IDR',
    status: 'active'
  },
  {
    id: 'bank_006',
    bankName: 'BCA - IBU',
    accountNumber: '869-144-2209',
    accountHolder: "D'Kandang Amazing Farm - Operasional Ibu",
    balance: 0,
    currency: 'IDR',
    status: 'active'
  },
  {
    id: 'bank_007',
    bankName: 'BSI - IBU',
    accountNumber: '719-882-3410',
    accountHolder: "PT. WISATA AGRO EDUKASI SEJAHTERA - BSI",
    balance: 0,
    currency: 'IDR',
    status: 'active'
  },
  {
    id: 'bank_004',
    bankName: 'FINANCE CASH',
    accountNumber: 'KAS-FIN-001',
    accountHolder: "Kasir & Brankas Finance D'Kandang",
    balance: 0,
    currency: 'IDR',
    status: 'active'
  }
];

// Re-export decoupled read-only transaction constants from ./mock/transactions
export {
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_SALES_INVOICES,
  INITIAL_PAYMENT_PROOFS,
  INITIAL_RECURRING_BILLS,
  INITIAL_PETTY_CASH_EXPENSES,
  INITIAL_REIMBURSEMENT_CLAIMS
} from './mock/transactions';

// ---------------- 4. ALOKASI ANGGARAN (BUDGETS) ----------------
export const INITIAL_BUDGETS: BudgetAllocation[] = [
  {
    id: 'bdg_operasional_2026',
    department: 'Kebutuhan Operasional',
    category: 'Operasional Paketan, Pakan Satwa & Fasilitas Farm',
    fiscalYear: 2026,
    quarter: 'Q3',
    allocatedAmount: 150000000,
    spentAmount: 0,
    description: 'Dompet anggaran utama operasional paketan sekolah, pakan satwa, dan pemeliharaan fasilitas agrowisata.'
  }
];

// ---------------- 5. BAGAN AKUN PEMBUKUAN (CHART OF ACCOUNTS - COA) ----------------
export const INITIAL_COA: ChartOfAccount[] = [
  // 1. AKTIVA LANCAR (CURRENT ASSETS)
  { code: '1110', name: "Kas & Bank D'Kandang Farm (BCA, Mandiri, BSI & Loket)", type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow', 'outflow'] },
  { code: '1120', name: 'Piutang Usaha Paket Wisata Edukasi Sekolah & Mitra', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow', 'outflow'] },
  { code: '1125', name: 'Piutang Karyawan & Kasbon Operasional Lapangan', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow', 'outflow'] },
  { code: '1130', name: 'Persediaan Produk Olahan Susu, Yogurt & Souvenir', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1140', name: 'Persediaan Pakan Ternak Konsentrat, Rumput & Obat Satwa', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1145', name: 'Persediaan Bahan Baku Saung Resto, Dapur & Kafe', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1160', name: 'Sewa & Biaya Operasional Dibayar di Muka', type: 'Asset', category: 'Aktiva Lancar', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },

  // 2. AKTIVA INVESTASI: BIOLOGIS (PSAK 69) & ASET TETAP (NON-CURRENT ASSETS)
  { code: '1150', name: 'Aset Biologis - Hewan Ternak (Sapi Perah, Kambing Etawa, Kuda Poni, Domba)', type: 'Asset', category: 'Aktiva Biologis (PSAK 69)', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1155', name: 'Aset Biologis - Tanaman Perkebunan, Hidroponik & Bibit Unggul', type: 'Asset', category: 'Aktiva Biologis (PSAK 69)', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1205', name: 'Aset Tetap - Tanah & Lahan Kawasan Agrowisata', type: 'Asset', category: 'Aktiva Tetap', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1210', name: 'Aset Tetap - Bangunan, Kandang Satwa, Saung & Wahana Wisata', type: 'Asset', category: 'Aktiva Tetap', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1220', name: 'Aset Tetap - Mesin Pasteurisasi, Peralatan Farm & Kendaraan', type: 'Asset', category: 'Aktiva Tetap', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '1290', name: 'Akumulasi Penyusutan Fasilitas & Peralatan Agrowisata', type: 'Asset', category: 'Aktiva Tetap', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'investing', allowedTxTypes: ['outflow', 'inflow'] },

  // 3. KEWAJIBAN / LIABILITAS (LIABILITIES)
  { code: '2110', name: 'Hutang Usaha Pemasok Pakan, Logistik & Kemasan Botol Farm', type: 'Liability', category: 'Kewajiban Lancar', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '2120', name: 'Hutang Pajak Daerah, PB1 Resto & PPN Wisata Edukasi', type: 'Liability', category: 'Kewajiban Lancar', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '2130', name: 'Pendapatan Diterima di Muka (Uang Muka / Deposit Rombongan Sekolah)', type: 'Liability', category: 'Kewajiban Lancar', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow', 'outflow'] },
  { code: '2140', name: 'Hutang Gaji, Honor Fasilitator & Insentif Karyawan', type: 'Liability', category: 'Kewajiban Lancar', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow', 'inflow'] },
  { code: '2210', name: 'Pinjaman Bank & Pembiayaan Investasi Jangka Panjang', type: 'Liability', category: 'Kewajiban Jangka Panjang', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'financing', allowedTxTypes: ['inflow', 'outflow'] },

  // 4. EKUITAS / MODAL (EQUITY)
  { code: '3110', name: "Modal Disetor PT D'Kandang Amazing Farm", type: 'Equity', category: 'Ekuitas', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'financing', allowedTxTypes: ['inflow', 'outflow'] },
  { code: '3120', name: 'Tambahan Modal Kerja & Setoran Investasi Owner', type: 'Equity', category: 'Ekuitas', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'financing', allowedTxTypes: ['inflow'] },
  { code: '3130', name: 'Prive / Bagi Hasil & Penarikan Dana Owner (30%)', type: 'Equity', category: 'Ekuitas', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'financing', allowedTxTypes: ['outflow'] },
  { code: '3210', name: 'Laba Ditahan Operasional Agrowisata', type: 'Equity', category: 'Ekuitas', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'financing', allowedTxTypes: ['inflow', 'outflow'] },

  // 5. PENDAPATAN OPERASIONAL & LAINNYA (REVENUE)
  { code: '4110', name: 'Pendapatan Tiket Masuk & Paket Edukasi Wisata Sekolah', type: 'Revenue', category: 'Pendapatan Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },
  { code: '4120', name: 'Pendapatan Penjualan Susu Pasteurisasi & Produk Olahan Farm', type: 'Revenue', category: 'Pendapatan Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },
  { code: '4130', name: "Pendapatan F&B Saung Resto D'Kandang & Wahana Satwa", type: 'Revenue', category: 'Pendapatan Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },
  { code: '4140', name: 'Pendapatan Penjualan Bibit Tanaman, Pupuk Organik & Hasil Kebun', type: 'Revenue', category: 'Pendapatan Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },
  { code: '4150', name: 'Pendapatan Sewa Venue, Gathering Corporate & Outbound B2B', type: 'Revenue', category: 'Pendapatan Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },
  { code: '4210', name: 'Pendapatan Lain-lain, Sponsorship & Jasa Giro Bank', type: 'Revenue', category: 'Pendapatan Non-Operasional', balance: 0, normalBalance: 'Credit', cashFlowCategory: 'operating', allowedTxTypes: ['inflow'] },

  // 6. HARGA POKOK PENJUALAN & BEBAN OPERASIONAL (EXPENSES)
  { code: '5110', name: 'Beban Pokok Penjualan (Pakan Ternak, Bibit & Bahan Resto)', type: 'Expense', category: 'Harga Pokok Penjualan', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '5120', name: 'Beban Pokok Paket Edukasi Sekolah (Catering, Goodie Bag & Properti)', type: 'Expense', category: 'Harga Pokok Penjualan', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6110', name: 'Beban Gaji Fasilitator Edukasi, Pemandu & Peternak', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6120', name: 'Beban Pemeliharaan Kesehatan Satwa, Kandang & Dokter Hewan', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6130', name: 'Beban Promosi Sekolah, Event & Pemasaran Wisata', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6140', name: 'Beban Utilitas (Listrik PLN, Air Bersih, Internet & Kebersihan)', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6150', name: 'Beban Administrasi Kantor, ATK, Perizinan & Konsumsi Rapat', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] },
  { code: '6160', name: 'Beban Penyusutan Aset Tetap & Wahana', type: 'Expense', category: 'Beban Operasional', balance: 0, normalBalance: 'Debit', cashFlowCategory: 'operating', allowedTxTypes: ['outflow'] }
];

// ---------------- 7. KEGIATAN PROMOSI & BROSUR (MARKETING CAMPAIGNS) ----------------
export const INITIAL_MARKETING_CAMPAIGNS: MarketingCampaign[] = [];

// ---------------- 8. PROSPEK KUNJUNGAN SEKOLAH & CRM (LEADS) ----------------
export const INITIAL_LEADS: Lead[] = [];

// ---------------- 9. SURAT PENAWARAN HARGA WISATA (QUOTATIONS) ----------------
export const INITIAL_QUOTATIONS: Quotation[] = [];

// ---------------- 12. DATA REKANAN & PEMASOK RESMI (VENDORS) ----------------
export const INITIAL_VENDORS: Vendor[] = [];

// ---------------- 13. PERMINTAAN PEMBELIAN BARANG (PURCHASE REQUISITIONS) ----------------
export const INITIAL_PURCHASE_REQUISITIONS: PurchaseRequisition[] = [];

// ---------------- 14. SURAT PESANAN PEMBELIAN RESMI (PURCHASE ORDERS) ----------------
export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

// ---------------- 15. PERSESIAAN GUDANG & SKU AGROWISATA (INVENTORY) ----------------
export const INITIAL_INVENTORY: InventoryItem[] = [];

// ---------------- 16. MUTASI KELUAR MASUK GUDANG (STOCK MOVEMENTS) ----------------
export const INITIAL_STOCK_MOVEMENTS: StockMovement[] = [];

// ---------------- 17. PEMERIKSAAN FISIK STOK (STOCK OPNAMES) ----------------
export const INITIAL_STOCK_OPNAMES: StockOpname[] = [];

// ---------------- 18. JADWAL LAPORAN OTOMATIS (SCHEDULED REPORTS) ----------------
export const INITIAL_SCHEDULED_REPORTS: ScheduledReport[] = [];

// ---------------- 19. CATATAN RIWAYAT AKTIVITAS & KEAMANAN (AUDIT LOGS) ----------------
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud_init_001',
    timestamp: new Date().toISOString(),
    userId: 'usr_008',
    userName: 'Super Admin Sistem ERP',
    userRole: 'super_admin',
    action: 'SYSTEM_INITIALIZED',
    module: 'security',
    details: "Sistem ERP D'Kandang Amazing Farm siap digunakan. Basis data bersih untuk input data operasional riil.",
    ipAddress: '127.0.0.1',
    integrityHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isEncrypted: true
  }
];

// ---------------- 20. PROFIL PERUSAHAAN & KOP SURAT RESMI ----------------
export const INITIAL_COMPANY_PROFILE: CompanyProfile = {
  name: "D'Kandang Amazing Farm",
  ptName: "PT. WISATA AGRO EDUKASI SEJAHTERA",
  tagline: "WISATA EDUKASI AGRO PERTANIAN & PETERNAKAN RAMAH KELUARGA",
  address: "Jl. Penarikan RT 01 / RW 02, Kel. Pasir Putih, Kec. Sawangan, Kota Depok, Jawa Barat 16519",
  phone: "(021) 7788-9000 / 0812-1111-2233",
  email: "sales@dkandang.id",
  website: "www.dkandang.id",
  directorName: "H. Muh. Ridwan, S.Pt",
  directorTitle: "Direktur Utama",
  defaultBankName: "Bank Mandiri Margonda Depok - Tiketing & EDC Wisata",
  defaultBankAccount: "137-00-1928374-1",
  defaultAccountHolder: "PT. WISATA AGRO EDUKASI SEJAHTERA",
  npwp: "02.891.234.5-412.000",
  logoEmoji: "🌿"
};

// ---------------- 21. NOTIFIKASI & PENGINGAT OTOMATIS (NOTIFICATIONS) ----------------
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// ---------------- 24. DOMPET KAS KECIL LAPANGAN (PETTY CASH WALLETS) ----------------
export const INITIAL_PETTY_CASH_WALLETS: PettyCashWallet[] = [];

// ---------------- 27. SIMULASI KALKULATOR HPP & MARGIN (PACKAGE SIMULATIONS) ----------------
export const INITIAL_PACKAGE_SIMULATIONS: PackageCostingSimulation[] = [];

// ---------------- 28. PENCATATAN HUTANG & KEWAJIBAN USAHA (ACCOUNTS PAYABLE) ----------------
export const INITIAL_DEBTS: DebtRecord[] = [
  {
    id: 'debt-001',
    debtNumber: 'HUT-2026-0001',
    creditorName: 'CV Agro Nutrisi Mandiri',
    creditorContact: 'Bpk. Hendra Gunawan',
    creditorPhone: '0812-9876-5432',
    category: 'supplier_po',
    description: 'Pengadaan Pakan Konsentrat Sapi Perah Super Grade A (40 Karung)',
    invoiceNumber: 'INV/AGRO/2026/02-881',
    relatedPoId: 'po-1',
    relatedPoNumber: 'PO-2026-001',
    totalAmount: 18500000,
    paidAmount: 5000000,
    remainingAmount: 13500000,
    issueDate: '2026-02-15',
    dueDate: '2026-03-30',
    status: 'partial',
    paymentTerms: 'NET 45',
    notes: 'Uang muka Rp 5.000.000 sudah dibayarkan saat barang tiba di gudang pakan.',
    payments: [
      {
        id: 'pay-001-1',
        debtId: 'debt-001',
        paymentDate: '2026-02-16',
        amount: 5000000,
        paymentMethod: 'transfer',
        sourceAccountId: 'bank-1',
        sourceAccountName: 'Bank Mandiri Giro Utama',
        referenceNo: 'TRF-DP-PO001',
        receiptNumber: 'KWT-AGRO-DP-01',
        notes: 'DP Pembelian Konsentrat',
        paidBy: 'Siti Aminah (Finance)',
        createdAt: '2026-02-16T10:00:00.000Z'
      }
    ],
    createdBy: 'Siti Aminah (Finance)',
    createdAt: '2026-02-15T09:30:00.000Z',
    updatedAt: '2026-02-16T10:00:00.000Z'
  },
  {
    id: 'debt-002',
    debtNumber: 'HUT-2026-0002',
    creditorName: 'PT Benih Hijau Nusantara',
    creditorContact: 'Ibu Ratna',
    creditorPhone: '0813-2233-4455',
    category: 'supplier_po',
    description: 'Bibit Sayur Hidroponik & Polybag Edukasi Tanaman Organik (500 Pack)',
    invoiceNumber: 'INV-BHN-7712',
    relatedPoId: 'po-2',
    relatedPoNumber: 'PO-2026-002',
    totalAmount: 7200000,
    paidAmount: 0,
    remainingAmount: 7200000,
    issueDate: '2026-02-25',
    dueDate: '2026-03-27',
    status: 'unpaid',
    paymentTerms: 'NET 30',
    notes: 'Jatuh tempo akhir bulan Maret, persiapan wahana berkebun liburan sekolah.',
    payments: [],
    createdBy: 'Siti Aminah (Finance)',
    createdAt: '2026-02-25T14:15:00.000Z',
    updatedAt: '2026-02-25T14:15:00.000Z'
  },
  {
    id: 'debt-003',
    debtNumber: 'HUT-2026-0003',
    creditorName: 'PT Solusi Daya Listrik & Tata Udara',
    creditorContact: 'Bpk. Bambang Sutopo',
    creditorPhone: '0811-3344-5566',
    category: 'vendor_operasional',
    description: 'Maintenance Servis AC Sentral Resto & Penggantian Filter Udara Kandang Kelinci',
    invoiceNumber: 'INV-SDL-2026-019',
    totalAmount: 4850000,
    paidAmount: 0,
    remainingAmount: 4850000,
    issueDate: '2026-03-01',
    dueDate: '2026-03-15',
    status: 'unpaid',
    paymentTerms: 'NET 14',
    notes: 'Pekerjaan servis sudah selesai dan ditandatangani oleh koordinator wahana.',
    payments: [],
    createdBy: 'Siti Aminah (Finance)',
    createdAt: '2026-03-01T11:00:00.000Z',
    updatedAt: '2026-03-01T11:00:00.000Z'
  }
];

