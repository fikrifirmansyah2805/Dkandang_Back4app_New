import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Role, 
  ModuleType, 
  Permission, 
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
  AccountingPeriodLock,
  DebtRecord,
  DebtPaymentRecord,
  DebtStatus,
  GoogleSheetSyncConfig,
  BulkImportTransactionInput,
  BatchImportResult
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_BANK_ACCOUNTS, 
  INITIAL_BUDGETS, 
  INITIAL_COA, 
  INITIAL_MARKETING_CAMPAIGNS, 
  INITIAL_LEADS, 
  INITIAL_QUOTATIONS, 
  INITIAL_VENDORS, 
  INITIAL_PURCHASE_REQUISITIONS, 
  INITIAL_PURCHASE_ORDERS, 
  INITIAL_INVENTORY, 
  INITIAL_STOCK_MOVEMENTS, 
  INITIAL_STOCK_OPNAMES, 
  INITIAL_SCHEDULED_REPORTS, 
  INITIAL_AUDIT_LOGS,
  INITIAL_COMPANY_PROFILE,
  INITIAL_NOTIFICATIONS,
  INITIAL_PETTY_CASH_WALLETS,
  INITIAL_PACKAGE_SIMULATIONS,
  INITIAL_DEBTS
} from '../data/mockData';
import {
  INITIAL_CASH_TRANSACTIONS,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_SALES_ORDERS,
  INITIAL_SALES_INVOICES,
  INITIAL_PAYMENT_PROOFS,
  INITIAL_RECURRING_BILLS,
  INITIAL_PETTY_CASH_EXPENSES,
  INITIAL_REIMBURSEMENT_CLAIMS
} from '../data/mock/transactions';
import { DEFAULT_ROLE_PERMISSIONS, generateSHA256, simulateEncrypt, simulateDecrypt } from '../utils/crypto';
import { soundManager } from '../utils/sound';
import { 
  saveDocument, 
  patchDocument,
  deleteDocument, 
  deleteMultipleDocuments,
  purgeOutflowDocumentsFromFirestore,
  purgeObsoleteReconstructedSchoolDocsFromFirestore,
  subscribeToCollection, 
  saveMultipleDocuments,
  clearCollection,
  getDeletedIds,
  unmarkRecordAsDeleted,
  scheduleStorageWrite,
  getIsFirestoreQuotaExceeded,
  subscribeToQuotaStatus
} from '../services/firestoreSync';
import { findTargetBankAccount as matchBankAccount } from '../utils/bankMatcher';
import { getSheetsAccessToken } from '../firebase';
import {
  getTransactionFingerprint,
  fetchGoogleSheetRows,
  autoDetectColumnMapping,
  normalizeSpreadsheetRows,
  inferContraAccountForRow
} from '../utils/spreadsheetImportHelper';
import {
  recoverLegacyLocalStorageArray,
  purgeLegacyOutflowCache,
  mergeWithCoreBankAccounts,
  mergeWithCoreBudgets,
  mergeWithCoreCOA,
  suggestContraAccountForTransaction,
  buildDeterministicJournalsAndCOA,
  reconstructSchoolSalesFromTransactions,
  isObsoleteReconstructedSchoolId
} from '../utils/dataRecoveryHelper';

import { getNextDocumentNumber, reserveDocumentNumberRange } from '../utils/documentNumbering';

interface ERPContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  isCloudSynced: boolean;
  isQuotaExceeded: boolean;
  activeModule: ModuleType;
  setActiveModule: (mod: ModuleType) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  switchUserWithAuth: (userId: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateUserRole: (userId: string, newRole: Role) => void;
  checkPermission: (module: ModuleType, action: keyof Permission) => boolean;

  // Data collections
  bankAccounts: BankAccount[];
  cashTransactions: CashTransaction[];
  budgetAllocations: BudgetAllocation[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
  accountingPeriods: AccountingPeriodLock[];
  marketingCampaigns: MarketingCampaign[];
  leads: Lead[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  salesInvoices: SalesInvoice[];
  vendors: Vendor[];
  purchaseRequisitions: PurchaseRequisition[];
  purchaseOrders: PurchaseOrder[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  stockOpnames: StockOpname[];
  scheduledReports: ScheduledReport[];
  auditLogs: AuditLog[];
  companyProfile: CompanyProfile;
  notifications: AppNotification[];
  recurringBills: RecurringBill[];
  unreadNotificationsCount: number;
  pendingApprovalsCount: number;

  // New Modules State: School Portal, Costing & Petty Cash
  paymentProofs: PaymentProof[];
  pettyCashWallets: PettyCashWallet[];
  pettyCashExpenses: PettyCashExpense[];
  reimbursementClaims: ReimbursementClaim[];
  packageSimulations: PackageCostingSimulation[];
  debts: DebtRecord[];
  sheetSyncConfigs: GoogleSheetSyncConfig[];

  // Spreadsheet Import & Google Sheets Auto-Sync Actions
  bulkImportCashTransactions: (
    items: BulkImportTransactionInput[],
    sourceLabel?: string
  ) => Promise<BatchImportResult>;
  importCashTransactionsBatch: (
    items: BulkImportTransactionInput[],
    sourceLabel?: string
  ) => Promise<BatchImportResult>;
  saveSheetSyncConfig: (
    config: Omit<GoogleSheetSyncConfig, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
  ) => Promise<GoogleSheetSyncConfig>;
  deleteSheetSyncConfig: (id: string) => Promise<void>;
  runGoogleSheetSync: (
    configId: string,
    options?: { silent?: boolean }
  ) => Promise<BatchImportResult>;

  // Accounts Payable & Debt Management Actions
  addDebt: (debt: Omit<DebtRecord, 'id' | 'debtNumber' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<DebtRecord>;
  updateDebt: (id: string, updates: Partial<DebtRecord>) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
  recordDebtPayment: (debtId: string, payment: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'transfer' | 'giro';
    sourceAccountId: string;
    referenceNo?: string;
    receiptNumber?: string;
    notes?: string;
  }) => Promise<{ success: boolean; message: string; paymentRecord?: DebtPaymentRecord }>;
  importPOAsDebt: (poId: string, customDueDate?: string) => Promise<{ success: boolean; message: string; debt?: DebtRecord }>;

  // School Portal & Payment Proofs Actions
  submitPaymentProof: (proof: Omit<PaymentProof, 'id' | 'uploadedAt' | 'status'>) => Promise<{ success: boolean; message: string; proofId?: string }>;
  verifyPaymentProof: (proofId: string, approved: boolean, rejectionReason?: string, bankDestination?: string) => Promise<{ success: boolean; message: string }>;
  generatePortalTokenForInvoice: (invoiceId: string) => Promise<string>;

  // Package Costing Simulator Actions
  savePackageCostingSimulation: (simulation: Omit<PackageCostingSimulation, 'id' | 'createdAt' | 'simulatedBy'>) => Promise<PackageCostingSimulation>;
  deletePackageCostingSimulation: (id: string) => Promise<void>;
  convertSimulationToQuotationDraft: (simulationId: string, customerName: string, leadId?: string) => Promise<Quotation>;

  // Petty Cash & Field Reimbursement Actions
  addPettyCashWallet: (wallet: Omit<PettyCashWallet, 'id' | 'currentBalance' | 'status'>) => Promise<void>;
  updatePettyCashWallet: (id: string, updates: Partial<PettyCashWallet>) => Promise<void>;
  recordPettyCashExpense: (expense: Omit<PettyCashExpense, 'id' | 'status'>) => Promise<{ success: boolean; message: string }>;
  deletePettyCashExpense: (id: string) => Promise<void>;
  submitReimbursementClaim: (walletId: string, expenseIds: string[]) => Promise<{ success: boolean; message: string; claim?: ReimbursementClaim }>;
  approveReimbursementClaim: (claimId: string) => Promise<{ success: boolean; message: string }>;
  rejectReimbursementClaim: (claimId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  disburseReimbursementClaim: (claimId: string, sourceAccountId: string) => Promise<{ success: boolean; message: string }>;

  // Automated Notification & Reminder Actions
  createNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => Promise<AppNotification>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  quickApproveFromNotification: (notificationId: string) => Promise<{ success: boolean; message: string }>;
  quickRejectFromNotification: (notificationId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  selectedReviewItem: { type: 'quotation' | 'pr' | 'opname' | 'cash'; id: string } | null;
  setSelectedReviewItem: (item: { type: 'quotation' | 'pr' | 'opname' | 'cash'; id: string } | null) => void;
  showNotificationCenterModal: boolean;
  setShowNotificationCenterModal: (show: boolean) => void;

  // Company Profile & Letterhead Actions
  updateCompanyProfile: (updates: Partial<CompanyProfile>) => Promise<void>;

  // Bank Management Actions (Otoritas Khusus Direktur Utama)
  addBankAccount: (bank: Omit<BankAccount, 'id'>) => Promise<{ success: boolean; message?: string }>;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<{ success: boolean; message?: string }>;
  deleteBankAccount: (id: string) => Promise<{ success: boolean; message?: string }>;
  recalculateBankBalances: () => Promise<{ success: boolean; message?: string }>;
  restoreSystemData: () => Promise<{ success: boolean; message: string }>;
  restoreSchoolAndSalesData: (options?: { silent?: boolean }) => Promise<{
    success: boolean;
    restoredLeadsCount: number;
    restoredQuotationsCount: number;
    restoredOrdersCount: number;
    restoredInvoicesCount: number;
    message: string;
  }>;

  // Cross-Module Seamless Actions
  addCashTransaction: (tx: Omit<CashTransaction, 'id' | 'status'>) => Promise<void>;
  updateCashTransaction: (id: string, updates: Partial<CashTransaction>) => Promise<{ success: boolean; message?: string }>;
  deleteCashTransaction: (id: string) => Promise<{ success: boolean; message?: string }>;
  clearAllCashTransactions: () => Promise<{ success: boolean; message?: string }>;
  clearAllOutflowTransactions: (options?: { silent?: boolean; bypassAuthCheck?: boolean }) => Promise<{
    success: boolean;
    deletedOutflowCount: number;
    deletedJournalCount: number;
    message: string;
  }>;
  addRecurringBill: (bill: Omit<RecurringBill, 'id'>) => Promise<void>;
  updateRecurringBill: (id: string, updates: Partial<RecurringBill>) => Promise<void>;
  deleteRecurringBill: (id: string) => Promise<void>;
  addBudgetAllocation: (budget: Omit<BudgetAllocation, 'id' | 'spentAmount'>) => Promise<void>;
  updateBudgetAllocation: (id: string, updates: Partial<BudgetAllocation>) => Promise<void>;
  deleteBudgetAllocation: (id: string) => Promise<void>;
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNumber' | 'status' | 'createdBy'>) => Promise<void>;
  updateJournalEntry: (id: string, updates: Partial<JournalEntry>) => Promise<{ success: boolean; message?: string }>;
  deleteJournalEntry: (id: string) => Promise<{ success: boolean; message?: string }>;
  reverseJournalEntry: (journalId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  addChartOfAccount: (account: ChartOfAccount) => Promise<{ success: boolean; message?: string }>;
  closeAccountingPeriod: (period: string, notes?: string) => Promise<{ success: boolean; message?: string }>;
  reopenAccountingPeriod: (periodId: string) => Promise<{ success: boolean; message?: string }>;
  refreshAndReconcileAccounting: () => Promise<{
    success: boolean;
    orphanedRemoved: number;
    unrecordedPosted: number;
    totalActiveJournals: number;
    timestamp: string;
    message?: string;
  }>;
  addMarketingCampaign: (campaign: Omit<MarketingCampaign, 'id' | 'spent' | 'leadsGenerated' | 'conversions' | 'roiPercentage'>) => Promise<void>;
  updateMarketingCampaign: (id: string, updates: Partial<MarketingCampaign>) => Promise<void>;
  deleteMarketingCampaign: (id: string) => Promise<void>;
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<void>;
  updateLeadStage: (leadId: string, newStage: Lead['stage']) => Promise<void>;
  addLeadFollowUp: (leadId: string, action: 'WhatsApp' | 'Telepon' | 'Survey Lokasi' | 'Meeting Proposal' | 'Email', note: string) => Promise<void>;
  updateLeadDetails: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  updateSchoolName: (leadId: string, newSchoolName: string) => Promise<{ success: boolean; message: string }>;
  deleteLead: (leadId: string) => Promise<{ success: boolean; message?: string }>;
  addQuotation: (quote: Omit<Quotation, 'id' | 'status' | 'preparedBy' | 'quotationNumber'> & { quotationNumber?: string; status?: Quotation['status'] }) => Promise<Quotation>;
  updateQuotation: (id: string, updates: Partial<Quotation>) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  approveQuotation: (id: string, notes?: string) => Promise<void>;
  rejectQuotation: (id: string, reason: string) => Promise<void>;
  sendQuotationToCustomer: (id: string) => Promise<void>;
  convertQuotationToSO: (quotationId: string) => Promise<void>;
  addSalesOrder: (so: Omit<SalesOrder, 'id' | 'soNumber' | 'status' | 'paymentStatus'>) => Promise<void>;
  processSalesOrderDelivery: (soId: string) => Promise<void>;
  markInvoicePaid: (invId: string) => Promise<void>;
  addVendor: (vendor: Omit<Vendor, 'id' | 'code'>) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  addPurchaseRequisition: (pr: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'status'>) => Promise<void>;
  deletePurchaseRequisition: (prId: string) => Promise<void>;
  approvePurchaseRequisition: (prId: string) => Promise<void>;
  convertPRToPO: (prId: string, vendorId: string) => Promise<void>;
  addDirectPurchaseOrder: (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'threeWayMatched'>) => Promise<void>;
  deletePurchaseOrder: (poId: string) => Promise<void>;
  confirmGoodsReceipt: (poId: string, targetWarehouse: string) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>) => Promise<void>;
  deleteInventoryItem: (itemId: string) => Promise<void>;
  adjustStockQuantity: (sku: string, diff: number, reason: string) => Promise<void>;
  runStockOpname: (opname: Omit<StockOpname, 'id' | 'opnameNumber' | 'date' | 'auditor' | 'status'>) => Promise<void>;
  triggerReportGeneration: (reportId: string) => Promise<void>;
  toggleReportStatus: (reportId: string) => void;
  addScheduledReport: (rep: Omit<ScheduledReport, 'id' | 'lastGenerated'>) => void;
  addAuditLog: (action: string, module: ModuleType, details: string) => Promise<void>;

  // Global settings, modals & tools
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  devicePreview: 'desktop' | 'tablet' | 'mobile';
  setDevicePreview: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  viewportMode: 'desktop' | 'tablet' | 'mobile';
  setViewportMode: (mode: 'desktop' | 'tablet' | 'mobile') => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebarCollapsed: () => void;
  showRoleSwitcher: boolean;
  setShowRoleSwitcher: (show: boolean) => void;
  showVaultModal: boolean;
  setShowVaultModal: (show: boolean) => void;
  notification: { message: string; type: 'success' | 'info' | 'warning' | 'error' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;

  // Aliases for compatibility
  systemUsers: User[];
  setCurrentUser: (u: User) => void;
  reportSchedules: ScheduledReport[];
  stockTransfers: StockMovement[];
  adjustInventoryStock: (itemId: string, qty: number, type: 'in' | 'out' | 'adjustment', notes: string) => Promise<void>;
  transferStock: (params: { itemId: string; sourceWarehouse: string; targetWarehouse: string; quantity: number; notes: string }) => Promise<void>;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

// Helper to clean and filter bank accounts (removes legacy restricted pool accounts if any)
export const syncRestrictedPoolBalance = (accounts: BankAccount[]): BankAccount[] => {
  return accounts.filter(a => !a.isRestricted && a.id !== 'bank_005');
};

const STORAGE_KEY_PREFIX = 'DKANDANG_FARM_DEPOK_ERP_PROD_CLEAN_V2_';

// Known demo/dummy IDs to be strictly filtered out to ensure a 100% clean production environment
const LEGACY_DUMMY_IDS = new Set<string>([
  'lead_2026_001', 'lead_2026_002', 'lead_2026_003', 'lead_2026_004', 'lead_2026_005',
  'lead_2026_006', 'lead_2026_007', 'lead_2026_008', 'lead_2026_009', 'lead_2026_010',
  'inv_demo_001', 'inv_demo_002',
  'proof_demo_001',
  'pcw_001', 'pcw_002', 'pcw_003',
  'pce_001', 'pce_002', 'pce_003', 'pce_004', 'pce_005',
  'clm_demo_001',
  'sim_demo_001',
  'bank_001', 'bank_002'
]);

function dedupeById<T extends { id?: string; code?: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item?.id || item?.code;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function prependUnique<T extends { id?: string; code?: string }>(prev: T[], newItem: T): T[] {
  const key = newItem?.id || newItem?.code;
  if (!key) return [newItem, ...prev];
  return dedupeById([newItem, ...prev.filter((item) => (item?.id || item?.code) !== key)]);
}

function appendUnique<T extends { id?: string; code?: string }>(prev: T[], newItem: T): T[] {
  const key = newItem?.id || newItem?.code;
  if (!key) return [...prev, newItem];
  return dedupeById([...prev.filter((item) => (item?.id || item?.code) !== key), newItem]);
}

function mergeWithInitialUsers(incoming: User[] | null | undefined): User[] {
  const validIncoming = Array.isArray(incoming) ? incoming.filter(Boolean) : [];
  const incomingById = new Map<string, User>();
  const incomingByUsername = new Map<string, User>();

  for (const u of validIncoming) {
    if (u?.id) incomingById.set(u.id, u);
    if (u?.username) incomingByUsername.set(u.username.trim().toLowerCase(), u);
  }

  const merged: User[] = INITIAL_USERS.map((initUser) => {
    const match =
      incomingById.get(initUser.id) ||
      incomingByUsername.get(initUser.username.trim().toLowerCase());
    if (!match) return initUser;
    return {
      ...initUser,
      ...match,
      id: initUser.id,
      username: initUser.username,
      password: initUser.password,
      email: match.email || initUser.email,
      role: match.role || initUser.role,
      allowedModules:
        Array.isArray(match.allowedModules) && match.allowedModules.length > 0
          ? match.allowedModules
          : initUser.allowedModules
    };
  });

  const initialIds = new Set(INITIAL_USERS.map((u) => u.id));
  const initialUsernames = new Set(INITIAL_USERS.map((u) => u.username.trim().toLowerCase()));

  for (const u of validIncoming) {
    const uname = (u?.username || '').trim().toLowerCase();
    if (u?.id && !initialIds.has(u.id) && (!uname || !initialUsernames.has(uname))) {
      merged.push(u);
    }
  }

  return dedupeById(merged);
}

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Realtime Data Collections
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}users`);
      const parsed = saved ? JSON.parse(saved) : [];
      return mergeWithInitialUsers(parsed);
    } catch (e) {
      return INITIAL_USERS;
    }
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    // Migrasi Anti Auto-Login: bersihkan persistensi legacy dari localStorage
    try { localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`); } catch (e) {}
    const saved = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}current_user`);
    return saved || 'usr_001';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Migrasi Anti Auto-Login: sesi hanya berlaku per-tab di sessionStorage
    try { localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_session`); } catch (e) {}
    const savedSession = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}auth_session`);
    return savedSession === 'true';
  });

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(getIsFirestoreQuotaExceeded());
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}sidebar_collapsed`);
    return saved ? saved === 'true' : false;
  });

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}sidebar_collapsed`, String(next));
      return next;
    });
  };

  const handleSetIsSidebarCollapsed = (value: boolean | ((prev: boolean) => boolean)) => {
    setIsSidebarCollapsed(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem(`${STORAGE_KEY_PREFIX}sidebar_collapsed`, String(next));
      return next;
    });
  };

  const [showRoleSwitcher, setShowRoleSwitcher] = useState<boolean>(false);
  const [showVaultModal, setShowVaultModal] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    try {
      if (!localStorage.getItem('DKANDANG_OUTFLOW_PURGE_V1_COMPLETED')) {
        purgeLegacyOutflowCache();
      }
    } catch {}
    const deleted = getDeletedIds('bank_accounts');
    const recovered = recoverLegacyLocalStorageArray('bank_accounts', INITIAL_BANK_ACCOUNTS, LEGACY_DUMMY_IDS);
    const decrypted = recovered.map(b => ({
      ...b,
      accountNumber: simulateDecrypt(b.accountNumber)
    }));
    const merged = mergeWithCoreBankAccounts(decrypted, deleted, LEGACY_DUMMY_IDS);
    return syncRestrictedPoolBalance(merged);
  });

  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>(() => {
    const isPurgeDone = Boolean(localStorage.getItem('DKANDANG_OUTFLOW_PURGE_V1_COMPLETED'));
    if (!isPurgeDone) {
      purgeLegacyOutflowCache();
    }
    const deleted = getDeletedIds('cash_transactions');
    const recovered = recoverLegacyLocalStorageArray('cash_transactions', INITIAL_CASH_TRANSACTIONS, deleted);
    const combined = [...recovered];
    const existingIds = new Set(recovered.map(t => t.id));
    for (const initTx of INITIAL_CASH_TRANSACTIONS) {
      if (!existingIds.has(initTx.id) && !deleted.has(initTx.id)) {
        combined.push(initTx);
      }
    }
    const seen = new Set<string>();
    return combined.filter(t => {
      if (!t.id || seen.has(t.id) || deleted.has(t.id)) return false;
      if (String(t.id).startsWith('tx_exp_')) return false;
      if (!isPurgeDone && t.type === 'outflow') return false;
      seen.add(t.id);
      return true;
    });
  });

  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>(() => {
    const deleted = getDeletedIds('budgets');
    const recovered = recoverLegacyLocalStorageArray('budgets', INITIAL_BUDGETS, deleted);
    return dedupeById(mergeWithCoreBudgets(recovered, deleted));
  });

  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccount[]>(() => {
    const recovered = recoverLegacyLocalStorageArray('coa', INITIAL_COA);
    return dedupeById(mergeWithCoreCOA(recovered));
  });

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const deleted = getDeletedIds('journal');
    const recovered = recoverLegacyLocalStorageArray('journal', INITIAL_JOURNAL_ENTRIES, deleted);
    return dedupeById(
      recovered.filter(
        j =>
          !String(j.referenceId || '').startsWith('tx_exp_') &&
          !String(j.id || '').startsWith('jrn_sync_tx_exp_')
      )
    );
  });

  const [accountingPeriods, setAccountingPeriods] = useState<AccountingPeriodLock[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}accounting_periods`);
    return dedupeById(saved ? JSON.parse(saved) : []);
  });

  const [marketingCampaigns, setMarketingCampaigns] = useState<MarketingCampaign[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}marketing`);
    return dedupeById(saved ? JSON.parse(saved) : INITIAL_MARKETING_CAMPAIGNS);
  });

  const initialSchoolSeed = useMemo(() => {
    const deletedLeads = getDeletedIds('leads');
    return reconstructSchoolSalesFromTransactions({
      transactions: cashTransactions,
      existingLeads: [],
      existingQuotations: [],
      existingSalesOrders: [],
      existingSalesInvoices: [],
      deletedLeadIds: deletedLeads
    });
  }, []);

  const [leads, setLeads] = useState<Lead[]>(() => {
    const deleted = getDeletedIds('leads');
    const recovered = recoverLegacyLocalStorageArray('leads', INITIAL_LEADS, deleted).filter(
      l => !deleted.has(l.id) && !LEGACY_DUMMY_IDS.has(l.id) && !isObsoleteReconstructedSchoolId(l.id)
    );
    const base = recovered.length >= 48 ? recovered : initialSchoolSeed.leads;
    return dedupeById(base);
  });

  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    const deleted = getDeletedIds('quotations');
    const recovered = recoverLegacyLocalStorageArray('quotations', INITIAL_QUOTATIONS, deleted).filter(
      q => !deleted.has(q.id) && !LEGACY_DUMMY_IDS.has(q.id) && !isObsoleteReconstructedSchoolId(q.id)
    );
    const base = recovered.length >= 46 ? recovered : initialSchoolSeed.quotations;
    return dedupeById(base);
  });

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    const deleted = getDeletedIds('sales_orders');
    const recovered = recoverLegacyLocalStorageArray('so', INITIAL_SALES_ORDERS, deleted).filter(
      so => !deleted.has(so.id) && !LEGACY_DUMMY_IDS.has(so.id) && !isObsoleteReconstructedSchoolId(so.id)
    );
    const base = recovered.length >= 36 ? recovered : initialSchoolSeed.salesOrders;
    return dedupeById(base);
  });

  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>(() => {
    const deleted = getDeletedIds('sales_invoices');
    const recovered = recoverLegacyLocalStorageArray('invoices', INITIAL_SALES_INVOICES, deleted).filter(
      inv => !deleted.has(inv.id) && !LEGACY_DUMMY_IDS.has(inv.id) && !isObsoleteReconstructedSchoolId(inv.id)
    );
    const base = recovered.length >= 36 ? recovered : initialSchoolSeed.salesInvoices;
    return dedupeById(base);
  });

  const [vendors, setVendors] = useState<Vendor[]>(() => {
    const deleted = getDeletedIds('vendors');
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}vendors`);
    const list: Vendor[] = saved ? JSON.parse(saved) : INITIAL_VENDORS;
    return dedupeById(list.filter(v => !deleted.has(v.id) && !LEGACY_DUMMY_IDS.has(v.id)));
  });

  const [purchaseRequisitions, setPurchaseRequisitions] = useState<PurchaseRequisition[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}pr`);
    const list: PurchaseRequisition[] = saved ? JSON.parse(saved) : INITIAL_PURCHASE_REQUISITIONS;
    return dedupeById(list.filter(pr => !LEGACY_DUMMY_IDS.has(pr.id)));
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}po`);
    const list: PurchaseOrder[] = saved ? JSON.parse(saved) : INITIAL_PURCHASE_ORDERS;
    return dedupeById(list.filter(po => !LEGACY_DUMMY_IDS.has(po.id)));
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}inventory`);
    const list: InventoryItem[] = saved ? JSON.parse(saved) : INITIAL_INVENTORY;
    return dedupeById(list.filter(item => !LEGACY_DUMMY_IDS.has(item.id)));
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}movements`);
    const list: StockMovement[] = saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
    return dedupeById(list.filter(sm => !LEGACY_DUMMY_IDS.has(sm.id)));
  });

  const [stockOpnames, setStockOpnames] = useState<StockOpname[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}opnames`);
    const list: StockOpname[] = saved ? JSON.parse(saved) : INITIAL_STOCK_OPNAMES;
    return dedupeById(list.filter(op => !LEGACY_DUMMY_IDS.has(op.id)));
  });

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reports`);
    const list: ScheduledReport[] = saved ? JSON.parse(saved) : INITIAL_SCHEDULED_REPORTS;
    return dedupeById(list.filter(r => !LEGACY_DUMMY_IDS.has(r.id)));
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}audit`);
    return dedupeById(saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS);
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}company_profile`);
    const parsed: CompanyProfile = saved ? JSON.parse(saved) : INITIAL_COMPANY_PROFILE;
    if (parsed.defaultBankAccount) {
      parsed.defaultBankAccount = simulateDecrypt(parsed.defaultBankAccount);
    }
    return parsed;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
    return dedupeById(saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS);
  });

  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}recurring_bills`);
    const list: RecurringBill[] = saved ? JSON.parse(saved) : INITIAL_RECURRING_BILLS;
    return dedupeById(list.filter(rb => !LEGACY_DUMMY_IDS.has(rb.id)));
  });

  const [paymentProofs, setPaymentProofs] = useState<PaymentProof[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}payment_proofs`);
    const list: PaymentProof[] = saved ? JSON.parse(saved) : INITIAL_PAYMENT_PROOFS;
    return dedupeById(list.filter(p => !LEGACY_DUMMY_IDS.has(p.id)));
  });

  const [pettyCashWallets, setPettyCashWallets] = useState<PettyCashWallet[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}petty_cash_wallets`);
    const list: PettyCashWallet[] = saved ? JSON.parse(saved) : INITIAL_PETTY_CASH_WALLETS;
    return dedupeById(list.filter(w => !LEGACY_DUMMY_IDS.has(w.id)));
  });

  const [pettyCashExpenses, setPettyCashExpenses] = useState<PettyCashExpense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}petty_cash_expenses`);
    const list: PettyCashExpense[] = saved ? JSON.parse(saved) : INITIAL_PETTY_CASH_EXPENSES;
    return dedupeById(list.filter(e => !LEGACY_DUMMY_IDS.has(e.id)));
  });

  const [reimbursementClaims, setReimbursementClaims] = useState<ReimbursementClaim[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reimbursement_claims`);
    const list: ReimbursementClaim[] = saved ? JSON.parse(saved) : INITIAL_RECURRING_BILLS && INITIAL_REIMBURSEMENT_CLAIMS;
    return dedupeById(list.filter(c => !LEGACY_DUMMY_IDS.has(c.id)));
  });

  const [packageSimulations, setPackageSimulations] = useState<PackageCostingSimulation[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}costing_simulations`);
    const list: PackageCostingSimulation[] = saved ? JSON.parse(saved) : INITIAL_PACKAGE_SIMULATIONS;
    return dedupeById(list.filter(s => !LEGACY_DUMMY_IDS.has(s.id)));
  });

  const [debts, setDebts] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}debts`);
    const list: DebtRecord[] = saved ? JSON.parse(saved) : INITIAL_DEBTS;
    return dedupeById(list.filter(d => !LEGACY_DUMMY_IDS.has(d.id)));
  });

  const [sheetSyncConfigs, setSheetSyncConfigs] = useState<GoogleSheetSyncConfig[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}sheets_sync_configs`);
    try {
      const list: GoogleSheetSyncConfig[] = saved ? JSON.parse(saved) : [];
      return dedupeById(list);
    } catch (e) {
      return [];
    }
  });

  const [showNotificationCenterModal, setShowNotificationCenterModal] = useState<boolean>(false);
  const [selectedReviewItem, setSelectedReviewItem] = useState<{ type: 'quotation' | 'pr' | 'opname' | 'cash'; id: string } | null>(null);

  // Derived current user (always fallback safely to INITIAL_USERS[0] if users list is temporarily empty)
  const currentUser = users.find(u => u.id === currentUserId) || users[0] || INITIAL_USERS[0];

  // ---------------- FIRESTORE REALTIME SYNC LISTENERS ----------------
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const handleSyncStatus = (status: boolean) => {
      setIsCloudSynced(status);
    };

    unsubs.push(subscribeToQuotaStatus(setIsQuotaExceeded));

    // Synchronize collections with Firestore and keep local storage cached (debounced)
    unsubs.push(subscribeToCollection('leads', (data) => {
      const clean = data.filter(l => !LEGACY_DUMMY_IDS.has(l.id) && !isObsoleteReconstructedSchoolId(l.id));
      if (clean.length > 0) {
        setLeads(clean);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}leads`, clean);
      }
    }, INITIAL_LEADS, handleSyncStatus));

    unsubs.push(subscribeToCollection('notifications', (data) => {
      setNotifications(data);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}notifications`, data);
    }, INITIAL_NOTIFICATIONS, handleSyncStatus));

    unsubs.push(subscribeToCollection('recurring_bills', (data) => {
      const clean = data.filter(b => !LEGACY_DUMMY_IDS.has(b.id));
      setRecurringBills(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}recurring_bills`, clean);
    }, INITIAL_RECURRING_BILLS, handleSyncStatus));

    unsubs.push(subscribeToCollection('cash_transactions', (data) => {
      const isPurgeDone = Boolean(localStorage.getItem('DKANDANG_OUTFLOW_PURGE_V1_COMPLETED'));
      const deleted = getDeletedIds('cash_transactions');
      const existingIds = new Set(data.map(t => t.id));
      const merged = [...data];
      for (const initTx of INITIAL_CASH_TRANSACTIONS) {
        if (!existingIds.has(initTx.id) && !deleted.has(initTx.id)) {
          merged.push(initTx);
        }
      }
      const seen = new Set<string>();
      const clean = merged.filter(t => {
        if (!t.id || seen.has(t.id) || deleted.has(t.id)) return false;
        if (String(t.id).startsWith('tx_exp_')) return false;
        if (!isPurgeDone && t.type === 'outflow') return false;
        seen.add(t.id);
        return true;
      });
      setCashTransactions(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, clean);
    }, INITIAL_CASH_TRANSACTIONS, handleSyncStatus));

    unsubs.push(subscribeToCollection('bank_accounts', (data) => {
      const deleted = getDeletedIds('bank_accounts');
      const sanitized = data
        .filter(b => !LEGACY_DUMMY_IDS.has(b.id) && !deleted.has(b.id))
        .map(b => ({
          ...b,
          accountNumber: simulateDecrypt(b.accountNumber)
        }));
      const mergedBanks = mergeWithCoreBankAccounts(sanitized, deleted, LEGACY_DUMMY_IDS);
      const synced = syncRestrictedPoolBalance(mergedBanks);
      setBankAccounts(synced);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, synced);
    }, INITIAL_BANK_ACCOUNTS, handleSyncStatus));

    unsubs.push(subscribeToCollection('quotations', (data) => {
      const clean = data.filter(q => !LEGACY_DUMMY_IDS.has(q.id) && !isObsoleteReconstructedSchoolId(q.id));
      if (clean.length > 0) {
        setQuotations(clean);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}quotations`, clean);
      }
    }, INITIAL_QUOTATIONS, handleSyncStatus));

    unsubs.push(subscribeToCollection('sales_orders', (data) => {
      const clean = data.filter(so => !LEGACY_DUMMY_IDS.has(so.id) && !isObsoleteReconstructedSchoolId(so.id));
      if (clean.length > 0) {
        setSalesOrders(clean);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}so`, clean);
      }
    }, INITIAL_SALES_ORDERS, handleSyncStatus));

    unsubs.push(subscribeToCollection('sales_invoices', (data) => {
      const clean = data.filter(inv => !LEGACY_DUMMY_IDS.has(inv.id) && !isObsoleteReconstructedSchoolId(inv.id));
      if (clean.length > 0) {
        setSalesInvoices(clean);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}invoices`, clean);
      }
    }, INITIAL_SALES_INVOICES, handleSyncStatus));

    unsubs.push(subscribeToCollection('budgets', (data) => {
      const deleted = getDeletedIds('budgets');
      const mergedBudgets = mergeWithCoreBudgets(data, deleted);
      setBudgetAllocations(mergedBudgets);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, mergedBudgets);
    }, INITIAL_BUDGETS, handleSyncStatus));

    unsubs.push(subscribeToCollection('coa', (data) => {
      const mergedCOA = mergeWithCoreCOA(data);
      setChartOfAccounts(mergedCOA);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, mergedCOA);
    }, INITIAL_COA, handleSyncStatus));

    unsubs.push(subscribeToCollection('journal', (data) => {
      setJournalEntries(data);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, data);
    }, INITIAL_JOURNAL_ENTRIES, handleSyncStatus));

    unsubs.push(subscribeToCollection('accounting_periods', (data) => {
      setAccountingPeriods(data);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}accounting_periods`, data);
    }, [], handleSyncStatus));

    unsubs.push(subscribeToCollection('marketing', (data) => {
      setMarketingCampaigns(data);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}marketing`, data);
    }, INITIAL_MARKETING_CAMPAIGNS, handleSyncStatus));

    unsubs.push(subscribeToCollection('vendors', (data) => {
      const clean = data.filter(v => !LEGACY_DUMMY_IDS.has(v.id));
      setVendors(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}vendors`, clean);
    }, INITIAL_VENDORS, handleSyncStatus));

    unsubs.push(subscribeToCollection('purchase_requisitions', (data) => {
      const clean = data.filter(pr => !LEGACY_DUMMY_IDS.has(pr.id));
      setPurchaseRequisitions(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}pr`, clean);
    }, INITIAL_PURCHASE_REQUISITIONS, handleSyncStatus));

    unsubs.push(subscribeToCollection('purchase_orders', (data) => {
      const clean = data.filter(po => !LEGACY_DUMMY_IDS.has(po.id));
      setPurchaseOrders(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}po`, clean);
    }, INITIAL_PURCHASE_ORDERS, handleSyncStatus));

    unsubs.push(subscribeToCollection('inventory', (data) => {
      const clean = data.filter(item => !LEGACY_DUMMY_IDS.has(item.id));
      setInventory(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}inventory`, clean);
    }, INITIAL_INVENTORY, handleSyncStatus));

    unsubs.push(subscribeToCollection('stock_movements', (data) => {
      const clean = data.filter(sm => !LEGACY_DUMMY_IDS.has(sm.id));
      setStockMovements(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}movements`, clean);
    }, INITIAL_STOCK_MOVEMENTS, handleSyncStatus));

    unsubs.push(subscribeToCollection('stock_opnames', (data) => {
      const clean = data.filter(op => !LEGACY_DUMMY_IDS.has(op.id));
      setStockOpnames(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}opnames`, clean);
    }, INITIAL_STOCK_OPNAMES, handleSyncStatus));

    unsubs.push(subscribeToCollection('reports', (data) => {
      const clean = data.filter(r => !LEGACY_DUMMY_IDS.has(r.id));
      setScheduledReports(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}reports`, clean);
    }, INITIAL_SCHEDULED_REPORTS, handleSyncStatus));

    unsubs.push(subscribeToCollection('audit_logs', (data) => {
      setAuditLogs(data);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}audit`, data);
    }, INITIAL_AUDIT_LOGS, handleSyncStatus));

    unsubs.push(subscribeToCollection('users', (data) => {
      const mergedUsers = mergeWithInitialUsers(data);
      setUsers(mergedUsers);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}users`, mergedUsers);
    }, INITIAL_USERS, handleSyncStatus));

    unsubs.push(subscribeToCollection('company_profile', (data) => {
      if (data && data.length > 0) {
        const prof = data[0] as CompanyProfile;
        const sanitized = {
          ...prof,
          defaultBankAccount: prof.defaultBankAccount ? simulateDecrypt(prof.defaultBankAccount) : prof.defaultBankAccount
        };
        setCompanyProfile(sanitized);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}company_profile`, sanitized);
      }
    }, [INITIAL_COMPANY_PROFILE], handleSyncStatus));

    unsubs.push(subscribeToCollection('payment_proofs', (data) => {
      const clean = data.filter(p => !LEGACY_DUMMY_IDS.has(p.id));
      setPaymentProofs(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}payment_proofs`, clean);
    }, INITIAL_PAYMENT_PROOFS, handleSyncStatus));

    unsubs.push(subscribeToCollection('petty_cash_wallets', (data) => {
      const clean = data.filter(w => !LEGACY_DUMMY_IDS.has(w.id));
      setPettyCashWallets(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}petty_cash_wallets`, clean);
    }, INITIAL_PETTY_CASH_WALLETS, handleSyncStatus));

    unsubs.push(subscribeToCollection('petty_cash_expenses', (data) => {
      const clean = data.filter(e => !LEGACY_DUMMY_IDS.has(e.id));
      setPettyCashExpenses(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}petty_cash_expenses`, clean);
    }, INITIAL_PETTY_CASH_EXPENSES, handleSyncStatus));

    unsubs.push(subscribeToCollection('reimbursement_claims', (data) => {
      const clean = data.filter(c => !LEGACY_DUMMY_IDS.has(c.id));
      setReimbursementClaims(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}reimbursement_claims`, clean);
    }, INITIAL_REIMBURSEMENT_CLAIMS, handleSyncStatus));

    unsubs.push(subscribeToCollection('costing_simulations', (data) => {
      const clean = data.filter(s => !LEGACY_DUMMY_IDS.has(s.id));
      setPackageSimulations(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}costing_simulations`, clean);
    }, INITIAL_PACKAGE_SIMULATIONS, handleSyncStatus));

    unsubs.push(subscribeToCollection('debts', (data) => {
      const clean = dedupeById(data.filter(d => !LEGACY_DUMMY_IDS.has(d.id)));
      setDebts(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}debts`, clean);
    }, INITIAL_DEBTS, handleSyncStatus));

    unsubs.push(subscribeToCollection('sheets_sync_configs', (data) => {
      const clean = dedupeById(data);
      setSheetSyncConfigs(clean);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}sheets_sync_configs`, clean);
    }, [], handleSyncStatus));

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, []);

  // Save authentication & session state to sessionStorage (Anti Auto-Login: session-only)
  useEffect(() => {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_session`);
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, currentUserId);
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}auth_session`, isAuthenticated ? 'true' : 'false');
    } catch (e) {
      console.warn('[SessionStorage] Error saving session:', e);
    }
  }, [currentUserId, isAuthenticated]);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => prev?.message === message ? null : prev);
    }, 4500);
  };

  // ---------------- NOTIFICATION SYSTEM AUTOMATION ----------------
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const pendingApprovalsCount = notifications.filter(n => n.type === 'approval_request' && n.actionStatus === 'pending').length;

  const createNotification = async (notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): Promise<AppNotification> => {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notifData
    };

    setNotifications(prev => {
      // Remove stale duplicate if exact reference already exists in pending state
      const filtered = prev.filter(n => {
        if (notifData.referenceNumber && n.referenceNumber === notifData.referenceNumber && n.type === notifData.type && n.actionStatus === 'pending' && notifData.actionStatus === 'pending') {
          return false;
        }
        return true;
      });
      const updated = [newNotif, ...filtered];
      localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(updated));
      return updated;
    });

    await saveDocument('notifications', newNotif);

    // Audio Chime Alert
    if (notifData.type === 'approval_request' || notifData.urgency === 'urgent' || notifData.urgency === 'high') {
      soundManager.playApprovalAlert();
    } else if (notifData.type === 'approval_status' && notifData.actionStatus === 'approved') {
      soundManager.playSuccessTone();
    }

    return newNotif;
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(updated));
      return updated;
    });
    const target = notifications.find(n => n.id === id);
    if (target) {
      await saveDocument('notifications', { ...target, read: true });
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(updated));
      return updated;
    });
    for (const notif of notifications) {
      if (!notif.read) {
        await saveDocument('notifications', { ...notif, read: true });
      }
    }
    showNotification('Semua notifikasi ditandai telah dibaca', 'info');
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(updated));
      return updated;
    });
    await deleteDocument('notifications', id);
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}notifications`);
    await clearCollection('notifications');
    showNotification('Seluruh riwayat notifikasi telah dibersihkan', 'info');
  };

  const quickApproveFromNotification = async (notificationId: string): Promise<{ success: boolean; message: string }> => {
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return { success: false, message: 'Notifikasi tidak ditemukan' };

    const canApprove = checkPermission(notif.module, 'approve') || currentUser.role === 'direktur_utama' || currentUser.role === 'super_admin';
    if (!canApprove) {
      showNotification('Akses Ditolak: Anda tidak memiliki wewenang otorisasi untuk menyetujui permintaan ini!', 'error');
      return { success: false, message: 'Akses Ditolak: Tidak memiliki wewenang approval' };
    }

    if (notif.category === 'quotation') {
      const targetQuote = quotations.find(q => (notif.referenceId && q.id === notif.referenceId) || (notif.referenceNumber && q.quotationNumber === notif.referenceNumber));
      if (!targetQuote) return { success: false, message: 'Data Surat Penawaran tidak ditemukan' };

      await approveQuotation(targetQuote.id, 'Disetujui cepat via Pusat Notifikasi & Pengingat Otomatis');
      const updatedNotif: AppNotification = { ...notif, actionStatus: 'approved', read: true };
      setNotifications(prev => prev.map(n => n.id === notif.id ? updatedNotif : n));
      await saveDocument('notifications', updatedNotif);
      return { success: true, message: `Surat Penawaran ${targetQuote.quotationNumber} berhasil disetujui!` };
    }

    if (notif.category === 'purchase_requisition') {
      const targetPR = purchaseRequisitions.find(p => (notif.referenceId && p.id === notif.referenceId) || (notif.referenceNumber && p.prNumber === notif.referenceNumber));
      if (!targetPR) return { success: false, message: 'Data Pengajuan Pembelian tidak ditemukan' };

      await approvePurchaseRequisition(targetPR.id);
      const updatedNotif: AppNotification = { ...notif, actionStatus: 'approved', read: true };
      setNotifications(prev => prev.map(n => n.id === notif.id ? updatedNotif : n));
      await saveDocument('notifications', updatedNotif);
      return { success: true, message: `Pengajuan PR ${targetPR.prNumber} berhasil disetujui!` };
    }

    if (notif.category === 'stock_opname') {
      const targetOpn = stockOpnames.find(o => (notif.referenceId && o.id === notif.referenceId) || (notif.referenceNumber && o.opnameNumber === notif.referenceNumber));
      if (targetOpn) {
        const updatedOpn: StockOpname = { ...targetOpn, status: 'completed' };
        setStockOpnames(prev => prev.map(o => o.id === targetOpn.id ? updatedOpn : o));
        await saveDocument('stock_opnames', updatedOpn);
        const updatedNotif: AppNotification = { ...notif, actionStatus: 'approved', read: true };
        setNotifications(prev => prev.map(n => n.id === notif.id ? updatedNotif : n));
        await saveDocument('notifications', updatedNotif);
        showNotification(`Stock Opname ${targetOpn.opnameNumber} telah disetujui!`, 'success');
        return { success: true, message: `Stock Opname ${targetOpn.opnameNumber} telah disetujui!` };
      }
    }

    const updatedNotif: AppNotification = { ...notif, actionStatus: 'approved', read: true };
    setNotifications(prev => prev.map(n => n.id === notif.id ? updatedNotif : n));
    await saveDocument('notifications', updatedNotif);
    return { success: true, message: 'Permintaan berhasil disetujui' };
  };

  const quickRejectFromNotification = async (notificationId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return { success: false, message: 'Notifikasi tidak ditemukan' };

    if (notif.category === 'quotation') {
      const targetQuote = quotations.find(q => (notif.referenceId && q.id === notif.referenceId) || (notif.referenceNumber && q.quotationNumber === notif.referenceNumber));
      if (targetQuote) {
        await rejectQuotation(targetQuote.id, reason || 'Ditolak / diminta penyesuaian via Pusat Notifikasi');
      }
    }

    const updatedNotif: AppNotification = { ...notif, actionStatus: 'rejected', read: true };
    setNotifications(prev => prev.map(n => n.id === notif.id ? updatedNotif : n));
    await saveDocument('notifications', updatedNotif);
    return { success: true, message: 'Permintaan telah ditolak / diminta revisi' };
  };

  // ---------------- AUTOMATION ENGINE: AUTO APPROVAL NOTIFICATIONS RECONCILER ----------------
  useEffect(() => {
    // 1. Scan pending quotations
    quotations.forEach(q => {
      if (q.status === 'pending_approval') {
        const hasPendingNotif = notifications.some(
          n => n.category === 'quotation' && 
               (n.referenceNumber === q.quotationNumber || n.referenceId === q.id) && 
               n.actionStatus === 'pending'
        );
        if (!hasPendingNotif) {
          const grandTotal = q.grandTotal || 0;
          createNotification({
            title: `🔔 Permintaan Approval Surat Penawaran`,
            message: `Penawaran ${q.quotationNumber} untuk ${q.companyName} (${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(grandTotal)}) diajukan oleh ${q.preparedBy || 'Sales'} dan menunggu persetujuan Direksi.`,
            type: 'approval_request',
            category: 'quotation',
            referenceId: q.id,
            referenceNumber: q.quotationNumber,
            module: 'sales',
            requiresAction: true,
            actionStatus: 'pending',
            urgency: grandTotal > 20000000 ? 'urgent' : 'high',
            targetRoles: ['direktur_utama', 'super_admin', 'sales_director'],
            createdBy: q.preparedBy || 'Sales Executive',
            creatorDepartment: 'Sales & Marketing',
            amount: grandTotal,
            metadata: { leadId: q.leadId, companyName: q.companyName }
          });
        }
      }
    });

    // 2. Scan pending purchase requisitions (PR)
    purchaseRequisitions.forEach(pr => {
      if (pr.status === 'pending') {
        const hasPendingNotif = notifications.some(
          n => n.category === 'purchase_requisition' && 
               (n.referenceNumber === pr.prNumber || n.referenceId === pr.id) && 
               n.actionStatus === 'pending'
        );
        if (!hasPendingNotif) {
          const estCost = pr.estimatedTotalCost || pr.items.reduce((acc, it) => acc + (it.quantity * it.estimatedCost), 0);
          createNotification({
            title: `🔔 Permintaan Approval Pengadaan Barang (PR)`,
            message: `Pengajuan ${pr.prNumber} (${pr.department} - ${pr.items.length} item, est. ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(estCost)}) diajukan oleh ${pr.requester} dan menunggu otorisasi Purchasing/Direksi.`,
            type: 'approval_request',
            category: 'purchase_requisition',
            referenceId: pr.id,
            referenceNumber: pr.prNumber,
            module: 'procurement',
            requiresAction: true,
            actionStatus: 'pending',
            urgency: estCost > 15000000 ? 'urgent' : 'high',
            targetRoles: ['direktur_utama', 'super_admin', 'procurement_logistics', 'purchasing_officer'],
            createdBy: pr.requester,
            creatorDepartment: pr.department,
            amount: estCost
          });
        }
      }
    });

    // 3. Scan pending stock opnames
    stockOpnames.forEach(opn => {
      if (opn.status === 'pending_approval' && opn.discrepancyCount > 0) {
        const hasPendingNotif = notifications.some(
          n => n.category === 'stock_opname' && 
               (n.referenceNumber === opn.opnameNumber || n.referenceId === opn.id) && 
               n.actionStatus === 'pending'
        );
        if (!hasPendingNotif) {
          createNotification({
            title: `⚠️ Permintaan Approval Selisih Stock Opname`,
            message: `Pemeriksaan stok ${opn.opnameNumber} di ${opn.warehouse} menemukan selisih ${opn.discrepancyCount} SKU (nilai varians ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Math.abs(opn.totalVarianceValue))}). Menunggu verifikasi Direksi/Audit.`,
            type: 'approval_request',
            category: 'stock_opname',
            referenceId: opn.id,
            referenceNumber: opn.opnameNumber,
            module: 'warehouse',
            requiresAction: true,
            actionStatus: 'pending',
            urgency: 'urgent',
            targetRoles: ['direktur_utama', 'super_admin', 'internal_auditor'],
            createdBy: opn.auditor,
            creatorDepartment: 'Gudang & Logistik',
            amount: Math.abs(opn.totalVarianceValue)
          });
        }
      }
    });
  }, [quotations.length, purchaseRequisitions.length, stockOpnames.length]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const checkPermission = (module: ModuleType, action: keyof Permission | 'read'): boolean => {
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[currentUser?.role || 'super_admin'];
    if (!rolePermissions || !rolePermissions[module]) return false;
    const targetAction: keyof Permission = (action === 'read' ? 'view' : action) as keyof Permission;
    return Boolean(rolePermissions[module][targetAction]);
  };

  const login = async (usernameInput: string, passwordInput: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    const activeUserPool = mergeWithInitialUsers(users);
    const targetUser = activeUserPool.find(u =>
      (u.username || '').trim().toLowerCase() === cleanUsername ||
      (u.email || '').trim().toLowerCase() === cleanUsername ||
      (u.id || '').trim().toLowerCase() === cleanUsername
    );

    if (!targetUser) {
      showNotification('Username / ID Akun tidak ditemukan di basis data ERP!', 'error');
      try {
        await addAuditLogInternal(
          'LOGIN_FAILED_UNKNOWN_USER',
          'security',
          `Percobaan login gagal: Username "${usernameInput}" tidak terdaftar.`,
          currentUser || INITIAL_USERS[0]
        );
      } catch (e) {}
      return { success: false, message: 'Username tidak terdaftar pada sistem.' };
    }

    const canonicalInitUser = INITIAL_USERS.find(
      u => u.id === targetUser.id || u.username.toLowerCase() === targetUser.username.toLowerCase()
    );
    const isPasswordValid =
      (targetUser.password || '').trim() === cleanPassword ||
      (canonicalInitUser && canonicalInitUser.password.trim() === cleanPassword);

    if (!isPasswordValid) {
      showNotification('Kata sandi salah! Akses ditolak demi keamanan data.', 'error');
      try {
        await addAuditLogInternal(
          'LOGIN_FAILED_BAD_PASSWORD',
          'security',
          `Percobaan login gagal untuk user ${targetUser.username} (${targetUser.name}): Password salah.`,
          targetUser
        );
      } catch (e) {}
      return { success: false, message: 'Kata sandi tidak sesuai. Periksa huruf besar/kecil & simbol.' };
    }

    // Login successful — update state & sessionStorage immediately
    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...(canonicalInitUser || targetUser),
      ...targetUser,
      password: canonicalInitUser?.password || targetUser.password,
      lastLogin: nowIso
    };

    setCurrentUserId(updatedUser.id);
    setIsAuthenticated(true);
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}current_user`, updatedUser.id);
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}auth_session`, 'true');
    } catch (e) {}

    setUsers(prev => {
      const merged = mergeWithInitialUsers(prev).map(u => u.id === updatedUser.id ? updatedUser : u);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}users`, merged);
      return merged;
    });

    showNotification(`Selamat datang, ${updatedUser.name}! Anda masuk sebagai ${updatedUser.role}.`, 'success');

    // Sync lastLogin and audit log asynchronously without blocking login
    saveDocument('users', updatedUser).catch(err => {
      console.warn('[login] Gagal sinkronisasi lastLogin ke Firestore:', err);
    });
    addAuditLogInternal(
      'LOGIN_SUCCESS',
      'security',
      `Otorisasi berhasil: ${updatedUser.name} (${updatedUser.department}) memulai sesi aktif.`,
      updatedUser
    ).catch(() => {});

    return { success: true, user: updatedUser };
  };

  const logout = async () => {
    const prevUser = currentUser || INITIAL_USERS[0];
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_session`);
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_session`);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_user`);
    } catch (e) {}
    showNotification('Sesi berhasil dikunci & logout. Silakan login kembali untuk mengakses data.', 'info');
    try {
      await addAuditLogInternal(
        'LOGOUT',
        'security',
        `Pengguna ${prevUser.name} (${prevUser.username}) mengunci sesi / keluar aplikasi.`,
        prevUser
      );
    } catch (e) {}
  };

  const switchUser = async (userId: string) => {
    const activeUserPool = mergeWithInitialUsers(users);
    const target = activeUserPool.find(u => u.id === userId);
    if (!target) return;
    setCurrentUserId(userId);
    showNotification(`Beralih profil ke ${target.name} (${target.department})`, 'info');
    addAuditLogInternal('USER_SWITCH', 'security', `Beralih sesi aktif ke user ${target.name} (Peran: ${target.role})`, target).catch(() => {});
  };

  const switchUserWithAuth = async (userId: string, passwordInput: string): Promise<{ success: boolean; message?: string }> => {
    const activeUserPool = mergeWithInitialUsers(users);
    const target = activeUserPool.find(u => u.id === userId);
    if (!target) {
      return { success: false, message: 'Pengguna target tidak ditemukan.' };
    }

    const cleanPassword = passwordInput.trim();
    const canonicalInitUser = INITIAL_USERS.find(
      u => u.id === target.id || u.username.toLowerCase() === target.username.toLowerCase()
    );
    const isPasswordValid =
      (target.password || '').trim() === cleanPassword ||
      (canonicalInitUser && canonicalInitUser.password.trim() === cleanPassword);

    if (!isPasswordValid) {
      showNotification('Kata sandi otorisasi salah! Ganti akun dibatalkan demi keamanan data.', 'error');
      try {
        await addAuditLogInternal(
          'SWITCH_USER_DENIED',
          'security',
          `Peringatan: Gagal verifikasi sandi saat mencoba ganti akun ke ${target.username} (${target.name}).`,
          currentUser || INITIAL_USERS[0]
        );
      } catch (e) {}
      return { success: false, message: 'Kata sandi tidak sesuai. Akses ke akun ini ditolak.' };
    }

    const nowIso = new Date().toISOString();
    const updatedUser: User = {
      ...(canonicalInitUser || target),
      ...target,
      password: canonicalInitUser?.password || target.password,
      lastLogin: nowIso
    };

    setCurrentUserId(userId);
    setUsers(prev => {
      const merged = mergeWithInitialUsers(prev).map(u => u.id === userId ? updatedUser : u);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}users`, merged);
      return merged;
    });

    showNotification(`Otorisasi terverifikasi: Beralih ke ${updatedUser.name} (${updatedUser.department})`, 'success');

    saveDocument('users', updatedUser).catch(() => {});
    addAuditLogInternal(
      'SWITCH_USER_SUCCESS',
      'security',
      `Berhasil verifikasi password & beralih ke akun ${updatedUser.username} (${updatedUser.name}).`,
      updatedUser
    ).catch(() => {});

    return { success: true };
  };

  const updateUserRole = async (userId: string, newRole: Role) => {
    const activeUserPool = mergeWithInitialUsers(users);
    const targetUser = activeUserPool.find(u => u.id === userId);
    if (targetUser) {
      const updated = { ...targetUser, role: newRole };
      setUsers(prev => mergeWithInitialUsers(prev).map(u => u.id === userId ? updated : u));
      await saveDocument('users', updated);
    }
    showNotification('Hak akses peran pengguna berhasil diperbarui', 'success');
    await addAuditLogInternal('ROLE_UPDATED', 'security', `Memperbarui wewenang user ${userId} menjadi ${newRole}`);
  };

  const addAuditLogInternal = async (
    action: string,
    module: ModuleType,
    details: string,
    actingUser = currentUser
  ) => {
    const safeUser = actingUser || INITIAL_USERS[0];
    const timestamp = new Date().toISOString();
    const payload = `${timestamp}::${safeUser.id}::${action}::${module}::${details}`;
    const hash = await generateSHA256(payload);

    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp,
      userId: safeUser.id,
      userName: safeUser.name,
      userRole: safeUser.role,
      action,
      module,
      details,
      ipAddress: '192.168.10.124',
      integrityHash: hash,
      isEncrypted: true
    };

    setAuditLogs(prev => [newLog, ...prev]);
    await saveDocument('audit_logs', newLog);
  };

  const addAuditLog = async (action: string, module: ModuleType, details: string) => {
    await addAuditLogInternal(action, module, details);
  };

  // ---------------- BANK ACCOUNT MANAGEMENT (DIREKTUR UTAMA) ----------------

  const addBankAccount = async (bankData: Omit<BankAccount, 'id'>): Promise<{ success: boolean; message?: string }> => {
    if (currentUser.role !== 'direktur_utama') {
      showNotification('Akses Ditolak: Hanya Direktur Utama yang berwenang menambah data rekening bank perusahaan!', 'error');
      await addAuditLogInternal(
        'UNAUTHORIZED_BANK_CREATE_ATTEMPT',
        'security',
        `Peringatan Keamanan: Percobaan penambahan rekening bank "${bankData.bankName}" oleh ${currentUser.name} (${currentUser.role}) ditolak.`
      );
      return { success: false, message: 'Hanya Direktur Utama yang memiliki wewenang untuk menambah data rekening bank.' };
    }

    const newId = `bank_${Date.now()}`;
    const cleanNumber = simulateDecrypt(bankData.accountNumber.trim());

    const newBank: BankAccount = {
      ...bankData,
      id: newId,
      accountNumber: cleanNumber
    };

    setBankAccounts(prev => [...prev, newBank]);
    await saveDocument('bank_accounts', newBank);

    showNotification(`Rekening Bank "${bankData.bankName}" berhasil didaftarkan oleh Direktur Utama`, 'success');
    await addAuditLogInternal(
      'BANK_ACCOUNT_CREATED',
      'finance',
      `Direktur Utama ${currentUser.name} mendaftarkan rekening bank baru: ${bankData.bankName}`
    );
    return { success: true };
  };

  const updateBankAccount = async (id: string, updates: Partial<BankAccount>): Promise<{ success: boolean; message?: string }> => {
    if (currentUser.role !== 'direktur_utama') {
      showNotification('Akses Ditolak: Hanya Direktur Utama yang berwenang mengubah data rekening bank perusahaan!', 'error');
      return { success: false, message: 'Hanya Direktur Utama yang memiliki wewenang untuk mengubah data rekening bank.' };
    }

    const target = bankAccounts.find(b => b.id === id);
    if (!target) {
      return { success: false, message: 'Data rekening bank tidak ditemukan.' };
    }

    let finalAccountNumber = updates.accountNumber;
    if (finalAccountNumber) {
      finalAccountNumber = simulateDecrypt(finalAccountNumber.trim());
    }

    const updatedBank: BankAccount = {
      ...target,
      ...updates,
      ...(finalAccountNumber ? { accountNumber: finalAccountNumber } : {})
    };

    setBankAccounts(prev => {
      const intermediate = prev.map(b => b.id === id ? updatedBank : b);
      const synced = syncRestrictedPoolBalance(intermediate);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(synced)); } catch (e) {}
      saveMultipleDocuments('bank_accounts', synced);
      return synced;
    });

    showNotification(`Data rekening bank "${updates.bankName || target.bankName}" berhasil diperbarui`, 'success');
    await addAuditLogInternal('BANK_ACCOUNT_UPDATED', 'finance', `Direktur Utama ${currentUser.name} memperbarui rekening: ${target.bankName}`);
    return { success: true };
  };

  const deleteBankAccount = async (id: string): Promise<{ success: boolean; message?: string }> => {
    if (currentUser.role !== 'direktur_utama') {
      showNotification('Akses Ditolak: Hanya Direktur Utama yang berwenang menghapus rekening bank perusahaan!', 'error');
      return { success: false, message: 'Hanya Direktur Utama yang memiliki wewenang untuk menghapus data rekening bank.' };
    }

    const target = bankAccounts.find(b => b.id === id);
    if (!target) {
      return { success: false, message: 'Data rekening bank tidak ditemukan.' };
    }

    setBankAccounts(prev => {
      const remaining = prev.filter(b => b.id !== id);
      const synced = syncRestrictedPoolBalance(remaining);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(synced)); } catch (e) {}
      saveMultipleDocuments('bank_accounts', synced);
      return synced;
    });
    await deleteDocument('bank_accounts', id);

    showNotification(`Rekening bank "${target.bankName}" berhasil dihapus`, 'info');
    await addAuditLogInternal('BANK_ACCOUNT_DELETED', 'finance', `Direktur Utama ${currentUser.name} menghapus rekening: ${target.bankName}`);
    return { success: true };
  };

  // ---------------- CROSS-MODULE WORKFLOW ACTIONS ----------------

  const findTargetBankAccount = (accounts: BankAccount[], accountIdentifier?: string): BankAccount | undefined => {
    if (!accounts || accounts.length === 0) return undefined;
    const matched = matchBankAccount(accounts, accountIdentifier);
    if (matched) return matched;
    const activeAccounts = accounts.filter(a => !a.isRestricted && a.id !== 'bank_005');
    return activeAccounts.length > 0 ? activeAccounts[0] : accounts[0];
  };

  const addCashTransaction = async (txData: Omit<CashTransaction, 'id' | 'status'>) => {
    // RBAC: Hanya Tim Keuangan (Finance), Akuntansi, Direktur Utama, atau Super Admin yang berwenang mencatat kas masuk/keluar/mutasi
    const isAuthorized = ['finance_manager', 'accounting_manager', 'direktur_utama', 'super_admin'].includes(currentUser.role);
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Bagian Keuangan (Finance) yang berwenang mencatat transaksi kas & mutasi keuangan!', 'error');
      return;
    }

    if (txData.type === 'mutation') {
      if (!txData.targetAccount || txData.targetAccount === txData.sourceAccount) {
        showNotification('Gagal: Rekening Asal dan Rekening Tujuan mutasi tidak boleh sama!', 'error');
        return;
      }
    }

    const newId = `csh_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cashAccName = chartOfAccounts.find(a => a.code === '1110')?.name || "Kas & Bank D'Kandang Farm (BCA, Mandiri, BSI & Loket)";

    // Resolve Contra COA Account & Activity Category
    const resolvedContra = txData.type === 'mutation'
      ? { code: '1110', name: cashAccName, cashFlowCategory: txData.category || 'operating' as const }
      : suggestContraAccountForTransaction({
          type: txData.type === 'inflow' ? 'inflow' : 'outflow',
          category: txData.category,
          incomeSource: txData.incomeSource,
          paymentStage: txData.paymentStage,
          budgetName: txData.budgetName,
          activityCategory: txData.activityCategory,
          description: txData.description,
          chartOfAccounts,
          chosenContraCode: txData.contraAccountCode
        });

    const newTx: CashTransaction = {
      ...txData,
      id: newId,
      contraAccountCode: resolvedContra.code,
      contraAccountName: txData.contraAccountName || resolvedContra.name,
      recordedBy: txData.recordedBy || currentUser.name,
      status: 'completed',
      approvedBy: currentUser.name
    };

    // 1. Calculate Bank Accounts in memory
    let updatedBanksToSave: BankAccount[] = [];
    let nextBankAccounts = bankAccounts;

    if (txData.type === 'mutation') {
      const sourceBank = findTargetBankAccount(bankAccounts, txData.sourceAccount);
      const targetBank = findTargetBankAccount(bankAccounts, txData.targetAccount || '');
      if (sourceBank && targetBank) {
        const newSource: BankAccount = { ...sourceBank, balance: Math.max(0, sourceBank.balance - txData.amount) };
        const newTarget: BankAccount = { ...targetBank, balance: targetBank.balance + txData.amount };
        updatedBanksToSave = [newSource, newTarget];
        const intermediate = bankAccounts.map(acc => {
          if (acc.id === sourceBank.id) return newSource;
          if (acc.id === targetBank.id) return newTarget;
          return acc;
        });
        nextBankAccounts = syncRestrictedPoolBalance(intermediate);
      }
    } else {
      const isIncome = txData.type === 'inflow';
      const delta = isIncome ? txData.amount : -txData.amount;
      const matchedBank = findTargetBankAccount(bankAccounts, txData.sourceAccount);
      if (matchedBank) {
        const targetBank: BankAccount = { ...matchedBank, balance: Math.max(0, matchedBank.balance + delta) };
        updatedBanksToSave = [targetBank];
        const intermediate = bankAccounts.map(acc => acc.id === matchedBank.id ? targetBank : acc);
        nextBankAccounts = syncRestrictedPoolBalance(intermediate);
      }
    }

    // 2. Cross-Module sync calculations in memory
    let updatedLeadToSave: Lead | null = null;
    let nextLeads = leads;
    let updatedInvToSave: SalesInvoice | null = null;
    let nextInvoices = salesInvoices;
    let updatedSOToSave: SalesOrder | null = null;
    let nextOrders = salesOrders;

    if (txData.type === 'inflow' && (txData.linkedEntityId || txData.linkedEntityName)) {
      const targetLead = leads.find(ld => 
        (txData.linkedEntityId && ld.id === txData.linkedEntityId) ||
        (txData.linkedEntityName && ld.company.toLowerCase() === txData.linkedEntityName.toLowerCase()) ||
        (txData.linkedEntityName && ld.name.toLowerCase() === txData.linkedEntityName.toLowerCase())
      );

      if (targetLead) {
        const prevCash = cashTransactions
          .filter(t => t.type === 'inflow' && t.id !== newId && (
            (t.linkedEntityId && t.linkedEntityId === targetLead.id) ||
            (t.linkedEntityName && t.linkedEntityName.toLowerCase() === targetLead.company.toLowerCase())
          ))
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        
        const totalPaid = prevCash + txData.amount;
        const isFull = (targetLead.dealValue > 0 && totalPaid >= targetLead.dealValue) || 
                       txData.paymentStage === 'settlement' || 
                       txData.paymentStage === 'full';
        
        updatedLeadToSave = {
          ...targetLead,
          dpAmount: isFull ? (targetLead.dealValue || totalPaid) : totalPaid,
          paymentStatus: isFull ? 'paid' : (totalPaid > 0 ? 'dp_paid' : 'unpaid'),
          probability: isFull ? 100 : targetLead.probability
        };
        nextLeads = leads.map(ld => ld.id === targetLead.id ? updatedLeadToSave! : ld);
      }

      if (txData.referenceNo || txData.linkedEntityName) {
        const targetInv = salesInvoices.find(inv => 
          (txData.referenceNo && (inv.invoiceNumber === txData.referenceNo || inv.soReference === txData.referenceNo)) ||
          (txData.linkedEntityName && inv.customerName.toLowerCase() === txData.linkedEntityName.toLowerCase())
        );
        if (targetInv) {
          const newPaid = Math.min(targetInv.totalAmount, (targetInv.paidAmount || 0) + txData.amount);
          updatedInvToSave = {
            ...targetInv,
            paidAmount: newPaid,
            status: newPaid >= targetInv.totalAmount ? 'paid' : targetInv.status
          };
          nextInvoices = salesInvoices.map(i => i.id === targetInv.id ? updatedInvToSave! : i);
        }
      }

      const targetSO = salesOrders.find(so => 
        (txData.referenceNo && so.soNumber === txData.referenceNo) || 
        (txData.linkedEntityName && so.customerName.toLowerCase() === txData.linkedEntityName.toLowerCase())
      );
      if (targetSO) {
        const isFull = txData.amount >= targetSO.totalAmount || txData.paymentStage === 'settlement' || txData.paymentStage === 'full';
        updatedSOToSave = {
          ...targetSO,
          paymentStatus: isFull ? 'paid' : 'partial'
        };
        nextOrders = salesOrders.map(s => s.id === targetSO.id ? updatedSOToSave! : s);
      }
    }

    // 3. Accounting & General Ledger Journal in memory
    const dateForPeriod = (txData.date || new Date().toISOString().split('T')[0]).slice(0, 7).replace('-', '');
    const periodKey = dateForPeriod.length === 6 ? dateForPeriod : `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const nextNum = await getNextDocumentNumber('journal', periodKey);
    const entryNum = `JV-${periodKey}-${String(nextNum).padStart(3, '0')}`;
    let autoJournal: JournalEntry;

    if (txData.type === 'mutation') {
      autoJournal = {
        id: `jrn_${Date.now()}`,
        entryNumber: entryNum,
        date: txData.date,
        description: `[Mutasi Antar Rekening] ${txData.description || `Transfer dari ${txData.sourceAccount} ke ${txData.targetAccount}`}`,
        lines: [
          { accountCode: '1110', accountName: `Kas & Bank (Tujuan: ${txData.targetAccount || 'Tujuan'})`, debit: txData.amount, credit: 0 },
          { accountCode: '1110', accountName: `Kas & Bank (Asal: ${txData.sourceAccount})`, debit: 0, credit: txData.amount }
        ],
        totalAmount: txData.amount,
        referenceModule: 'finance',
        referenceId: newId,
        createdBy: currentUser.name,
        status: 'posted'
      };
    } else {
      const isIncome = txData.type === 'inflow';
      const contraCode = newTx.contraAccountCode || resolvedContra.code;
      const contraName = newTx.contraAccountName || resolvedContra.name;

      autoJournal = {
        id: `jrn_${Date.now()}`,
        entryNumber: entryNum,
        date: txData.date,
        description: `[Arus Kas Otomatis] ${txData.description}`,
        lines: isIncome ? [
          { accountCode: '1110', accountName: cashAccName, debit: txData.amount, credit: 0 },
          { accountCode: contraCode, accountName: contraName, debit: 0, credit: txData.amount }
        ] : [
          { accountCode: contraCode, accountName: contraName, debit: txData.amount, credit: 0 },
          { accountCode: '1110', accountName: cashAccName, debit: 0, credit: txData.amount }
        ],
        totalAmount: txData.amount,
        referenceModule: 'finance',
        referenceId: newId,
        createdBy: currentUser.name,
        status: 'posted'
      };
    }

    // Update COA balances in memory based on autoJournal lines
    const baseCOA = mergeWithCoreCOA(chartOfAccounts);
    const updatedCOA = baseCOA.map(acc => {
      let balance = acc.balance;
      for (const line of autoJournal.lines) {
        if (line.accountCode === acc.code) {
          const debit = Number(line.debit) || 0;
          const credit = Number(line.credit) || 0;
          balance += acc.normalBalance === 'Debit' ? (debit - credit) : (credit - debit);
        }
      }
      return { ...acc, balance };
    });

    // 4. Update linked budget allocation spentAmount if outflow
    let updatedBudgetToSave: BudgetAllocation | null = null;
    let nextBudgets = budgetAllocations;
    if (txData.type === 'outflow' && (txData.budgetId || txData.budgetName)) {
      const targetBudget = budgetAllocations.find(b => 
        (txData.budgetId && b.id === txData.budgetId) ||
        (txData.budgetName && b.department.toLowerCase() === txData.budgetName.toLowerCase())
      );
      if (targetBudget) {
        const newSpent = (targetBudget.spentAmount || 0) + txData.amount;
        updatedBudgetToSave = { ...targetBudget, spentAmount: newSpent };
        nextBudgets = budgetAllocations.map(b => b.id === targetBudget.id ? updatedBudgetToSave! : b);
      }
    }

    try {
      // VALIDASI FIREBASE-FIRST: Wajib commit ke cloud Firestore terlebih dahulu
      await saveDocument('cash_transactions', newTx);
      await saveDocument('journal', autoJournal);
      await saveMultipleDocuments('coa', updatedCOA);
      for (const b of updatedBanksToSave) {
        await saveDocument('bank_accounts', b);
      }
      if (updatedLeadToSave) await saveDocument('leads', updatedLeadToSave);
      if (updatedInvToSave) await saveDocument('sales_invoices', updatedInvToSave);
      if (updatedSOToSave) await saveDocument('sales_orders', updatedSOToSave);
      if (updatedBudgetToSave) await saveDocument('budgets', updatedBudgetToSave);

      // State React HANYA di-update jika respons dari Firebase sukses
      setCashTransactions(prev => {
        const next = [newTx, ...prev.filter(t => t.id !== newTx.id)];
        const seen = new Set<string>();
        const deduped = next.filter(t => {
          if (!t.id || seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}cash_transactions`, JSON.stringify(deduped)); } catch (e) {}
        return deduped;
      });
      setBankAccounts(nextBankAccounts);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(nextBankAccounts)); } catch (e) {}
      if (updatedLeadToSave) {
        setLeads(nextLeads);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}leads`, JSON.stringify(nextLeads)); } catch (e) {}
      }
      if (updatedInvToSave) {
        setSalesInvoices(nextInvoices);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}invoices`, JSON.stringify(nextInvoices)); } catch (e) {}
      }
      if (updatedSOToSave) {
        setSalesOrders(nextOrders);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}so`, JSON.stringify(nextOrders)); } catch (e) {}
      }
      setJournalEntries(prev => {
        const next = [autoJournal, ...prev];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setChartOfAccounts(updatedCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(updatedCOA)); } catch (e) {}
      if (updatedBudgetToSave) {
        setBudgetAllocations(nextBudgets);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(nextBudgets)); } catch (e) {}
      }

      if (txData.type === 'mutation') {
        showNotification(`Mutasi kas Rp ${txData.amount.toLocaleString('id-ID')} berhasil dipindahkan dan tersimpan di database cloud!`, 'success');
      } else {
        const isIncome = txData.type === 'inflow';
        showNotification(`Transaksi Kas ${isIncome ? 'Masuk' : 'Keluar'} (${txData.description}) tersimpan aman ke database!`, 'success');
      }

      await addAuditLogInternal(
        txData.type === 'mutation' ? 'CASH_MUTATION_TRANSFER' : 'CASH_TRANSACTION_CREATED',
        'finance',
        txData.type === 'mutation'
          ? `MUTASI KAS: Dari "${txData.sourceAccount}" ke "${txData.targetAccount}" - Rp ${txData.amount.toLocaleString('id-ID')}`
          : `${txData.type.toUpperCase()}: ${txData.description} - Rp ${txData.amount.toLocaleString('id-ID')}`
      );
    } catch (error: any) {
      console.error('[addCashTransaction] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan transaksi ke database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateCashTransaction = async (id: string, updates: Partial<CashTransaction>): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = ['super_admin', 'direktur_utama', 'finance_manager', 'accounting_manager'].includes(currentUser.role);
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Tim Keuangan (Finance), Akuntansi, Super Admin dan Direktur Utama yang berwenang mengubah histori transaksi!', 'error');
      return { success: false, message: 'Hanya Tim Keuangan, Akuntansi, Super Admin dan Direktur Utama yang berwenang.' };
    }

    const oldTx = cashTransactions.find(t => t.id === id);
    if (!oldTx) {
      return { success: false, message: 'Transaksi tidak ditemukan.' };
    }

    const mergedTx: CashTransaction = { ...oldTx, ...updates };
    const cashAccName = chartOfAccounts.find(a => a.code === '1110')?.name || "Kas & Bank D'Kandang Farm (BCA, Mandiri, BSI & Loket)";
    const resolvedContra = mergedTx.type === 'mutation'
      ? { code: '1110', name: cashAccName, cashFlowCategory: mergedTx.category || 'operating' as const }
      : suggestContraAccountForTransaction({
          type: mergedTx.type === 'inflow' ? 'inflow' : 'outflow',
          category: mergedTx.category,
          incomeSource: mergedTx.incomeSource,
          paymentStage: mergedTx.paymentStage,
          budgetName: mergedTx.budgetName,
          activityCategory: mergedTx.activityCategory,
          description: mergedTx.description,
          chartOfAccounts,
          chosenContraCode: updates.contraAccountCode !== undefined ? updates.contraAccountCode : mergedTx.contraAccountCode
        });

    const updatedTx: CashTransaction = {
      ...mergedTx,
      contraAccountCode: resolvedContra.code,
      contraAccountName: updates.contraAccountName || resolvedContra.name
    };

    // 1. Calculate synchronized bank balances in memory
    let banksToSave: BankAccount[] = [];
    const nextAccounts = bankAccounts.map(bank => {
      let delta = 0;

      // Revert oldTx effect on this bank
      if (oldTx.type === 'inflow' && findTargetBankAccount(bankAccounts, oldTx.sourceAccount)?.id === bank.id) {
        delta -= oldTx.amount;
      } else if (oldTx.type === 'outflow' && findTargetBankAccount(bankAccounts, oldTx.sourceAccount)?.id === bank.id) {
        delta += oldTx.amount;
      } else if (oldTx.type === 'mutation') {
        if (findTargetBankAccount(bankAccounts, oldTx.sourceAccount)?.id === bank.id) delta += oldTx.amount;
        if (findTargetBankAccount(bankAccounts, oldTx.targetAccount || '')?.id === bank.id) delta -= oldTx.amount;
      }

      // Apply updatedTx effect on this bank
      if (updatedTx.type === 'inflow' && findTargetBankAccount(bankAccounts, updatedTx.sourceAccount)?.id === bank.id) {
        delta += updatedTx.amount;
      } else if (updatedTx.type === 'outflow' && findTargetBankAccount(bankAccounts, updatedTx.sourceAccount)?.id === bank.id) {
        delta -= updatedTx.amount;
      } else if (updatedTx.type === 'mutation') {
        if (findTargetBankAccount(bankAccounts, updatedTx.sourceAccount)?.id === bank.id) delta -= updatedTx.amount;
        if (findTargetBankAccount(bankAccounts, updatedTx.targetAccount || '')?.id === bank.id) delta += updatedTx.amount;
      }

      if (delta !== 0) {
        const updatedBank = { ...bank, balance: Math.max(0, bank.balance + delta) };
        banksToSave.push(updatedBank);
        return updatedBank;
      }
      return bank;
    });
    const syncedBankAccounts = syncRestrictedPoolBalance(nextAccounts);

    // 2. Sync linked Lead in memory
    let updatedLeadToSave: Lead | null = null;
    let nextLeads = leads;
    if (updatedTx.type === 'inflow' && (updatedTx.linkedEntityId || updatedTx.linkedEntityName)) {
      const entityNameLower = (updatedTx.linkedEntityName || '').trim().toLowerCase();
      const targetLead = leads.find(ld => 
        (updatedTx.linkedEntityId && ld.id === updatedTx.linkedEntityId) ||
        (entityNameLower.length > 0 && (
          ld.company.toLowerCase().includes(entityNameLower) ||
          entityNameLower.includes(ld.company.toLowerCase()) ||
          ld.name.toLowerCase() === entityNameLower
        ))
      );

      if (targetLead) {
        const allInflows = cashTransactions
          .map(t => t.id === id ? updatedTx : t)
          .filter(t => t.type === 'inflow' && (
            (t.linkedEntityId && t.linkedEntityId === targetLead.id) ||
            (t.linkedEntityName && t.linkedEntityName.toLowerCase() === targetLead.company.toLowerCase())
          ))
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const isFull = (targetLead.dealValue > 0 && allInflows >= targetLead.dealValue) || 
                       updatedTx.paymentStage === 'settlement' || 
                       updatedTx.paymentStage === 'full';

        updatedLeadToSave = {
          ...targetLead,
          dpAmount: isFull ? (targetLead.dealValue || allInflows) : allInflows,
          paymentStatus: isFull ? 'paid' : (allInflows > 0 ? 'dp_paid' : 'unpaid')
        };
        nextLeads = leads.map(ld => ld.id === targetLead.id ? updatedLeadToSave! : ld);
      }
    }

    // 3. Synchronize linked Journal Entry & recompute COA balances deterministically
    let updatedJournalToSave: JournalEntry | null = null;
    const nextJournals = journalEntries.map(j => {
      if (j.referenceId === id || (j.referenceModule === 'finance' && j.id === `jrn_sync_${id}`)) {
        const isIncome = updatedTx.type === 'inflow';
        const newLines = updatedTx.type === 'mutation'
          ? [
              { accountCode: '1110', accountName: `Kas & Bank (Tujuan: ${updatedTx.targetAccount || 'Tujuan'})`, debit: updatedTx.amount, credit: 0 },
              { accountCode: '1110', accountName: `Kas & Bank (Asal: ${updatedTx.sourceAccount})`, debit: 0, credit: updatedTx.amount }
            ]
          : isIncome
          ? [
              { accountCode: '1110', accountName: cashAccName, debit: updatedTx.amount, credit: 0 },
              { accountCode: updatedTx.contraAccountCode!, accountName: updatedTx.contraAccountName!, debit: 0, credit: updatedTx.amount }
            ]
          : [
              { accountCode: updatedTx.contraAccountCode!, accountName: updatedTx.contraAccountName!, debit: updatedTx.amount, credit: 0 },
              { accountCode: '1110', accountName: cashAccName, debit: 0, credit: updatedTx.amount }
            ];

        updatedJournalToSave = {
          ...j,
          date: updatedTx.date,
          description: updatedTx.type === 'mutation'
            ? `[Mutasi Antar Rekening] ${updatedTx.description}`
            : `[Arus Kas Otomatis] ${updatedTx.description}`,
          lines: newLines,
          totalAmount: updatedTx.amount
        };
        return updatedJournalToSave;
      }
      return j;
    });

    const baseCOA = mergeWithCoreCOA(chartOfAccounts);
    const nextCOA: ChartOfAccount[] = baseCOA.map(acc => {
      let balance = 0;
      for (const jrn of nextJournals) {
        for (const line of jrn.lines || []) {
          if (line.accountCode === acc.code) {
            const debit = Number(line.debit) || 0;
            const credit = Number(line.credit) || 0;
            balance += acc.normalBalance === 'Debit' ? (debit - credit) : (credit - debit);
          }
        }
      }
      return { ...acc, balance };
    });

    // 4. Sync linked Budget Allocation realization in memory
    let budgetsToSave: BudgetAllocation[] = [];
    let nextBudgets = budgetAllocations;
    if (oldTx.type === 'outflow' || updatedTx.type === 'outflow') {
      nextBudgets = budgetAllocations.map(b => {
        const spent = cashTransactions
          .map(t => t.id === id ? updatedTx : t)
          .filter(t => t.type === 'outflow' && (t.budgetId === b.id || (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase())))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        if (spent !== b.spentAmount) {
          const updatedB = { ...b, spentAmount: spent };
          budgetsToSave.push(updatedB);
          return updatedB;
        }
        return b;
      });
    }

    try {
      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('cash_transactions', updatedTx);
      if (updatedJournalToSave) {
        await saveDocument('journal', updatedJournalToSave);
      }
      for (const b of banksToSave) {
        await saveDocument('bank_accounts', b);
      }
      if (updatedLeadToSave) await saveDocument('leads', updatedLeadToSave);
      await saveMultipleDocuments('coa', nextCOA);
      for (const bToSave of budgetsToSave) {
        await saveDocument('budgets', bToSave);
      }

      // State React HANYA di-update jika respons dari Firebase sukses
      setCashTransactions(prev => {
        const next = prev.map(t => t.id === id ? updatedTx : t);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}cash_transactions`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      if (updatedJournalToSave) {
        setJournalEntries(nextJournals);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(nextJournals)); } catch (e) {}
      }
      setBankAccounts(syncedBankAccounts);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(syncedBankAccounts)); } catch (e) {}
      if (updatedLeadToSave) {
        setLeads(nextLeads);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}leads`, JSON.stringify(nextLeads)); } catch (e) {}
      }
      setChartOfAccounts(nextCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(nextCOA)); } catch (e) {}
      if (budgetsToSave.length > 0) {
        setBudgetAllocations(nextBudgets);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(nextBudgets)); } catch (e) {}
      }

      showNotification(`Histori transaksi "${updates.description || oldTx.description}" & Jurnal/COA berhasil diperbarui di database cloud!`, 'success');
      await addAuditLogInternal('CASH_TRANSACTION_UPDATED', 'finance', `Memperbarui transaksi ID ${id}: ${updatedTx.description} [COA: ${updatedTx.contraAccountCode}]`);
      return { success: true };
    } catch (error: any) {
      console.error('[updateCashTransaction] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memperbarui transaksi di database: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database' };
    }
  };

  const deleteCashTransaction = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Super Admin dan Direktur Utama yang berwenang menghapus transaksi!', 'error');
      return { success: false, message: 'Hanya Super Admin dan Direktur Utama yang berwenang.' };
    }

    const targetTx = cashTransactions.find(t => t.id === id);
    if (!targetTx) {
      return { success: false, message: 'Transaksi tidak ditemukan.' };
    }

    // 1. Instant optimistic state update for cash transactions
    setCashTransactions(prev => {
      const next = prev.filter(t => t.id !== id);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}cash_transactions`, JSON.stringify(next)); } catch (e) {}
      return next;
    });

    // 2. Revert bank balances accurately
    let banksToSave: BankAccount[] = [];
    setBankAccounts(prev => {
      const nextAccounts = prev.map(bank => {
        let delta = 0;
        if (targetTx.type === 'inflow' && findTargetBankAccount(prev, targetTx.sourceAccount)?.id === bank.id) {
          delta -= targetTx.amount;
        } else if (targetTx.type === 'outflow' && findTargetBankAccount(prev, targetTx.sourceAccount)?.id === bank.id) {
          delta += targetTx.amount;
        } else if (targetTx.type === 'mutation') {
          if (findTargetBankAccount(prev, targetTx.sourceAccount)?.id === bank.id) delta += targetTx.amount;
          if (findTargetBankAccount(prev, targetTx.targetAccount || '')?.id === bank.id) delta -= targetTx.amount;
        }

        if (delta !== 0) {
          const updatedBank = { ...bank, balance: Math.max(0, bank.balance + delta) };
          banksToSave.push(updatedBank);
          return updatedBank;
        }
        return bank;
      });

      const synced = syncRestrictedPoolBalance(nextAccounts);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(synced)); } catch (e) {}
      return synced;
    });

    // 3. Remove linked journal voucher and deterministically recompute COA balances from remaining journals
    const matchedJournals = journalEntries.filter(j => 
      j.referenceId === id || 
      (j.referenceModule === 'finance' && j.description.includes(targetTx.description))
    );
    const remainingJournals = journalEntries.filter(j => 
      j.referenceId !== id && 
      !(j.referenceModule === 'finance' && j.description.includes(targetTx.description))
    );
    if (matchedJournals.length > 0) {
      setJournalEntries(remainingJournals);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(remainingJournals)); } catch (e) {}
    }

    const baseCOA = mergeWithCoreCOA(chartOfAccounts);
    const coaToSave: ChartOfAccount[] = baseCOA.map(acc => {
      let balance = 0;
      for (const jrn of remainingJournals) {
        for (const line of jrn.lines || []) {
          if (line.accountCode === acc.code) {
            const debit = Number(line.debit) || 0;
            const credit = Number(line.credit) || 0;
            balance += acc.normalBalance === 'Debit' ? (debit - credit) : (credit - debit);
          }
        }
      }
      return { ...acc, balance };
    });
    setChartOfAccounts(coaToSave);
    try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(coaToSave)); } catch (e) {}

    // 4. Re-sync linked lead if inflow deleted
    let updatedLeadToSave: Lead | null = null;
    if (targetTx.type === 'inflow' && (targetTx.linkedEntityId || targetTx.linkedEntityName)) {
      const targetLead = leads.find(ld => 
        (targetTx.linkedEntityId && ld.id === targetTx.linkedEntityId) ||
        (targetTx.linkedEntityName && ld.company.toLowerCase() === targetTx.linkedEntityName.toLowerCase()) ||
        (targetTx.linkedEntityName && ld.name.toLowerCase() === targetTx.linkedEntityName.toLowerCase())
      );

      if (targetLead) {
        const remainingCash = cashTransactions
          .filter(t => t.id !== id && t.type === 'inflow' && (
            (t.linkedEntityId && t.linkedEntityId === targetLead.id) ||
            (t.linkedEntityName && t.linkedEntityName.toLowerCase() === targetLead.company.toLowerCase())
          ))
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const isFull = targetLead.dealValue > 0 && remainingCash >= targetLead.dealValue;
        updatedLeadToSave = {
          ...targetLead,
          dpAmount: remainingCash,
          paymentStatus: isFull ? 'paid' : (remainingCash > 0 ? 'dp_paid' : 'unpaid')
        };
        setLeads(prev => {
          const next = prev.map(ld => ld.id === targetLead.id ? updatedLeadToSave! : ld);
          try { localStorage.setItem(`${STORAGE_KEY_PREFIX}leads`, JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
    }

    // 6. Sync linked Budget Allocation realization if deleted transaction was outflow
    let budgetsToSave: BudgetAllocation[] = [];
    if (targetTx.type === 'outflow') {
      setBudgetAllocations(prev => {
        let changed = false;
        const nextBudgets = prev.map(b => {
          const spent = cashTransactions
            .filter(t => t.id !== id && t.type === 'outflow' && (t.budgetId === b.id || (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase())))
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          
          if (spent !== b.spentAmount) {
            changed = true;
            const updatedB = { ...b, spentAmount: spent };
            budgetsToSave.push(updatedB);
            return updatedB;
          }
          return b;
        });
        if (changed) {
          try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(nextBudgets)); } catch (e) {}
          return nextBudgets;
        }
        return prev;
      });
    }

    showNotification(`Histori transaksi "${targetTx.description}" berhasil dihapus & saldo rekening bank disesuaikan`, 'info');

    // 7. Non-blocking parallel persistence
    const deletePromises: Promise<any>[] = [
      deleteDocument('cash_transactions', id),
      addAuditLogInternal('CASH_TRANSACTION_DELETED', 'finance', `Menghapus transaksi: ${targetTx.description}`)
    ];
    for (const b of banksToSave) {
      deletePromises.push(saveDocument('bank_accounts', b));
    }
    if (coaToSave) deletePromises.push(saveMultipleDocuments('coa', coaToSave));
    if (updatedLeadToSave) deletePromises.push(saveDocument('leads', updatedLeadToSave));
    for (const bToSave of budgetsToSave) {
      deletePromises.push(saveDocument('budgets', bToSave));
    }
    for (const mj of matchedJournals) {
      deletePromises.push(deleteDocument('journal', mj.id));
    }

    Promise.allSettled(deletePromises).catch(err => {
      console.warn('[Firestore] Parallel delete note:', err);
    });

    return { success: true };
  };

  const clearAllCashTransactions = async (): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama' || currentUser.role === 'finance_manager';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Bagian Keuangan atau Pimpinan yang berwenang membersihkan data transaksi!', 'error');
      return { success: false, message: 'Tidak memiliki wewenang.' };
    }

    setCashTransactions([]);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}cash_transactions`);
    await clearCollection('cash_transactions');

    // Clean up auto finance journals
    const financeJournals = journalEntries.filter(j => j.referenceModule === 'finance');
    for (const fj of financeJournals) {
      await deleteDocument('journal', fj.id);
    }
    setJournalEntries(prev => prev.filter(j => j.referenceModule !== 'finance'));

    // Reset bank accounts mutational balance to 0 and save
    setBankAccounts(prev => {
      const reset = prev.map(b => ({ ...b, balance: 0 }));
      const synced = syncRestrictedPoolBalance(reset);
      saveMultipleDocuments('bank_accounts', synced);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(synced)); } catch (e) {}
      return synced;
    });

    // Reset Kas & Bank COA 1110
    setChartOfAccounts(prev => {
      const updatedCOA = prev.map(acc => {
        if (acc.code === '1110') {
          return { ...acc, balance: 0 };
        }
        return acc;
      });
      saveMultipleDocuments('coa', updatedCOA);
      return updatedCOA;
    });

    showNotification('Seluruh data transaksi kas berhasil dibersihkan & saldo rekening bank diatur ulang ke Rp 0.', 'success');
    await addAuditLogInternal('ALL_CASH_TRANSACTIONS_CLEARED', 'finance', 'Membersihkan seluruh data transaksi kas operasional.');
    return { success: true };
  };

  const clearAllOutflowTransactions = async (options?: {
    silent?: boolean;
    bypassAuthCheck?: boolean;
  }): Promise<{
    success: boolean;
    deletedOutflowCount: number;
    deletedJournalCount: number;
    message: string;
  }> => {
    const isAuthorized = ['super_admin', 'direktur_utama', 'finance_manager', 'accounting_manager'].includes(currentUser.role);
    if (!options?.bypassAuthCheck && !isAuthorized) {
      const msg = 'Akses Ditolak: Hanya Tim Keuangan, Akuntansi, Direktur Utama, atau Super Admin yang berwenang menghapus data pengeluaran!';
      if (!options?.silent) showNotification(msg, 'error');
      return {
        success: false,
        deletedOutflowCount: 0,
        deletedJournalCount: 0,
        message: msg
      };
    }

    try {
      // 1. Purge any cached outflow transactions & expense journals across all localStorage prefixes
      const { purgedOutflowIds, purgedJournalIds } = purgeLegacyOutflowCache();

      // 2. Identify all outflow transactions in current React state
      const stateOutflowIds = cashTransactions
        .filter(t => t.type === 'outflow' || String(t.id || '').startsWith('tx_exp_'))
        .map(t => t.id);

      const allOutflowIdSet = new Set<string>([...purgedOutflowIds, ...stateOutflowIds]);

      // Also include all 309 legacy seed IDs (tx_exp_001 .. tx_exp_309) to guarantee tombstones
      for (let i = 1; i <= 309; i++) {
        allOutflowIdSet.add(`tx_exp_${String(i).padStart(3, '0')}`);
      }

      // 3. Identify all expense / outflow journal entries in current React state
      const stateOutflowJournalIds = journalEntries
        .filter(j => {
          const refId = String(j.referenceId || '');
          const jId = String(j.id || '');
          const hasExpenseDebit =
            Array.isArray(j.lines) &&
            j.lines.some(
              l =>
                (String(l.accountCode || '').startsWith('5') || String(l.accountCode || '').startsWith('6')) &&
                Number(l.debit) > 0
            );
          return (
            allOutflowIdSet.has(refId) ||
            refId.startsWith('tx_exp_') ||
            jId.startsWith('jrn_sync_tx_exp_') ||
            (j.referenceModule === 'finance' && hasExpenseDebit)
          );
        })
        .map(j => j.id);

      const allOutflowJournalIdSet = new Set<string>([...purgedJournalIds, ...stateOutflowJournalIds]);
      for (let i = 1; i <= 309; i++) {
        allOutflowJournalIdSet.add(`jrn_sync_tx_exp_${String(i).padStart(3, '0')}`);
      }

      // 4. Filter remaining non-outflow transactions & non-expense journals
      const remainingTransactions = cashTransactions.filter(
        t => t.type !== 'outflow' && !String(t.id || '').startsWith('tx_exp_') && !allOutflowIdSet.has(t.id)
      );
      const remainingJournals = journalEntries.filter(j => !allOutflowJournalIdSet.has(j.id));

      // 5. Deterministically recalculate Journals, COA, Bank Balances, and Budget Realizations from remaining inflows/mutations
      const deletedBanks = getDeletedIds('bank_accounts');
      const deletedBudgets = getDeletedIds('budgets');
      const mergedBanks = syncRestrictedPoolBalance(
        mergeWithCoreBankAccounts(bankAccounts, deletedBanks, LEGACY_DUMMY_IDS)
      );
      const mergedBudgets = mergeWithCoreBudgets(budgetAllocations, deletedBudgets);

      const {
        journals: reconciledJournals,
        coa: reconciledCOA,
        banks: reconciledBanks,
        budgets: reconciledBudgets,
        newlyGeneratedJournals
      } = buildDeterministicJournalsAndCOA({
        transactions: remainingTransactions,
        existingJournals: remainingJournals,
        existingCOA: chartOfAccounts,
        existingBanks: mergedBanks,
        existingBudgets: mergedBudgets,
        actorName: currentUser?.name || 'Sistem Pembersihan Pengeluaran'
      });

      // Ensure every budget's spentAmount is strictly 0 since all outflows are removed
      const zeroedBudgets = reconciledBudgets.map(b => ({ ...b, spentAmount: 0 }));

      // 6. Update React state & localStorage immediately
      setCashTransactions(remainingTransactions);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, remainingTransactions);

      setJournalEntries(reconciledJournals);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, reconciledJournals);

      setBankAccounts(reconciledBanks);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, reconciledBanks);

      setBudgetAllocations(zeroedBudgets);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, zeroedBudgets);

      setChartOfAccounts(reconciledCOA);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, reconciledCOA);

      try {
        localStorage.setItem('DKANDANG_OUTFLOW_PURGE_V1_COMPLETED', new Date().toISOString());
      } catch {}

      // 7. Purge from Firestore in batch & persist recalculated Bank, Budget, and COA states
      const { deletedOutflowIds, deletedJournalIds } = await purgeOutflowDocumentsFromFirestore(
        Array.from(allOutflowIdSet),
        Array.from(allOutflowJournalIdSet)
      );

      await Promise.all([
        saveMultipleDocuments('bank_accounts', reconciledBanks),
        saveMultipleDocuments('budgets', zeroedBudgets),
        saveMultipleDocuments('coa', reconciledCOA),
        ...(newlyGeneratedJournals.length > 0 ? [saveMultipleDocuments('journal', newlyGeneratedJournals)] : [])
      ]);

      const deletedOutflowCount = Math.max(stateOutflowIds.length, deletedOutflowIds.length);
      const deletedJournalCount = Math.max(stateOutflowJournalIds.length, deletedJournalIds.length);
      const msg = `Seluruh data pengeluaran berhasil dihapus (${deletedOutflowCount} kas keluar & ${deletedJournalCount} jurnal beban dibersihkan). Saldo Rekening Bank, COA, dan Realisasi Anggaran (Rp 0) telah direkalkulasi dari sisa transaksi pemasukan!`;

      if (!options?.silent) {
        showNotification(msg, 'success');
      }
      await addAuditLogInternal('ALL_OUTFLOW_TRANSACTIONS_PURGED', 'finance', msg);

      return {
        success: true,
        deletedOutflowCount,
        deletedJournalCount,
        message: msg
      };
    } catch (error: any) {
      console.error('[clearAllOutflowTransactions] Error:', error);
      const errMsg = error?.message || 'Gagal menghapus data pengeluaran.';
      if (!options?.silent) {
        showNotification(errMsg, 'error');
      }
      return {
        success: false,
        deletedOutflowCount: 0,
        deletedJournalCount: 0,
        message: errMsg
      };
    }
  };

  const recalculateBankBalances = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanedPrev = syncRestrictedPoolBalance(bankAccounts);
      const directRecalculated = cleanedPrev.map(bank => {
        const inTotal = cashTransactions
          .filter(t => t.type === 'inflow' && findTargetBankAccount(cleanedPrev, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const outTotal = cashTransactions
          .filter(t => t.type === 'outflow' && findTargetBankAccount(cleanedPrev, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const mutationIn = cashTransactions
          .filter(t => t.type === 'mutation' && t.targetAccount && findTargetBankAccount(cleanedPrev, t.targetAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const mutationOut = cashTransactions
          .filter(t => t.type === 'mutation' && findTargetBankAccount(cleanedPrev, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        const finalBalance = inTotal + mutationIn - outTotal - mutationOut;
        return {
          ...bank,
          balance: finalBalance
        };
      });

      setBankAccounts(directRecalculated);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}bank_accounts`, JSON.stringify(directRecalculated)); } catch (e) {}
      await saveMultipleDocuments('bank_accounts', directRecalculated);
      // Ensure obsolete restricted pool account bank_005 is purged
      await deleteDocument('bank_accounts', 'bank_005').catch(() => {});

      // Also synchronize budget allocations spentAmount from outflow transactions
      const nextBudgets = budgetAllocations.map(b => {
        const spent = cashTransactions
          .filter(t => t.type === 'outflow' && (
            t.budgetId === b.id ||
            (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase())
          ))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        return { ...b, spentAmount: spent };
      });
      setBudgetAllocations(nextBudgets);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(nextBudgets)); } catch (e) {}
      await saveMultipleDocuments('budgets', nextBudgets);

      showNotification('Sinkronisasi saldo seluruh rekening bank & realisasi anggaran berhasil!', 'success');
      await addAuditLogInternal('BANK_BALANCES_RECALCULATED', 'finance', `Rekonsiliasi total & sinkronisasi saldo rekening bank operasional (${directRecalculated.length} rekening)`);
      return { success: true };
    } catch (err: any) {
      showNotification('Gagal merekonsiliasi saldo rekening bank', 'error');
      return { success: false, message: err?.message || 'Gagal sinkronisasi' };
    }
  };

  const restoreSchoolAndSalesData = async (options?: {
    silent?: boolean;
  }): Promise<{
    success: boolean;
    restoredLeadsCount: number;
    restoredQuotationsCount: number;
    restoredOrdersCount: number;
    restoredInvoicesCount: number;
    message: string;
  }> => {
    try {
      const deletedLeads = getDeletedIds('leads');

      // 1. Reconstruct the exact 48 official CSV leads, 46 SPH (Won+Negotiation), and 36 SO & Invoices (Won)
      const {
        leads: restoredLeads,
        quotations: restoredQuotations,
        salesOrders: restoredSalesOrders,
        salesInvoices: restoredSalesInvoices,
        updatedTransactions
      } = reconstructSchoolSalesFromTransactions({
        transactions: cashTransactions,
        existingLeads: [],
        existingQuotations: [],
        existingSalesOrders: [],
        existingSalesInvoices: [],
        deletedLeadIds: deletedLeads
      });

      const cleanLeads = dedupeById(restoredLeads);
      const cleanQuotations = dedupeById(restoredQuotations);
      const cleanSalesOrders = dedupeById(restoredSalesOrders);
      const cleanSalesInvoices = dedupeById(restoredSalesInvoices);
      const cleanTxs = dedupeById(updatedTransactions);

      setLeads(cleanLeads);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}leads`, cleanLeads);

      setQuotations(cleanQuotations);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}quotations`, cleanQuotations);

      setSalesOrders(cleanSalesOrders);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}so`, cleanSalesOrders);

      setSalesInvoices(cleanSalesInvoices);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}invoices`, cleanSalesInvoices);

      setCashTransactions(cleanTxs);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, cleanTxs);

      try {
        localStorage.setItem('DKANDANG_OFFICIAL_CSV_SCHOOLS_V2_COMPLETED', new Date().toISOString());
      } catch {}

      await purgeObsoleteReconstructedSchoolDocsFromFirestore();

      await Promise.all([
        saveMultipleDocuments('leads', cleanLeads),
        saveMultipleDocuments('quotations', cleanQuotations),
        saveMultipleDocuments('sales_orders', cleanSalesOrders),
        saveMultipleDocuments('sales_invoices', cleanSalesInvoices),
        saveMultipleDocuments('cash_transactions', cleanTxs)
      ]);

      const msg = `Data Sekolah Resmi Diperbarui: ${cleanLeads.length} Rombongan Sekolah (36 Won, 10 Negosiasi, 2 Prospek Baru), ${cleanQuotations.length} SPH, ${cleanSalesOrders.length} SO, dan ${cleanSalesInvoices.length} Faktur Tagihan berhasil dimuat & disinkronkan ke Cloud Firestore!`;
      if (!options?.silent) {
        showNotification(msg, 'success');
      }
      await addAuditLogInternal('SCHOOL_SALES_DATA_RESTORED', 'sales', msg);

      return {
        success: true,
        restoredLeadsCount: cleanLeads.length,
        restoredQuotationsCount: cleanQuotations.length,
        restoredOrdersCount: cleanSalesOrders.length,
        restoredInvoicesCount: cleanSalesInvoices.length,
        message: msg
      };
    } catch (error: any) {
      const errMsg = error?.message || 'Gagal menyinkronkan data sekolah resmi.';
      if (!options?.silent) {
        showNotification(errMsg, 'error');
      }
      return {
        success: false,
        restoredLeadsCount: 0,
        restoredQuotationsCount: 0,
        restoredOrdersCount: 0,
        restoredInvoicesCount: 0,
        message: errMsg
      };
    }
  };

  const restoreSystemData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const deletedBanks = getDeletedIds('bank_accounts');
      const deletedBudgets = getDeletedIds('budgets');
      const deletedTxs = getDeletedIds('cash_transactions');
      const deletedLeads = getDeletedIds('leads');

      // 1. Merge core + current transactions
      const existingTxIds = new Set(cashTransactions.map(t => t.id));
      const mergedTxs: CashTransaction[] = [...cashTransactions];
      for (const initTx of INITIAL_CASH_TRANSACTIONS) {
        if (!existingTxIds.has(initTx.id) && !deletedTxs.has(initTx.id)) {
          mergedTxs.push(initTx);
        }
      }
      const baseTxs = dedupeById(mergedTxs);

      // 1b. Reconstruct & merge School Leads, Quotations, Sales Orders, and Sales Invoices
      const {
        leads: restoredLeads,
        quotations: restoredQuotations,
        salesOrders: restoredSalesOrders,
        salesInvoices: restoredSalesInvoices,
        updatedTransactions: cleanTxs
      } = reconstructSchoolSalesFromTransactions({
        transactions: baseTxs,
        existingLeads: leads,
        existingQuotations: quotations,
        existingSalesOrders: salesOrders,
        existingSalesInvoices: salesInvoices,
        deletedLeadIds: deletedLeads
      });

      const cleanLeads = dedupeById(restoredLeads);
      const cleanQuotations = dedupeById(restoredQuotations);
      const cleanSalesOrders = dedupeById(restoredSalesOrders);
      const cleanSalesInvoices = dedupeById(restoredSalesInvoices);

      // 2. Merge core + current banks & budgets
      const mergedBanks = syncRestrictedPoolBalance(
        mergeWithCoreBankAccounts(bankAccounts, deletedBanks, LEGACY_DUMMY_IDS)
      );
      const mergedBudgets = mergeWithCoreBudgets(budgetAllocations, deletedBudgets);

      // 3. Deterministically build Journals, COA, Banks, and Budgets
      const {
        journals: reconciledJournals,
        coa: reconciledCOA,
        banks: reconciledBanks,
        budgets: reconciledBudgets,
        newlyGeneratedJournals
      } = buildDeterministicJournalsAndCOA({
        transactions: cleanTxs,
        existingJournals: journalEntries,
        existingCOA: chartOfAccounts,
        existingBanks: mergedBanks,
        existingBudgets: mergedBudgets,
        actorName: currentUser?.name || 'Sistem Pemulihan Data'
      });

      // 4. Merge users & debts
      const mergedUsers = mergeWithInitialUsers(users);
      const mergedDebts = debts.length > 0 ? debts : INITIAL_DEBTS;

      // 5. Persist all collections to Firestore
      await Promise.all([
        saveMultipleDocuments('cash_transactions', cleanTxs),
        saveMultipleDocuments('leads', cleanLeads),
        saveMultipleDocuments('quotations', cleanQuotations),
        saveMultipleDocuments('sales_orders', cleanSalesOrders),
        saveMultipleDocuments('sales_invoices', cleanSalesInvoices),
        saveMultipleDocuments('bank_accounts', reconciledBanks),
        saveMultipleDocuments('budgets', reconciledBudgets),
        ...(newlyGeneratedJournals.length > 0 ? [saveMultipleDocuments('journal', newlyGeneratedJournals)] : []),
        saveMultipleDocuments('coa', reconciledCOA),
        saveMultipleDocuments('users', mergedUsers),
        saveMultipleDocuments('debts', mergedDebts)
      ]);

      // 6. Update React state & localStorage
      setCashTransactions(cleanTxs);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, cleanTxs);

      setLeads(cleanLeads);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}leads`, cleanLeads);

      setQuotations(cleanQuotations);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}quotations`, cleanQuotations);

      setSalesOrders(cleanSalesOrders);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}so`, cleanSalesOrders);

      setSalesInvoices(cleanSalesInvoices);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}invoices`, cleanSalesInvoices);

      setBankAccounts(reconciledBanks);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, reconciledBanks);

      setBudgetAllocations(reconciledBudgets);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, reconciledBudgets);

      setJournalEntries(reconciledJournals);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, reconciledJournals);

      setChartOfAccounts(reconciledCOA);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, reconciledCOA);

      setUsers(mergedUsers);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}users`, mergedUsers);

      setDebts(mergedDebts);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}debts`, mergedDebts);

      const msg = `Pemulihan & sinkronisasi selesai: ${cleanLeads.length} Sekolah, ${cleanQuotations.length} SPH, ${cleanSalesOrders.length} SO, ${cleanSalesInvoices.length} Invoice, ${cleanTxs.length} Transaksi, ${reconciledBanks.length} Rekening Bank, dan ${reconciledCOA.length} Akun COA aktif!`;
      showNotification(msg, 'success');
      await addAuditLogInternal('SYSTEM_DATA_RESTORED_AND_SYNCED', 'finance', msg);
      return { success: true, message: msg };
    } catch (error: any) {
      const errMsg = error?.message || 'Gagal memulihkan data sistem.';
      showNotification(errMsg, 'error');
      return { success: false, message: errMsg };
    }
  };

  // Auto-healing reconciliation on startup if transactions exist but journals or COA balances are missing
  useEffect(() => {
    if (cashTransactions.length === 0) return;
    const allCoaZero = chartOfAccounts.length > 0 && chartOfAccounts.every(a => (a.balance || 0) === 0);
    const missingJournals = journalEntries.length === 0;
    const missingBanks = bankAccounts.length === 0;

    if (allCoaZero || missingJournals || missingBanks) {
      const timer = setTimeout(() => {
        const deletedBanks = getDeletedIds('bank_accounts');
        const deletedBudgets = getDeletedIds('budgets');
        const mergedBanks = syncRestrictedPoolBalance(
          mergeWithCoreBankAccounts(bankAccounts, deletedBanks, LEGACY_DUMMY_IDS)
        );
        const mergedBudgets = mergeWithCoreBudgets(budgetAllocations, deletedBudgets);

        const {
          journals: reconciledJournals,
          coa: reconciledCOA,
          banks: reconciledBanks,
          budgets: reconciledBudgets,
          newlyGeneratedJournals
        } = buildDeterministicJournalsAndCOA({
          transactions: cashTransactions,
          existingJournals: journalEntries,
          existingCOA: chartOfAccounts,
          existingBanks: mergedBanks,
          existingBudgets: mergedBudgets,
          actorName: 'Sistem Auto-Sync Startup'
        });

        setBankAccounts(reconciledBanks);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, reconciledBanks);

        setBudgetAllocations(reconciledBudgets);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, reconciledBudgets);

        setJournalEntries(reconciledJournals);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, reconciledJournals);

        setChartOfAccounts(reconciledCOA);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, reconciledCOA);

        saveMultipleDocuments('bank_accounts', reconciledBanks).catch(() => {});
        saveMultipleDocuments('budgets', reconciledBudgets).catch(() => {});
        if (newlyGeneratedJournals.length > 0) {
          saveMultipleDocuments('journal', newlyGeneratedJournals).catch(() => {});
        }
        saveMultipleDocuments('coa', reconciledCOA).catch(() => {});
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [cashTransactions.length, journalEntries.length, bankAccounts.length]);

  // Automatic startup migration & sync of the 48 Official CSV School Records
  useEffect(() => {
    const isOfficialCsvDone = Boolean(localStorage.getItem('DKANDANG_OFFICIAL_CSV_SCHOOLS_V2_COMPLETED'));
    const hasObsoleteIds = leads.some(l => isObsoleteReconstructedSchoolId(l.id));
    const missingSalesData =
      leads.length < 48 ||
      quotations.length < 46 ||
      salesOrders.length < 36 ||
      salesInvoices.length < 36;

    if (!isOfficialCsvDone || hasObsoleteIds || missingSalesData) {
      const timer = setTimeout(() => {
        restoreSchoolAndSalesData({ silent: false }).catch(err => {
          console.warn('[AutoRestoreSchoolData] Notice:', err);
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [cashTransactions.length, leads.length, quotations.length, salesOrders.length, salesInvoices.length]);

  // Automatic one-time purge migration of all legacy expense/outflow data & recalculation on app startup
  useEffect(() => {
    const isPurgeDone = Boolean(localStorage.getItem('DKANDANG_OUTFLOW_PURGE_V1_COMPLETED'));
    const hasSeedOutflows = cashTransactions.some(t => String(t.id || '').startsWith('tx_exp_'));
    const hasNegativeSeedBank = bankAccounts.some(b => b.id === 'bank_003' && b.balance === -117984938);
    const hasSeedBudgetSpent = budgetAllocations.some(b => b.id === 'bdg_operasional_2026' && b.spentAmount === 117984938);

    if (!isPurgeDone || hasSeedOutflows || hasNegativeSeedBank || hasSeedBudgetSpent) {
      const timer = setTimeout(() => {
        clearAllOutflowTransactions({ silent: false, bypassAuthCheck: true }).catch(err => {
          console.warn('[AutoPurgeOutflows] Notice:', err);
        });
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [cashTransactions.length, bankAccounts.length, budgetAllocations.length]);

  // ---------------- SPREADSHEET BATCH IMPORT & GOOGLE SHEETS AUTO-SYNC ----------------
  const bulkImportCashTransactions = async (
    items: BulkImportTransactionInput[],
    sourceLabel = 'Import Excel / Spreadsheet'
  ): Promise<BatchImportResult> => {
    const isAuthorized = ['finance_manager', 'accounting_manager', 'direktur_utama', 'super_admin'].includes(currentUser.role);
    if (!isAuthorized) {
      const msg = 'Akses Ditolak: Hanya Bagian Keuangan, Akuntansi, Direktur Utama, atau Super Admin yang berwenang mengimpor data transaksi!';
      showNotification(msg, 'error');
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        rejectedLockedCount: 0,
        matchedLeadsCount: 0,
        totalInflowAmount: 0,
        totalOutflowAmount: 0,
        message: msg
      };
    }

    if (!items || items.length === 0) {
      return {
        success: true,
        importedCount: 0,
        skippedDuplicateCount: 0,
        rejectedLockedCount: 0,
        matchedLeadsCount: 0,
        totalInflowAmount: 0,
        totalOutflowAmount: 0,
        message: 'Tidak ada baris transaksi untuk diimpor.'
      };
    }

    try {
      const existingFingerprints = new Set<string>(
        cashTransactions.map(tx => getTransactionFingerprint(tx))
      );
      const batchFingerprints = new Set<string>();

      const newTransactions: CashTransaction[] = [];
      const txContraMap = new Map<string, { code: string; name: string }>();
      let skippedDuplicateCount = 0;
      let rejectedLockedCount = 0;
      let totalInflowAmount = 0;
      let totalOutflowAmount = 0;
      const baseTime = Date.now();

      for (let i = 0; i < items.length; i++) {
        const raw = items[i];
        if (!raw.description || !raw.amount || raw.amount <= 0) continue;

        const cleanDate = (raw.date || new Date().toISOString().split('T')[0]).slice(0, 10);
        if (isPeriodLocked(cleanDate)) {
          rejectedLockedCount++;
          continue;
        }

        const fp = getTransactionFingerprint({
          date: cleanDate,
          type: raw.type,
          description: raw.description,
          amount: raw.amount
        });

        if (!raw.allowDuplicateOverride && (existingFingerprints.has(fp) || batchFingerprints.has(fp))) {
          skippedDuplicateCount++;
          continue;
        }
        batchFingerprints.add(fp);

        const matchedBank = findTargetBankAccount(bankAccounts, raw.sourceAccount);
        const resolvedBankName = matchedBank
          ? matchedBank.bankName
          : (raw.sourceAccount || (raw.type === 'outflow' ? 'BCA Manajemen' : 'BCA - IBU'));

        let resolvedBudgetId = raw.budgetId;
        let resolvedBudgetName = raw.budgetName;
        if (raw.type === 'outflow' && !resolvedBudgetId && raw.budgetName) {
          const matchedB = budgetAllocations.find(
            b =>
              b.department.toLowerCase().includes(raw.budgetName!.toLowerCase()) ||
              raw.budgetName!.toLowerCase().includes(b.department.toLowerCase())
          );
          if (matchedB) {
            resolvedBudgetId = matchedB.id;
            resolvedBudgetName = matchedB.department;
          }
        }

        const txId = `csh_imp_${baseTime}_${String(i + 1).padStart(4, '0')}_${Math.random().toString(36).substring(2, 5)}`;
        const newTx: CashTransaction = {
          date: cleanDate,
          receivedDate: (raw.receivedDate || cleanDate).slice(0, 10),
          type: raw.type,
          category: raw.category || 'operating',
          description: raw.description.trim(),
          amount: Math.round(Math.abs(raw.amount)),
          sourceAccount: resolvedBankName,
          targetAccount: raw.targetAccount,
          referenceNo: raw.referenceNo || `IMP-${cleanDate.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
          incomeSource: raw.incomeSource,
          paymentStage: raw.paymentStage,
          linkedEntityId: raw.linkedEntityId,
          linkedEntityName: raw.linkedEntityName,
          budgetId: raw.type === 'outflow' ? resolvedBudgetId : undefined,
          budgetName: raw.type === 'outflow' ? resolvedBudgetName : undefined,
          qty: raw.qty,
          unit: raw.unit,
          unitPrice: raw.unitPrice,
          activityCategory: raw.activityCategory,
          walletName: raw.walletName,
          notes: raw.notes,
          id: txId,
          status: 'completed',
          approvedBy: currentUser.name
        };

        // Resolve Double-Entry Contra Account (from Stage 4 user selection or automatic inference)
        const inferredContra = inferContraAccountForRow({
          type: newTx.type === 'inflow' ? 'inflow' : 'outflow',
          incomeSource: newTx.incomeSource,
          category: newTx.category,
          description: newTx.description,
          chartOfAccounts
        });
        const chosenCode = raw.contraAccountCode || inferredContra.code;
        const matchedCoa = chartOfAccounts.find(a => a.code === chosenCode);
        const chosenName = raw.contraAccountName || matchedCoa?.name || inferredContra.name;

        newTx.contraAccountCode = chosenCode;
        newTx.contraAccountName = chosenName;

        txContraMap.set(txId, { code: chosenCode, name: chosenName });
        newTransactions.push(newTx);
        if (newTx.type === 'inflow') totalInflowAmount += newTx.amount;
        if (newTx.type === 'outflow') totalOutflowAmount += newTx.amount;
      }

      if (newTransactions.length === 0) {
        const msg = rejectedLockedCount > 0
          ? `${rejectedLockedCount} baris ditolak karena berada pada periode akuntansi yang telah terkunci.`
          : skippedDuplicateCount > 0
          ? `Seluruh ${skippedDuplicateCount} baris transaksi sudah ada di database (duplikat dilewati otomatis).`
          : 'Tidak ada transaksi baru yang valid untuk disimpan.';
        return {
          success: rejectedLockedCount === 0,
          importedCount: 0,
          skippedDuplicateCount,
          rejectedLockedCount,
          matchedLeadsCount: 0,
          totalInflowAmount: 0,
          totalOutflowAmount: 0,
          message: msg
        };
      }

      // 1. Combine transactions & deduplicate by ID
      const combinedTransactions = dedupeById([...newTransactions, ...cashTransactions]);

      // 2. Match & update School Leads, Sales Invoices, and Sales Orders for Inflow transactions
      const updatedLeadsMap = new Map<string, Lead>();
      const updatedInvoicesMap = new Map<string, SalesInvoice>();
      const updatedOrdersMap = new Map<string, SalesOrder>();

      const nextLeads = leads.map(ld => {
        const ldCompanyLower = ld.company.trim().toLowerCase();
        const ldNameLower = ld.name.trim().toLowerCase();

        const hasNewInflowForLead = newTransactions.some(t => {
          if (t.type !== 'inflow') return false;
          const entityLower = (t.linkedEntityName || '').trim().toLowerCase();
          const descLower = (t.description || '').trim().toLowerCase();
          return (
            (t.linkedEntityId && t.linkedEntityId === ld.id) ||
            (entityLower.length >= 3 && (ldCompanyLower.includes(entityLower) || entityLower.includes(ldCompanyLower) || ldNameLower === entityLower)) ||
            (ldCompanyLower.length >= 5 && descLower.includes(ldCompanyLower))
          );
        });

        if (!hasNewInflowForLead) return ld;

        const allInflowsForLead = combinedTransactions
          .filter(t => {
            if (t.type !== 'inflow') return false;
            const entityLower = (t.linkedEntityName || '').trim().toLowerCase();
            const descLower = (t.description || '').trim().toLowerCase();
            return (
              (t.linkedEntityId && t.linkedEntityId === ld.id) ||
              (entityLower.length >= 3 && (ldCompanyLower.includes(entityLower) || entityLower.includes(ldCompanyLower) || ldNameLower === entityLower)) ||
              (ldCompanyLower.length >= 5 && descLower.includes(ldCompanyLower))
            );
          });

        const totalPaid = allInflowsForLead.reduce((sum, t) => sum + (t.amount || 0), 0);
        const hasSettlementFlag = allInflowsForLead.some(t => t.paymentStage === 'settlement' || t.paymentStage === 'full');
        const isFull = (ld.dealValue > 0 && totalPaid >= ld.dealValue) || hasSettlementFlag;

        const updatedLd: Lead = {
          ...ld,
          dpAmount: isFull ? Math.max(ld.dealValue || 0, totalPaid) : totalPaid,
          paymentStatus: isFull ? 'paid' : (totalPaid > 0 ? 'dp_paid' : 'unpaid'),
          probability: isFull ? 100 : ld.probability
        };
        updatedLeadsMap.set(updatedLd.id, updatedLd);
        return updatedLd;
      });

      const nextInvoices = salesInvoices.map(inv => {
        const custLower = inv.customerName.trim().toLowerCase();
        const matchingNewInflows = newTransactions.filter(t =>
          t.type === 'inflow' && (
            (t.referenceNo && (t.referenceNo === inv.invoiceNumber || t.referenceNo === inv.soReference)) ||
            (t.linkedEntityName && t.linkedEntityName.trim().toLowerCase() === custLower)
          )
        );
        if (matchingNewInflows.length === 0) return inv;

        const addedAmount = matchingNewInflows.reduce((s, t) => s + t.amount, 0);
        const newPaid = Math.min(inv.totalAmount, (inv.paidAmount || 0) + addedAmount);
        const updatedInv: SalesInvoice = {
          ...inv,
          paidAmount: newPaid,
          status: newPaid >= inv.totalAmount ? 'paid' : inv.status
        };
        updatedInvoicesMap.set(updatedInv.id, updatedInv);
        return updatedInv;
      });

      const nextOrders = salesOrders.map(so => {
        const custLower = so.customerName.trim().toLowerCase();
        const matchingNewInflows = newTransactions.filter(t =>
          t.type === 'inflow' && (
            (t.referenceNo && t.referenceNo === so.soNumber) ||
            (t.linkedEntityName && t.linkedEntityName.trim().toLowerCase() === custLower)
          )
        );
        if (matchingNewInflows.length === 0) return so;

        const addedAmount = matchingNewInflows.reduce((s, t) => s + t.amount, 0);
        const isFull = addedAmount >= so.totalAmount || matchingNewInflows.some(t => t.paymentStage === 'settlement' || t.paymentStage === 'full');
        const updatedSO: SalesOrder = {
          ...so,
          paymentStatus: isFull ? 'paid' : 'partial'
        };
        updatedOrdersMap.set(updatedSO.id, updatedSO);
        return updatedSO;
      });

      // 3. Recompute Bank Account Balances deterministically from all combined transactions
      const cleanedBanks = syncRestrictedPoolBalance(bankAccounts);
      const recomputedBanks = cleanedBanks.map(bank => {
        const inTotal = combinedTransactions
          .filter(t => t.type === 'inflow' && findTargetBankAccount(cleanedBanks, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        const outTotal = combinedTransactions
          .filter(t => t.type === 'outflow' && findTargetBankAccount(cleanedBanks, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        const mutationIn = combinedTransactions
          .filter(t => t.type === 'mutation' && t.targetAccount && findTargetBankAccount(cleanedBanks, t.targetAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);
        const mutationOut = combinedTransactions
          .filter(t => t.type === 'mutation' && findTargetBankAccount(cleanedBanks, t.sourceAccount)?.id === bank.id)
          .reduce((acc, t) => acc + (t.amount || 0), 0);

        return {
          ...bank,
          balance: inTotal + mutationIn - outTotal - mutationOut
        };
      });

      // 4. Recompute Budget Allocations spentAmount deterministically
      const recomputedBudgets = budgetAllocations.map(b => {
        const spent = combinedTransactions
          .filter(t => t.type === 'outflow' && (
            t.budgetId === b.id ||
            (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase())
          ))
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        return { ...b, spentAmount: spent };
      });

      // 5. Reserve Race-Condition-Free Sequential Journal Numbers per Period via Firestore runTransaction
      const periodCounts = new Map<string, number>();
      for (const tx of newTransactions) {
        const pKey = tx.date.slice(0, 7).replace('-', '');
        periodCounts.set(pKey, (periodCounts.get(pKey) || 0) + 1);
      }

      const periodNextNumberMap = new Map<string, number>();
      for (const [pKey, count] of periodCounts.entries()) {
        const existingInPeriod = journalEntries.filter(j => j.entryNumber.includes(`JV-${pKey}-`)).length;
        const startNum = await reserveDocumentNumberRange('journal', pKey, count, existingInPeriod);
        periodNextNumberMap.set(pKey, startNum);
      }

      const cashCoaName = chartOfAccounts.find(a => a.code === '1110')?.name || "Kas & Bank D'Kandang";

      const newJournals: JournalEntry[] = newTransactions.map((tx, idx) => {
        const isIncome = tx.type === 'inflow';
        const pKey = tx.date.slice(0, 7).replace('-', '');
        const currentSeq = periodNextNumberMap.get(pKey) || (journalEntries.length + idx + 1);
        periodNextNumberMap.set(pKey, currentSeq + 1);

        const contra = txContraMap.get(tx.id) || {
          code: isIncome ? '4110' : '5110',
          name: isIncome
            ? 'Pendapatan Tiket Masuk & Paket Edukasi Wisata Sekolah'
            : 'Beban Pokok Penjualan (Pakan Ternak, Bibit & Bahan Resto)'
        };

        return {
          id: `jrn_imp_${baseTime}_${String(idx + 1).padStart(4, '0')}`,
          entryNumber: `JV-${pKey}-${String(currentSeq).padStart(3, '0')}`,
          date: tx.date,
          description: `[Import ${sourceLabel}] ${tx.description}`,
          lines: isIncome
            ? [
                { accountCode: '1110', accountName: cashCoaName, debit: tx.amount, credit: 0 },
                { accountCode: contra.code, accountName: contra.name, debit: 0, credit: tx.amount }
              ]
            : [
                { accountCode: contra.code, accountName: contra.name, debit: tx.amount, credit: 0 },
                { accountCode: '1110', accountName: cashCoaName, debit: 0, credit: tx.amount }
              ],
          totalAmount: tx.amount,
          referenceModule: 'finance',
          referenceId: tx.id,
          createdBy: currentUser.name,
          status: 'posted'
        };
      });

      const combinedJournals = dedupeById([...newJournals, ...journalEntries]);

      // 6. Recompute COA balances deterministically from all active journals
      const recomputedCOA: ChartOfAccount[] = chartOfAccounts.map(acc => {
        let balance = 0;
        for (const jrn of combinedJournals) {
          for (const line of jrn.lines) {
            if (line.accountCode === acc.code) {
              const debit = Number(line.debit) || 0;
              const credit = Number(line.credit) || 0;
              balance += acc.normalBalance === 'Debit' ? (debit - credit) : (credit - debit);
            }
          }
        }
        return { ...acc, balance };
      });

      // 7. Compute Cryptographic SHA-256 Batch Integrity Hash & Audit Log
      const batchDigestPayload = JSON.stringify({
        sourceLabel,
        executedBy: currentUser.id,
        count: newTransactions.length,
        totalInflowAmount,
        totalOutflowAmount,
        fingerprints: newTransactions.map(t => `${t.date}|${t.type}|${t.amount}|${t.referenceNo}`)
      });
      const batchIntegrityHash = await generateSHA256(batchDigestPayload);

      // 8. Commit to Firestore atomically in chunked writeBatch operations
      await saveMultipleDocuments('cash_transactions', newTransactions);
      await saveMultipleDocuments('bank_accounts', recomputedBanks);
      await saveMultipleDocuments('budgets', recomputedBudgets);
      await saveMultipleDocuments('journal', newJournals);
      await saveMultipleDocuments('coa', recomputedCOA);

      if (updatedLeadsMap.size > 0) {
        await saveMultipleDocuments('leads', Array.from(updatedLeadsMap.values()));
      }
      if (updatedInvoicesMap.size > 0) {
        await saveMultipleDocuments('sales_invoices', Array.from(updatedInvoicesMap.values()));
      }
      if (updatedOrdersMap.size > 0) {
        await saveMultipleDocuments('sales_orders', Array.from(updatedOrdersMap.values()));
      }

      // 9. Update React States & debounced localStorage cache
      setCashTransactions(combinedTransactions);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, combinedTransactions);

      setBankAccounts(recomputedBanks);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, recomputedBanks);

      setBudgetAllocations(recomputedBudgets);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, recomputedBudgets);

      setJournalEntries(combinedJournals);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, combinedJournals);

      setChartOfAccounts(recomputedCOA);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, recomputedCOA);

      if (updatedLeadsMap.size > 0) {
        setLeads(nextLeads);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}leads`, nextLeads);
      }
      if (updatedInvoicesMap.size > 0) {
        setSalesInvoices(nextInvoices);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}invoices`, nextInvoices);
      }
      if (updatedOrdersMap.size > 0) {
        setSalesOrders(nextOrders);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}so`, nextOrders);
      }

      const summaryMsg = `Berhasil mengimpor ${newTransactions.length} transaksi (${sourceLabel})${skippedDuplicateCount > 0 ? `, ${skippedDuplicateCount} duplikat dilewati` : ''}${rejectedLockedCount > 0 ? `, ${rejectedLockedCount} periode terkunci ditolak` : ''}. Saldo Bank, Jurnal Umum & COA telah tersinkronisasi!`;
      showNotification(summaryMsg, 'success');
      await addAuditLogInternal(
        'BULK_CASH_TRANSACTIONS_IMPORTED',
        'finance',
        `${sourceLabel}: Eksekusi batch ${newTransactions.length} baris berhasil [SHA-256: ${batchIntegrityHash.slice(0, 16)}...] (Inflow: Rp ${totalInflowAmount.toLocaleString('id-ID')}, Outflow: Rp ${totalOutflowAmount.toLocaleString('id-ID')}, Duplikat dilewati: ${skippedDuplicateCount}, Sekolah terhubung: ${updatedLeadsMap.size})`
      );

      return {
        success: true,
        importedCount: newTransactions.length,
        skippedDuplicateCount,
        rejectedLockedCount,
        matchedLeadsCount: updatedLeadsMap.size,
        totalInflowAmount,
        totalOutflowAmount,
        integrityHash: batchIntegrityHash,
        message: summaryMsg
      };
    } catch (error: any) {
      console.error('[bulkImportCashTransactions] Error:', error);
      const errMsg = error?.message || 'Gagal mengimpor data transaksi ke database.';
      showNotification(errMsg, 'error');
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        rejectedLockedCount: 0,
        matchedLeadsCount: 0,
        totalInflowAmount: 0,
        totalOutflowAmount: 0,
        message: errMsg
      };
    }
  };

  const importCashTransactionsBatch = bulkImportCashTransactions;

  const saveSheetSyncConfig = async (
    configData: Omit<GoogleSheetSyncConfig, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
  ): Promise<GoogleSheetSyncConfig> => {
    const existing = configData.id ? sheetSyncConfigs.find(c => c.id === configData.id) : undefined;
    const savedConfig: GoogleSheetSyncConfig = {
      ...configData,
      id: existing?.id || configData.id || `gsync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: existing?.createdAt || new Date().toISOString(),
      createdBy: existing?.createdBy || currentUser.name
    };

    await saveDocument('sheets_sync_configs', savedConfig);
    setSheetSyncConfigs(prev => {
      const next = prependUnique(prev, savedConfig);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}sheets_sync_configs`, next);
      return next;
    });
    await addAuditLogInternal(
      'GOOGLE_SHEET_SYNC_CONFIG_SAVED',
      'finance',
      `Menyimpan konfigurasi Google Sheets Auto-Sync: "${savedConfig.name}" (Interval: ${savedConfig.intervalMinutes} menit, Auto-Sync: ${savedConfig.autoSyncEnabled ? 'ON' : 'OFF'})`
    );
    return savedConfig;
  };

  const deleteSheetSyncConfig = async (id: string): Promise<void> => {
    const target = sheetSyncConfigs.find(c => c.id === id);
    await deleteDocument('sheets_sync_configs', id);
    setSheetSyncConfigs(prev => {
      const next = prev.filter(c => c.id !== id);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}sheets_sync_configs`, next);
      return next;
    });
    if (target) {
      showNotification(`Koneksi Google Sheets "${target.name}" berhasil dihapus`, 'info');
      await addAuditLogInternal('GOOGLE_SHEET_SYNC_CONFIG_DELETED', 'finance', `Menghapus koneksi Google Sheets: ${target.name}`);
    }
  };

  const runGoogleSheetSync = async (
    configId: string,
    options?: { silent?: boolean }
  ): Promise<BatchImportResult> => {
    const config = sheetSyncConfigs.find(c => c.id === configId);
    if (!config) {
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        matchedLeadsCount: 0,
        totalInflowAmount: 0,
        totalOutflowAmount: 0,
        message: 'Konfigurasi Google Sheets tidak ditemukan.'
      };
    }

    try {
      const accessToken = config.authMode === 'oauth' ? getSheetsAccessToken() : null;
      const { headers, rows } = await fetchGoogleSheetRows({
        spreadsheetId: config.spreadsheetId,
        sheetName: config.sheetName,
        gid: config.gid,
        authMode: config.authMode,
        accessToken
      });

      const autoMapping = autoDetectColumnMapping(headers);
      const effectiveMapping = {
        ...autoMapping,
        ...(config.columnMapping || {})
      };

      const parsedRows = normalizeSpreadsheetRows({
        rawRows: rows,
        mapping: effectiveMapping,
        defaultType: config.defaultType,
        defaultSourceAccount: config.defaultSourceAccount,
        defaultBudgetId: config.defaultBudgetId,
        existingTransactions: cashTransactions,
        bankAccounts,
        budgetAllocations,
        accountingPeriods,
        chartOfAccounts
      });

      const validNewRows = parsedRows.filter(r => r.isValid && !r.isDuplicate);
      const duplicateRowsCount = parsedRows.filter(r => r.isDuplicate).length;

      let result: BatchImportResult;
      if (validNewRows.length > 0) {
        result = await bulkImportCashTransactions(
          validNewRows.map(r => ({
            date: r.date,
            receivedDate: r.receivedDate,
            type: r.type,
            category: r.category,
            description: r.description,
            amount: r.amount,
            sourceAccount: r.sourceAccount,
            referenceNo: r.referenceNo,
            incomeSource: r.incomeSource,
            paymentStage: r.paymentStage,
            linkedEntityName: r.linkedEntityName,
            budgetId: r.budgetId,
            budgetName: r.budgetName,
            qty: r.qty,
            unit: r.unit,
            unitPrice: r.unitPrice,
            contraAccountCode: r.contraAccountCode,
            contraAccountName: r.contraAccountName
          })),
          `Google Sheets: ${config.name}`
        );
      } else {
        result = {
          success: true,
          importedCount: 0,
          skippedDuplicateCount: duplicateRowsCount,
          matchedLeadsCount: 0,
          totalInflowAmount: 0,
          totalOutflowAmount: 0,
          message: `Sinkronisasi "${config.name}" selesai: Tidak ada baris transaksi baru (${duplicateRowsCount} baris sudah tercatat).`
        };
        if (!options?.silent) {
          showNotification(result.message, 'info');
        }
      }

      const updatedConfig: GoogleSheetSyncConfig = {
        ...config,
        lastSyncedAt: new Date().toISOString(),
        lastSyncCount: result.importedCount,
        lastSkippedCount: result.skippedDuplicateCount,
        lastSyncStatus: result.success ? 'success' : 'error',
        lastSyncMessage: result.message
      };

      await saveDocument('sheets_sync_configs', updatedConfig);
      setSheetSyncConfigs(prev => {
        const next = prev.map(c => c.id === config.id ? updatedConfig : c);
        scheduleStorageWrite(`${STORAGE_KEY_PREFIX}sheets_sync_configs`, next);
        return next;
      });

      return result;
    } catch (error: any) {
      const errMsg = error?.message || 'Gagal menyinkronkan Google Sheets.';
      const updatedConfig: GoogleSheetSyncConfig = {
        ...config,
        lastSyncedAt: new Date().toISOString(),
        lastSyncStatus: 'error',
        lastSyncMessage: errMsg
      };
      await saveDocument('sheets_sync_configs', updatedConfig).catch(() => {});
      setSheetSyncConfigs(prev => prev.map(c => c.id === config.id ? updatedConfig : c));
      if (!options?.silent) {
        showNotification(`Gagal sync "${config.name}": ${errMsg}`, 'error');
      }
      return {
        success: false,
        importedCount: 0,
        skippedDuplicateCount: 0,
        matchedLeadsCount: 0,
        totalInflowAmount: 0,
        totalOutflowAmount: 0,
        message: errMsg
      };
    }
  };

  // Background Auto-Sync Scheduler for active Google Sheet connections
  useEffect(() => {
    const activeConfigs = sheetSyncConfigs.filter(c => c.autoSyncEnabled && c.spreadsheetId);
    if (activeConfigs.length === 0) return;

    const timer = setInterval(() => {
      const nowMs = Date.now();
      activeConfigs.forEach(cfg => {
        const intervalMs = (cfg.intervalMinutes || 5) * 60 * 1000;
        const lastMs = cfg.lastSyncedAt ? new Date(cfg.lastSyncedAt).getTime() : 0;
        if (nowMs - lastMs >= intervalMs - 2000) {
          runGoogleSheetSync(cfg.id, { silent: true }).catch(() => {});
        }
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [sheetSyncConfigs, cashTransactions.length]);

  const addRecurringBill = async (billData: Omit<RecurringBill, 'id'>) => {
    try {
      const newBill: RecurringBill = {
        ...billData,
        id: `rb_${Date.now()}`
      };
      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('recurring_bills', newBill);

      // State React HANYA di-update jika respons dari Firebase sukses
      setRecurringBills(prev => [newBill, ...prev]);
      showNotification(`Tagihan berulang "${newBill.name}" berhasil ditambahkan ke database cloud.`, 'success');
    } catch (error: any) {
      console.error('[addRecurringBill] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan tagihan berulang ke database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const updateRecurringBill = async (id: string, updates: Partial<RecurringBill>) => {
    try {
      // VALIDASI FIREBASE-FIRST
      await saveDocument('recurring_bills', { id, ...updates });
      setRecurringBills(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
      showNotification(`Tagihan berulang berhasil diperbarui di database cloud.`, 'success');
    } catch (error: any) {
      console.error('[updateRecurringBill] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal memperbarui tagihan berulang di database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const deleteRecurringBill = async (id: string) => {
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('recurring_bills', id);
      setRecurringBills(prev => prev.filter(r => r.id !== id));
      showNotification(`Tagihan berulang berhasil dihapus dari database cloud.`, 'info');
    } catch (error: any) {
      console.error('[deleteRecurringBill] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus tagihan berulang dari database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const addBudgetAllocation = async (data: Omit<BudgetAllocation, 'id' | 'spentAmount'>) => {
    try {
      const newId = `bdg_${Date.now()}`;
      const newBudget: BudgetAllocation = {
        ...data,
        id: newId,
        spentAmount: 0
      };
      // VALIDASI FIREBASE-FIRST: Commit ke cloud Firestore terlebih dahulu
      await saveDocument('budgets', newBudget);

      // State React HANYA di-update jika respons dari Firebase sukses
      setBudgetAllocations(prev => {
        const next = [newBudget, ...prev];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(next)); } catch (e) {}
        return next;
      });

      showNotification(`Alokasi anggaran "${data.department} - ${data.category}" berhasil disimpan ke database cloud`, 'success');
      await addAuditLogInternal('BUDGET_CREATED', 'finance', `Membuat anggaran ${data.department} (Plafon: Rp ${(data.allocatedAmount || 0).toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[addBudgetAllocation] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan anggaran ke database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const updateBudgetAllocation = async (id: string, updates: Partial<BudgetAllocation>) => {
    try {
      const target = budgetAllocations.find(b => b.id === id);
      if (target) {
        const updated: BudgetAllocation = { ...target, ...updates };
        // VALIDASI FIREBASE-FIRST
        await saveDocument('budgets', updated);

        setBudgetAllocations(prev => {
          const next = prev.map(b => b.id === id ? updated : b);
          try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(next)); } catch (e) {}
          return next;
        });
        showNotification(`Alokasi anggaran "${updated.department}" berhasil diperbarui di database cloud`, 'success');
        await addAuditLogInternal('BUDGET_UPDATED', 'finance', `Memperbarui alokasi anggaran: ${target.department} (Plafon: Rp ${(updated.allocatedAmount || 0).toLocaleString('id-ID')})`);
      }
    } catch (error: any) {
      console.error('[updateBudgetAllocation] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memperbarui anggaran di database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const deleteBudgetAllocation = async (id: string) => {
    try {
      const target = budgetAllocations.find(b => b.id === id);
      // VALIDASI FIREBASE-FIRST: Hapus di cloud Firestore terlebih dahulu
      await deleteDocument('budgets', id);

      // State React HANYA di-update setelah penghapusan di Firestore sukses
      setBudgetAllocations(prev => {
        const next = prev.filter(b => b.id !== id);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}budgets`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      
      // Also decouple deleted budget from any cash transactions in local state
      setCashTransactions(prev => {
        let changed = false;
        const nextTxs = prev.map(tx => {
          if (tx.budgetId === id) {
            changed = true;
            return { ...tx, budgetId: undefined, budgetName: undefined };
          }
          return tx;
        });
        if (changed) {
          try { localStorage.setItem(`${STORAGE_KEY_PREFIX}cash_transactions`, JSON.stringify(nextTxs)); } catch (e) {}
        }
        return nextTxs;
      });

      showNotification(`Alokasi anggaran "${target?.department || id}" berhasil dihapus dari database cloud`, 'info');
      await addAuditLogInternal('BUDGET_DELETED', 'finance', `Menghapus alokasi anggaran: ${target?.department || id}`);
    } catch (error: any) {
      console.error('[deleteBudgetAllocation] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus anggaran dari database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const isPeriodLocked = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const targetPeriod = dateStr.slice(0, 7); // YYYY-MM
    return accountingPeriods.some(p => p.period === targetPeriod && p.status === 'locked');
  };

  const addJournalEntry = async (entryData: Omit<JournalEntry, 'id' | 'entryNumber' | 'status' | 'createdBy'>) => {
    if (isPeriodLocked(entryData.date)) {
      showNotification(`Aksi Ditolak: Periode akuntansi ${entryData.date.slice(0, 7)} telah ditutup dan dikunci. Hubungi Super Admin / Direktur untuk membuka kunci.`, 'error');
      throw new Error(`Periode akuntansi ${entryData.date.slice(0, 7)} terkunci.`);
    }

    // Zero-fault double entry check
    const totalDebit = entryData.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredit = entryData.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
    if (totalDebit !== totalCredit || totalDebit <= 0) {
      showNotification(`Aksi Ditolak: Jurnal tidak seimbang! Total Debit (Rp ${totalDebit.toLocaleString('id-ID')}) != Total Kredit (Rp ${totalCredit.toLocaleString('id-ID')})`, 'error');
      throw new Error('Jurnal tidak seimbang');
    }

    try {
      const yyyy = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const periodKey = `${yyyy}${mm}`;
      const nextNum = await getNextDocumentNumber('journal', periodKey);
      const entryNumber = `JV-${yyyy}${mm}-${String(nextNum).padStart(3, '0')}`;

      const newEntry: JournalEntry = {
        ...entryData,
        id: `jrn_${Date.now()}`,
        entryNumber,
        status: 'posted',
        createdBy: currentUser.name
      };

      // Calculate updated COA balances in memory
      const updatedCOA = chartOfAccounts.map(acc => {
        const line = entryData.lines.find(l => l.accountCode === acc.code);
        if (!line) return acc;
        const balanceDelta = acc.normalBalance === 'Debit' ? line.debit - line.credit : line.credit - line.debit;
        return { ...acc, balance: acc.balance + balanceDelta };
      });

      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('journal', newEntry);
      await saveMultipleDocuments('coa', updatedCOA);

      // State React HANYA di-update jika respons dari Firebase sukses (kode 200/OK)
      setJournalEntries(prev => {
        const next = [newEntry, ...prev.filter(j => j.id !== newEntry.id)];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setChartOfAccounts(updatedCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(updatedCOA)); } catch (e) {}

      showNotification(`Jurnal Umum ${entryNumber} berhasil dibukukan ke database cloud`, 'success');
      await addAuditLogInternal('JOURNAL_ENTRY_POSTED', 'accounting', `Membukukan Jurnal Umum ${entryNumber}: ${entryData.description} (Total: Rp ${entryData.totalAmount.toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[addJournalEntry] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal membukukan Jurnal ke database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      throw error;
    }
  };

  const updateJournalEntry = async (id: string, updates: Partial<JournalEntry>): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'accounting_manager' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Staff Akuntansi, Super Admin & Direktur Utama yang berwenang mengubah jurnal!', 'error');
      return { success: false, message: 'Akses ditolak.' };
    }

    const oldEntry = journalEntries.find(j => j.id === id);
    if (!oldEntry) {
      return { success: false, message: 'Entri jurnal tidak ditemukan.' };
    }

    if (isPeriodLocked(oldEntry.date) || (updates.date && isPeriodLocked(updates.date))) {
      showNotification('Aksi Ditolak: Jurnal berada dalam periode akuntansi yang terkunci (Tutup Buku). Buka kunci periode terlebih dahulu.', 'error');
      return { success: false, message: 'Periode terkunci.' };
    }

    const updatedEntry: JournalEntry = {
      ...oldEntry,
      ...updates
    };

    // Revert old lines and apply new lines to COA
    const updatedCOA = chartOfAccounts.map(acc => {
      let balance = acc.balance;
      
      // Revert old effect
      const oldLine = oldEntry.lines.find(l => l.accountCode === acc.code);
      if (oldLine) {
        const oldDelta = acc.normalBalance === 'Debit' ? oldLine.debit - oldLine.credit : oldLine.credit - oldLine.debit;
        balance -= oldDelta;
      }

      // Apply new effect
      const newLine = updatedEntry.lines.find(l => l.accountCode === acc.code);
      if (newLine) {
        const newDelta = acc.normalBalance === 'Debit' ? newLine.debit - newLine.credit : newLine.credit - newLine.debit;
        balance += newDelta;
      }

      return { ...acc, balance };
    });

    try {
      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('journal', updatedEntry);
      await saveMultipleDocuments('coa', updatedCOA);

      // State React HANYA di-update jika respons dari Firebase sukses
      setJournalEntries(prev => {
        const next = prev.map(j => j.id === id ? updatedEntry : j);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setChartOfAccounts(updatedCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(updatedCOA)); } catch (e) {}

      showNotification(`Entri Jurnal ${updatedEntry.entryNumber} berhasil diperbarui di database`, 'success');
      await addAuditLogInternal('JOURNAL_ENTRY_UPDATED', 'accounting', `Memperbarui Jurnal ${updatedEntry.entryNumber}: ${updatedEntry.description}`);
      return { success: true };
    } catch (error: any) {
      console.error('[updateJournalEntry] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal memperbarui Jurnal di database: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database' };
    }
  };

  const deleteJournalEntry = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'accounting_manager' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Staff Akuntansi, Super Admin & Direktur Utama yang berwenang menghapus jurnal!', 'error');
      return { success: false, message: 'Akses ditolak.' };
    }

    const targetEntry = journalEntries.find(j => j.id === id);
    if (!targetEntry) {
      return { success: false, message: 'Entri jurnal tidak ditemukan.' };
    }

    if (isPeriodLocked(targetEntry.date)) {
      showNotification('Aksi Ditolak: Jurnal berada dalam periode akuntansi yang terkunci (Tutup Buku). Buka kunci periode terlebih dahulu.', 'error');
      return { success: false, message: 'Periode terkunci.' };
    }

    // 1. Calculate reverted COA balances
    const updatedCOA = chartOfAccounts.map(acc => {
      const line = targetEntry.lines.find(l => l.accountCode === acc.code);
      if (!line) return acc;
      const delta = acc.normalBalance === 'Debit' ? line.debit - line.credit : line.credit - line.debit;
      return { ...acc, balance: acc.balance - delta };
    });

    try {
      // VALIDASI FIREBASE-FIRST: Commit penghapusan ke cloud Firestore terlebih dahulu
      await deleteDocument('journal', id);
      await saveMultipleDocuments('coa', updatedCOA);

      // State React HANYA di-update jika Firebase berhasil
      setChartOfAccounts(updatedCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(updatedCOA)); } catch (e) {}
      setJournalEntries(prev => {
        const next = prev.filter(j => j.id !== id);
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(next)); } catch (e) {}
        return next;
      });

      showNotification(`Entri Jurnal ${targetEntry.entryNumber} berhasil dihapus & saldo COA disesuaikan`, 'info');
      await addAuditLogInternal('JOURNAL_ENTRY_DELETED', 'accounting', `Menghapus Jurnal ${targetEntry.entryNumber}: ${targetEntry.description}`);
      return { success: true };
    } catch (error: any) {
      console.error('[deleteJournalEntry] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus entri jurnal di database: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menghapus dari database' };
    }
  };

  const addChartOfAccount = async (account: ChartOfAccount): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = ['super_admin', 'accounting_manager', 'finance_manager', 'direktur_utama'].includes(currentUser.role);
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Tim Akuntansi, Keuangan, Direktur Utama, atau Super Admin yang berwenang menambah akun COA!', 'error');
      return { success: false, message: 'Akses ditolak.' };
    }
    if (!account.code || !account.name) {
      return { success: false, message: 'Kode dan nama akun wajib diisi.' };
    }
    if (chartOfAccounts.some(a => a.code === account.code)) {
      showNotification(`Kode akun COA ${account.code} sudah terdaftar!`, 'error');
      return { success: false, message: 'Kode akun sudah ada.' };
    }

    try {
      const nextCOA = [...chartOfAccounts, account].sort((a, b) => a.code.localeCompare(b.code));
      await saveMultipleDocuments('coa', nextCOA);
      setChartOfAccounts(nextCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(nextCOA)); } catch (e) {}
      showNotification(`Akun COA baru [${account.code} - ${account.name}] berhasil ditambahkan!`, 'success');
      await addAuditLogInternal('COA_ACCOUNT_CREATED', 'accounting', `Menambahkan akun COA baru: ${account.code} - ${account.name} (${account.type})`);
      return { success: true };
    } catch (err: any) {
      showNotification(`Gagal menyimpan akun COA: ${err?.message || 'Error'}`, 'error');
      return { success: false, message: err?.message };
    }
  };

  const reverseJournalEntry = async (journalId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'accounting_manager' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Staff Akuntansi, Super Admin & Direktur Utama yang berwenang membuat jurnal pembalik!', 'error');
      return { success: false, message: 'Akses ditolak.' };
    }

    const target = journalEntries.find(j => j.id === journalId);
    if (!target) {
      showNotification('Entri jurnal tidak ditemukan.', 'error');
      return { success: false, message: 'Jurnal tidak ditemukan' };
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (isPeriodLocked(todayStr)) {
      showNotification('Aksi Ditolak: Periode saat ini sedang dikunci. Buka kunci periode terlebih dahulu.', 'error');
      return { success: false, message: 'Periode terkunci.' };
    }

    try {
      const yyyy = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const periodKey = `${yyyy}${mm}`;
      const nextNum = await getNextDocumentNumber('journal', periodKey);
      const entryNumber = `JV-${yyyy}${mm}-${String(nextNum).padStart(3, '0')}`;

      // Invert lines: debits become credits, credits become debits
      const reversedLines = target.lines.map(line => ({
        accountCode: line.accountCode,
        accountName: line.accountName,
        debit: line.credit,
        credit: line.debit
      }));

      const reversalEntry: JournalEntry = {
        id: `jrn_rev_${Date.now()}`,
        entryNumber,
        date: todayStr,
        description: `[JURNAL PEMBALIK / STORNO] Koreksi atas voucher ${target.entryNumber}: ${target.description} (Alasan: ${reason})`,
        lines: reversedLines,
        totalAmount: target.totalAmount,
        referenceModule: 'accounting',
        referenceId: target.id,
        createdBy: currentUser.name,
        status: 'posted',
        isReversalEntry: true,
        reversedFromEntryNumber: target.entryNumber,
        reversalReason: reason
      };

      // Update COA balances
      const updatedCOA = chartOfAccounts.map(acc => {
        const line = reversedLines.find(l => l.accountCode === acc.code);
        if (!line) return acc;
        const delta = acc.normalBalance === 'Debit' ? line.debit - line.credit : line.credit - line.debit;
        return { ...acc, balance: acc.balance + delta };
      });

      await saveDocument('journal', reversalEntry);
      await saveMultipleDocuments('coa', updatedCOA);

      setJournalEntries(prev => {
        const next = [reversalEntry, ...prev];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}journal`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setChartOfAccounts(updatedCOA);
      try { localStorage.setItem(`${STORAGE_KEY_PREFIX}coa`, JSON.stringify(updatedCOA)); } catch (e) {}

      showNotification(`Jurnal Pembalik ${entryNumber} berhasil dibukukan untuk mengoreksi voucher ${target.entryNumber}`, 'success');
      await addAuditLogInternal('JOURNAL_REVERSAL_POSTED', 'accounting', `Membukukan Jurnal Pembalik ${entryNumber} (Voucher asal: ${target.entryNumber}, Alasan: ${reason})`);
      return { success: true };
    } catch (err: any) {
      console.error('[reverseJournalEntry] Error:', err);
      showNotification('Gagal membukukan jurnal pembalik: ' + err?.message, 'error');
      return { success: false, message: err?.message };
    }
  };

  const closeAccountingPeriod = async (period: string, notes?: string): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama' || currentUser.role === 'accounting_manager';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Pimpinan dan Kepala Akuntansi yang berwenang mengeksekusi tutup buku periode!', 'error');
      return { success: false, message: 'Tidak memiliki wewenang.' };
    }

    const existing = accountingPeriods.find(p => p.period === period && p.status === 'locked');
    if (existing) {
      showNotification(`Periode ${period} sudah ditutup sebelumnya dan saat ini dalam status terkunci.`, 'info');
      return { success: false, message: 'Periode sudah terkunci.' };
    }

    try {
      const periodJournals = journalEntries.filter(j => j.date.startsWith(period) && !j.isClosingEntry);
      
      const revAccounts = chartOfAccounts.filter(a => a.type === 'Revenue');
      const expAccounts = chartOfAccounts.filter(a => a.type === 'Expense');

      const closingLines: { accountCode: string; accountName: string; debit: number; credit: number }[] = [];
      let totalRev = 0;
      let totalExp = 0;

      for (const r of revAccounts) {
        let rBal = 0;
        for (const jrn of periodJournals) {
          for (const l of jrn.lines) {
            if (l.accountCode === r.code) {
              rBal += (l.credit - l.debit);
            }
          }
        }
        if (rBal > 0) {
          totalRev += rBal;
          closingLines.push({
            accountCode: r.code,
            accountName: r.name,
            debit: rBal,
            credit: 0
          });
        }
      }

      for (const e of expAccounts) {
        let eBal = 0;
        for (const jrn of periodJournals) {
          for (const l of jrn.lines) {
            if (l.accountCode === e.code) {
              eBal += (l.debit - l.credit);
            }
          }
        }
        if (eBal > 0) {
          totalExp += eBal;
          closingLines.push({
            accountCode: e.code,
            accountName: e.name,
            debit: 0,
            credit: eBal
          });
        }
      }

      const netIncome = totalRev - totalExp;
      if (netIncome !== 0) {
        if (netIncome > 0) {
          closingLines.push({
            accountCode: '3210',
            accountName: 'Laba Ditahan Operasional Agrowisata',
            debit: 0,
            credit: netIncome
          });
        } else {
          closingLines.push({
            accountCode: '3210',
            accountName: 'Laba Ditahan Operasional Agrowisata',
            debit: Math.abs(netIncome),
            credit: 0
          });
        }
      }

      const [yearStr, monthStr] = period.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const periodName = `${monthNames[month] || period} ${year}`;

      const nextNum = await getNextDocumentNumber('journal', `${yearStr}${monthStr}`);
      const closingEntryNumber = `JV-${yearStr}${monthStr}-CLS-${String(nextNum).padStart(3, '0')}`;
      const closingJournalId = `jrn_close_${period}_${Date.now()}`;

      const closingTotalAmount = Math.max(totalRev, totalExp + Math.max(0, netIncome));

      const closingJournal: JournalEntry = {
        id: closingJournalId,
        entryNumber: closingEntryNumber,
        date: `${period}-28`,
        description: `[JURNAL PENUTUP] Tutup Buku Resmi Periode ${periodName} (Laba Bersih: Rp ${netIncome.toLocaleString('id-ID')})`,
        lines: closingLines.length > 0 ? closingLines : [
          { accountCode: '3210', accountName: 'Laba Ditahan Operasional Agrowisata', debit: 0, credit: 0 }
        ],
        totalAmount: closingTotalAmount,
        referenceModule: 'accounting',
        createdBy: currentUser.name,
        status: 'posted',
        isClosingEntry: true,
        isLocked: true
      };

      const newLock: AccountingPeriodLock = {
        id: `lock_${period}`,
        period,
        periodName,
        year,
        month,
        closedAt: new Date().toISOString(),
        closedBy: currentUser.name,
        closingJournalId,
        closingJournalNumber: closingEntryNumber,
        netIncome,
        status: 'locked',
        notes: notes || `Tutup buku periode ${periodName} resmi diselesaikan oleh ${currentUser.name}.`
      };

      await saveDocument('journal', closingJournal);
      await saveDocument('accounting_periods', newLock);

      setJournalEntries(prev => [closingJournal, ...prev]);
      setAccountingPeriods(prev => [newLock, ...prev.filter(p => p.id !== newLock.id)]);

      await refreshAndReconcileAccounting();

      showNotification(`Tutup Buku Periode ${periodName} Berhasil! Jurnal penutup ${closingEntryNumber} telah dibukukan & periode dikunci.`, 'success');
      await addAuditLogInternal('PERIOD_CLOSED', 'accounting', `Tutup buku periode ${periodName} (Laba bersih: Rp ${netIncome.toLocaleString('id-ID')}) oleh ${currentUser.name}`);
      return { success: true };
    } catch (err: any) {
      console.error('[closeAccountingPeriod] Error:', err);
      showNotification('Gagal melakukan tutup buku: ' + err?.message, 'error');
      return { success: false, message: err?.message };
    }
  };

  const reopenAccountingPeriod = async (periodId: string): Promise<{ success: boolean; message?: string }> => {
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Super Admin dan Direktur Utama yang berwenang membuka kunci periode akuntansi!', 'error');
      return { success: false, message: 'Akses ditolak.' };
    }

    const targetLock = accountingPeriods.find(p => p.id === periodId || p.period === periodId);
    if (!targetLock) {
      return { success: false, message: 'Data periode tidak ditemukan.' };
    }

    try {
      const updatedLock: AccountingPeriodLock = {
        ...targetLock,
        status: 'open'
      };

      await saveDocument('accounting_periods', updatedLock);
      setAccountingPeriods(prev => prev.map(p => p.id === targetLock.id ? updatedLock : p));

      showNotification(`Kunci periode ${targetLock.periodName} berhasil dibuka kembali. Penyesuaian jurnal kini diperbolehkan.`, 'info');
      await addAuditLogInternal('PERIOD_REOPENED', 'accounting', `Membuka kunci periode akuntansi: ${targetLock.periodName}`);
      return { success: true };
    } catch (err: any) {
      console.error('[reopenAccountingPeriod] Error:', err);
      showNotification('Gagal membuka kunci periode: ' + err?.message, 'error');
      return { success: false, message: err?.message };
    }
  };

  const refreshAndReconcileAccounting = async (): Promise<{
    success: boolean;
    orphanedRemoved: number;
    unrecordedPosted: number;
    totalActiveJournals: number;
    timestamp: string;
    message?: string;
  }> => {
    try {
      // 1. Identify and purge orphaned journal entries
      // Entries with referenceModule === 'finance' whose cash transaction no longer exists
      const validCashTxIds = new Set(cashTransactions.map(t => t.id));
      let orphanedCount = 0;
      const validJournals: JournalEntry[] = [];

      for (const jrn of journalEntries) {
        if (jrn.referenceModule === 'finance' && jrn.referenceId) {
          if (!validCashTxIds.has(jrn.referenceId)) {
            // Cash transaction was deleted! Delete this stale journal entry from firestore
            await deleteDocument('journal', jrn.id);
            orphanedCount++;
            continue;
          }
        }
        validJournals.push(jrn);
      }

      // 2. Identify unrecorded cash transactions and auto-post them in batch using buildDeterministicJournalsAndCOA
      const {
        journals: reconciledJournals,
        coa: recomputedCOA,
        banks: recomputedBanks,
        budgets: recomputedBudgets,
        newlyGeneratedJournals,
        updatedTransactions
      } = buildDeterministicJournalsAndCOA({
        transactions: cashTransactions,
        existingJournals: validJournals,
        existingCOA: chartOfAccounts,
        existingBanks: bankAccounts,
        existingBudgets: budgetAllocations,
        actorName: currentUser?.name || 'Sistem Rekonsiliasi Otomatis'
      });

      const autoPostedCount = newlyGeneratedJournals.length;
      if (newlyGeneratedJournals.length > 0) {
        await saveMultipleDocuments('journal', newlyGeneratedJournals);
      }

      setCashTransactions(updatedTransactions);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}cash_transactions`, updatedTransactions);
      await saveMultipleDocuments('cash_transactions', updatedTransactions);

      setJournalEntries(reconciledJournals);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}journal`, reconciledJournals);

      setChartOfAccounts(recomputedCOA);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}coa`, recomputedCOA);
      await saveMultipleDocuments('coa', recomputedCOA);

      setBankAccounts(recomputedBanks);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}bank_accounts`, recomputedBanks);
      await saveMultipleDocuments('bank_accounts', recomputedBanks);

      setBudgetAllocations(recomputedBudgets);
      scheduleStorageWrite(`${STORAGE_KEY_PREFIX}budgets`, recomputedBudgets);
      await saveMultipleDocuments('budgets', recomputedBudgets);

      const timestampStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      showNotification(`Rekonsiliasi Akuntansi Selesai (${timestampStr}): ${orphanedCount} jurnal kadaluarsa dibersihkan, ${autoPostedCount} transaksi dibukukan, saldo COA & Bank 100% mutakhir.`, 'success');
      await addAuditLogInternal('ACCOUNTING_RECONCILED', 'accounting', `Sinkronisasi Akuntansi: ${orphanedCount} entri terhapus dibersihkan, ${autoPostedCount} transaksi baru dibukukan, ${reconciledJournals.length} total voucher aktif.`);

      return {
        success: true,
        orphanedRemoved: orphanedCount,
        unrecordedPosted: autoPostedCount,
        totalActiveJournals: reconciledJournals.length,
        timestamp: timestampStr
      };
    } catch (err: any) {
      showNotification('Gagal melakukan sinkronisasi data akuntansi: ' + (err?.message || 'Error'), 'error');
      return {
        success: false,
        orphanedRemoved: 0,
        unrecordedPosted: 0,
        totalActiveJournals: journalEntries.length,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        message: err?.message
      };
    }
  };

  const addMarketingCampaign = async (data: Omit<MarketingCampaign, 'id' | 'spent' | 'leadsGenerated' | 'conversions' | 'roiPercentage'>) => {
    const newId = `cmp_${Date.now()}`;
    const newCamp: MarketingCampaign = {
      ...data,
      id: newId,
      spent: 0,
      leadsGenerated: 0,
      conversions: 0,
      roiPercentage: 0
    };
    setMarketingCampaigns(prev => [newCamp, ...prev]);
    await saveDocument('marketing', newCamp);

    showNotification(`Promosi "${data.name}" berhasil didaftarkan`, 'success');
    await addAuditLogInternal('CAMPAIGN_CREATED', 'marketing', `Membuat program promosi baru: ${data.name} (Budget: Rp ${(data.budget || 0).toLocaleString('id-ID')})`);
  };

  const updateMarketingCampaign = async (id: string, updates: Partial<MarketingCampaign>) => {
    const target = marketingCampaigns.find(c => c.id === id);
    if (target) {
      const updated: MarketingCampaign = { ...target, ...updates };
      setMarketingCampaigns(prev => prev.map(c => c.id === id ? updated : c));
      await saveDocument('marketing', updated);
      showNotification(`Promosi berhasil diperbarui`, 'success');
      await addAuditLogInternal('CAMPAIGN_UPDATED', 'marketing', `Memperbarui promosi: ${target.name}`);
    }
  };

  const deleteMarketingCampaign = async (id: string) => {
    const target = marketingCampaigns.find(c => c.id === id);
    setMarketingCampaigns(prev => prev.filter(c => c.id !== id));
    await deleteDocument('marketing', id);
    showNotification(`Promosi "${target?.name || id}" berhasil dihapus`, 'info');
    await addAuditLogInternal('CAMPAIGN_DELETED', 'marketing', `Menghapus program promosi: ${target?.name || id}`);
  };

  const addLead = async (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    try {
      const newId = `ld_${Date.now()}`;
      const newLead: Lead = {
        ...leadData,
        id: newId,
        createdAt: new Date().toISOString().split('T')[0]
      };
      await unmarkRecordAsDeleted('leads', newId);
      // VALIDASI FIREBASE-FIRST: Wajib commit ke cloud Firestore terlebih dahulu
      await saveDocument('leads', newLead);

      // State React HANYA di-update jika respons dari Firebase sukses
      setLeads(prev => [newLead, ...prev]);

      showNotification(`Calon Peminat "${leadData.name}" (${leadData.company}) berhasil ditambahkan ke database cloud`, 'success');
      await addAuditLogInternal('LEAD_CREATED', 'sales', `Menambah prospek baru: ${leadData.name} - Estimasi: Rp ${leadData.dealValue.toLocaleString('id-ID')}`);
    } catch (error: any) {
      console.error('[addLead] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan data prospek ke database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateLeadStage = async (leadId: string, newStage: Lead['stage']) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return;

    try {
      const updatedLead: Lead = {
        ...target,
        stage: newStage,
        probability: newStage === 'won' ? 100 : newStage === 'lost' ? 0 : target.probability
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('leads', updatedLead);

      // State React di-update hanya jika Firebase sukses
      setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));

      showNotification(`Status prospek ${target.company} dipindahkan ke: ${newStage.toUpperCase()}`, 'info');
      await addAuditLogInternal('LEAD_STAGE_UPDATED', 'sales', `Memindahkan tahap prospek ${target.company} ke: ${newStage.toUpperCase()}`);
    } catch (error: any) {
      console.error('[updateLeadStage] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memperbarui status prospek: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addLeadFollowUp = async (leadId: string, action: 'WhatsApp' | 'Telepon' | 'Survey Lokasi' | 'Meeting Proposal' | 'Email', note: string) => {
    const target = leads.find(l => l.id === leadId);
    if (!target) return;

    try {
      const newFollowUp = {
        id: `fup_${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        user: currentUser.name,
        action,
        note
      };

      const updatedLead: Lead = {
        ...target,
        followUpHistory: [newFollowUp, ...(target.followUpHistory || [])]
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('leads', updatedLead);

      // State React di-update setelah Firebase sukses
      setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));
      await addAuditLogInternal('LEAD_FOLLOWUP_LOGGED', 'sales', `Mencatat tindak lanjut (${action}) untuk prospek ${target.company}: ${note}`);
      showNotification(`Catatan interaksi (${action}) tersimpan untuk ${target?.company || 'prospek'}`, 'success');
    } catch (error: any) {
      console.error('[addLeadFollowUp] Gagal menyimpan log follow-up ke Firebase:', error);
      showNotification(`Gagal menyimpan catatan follow-up ke database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateSchoolName = async (leadId: string, newSchoolName: string): Promise<{ success: boolean; message: string }> => {
    // RBAC: Hanya Super Admin dan Direktur Utama yang berwenang merubah nama sekolah / rombongan
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      const msg = 'Akses Ditolak: Hanya Super Admin & Direktur Utama yang memiliki wewenang untuk merubah nama sekolah / lembaga yang sudah terdaftar!';
      showNotification(msg, 'error');
      return { success: false, message: msg };
    }

    const trimmedName = newSchoolName.trim();
    if (!trimmedName) {
      const msg = 'Nama sekolah / lembaga tidak boleh kosong.';
      showNotification(msg, 'warning');
      return { success: false, message: msg };
    }

    const target = leads.find(l => l.id === leadId);
    if (!target) {
      const msg = 'Data prospek sekolah tidak ditemukan.';
      showNotification(msg, 'error');
      return { success: false, message: msg };
    }

    const oldCompanyName = target.company;
    if (oldCompanyName === trimmedName) {
      return { success: true, message: 'Nama sekolah tidak berubah.' };
    }

    // 1. Update lead document
    const updatedLead: Lead = { ...target, company: trimmedName };
    setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));
    await saveDocument('leads', updatedLead);

    // 2. Cascade update related quotations
    const updatedQuotes = quotations.map(q => 
      (q.companyName.toLowerCase() === oldCompanyName.toLowerCase() || q.id === target.id)
        ? { ...q, companyName: trimmedName }
        : q
    );
    if (JSON.stringify(updatedQuotes) !== JSON.stringify(quotations)) {
      setQuotations(updatedQuotes);
      for (const q of updatedQuotes.filter(q => q.companyName === trimmedName)) {
        await saveDocument('quotations', q);
      }
    }

    // 3. Cascade update related sales orders
    const updatedSOs = salesOrders.map(so => 
      so.customerName.toLowerCase() === oldCompanyName.toLowerCase()
        ? { ...so, customerName: trimmedName }
        : so
    );
    if (JSON.stringify(updatedSOs) !== JSON.stringify(salesOrders)) {
      setSalesOrders(updatedSOs);
      for (const so of updatedSOs.filter(so => so.customerName === trimmedName)) {
        await saveDocument('sales_orders', so);
      }
    }

    // 4. Record Audit Log
    await addAuditLogInternal(
      'LEAD_SCHOOL_NAME_UPDATED',
      'sales',
      `Super Admin (${currentUser.name}) mengubah nama sekolah dari "${oldCompanyName}" menjadi "${trimmedName}" (ID Prospek: ${leadId})`
    );

    const successMsg = `Nama sekolah berhasil diperbarui menjadi "${trimmedName}" oleh Super Admin`;
    showNotification(successMsg, 'success');
    return { success: true, message: successMsg };
  };

  const updateLeadDetails = async (leadId: string, updates: Partial<Lead>) => {
    const target = leads.find(l => l.id === leadId);
    if (target) {
      // Validasi hak akses jika ada upaya merubah nama sekolah (company)
      if (updates.company && updates.company !== target.company) {
        if (currentUser.role !== 'super_admin') {
          showNotification('Akses Ditolak: Hanya Super Admin yang berhak merubah nama sekolah / instansi!', 'error');
          // Buang perubahan field company jika bukan super admin
          const { company, ...allowedUpdates } = updates;
          const updatedLead: Lead = { ...target, ...allowedUpdates };
          setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));
          await saveDocument('leads', updatedLead);
          return;
        }

        // Jika Super Admin, jalankan perubahan nama sekolah dan sinkronisasi
        const oldName = target.company;
        const newName = updates.company.trim();
        const updatedLead: Lead = { ...target, ...updates, company: newName };
        setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));
        await saveDocument('leads', updatedLead);

        // Cascade quotations
        const updatedQuotes = quotations.map(q => 
          q.companyName.toLowerCase() === oldName.toLowerCase() ? { ...q, companyName: newName } : q
        );
        if (JSON.stringify(updatedQuotes) !== JSON.stringify(quotations)) {
          setQuotations(updatedQuotes);
          for (const q of updatedQuotes.filter(q => q.companyName === newName)) {
            await saveDocument('quotations', q);
          }
        }

        // Cascade sales orders
        const updatedSOs = salesOrders.map(so => 
          so.customerName.toLowerCase() === oldName.toLowerCase() ? { ...so, customerName: newName } : so
        );
        if (JSON.stringify(updatedSOs) !== JSON.stringify(salesOrders)) {
          setSalesOrders(updatedSOs);
          for (const so of updatedSOs.filter(so => so.customerName === newName)) {
            await saveDocument('sales_orders', so);
          }
        }

        await addAuditLogInternal(
          'LEAD_SCHOOL_NAME_UPDATED',
          'sales',
          `Super Admin (${currentUser.name}) memperbarui nama sekolah dari "${oldName}" menjadi "${newName}"`
        );

        showNotification(`Rincian data prospek & nama sekolah ${newName} berhasil disimpan`, 'success');
        return;
      }

      const updatedLead: Lead = { ...target, ...updates };
      setLeads(prev => prev.map(ld => ld.id === leadId ? updatedLead : ld));
      await saveDocument('leads', updatedLead);
      showNotification(`Rincian data prospek ${target.company} berhasil disimpan`, 'success');
    }
  };

  const deleteLead = async (leadId: string): Promise<{ success: boolean; message?: string }> => {
    // RBAC: Hanya Super Admin dan Direktur Utama yang berwenang menghapus data sekolah / rombongan
    const isAuthorized = currentUser.role === 'super_admin' || currentUser.role === 'direktur_utama';
    if (!isAuthorized) {
      showNotification('Akses Ditolak: Hanya Super Admin & Direktur Utama yang memiliki wewenang untuk menghapus data sekolah / rombongan!', 'error');
      return { 
        success: false, 
        message: 'Akses Ditolak: Hanya Super Admin dan Direktur Utama yang berhak menghapus data sekolah / rombongan dari sistem ERP.' 
      };
    }

    const target = leads.find(l => l.id === leadId);
    if (!target) {
      showNotification('Data sekolah / rombongan tidak ditemukan.', 'error');
      return { success: false, message: 'Data prospek sekolah tidak ditemukan.' };
    }

    try {
      // 1. VALIDASI FIREBASE-FIRST: Hapus dokumen permanen dari Firestore terlebih dahulu
      await deleteDocument('leads', leadId);

      // 2. Clean up related notifications if any
      const relatedNotifs = notifications.filter(n => 
        n.metadata?.leadId === leadId || 
        (n.category === 'quotation' && n.metadata?.companyName === target.company)
      );
      for (const notif of relatedNotifs) {
        await deleteDocument('notifications', notif.id);
      }

      // 3. State React HANYA di-update jika Firebase berhasil
      const updatedLeads = leads.filter(l => l.id !== leadId);
      setLeads(updatedLeads);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}leads`, JSON.stringify(updatedLeads));

      setNotifications(prev => prev.filter(n => 
        !(n.metadata?.leadId === leadId || (n.category === 'quotation' && n.metadata?.companyName === target.company))
      ));

      showNotification(`Data sekolah / rombongan "${target.company}" berhasil dihapus secara permanen dari database cloud.`, 'info');
      await addAuditLogInternal(
        'LEAD_DELETED', 
        'sales', 
        `Super Admin (${currentUser.name}) menghapus data sekolah / rombongan: ${target.company} (PIC: ${target.name}, Estimasi Deal: Rp ${target.dealValue.toLocaleString('id-ID')})`
      );

      return { success: true };
    } catch (error: any) {
      console.error('[deleteLead] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus prospek dari database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menghapus dari database.' };
    }
  };

  const addQuotation = async (quoteData: Omit<Quotation, 'id' | 'status' | 'preparedBy' | 'quotationNumber'> & { quotationNumber?: string; status?: Quotation['status'] }) => {
    try {
      let qtnNum = quoteData.quotationNumber?.trim();
      if (!qtnNum) {
        const yyyy = new Date().getFullYear();
        const mm = String(new Date().getMonth() + 1).padStart(2, '0');
        const periodKey = `${yyyy}${mm}`;
        const nextNum = await getNextDocumentNumber('quotations', periodKey);
        qtnNum = `QTN-${yyyy}-${mm}-${String(nextNum).padStart(3, '0')}`;
      }
      const initialStatus: Quotation['status'] = quoteData.status || 'pending_approval';
      
      const newQuote: Quotation = {
        ...quoteData,
        id: `qtn_${Date.now()}`,
        quotationNumber: qtnNum,
        status: initialStatus,
        preparedBy: currentUser.name,
        preparedByTitle: currentUser.role === 'sales_cs' ? 'Sales & Marketing Representative' : currentUser.role === 'marketing_manager' ? 'Marketing Manager' : 'Sales Executive',
        subject: quoteData.subject || "Penawaran Harga Paket Wisata Edukasi & Rekreasi D'Kandang Amazing Farm",
        paymentTerms: quoteData.paymentTerms || "1. DP 30% saat konfirmasi pemesanan\n2. Pelunasan H-3 sebelum tanggal pelaksanaan kunjungan\n3. Pembayaran via transfer Bank Mandiri / BCA resmi PT D'Kandang Amazing Farm",
        bankDetails: quoteData.bankDetails || {
          bankName: "Bank Mandiri Cabang Depok Sawangan",
          accountNumber: "157-00-0988776-5",
          accountHolder: "PT. WISATA AGRO EDUKASI SEJAHTERA (D'KANDANG)"
        },
        termsAndConditions: quoteData.termsAndConditions || [
          "Harga sudah termasuk pemandu edukasi lapangan (Field Guide) & seluruh tiket aktivitas yang tertera.",
          "Setiap kelipatan 10 siswa mendapatkan 1 guru pendamping gratis (FOC) sesuai ketentuan paket.",
          "Konfirmasi final jumlah rombongan selambat-lambatnya H-5 sebelum tanggal pelaksanaan kunjungan.",
          "Reschedule tanggal dapat dilakukan maksimal 1 kali dengan pemberitahuan tertulis H-7."
        ]
      };
      
      // Also update lead dealValue & stage to proposal if exists
      const matchingLead = leads.find(ld => 
        (quoteData.leadId && ld.id === quoteData.leadId) ||
        ld.company.toLowerCase() === quoteData.companyName.toLowerCase() || 
        ld.name.toLowerCase() === quoteData.customerName.toLowerCase()
      );
      let updatedLead: Lead | null = null;
      if (matchingLead) {
        updatedLead = {
          ...matchingLead,
          stage: matchingLead.stage === 'lead' || matchingLead.stage === 'contacted' ? 'proposal' : matchingLead.stage,
          dealValue: quoteData.grandTotal
        };
      }

      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('quotations', newQuote);
      if (updatedLead) {
        await saveDocument('leads', updatedLead);
      }

      // State React HANYA di-update jika Firebase berhasil
      setQuotations(prev => [newQuote, ...prev]);
      if (updatedLead) {
        setLeads(prev => prev.map(ld => ld.id === matchingLead!.id ? updatedLead! : ld));
      }

      showNotification(`Surat Penawaran ${qtnNum} berhasil dibuat & tersimpan di database cloud`, 'success');
      await addAuditLogInternal('QUOTATION_CREATED', 'sales', `Surat Penawaran ${qtnNum} dibuat untuk ${quoteData.companyName} (Rp ${quoteData.grandTotal.toLocaleString('id-ID')}) - Status: Menunggu Approval Direksi`);
      return newQuote;
    } catch (error: any) {
      console.error('[addQuotation] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan Surat Penawaran: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateQuotation = async (id: string, updates: Partial<Quotation>) => {
    const target = quotations.find(q => q.id === id);
    if (!target) return;

    try {
      const updated: Quotation = { ...target, ...updates };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('quotations', updated);

      setQuotations(prev => prev.map(q => q.id === id ? updated : q));
      showNotification(`Surat Penawaran ${target.quotationNumber} berhasil diperbarui di database cloud`, 'success');
      await addAuditLogInternal('QUOTATION_UPDATED', 'sales', `Surat Penawaran ${target.quotationNumber} diperbarui`);
    } catch (error: any) {
      console.error('[updateQuotation] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memperbarui Surat Penawaran: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateCompanyProfile = async (updates: Partial<CompanyProfile>) => {
    const updated: CompanyProfile = { ...companyProfile, ...updates };
    setCompanyProfile(updated);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}company_profile`, JSON.stringify(updated));
    await saveDocument('company_profile', { id: 'main_profile', ...updated });
    showNotification('Data Profil Perusahaan & Kop Surat berhasil diperbarui', 'success');
    await addAuditLogInternal('COMPANY_PROFILE_UPDATED', 'security', `Profil Perusahaan diubah: ${updated.ptName} (${updated.name})`);
  };

  const deleteQuotation = async (id: string) => {
    const isAuthorized = currentUser.role === 'direktur_utama' || 
                         currentUser.role === 'super_admin' || 
                         currentUser.role === 'sales_director';
    if (!isAuthorized) {
      showNotification('Akses ditolak: Hanya Direksi dan Super Admin yang berwenang menghapus surat penawaran.', 'error');
      return;
    }
    const target = quotations.find(q => q.id === id);

    try {
      // VALIDASI FIREBASE-FIRST: Hapus di cloud Firestore terlebih dahulu
      await deleteDocument('quotations', id);

      setQuotations(prev => prev.filter(q => q.id !== id));
      showNotification(`Surat Penawaran ${target?.quotationNumber || id} berhasil dihapus dari database cloud`, 'info');
      await addAuditLogInternal('QUOTATION_DELETED', 'sales', `Surat Penawaran ${target?.quotationNumber || id} untuk ${target?.companyName || 'klien'} dihapus oleh ${currentUser.name} (${currentUser.role})`);
    } catch (error: any) {
      console.error('[deleteQuotation] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus Surat Penawaran: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const approveQuotation = async (id: string, notes?: string) => {
    const target = quotations.find(q => q.id === id);
    if (!target) return;

    try {
      const approverTitle = currentUser.role === 'direktur_utama' 
        ? 'Direktur Utama' 
        : currentUser.role === 'sales_director' 
        ? 'Direktur Sales & Marketing' 
        : 'Direksi / Pimpinan Operasional';

      const updated: Quotation = {
        ...target,
        status: 'approved',
        approvedBy: currentUser.name,
        approvedByTitle: approverTitle,
        approvedAt: new Date().toISOString(),
        approvalNotes: notes || 'Disetujui untuk diterbitkan & dikirim ke customer.',
        rejectionReason: undefined
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('quotations', updated);

      setQuotations(prev => prev.map(q => q.id === id ? updated : q));
      showNotification(`✅ Surat Penawaran ${target.quotationNumber} telah DISETUJUI oleh Direksi. Dokumen kini siap diekspor & dikirim ke customer!`, 'success');
      await addAuditLogInternal('QUOTATION_APPROVED', 'sales', `Surat Penawaran ${target.quotationNumber} (${target.companyName}) DISETUJUI oleh ${currentUser.name} (${approverTitle})`);
    } catch (error: any) {
      console.error('[approveQuotation] Gagal menyimpan persetujuan ke Firebase:', error);
      showNotification(`Gagal menyetujui penawaran di database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const rejectQuotation = async (id: string, reason: string) => {
    const target = quotations.find(q => q.id === id);
    if (!target) return;

    try {
      const updated: Quotation = {
        ...target,
        status: 'rejected',
        rejectionReason: reason || 'Perlu penyesuaian rincian harga / paket oleh tim sales.',
        approvalNotes: undefined
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('quotations', updated);

      setQuotations(prev => prev.map(q => q.id === id ? updated : q));
      showNotification(`⚠️ Surat Penawaran ${target.quotationNumber} Ditolak / Diminta Revisi oleh Direksi`, 'warning');
      await addAuditLogInternal('QUOTATION_REJECTED', 'sales', `Surat Penawaran ${target.quotationNumber} DITOLAK oleh ${currentUser.name}. Alasan: ${reason}`);
    } catch (error: any) {
      console.error('[rejectQuotation] Gagal menyimpan penolakan ke Firebase:', error);
      showNotification(`Gagal menolak penawaran di database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const sendQuotationToCustomer = async (id: string) => {
    const target = quotations.find(q => q.id === id);
    if (!target) return;

    if (target.status !== 'approved' && target.status !== 'sent' && target.status !== 'converted') {
      showNotification(`Surat penawaran harus disetujui Direksi terlebih dahulu sebelum dapat dikirim ke customer.`, 'warning');
      return;
    }

    try {
      const updated: Quotation = {
        ...target,
        status: target.status === 'converted' ? 'converted' : 'sent'
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('quotations', updated);

      setQuotations(prev => prev.map(q => q.id === id ? updated : q));
      showNotification(`Surat Penawaran ${target.quotationNumber} ditandai telah terkirim ke customer (${target.companyName})`, 'success');
      await addAuditLogInternal('QUOTATION_SENT', 'sales', `Surat Penawaran ${target.quotationNumber} dikirim ke ${target.companyName}`);
    } catch (error: any) {
      console.error('[sendQuotationToCustomer] Gagal menyimpan status kirim ke Firebase:', error);
      showNotification(`Gagal memperbarui status kirim: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const convertQuotationToSO = async (quotationId: string) => {
    const quote = quotations.find(q => q.id === quotationId);
    if (!quote) return;

    try {
      const yyyy = new Date().getFullYear();
      const periodKey = `${yyyy}`;
      const nextNum = await getNextDocumentNumber('sales_orders', periodKey);
      const soNum = `SO-${yyyy}-${String(nextNum + 100).padStart(3, '0')}`;
      const newSO: SalesOrder = {
        id: `so_${Date.now()}`,
        soNumber: soNum,
        quotationRef: quote.quotationNumber,
        customerName: quote.companyName || quote.customerName,
        date: new Date().toISOString().split('T')[0],
        items: quote.items,
        totalAmount: quote.grandTotal,
        status: 'processing',
        paymentStatus: 'unpaid',
        deliveryDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
      };

      const updatedQuote: Quotation = { ...quote, status: 'converted' };

      // Automatically generate Sales Invoice
      const invNextNum = await getNextDocumentNumber('sales_invoices', periodKey);
      const invNum = `INV-${yyyy}-${String(invNextNum + 100).padStart(3, '0')}`;
      const newInv: SalesInvoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: invNum,
        soReference: soNum,
        customerName: quote.companyName || quote.customerName,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        totalAmount: quote.grandTotal,
        paidAmount: 0,
        status: 'issued',
        items: quote.items.map(i => ({ sku: 'ITEM', name: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.totalPrice })),
        discount: 0
      };

      // Update matching lead
      const matchLead = leads.find(ld => 
        ld.company.toLowerCase() === quote.companyName.toLowerCase() || 
        ld.name.toLowerCase() === quote.customerName.toLowerCase()
      );
      let updatedLead: Lead | null = null;
      if (matchLead) {
        updatedLead = {
          ...matchLead,
          stage: 'won',
          dealValue: quote.grandTotal,
          probability: 100
        };
      }

      // VALIDASI FIREBASE-FIRST: Commit semua dokumen ke Firestore terlebih dahulu
      await saveDocument('quotations', updatedQuote);
      await saveDocument('sales_orders', newSO);
      await saveDocument('sales_invoices', newInv);
      if (updatedLead) {
        await saveDocument('leads', updatedLead);
      }

      // State React HANYA di-update jika Firebase berhasil
      setQuotations(prev => prev.map(q => q.id === quotationId ? updatedQuote : q));
      setSalesOrders(prev => [newSO, ...prev]);
      setSalesInvoices(prev => [newInv, ...prev]);
      if (updatedLead && matchLead) {
        setLeads(prev => prev.map(ld => ld.id === matchLead.id ? updatedLead! : ld));
      }

      showNotification(`Penawaran ${quote.quotationNumber} berhasil dikonversi ke ${soNum} & Faktur ${invNum} terbit!`, 'success');
      await addAuditLogInternal('QUOTATION_CONVERTED_TO_SO', 'sales', `Penawaran ${quote.quotationNumber} (${quote.companyName}) dikonversi menjadi Pesanan Penjualan ${soNum} & Faktur ${invNum} (Total: Rp ${quote.grandTotal.toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[convertQuotationToSO] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal mengonversi penawaran ke Pesanan Penjualan: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addSalesOrder = async (soData: Omit<SalesOrder, 'id' | 'soNumber' | 'status' | 'paymentStatus'>) => {
    try {
      const yyyy = new Date().getFullYear();
      const periodKey = `${yyyy}`;
      const nextNum = await getNextDocumentNumber('sales_orders', periodKey);
      const soNum = `SO-${yyyy}-${String(nextNum + 100).padStart(3, '0')}`;
      const newSO: SalesOrder = {
        ...soData,
        id: `so_${Date.now()}`,
        soNumber: soNum,
        status: 'processing',
        paymentStatus: 'unpaid'
      };

      const invNextNum = await getNextDocumentNumber('sales_invoices', periodKey);
      const invNum = `INV-${yyyy}-${String(invNextNum + 100).padStart(3, '0')}`;
      const newInv: SalesInvoice = {
        id: `inv_${Date.now()}`,
        invoiceNumber: invNum,
        soReference: soNum,
        customerName: soData.customerName,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        totalAmount: soData.totalAmount,
        paidAmount: 0,
        status: 'issued',
        items: soData.items.map(i => ({ sku: i.sku || 'ITEM', name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        discount: 0
      };

      // VALIDASI FIREBASE-FIRST: Commit ke cloud Firestore terlebih dahulu
      await saveDocument('sales_orders', newSO);
      await saveDocument('sales_invoices', newInv);

      // State React HANYA di-update jika Firebase berhasil
      setSalesOrders(prev => {
        const next = [newSO, ...prev];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}so`, JSON.stringify(next)); } catch (e) {}
        return next;
      });
      setSalesInvoices(prev => {
        const next = [newInv, ...prev];
        try { localStorage.setItem(`${STORAGE_KEY_PREFIX}invoices`, JSON.stringify(next)); } catch (e) {}
        return next;
      });

      showNotification(`Surat Pesanan ${soNum} berhasil dibuat & tersimpan aman di database`, 'success');
      await addAuditLogInternal('SALES_ORDER_CREATED', 'sales', `Membuat Pesanan Penjualan ${soNum} untuk ${soData.customerName} & Faktur ${invNum} (Total: Rp ${soData.totalAmount.toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[addSalesOrder] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan Pesanan Penjualan ke database: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const processSalesOrderDelivery = async (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;

    // Deduct stock & create stock movements
    const updatedInventory = inventory.map(invItem => {
      const match = so.items.find(it => it.sku === invItem.sku || it.name.toLowerCase().includes(invItem.name.toLowerCase().substring(0, 10)));
      if (match) {
        return {
          ...invItem,
          stockQty: Math.max(0, invItem.stockQty - match.quantity),
          lastUpdated: new Date().toISOString()
        };
      }
      return invItem;
    });
    setInventory(updatedInventory);
    await saveMultipleDocuments('inventory', updatedInventory);

    const newMovements: StockMovement[] = so.items.map(it => ({
      id: `mv_${Date.now()}_${it.sku}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      type: 'outbound',
      itemSku: it.sku,
      itemName: it.name,
      quantity: it.quantity,
      referenceType: 'SO',
      referenceNo: so.soNumber,
      warehouse: "Gudang Logistik & Souvenir D'Kandang (WH-03)",
      operator: currentUser.name,
      notes: `Pengeluaran stok barang/fasilitas untuk pelaksanaan kunjungan ${so.customerName}`
    }));

    setStockMovements(prev => [...newMovements, ...prev]);
    await saveMultipleDocuments('stock_movements', newMovements);

    const updatedSO: SalesOrder = { ...so, status: 'delivered' };
    setSalesOrders(prev => prev.map(s => s.id === soId ? updatedSO : s));
    await saveDocument('sales_orders', updatedSO);

    showNotification(`Surat Jalan terbit! Status ${so.soNumber} menjadi Terlaksana / Terkirim`, 'success');
    await addAuditLogInternal('SALES_ORDER_DELIVERED', 'sales', `Menerbitkan Surat Jalan / Pengiriman untuk ${so.soNumber} (${so.customerName}) - Stok barang dikeluarkan dari gudang`);
  };

  const markInvoicePaid = async (invId: string) => {
    const inv = salesInvoices.find(i => i.id === invId);
    if (!inv) return;

    const remainingToPay = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));

    const updatedInv: SalesInvoice = { ...inv, status: 'paid', paidAmount: inv.totalAmount };
    setSalesInvoices(prev => prev.map(i => i.id === invId ? updatedInv : i));
    await saveDocument('sales_invoices', updatedInv);

    const targetSO = salesOrders.find(s => s.soNumber === inv.soReference);
    if (targetSO) {
      const updatedSO: SalesOrder = { ...targetSO, paymentStatus: 'paid' };
      setSalesOrders(prev => prev.map(s => s.id === targetSO.id ? updatedSO : s));
      await saveDocument('sales_orders', updatedSO);
    }

    if (remainingToPay > 0) {
      await addCashTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'inflow',
        category: 'operating',
        description: `Pelunasan Faktur ${inv.invoiceNumber} (${inv.customerName})`,
        amount: remainingToPay,
        sourceAccount: inv.bankAccount || (bankAccounts.length > 0 ? bankAccounts[0].bankName : "BCA KCP Sawangan Depok - Giro Operasional"),
        referenceNo: inv.invoiceNumber,
        incomeSource: 'school_visit',
        paymentStage: 'settlement',
        linkedEntityName: inv.customerName
      });
    }

    showNotification(`Faktur ${inv.invoiceNumber} LUNAS! Data tersinkronisasi ke cloud`, 'success');
    await addAuditLogInternal('INVOICE_PAID', 'finance', `Pelunasan Faktur ${inv.invoiceNumber} (${inv.customerName}) sebesar Rp ${(inv.totalAmount || 0).toLocaleString('id-ID')}`);
  };

  // ---------------- SCHOOL PORTAL & PAYMENT PROOFS ACTIONS ----------------
  const generatePortalTokenForInvoice = async (invoiceId: string): Promise<string> => {
    const inv = salesInvoices.find(i => i.id === invoiceId);
    if (!inv) return '';
    if (inv.publicAccessToken) return inv.publicAccessToken;

    const safeName = (inv.customerName || 'school').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 12);
    const token = `token-${safeName}-${Date.now().toString(36)}`;
    const updatedInv: SalesInvoice = { ...inv, publicAccessToken: token };
    setSalesInvoices(prev => prev.map(i => i.id === invoiceId ? updatedInv : i));
    await saveDocument('sales_invoices', updatedInv);
    return token;
  };

  const submitPaymentProof = async (proofData: Omit<PaymentProof, 'id' | 'uploadedAt' | 'status'>): Promise<{ success: boolean; message: string; proofId?: string }> => {
    try {
      const newProofId = `prf_${Date.now()}`;
      const nowIso = new Date().toISOString();
      const newProof: PaymentProof = {
        ...proofData,
        id: newProofId,
        uploadedAt: nowIso,
        status: 'pending_verification'
      };

      const inv = salesInvoices.find(i => i.id === proofData.invoiceId || i.invoiceNumber === proofData.invoiceNumber);
      let updatedInv: SalesInvoice | null = null;
      if (inv) {
        const existingProofs = inv.paymentProofs || [];
        const updatedProofs = [newProof, ...existingProofs.filter(p => p.id !== newProofId)];
        updatedInv = { ...inv, paymentProofs: updatedProofs };
      }

      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('payment_proofs', newProof);
      if (updatedInv) {
        await saveDocument('sales_invoices', updatedInv);
      }

      // State React HANYA di-update jika Firebase sukses
      setPaymentProofs(prev => [newProof, ...prev]);
      if (updatedInv) {
        setSalesInvoices(prev => prev.map(i => i.id === inv!.id ? updatedInv! : i));
      }

      await createNotification({
        title: 'Bukti Bayar Masuk Sekolah',
        message: `Sekolah ${proofData.schoolName} mengunggah bukti transfer Rp ${proofData.amount.toLocaleString('id-ID')} (${proofData.bankDestination}) untuk Faktur ${proofData.invoiceNumber}. Perlu verifikasi.`,
        type: 'approval_request',
        category: 'finance',
        referenceId: newProofId,
        referenceNumber: proofData.invoiceNumber,
        module: 'finance',
        urgency: 'high',
        requiresAction: true,
        actionStatus: 'pending',
        targetRoles: ['finance_manager', 'direktur_utama', 'super_admin']
      });

      await addAuditLogInternal('PAYMENT_PROOF_SUBMITTED', 'sales', `Sekolah ${proofData.schoolName} mengunggah bukti bayar Faktur ${proofData.invoiceNumber} senilai Rp ${proofData.amount.toLocaleString('id-ID')}`);
      showNotification(`Bukti transfer ${proofData.schoolName} berhasil disimpan ke database cloud. Tim Finance akan memverifikasi.`, 'success');

      return { success: true, message: 'Bukti transfer berhasil dikirim.', proofId: newProofId };
    } catch (error: any) {
      console.error('[submitPaymentProof] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan bukti transfer: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database cloud.' };
    }
  };

  const verifyPaymentProof = async (proofId: string, approved: boolean, rejectionReason?: string, bankDestination?: string): Promise<{ success: boolean; message: string }> => {
    const proof = paymentProofs.find(p => p.id === proofId);
    if (!proof) {
      return { success: false, message: 'Bukti pembayaran tidak ditemukan.' };
    }

    try {
      const nowIso = new Date().toISOString();

      if (approved) {
        const updatedProof: PaymentProof = {
          ...proof,
          status: 'verified',
          verifiedBy: `${currentUser.name} (${currentUser.role})`,
          verifiedAt: nowIso,
          bankDestination: bankDestination || proof.bankDestination
        };

        const inv = salesInvoices.find(i => i.id === proof.invoiceId || i.invoiceNumber === proof.invoiceNumber);
        let updatedInv: SalesInvoice | null = null;
        let updatedSO: SalesOrder | null = null;
        if (inv) {
          const newPaidAmount = Math.min(inv.totalAmount, (inv.paidAmount || 0) + proof.amount);
          const isFullyPaid = newPaidAmount >= inv.totalAmount;
          const updatedProofs = (inv.paymentProofs || []).map(p => p.id === proofId ? updatedProof : p);
          if (!updatedProofs.find(p => p.id === proofId)) {
            updatedProofs.unshift(updatedProof);
          }

          updatedInv = {
            ...inv,
            paidAmount: newPaidAmount,
            status: isFullyPaid ? 'paid' : inv.status,
            paymentProofs: updatedProofs
          };

          const targetSO = salesOrders.find(s => s.soNumber === inv.soReference);
          if (targetSO) {
            updatedSO = {
              ...targetSO,
              paymentStatus: isFullyPaid ? 'paid' : 'partial'
            };
          }
        }

        // VALIDASI FIREBASE-FIRST
        await saveDocument('payment_proofs', updatedProof);
        if (updatedInv) await saveDocument('sales_invoices', updatedInv);
        if (updatedSO) await saveDocument('sales_orders', updatedSO);

        // State React di-update setelah Firebase sukses
        setPaymentProofs(prev => prev.map(p => p.id === proofId ? updatedProof : p));
        if (updatedInv) setSalesInvoices(prev => prev.map(i => i.id === inv!.id ? updatedInv! : i));
        if (updatedSO) setSalesOrders(prev => prev.map(s => s.id === updatedSO!.id ? updatedSO! : s));

        const targetBankName = bankDestination || (bankAccounts.find(b => b.bankName.toLowerCase().includes(proof.bankDestination.toLowerCase()))?.bankName || bankAccounts[0]?.bankName || "BCA KCP Sawangan Depok - Giro Operasional");
        await addCashTransaction({
          date: new Date().toISOString().split('T')[0],
          type: 'inflow',
          category: 'operating',
          description: `Pelunasan/DP Faktur ${proof.invoiceNumber} (${proof.schoolName}) via ${proof.bankDestination}`,
          amount: proof.amount,
          sourceAccount: targetBankName,
          referenceNo: proof.invoiceNumber,
          incomeSource: 'school_visit',
          paymentStage: proof.paymentStage || 'settlement',
          linkedEntityName: proof.schoolName
        });

        await addAuditLogInternal('PAYMENT_PROOF_VERIFIED', 'finance', `Verifikasi penerimaan transfer Rp ${proof.amount.toLocaleString('id-ID')} untuk Faktur ${proof.invoiceNumber} (${proof.schoolName})`);
        showNotification(`Bukti pembayaran Faktur ${proof.invoiceNumber} BERHASIL diverifikasi! Kas bertambah Rp ${proof.amount.toLocaleString('id-ID')}`, 'success');

        return { success: true, message: 'Bukti pembayaran berhasil diverifikasi dan kas telah dicatat.' };
      } else {
        const updatedProof: PaymentProof = {
          ...proof,
          status: 'rejected',
          rejectionReason: rejectionReason || 'Nominal transfer tidak sesuai atau mutasi bank belum ditemukan',
          verifiedBy: `${currentUser.name} (${currentUser.role})`,
          verifiedAt: nowIso
        };

        const inv = salesInvoices.find(i => i.id === proof.invoiceId || i.invoiceNumber === proof.invoiceNumber);
        let updatedInv: SalesInvoice | null = null;
        if (inv && inv.paymentProofs) {
          const updatedProofs = inv.paymentProofs.map(p => p.id === proofId ? updatedProof : p);
          updatedInv = { ...inv, paymentProofs: updatedProofs };
        }

        // VALIDASI FIREBASE-FIRST
        await saveDocument('payment_proofs', updatedProof);
        if (updatedInv) await saveDocument('sales_invoices', updatedInv);

        setPaymentProofs(prev => prev.map(p => p.id === proofId ? updatedProof : p));
        if (updatedInv) setSalesInvoices(prev => prev.map(i => i.id === inv!.id ? updatedInv! : i));

        await addAuditLogInternal('PAYMENT_PROOF_REJECTED', 'finance', `Menolak bukti bayar Faktur ${proof.invoiceNumber} (${proof.schoolName}): ${rejectionReason}`);
        showNotification(`Bukti bayar ditolak: ${rejectionReason || 'Data mutasi tidak cocok'}`, 'warning');

        return { success: true, message: 'Bukti pembayaran telah ditandai ditolak.' };
      }
    } catch (error: any) {
      console.error('[verifyPaymentProof] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memverifikasi bukti pembayaran: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal memproses verifikasi di database.' };
    }
  };

  // ---------------- PACKAGE COSTING SIMULATOR ACTIONS ----------------
  const savePackageCostingSimulation = async (simData: Omit<PackageCostingSimulation, 'id' | 'createdAt' | 'simulatedBy'>): Promise<PackageCostingSimulation> => {
    try {
      const newSim: PackageCostingSimulation = {
        ...simData,
        id: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
        simulatedBy: `${currentUser.name} (${currentUser.role})`
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('costing_simulations', newSim);

      setPackageSimulations(prev => prependUnique(prev, newSim));
      showNotification(`Simulasi HPP "${newSim.packageName}" berhasil disimpan di database cloud (Margin: ${newSim.grossProfitMarginPercent.toFixed(1)}%)`, 'success');
      await addAuditLogInternal('PACKAGE_COSTING_SAVED', 'sales', `Menyimpan simulasi HPP: ${newSim.packageName} - Margin ${newSim.grossProfitMarginPercent.toFixed(1)}% (BEP ${newSim.breakEvenPax} pax)`);
      return newSim;
    } catch (error: any) {
      console.error('[savePackageCostingSimulation] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan simulasi HPP: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deletePackageCostingSimulation = async (id: string) => {
    const target = packageSimulations.find(s => s.id === id);
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('costing_simulations', id);
      setPackageSimulations(prev => prev.filter(s => s.id !== id));
      showNotification(`Simulasi "${target?.packageName || id}" telah dihapus dari database cloud`, 'info');
      await addAuditLogInternal('PACKAGE_COSTING_DELETED', 'sales', `Menghapus simulasi HPP: ${target?.packageName || id}`);
    } catch (error: any) {
      console.error('[deletePackageCostingSimulation] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus simulasi HPP: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const convertSimulationToQuotationDraft = async (simulationId: string, customerName: string, leadId?: string): Promise<Quotation> => {
    const sim = packageSimulations.find(s => s.id === simulationId);
    if (!sim) throw new Error('Simulasi tidak ditemukan');

    const createdQuote = await addQuotation({
      leadId,
      customerName,
      companyName: customerName,
      subject: `Penawaran Paket Wisata Edukasi - ${sim.packageName}`,
      estimatedPax: sim.targetPax,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      subtotal: sim.proposedPricePerPax * sim.targetPax,
      tax: 0,
      grandTotal: sim.proposedPricePerPax * sim.targetPax,
      status: 'draft',
      notes: `Dibuat otomatis dari Kalkulator HPP. Estimasi HPP: Rp ${sim.totalHPPPerPax.toLocaleString('id-ID')}/pax, Proyeksi Gross Margin: ${sim.grossProfitMarginPercent.toFixed(1)}%. Diskon maks yang disarankan: Rp ${sim.maxRecommendedDiscount.toLocaleString('id-ID')}/pax.`,
      items: [
        {
          sku: 'PK-SIM-AUTO',
          name: sim.packageName,
          quantity: sim.targetPax,
          unitPrice: sim.proposedPricePerPax,
          total: sim.proposedPricePerPax * sim.targetPax,
          unit: 'pax',
          description: `Paket Edukasi Terpadu (Include F&B, Pakan Ternak, Workshop Craft & Pemandu Edukasi)`
        }
      ]
    });

    showNotification(`Draft Penawaran baru berhasil dibuat dari Simulasi HPP!`, 'success');
    return createdQuote;
  };

  // ---------------- PETTY CASH & REIMBURSEMENT ACTIONS ----------------
  const addPettyCashWallet = async (walletData: Omit<PettyCashWallet, 'id' | 'currentBalance' | 'status'>) => {
    try {
      const newWallet: PettyCashWallet = {
        ...walletData,
        id: `pcw_${Date.now()}`,
        currentBalance: walletData.ceilingAmount,
        status: 'active'
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('petty_cash_wallets', newWallet);

      setPettyCashWallets(prev => [...prev, newWallet]);
      showNotification(`Buku Kas Kecil "${newWallet.name}" (Plafon Rp ${newWallet.ceilingAmount.toLocaleString('id-ID')}) berhasil disimpan ke database cloud`, 'success');
      await addAuditLogInternal('PETTY_CASH_WALLET_CREATED', 'finance', `Membuat buku kas kecil baru: ${newWallet.name} - Plafon Rp ${newWallet.ceilingAmount.toLocaleString('id-ID')}`);
    } catch (error: any) {
      console.error('[addPettyCashWallet] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal menyimpan buku kas kecil: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updatePettyCashWallet = async (id: string, updates: Partial<PettyCashWallet>) => {
    const target = pettyCashWallets.find(w => w.id === id);
    if (!target) return;
    try {
      const updated: PettyCashWallet = { ...target, ...updates };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('petty_cash_wallets', updated);

      setPettyCashWallets(prev => prev.map(w => w.id === id ? updated : w));
      showNotification(`Buku kas kecil "${updated.name}" diperbarui di database cloud`, 'success');
    } catch (error: any) {
      console.error('[updatePettyCashWallet] Gagal memperbarui di Firebase Firestore:', error);
      showNotification(`Gagal memperbarui buku kas kecil: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const recordPettyCashExpense = async (expData: Omit<PettyCashExpense, 'id' | 'status'>): Promise<{ success: boolean; message: string }> => {
    const wallet = pettyCashWallets.find(w => w.id === expData.walletId);
    if (!wallet) {
      return { success: false, message: 'Buku kas kecil tidak ditemukan.' };
    }
    if (wallet.status === 'frozen') {
      return { success: false, message: 'Buku kas kecil sedang dibekukan / nonaktif.' };
    }
    if (wallet.currentBalance < expData.amount) {
      return { 
        success: false, 
        message: `Saldo kas kecil tidak mencukupi! Sisa saldo: Rp ${wallet.currentBalance.toLocaleString('id-ID')}, Bon: Rp ${expData.amount.toLocaleString('id-ID')}. Mohon ajukan reimbursement dahulu.` 
      };
    }

    try {
      const newExpenseId = `pce_${Date.now()}`;
      const newExpense: PettyCashExpense = {
        ...expData,
        id: newExpenseId,
        status: 'recorded'
      };

      const newBalance = wallet.currentBalance - expData.amount;
      const updatedWallet: PettyCashWallet = {
        ...wallet,
        currentBalance: newBalance
      };

      // VALIDASI FIREBASE-FIRST: Commit ke cloud database Firestore terlebih dahulu
      await saveDocument('petty_cash_expenses', newExpense);
      await saveDocument('petty_cash_wallets', updatedWallet);

      // State React HANYA di-update setelah Firebase commit berhasil
      setPettyCashExpenses(prev => [newExpense, ...prev]);
      setPettyCashWallets(prev => prev.map(w => w.id === wallet.id ? updatedWallet : w));

      if (newBalance < wallet.ceilingAmount * 0.25) {
        await createNotification({
          title: 'Saldo Kas Kecil Menipis!',
          message: `Saldo ${wallet.name} tersisa Rp ${newBalance.toLocaleString('id-ID')} (< 25% plafon). Segera kumpulkan nota dan ajukan reimbursement.`,
          type: 'inventory_alert',
          category: 'finance',
          module: 'finance',
          urgency: 'high',
          requiresAction: false,
          targetRoles: ['finance_manager', 'direktur_utama', 'super_admin']
        });
      }

      await addAuditLogInternal('PETTY_CASH_EXPENSE_RECORDED', 'finance', `Catat bon kas kecil: Rp ${expData.amount.toLocaleString('id-ID')} (${expData.description}) pada ${wallet.name}`);
      showNotification(`Pengeluaran kas kecil Rp ${expData.amount.toLocaleString('id-ID')} berhasil dicatat. Sisa saldo: Rp ${newBalance.toLocaleString('id-ID')}`, 'success');

      return { success: true, message: 'Pengeluaran kas kecil berhasil dicatat.' };
    } catch (error: any) {
      console.error('[recordPettyCashExpense] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal mencatat bon kas kecil ke database: ${error?.message || 'Koneksi database terputus'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database cloud.' };
    }
  };

  const deletePettyCashExpense = async (id: string) => {
    const target = pettyCashExpenses.find(e => e.id === id);
    if (!target) return;
    if (target.status === 'reimbursed') {
      showNotification('Tidak dapat menghapus bon yang sudah dicairkan reimbursement-nya!', 'error');
      return;
    }

    try {
      const wallet = pettyCashWallets.find(w => w.id === target.walletId);
      let updatedWallet: PettyCashWallet | null = null;
      if (wallet) {
        updatedWallet = {
          ...wallet,
          currentBalance: wallet.currentBalance + target.amount
        };
      }

      // VALIDASI FIREBASE-FIRST: Hapus di cloud Firestore terlebih dahulu
      await deleteDocument('petty_cash_expenses', id);
      if (updatedWallet) {
        await saveDocument('petty_cash_wallets', updatedWallet);
      }

      // State React HANYA di-update setelah Firestore sukses
      if (updatedWallet) {
        setPettyCashWallets(prev => prev.map(w => w.id === wallet!.id ? updatedWallet! : w));
      }
      setPettyCashExpenses(prev => prev.filter(e => e.id !== id));

      showNotification(`Bon kas kecil sebesar Rp ${target.amount.toLocaleString('id-ID')} dihapus dan saldo dikembalikan`, 'info');
      await addAuditLogInternal('PETTY_CASH_EXPENSE_DELETED', 'finance', `Menghapus bon kas kecil Rp ${target.amount.toLocaleString('id-ID')} (${target.description})`);
    } catch (error: any) {
      console.error('[deletePettyCashExpense] Gagal menghapus dari Firebase Firestore:', error);
      showNotification(`Gagal menghapus bon kas kecil: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const submitReimbursementClaim = async (walletId: string, expenseIds: string[]): Promise<{ success: boolean; message: string; claim?: ReimbursementClaim }> => {
    const wallet = pettyCashWallets.find(w => w.id === walletId);
    if (!wallet) return { success: false, message: 'Buku kas kecil tidak ditemukan' };

    const selectedExpenses = pettyCashExpenses.filter(e => expenseIds.includes(e.id) && e.status === 'recorded');
    if (selectedExpenses.length === 0) {
      return { success: false, message: 'Pilih minimal 1 bon pengeluaran yang belum diklaim.' };
    }

    try {
      const totalAmount = selectedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const yyyy = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const claimNum = `CLM/${yyyy}/${mm}/${String(reimbursementClaims.length + 1).padStart(3, '0')}`;

      const newClaim: ReimbursementClaim = {
        id: `clm_${Date.now()}`,
        claimNumber: claimNum,
        walletId: wallet.id,
        walletName: wallet.name,
        claimDate: new Date().toISOString().split('T')[0],
        totalAmount,
        expenseIds: selectedExpenses.map(e => e.id),
        submittedBy: `${currentUser.name} (${currentUser.role})`,
        status: 'submitted'
      };

      const updatedExpenses = pettyCashExpenses.map(e => {
        if (selectedExpenses.some(se => se.id === e.id)) {
          return { ...e, status: 'claimed' as const, claimId: newClaim.id };
        }
        return e;
      });

      // VALIDASI FIREBASE-FIRST
      await saveDocument('reimbursement_claims', newClaim);
      for (const exp of selectedExpenses) {
        await saveDocument('petty_cash_expenses', { ...exp, status: 'claimed', claimId: newClaim.id });
      }

      setPettyCashExpenses(updatedExpenses);
      setReimbursementClaims(prev => [newClaim, ...prev]);

      await createNotification({
        title: 'Pengajuan Reimbursement Kas Kecil',
        message: `${newClaim.submittedBy} mengajukan klaim pengisian kembali kas kecil ${wallet.name} sebesar Rp ${totalAmount.toLocaleString('id-ID')} (${selectedExpenses.length} bon).`,
        type: 'approval_request',
        category: 'finance',
        referenceId: newClaim.id,
        referenceNumber: claimNum,
        module: 'finance',
        urgency: 'high',
        requiresAction: true,
        actionStatus: 'pending',
        targetRoles: ['direktur_utama', 'finance_manager', 'super_admin']
      });

      await addAuditLogInternal('REIMBURSEMENT_CLAIM_SUBMITTED', 'finance', `Pengajuan klaim kas kecil ${claimNum} untuk ${wallet.name} sebesar Rp ${totalAmount.toLocaleString('id-ID')}`);
      showNotification(`Klaim Reimbursement ${claimNum} berhasil diajukan untuk persetujuan Direktur`, 'success');

      return { success: true, message: 'Klaim reimbursement berhasil diajukan.', claim: newClaim };
    } catch (error: any) {
      console.error('[submitReimbursementClaim] Gagal menyimpan ke Firebase Firestore:', error);
      showNotification(`Gagal mengajukan klaim reimbursement: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database cloud.' };
    }
  };

  const approveReimbursementClaim = async (claimId: string): Promise<{ success: boolean; message: string }> => {
    const claim = reimbursementClaims.find(c => c.id === claimId);
    if (!claim) return { success: false, message: 'Klaim tidak ditemukan' };

    try {
      const updatedClaim: ReimbursementClaim = {
        ...claim,
        status: 'approved_director',
        approvedBy: `${currentUser.name} (${currentUser.role})`,
        approvedAt: new Date().toISOString()
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('reimbursement_claims', updatedClaim);

      setReimbursementClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));

      await createNotification({
        title: 'Klaim Kas Kecil Disetujui Direktur',
        message: `Klaim ${claim.claimNumber} (${claim.walletName}) sebesar Rp ${claim.totalAmount.toLocaleString('id-ID')} telah disetujui. Siap dicairkan oleh Finance.`,
        type: 'approval_status',
        category: 'finance',
        referenceId: claim.id,
        referenceNumber: claim.claimNumber,
        module: 'finance',
        urgency: 'medium',
        requiresAction: true,
        actionStatus: 'pending',
        targetRoles: ['finance_manager', 'super_admin']
      });

      await addAuditLogInternal('REIMBURSEMENT_CLAIM_APPROVED', 'finance', `Direktur menyetujui klaim reimbursement ${claim.claimNumber} (Rp ${claim.totalAmount.toLocaleString('id-ID')})`);
      showNotification(`Klaim ${claim.claimNumber} telah DISETUJUI oleh Direktur!`, 'success');

      return { success: true, message: 'Klaim berhasil disetujui.' };
    } catch (error: any) {
      console.error('[approveReimbursementClaim] Gagal menyimpan persetujuan klaim ke Firebase:', error);
      showNotification(`Gagal menyetujui klaim: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database cloud.' };
    }
  };

  const rejectReimbursementClaim = async (claimId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    const claim = reimbursementClaims.find(c => c.id === claimId);
    if (!claim) return { success: false, message: 'Klaim tidak ditemukan' };

    try {
      const updatedClaim: ReimbursementClaim = {
        ...claim,
        status: 'rejected',
        rejectionReason: reason
      };

      const updatedExpenses = pettyCashExpenses.map(e => {
        if (claim.expenseIds.includes(e.id)) {
          return { ...e, status: 'recorded' as const, claimId: undefined };
        }
        return e;
      });

      // VALIDASI FIREBASE-FIRST
      await saveDocument('reimbursement_claims', updatedClaim);
      for (const expId of claim.expenseIds) {
        const exp = pettyCashExpenses.find(e => e.id === expId);
        if (exp) {
          await saveDocument('petty_cash_expenses', { ...exp, status: 'recorded', claimId: null });
        }
      }

      setReimbursementClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
      setPettyCashExpenses(updatedExpenses);

      await addAuditLogInternal('REIMBURSEMENT_CLAIM_REJECTED', 'finance', `Menolak klaim reimbursement ${claim.claimNumber}: ${reason}`);
      showNotification(`Klaim reimbursement ${claim.claimNumber} ditolak`, 'warning');

      return { success: true, message: 'Klaim reimbursement ditolak.' };
    } catch (error: any) {
      console.error('[rejectReimbursementClaim] Gagal menyimpan penolakan klaim ke Firebase:', error);
      showNotification(`Gagal menolak klaim di database: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan ke database cloud.' };
    }
  };

  const disburseReimbursementClaim = async (claimId: string, sourceAccountId: string): Promise<{ success: boolean; message: string }> => {
    const claim = reimbursementClaims.find(c => c.id === claimId);
    if (!claim) return { success: false, message: 'Klaim tidak ditemukan' };
    if (claim.status !== 'approved_director') {
      return { success: false, message: 'Klaim harus disetujui Direktur terlebih dahulu sebelum dicairkan.' };
    }

    const sourceBank = bankAccounts.find(b => b.id === sourceAccountId || b.bankName === sourceAccountId) || bankAccounts[0];
    if (!sourceBank) {
      return { success: false, message: 'Rekening bank sumber pencairan tidak valid' };
    }

    const wallet = pettyCashWallets.find(w => w.id === claim.walletId);
    if (!wallet) return { success: false, message: 'Dompet kas kecil tidak ditemukan' };

    try {
      const nowIso = new Date().toISOString();
      const today = nowIso.split('T')[0];

      const updatedClaim: ReimbursementClaim = {
        ...claim,
        status: 'disbursed',
        disbursedAt: nowIso,
        disbursedFromAccountId: sourceBank.id,
        disbursedFromAccountName: sourceBank.bankName
      };

      const updatedExpenses = pettyCashExpenses.map(e => {
        if (claim.expenseIds.includes(e.id)) {
          return { ...e, status: 'reimbursed' as const };
        }
        return e;
      });

      const updatedWallet: PettyCashWallet = {
        ...wallet,
        currentBalance: wallet.ceilingAmount,
        lastReimbursedAt: today
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('reimbursement_claims', updatedClaim);
      await saveDocument('petty_cash_wallets', updatedWallet);
      for (const expId of claim.expenseIds) {
        const exp = pettyCashExpenses.find(e => e.id === expId);
        if (exp) {
          await saveDocument('petty_cash_expenses', { ...exp, status: 'reimbursed' });
        }
      }

      setReimbursementClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
      setPettyCashExpenses(updatedExpenses);
      setPettyCashWallets(prev => prev.map(w => w.id === wallet.id ? updatedWallet : w));

      await addCashTransaction({
        date: today,
        type: 'outflow',
        category: 'operating',
        description: `Pengisian Kembali Kas Kecil: ${wallet.name} (${claim.claimNumber})`,
        amount: claim.totalAmount,
        sourceAccount: sourceBank.bankName,
        referenceNo: claim.claimNumber,
        linkedEntityName: wallet.name
      });

      await addAuditLogInternal('REIMBURSEMENT_CLAIM_DISBURSED', 'finance', `Pencairan klaim ${claim.claimNumber} (Rp ${claim.totalAmount.toLocaleString('id-ID')}) dari ${sourceBank.bankName} ke kas kecil ${wallet.name}`);
      showNotification(`Reimbursement kas kecil ${claim.claimNumber} BERHASIL dicairkan sebesar Rp ${claim.totalAmount.toLocaleString('id-ID')}. Saldo ${wallet.name} kembali ke plafon!`, 'success');

      return { success: true, message: 'Reimbursement berhasil dicairkan dan transaksi kas keluar telah dicatat.' };
    } catch (error: any) {
      console.error('[disburseReimbursementClaim] Gagal mencairkan klaim di Firebase:', error);
      showNotification(`Gagal mencairkan reimbursement di database: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan transaksi pencairan ke database.' };
    }
  };

  // ---------------- ACCOUNTS PAYABLE & DEBT MANAGEMENT ----------------
  const addDebt = async (debtData: Omit<DebtRecord, 'id' | 'debtNumber' | 'paidAmount' | 'remainingAmount' | 'status' | 'payments' | 'createdAt' | 'updatedAt' | 'createdBy'>): Promise<DebtRecord> => {
    try {
      const year = new Date().getFullYear();
      const count = debts.length + 1;
      const debtNumber = `HUT-${year}-${String(count).padStart(4, '0')}`;
      const now = new Date().toISOString();
      const newDebt: DebtRecord = {
        ...debtData,
        id: `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        debtNumber,
        paidAmount: 0,
        remainingAmount: debtData.totalAmount,
        status: 'unpaid',
        payments: [],
        createdBy: currentUser.name,
        createdAt: now,
        updatedAt: now
      };

      await saveDocument('debts', newDebt);
      setDebts(prev => [newDebt, ...prev]);

      await addAuditLogInternal('DEBT_CREATED', 'finance', `Mencatat hutang baru: ${debtNumber} kepada ${newDebt.creditorName} senilai Rp ${newDebt.totalAmount.toLocaleString('id-ID')}`);
      showNotification(`Hutang/Kewajiban "${debtNumber}" berhasil dicatat`, 'success');
      return newDebt;
    } catch (error: any) {
      console.error('[addDebt] Gagal menyimpan hutang ke Firebase:', error);
      showNotification(`Gagal mencatat hutang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const updateDebt = async (id: string, updates: Partial<DebtRecord>) => {
    try {
      const now = new Date().toISOString();
      const target = debts.find(d => d.id === id);
      if (!target) throw new Error('Data hutang tidak ditemukan.');

      const newRemaining = updates.totalAmount !== undefined 
        ? Math.max(0, updates.totalAmount - (updates.paidAmount ?? target.paidAmount))
        : (updates.paidAmount !== undefined ? Math.max(0, target.totalAmount - updates.paidAmount) : target.remainingAmount);

      let newStatus: DebtStatus = target.status;
      if (newRemaining <= 0) {
        newStatus = 'paid';
      } else if (updates.paidAmount && updates.paidAmount > 0) {
        newStatus = 'partial';
      }

      const mergedUpdates: Partial<DebtRecord> = {
        ...updates,
        remainingAmount: newRemaining,
        status: updates.status || newStatus,
        updatedAt: now
      };

      await patchDocument('debts', id, mergedUpdates);
      setDebts(prev => prev.map(d => d.id === id ? { ...d, ...mergedUpdates } : d));
      showNotification(`Data hutang "${target.debtNumber}" berhasil diperbarui`, 'success');
      await addAuditLogInternal('DEBT_UPDATED', 'finance', `Memperbarui data hutang: ${target.debtNumber}`);
    } catch (error: any) {
      console.error('[updateDebt] Gagal memperbarui data hutang di Firebase:', error);
      showNotification(`Gagal update hutang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deleteDebt = async (id: string) => {
    try {
      const target = debts.find(d => d.id === id);
      if (!target) return;

      if (target.paidAmount > 0) {
        throw new Error('Hutang yang sudah memiliki riwayat cicilan/pembayaran tidak boleh dihapus langsung. Batalkan pembayaran terlebih dahulu.');
      }

      await deleteDocument('debts', id);
      setDebts(prev => prev.filter(d => d.id !== id));
      showNotification(`Data hutang "${target.debtNumber}" berhasil dihapus`, 'info');
      await addAuditLogInternal('DEBT_DELETED', 'finance', `Menghapus pencatatan hutang: ${target.debtNumber} (${target.creditorName})`);
    } catch (error: any) {
      console.error('[deleteDebt] Gagal menghapus hutang di Firebase:', error);
      showNotification(`Gagal hapus hutang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const recordDebtPayment = async (debtId: string, payment: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'cash' | 'transfer' | 'giro';
    sourceAccountId: string;
    referenceNo?: string;
    receiptNumber?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; paymentRecord?: DebtPaymentRecord }> => {
    try {
      const target = debts.find(d => d.id === debtId);
      if (!target) throw new Error('Data hutang tidak ditemukan.');
      if (payment.amount <= 0) throw new Error('Nominal pembayaran harus lebih dari 0.');
      if (payment.amount > target.remainingAmount) {
        throw new Error(`Nominal pembayaran (Rp ${payment.amount.toLocaleString('id-ID')}) melebihi sisa hutang (Rp ${target.remainingAmount.toLocaleString('id-ID')}).`);
      }

      const sourceBank = bankAccounts.find(b => b.id === payment.sourceAccountId);
      if (!sourceBank) throw new Error('Rekening atau kas sumber pembayaran tidak valid.');

      if (sourceBank.balance < payment.amount) {
        throw new Error(`Saldo pada ${sourceBank.bankName} (Rp ${sourceBank.balance.toLocaleString('id-ID')}) tidak mencukupi untuk pembayaran sebesar Rp ${payment.amount.toLocaleString('id-ID')}.`);
      }

      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const paymentRef = payment.referenceNo || `PAY-HUT-${target.debtNumber}-${Date.now().toString().slice(-4)}`;

      // 1. Catat Arus Kas Keluar (Cash Outflow) di Bank / Kas (otomatis membukukan jurnal sesuai kategori hutang: 2210 Pinjaman Bank, 2120 Pajak, 2140 Gaji, atau 2110 Hutang Usaha)
      const isBankLoan = target.category === 'bank_loan';
      const debtCoaCode = isBankLoan
        ? '2210'
        : target.category === 'tax_payable'
        ? '2120'
        : target.category === 'salary_payable'
        ? '2140'
        : '2110';
      const debtCoaName = chartOfAccounts.find(a => a.code === debtCoaCode)?.name || 'Hutang Usaha Pemasok Pakan, Logistik & Kemasan Botol Farm';
      const txDesc = `Pembayaran Hutang [${target.debtNumber}] kpd ${target.creditorName}: ${payment.notes || target.description}`;
      await addCashTransaction({
        date: payment.paymentDate,
        receivedDate: payment.paymentDate,
        type: 'outflow',
        category: isBankLoan ? 'financing' : 'operating',
        description: txDesc,
        amount: payment.amount,
        sourceAccount: sourceBank.bankName,
        referenceNo: paymentRef,
        linkedEntityName: target.creditorName,
        contraAccountCode: debtCoaCode,
        contraAccountName: debtCoaName
      });

      // 3. Susun payment record
      const paymentRecord: DebtPaymentRecord = {
        id: paymentId,
        debtId,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        sourceAccountId: sourceBank.id,
        sourceAccountName: sourceBank.bankName,
        referenceNo: paymentRef,
        receiptNumber: payment.receiptNumber,
        notes: payment.notes,
        paidBy: currentUser.name,
        createdAt: now
      };

      const newPaidAmount = target.paidAmount + payment.amount;
      const newRemainingAmount = Math.max(0, target.totalAmount - newPaidAmount);
      const newStatus: DebtStatus = newRemainingAmount <= 0 ? 'paid' : 'partial';

      const updatedDebt: DebtRecord = {
        ...target,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        payments: [paymentRecord, ...(target.payments || [])],
        updatedAt: now
      };

      await patchDocument('debts', debtId, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        payments: updatedDebt.payments,
        updatedAt: now
      });

      setDebts(prev => prev.map(d => d.id === debtId ? updatedDebt : d));

      // 4. Integrasi PO: Jika hutang terhubung ke PO dan sudah lunas sepenuhnya, tandai PO selesai
      if (target.relatedPoId && newStatus === 'paid') {
        try {
          const linkedPo = purchaseOrders.find(p => p.id === target.relatedPoId);
          if (linkedPo && linkedPo.status !== 'cancelled') {
            await patchDocument('purchase_orders', linkedPo.id, {
              status: 'completed',
              notes: `${linkedPo.notes || ''} [LUNAS via Pelunasan Hutang ${target.debtNumber}]`.trim(),
              updatedAt: now
            });
            setPurchaseOrders(prev => prev.map(p => p.id === linkedPo.id ? { ...p, status: 'completed' } : p));
          }
        } catch (poErr) {
          console.warn('[recordDebtPayment] Gagal update status PO:', poErr);
        }
      }

      await addAuditLogInternal('DEBT_PAYMENT_RECORDED', 'finance', `Mencatat pembayaran hutang ${target.debtNumber} (${target.creditorName}) sebesar Rp ${payment.amount.toLocaleString('id-ID')} via ${sourceBank.bankName}`);
      showNotification(`Pembayaran Rp ${payment.amount.toLocaleString('id-ID')} untuk ${target.debtNumber} BERHASIL dicatat. Sisa hutang: Rp ${newRemainingAmount.toLocaleString('id-ID')}`, 'success');

      return {
        success: true,
        message: `Pembayaran berhasil disimpan. Status hutang kini: ${newStatus === 'paid' ? 'Lunas Sepenuhnya' : 'Dicicil (Sebagian)'}.`,
        paymentRecord
      };
    } catch (error: any) {
      console.error('[recordDebtPayment] Gagal memproses pembayaran hutang:', error);
      showNotification(`Gagal bayar hutang: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal menyimpan transaksi pembayaran.' };
    }
  };

  const importPOAsDebt = async (poId: string, customDueDate?: string): Promise<{ success: boolean; message: string; debt?: DebtRecord }> => {
    try {
      const po = purchaseOrders.find(p => p.id === poId);
      if (!po) throw new Error('Data PO tidak ditemukan.');

      // Cek apakah PO sudah pernah dijadikan hutang
      const existing = debts.find(d => d.relatedPoId === poId);
      if (existing) {
        throw new Error(`PO ${po.poNumber} sudah pernah dicatat sebagai hutang (${existing.debtNumber}).`);
      }

      // Default due date: 30 hari dari tanggal PO
      let dueDate = customDueDate;
      if (!dueDate) {
        const poDate = new Date(po.orderDate || Date.now());
        poDate.setDate(poDate.getDate() + 30);
        dueDate = poDate.toISOString().split('T')[0];
      }

      const debt = await addDebt({
        creditorName: po.vendorName,
        category: 'supplier_po',
        description: `Pengadaan Barang PO ${po.poNumber}: ${po.items?.map(i => `${i.inventoryItemName} (${i.quantity}x)`).join(', ') || 'Pembelian Barang'}`,
        relatedPoId: po.id,
        relatedPoNumber: po.poNumber,
        totalAmount: po.totalAmount,
        issueDate: po.orderDate || new Date().toISOString().split('T')[0],
        dueDate: dueDate,
        paymentTerms: 'NET 30',
        notes: `Diimpor otomatis dari Modul Pengadaan (PO ${po.poNumber}).`
      });

      return { success: true, message: `PO ${po.poNumber} berhasil dicatat sebagai hutang usaha (${debt.debtNumber}).`, debt };
    } catch (error: any) {
      console.error('[importPOAsDebt] Gagal import PO sebagai hutang:', error);
      showNotification(`Gagal import PO: ${error?.message || 'Koneksi error'}`, 'error');
      return { success: false, message: error?.message || 'Gagal mengimpor PO ke buku hutang.' };
    }
  };

  const addVendor = async (vendorData: Omit<Vendor, 'id' | 'code'>) => {
    try {
      const nextNum = await getNextDocumentNumber('vendors', null);
      const code = `VND-DPK-${String(nextNum).padStart(2, '0')}`;
      const newVendor: Vendor = {
        ...vendorData,
        id: `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        code
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('vendors', newVendor);
      setVendors(prev => [newVendor, ...prev]);
      showNotification(`Mitra Pemasok baru "${vendorData.name}" (${code}) berhasil terdaftar`, 'success');
      await addAuditLogInternal('VENDOR_CREATED', 'procurement', `Mendaftarkan mitra pemasok baru: ${vendorData.name} (${code})`);
    } catch (error: any) {
      console.error('[addVendor] Gagal menyimpan ke Firebase:', error);
      showNotification(`Gagal menyimpan data pemasok: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deleteVendor = async (vendorId: string) => {
    const target = vendors.find(v => v.id === vendorId);
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('vendors', vendorId);
      setVendors(prev => prev.filter(v => v.id !== vendorId));
      showNotification(`Pemasok "${target?.name || vendorId}" telah dihapus`, 'info');
      await addAuditLogInternal('VENDOR_DELETED', 'procurement', `Menghapus mitra pemasok: ${target?.name || vendorId}`);
    } catch (error: any) {
      console.error('[deleteVendor] Gagal menghapus dari Firebase:', error);
      showNotification(`Gagal menghapus pemasok: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addPurchaseRequisition = async (prData: Omit<PurchaseRequisition, 'id' | 'prNumber' | 'status'>) => {
    try {
      const yyyy = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const periodKey = `${yyyy}${mm}`;
      const nextNum = await getNextDocumentNumber('purchase_requisitions', periodKey);
      const prNum = `PR-${yyyy}-${mm}-${String(nextNum + 100).padStart(3, '0')}`;
      const newPR: PurchaseRequisition = {
        ...prData,
        id: `pr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        prNumber: prNum,
        status: 'pending'
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('purchase_requisitions', newPR);
      setPurchaseRequisitions(prev => [newPR, ...prev]);
      showNotification(`Pengajuan Kebutuhan Barang ${prNum} diajukan ke Bagian Purchasing`, 'success');
      await addAuditLogInternal('PURCHASE_REQUISITION_CREATED', 'procurement', `Mengajukan Permintaan Pembelian ${prNum} (${prData.department} - Est: Rp ${(prData.totalEstimated || 0).toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[addPurchaseRequisition] Gagal menyimpan ke Firebase:', error);
      showNotification(`Gagal mengajukan Permintaan Pembelian: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deletePurchaseRequisition = async (prId: string) => {
    const target = purchaseRequisitions.find(p => p.id === prId);
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('purchase_requisitions', prId);
      setPurchaseRequisitions(prev => prev.filter(p => p.id !== prId));
      showNotification(`Permintaan Pembelian ${target?.prNumber || prId} telah dihapus`, 'info');
      await addAuditLogInternal('PURCHASE_REQUISITION_DELETED', 'procurement', `Menghapus Permintaan Pembelian ${target?.prNumber || prId}`);
    } catch (error: any) {
      console.error('[deletePurchaseRequisition] Gagal menghapus dari Firebase:', error);
      showNotification(`Gagal menghapus Permintaan Pembelian: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const approvePurchaseRequisition = async (prId: string) => {
    const pr = purchaseRequisitions.find(p => p.id === prId);
    if (!pr) return;
    try {
      const updatedPR: PurchaseRequisition = { ...pr, status: 'approved', approvalNotes: `Disetujui oleh ${currentUser.name}` };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('purchase_requisitions', updatedPR);
      setPurchaseRequisitions(prev => prev.map(p => p.id === prId ? updatedPR : p));
      showNotification(`Pengajuan ${pr.prNumber} telah disetujui!`, 'success');
      await addAuditLogInternal('PURCHASE_REQUISITION_APPROVED', 'procurement', `Menyetujui Permintaan Pembelian ${pr.prNumber} (${pr.department})`);
    } catch (error: any) {
      console.error('[approvePurchaseRequisition] Gagal menyetujui di Firebase:', error);
      showNotification(`Gagal menyetujui Permintaan Pembelian: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const convertPRToPO = async (prId: string, vendorId: string) => {
    const pr = purchaseRequisitions.find(p => p.id === prId);
    const vendor = vendors.find(v => v.id === vendorId);
    if (!pr || !vendor) return;

    try {
      const yyyy = new Date().getFullYear();
      const periodKey = `${yyyy}`;
      const nextNum = await getNextDocumentNumber('purchase_orders', periodKey);
      const poNum = `PO-${yyyy}-${String(nextNum + 100).padStart(3, '0')}`;
      const items = pr.items.map((it, idx) => ({
        sku: `FEE-PO-${idx + 1}`,
        name: it.itemName,
        quantity: it.quantity,
        unitCost: it.estimatedCost,
        total: it.quantity * it.estimatedCost
      }));

      const newPO: PurchaseOrder = {
        id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        poNumber: poNum,
        prReference: pr.prNumber,
        vendorId: vendor.id,
        vendorName: vendor.name,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        items,
        totalCost: pr.totalEstimated,
        status: 'issued',
        paymentTerms: vendor.paymentTerms,
        threeWayMatched: false
      };

      const updatedPR: PurchaseRequisition = { ...pr, status: 'converted_to_po' };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('purchase_requisitions', updatedPR);
      await saveDocument('purchase_orders', newPO);

      setPurchaseRequisitions(prev => prev.map(p => p.id === prId ? updatedPR : p));
      setPurchaseOrders(prev => [newPO, ...prev]);

      showNotification(`Surat Pesanan Pembelian ${poNum} diterbitkan ke ${vendor.name}!`, 'success');
      await addAuditLogInternal('PR_CONVERTED_TO_PO', 'procurement', `Mengonversi PR ${pr.prNumber} menjadi Purchase Order ${poNum} ke vendor ${vendor.name} (Total: Rp ${pr.totalEstimated.toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[convertPRToPO] Gagal mengonversi PR ke PO di Firebase:', error);
      showNotification(`Gagal menerbitkan Purchase Order: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addDirectPurchaseOrder = async (poData: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status' | 'threeWayMatched'>) => {
    try {
      const yyyy = new Date().getFullYear();
      const periodKey = `${yyyy}`;
      const nextNum = await getNextDocumentNumber('purchase_orders', periodKey);
      const poNum = `PO-${yyyy}-${String(nextNum + 100).padStart(3, '0')}`;
      const newPO: PurchaseOrder = {
        ...poData,
        id: `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        poNumber: poNum,
        status: 'issued',
        threeWayMatched: false
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('purchase_orders', newPO);
      setPurchaseOrders(prev => [newPO, ...prev]);
      showNotification(`Purchase Order ${poNum} ke ${poData.vendorName} berhasil dibuat!`, 'success');
      await addAuditLogInternal('PURCHASE_ORDER_CREATED', 'procurement', `Menerbitkan Purchase Order langsung ${poNum} ke ${poData.vendorName} (Total: Rp ${(poData.totalCost || 0).toLocaleString('id-ID')})`);
    } catch (error: any) {
      console.error('[addDirectPurchaseOrder] Gagal menyimpan PO ke Firebase:', error);
      showNotification(`Gagal menerbitkan Purchase Order: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deletePurchaseOrder = async (poId: string) => {
    const target = purchaseOrders.find(p => p.id === poId);
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('purchase_orders', poId);
      setPurchaseOrders(prev => prev.filter(p => p.id !== poId));
      showNotification(`Pesanan Pembelian ${target?.poNumber || poId} telah dihapus`, 'info');
      await addAuditLogInternal('PURCHASE_ORDER_DELETED', 'procurement', `Menghapus Purchase Order ${target?.poNumber || poId}`);
    } catch (error: any) {
      console.error('[deletePurchaseOrder] Gagal menghapus PO di Firebase:', error);
      showNotification(`Gagal menghapus Purchase Order: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const confirmGoodsReceipt = async (poId: string, targetWarehouse: string) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return;

    try {
      const updatedPO: PurchaseOrder = { ...po, status: 'goods_received', threeWayMatched: true };

      // Increase inventory stock
      let updatedInvList = [...inventory];
      po.items.forEach(poItem => {
        const existing = updatedInvList.find(inv => inv.sku === poItem.sku || inv.name.toLowerCase().includes(poItem.name.toLowerCase().substring(0, 10)));
        if (existing) {
          updatedInvList = updatedInvList.map(inv => inv.id === existing.id ? {
            ...inv,
            stockQty: inv.stockQty + poItem.quantity,
            lastUpdated: new Date().toISOString()
          } : inv);
        } else {
          const newItem: InventoryItem = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            sku: poItem.sku,
            name: poItem.name,
            category: 'Pakan & Suplemen Satwa',
            unit: 'Unit',
            stockQty: poItem.quantity,
            minStockLevel: 10,
            unitCost: poItem.unitCost,
            sellingPrice: Math.round(poItem.unitCost * 1.3),
            warehouseLocation: `${targetWarehouse} (WH-01)`,
            barcode: String(Date.now()).substring(0, 12),
            lastUpdated: new Date().toISOString()
          };
          updatedInvList.push(newItem);
        }
      });

      const newMovements: StockMovement[] = po.items.map(it => ({
        id: `mv_${Date.now()}_${it.sku}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'inbound',
        itemSku: it.sku,
        itemName: it.name,
        quantity: it.quantity,
        referenceType: 'PO',
        referenceNo: po.poNumber,
        warehouse: targetWarehouse,
        operator: currentUser.name,
        notes: `Penerimaan barang masuk dari pemasok ${po.vendorName}`
      }));

      // VALIDASI FIREBASE-FIRST
      await saveDocument('purchase_orders', updatedPO);
      await saveMultipleDocuments('inventory', updatedInvList);
      await saveMultipleDocuments('stock_movements', newMovements);

      setPurchaseOrders(prev => prev.map(p => p.id === poId ? updatedPO : p));
      setInventory(updatedInvList);
      setStockMovements(prev => [...newMovements, ...prev]);

      showNotification(`Penerimaan Barang Sukses! Stok gudang bertambah & tersimpan ke database cloud`, 'success');
      await addAuditLogInternal('GOODS_RECEIPT_CONFIRMED', 'procurement', `Konfirmasi Penerimaan Barang PO ${po.poNumber} dari ${po.vendorName} ke gudang ${targetWarehouse} (3-Way Matching Selesai)`);
    } catch (error: any) {
      console.error('[confirmGoodsReceipt] Gagal memproses penerimaan barang di Firebase:', error);
      showNotification(`Gagal memproses penerimaan barang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addInventoryItem = async (itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    try {
      const newItem: InventoryItem = {
        ...itemData,
        id: `inv_item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        lastUpdated: new Date().toISOString()
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('inventory', newItem);
      setInventory(prev => [newItem, ...prev]);
      showNotification(`Item barang SKU ${itemData.sku} berhasil didaftarkan ke gudang`, 'success');
      await addAuditLogInternal('INVENTORY_ITEM_CREATED', 'warehouse', `Mendaftarkan barang baru: ${itemData.name} (SKU: ${itemData.sku}, Stok Awal: ${itemData.stockQty} ${itemData.unit})`);
    } catch (error: any) {
      console.error('[addInventoryItem] Gagal mendaftarkan barang ke Firebase:', error);
      showNotification(`Gagal mendaftarkan item barang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const deleteInventoryItem = async (itemId: string) => {
    const target = inventory.find(i => i.id === itemId);
    try {
      // VALIDASI FIREBASE-FIRST
      await deleteDocument('inventory', itemId);
      setInventory(prev => prev.filter(i => i.id !== itemId));
      showNotification(`Item barang "${target?.name || itemId}" telah dihapus`, 'info');
      await addAuditLogInternal('INVENTORY_ITEM_DELETED', 'warehouse', `Menghapus item inventaris gudang: ${target?.name || itemId} (SKU: ${target?.sku || ''})`);
    } catch (error: any) {
      console.error('[deleteInventoryItem] Gagal menghapus barang di Firebase:', error);
      showNotification(`Gagal menghapus item barang: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const adjustStockQuantity = async (sku: string, diff: number, reason: string) => {
    const item = inventory.find(i => i.sku === sku);
    if (!item) return;

    try {
      const updatedItem: InventoryItem = {
        ...item,
        stockQty: Math.max(0, item.stockQty + diff),
        lastUpdated: new Date().toISOString()
      };

      const mv: StockMovement = {
        id: `mv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'adjustment',
        itemSku: sku,
        itemName: item.name,
        quantity: diff,
        referenceType: 'OPNAME',
        referenceNo: `ADJ-${Date.now().toString().slice(-4)}`,
        warehouse: item.warehouseLocation.split(' (')[0] || "Gudang Utama D'Kandang",
        operator: currentUser.name,
        notes: reason
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('inventory', updatedItem);
      await saveDocument('stock_movements', mv);

      setInventory(prev => prev.map(i => i.sku === sku ? updatedItem : i));
      setStockMovements(prev => [mv, ...prev]);

      showNotification(`Penyesuaian stok ${sku} berhasil disimpan ke cloud`, 'info');
      await addAuditLogInternal('STOCK_QUANTITY_ADJUSTED', 'warehouse', `Penyesuaian stok ${item.name} (${sku}): ${diff > 0 ? `+${diff}` : diff} unit. Alasan: ${reason}`);
    } catch (error: any) {
      console.error('[adjustStockQuantity] Gagal menyesuaikan stok di Firebase:', error);
      showNotification(`Gagal menyesuaikan stok: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const runStockOpname = async (opnameData: Omit<StockOpname, 'id' | 'opnameNumber' | 'date' | 'auditor' | 'status'>) => {
    try {
      const yyyy = new Date().getFullYear();
      const mm = String(new Date().getMonth() + 1).padStart(2, '0');
      const periodKey = `${yyyy}${mm}`;
      const nextNum = await getNextDocumentNumber('stock_opnames', periodKey);
      const opnNum = `OPN-${yyyy}-${mm}-${String(nextNum).padStart(2, '0')}`;
      const newOpn: StockOpname = {
        ...opnameData,
        id: `opn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        opnameNumber: opnNum,
        date: new Date().toISOString().split('T')[0],
        auditor: currentUser.name,
        status: 'completed'
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('stock_opnames', newOpn);
      setStockOpnames(prev => [newOpn, ...prev]);

      showNotification(`Pengecekan Fisik Stok ${opnNum} terselesaikan & tercatat di database cloud`, 'success');
      await addAuditLogInternal('STOCK_OPNAME_COMPLETED', 'warehouse', `Menyelesaikan Stock Opname ${opnNum} di ${opnameData.warehouse} (Auditor: ${currentUser.name}, ${opnameData.itemsAudited} item diaudit, selisih: ${opnameData.discrepancyCount})`);
    } catch (error: any) {
      console.error('[runStockOpname] Gagal mencatat stock opname di Firebase:', error);
      showNotification(`Gagal mencatat Stock Opname: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const triggerReportGeneration = async (reportId: string) => {
    const rep = scheduledReports.find(r => r.id === reportId);
    if (!rep) return;

    try {
      const updatedRep: ScheduledReport = {
        ...rep,
        lastGenerated: new Date().toISOString().replace('T', ' ').substring(0, 16)
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('reports', updatedRep);
      setScheduledReports(prev => prev.map(r => r.id === reportId ? updatedRep : r));

      showNotification(`Laporan Otomatis "${rep.title}" berhasil di-generate!`, 'success');
      await addAuditLogInternal('REPORT_GENERATED', 'reports', `Men-generate laporan otomatis: ${rep.title} (${rep.frequency})`);
    } catch (error: any) {
      console.error('[triggerReportGeneration] Gagal men-generate laporan di Firebase:', error);
      showNotification(`Gagal men-generate laporan: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const toggleReportStatus = async (reportId: string) => {
    const target = scheduledReports.find(r => r.id === reportId);
    if (!target) return;
    try {
      const updated: ScheduledReport = { ...target, status: target.status === 'active' ? 'paused' : 'active' };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('reports', updated);
      setScheduledReports(prev => prev.map(r => r.id === reportId ? updated : r));
      await addAuditLogInternal('REPORT_SCHEDULE_TOGGLED', 'reports', `Mengubah status jadwal laporan ${target.title} menjadi ${target.status === 'active' ? 'PAUSED' : 'ACTIVE'}`);
      showNotification('Jadwal laporan diperbarui', 'info');
    } catch (error: any) {
      console.error('[toggleReportStatus] Gagal mengubah status laporan di Firebase:', error);
      showNotification(`Gagal mengubah status jadwal laporan: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const addScheduledReport = async (repData: Omit<ScheduledReport, 'id' | 'lastGenerated'>) => {
    try {
      const newRep: ScheduledReport = {
        ...repData,
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        lastGenerated: 'Belum pernah'
      };
      // VALIDASI FIREBASE-FIRST
      await saveDocument('reports', newRep);
      setScheduledReports(prev => [newRep, ...prev]);
      showNotification(`Jadwal Otomasi Laporan "${repData.title}" berhasil dibuat`, 'success');
      await addAuditLogInternal('REPORT_SCHEDULE_CREATED', 'reports', `Membuat otomasi jadwal laporan baru: ${repData.title} (${repData.frequency}, Format: ${repData.format})`);
    } catch (error: any) {
      console.error('[addScheduledReport] Gagal membuat jadwal laporan di Firebase:', error);
      showNotification(`Gagal membuat jadwal laporan: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const adjustInventoryStock = async (itemId: string, qty: number, type: 'in' | 'out' | 'adjustment', notes: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    try {
      let diff = qty;
      if (type === 'out') diff = -Math.abs(qty);
      if (type === 'in') diff = Math.abs(qty);

      const updatedItem: InventoryItem = {
        ...item,
        stockQty: Math.max(0, item.stockQty + diff),
        lastUpdated: new Date().toISOString()
      };

      const mv: StockMovement = {
        id: `mv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: type === 'out' ? 'outbound' : type === 'in' ? 'inbound' : 'adjustment',
        itemSku: item.sku,
        itemName: item.name,
        quantity: Math.abs(qty),
        referenceType: 'OPNAME',
        referenceNo: `ADJ-${Date.now().toString().slice(-4)}`,
        warehouse: item.warehouseLocation.split(' (')[0] || "Gudang Utama D'Kandang",
        operator: currentUser.name,
        notes: notes || 'Penyesuaian stok opname manual'
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('inventory', updatedItem);
      await saveDocument('stock_movements', mv);

      setInventory(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      setStockMovements(prev => [mv, ...prev]);

      showNotification(`Penyesuaian stok ${item.name} berhasil disimpan ke cloud`, 'success');
      await addAuditLogInternal('STOCK_MUTATION_RECORDED', 'warehouse', `Mutasi stok ${item.name} (${item.sku}): ${type === 'out' ? `Keluar ${qty}` : type === 'in' ? `Masuk ${qty}` : `Penyesuaian ${qty}`} unit. Catatan: ${notes}`);
    } catch (error: any) {
      console.error('[adjustInventoryStock] Gagal menyimpan mutasi stok di Firebase:', error);
      showNotification(`Gagal menyimpan mutasi stok: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const transferStock = async ({ itemId, sourceWarehouse, targetWarehouse, quantity, notes }: {
    itemId: string;
    sourceWarehouse: string;
    targetWarehouse: string;
    quantity: number;
    notes: string;
  }) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    try {
      const qty = Math.min(item.stockQty, quantity);
      const updatedItem: InventoryItem = {
        ...item,
        stockQty: Math.max(0, item.stockQty - qty),
        lastUpdated: new Date().toISOString()
      };

      const mv: StockMovement = {
        id: `mv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        type: 'transfer',
        itemSku: item.sku,
        itemName: item.name,
        quantity: qty,
        referenceType: 'TRANSFER',
        referenceNo: `TRF-${Date.now().toString().slice(-4)}`,
        warehouse: `${sourceWarehouse} ➔ ${targetWarehouse}`,
        operator: currentUser.name,
        notes: notes || 'Mutasi transfer stok antar gudang'
      };

      // VALIDASI FIREBASE-FIRST
      await saveDocument('inventory', updatedItem);
      await saveDocument('stock_movements', mv);

      setInventory(prev => prev.map(i => i.id === itemId ? updatedItem : i));
      setStockMovements(prev => [mv, ...prev]);

      showNotification(`Mutasi transfer ${qty} unit ${item.name} berhasil tercatat di database cloud`, 'success');
      await addAuditLogInternal('STOCK_TRANSFER_RECORDED', 'warehouse', `Transfer stok ${qty} unit ${item.name} dari ${sourceWarehouse} ke ${targetWarehouse}. Catatan: ${notes}`);
    } catch (error: any) {
      console.error('[transferStock] Gagal mentransfer stok di Firebase:', error);
      showNotification(`Gagal mentransfer stok: ${error?.message || 'Koneksi error'}`, 'error');
      throw error;
    }
  };

  const contextValue = useMemo(() => ({
    currentUser,
    users,
    isAuthenticated,
    isCloudSynced,
    isQuotaExceeded,
    activeModule,
    setActiveModule,
    login,
    logout,
    switchUser,
    switchUserWithAuth,
    updateUserRole,
    checkPermission,

    bankAccounts,
    cashTransactions,
    budgetAllocations,
    chartOfAccounts,
    journalEntries,
    accountingPeriods,
    marketingCampaigns,
    leads,
    quotations,
    salesOrders,
    salesInvoices,
    vendors,
    purchaseRequisitions,
    purchaseOrders,
    inventory,
    stockMovements,
    stockOpnames,
    scheduledReports,
    auditLogs,
    companyProfile,
    notifications,
    recurringBills,
    unreadNotificationsCount,
    pendingApprovalsCount,

    // New Modules State
    paymentProofs,
    pettyCashWallets,
    pettyCashExpenses,
    reimbursementClaims,
    packageSimulations,
    debts,
    sheetSyncConfigs,

    // Spreadsheet Import & Google Sheets Auto-Sync
    bulkImportCashTransactions,
    importCashTransactionsBatch,
    saveSheetSyncConfig,
    deleteSheetSyncConfig,
    runGoogleSheetSync,

    // Accounts Payable & Debt Management
    addDebt,
    updateDebt,
    deleteDebt,
    recordDebtPayment,
    importPOAsDebt,

    // School Portal & Proofs
    submitPaymentProof,
    verifyPaymentProof,
    generatePortalTokenForInvoice,

    // Package Costing Simulator
    savePackageCostingSimulation,
    deletePackageCostingSimulation,
    convertSimulationToQuotationDraft,

    // Petty Cash & Reimbursement
    addPettyCashWallet,
    updatePettyCashWallet,
    recordPettyCashExpense,
    deletePettyCashExpense,
    submitReimbursementClaim,
    approveReimbursementClaim,
    rejectReimbursementClaim,
    disburseReimbursementClaim,

    // Notification Automation Methods
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    quickApproveFromNotification,
    quickRejectFromNotification,
    selectedReviewItem,
    setSelectedReviewItem,
    showNotificationCenterModal,
    setShowNotificationCenterModal,

    updateCompanyProfile,

    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    recalculateBankBalances,
    restoreSystemData,
    restoreSchoolAndSalesData,
    addCashTransaction,
    updateCashTransaction,
    deleteCashTransaction,
    clearAllCashTransactions,
    clearAllOutflowTransactions,
    addRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    addBudgetAllocation,
    updateBudgetAllocation,
    deleteBudgetAllocation,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    reverseJournalEntry,
    addChartOfAccount,
    closeAccountingPeriod,
    reopenAccountingPeriod,
    refreshAndReconcileAccounting,
    addMarketingCampaign,
    updateMarketingCampaign,
    deleteMarketingCampaign,
    addLead,
    updateLeadStage,
    addLeadFollowUp,
    updateLeadDetails,
    updateSchoolName,
    deleteLead,
    addQuotation,
    updateQuotation,
    deleteQuotation,
    approveQuotation,
    rejectQuotation,
    sendQuotationToCustomer,
    convertQuotationToSO,
    addSalesOrder,
    processSalesOrderDelivery,
    markInvoicePaid,
    addVendor,
    deleteVendor,
    addPurchaseRequisition,
    deletePurchaseRequisition,
    approvePurchaseRequisition,
    convertPRToPO,
    addDirectPurchaseOrder,
    deletePurchaseOrder,
    confirmGoodsReceipt,
    addInventoryItem,
    deleteInventoryItem,
    adjustStockQuantity,
    runStockOpname,
    triggerReportGeneration,
    toggleReportStatus,
    addScheduledReport,
    addAuditLog,

    theme,
    toggleTheme,
    devicePreview,
    setDevicePreview,
    viewportMode: devicePreview,
    setViewportMode: setDevicePreview,
    isSidebarCollapsed,
    setIsSidebarCollapsed: handleSetIsSidebarCollapsed,
    toggleSidebarCollapsed,
    showRoleSwitcher,
    setShowRoleSwitcher,
    showVaultModal,
    setShowVaultModal,
    notification,
    showNotification,

    // Aliases
    systemUsers: users,
    setCurrentUser: (u: User) => switchUser(u.id),
    reportSchedules: scheduledReports,
    stockTransfers: stockMovements,
    adjustInventoryStock,
    transferStock
  }), [
    currentUser,
    users,
    isAuthenticated,
    isCloudSynced,
    isQuotaExceeded,
    activeModule,
    isSidebarCollapsed,
    bankAccounts,
    cashTransactions,
    budgetAllocations,
    chartOfAccounts,
    journalEntries,
    accountingPeriods,
    marketingCampaigns,
    leads,
    quotations,
    salesOrders,
    salesInvoices,
    vendors,
    purchaseRequisitions,
    purchaseOrders,
    inventory,
    stockMovements,
    stockOpnames,
    scheduledReports,
    auditLogs,
    companyProfile,
    notifications,
    recurringBills,
    paymentProofs,
    pettyCashWallets,
    pettyCashExpenses,
    reimbursementClaims,
    packageSimulations,
    debts,
    sheetSyncConfigs,
    unreadNotificationsCount,
    pendingApprovalsCount,
    selectedReviewItem,
    showNotificationCenterModal,
    theme,
    devicePreview,
    showRoleSwitcher,
    showVaultModal,
    notification
  ]);

  return (
    <ERPContext.Provider value={contextValue}>
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
