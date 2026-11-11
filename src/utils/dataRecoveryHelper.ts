import {
  BankAccount,
  BudgetAllocation,
  CashTransaction,
  ChartOfAccount,
  JournalEntry,
  Lead,
  Quotation,
  SalesInvoice,
  SalesOrder
} from '../types';
import {
  INITIAL_BANK_ACCOUNTS,
  INITIAL_BUDGETS,
  INITIAL_COA
} from '../data/mockData';
import { findTargetBankAccount } from './bankMatcher';

const LEGACY_PREFIXES = [
  'DKANDANG_FARM_DEPOK_ERP_PROD_CLEAN_V2_',
  'DKANDANG_FARM_DEPOK_ERP_PROD_CLEAN_',
  'DKANDANG_FARM_DEPOK_ERP_V2_',
  'DKANDANG_FARM_DEPOK_ERP_',
  'dkandang_erp_',
  'dkandang_'
];

/**
 * Scans localStorage across current and legacy key prefixes to recover
 * any non-empty cached collection array if the primary key was overwritten.
 */
export function recoverLegacyLocalStorageArray<T extends { id?: string; code?: string }>(
  suffix: string,
  fallback: T[],
  excludeIds?: Set<string>
): T[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  for (const prefix of LEGACY_PREFIXES) {
    try {
      const raw = localStorage.getItem(`${prefix}${suffix}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = excludeIds
          ? parsed.filter((item: T) => {
              const key = item?.id || item?.code;
              return key && !excludeIds.has(key);
            })
          : parsed;
        if (filtered.length > 0) {
          return filtered;
        }
      }
    } catch {
      // Ignore malformed JSON in legacy keys
    }
  }

  return fallback;
}

/**
 * Purges any cached outflow transactions and their linked expense journals
 * across all current and legacy localStorage prefixes, and resets cached budget spentAmount to 0.
 */
export function purgeLegacyOutflowCache(): {
  purgedOutflowIds: string[];
  purgedJournalIds: string[];
} {
  const purgedOutflowIds = new Set<string>();
  const purgedJournalIds = new Set<string>();

  if (typeof window === 'undefined' || !window.localStorage) {
    return { purgedOutflowIds: [], purgedJournalIds: [] };
  }

  for (const prefix of LEGACY_PREFIXES) {
    // 1. Clean cash_transactions
    try {
      const rawTx = localStorage.getItem(`${prefix}cash_transactions`);
      if (rawTx) {
        const parsedTx = JSON.parse(rawTx);
        if (Array.isArray(parsedTx)) {
          const keptTx: CashTransaction[] = [];
          for (const tx of parsedTx) {
            if (tx && (tx.type === 'outflow' || String(tx.id || '').startsWith('tx_exp_'))) {
              if (tx.id) purgedOutflowIds.add(tx.id);
            } else if (tx) {
              keptTx.push(tx);
            }
          }
          localStorage.setItem(`${prefix}cash_transactions`, JSON.stringify(keptTx));
        }
      }
    } catch {
      // Ignore malformed JSON
    }

    // 2. Clean journal entries linked to outflows or expense accounts
    try {
      const rawJrn = localStorage.getItem(`${prefix}journal`);
      if (rawJrn) {
        const parsedJrn = JSON.parse(rawJrn);
        if (Array.isArray(parsedJrn)) {
          const keptJrn: JournalEntry[] = [];
          for (const j of parsedJrn) {
            const refId = String(j?.referenceId || '');
            const jId = String(j?.id || '');
            const hasExpenseDebit = Array.isArray(j?.lines) && j.lines.some(
              (l: any) => (String(l?.accountCode || '').startsWith('5') || String(l?.accountCode || '').startsWith('6')) && Number(l?.debit) > 0
            );
            const isOutflowJournal =
              purgedOutflowIds.has(refId) ||
              refId.startsWith('tx_exp_') ||
              jId.startsWith('jrn_sync_tx_exp_') ||
              (j?.referenceModule === 'finance' && hasExpenseDebit);

            if (isOutflowJournal) {
              if (j?.id) purgedJournalIds.add(j.id);
            } else if (j) {
              keptJrn.push(j);
            }
          }
          localStorage.setItem(`${prefix}journal`, JSON.stringify(keptJrn));
        }
      }
    } catch {
      // Ignore malformed JSON
    }

    // 3. Reset spentAmount to 0 on cached budgets
    try {
      const rawBdg = localStorage.getItem(`${prefix}budgets`);
      if (rawBdg) {
        const parsedBdg = JSON.parse(rawBdg);
        if (Array.isArray(parsedBdg)) {
          const resetBdg = parsedBdg.map((b: BudgetAllocation) => ({
            ...b,
            spentAmount: 0
          }));
          localStorage.setItem(`${prefix}budgets`, JSON.stringify(resetBdg));
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  return {
    purgedOutflowIds: Array.from(purgedOutflowIds),
    purgedJournalIds: Array.from(purgedJournalIds)
  };
}

/**
 * Merges incoming bank accounts with INITIAL_BANK_ACCOUNTS so the 4 official
 * D'Kandang accounts (BCA Manajemen, BCA - IBU, BSI - IBU, FINANCE CASH)
 * are always available unless explicitly deleted by the user.
 */
export function mergeWithCoreBankAccounts(
  incoming: BankAccount[],
  deletedIds: Set<string>,
  legacyDummyIds: Set<string>
): BankAccount[] {
  const validIncoming = Array.isArray(incoming)
    ? incoming.filter((b) => b && b.id && !deletedIds.has(b.id) && !legacyDummyIds.has(b.id) && !b.isRestricted && b.id !== 'bank_005')
    : [];

  const byId = new Map<string, BankAccount>();
  const byNameLower = new Map<string, BankAccount>();

  for (const b of validIncoming) {
    byId.set(b.id, b);
    if (b.bankName) byNameLower.set(b.bankName.trim().toLowerCase(), b);
  }

  const merged: BankAccount[] = [];
  const usedIds = new Set<string>();

  for (const coreBank of INITIAL_BANK_ACCOUNTS) {
    if (deletedIds.has(coreBank.id)) continue;
    const match = byId.get(coreBank.id) || byNameLower.get(coreBank.bankName.trim().toLowerCase());
    if (match) {
      merged.push(match);
      usedIds.add(match.id);
    } else {
      merged.push(coreBank);
      usedIds.add(coreBank.id);
    }
  }

  for (const b of validIncoming) {
    if (!usedIds.has(b.id)) {
      merged.push(b);
      usedIds.add(b.id);
    }
  }

  return merged;
}

/**
 * Merges incoming budgets with INITIAL_BUDGETS so "Kebutuhan Operasional"
 * is always preserved unless explicitly deleted.
 */
export function mergeWithCoreBudgets(
  incoming: BudgetAllocation[],
  deletedIds: Set<string>
): BudgetAllocation[] {
  const validIncoming = Array.isArray(incoming)
    ? incoming.filter((b) => b && b.id && !deletedIds.has(b.id))
    : [];

  const byId = new Map<string, BudgetAllocation>();
  const byDeptLower = new Map<string, BudgetAllocation>();

  for (const b of validIncoming) {
    byId.set(b.id, b);
    if (b.department) byDeptLower.set(b.department.trim().toLowerCase(), b);
  }

  const merged: BudgetAllocation[] = [];
  const usedIds = new Set<string>();

  for (const coreBdg of INITIAL_BUDGETS) {
    if (deletedIds.has(coreBdg.id)) continue;
    const match = byId.get(coreBdg.id) || byDeptLower.get(coreBdg.department.trim().toLowerCase());
    if (match) {
      merged.push(match);
      usedIds.add(match.id);
    } else {
      merged.push(coreBdg);
      usedIds.add(coreBdg.id);
    }
  }

  for (const b of validIncoming) {
    if (!usedIds.has(b.id)) {
      merged.push(b);
      usedIds.add(b.id);
    }
  }

  return merged;
}

/**
 * Merges incoming COA accounts with INITIAL_COA (32 standard agro-farm accounts)
 * so new granular accounts are always present while preserving custom accounts and metadata.
 */
export function mergeWithCoreCOA(
  incoming: ChartOfAccount[],
  deletedCodes?: Set<string>
): ChartOfAccount[] {
  const validIncoming = Array.isArray(incoming)
    ? incoming.filter((a) => a && a.code && (!deletedCodes || !deletedCodes.has(a.code)))
    : [];

  const byCode = new Map<string, ChartOfAccount>();
  for (const acc of validIncoming) {
    byCode.set(acc.code, acc);
  }

  const merged: ChartOfAccount[] = [];
  const usedCodes = new Set<string>();

  for (const coreAcc of INITIAL_COA) {
    if (deletedCodes && deletedCodes.has(coreAcc.code)) continue;
    const match = byCode.get(coreAcc.code);
    if (match) {
      merged.push({
        ...coreAcc,
        ...match,
        cashFlowCategory: match.cashFlowCategory || coreAcc.cashFlowCategory,
        allowedTxTypes: match.allowedTxTypes || coreAcc.allowedTxTypes
      });
      usedCodes.add(coreAcc.code);
    } else {
      merged.push({ ...coreAcc });
      usedCodes.add(coreAcc.code);
    }
  }

  for (const acc of validIncoming) {
    if (!usedCodes.has(acc.code)) {
      merged.push(acc);
      usedCodes.add(acc.code);
    }
  }

  return merged.sort((a, b) => a.code.localeCompare(b.code));
}

/**
 * Infers the PSAK 2 cashFlowCategory ('operating' | 'investing' | 'financing')
 * for a given ChartOfAccount based on its explicit metadata or account code prefix.
 */
export function getCOACashFlowCategory(acc: ChartOfAccount): 'operating' | 'investing' | 'financing' {
  if (acc.cashFlowCategory) return acc.cashFlowCategory;
  const code = String(acc.code || '');
  if (
    code.startsWith('115') ||
    code.startsWith('12') ||
    acc.category.toLowerCase().includes('biologis') ||
    acc.category.toLowerCase().includes('tetap')
  ) {
    return 'investing';
  }
  if (
    code.startsWith('22') ||
    code.startsWith('3') ||
    acc.type === 'Equity' ||
    acc.category.toLowerCase().includes('jangka panjang')
  ) {
    return 'financing';
  }
  return 'operating';
}

/**
 * Filters Chart of Accounts (excluding 1110 Cash/Bank itself) that are relevant
 * for a specific transaction direction ('inflow' | 'outflow') and PSAK 2 activity category.
 */
export function getRelevantCOAAccountsForActivity(
  coaList: ChartOfAccount[],
  type: 'inflow' | 'outflow' | 'mutation',
  category: 'operating' | 'investing' | 'financing'
): ChartOfAccount[] {
  const effectiveType: 'inflow' | 'outflow' = type === 'inflow' ? 'inflow' : 'outflow';
  const sourceList = coaList && coaList.length > 0 ? coaList : INITIAL_COA;
  const nonCash = sourceList.filter((acc) => acc.code !== '1110');

  const filtered = nonCash.filter((acc) => {
    const accCat = getCOACashFlowCategory(acc);
    if (accCat !== category) return false;

    if (acc.allowedTxTypes && acc.allowedTxTypes.length > 0) {
      return acc.allowedTxTypes.includes(effectiveType);
    }

    if (category === 'operating') {
      if (effectiveType === 'inflow') {
        return acc.type === 'Revenue' || acc.code === '1120' || acc.code === '1125' || acc.code === '2130';
      } else {
        return (
          acc.type === 'Expense' ||
          acc.code === '2110' ||
          acc.code === '2120' ||
          acc.code === '2140' ||
          acc.code === '1130' ||
          acc.code === '1140' ||
          acc.code === '1145' ||
          acc.code === '1160' ||
          acc.code === '1125'
        );
      }
    }

    if (category === 'investing') {
      return accCat === 'investing';
    }

    if (category === 'financing') {
      if (effectiveType === 'inflow') {
        return acc.code !== '3130'; // 3130 Prive is outflow
      } else {
        return acc.code === '2210' || acc.code === '3130' || acc.code === '3110' || acc.code === '3210';
      }
    }

    return true;
  });

  return filtered.length > 0 ? filtered : nonCash;
}

/**
 * Smart Auto-Suggest for Double-Entry Contra Account (Akun Lawan COA)
 * based on PSAK 2 Activity Category, Transaction Type, Income Source, Budget, and Description.
 */
export function suggestContraAccountForTransaction(
  params: {
    type: 'inflow' | 'outflow' | 'mutation';
    category?: 'operating' | 'investing' | 'financing';
    incomeSource?: string;
    paymentStage?: string;
    budgetName?: string;
    activityCategory?: string;
    description?: string;
    chartOfAccounts?: ChartOfAccount[];
    chosenContraCode?: string;
    contraAccountCode?: string;
  },
  externalChartOfAccounts?: ChartOfAccount[]
): {
  code: string;
  name: string;
  cashFlowCategory: 'operating' | 'investing' | 'financing';
} {
  const {
    type,
    category = 'operating',
    incomeSource,
    budgetName = '',
    activityCategory = '',
    description = '',
    chartOfAccounts = externalChartOfAccounts || INITIAL_COA,
    chosenContraCode
  } = params;

  const coaPool = chartOfAccounts && chartOfAccounts.length > 0 ? chartOfAccounts : (externalChartOfAccounts && externalChartOfAccounts.length > 0 ? externalChartOfAccounts : INITIAL_COA);
  const findAcc = (code: string, fallbackName: string, fallbackCat: 'operating' | 'investing' | 'financing' = category) => {
    const found = coaPool.find((a) => a.code === code) || INITIAL_COA.find((a) => a.code === code);
    return {
      code,
      name: found ? found.name : fallbackName,
      cashFlowCategory: found ? getCOACashFlowCategory(found) : fallbackCat
    };
  };

  if (type === 'mutation') {
    return findAcc('1110', "Kas & Bank D'Kandang Farm (BCA, Mandiri, BSI & Loket)", 'operating');
  }

  const effectiveChosenCode = chosenContraCode || params.contraAccountCode;
  if (effectiveChosenCode && effectiveChosenCode !== '1110') {
    const explicitMatch = coaPool.find((a) => a.code === effectiveChosenCode) || INITIAL_COA.find((a) => a.code === effectiveChosenCode);
    if (explicitMatch) {
      return {
        code: explicitMatch.code,
        name: explicitMatch.name,
        cashFlowCategory: getCOACashFlowCategory(explicitMatch)
      };
    }
  }

  const descUpper = `${description} ${budgetName} ${activityCategory}`.toUpperCase();

  // 1. INVESTING ACTIVITIES (PSAK 2)
  if (category === 'investing') {
    if (
      descUpper.includes('SAPI') ||
      descUpper.includes('KAMBING') ||
      descUpper.includes('DOMBA') ||
      descUpper.includes('KUDA') ||
      descUpper.includes('SATWA') ||
      descUpper.includes('TERNAK') ||
      descUpper.includes('HEWAN')
    ) {
      return findAcc('1150', 'Aset Biologis - Hewan Ternak (Sapi Perah, Kambing Etawa, Kuda Poni, Domba)', 'investing');
    }
    if (
      descUpper.includes('TANAMAN') ||
      descUpper.includes('HIDROPONIK') ||
      descUpper.includes('KEBUN') ||
      descUpper.includes('POHON')
    ) {
      return findAcc('1155', 'Aset Biologis - Tanaman Perkebunan, Hidroponik & Bibit Unggul', 'investing');
    }
    if (descUpper.includes('TANAH') || descUpper.includes('LAHAN')) {
      return findAcc('1205', 'Aset Tetap - Tanah & Lahan Kawasan Agrowisata', 'investing');
    }
    if (
      descUpper.includes('MESIN') ||
      descUpper.includes('KENDARAAN') ||
      descUpper.includes('MOBIL') ||
      descUpper.includes('MOTOR') ||
      descUpper.includes('TRAKTOR') ||
      descUpper.includes('KOMPUTER') ||
      descUpper.includes('ALAT')
    ) {
      return findAcc('1220', 'Aset Tetap - Mesin Pasteurisasi, Peralatan Farm & Kendaraan', 'investing');
    }
    return findAcc('1210', 'Aset Tetap - Bangunan, Kandang Satwa, Saung & Wahana Wisata', 'investing');
  }

  // 2. FINANCING ACTIVITIES (PSAK 2)
  if (category === 'financing') {
    if (type === 'inflow') {
      if (descUpper.includes('PINJAMAN') || descUpper.includes('KREDIT') || descUpper.includes('BANK') || descUpper.includes('KUR')) {
        return findAcc('2210', 'Pinjaman Bank & Pembiayaan Investasi Jangka Panjang', 'financing');
      }
      if (descUpper.includes('TAMBAHAN MODAL') || descUpper.includes('SUNTIKAN') || descUpper.includes('OWNER')) {
        return findAcc('3120', 'Tambahan Modal Kerja & Setoran Investasi Owner', 'financing');
      }
      return findAcc('3110', "Modal Disetor PT D'Kandang Amazing Farm", 'financing');
    } else {
      if (descUpper.includes('PRIVE') || descUpper.includes('BAGI HASIL') || descUpper.includes('DIVIDEN') || descUpper.includes('OWNER') || descUpper.includes('30%')) {
        return findAcc('3130', 'Prive / Bagi Hasil & Penarikan Dana Owner (30%)', 'financing');
      }
      return findAcc('2210', 'Pinjaman Bank & Pembiayaan Investasi Jangka Panjang', 'financing');
    }
  }

  // 3. OPERATING ACTIVITIES (PSAK 2) - INFLOW
  if (type === 'inflow') {
    if (incomeSource === 'dairy_product' || descUpper.includes('SUSU') || descUpper.includes('YOGURT')) {
      return findAcc('4120', 'Pendapatan Penjualan Susu Pasteurisasi & Produk Olahan Farm', 'operating');
    }
    if (incomeSource === 'resto_fnb' || incomeSource === 'ticket_gate' || descUpper.includes('RESTO') || descUpper.includes('LOKET') || descUpper.includes('GATE')) {
      return findAcc('4130', "Pendapatan F&B Saung Resto D'Kandang & Wahana Satwa", 'operating');
    }
    if (incomeSource === 'agriculture' || descUpper.includes('BIBIT') || descUpper.includes('PUPUK') || descUpper.includes('SAYUR')) {
      return findAcc('4140', 'Pendapatan Penjualan Bibit Tanaman, Pupuk Organik & Hasil Kebun', 'operating');
    }
    if (incomeSource === 'b2b_corporate' || descUpper.includes('GATHERING') || descUpper.includes('CORPORATE') || descUpper.includes('SEWA VENUE')) {
      return findAcc('4150', 'Pendapatan Sewa Venue, Gathering Corporate & Outbound B2B', 'operating');
    }
    if (descUpper.includes('PIUTANG')) {
      return findAcc('1120', 'Piutang Usaha Paket Wisata Edukasi Sekolah & Mitra', 'operating');
    }
    if (incomeSource === 'other' && (descUpper.includes('BUNGA') || descUpper.includes('GIRO') || descUpper.includes('SPONSOR'))) {
      return findAcc('4210', 'Pendapatan Lain-lain, Sponsorship & Jasa Giro Bank', 'operating');
    }
    return findAcc('4110', 'Pendapatan Tiket Masuk & Paket Edukasi Wisata Sekolah', 'operating');
  }

  // 4. OPERATING ACTIVITIES (PSAK 2) - OUTFLOW
  if (descUpper.includes('PEMBAYARAN HUTANG') || descUpper.includes('CICILAN HUTANG') || descUpper.includes('PELUNASAN PO') || descUpper.includes('HUT-')) {
    if (descUpper.includes('PINJAMAN BANK') || descUpper.includes('KREDIT BANK')) {
      return findAcc('2210', 'Pinjaman Bank & Pembiayaan Investasi Jangka Panjang', 'financing');
    }
    if (descUpper.includes('PAJAK')) {
      return findAcc('2120', 'Hutang Pajak Daerah, PB1 Resto & PPN Wisata Edukasi', 'operating');
    }
    if (descUpper.includes('GAJI')) {
      return findAcc('2140', 'Hutang Gaji, Honor Fasilitator & Insentif Karyawan', 'operating');
    }
    return findAcc('2110', 'Hutang Usaha Pemasok Pakan, Logistik & Kemasan Botol Farm', 'operating');
  }
  if (descUpper.includes('PAJAK') || descUpper.includes('PPN') || descUpper.includes('PPH') || descUpper.includes('PB1')) {
    return findAcc('2120', 'Hutang Pajak Daerah, PB1 Resto & PPN Wisata Edukasi', 'operating');
  }
  if (
    descUpper.includes('RENOVASI BESAR') ||
    descUpper.includes('KONSTRUKSI') ||
    descUpper.includes('PEMBANGUNAN')
  ) {
    return findAcc('1210', 'Aset Tetap - Bangunan, Kandang Satwa, Saung & Wahana Wisata', 'investing');
  }
  if (
    descUpper.includes('PAYROLL') ||
    descUpper.includes('GAJI') ||
    descUpper.includes('FREELANCE') ||
    descUpper.includes('HONOR') ||
    descUpper.includes('UPAH') ||
    descUpper.includes('THR') ||
    descUpper.includes('MANGNUR') ||
    descUpper.includes('FASILITATOR') ||
    descUpper.includes('GUIDE')
  ) {
    return findAcc('6110', 'Beban Gaji Fasilitator Edukasi, Pemandu & Peternak', 'operating');
  }
  if (
    descUpper.includes('LISTRIK') ||
    descUpper.includes('PLN') ||
    descUpper.includes('AIR ') ||
    descUpper.includes('PDAM') ||
    descUpper.includes('WIFI') ||
    descUpper.includes('INTERNET') ||
    descUpper.includes('KEBERSIHAN') ||
    descUpper.includes('SAMPAH')
  ) {
    return findAcc('6140', 'Beban Utilitas (Listrik PLN, Air Bersih, Internet & Kebersihan)', 'operating');
  }
  if (
    descUpper.includes('KANDANG') ||
    descUpper.includes('PERTUKANGAN') ||
    descUpper.includes('AIR MANCUR') ||
    descUpper.includes('DOKTER') ||
    descUpper.includes('OBAT') ||
    descUpper.includes('VITAMIN') ||
    descUpper.includes('SERVIS') ||
    descUpper.includes('MAINTENANCE') ||
    descUpper.includes('PEMELIHARAAN')
  ) {
    return findAcc('6120', 'Beban Pemeliharaan Kesehatan Satwa, Kandang & Dokter Hewan', 'operating');
  }
  if (
    descUpper.includes('MARKETING') ||
    descUpper.includes('PROMOSI') ||
    descUpper.includes('BROSUR') ||
    descUpper.includes('IKLAN') ||
    descUpper.includes('KOMISI') ||
    descUpper.includes('SPANDUK') ||
    descUpper.includes('BANNER')
  ) {
    return findAcc('6130', 'Beban Promosi Sekolah, Event & Pemasaran Wisata', 'operating');
  }
  if (
    descUpper.includes('ATK') ||
    descUpper.includes('KANTOR') ||
    descUpper.includes('METERAI') ||
    descUpper.includes('PERIZINAN') ||
    descUpper.includes('RAPAT') ||
    descUpper.includes('ADMINISTRASI')
  ) {
    return findAcc('6150', 'Beban Administrasi Kantor, ATK, Perizinan & Konsumsi Rapat', 'operating');
  }
  if (
    descUpper.includes('CATERING SEKOLAH') ||
    descUpper.includes('NASI BOX') ||
    descUpper.includes('SNACK SISWA') ||
    descUpper.includes('GOODIE BAG') ||
    descUpper.includes('PAKET EDUKASI')
  ) {
    return findAcc('5120', 'Beban Pokok Paket Edukasi Sekolah (Catering, Goodie Bag & Properti)', 'operating');
  }

  return findAcc('5110', 'Beban Pokok Penjualan (Pakan Ternak, Bibit & Bahan Resto)', 'operating');
}

/**
 * Deterministically builds General Ledger Journal Entries, COA Balances,
 * Bank Account Balances, and Budget Realizations from active CashTransactions.
 */
export function buildDeterministicJournalsAndCOA(params: {
  transactions: CashTransaction[];
  existingJournals: JournalEntry[];
  existingCOA?: ChartOfAccount[];
  existingBanks?: BankAccount[];
  existingBudgets?: BudgetAllocation[];
  actorName?: string;
}): {
  journals: JournalEntry[];
  coa: ChartOfAccount[];
  banks: BankAccount[];
  budgets: BudgetAllocation[];
  newlyGeneratedJournals: JournalEntry[];
  updatedTransactions: CashTransaction[];
} {
  const {
    transactions = [],
    existingJournals = [],
    existingCOA = [],
    existingBanks = [],
    existingBudgets = [],
    actorName = 'Sistem Rekonsiliasi Otomatis'
  } = params;

  const baseCOA = mergeWithCoreCOA(existingCOA);
  const cashAccName = baseCOA.find((a) => a.code === '1110')?.name || "Kas & Bank D'Kandang Farm (BCA, Mandiri, BSI & Loket)";

  // Enrich transactions with contraAccountCode & contraAccountName if missing
  const updatedTransactions: CashTransaction[] = transactions.map((tx) => {
    if (tx.type === 'mutation') {
      return {
        ...tx,
        contraAccountCode: '1110',
        contraAccountName: cashAccName
      };
    }
    const resolved = suggestContraAccountForTransaction({
      type: tx.type === 'inflow' ? 'inflow' : 'outflow',
      category: tx.category,
      incomeSource: tx.incomeSource,
      paymentStage: tx.paymentStage,
      budgetName: tx.budgetName,
      activityCategory: tx.activityCategory,
      description: tx.description,
      chartOfAccounts: baseCOA,
      chosenContraCode: tx.contraAccountCode
    });
    return {
      ...tx,
      contraAccountCode: resolved.code,
      contraAccountName: resolved.name
    };
  });

  const txById = new Map<string, CashTransaction>();
  for (const tx of updatedTransactions) {
    if (tx.id) txById.set(tx.id, tx);
  }

  const validTxIds = new Set(updatedTransactions.map((t) => t.id));
  const newlyGeneratedJournals: JournalEntry[] = [];

  // Keep valid journals and synchronize finance-linked journals with their transaction's latest contraAccountCode & amount
  const keptJournals: JournalEntry[] = [];
  for (const j of existingJournals) {
    if (j.referenceModule === 'finance' && j.referenceId) {
      if (!validTxIds.has(j.referenceId)) {
        continue;
      }
      const linkedTx = txById.get(j.referenceId);
      if (linkedTx) {
        if (linkedTx.type === 'mutation') {
          const syncedJrn: JournalEntry = {
            ...j,
            date: linkedTx.date || j.date,
            totalAmount: linkedTx.amount,
            lines: [
              {
                accountCode: '1110',
                accountName: `Kas & Bank (Tujuan: ${linkedTx.targetAccount || 'Tujuan'})`,
                debit: linkedTx.amount,
                credit: 0
              },
              {
                accountCode: '1110',
                accountName: `Kas & Bank (Asal: ${linkedTx.sourceAccount})`,
                debit: 0,
                credit: linkedTx.amount
              }
            ]
          };
          keptJournals.push(syncedJrn);
          continue;
        } else {
          const isIncome = linkedTx.type === 'inflow';
          const contraCode = linkedTx.contraAccountCode || (isIncome ? '4110' : '5110');
          const contraName =
            linkedTx.contraAccountName ||
            baseCOA.find((a) => a.code === contraCode)?.name ||
            (isIncome
              ? 'Pendapatan Tiket Masuk & Paket Edukasi Wisata Sekolah'
              : 'Beban Pokok Penjualan (Pakan Ternak, Bibit & Bahan Resto)');

          const expectedLines = isIncome
            ? [
                { accountCode: '1110', accountName: cashAccName, debit: linkedTx.amount, credit: 0 },
                { accountCode: contraCode, accountName: contraName, debit: 0, credit: linkedTx.amount }
              ]
            : [
                { accountCode: contraCode, accountName: contraName, debit: linkedTx.amount, credit: 0 },
                { accountCode: '1110', accountName: cashAccName, debit: 0, credit: linkedTx.amount }
              ];

          const currentContraLine = (j.lines || []).find((l) => l.accountCode !== '1110');
          const needsUpdate =
            j.totalAmount !== linkedTx.amount ||
            j.date !== linkedTx.date ||
            !currentContraLine ||
            currentContraLine.accountCode !== contraCode;

          if (needsUpdate) {
            const syncedJrn: JournalEntry = {
              ...j,
              date: linkedTx.date || j.date,
              description: j.description.startsWith('[') ? j.description : `[Arus Kas Otomatis] ${linkedTx.description}`,
              lines: expectedLines,
              totalAmount: linkedTx.amount
            };
            keptJournals.push(syncedJrn);
            newlyGeneratedJournals.push(syncedJrn);
            continue;
          }
        }
      }
    }
    keptJournals.push(j);
  }

  const recordedRefIds = new Set(
    keptJournals.filter((j) => j.referenceId).map((j) => j.referenceId as string)
  );

  const periodSeqCounter: Record<string, number> = {};
  for (const j of keptJournals) {
    const parts = (j.entryNumber || '').split('-');
    if (parts.length >= 3) {
      const pKey = parts[1];
      const num = parseInt(parts[parts.length - 1], 10);
      if (pKey && !isNaN(num)) {
        periodSeqCounter[pKey] = Math.max(periodSeqCounter[pKey] || 0, num);
      }
    }
  }

  // Sort transactions chronologically so journal numbers increment cleanly
  const sortedTxs = [...updatedTransactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const tx of sortedTxs) {
    if (!tx.id || recordedRefIds.has(tx.id)) continue;

    const dateStr = tx.date || '2026-08-11';
    const yyyyMm = dateStr.slice(0, 7).replace('-', '') || '202608';
    periodSeqCounter[yyyyMm] = (periodSeqCounter[yyyyMm] || 0) + 1;
    const seq = periodSeqCounter[yyyyMm];
    const entryNum = `JV-${yyyyMm}-${String(seq).padStart(3, '0')}`;

    let newJrn: JournalEntry;

    if (tx.type === 'mutation') {
      newJrn = {
        id: `jrn_sync_${tx.id}`,
        entryNumber: entryNum,
        date: dateStr,
        description: `[Mutasi Antar Rekening] ${tx.description || `Transfer dari ${tx.sourceAccount} ke ${tx.targetAccount}`}`,
        lines: [
          {
            accountCode: '1110',
            accountName: `Kas & Bank (Tujuan: ${tx.targetAccount || 'Tujuan'})`,
            debit: tx.amount,
            credit: 0
          },
          {
            accountCode: '1110',
            accountName: `Kas & Bank (Asal: ${tx.sourceAccount})`,
            debit: 0,
            credit: tx.amount
          }
        ],
        totalAmount: tx.amount,
        referenceModule: 'finance',
        referenceId: tx.id,
        createdBy: actorName,
        status: 'posted'
      };
    } else {
      const isIncome = tx.type === 'inflow';
      const contraCode = tx.contraAccountCode || (isIncome ? '4110' : '5110');
      const contraName =
        tx.contraAccountName ||
        baseCOA.find((a) => a.code === contraCode)?.name ||
        (isIncome
          ? 'Pendapatan Tiket Masuk & Paket Edukasi Wisata Sekolah'
          : 'Beban Pokok Penjualan (Pakan Ternak, Bibit & Bahan Resto)');

      newJrn = {
        id: `jrn_sync_${tx.id}`,
        entryNumber: entryNum,
        date: dateStr,
        description: `[Arus Kas Otomatis] ${tx.description}`,
        lines: isIncome
          ? [
              { accountCode: '1110', accountName: cashAccName, debit: tx.amount, credit: 0 },
              { accountCode: contraCode, accountName: contraName, debit: 0, credit: tx.amount }
            ]
          : [
              { accountCode: contraCode, accountName: contraName, debit: tx.amount, credit: 0 },
              { accountCode: '1110', accountName: cashAccName, debit: 0, credit: tx.amount }
            ],
        totalAmount: tx.amount,
        referenceModule: 'finance',
        referenceId: tx.id,
        createdBy: actorName,
        status: 'posted'
      };
    }

    newlyGeneratedJournals.push(newJrn);
    keptJournals.unshift(newJrn);
    recordedRefIds.add(tx.id);
  }

  const allJournals = [...keptJournals];

  // Recompute all 32+ COA balances deterministically from all active journals
  const coa: ChartOfAccount[] = baseCOA.map((acc) => {
    let balance = 0;
    for (const jrn of allJournals) {
      for (const line of jrn.lines || []) {
        if (line.accountCode === acc.code) {
          const debit = Number(line.debit) || 0;
          const credit = Number(line.credit) || 0;
          balance += acc.normalBalance === 'Debit' ? debit - credit : credit - debit;
        }
      }
    }
    return { ...acc, balance };
  });

  // Recompute Bank Account Balances deterministically
  const baseBanks = existingBanks.length > 0 ? existingBanks : INITIAL_BANK_ACCOUNTS;
  const banks: BankAccount[] = baseBanks.map((bank) => {
    const inTotal = updatedTransactions
      .filter((t) => t.type === 'inflow' && findTargetBankAccount(baseBanks, t.sourceAccount)?.id === bank.id)
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const outTotal = updatedTransactions
      .filter((t) => t.type === 'outflow' && findTargetBankAccount(baseBanks, t.sourceAccount)?.id === bank.id)
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const mutationIn = updatedTransactions
      .filter((t) => t.type === 'mutation' && t.targetAccount && findTargetBankAccount(baseBanks, t.targetAccount)?.id === bank.id)
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const mutationOut = updatedTransactions
      .filter((t) => t.type === 'mutation' && findTargetBankAccount(baseBanks, t.sourceAccount)?.id === bank.id)
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    return {
      ...bank,
      balance: inTotal + mutationIn - outTotal - mutationOut
    };
  });

  // Recompute Budget Allocations spentAmount deterministically
  const baseBudgets = existingBudgets.length > 0 ? existingBudgets : INITIAL_BUDGETS;
  const budgets: BudgetAllocation[] = baseBudgets.map((b) => {
    const spent = updatedTransactions
      .filter(
        (t) =>
          t.type === 'outflow' &&
          (t.budgetId === b.id ||
            (!t.budgetId && t.budgetName && b.department.toLowerCase() === t.budgetName.toLowerCase()))
      )
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    return { ...b, spentAmount: spent };
  });

  return {
    journals: allJournals,
    coa,
    banks,
    budgets,
    newlyGeneratedJournals,
    updatedTransactions
  };
}

function inferSchoolInstitutionType(schoolName: string): string {
  const upper = schoolName.toUpperCase();
  if (upper.includes('TK') || upper.includes('PAUD') || upper.includes('RA ') || upper.startsWith('RA ')) {
    return 'TK / PAUD';
  }
  if (upper.includes('SMP') || upper.includes('SMA') || upper.includes('SMK') || upper.includes('MTS') || upper.includes('MA ')) {
    return 'SMP / SMA';
  }
  if (upper.includes('UNIVERSITAS') || upper.includes('STIE') || upper.includes('KAMPUS') || upper.includes('INSTITUT')) {
    return 'Perguruan Tinggi';
  }
  if (
    upper.includes('ARISAN') ||
    upper.includes('TAKLIM') ||
    upper.includes('RUMAH BACA') ||
    upper.includes('YAYASAN') ||
    upper.includes('GEREJA') ||
    upper.includes('PADEPOKAN') ||
    upper.includes('HIMMATUL') ||
    upper.includes('ADVENTURER') ||
    upper.includes('PROJECT OFFICER')
  ) {
    return 'Komunitas';
  }
  return 'SD';
}

function extractSchoolNameFromTx(tx: CashTransaction): string {
  if (tx.linkedEntityName && tx.linkedEntityName.trim()) {
    return tx.linkedEntityName.trim();
  }
  const desc = tx.description || '';
  const dashIdx = desc.lastIndexOf(' - ');
  if (dashIdx !== -1 && dashIdx + 3 < desc.length) {
    return desc.slice(dashIdx + 3).trim();
  }
  return '';
}

function normalizeSchoolKey(rawName: string): string {
  const cleaned = (rawName || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (cleaned === 'ra madiatun naja') return 'ra madinatun naja';
  if (cleaned === 'sekolah murid merdeka') return 'sekolah murid merdeka - pamulang';
  return cleaned;
}

export function isObsoleteReconstructedSchoolId(id?: string): boolean {
  if (!id) return false;
  const s = String(id);
  return (
    s.startsWith('lead_sch_2026_') ||
    s.startsWith('quo_sch_2026_') ||
    s.startsWith('so_sch_2026_') ||
    s.startsWith('inv_sch_2026_')
  );
}

export interface OfficialCsvSchoolRow {
  id: string;
  company: string;
  picName: string;
  phone: string;
  packageName: string;
  studentPax: number;
  totalPax: number;
  eventDate: string; // YYYY-MM-DD
  dealValue: number;
  stage: Lead['stage'];
  probability: number;
  salesRep: string;
  lastNote: string;
}

/**
 * 48 Official School & Group Records from Progress_Sales_DKandang_2026-11-02_2ea68f42.csv
 */
export const OFFICIAL_CSV_SCHOOL_ROWS: OfficialCsvSchoolRow[] = [
  {
    id: 'ld_1787804371718',
    company: 'SDIT INSAN MANDIRI',
    picName: 'USTADZAH ENDANG',
    phone: '+62 818-0890-8513',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 180,
    totalPax: 208,
    eventDate: '2026-10-08',
    dealValue: 29240000,
    stage: 'won',
    probability: 100,
    salesRep: 'Kak Oci',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 28.265.000.'
  },
  {
    id: 'ld_1787978269700',
    company: 'SDN Keramat Beji',
    picName: 'ANAZ',
    phone: '+62 85775548024',
    packageName: 'CAMPING',
    studentPax: 170,
    totalPax: 185,
    eventDate: '2026-10-22',
    dealValue: 32100000,
    stage: 'lead',
    probability: 30,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Staff Sales & CS Rombongan. Estimasi deal value: Rp 32.100.000.'
  },
  {
    id: 'ld_1788584375663',
    company: 'SD ALPHAGEN ACADEMY KIDS',
    picName: 'OFFICIAL',
    phone: '+62 881011473821',
    packageName: 'LITTLE FARMER',
    studentPax: 29,
    totalPax: 76,
    eventDate: '2026-09-29',
    dealValue: 7710000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Staff Sales & CS Rombongan. Estimasi deal value: Rp 7.500.000.'
  },
  {
    id: 'ld_1788874029121',
    company: 'SD Cinta Kasih Tzu Chi',
    picName: 'LISDA',
    phone: '+62 85215621270',
    packageName: 'URBAN FARMING',
    studentPax: 142,
    totalPax: 152,
    eventDate: '2026-09-28',
    dealValue: 23530000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: '[REMINDER AR / TAGIHAN] Mengirimkan pesan reminder pelunasan via WhatsApp kepada LISDA (SD Cinta Kasih Tzu Chi). Sisa Piutang: Rp 23.860.000. Nada: POLITE.'
  },
  {
    id: 'ld_1788966134443',
    company: 'SDK SANG TIMUR',
    picName: 'Ms. Pina',
    phone: '+62 877-7687-6839',
    packageName: 'LITTLE FARMER',
    studentPax: 69,
    totalPax: 76,
    eventDate: '2026-10-21',
    dealValue: 13215000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 11.835.000.'
  },
  {
    id: 'ld_1789187423280',
    company: 'SDIT BINA CENDEKIA',
    picName: 'Mr. Ocke',
    phone: '+62 818-0820-5000',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 65,
    totalPax: 80,
    eventDate: '2026-10-12',
    dealValue: 2435000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 2.075.000.'
  },
  {
    id: 'ld_1789187949475',
    company: 'SMP UTAMA',
    picName: 'BU SOFIA',
    phone: '0858-8401-9686',
    packageName: 'FULL CAMP - Fun Game A',
    studentPax: 35,
    totalPax: 56,
    eventDate: '2026-09-25',
    dealValue: 9775000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 17.015.000.'
  },
  {
    id: 'ld_1789281636867',
    company: 'SD AL AZHAR 15 PAMULANG',
    picName: '-',
    phone: '0',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 99,
    totalPax: 113,
    eventDate: '2026-11-04',
    dealValue: 19895100,
    stage: 'negotiation',
    probability: 30,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 19.895.100.'
  },
  {
    id: 'ld_1789281794549',
    company: 'SDIT AL ISHLAH',
    picName: 'BU ADE',
    phone: '+62 813-8174-5167',
    packageName: 'LITTLE FARMER FLYING FOX',
    studentPax: 252,
    totalPax: 292,
    eventDate: '2026-10-06',
    dealValue: 44685000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 30.000.000.'
  },
  {
    id: 'ld_1789281851752',
    company: 'Sekolah PINUS',
    picName: '-',
    phone: '0',
    packageName: 'FULL CAMP - Fun Game A',
    studentPax: 35,
    totalPax: 35,
    eventDate: '2026-11-11',
    dealValue: 6650000,
    stage: 'negotiation',
    probability: 30,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 6.650.000.'
  },
  {
    id: 'ld_1789352839279',
    company: 'IPEKA PURI',
    picName: 'Ms Frida',
    phone: '+62 81333005424',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 121,
    totalPax: 133,
    eventDate: '2026-10-23',
    dealValue: 30100000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 30.250.000.'
  },
  {
    id: 'ld_1789430834285',
    company: 'SEKOLAH INTAN ELOK INDONESIA',
    picName: 'BU SALMA',
    phone: '+62 858-9310-5451',
    packageName: 'LITTLE FARMER',
    studentPax: 9,
    totalPax: 16,
    eventDate: '2026-10-08',
    dealValue: 2020000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 1.600.000.'
  },
  {
    id: 'ld_1789431008921',
    company: 'SDIT NUR HIKMAH',
    picName: 'BU MEGA',
    phone: '+62 821-2554-3515',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 140,
    totalPax: 150,
    eventDate: '2026-10-20',
    dealValue: 18750000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 17.875.000.'
  },
  {
    id: 'ld_1789431204341',
    company: 'PRIBADI PREMIER SCHOOL',
    picName: 'MS. ARA',
    phone: '+62 896-3671-9972',
    packageName: 'OUTBOUND',
    studentPax: 42,
    totalPax: 54,
    eventDate: '2026-09-23',
    dealValue: 6960000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: '[REMINDER AR / TAGIHAN] Mengirimkan pesan reminder pelunasan via WhatsApp kepada MS. ARA (PRIBADI PREMIER SCHOOL). Sisa Piutang: Rp 5.960.000. Nada: POLITE.'
  },
  {
    id: 'ld_1789744443709',
    company: 'YAYASAN WE CAN',
    picName: 'IBU MILA',
    phone: '+62 81574330809',
    packageName: 'LITTLE FARMER',
    studentPax: 33,
    totalPax: 51,
    eventDate: '2026-09-19',
    dealValue: 6180000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 6.180.000 (Diskon: -Rp 180.000).'
  },
  {
    id: 'ld_1789794214633',
    company: 'GEREJA ST THOMAS RASUL',
    picName: 'MS NONI',
    phone: '+62 812-8933-4775',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 75,
    totalPax: 100,
    eventDate: '2026-10-03',
    dealValue: 13225000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: '[REMINDER AR / TAGIHAN] Mengirimkan pesan reminder pelunasan via WhatsApp kepada MS NONI (GEREJA ST THOMAS RASUL). Sisa Piutang: Rp 13.395.000. Nada: POLITE.'
  },
  {
    id: 'ld_1790268056866',
    company: 'SD AL AZHAR 41',
    picName: 'Ms. ANNISA',
    phone: '+62 82299412938',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 117,
    totalPax: 130,
    eventDate: '2026-10-08',
    dealValue: 16705000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 22.900.000.'
  },
  {
    id: 'ld_1790268422006',
    company: 'SDI AL AZHAR 8',
    picName: 'BU NOVI',
    phone: '+62 81315135537',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 132,
    totalPax: 163,
    eventDate: '2026-10-07',
    dealValue: 21170000,
    stage: 'negotiation',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 21.840.000.'
  },
  {
    id: 'ld_1790268582339',
    company: 'TKIT AL GHIFFARI',
    picName: 'BU IDA',
    phone: '+62 85770049688',
    packageName: 'LITTLE FARMER',
    studentPax: 19,
    totalPax: 27,
    eventDate: '2026-10-14',
    dealValue: 3780000,
    stage: 'won',
    probability: 100,
    salesRep: 'Kak Oci',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 4.140.000.'
  },
  {
    id: 'ld_1790268882049',
    company: 'TK GLOBAL ISLAMIC SCHOOL',
    picName: 'FAJAR SIDIK',
    phone: '+62 895-4178-55550',
    packageName: 'OUTBOUND',
    studentPax: 235,
    totalPax: 278,
    eventDate: '2026-10-21',
    dealValue: 36390000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 36.390.000.'
  },
  {
    id: 'ld_1790481481174',
    company: 'PROJECT OFFICER KURA 2026',
    picName: 'FAYZA',
    phone: '+62 857-1683-1147',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 70,
    totalPax: 159,
    eventDate: '2026-10-18',
    dealValue: 3840000,
    stage: 'won',
    probability: 100,
    salesRep: 'Kak Oci',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 13.200.000.'
  },
  {
    id: 'ld_1790482196871',
    company: 'HIMMATUL UMMAH',
    picName: 'PAK BAYU',
    phone: '+62 815-8071-911',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 70,
    totalPax: 70,
    eventDate: '2026-09-27',
    dealValue: 700000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 1.000.000.'
  },
  {
    id: 'ld_1790494240636',
    company: 'ADVENTURER BENDUNGAN HILIR',
    picName: 'EVI',
    phone: '+62 821-9050-0874',
    packageName: 'LITTLE FARMER',
    studentPax: 17,
    totalPax: 45,
    eventDate: '2026-10-04',
    dealValue: 5100000,
    stage: 'won',
    probability: 100,
    salesRep: 'Kak Oci',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 3.150.000 (Diskon: -Rp 60.000).'
  },
  {
    id: 'ld_1791020067457',
    company: 'RA MADINATUN NAJA',
    picName: 'Bapak Haikal',
    phone: '+62 821-1471-9335',
    packageName: 'LITTLE FARMER',
    studentPax: 53,
    totalPax: 64,
    eventDate: '2026-10-08',
    dealValue: 8310000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 8.310.000.'
  },
  {
    id: 'ld_1791354648188',
    company: 'TK ISLAM AL JAZIRA BEJI QUTHB',
    picName: 'BU SOFI',
    phone: '+62 897-7721-679',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 66,
    totalPax: 75,
    eventDate: '2026-10-15',
    dealValue: 4950000,
    stage: 'negotiation',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 5.250.000.'
  },
  {
    id: 'ld_1791354777562',
    company: 'SDK 2 PENABUR',
    picName: 'ELLYSIA AGUSTIEN',
    phone: '+62 831-1499-3789',
    packageName: 'AMAZING CRAFT - Caping',
    studentPax: 49,
    totalPax: 54,
    eventDate: '2026-10-23',
    dealValue: 8330000,
    stage: 'negotiation',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 8.330.000.'
  },
  {
    id: 'ld_1791354876151',
    company: 'SDK 2 PENABUR - KELAS 3',
    picName: 'ELLYSIA AGUSTIEN',
    phone: '+62 831-1499-3789',
    packageName: 'LITTLE FARMER',
    studentPax: 53,
    totalPax: 58,
    eventDate: '2026-11-06',
    dealValue: 8215000,
    stage: 'negotiation',
    probability: 80,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 8.215.000.'
  },
  {
    id: 'ld_1791354960149',
    company: 'SDK 11 PENABUR',
    picName: 'ELLYSIA AGUSTIEN',
    phone: '+62 831-1499-3789',
    packageName: 'FUNTASTIC SCIENCE',
    studentPax: 137,
    totalPax: 151,
    eventDate: '2026-11-06',
    dealValue: 25345000,
    stage: 'lead',
    probability: 30,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 25.345.000.'
  },
  {
    id: 'ld_1791355150981',
    company: 'SEKOLAH TAHFIZ PLUS ISYAKARIMAN',
    picName: 'PAK WAHYU',
    phone: '+62 812-9198-4243',
    packageName: 'FULL CAMP - Fun Game A',
    studentPax: 47,
    totalPax: 60,
    eventDate: '2026-10-27',
    dealValue: 21040000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 21.040.000.'
  },
  {
    id: 'ld_1791355677489',
    company: 'SDITQ ABU BAKAR ASY SYIDIQ',
    picName: '-',
    phone: '0',
    packageName: 'LITTLE FARMER',
    studentPax: 55,
    totalPax: 63,
    eventDate: '2026-10-20',
    dealValue: 8370000,
    stage: 'negotiation',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 8.370.000.'
  },
  {
    id: 'ld_1791385230077',
    company: 'TK AR RAYHAN',
    picName: 'RIKA BARCELONA',
    phone: '+62 878 8176 0611',
    packageName: 'LITTLE FARMER',
    studentPax: 22,
    totalPax: 28,
    eventDate: '2026-10-28',
    dealValue: 3320000,
    stage: 'negotiation',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 3.320.000.'
  },
  {
    id: 'ld_1791385390692',
    company: 'TK MUTIARA LEBAH',
    picName: 'RARA',
    phone: '+62 878 8176 0611',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 17,
    totalPax: 24,
    eventDate: '2026-10-29',
    dealValue: 2850000,
    stage: 'negotiation',
    probability: 80,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 2.850.000.'
  },
  {
    id: 'ld_1791385544543',
    company: 'RUMAH TAHFIZ AL HILAL',
    picName: 'NURHILALUDIN',
    phone: '+62 812-8599-8327',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 30,
    totalPax: 35,
    eventDate: '2026-11-07',
    dealValue: 4620000,
    stage: 'negotiation',
    probability: 80,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 4.620.000.'
  },
  {
    id: 'ld_1791535080315',
    company: 'SDIT NUR HIKMAH - KELAS 2',
    picName: 'Bu Tri',
    phone: '+62 813-2937-9022',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 143,
    totalPax: 158,
    eventDate: '2026-10-29',
    dealValue: 19750000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 19.750.000.'
  },
  {
    id: 'ld_1791601515334',
    company: 'ARISAN KEL. DJOYOSEMITO',
    picName: 'BAPAK. AGUNG',
    phone: '+62 878-3811-1495',
    packageName: 'NGUMPUL',
    studentPax: 55,
    totalPax: 55,
    eventDate: '2026-10-11',
    dealValue: 4125000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 4.125.000.'
  },
  {
    id: 'ld_1791958228083',
    company: 'PADEPOKAN DEPOK',
    picName: 'PAK MARHANI',
    phone: '0',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 45,
    totalPax: 45,
    eventDate: '2026-10-10',
    dealValue: 675000,
    stage: 'won',
    probability: 100,
    salesRep: 'Kak Oci',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 675.000.'
  },
  {
    id: 'ld_1792031836915',
    company: 'TAKLIM AL FURQON',
    picName: '-',
    phone: '0',
    packageName: "I AM'A FARMER",
    studentPax: 0,
    totalPax: 25,
    eventDate: '2026-10-15',
    dealValue: 2125000,
    stage: 'won',
    probability: 100,
    salesRep: 'Staff Sales & CS Rombongan',
    lastNote: 'Pencatatan prospek baru oleh Staff Sales & CS Rombongan. Estimasi deal value: Rp 13.200.000.'
  },
  {
    id: 'ld_1792486691454',
    company: 'SEKOLAH MURID MERDEKA - PAMULANG',
    picName: 'BUDI',
    phone: '+62 87787097689',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 51,
    totalPax: 99,
    eventDate: '2026-10-26',
    dealValue: 11250000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 8.730.000.'
  },
  {
    id: 'ld_1792638654339',
    company: 'SDS IT NURUL YAQIN',
    picName: 'Ms. MARYAM',
    phone: '+62 87811652571',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 128,
    totalPax: 143,
    eventDate: '2026-10-27',
    dealValue: 19320000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 20.490.000.'
  },
  {
    id: 'ld_1793255234486',
    company: 'SDIT KHAIRUL BARIYAH',
    picName: 'IBU AIRIN',
    phone: '+62 857-7412-3747',
    packageName: 'LITTLE FARMER ARCHERY',
    studentPax: 34,
    totalPax: 44,
    eventDate: '2026-11-05',
    dealValue: 5520000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 5.520.000.'
  },
  {
    id: 'ld_1793255393361',
    company: 'SDK 8 PENABUR',
    picName: 'ellysia',
    phone: '+62 831-1499-3789',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 32,
    totalPax: 35,
    eventDate: '2026-11-02',
    dealValue: 4000000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 4.000.000.'
  },
  {
    id: 'ld_1793255643704',
    company: 'SEKOLAH MURID MERDEKA - SERPONG',
    picName: 'BUDI',
    phone: '+62 87787097689',
    packageName: 'LITTLE FARMER',
    studentPax: 41,
    totalPax: 51,
    eventDate: '2026-11-03',
    dealValue: 10830000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 10.830.000.'
  },
  {
    id: 'ld_1793255735331',
    company: 'SEKOLAH MURID MERDEKA - PANGKALAN JATI',
    picName: 'BUDI',
    phone: '+62 87787097689',
    packageName: 'LITTLE FARMER',
    studentPax: 30,
    totalPax: 42,
    eventDate: '2026-11-06',
    dealValue: 4440000,
    stage: 'won',
    probability: 100,
    salesRep: 'Bu Rahma',
    lastNote: 'Pencatatan prospek baru oleh Super Admin Sistem ERP. Estimasi deal value: Rp 4.440.000.'
  },
  {
    id: 'ld_binus_school',
    company: 'BINUS SCHOOL',
    picName: 'PIC BINUS',
    phone: '+62 81298765433',
    packageName: 'Paket Field Trip Edukasi (57 Siswa)',
    studentPax: 57,
    totalPax: 66,
    eventDate: '2026-09-16',
    dealValue: 10440000,
    stage: 'won',
    probability: 100,
    salesRep: 'Super Admin Sistem ERP',
    lastNote: 'Penerimaan Pembayaran Penuh 100% Paket Field Trip (57 Siswa) Rp 10.440.000 lunas masuk kas 07/09/2026.'
  },
  {
    id: 'ld_islam_sabilina',
    company: 'SD ISLAM SABILINA',
    picName: 'PIC SABILINA',
    phone: '+62 81298765435',
    packageName: 'CUSTOM PAKET (Sesuai Permintaan Sekolah)',
    studentPax: 52,
    totalPax: 59,
    eventDate: '2026-09-17',
    dealValue: 4585000,
    stage: 'won',
    probability: 100,
    salesRep: 'Super Admin Sistem ERP',
    lastNote: 'Paket Field Trip 52 Siswa telah lunas 100% (Cicilan Rp 2.500.000 tgl 26/08/2026 & Pelunasan Rp 2.085.000 tgl 13/09/2026).'
  },
  {
    id: 'ld_pb_soedirman',
    company: 'SDI PB SOEDIRMAN',
    picName: 'KAK NAYA',
    phone: '+62 81298765432',
    packageName: 'LITTLE FARMER',
    studentPax: 177,
    totalPax: 194,
    eventDate: '2026-09-24',
    dealValue: 25975000,
    stage: 'won',
    probability: 100,
    salesRep: 'Super Admin Sistem ERP',
    lastNote: 'Rombongan field trip 178 siswa. DP Rp 6.000.000 (14/08/2026) dan Cicilan Termin Rp 16.810.000 (18/09/2026) telah masuk kas.'
  },
  {
    id: 'ld_rumah_baca_mimicha',
    company: 'RUMAH BACA MIMICHA',
    picName: 'KAK NAYA',
    phone: '+62 81298765436',
    packageName: 'Paket Field Trip Edukasi (18 Siswa)',
    studentPax: 18,
    totalPax: 18,
    eventDate: '2026-08-29',
    dealValue: 2790000,
    stage: 'won',
    probability: 100,
    salesRep: 'Super Admin Sistem ERP',
    lastNote: 'Paket Field Trip 18 Siswa telah lunas 100% (Cicilan Rp 1.000.000 tgl 14/08/2026 & Pelunasan Rp 1.790.000 tgl 27/08/2026).'
  },
  {
    id: 'ld_santo_yakobus',
    company: 'SD SANTO YAKOBUS',
    picName: 'PIC YAKOBUS',
    phone: '+62 81298765434',
    packageName: 'LITTLE FARMER',
    studentPax: 62,
    totalPax: 72,
    eventDate: '2026-09-15',
    dealValue: 11710000,
    stage: 'won',
    probability: 100,
    salesRep: 'Super Admin Sistem ERP',
    lastNote: 'Paket Field Trip 62 Siswa telah lunas 100% (DP Rp 1.000.000, Cicilan Rp 10.570.000, Pelunasan Rp 140.000).'
  }
];

/**
 * Builds the exact 48 official CSV School Leads, 46 Quotations (SPH for Won & Negotiation),
 * 36 Sales Orders (SO for Won), and 36 Sales Invoices (for Won), while linking cash_transactions
 * to the matching CSV Lead IDs and purging obsolete reconstructed records.
 */
export function reconstructSchoolSalesFromTransactions(params: {
  transactions: CashTransaction[];
  existingLeads: Lead[];
  existingQuotations: Quotation[];
  existingSalesOrders: SalesOrder[];
  existingSalesInvoices: SalesInvoice[];
  deletedLeadIds?: Set<string>;
}): {
  leads: Lead[];
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  salesInvoices: SalesInvoice[];
  updatedTransactions: CashTransaction[];
  newlyRestoredLeadsCount: number;
} {
  const {
    transactions,
    existingLeads = [],
    existingQuotations = [],
    existingSalesOrders = [],
    existingSalesInvoices = [],
    deletedLeadIds = new Set<string>()
  } = params;

  const schoolInflows = transactions.filter(
    (t) =>
      t.type === 'inflow' &&
      (t.incomeSource === 'school_visit' ||
        Boolean(t.linkedEntityName) ||
        /Paket Field Trip|Kunjungan Sekolah/i.test(t.description || ''))
  );

  // Group inflows by normalized school name
  const inflowsByNormSchool = new Map<string, CashTransaction[]>();
  for (const tx of schoolInflows) {
    const rawName = extractSchoolNameFromTx(tx);
    if (!rawName) continue;
    const normKey = normalizeSchoolKey(rawName);
    const list = inflowsByNormSchool.get(normKey) || [];
    list.push(tx);
    inflowsByNormSchool.set(normKey, list);
  }

  const officialLeadIds = new Set(OFFICIAL_CSV_SCHOOL_ROWS.map((r) => r.id));

  const finalLeads: Lead[] = [];
  const finalQuotations: Quotation[] = [];
  const finalSalesOrders: SalesOrder[] = [];
  const finalSalesInvoices: SalesInvoice[] = [];
  const txToLeadIdMap = new Map<string, { leadId: string; schoolName: string }>();

  let quoteSeq = 1;
  let soSeq = 1;

  for (let idx = 0; idx < OFFICIAL_CSV_SCHOOL_ROWS.length; idx++) {
    const row = OFFICIAL_CSV_SCHOOL_ROWS[idx];
    const normKey = normalizeSchoolKey(row.company);
    const matchedTxs = (inflowsByNormSchool.get(normKey) || []).sort((a, b) =>
      (a.date || '').localeCompare(b.date || '')
    );

    for (const tx of matchedTxs) {
      txToLeadIdMap.set(tx.id, { leadId: row.id, schoolName: row.company });
    }

    const totalCashPaid = matchedTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const hasSettlementOrFull = matchedTxs.some(
      (t) =>
        t.paymentStage === 'settlement' ||
        t.paymentStage === 'full' ||
        /Pelunasan|Penuh 100%|Lunas/i.test(t.description || '')
    );

    let paymentStatus: 'paid' | 'dp_paid' | 'unpaid' = 'unpaid';
    if (
      row.stage === 'won' &&
      ((row.dealValue > 0 && totalCashPaid >= row.dealValue) || hasSettlementOrFull)
    ) {
      paymentStatus = 'paid';
    } else if (totalCashPaid > 0) {
      paymentStatus = 'dp_paid';
    }

    const dpAmount =
      totalCashPaid > 0
        ? totalCashPaid
        : paymentStatus === 'paid'
        ? row.dealValue
        : 0;

    const companionCount = Math.max(0, row.totalPax - row.studentPax);
    const effectiveDivisorPax = row.studentPax > 0 ? row.studentPax : Math.max(1, row.totalPax);
    const pricePerPax = Math.round(row.dealValue / effectiveDivisorPax);

    const earliestTxDate = matchedTxs[0]?.receivedDate || matchedTxs[0]?.date || '2026-08-20';
    const primaryInvoiceNo =
      matchedTxs.find((t) => t.referenceNo && t.referenceNo.startsWith('INV-'))?.referenceNo ||
      `INV-2026-${String(idx + 1).padStart(3, '0')}`;

    const followUpHistory = [
      {
        id: `fup_${row.id}_main`,
        date: earliestTxDate,
        user: row.salesRep,
        action: 'WhatsApp' as const,
        note: row.lastNote,
        salesPerson: row.salesRep
      },
      ...matchedTxs.map((tx, txIdx) => ({
        id: `fup_${row.id}_tx_${txIdx + 1}`,
        date: tx.receivedDate || tx.date,
        user: tx.approvedBy || row.salesRep,
        action: 'WhatsApp' as const,
        note: `${tx.description} (${tx.referenceNo}) sebesar Rp ${(tx.amount || 0).toLocaleString('id-ID')} via ${tx.sourceAccount}`,
        salesPerson: row.salesRep
      }))
    ];

    const assignedTo =
      row.salesRep.toLowerCase().includes('super admin')
        ? 'usr_001'
        : 'usr_005';

    const leadObj: Lead = {
      id: row.id,
      name: row.picName,
      picRole: 'PIC Rombongan & Kunjungan Edukasi',
      company: row.company,
      institutionType: inferSchoolInstitutionType(row.company),
      email: `info@${row.company.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18) || 'sekolah'}.sch.id`,
      phone: row.phone,
      address: 'Jabodetabek',
      stage: row.stage,
      dealValue: row.dealValue,
      invoiceNumber: row.stage === 'won' ? primaryInvoiceNo : undefined,
      packageChosen: row.packageName,
      packageInterested: row.packageName,
      participantCount: row.studentPax,
      participantsCount: row.totalPax,
      pricePerPax,
      studentSubtotal: row.dealValue,
      companionCount,
      teacherCount: 0,
      freeTeacherQuota: companionCount,
      paidTeacherCount: 0,
      teacherPricePerPax: 0,
      teacherSubtotal: 0,
      eventDate: row.eventDate,
      targetEventDate: row.eventDate,
      surveyDate: earliestTxDate,
      paymentStatus,
      dpAmount,
      assignedTo,
      salesRep: row.salesRep,
      createdAt: `${earliestTxDate}T08:00:00.000Z`,
      probability: row.probability,
      notes: row.lastNote,
      followUpHistory
    };

    finalLeads.push(leadObj);

    // Generate SPH (Quotation) ONLY for Won and Negotiation stages (46 schools)
    if (row.stage === 'won' || row.stage === 'negotiation') {
      const quoteNumber = `SPH-2026-${String(quoteSeq).padStart(3, '0')}`;
      const newQuote: Quotation = {
        id: `quo_${row.id}`,
        quotationNumber: quoteNumber,
        leadId: row.id,
        subject: `Penawaran Paket Wisata Edukasi (${row.packageName}) - ${row.company}`,
        letterNumber: `${String(quoteSeq).padStart(3, '0')}/SPH-DKANDANG/IX/2026`,
        recipientTitle: `Kepala Sekolah & Panitia Kunjungan ${row.company}`,
        customerName: row.picName,
        companyName: row.company,
        customerPhone: row.phone,
        customerEmail: leadObj.email,
        eventDate: row.eventDate,
        participantSummary: `${row.studentPax} Siswa + ${companionCount} Pendamping (Total ${row.totalPax} Pax)`,
        activityPlan: `Paket Wisata Edukasi ${row.packageName}`,
        estimatedPax: row.totalPax,
        date: earliestTxDate,
        validUntil: row.eventDate,
        items: [
          {
            sku: `PKT-${row.packageName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'EDU'}`,
            name: `${row.packageName} - ${row.company}`,
            description: `Kunjungan edukasi ${row.studentPax} Siswa & ${companionCount} Pendamping (Total ${row.totalPax} Peserta)`,
            unit: 'Paket',
            quantity: effectiveDivisorPax,
            unitPrice: pricePerPax,
            total: row.dealValue
          }
        ],
        subtotal: row.dealValue,
        discountAmount: 0,
        tax: 0,
        grandTotal: row.dealValue,
        paymentTerms: 'DP pengikat jadwal kunjungan & pelunasan maksimal H-1 / saat kedatangan rombongan.',
        bankDetails: {
          bankName: 'BCA - IBU',
          accountNumber: '869-144-2209',
          accountHolder: "D'Kandang Amazing Farm - Operasional Ibu"
        },
        status: row.stage === 'won' ? 'converted' : 'sent',
        preparedBy: row.salesRep,
        preparedByTitle: 'Sales & CS Rombongan Sekolah',
        approvedBy: 'Direktur Utama / Pimpinan',
        approvedByTitle: 'Direktur Utama',
        approvedAt: `${earliestTxDate}T10:00:00.000Z`
      };
      finalQuotations.push(newQuote);
      quoteSeq++;

      // Generate Sales Order (SO) and Sales Invoice ONLY for Won stage (36 schools)
      if (row.stage === 'won') {
        const soNumber = `SO-2026-${String(soSeq).padStart(3, '0')}`;
        const newSO: SalesOrder = {
          id: `so_${row.id}`,
          soNumber,
          quotationRef: quoteNumber,
          customerName: row.company,
          date: earliestTxDate,
          items: [
            {
              sku: `PKT-${row.packageName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'EDU'}`,
              name: `${row.packageName} (${row.studentPax} Siswa, Total ${row.totalPax} Pax)`,
              quantity: effectiveDivisorPax,
              unitPrice: pricePerPax,
              total: row.dealValue
            }
          ],
          totalAmount: row.dealValue,
          status: paymentStatus === 'paid' ? 'delivered' : 'processing',
          paymentStatus: paymentStatus === 'paid' ? 'paid' : totalCashPaid > 0 ? 'partial' : 'unpaid',
          deliveryDate: row.eventDate
        };
        finalSalesOrders.push(newSO);

        const newInv: SalesInvoice = {
          id: `inv_${row.id}`,
          invoiceNumber: primaryInvoiceNo,
          soReference: soNumber,
          customerName: row.company,
          issueDate: earliestTxDate,
          dueDate: row.eventDate,
          visitDate: row.eventDate,
          items: [
            {
              sku: `PKT-${row.packageName.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8) || 'EDU'}`,
              name: `${row.packageName} (${row.studentPax} Siswa, Total ${row.totalPax} Pax)`,
              quantity: effectiveDivisorPax,
              unitPrice: pricePerPax,
              total: row.dealValue
            }
          ],
          discount: 0,
          totalAmount: row.dealValue,
          paidAmount: paymentStatus === 'paid' ? row.dealValue : totalCashPaid,
          status: paymentStatus === 'paid' ? 'paid' : 'issued',
          bankAccount: 'BCA - IBU (869-144-2209)',
          notes: row.lastNote
        };
        finalSalesInvoices.push(newInv);
        soSeq++;
      }
    }
  }

  // Preserve any custom user-created leads/quotes/orders/invoices that are NOT obsolete reconstructed ones
  for (const l of existingLeads) {
    if (
      l &&
      l.id &&
      !officialLeadIds.has(l.id) &&
      !isObsoleteReconstructedSchoolId(l.id) &&
      !deletedLeadIds.has(l.id)
    ) {
      finalLeads.push(l);
    }
  }
  const finalQuoteIds = new Set(finalQuotations.map((q) => q.id));
  for (const q of existingQuotations) {
    if (q && q.id && !finalQuoteIds.has(q.id) && !isObsoleteReconstructedSchoolId(q.id)) {
      finalQuotations.push(q);
    }
  }
  const finalSOIds = new Set(finalSalesOrders.map((so) => so.id));
  for (const so of existingSalesOrders) {
    if (so && so.id && !finalSOIds.has(so.id) && !isObsoleteReconstructedSchoolId(so.id)) {
      finalSalesOrders.push(so);
    }
  }
  const finalInvIds = new Set(finalSalesInvoices.map((inv) => inv.id));
  for (const inv of existingSalesInvoices) {
    if (inv && inv.id && !finalInvIds.has(inv.id) && !isObsoleteReconstructedSchoolId(inv.id)) {
      finalSalesInvoices.push(inv);
    }
  }

  // Link cash transactions to their corresponding CSV leadId
  const updatedTransactions = transactions.map((tx) => {
    const link = txToLeadIdMap.get(tx.id);
    if (link) {
      return {
        ...tx,
        linkedEntityId: link.leadId,
        linkedEntityName: link.schoolName
      };
    }
    if (tx.linkedEntityId && isObsoleteReconstructedSchoolId(tx.linkedEntityId)) {
      return {
        ...tx,
        linkedEntityId: undefined
      };
    }
    return tx;
  });

  return {
    leads: finalLeads,
    quotations: finalQuotations,
    salesOrders: finalSalesOrders,
    salesInvoices: finalSalesInvoices,
    updatedTransactions,
    newlyRestoredLeadsCount: OFFICIAL_CSV_SCHOOL_ROWS.length
  };
}
