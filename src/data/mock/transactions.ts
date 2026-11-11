import { 
  CashTransaction, 
  JournalEntry, 
  SalesOrder, 
  SalesInvoice, 
  PaymentProof, 
  RecurringBill, 
  PettyCashExpense, 
  ReimbursementClaim 
} from "../../types";

/**
 * DATABASE TRANSAKSI AWAL (SEED DATA DINONAKTIFKAN)
 * Seluruh data pengeluaran bawaan (309 baris) telah dibersihkan dan auto-seed dimatikan
 * sesuai instruksi pengguna agar aplikasi hanya menyimpan transaksi riil yang diinput/diimpor.
 */
export const INITIAL_CASH_TRANSACTIONS: CashTransaction[] = Object.freeze([]) as unknown as CashTransaction[];
export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = Object.freeze([]) as unknown as JournalEntry[];
export const INITIAL_SALES_ORDERS: SalesOrder[] = Object.freeze([]) as unknown as SalesOrder[];
export const INITIAL_SALES_INVOICES: SalesInvoice[] = Object.freeze([]) as unknown as SalesInvoice[];
export const INITIAL_PAYMENT_PROOFS: PaymentProof[] = Object.freeze([]) as unknown as PaymentProof[];
export const INITIAL_RECURRING_BILLS: RecurringBill[] = Object.freeze([]) as unknown as RecurringBill[];
export const INITIAL_PETTY_CASH_EXPENSES: PettyCashExpense[] = Object.freeze([]) as unknown as PettyCashExpense[];
export const INITIAL_REIMBURSEMENT_CLAIMS: ReimbursementClaim[] = Object.freeze([]) as unknown as ReimbursementClaim[];
