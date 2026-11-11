import { BankAccount } from '../types';
import { simulateDecrypt } from './crypto';

/**
 * Canonical bank account matcher used across ERPContext, FinanceModule,
 * CustomTransactionReportsModule, KwitansiModal, and TicketCashierPOS.
 * Deterministically distinguishes "BCA Manajemen" from "BCA - IBU", "BSI - IBU", and "FINANCE CASH".
 */
export function findTargetBankAccount(
  accounts: BankAccount[],
  accountIdentifier?: string
): BankAccount | undefined {
  if (!accounts || accounts.length === 0) return undefined;

  const activeAccounts = accounts.filter(a => !a.isRestricted && a.id !== 'bank_005');
  const candidateList = activeAccounts.length > 0 ? activeAccounts : accounts;

  if (!accountIdentifier) return candidateList[0];
  const cleanId = accountIdentifier.trim().toLowerCase();
  if (!cleanId) return candidateList[0];

  // 1. Exact ID match
  const byId = candidateList.find(a => a.id.toLowerCase() === cleanId);
  if (byId) return byId;

  // 2. Exact bankName match
  const byExactName = candidateList.find(a => a.bankName.trim().toLowerCase() === cleanId);
  if (byExactName) return byExactName;

  // 3. Exact accountNumber or decrypted accountNumber match
  const cleanInputDigits = cleanId.replace(/[^a-z0-9]/g, '');
  if (cleanInputDigits.length > 3) {
    const byAccNumber = candidateList.find(a => {
      const cleanAcc = (a.accountNumber || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const decAcc = simulateDecrypt(a.accountNumber || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return (cleanAcc.length > 3 && cleanInputDigits === cleanAcc) ||
             (decAcc.length > 3 && cleanInputDigits === decAcc);
    });
    if (byAccNumber) return byAccNumber;
  }

  // 4. Specific Priority Matching: "BCA Manajemen" MUST be checked BEFORE generic "BCA"
  if (cleanId.includes('manajemen')) {
    const byBcaManajemen = candidateList.find(a => a.bankName.toLowerCase().includes('manajemen'));
    if (byBcaManajemen) return byBcaManajemen;
  }

  // 5. Generic BCA ("BCA - IBU", "BANK CENTRAL ASIA (BCA)", "BCA KCP", etc.) -> prefer non-Manajemen BCA first
  if (/\bbca\b/.test(cleanId) || cleanId.includes('bca kcp') || cleanId.includes('bank central asia') || cleanId.includes('central asia')) {
    const byBcaIbu = candidateList.find(
      a => a.bankName.toLowerCase().includes('bca') && !a.bankName.toLowerCase().includes('manajemen')
    );
    if (byBcaIbu) return byBcaIbu;
    const anyBca = candidateList.find(a => a.bankName.toLowerCase().includes('bca'));
    if (anyBca) return anyBca;
  }

  // 6. BSI / Syariah
  if (/\bbsi\b/.test(cleanId) || cleanId.includes('syariah')) {
    const byBSI = candidateList.find(
      a => a.bankName.toLowerCase().includes('bsi') || a.bankName.toLowerCase().includes('syariah')
    );
    if (byBSI) return byBSI;
  }

  // 7. Mandiri
  if (/\bmandiri\b/.test(cleanId) || cleanId.includes('bank mandiri')) {
    const byMandiri = candidateList.find(a => a.bankName.toLowerCase().includes('mandiri'));
    if (byMandiri) return byMandiri;
  }

  // 8. Kas / Loket / Finance Cash / Tunai
  if (/\b(kas|loket|gate|resto|saung|tunai|cash)\b/.test(cleanId) || cleanId.includes('finance cash')) {
    const byKas = candidateList.find(a => {
      const name = a.bankName.toLowerCase();
      return name.includes('cash') || name.includes('kas') || name.includes('loket') || name.includes('tunai');
    });
    if (byKas) return byKas;
  }

  // 9. Substantive substring fallback
  const stopWords = ['bank', 'rekening', 'transfer', 'operasional', 'indonesia', 'depok', 'sawangan', 'kandang', 'farm'];
  if (cleanId.length > 5 && !stopWords.includes(cleanId)) {
    const bySub = candidateList.find(a => {
      const aName = a.bankName.trim().toLowerCase();
      return aName.includes(cleanId) || cleanId.includes(aName);
    });
    if (bySub) return bySub;
  }

  return undefined;
}

/**
 * Returns a consistent, human-readable label for a transaction's source/target account
 * by resolving against registered bank accounts first.
 */
export function getAccountShortLabel(accounts: BankAccount[], raw?: string): string {
  if (!raw) return 'Lainnya';
  const matched = findTargetBankAccount(accounts, raw);
  if (matched) return matched.bankName;

  const lower = raw.toLowerCase();
  if (lower.includes('manajemen')) return 'BCA Manajemen';
  if (lower.includes('bca')) return 'BCA - IBU';
  if (lower.includes('bsi') || lower.includes('syariah')) return 'BSI - IBU';
  if (lower.includes('mandiri')) return 'Bank Mandiri';
  if (lower.includes('kas') || lower.includes('loket') || lower.includes('tunai') || lower.includes('cash')) return 'FINANCE CASH';
  return raw;
}
