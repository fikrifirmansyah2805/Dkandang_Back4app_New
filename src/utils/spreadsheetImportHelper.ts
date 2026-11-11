import * as XLSX from 'xlsx';
import {
  AccountingPeriodLock,
  BankAccount,
  BudgetAllocation,
  CashTransaction,
  ChartOfAccount,
  IncomeSourceCategory,
  PaymentStageType,
  WebhookQueueItem
} from '../types';
import { findTargetBankAccount } from './bankMatcher';
import { suggestContraAccountForTransaction } from './dataRecoveryHelper';

export interface ParsedSpreadsheetRow {
  rowIndex: number;
  rawRow: Record<string, any>;
  selected: boolean;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateSource?: 'database' | 'file';
  hasWarning: boolean;
  isBankRecognized: boolean;
  bankWarning?: string;
  isPeriodLocked: boolean;
  lockedPeriod?: string;
  invalidReason?: string;
  date: string;
  receivedDate: string;
  type: 'inflow' | 'outflow';
  category: 'operating' | 'investing' | 'financing';
  description: string;
  amount: number;
  sourceAccount: string;
  referenceNo: string;
  incomeSource?: IncomeSourceCategory;
  paymentStage?: PaymentStageType;
  linkedEntityName?: string;
  budgetId?: string;
  budgetName?: string;
  qty?: number;
  unit?: string;
  unitPrice?: number;
  notes?: string;
  contraAccountCode: string;
  contraAccountName: string;
  fingerprint: string;
}

export interface ColumnMappingConfig {
  dateCol: string;
  receivedDateCol: string;
  typeCol: string;
  descriptionCol: string;
  amountCol: string;
  qtyCol: string;
  unitCol: string;
  unitPriceCol: string;
  sourceAccountCol: string;
  budgetCol: string;
  schoolOrEntityCol: string;
  paymentStageCol: string;
  incomeSourceCol: string;
  referenceCol: string;
  categoryCol: string;
}

const INDONESIAN_MONTHS: Record<string, string> = {
  jan: '01', januari: '01', january: '01',
  feb: '02', februari: '02', february: '02',
  mar: '03', maret: '03', march: '03',
  apr: '04', april: '04',
  mei: '05', may: '05',
  jun: '06', juni: '06', june: '06',
  jul: '07', juli: '07', july: '07',
  agu: '08', agustus: '08', aug: '08', august: '08',
  sep: '09', september: '09',
  okt: '10', oktober: '10', oct: '10', october: '10',
  nov: '11', november: '11',
  des: '12', desember: '12', dec: '12', december: '12'
};

export function normalizeDescriptionForKey(desc?: string): string {
  return (desc || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function getTransactionFingerprint(tx: {
  date?: string;
  type?: string;
  description?: string;
  amount?: number;
  referenceNo?: string;
}): string {
  const cleanDate = (tx.date || '').trim().slice(0, 10);
  const cleanType = (tx.type || 'outflow').toLowerCase().trim();
  const cleanDesc = normalizeDescriptionForKey(tx.description);
  const cleanAmt = Math.round(Math.abs(Number(tx.amount) || 0));
  return `${cleanDate}|${cleanType}|${cleanDesc}|${cleanAmt}`;
}

export function parseSpreadsheetDateWithStatus(
  val: any,
  fallbackDate?: string
): { date: string; isExplicitlyValid: boolean } {
  const defaultStr = fallbackDate || new Date().toISOString().split('T')[0];
  if (val === null || val === undefined || val === '') {
    return { date: defaultStr, isExplicitlyValid: true };
  }

  // Excel serial number (e.g., 25000 - 80000)
  if (typeof val === 'number' && val > 25000 && val < 80000) {
    const utcDays = Math.floor(val - 25569);
    const dateObj = new Date(utcDays * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      return { date: dateObj.toISOString().split('T')[0], isExplicitlyValid: true };
    }
  }

  const str = String(val).trim();
  if (!str) return { date: defaultStr, isExplicitlyValid: true };

  // Numeric string representing Excel serial date
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const serial = Number(str);
    if (serial > 25000 && serial < 80000) {
      const utcDays = Math.floor(serial - 25569);
      const dateObj = new Date(utcDays * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        return { date: dateObj.toISOString().split('T')[0], isExplicitlyValid: true };
      }
    }
  }

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const isoSlice = str.slice(0, 10);
    const [y, m, d] = isoSlice.split('-').map(Number);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { date: isoSlice, isExplicitlyValid: true };
    }
    return { date: isoSlice, isExplicitlyValid: false };
  }

  // DD/MM/YYYY or DD-MM-YYYY or YYYY/MM/DD
  const ymdSlash = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdSlash) {
    const y = ymdSlash[1];
    const m = ymdSlash[2].padStart(2, '0');
    const d = ymdSlash[3].padStart(2, '0');
    return { date: `${y}-${m}-${d}`, isExplicitlyValid: true };
  }

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) y = `20${y}`;
    const mNum = parseInt(m, 10);
    const dNum = parseInt(d, 10);
    if (mNum > 12 && dNum <= 12) {
      return { date: `${y}-${d}-${m}`, isExplicitlyValid: true };
    }
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return { date: `${y}-${m}-${d}`, isExplicitlyValid: true };
    }
    return { date: defaultStr, isExplicitlyValid: false };
  }

  // DD Month YYYY (e.g., "12 Januari 2026" or "5 Mar 2026")
  const namedMonthMatch = str.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s*(\d{2,4})?/);
  if (namedMonthMatch) {
    const d = namedMonthMatch[1].padStart(2, '0');
    const monthName = namedMonthMatch[2];
    const m = INDONESIAN_MONTHS[monthName] || INDONESIAN_MONTHS[monthName.slice(0, 3)];
    let y = namedMonthMatch[3] || String(new Date().getFullYear());
    if (y.length === 2) y = `20${y}`;
    if (m) {
      return { date: `${y}-${m}-${d}`, isExplicitlyValid: true };
    }
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().split('T')[0], isExplicitlyValid: true };
  }

  return { date: defaultStr, isExplicitlyValid: false };
}

export function parseSpreadsheetDate(val: any, fallbackDate?: string): string {
  return parseSpreadsheetDateWithStatus(val, fallbackDate).date;
}

export function parseSpreadsheetAmount(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Math.round(Math.abs(val));

  let s = String(val).trim();
  if (!s || s === '-' || s.toLowerCase() === 'nihil') return 0;

  // Remove currency prefixes/letters
  s = s.replace(/rp\.?/gi, '').replace(/idr/gi, '').replace(/\s+/g, '');

  // Handle Indonesian thousand separators vs decimal commas
  if (/^\-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.split(',')[0].replace(/\./g, '');
  } else if (/^\-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.split('.')[0].replace(/,/g, '');
  } else {
    s = s.replace(/[^0-9.\-]/g, '');
  }

  const num = Number(s);
  return isNaN(num) ? 0 : Math.round(Math.abs(num));
}

/**
 * Character bigram Dice similarity for fuzzy column header matching (0.0 to 1.0)
 */
function computeBigramSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const s2 = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

  const bigrams1 = new Map<string, number>();
  for (let i = 0; i < s1.length - 1; i++) {
    const bg = s1.substring(i, i + 2);
    bigrams1.set(bg, (bigrams1.get(bg) || 0) + 1);
  }

  let intersection = 0;
  for (let i = 0; i < s2.length - 1; i++) {
    const bg = s2.substring(i, i + 2);
    const count = bigrams1.get(bg) || 0;
    if (count > 0) {
      bigrams1.set(bg, count - 1);
      intersection++;
    }
  }

  return (2.0 * intersection) / (s1.length - 1 + (s2.length - 1));
}

export function autoDetectColumnMapping(headers: string[]): ColumnMappingConfig {
  const findCol = (patterns: RegExp[], fuzzyCandidates: string[] = []): string => {
    for (const p of patterns) {
      const found = headers.find((h) => p.test(h.toLowerCase().trim()));
      if (found) return found;
    }

    if (fuzzyCandidates.length > 0) {
      let bestHeader = '';
      let bestScore = 0;
      for (const h of headers) {
        for (const cand of fuzzyCandidates) {
          const score = computeBigramSimilarity(h, cand);
          if (score > bestScore && score >= 0.65) {
            bestScore = score;
            bestHeader = h;
          }
        }
      }
      if (bestHeader) return bestHeader;
    }

    return '';
  };

  return {
    dateCol: findCol(
      [/^date$/, /^tanggal$/, /^tgl$/, /tanggal\s*transaksi/, /tanggal\s*faktur/, /tgl/],
      ['date', 'tanggal', 'tgl transaksi', 'tanggal nota']
    ),
    receivedDateCol: findCol(
      [/^receiveddate$/, /tanggal\s*diterima/, /tgl\s*diterima/, /tanggal\s*kas/, /received\s*date/],
      ['receiveddate', 'tanggal diterima', 'tgl uang masuk']
    ),
    typeCol: findCol(
      [/^type$/, /^tipe$/, /^jenis$/, /arus\s*kas/, /masuk.*keluar/, /debit.*kredit/, /inflow.*outflow/],
      ['type', 'tipe', 'jenis transaksi', 'masuk keluar', 'inflow outflow']
    ),
    descriptionCol: findCol(
      [/^description$/, /^uraian/, /^deskripsi$/, /^keterangan$/, /^nama\s*barang/, /^item$/, /keperluan/, /uraian/, /deskripsi/, /keterangan/],
      ['description', 'uraian', 'deskripsi', 'keterangan', 'keperluan']
    ),
    amountCol: findCol(
      [/^amount$/, /^nominal/, /^jumlah\s*\(rp\)/, /^total$/, /^nilai$/, /^harga\s*total/, /^jumlah\s*uang/, /nominal/, /total\s*harga/, /total/],
      ['amount', 'nominal', 'nominal rp', 'jumlah rp', 'total harga', 'nilai transaksi']
    ),
    qtyCol: findCol([/^qty$/, /^kuantitas$/, /^volume$/, /^banyaknya$/], ['qty', 'kuantitas', 'jumlah barang']),
    unitCol: findCol([/^unit$/, /^satuan$/], ['unit', 'satuan']),
    unitPriceCol: findCol([/^unitprice$/, /^harga\s*satuan$/, /^harga$/, /^unit\s*price$/], ['unitprice', 'harga satuan']),
    sourceAccountCol: findCol(
      [/^sourceaccount$/, /^rekening/, /^bank/, /^sumber\s*dana/, /^kas\s*&\s*bank/, /rekening/, /account/],
      ['sourceaccount', 'rekening', 'rekening bank', 'sumber dana', 'nama bank']
    ),
    budgetCol: findCol(
      [/^pos\s*anggaran/, /^anggaran/, /^departemen/, /^divisi/, /^budget/],
      ['pos anggaran', 'anggaran', 'budget', 'divisi']
    ),
    schoolOrEntityCol: findCol(
      [/^nama\s*sekolah/, /^sekolah/, /^instansi/, /^klien/, /^pelanggan/, /^pihak\s*terkait/, /^customer/, /sekolah/, /instansi/],
      ['nama sekolah', 'instansi', 'pelanggan', 'klien', 'vendor']
    ),
    paymentStageCol: findCol(
      [/^paymentstage$/, /^tahap/, /^termin/, /^status\s*bayar/, /payment\s*stage/],
      ['tahap pembayaran', 'payment stage', 'status bayar']
    ),
    incomeSourceCol: findCol(
      [/^incomesource$/, /^sumber\s*pendapatan/, /^unit\s*usaha/, /income\s*source/],
      ['sumber pendapatan', 'income source', 'unit usaha']
    ),
    referenceCol: findCol(
      [/^referenceno$/, /^no\s*referensi/, /^referensi/, /^no\s*bukti/, /^no\s*kwitansi/, /^ref/, /reference/],
      ['referenceno', 'no referensi', 'nomor bukti', 'no kwitansi']
    ),
    categoryCol: findCol(
      [/^category$/, /^kategori\s*arus/, /^kategori$/],
      ['category', 'kategori arus kas', 'kategori']
    )
  };
}

/**
 * Calls the server-side Gemini AI Column Mapper (/api/ai/map-columns)
 */
export async function requestGeminiColumnMapping(
  headers: string[],
  sampleRows: Record<string, any>[]
): Promise<ColumnMappingConfig> {
  const response = await fetch('/api/ai/map-columns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      headers,
      sampleRows: sampleRows.slice(0, 3)
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Gagal memetakan kolom via Gemini AI (HTTP ${response.status})`);
  }

  return data.mapping as ColumnMappingConfig;
}

function inferIncomeSource(rawVal: string, desc: string, schoolName: string): IncomeSourceCategory {
  const combined = `${rawVal} ${desc} ${schoolName}`.toLowerCase();
  if (schoolName || /sekolah|tk\b|sd\b|smp\b|sma\b|smk\b|paud|madrasah|mi\b|mts|ma\b|kunjungan|rombongan|edukasi/.test(combined)) {
    return 'school_visit';
  }
  if (/susu|yogurt|dairy|pasteurisasi|keju|ice\s*cream/.test(combined)) {
    return 'dairy_product';
  }
  if (/tiket|loket|gate|wahana|berkuda|feeding|atv|panahan/.test(combined)) {
    return 'ticket_gate';
  }
  if (/resto|saung|f&b|makan|catering|lunch\s*box|minum/.test(combined)) {
    return 'resto_fnb';
  }
  if (/pupuk|bibit|tanaman|sayur|hidroponik|pertanian|domba|kambing|sapi/.test(combined)) {
    return 'agriculture';
  }
  if (/corporate|perusahaan|gathering|instansi|b2b|sewa\s*tempat/.test(combined)) {
    return 'b2b_corporate';
  }
  return 'other';
}

function inferPaymentStage(rawVal: string, desc: string): PaymentStageType {
  const combined = `${rawVal} ${desc}`.toLowerCase();
  if (/\bdp\b|uang\s*muka|down\s*payment/.test(combined)) return 'dp';
  if (/termin|cicil|angsur/.test(combined)) return 'installment';
  if (/pelunasan|lunas\s*akhir|settlement/.test(combined)) return 'settlement';
  return 'full';
}

/**
 * Stage 1 Type Normalization:
 * Maps "Masuk", "Debit", "In", "Pemasukan" -> 'inflow'
 * Maps "Keluar", "Kredit", "Out", "Pengeluaran" -> 'outflow'
 */
function inferTransactionType(
  rawTypeVal: string,
  defaultType: 'auto' | 'inflow' | 'outflow',
  rawRow: Record<string, any>
): 'inflow' | 'outflow' {
  if (defaultType === 'inflow') return 'inflow';
  if (defaultType === 'outflow') return 'outflow';

  const v = (rawTypeVal || '').toLowerCase().trim();
  if (/^(inflow|masuk|pemasukan|pendapatan|in|debit|db|terima)$/i.test(v) || /inflow|masuk|pemasukan|pendapatan|\bin\b|debit/.test(v)) {
    return 'inflow';
  }
  if (/^(outflow|keluar|pengeluaran|beban|biaya|belanja|out|kredit|cr|bayar)$/i.test(v) || /outflow|keluar|pengeluaran|beban|biaya|belanja|\bout\b|kredit/.test(v)) {
    return 'outflow';
  }

  const rowText = Object.values(rawRow).join(' ').toLowerCase();
  if (/pemasukan|uang\s*masuk|pelunasan\s*faktur|dp\s*kunjungan|tiket\s*masuk/.test(rowText)) {
    return 'inflow';
  }
  return 'outflow';
}

/**
 * Stage 4 Auto-Account Mapping (Double-Entry COA Contra Account)
 * Unified with canonical suggestContraAccountForTransaction engine.
 */
export function inferContraAccountForRow(params: {
  type: 'inflow' | 'outflow';
  incomeSource?: IncomeSourceCategory;
  category: 'operating' | 'investing' | 'financing';
  description: string;
  chartOfAccounts?: ChartOfAccount[];
  chosenContraCode?: string;
}): { code: string; name: string } {
  const res = suggestContraAccountForTransaction(params);
  return { code: res.code, name: res.name };
}

/**
 * Supports parsing both standard tables and D'Kandang's multi-column side-by-side sheet layout
 */
export function extractRowsFromSheetMatrix(matrix: any[][]): Record<string, any>[] {
  if (!matrix || matrix.length === 0) return [];

  let uraianColIndices: number[] = [];
  let headerRowIdx = -1;

  for (let r = 0; r < Math.min(15, matrix.length); r++) {
    const row = matrix[r] || [];
    const indices: number[] = [];
    row.forEach((cell, cIdx) => {
      const text = String(cell || '').toLowerCase().trim();
      if (text === 'uraian' || text === 'deskripsi' || text === 'nama barang' || text === 'keterangan') {
        indices.push(cIdx);
      }
    });
    if (indices.length >= 2) {
      uraianColIndices = indices;
      headerRowIdx = r;
      break;
    }
  }

  if (uraianColIndices.length >= 2 && headerRowIdx >= 0) {
    const extracted: Record<string, any>[] = [];
    const headerRow = matrix[headerRowIdx] || [];
    const categoryRow = headerRowIdx > 0 ? (matrix[headerRowIdx - 1] || []) : [];

    for (const startCol of uraianColIndices) {
      const blockCategory = String(categoryRow[startCol] || headerRow[startCol] || 'Operasional').trim();
      for (let r = headerRowIdx + 1; r < matrix.length; r++) {
        const row = matrix[r] || [];
        const uraian = String(row[startCol] || '').trim();
        if (!uraian) continue;
        if (/^(total|jumlah|sub\s*total|grand\s*total|rekap)/i.test(uraian)) continue;

        const qty = parseSpreadsheetAmount(row[startCol + 1]);
        const satuan = String(row[startCol + 2] || '').trim();
        const hargaSatuan = parseSpreadsheetAmount(row[startCol + 3]);
        const total = parseSpreadsheetAmount(row[startCol + 4]) || (qty > 0 && hargaSatuan > 0 ? qty * hargaSatuan : hargaSatuan);

        if (total > 0) {
          extracted.push({
            date: new Date().toISOString().split('T')[0],
            type: 'outflow',
            budget: blockCategory,
            description: uraian,
            qty: qty || 1,
            unit: satuan || 'Unit',
            unitPrice: hargaSatuan || total,
            amount: total,
            sourceAccount: 'BCA Manajemen'
          });
        }
      }
    }
    if (extracted.length > 0) return extracted;
  }

  let bestHeaderRow = 0;
  let maxNonEmpty = 0;
  for (let r = 0; r < Math.min(10, matrix.length); r++) {
    const row = matrix[r] || [];
    const nonEmptyCount = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
    const rowJoined = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      nonEmptyCount >= 2 &&
      (/tanggal|tgl|date|uraian|deskripsi|keterangan|nominal|jumlah|total|masuk|keluar|rekening|sekolah|amount|sourceaccount/.test(rowJoined))
    ) {
      bestHeaderRow = r;
      break;
    }
    if (nonEmptyCount > maxNonEmpty) {
      maxNonEmpty = nonEmptyCount;
      bestHeaderRow = r;
    }
  }

  const rawHeaders = (matrix[bestHeaderRow] || []).map((h, idx) => {
    const clean = String(h ?? '').trim();
    return clean || `Kolom_${idx + 1}`;
  });

  const rows: Record<string, any>[] = [];
  for (let r = bestHeaderRow + 1; r < matrix.length; r++) {
    const rowArr = matrix[r] || [];
    const isAllEmpty = rowArr.every((c) => c === null || c === undefined || String(c).trim() === '');
    if (isAllEmpty) continue;

    const obj: Record<string, any> = {};
    rawHeaders.forEach((h, idx) => {
      obj[h] = rowArr[idx] ?? '';
    });
    rows.push(obj);
  }

  return rows;
}

export function normalizeSpreadsheetRows(params: {
  rawRows: Record<string, any>[];
  mapping: ColumnMappingConfig;
  defaultType: 'auto' | 'inflow' | 'outflow';
  defaultSourceAccount: string;
  defaultBudgetId?: string;
  existingTransactions: CashTransaction[];
  bankAccounts: BankAccount[];
  budgetAllocations: BudgetAllocation[];
  accountingPeriods?: AccountingPeriodLock[];
  chartOfAccounts?: ChartOfAccount[];
}): ParsedSpreadsheetRow[] {
  const {
    rawRows,
    mapping,
    defaultType,
    defaultSourceAccount,
    defaultBudgetId,
    existingTransactions,
    bankAccounts,
    budgetAllocations,
    accountingPeriods = [],
    chartOfAccounts = []
  } = params;

  const existingFingerprints = new Set<string>(
    existingTransactions.map((tx) => getTransactionFingerprint(tx))
  );
  const existingRefNumbers = new Set<string>(
    existingTransactions
      .map((tx) => (tx.referenceNo || '').trim().toUpperCase())
      .filter((r) => r.length > 0 && !r.startsWith('IMP-'))
  );

  const batchSeenFingerprints = new Set<string>();
  const batchSeenRefNumbers = new Set<string>();
  const todayStr = new Date().toISOString().split('T')[0];

  const lockedPeriodsMap = new Map<string, AccountingPeriodLock>();
  accountingPeriods.forEach((p) => {
    if (p.status === 'locked' && p.period) {
      lockedPeriodsMap.set(p.period, p);
    }
  });

  return rawRows.map((rawRow, idx) => {
    const rawDesc = String(mapping.descriptionCol ? rawRow[mapping.descriptionCol] ?? '' : '').trim();
    const rawQty = mapping.qtyCol ? parseSpreadsheetAmount(rawRow[mapping.qtyCol]) : 0;
    const rawUnit = mapping.unitCol ? String(rawRow[mapping.unitCol] ?? '').trim() : '';
    const rawUnitPrice = mapping.unitPriceCol ? parseSpreadsheetAmount(rawRow[mapping.unitPriceCol]) : 0;
    let amount = mapping.amountCol ? parseSpreadsheetAmount(rawRow[mapping.amountCol]) : 0;
    if (amount <= 0 && rawQty > 0 && rawUnitPrice > 0) {
      amount = rawQty * rawUnitPrice;
    }

    const rawTypeStr = mapping.typeCol ? String(rawRow[mapping.typeCol] ?? '') : '';
    const type = inferTransactionType(rawTypeStr, defaultType, rawRow);

    // Stage 1: Date & Period Lock Validation
    const rawDateVal = mapping.dateCol ? rawRow[mapping.dateCol] : '';
    const { date, isExplicitlyValid: isDateValid } = parseSpreadsheetDateWithStatus(rawDateVal, todayStr);
    const receivedDate = mapping.receivedDateCol && rawRow[mapping.receivedDateCol]
      ? parseSpreadsheetDate(rawRow[mapping.receivedDateCol], date)
      : date;

    const periodSlice = date.slice(0, 7);
    const lockedPeriodObj = lockedPeriodsMap.get(periodSlice);
    const isPeriodLocked = Boolean(lockedPeriodObj);

    // Stage 2: Referential Integrity (Bank Account)
    const rawBank = mapping.sourceAccountCol ? String(rawRow[mapping.sourceAccountCol] ?? '').trim() : '';
    const bankInput = rawBank || defaultSourceAccount || (type === 'outflow' ? 'BCA Manajemen' : 'BCA - IBU');
    const matchedBank = findTargetBankAccount(bankAccounts, bankInput);
    const isBankRecognized = rawBank ? Boolean(findTargetBankAccount(bankAccounts, rawBank)) : true;
    const fallbackBank = defaultSourceAccount || (type === 'outflow' ? 'BCA Manajemen' : 'BCA - IBU');
    const resolvedBankName = matchedBank
      ? matchedBank.bankName
      : (findTargetBankAccount(bankAccounts, fallbackBank)?.bankName || bankAccounts[0]?.bankName || 'BCA Manajemen');
    const bankWarning = !isBankRecognized
      ? `Rekening "${rawBank}" tidak terdaftar di database, disesuaikan ke "${resolvedBankName}".`
      : undefined;

    const rawBudget = mapping.budgetCol ? String(rawRow[mapping.budgetCol] ?? '').trim() : '';
    let matchedBudget = defaultBudgetId
      ? budgetAllocations.find((b) => b.id === defaultBudgetId)
      : undefined;
    if (rawBudget) {
      const foundBudget = budgetAllocations.find(
        (b) =>
          b.department.toLowerCase().includes(rawBudget.toLowerCase()) ||
          rawBudget.toLowerCase().includes(b.department.toLowerCase()) ||
          b.category.toLowerCase().includes(rawBudget.toLowerCase())
      );
      if (foundBudget) matchedBudget = foundBudget;
    }

    const schoolOrEntity = mapping.schoolOrEntityCol
      ? String(rawRow[mapping.schoolOrEntityCol] ?? '').trim()
      : '';
    const rawIncomeSource = mapping.incomeSourceCol
      ? String(rawRow[mapping.incomeSourceCol] ?? '').trim()
      : '';
    const rawPaymentStage = mapping.paymentStageCol
      ? String(rawRow[mapping.paymentStageCol] ?? '').trim()
      : '';

    const incomeSource = type === 'inflow'
      ? inferIncomeSource(rawIncomeSource, rawDesc, schoolOrEntity)
      : undefined;
    const paymentStage = type === 'inflow'
      ? inferPaymentStage(rawPaymentStage, rawDesc)
      : undefined;

    const rawCategory = mapping.categoryCol
      ? String(rawRow[mapping.categoryCol] ?? '').toLowerCase().trim()
      : '';
    const category: 'operating' | 'investing' | 'financing' =
      /invest|aset|konstruksi|bangun/.test(rawCategory)
        ? 'investing'
        : /financ|modal|pinjam|cicilan\s*bank/.test(rawCategory)
        ? 'financing'
        : 'operating';

    const rawRef = mapping.referenceCol ? String(rawRow[mapping.referenceCol] ?? '').trim() : '';
    const referenceNo = rawRef || `IMP-${date.replace(/-/g, '')}-${String(idx + 1).padStart(3, '0')}`;

    const fullDescription = rawDesc && rawQty > 1 && rawUnit
      ? `${rawDesc} (${rawQty} ${rawUnit})`
      : rawDesc;

    const isSummaryRow = /^(total|sub\s*total|grand\s*total|jumlah\s*total|rekapitulasi)$/i.test(rawDesc);
    let isValid = true;
    let invalidReason: string | undefined;

    if (!rawDesc || isSummaryRow) {
      isValid = false;
      invalidReason = isSummaryRow ? 'Baris Total / Rekapitulasi' : 'Deskripsi / Uraian kosong';
    } else if (!isDateValid || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      isValid = false;
      invalidReason = `Format tanggal tidak valid (${String(rawDateVal)})`;
    } else if (isPeriodLocked) {
      isValid = false;
      invalidReason = `Periode Akuntansi ${lockedPeriodObj?.periodName || periodSlice} telah terkunci (Locked)`;
    } else if (amount <= 0) {
      isValid = false;
      invalidReason = 'Nominal Rp 0 atau tidak valid';
    }

    // Stage 3: Idempotency / Duplicate Detection
    const fingerprint = getTransactionFingerprint({
      date,
      type,
      description: fullDescription,
      amount,
      referenceNo: rawRef
    });

    const cleanExplicitRef = rawRef.toUpperCase();
    const isDbDuplicate =
      existingFingerprints.has(fingerprint) ||
      (cleanExplicitRef.length > 0 && existingRefNumbers.has(cleanExplicitRef));
    const isFileDuplicate =
      batchSeenFingerprints.has(fingerprint) ||
      (cleanExplicitRef.length > 0 && batchSeenRefNumbers.has(cleanExplicitRef));

    const isDuplicate = isValid && (isDbDuplicate || isFileDuplicate);
    const duplicateSource: 'database' | 'file' | undefined = isDuplicate
      ? (isDbDuplicate ? 'database' : 'file')
      : undefined;

    if (isValid && !isDuplicate) {
      batchSeenFingerprints.add(fingerprint);
      if (cleanExplicitRef.length > 0) {
        batchSeenRefNumbers.add(cleanExplicitRef);
      }
    }

    // Stage 4: Auto-Account Mapping (Double-Entry COA)
    const defaultContra = inferContraAccountForRow({
      type,
      incomeSource,
      category,
      description: fullDescription,
      chartOfAccounts
    });

    return {
      rowIndex: idx + 1,
      rawRow,
      selected: isValid && !isDuplicate,
      isValid,
      isDuplicate,
      duplicateSource,
      hasWarning: !isBankRecognized,
      isBankRecognized,
      bankWarning,
      isPeriodLocked,
      lockedPeriod: isPeriodLocked ? periodSlice : undefined,
      invalidReason,
      date,
      receivedDate,
      type,
      category,
      description: fullDescription,
      amount,
      sourceAccount: resolvedBankName,
      referenceNo,
      incomeSource,
      paymentStage,
      linkedEntityName: schoolOrEntity || undefined,
      budgetId: type === 'outflow' ? matchedBudget?.id : undefined,
      budgetName: type === 'outflow' ? (matchedBudget?.department || rawBudget || undefined) : undefined,
      qty: rawQty > 0 ? rawQty : undefined,
      unit: rawUnit || undefined,
      unitPrice: rawUnitPrice > 0 ? rawUnitPrice : undefined,
      contraAccountCode: defaultContra.code,
      contraAccountName: defaultContra.name,
      fingerprint
    };
  });
}

export function extractSpreadsheetIdAndGid(urlOrId: string): { spreadsheetId: string; gid: string } {
  const clean = (urlOrId || '').trim();
  if (!clean) return { spreadsheetId: '', gid: '0' };

  const idMatch = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = clean.match(/[#&?]gid=([0-9]+)/);

  if (idMatch) {
    return {
      spreadsheetId: idMatch[1],
      gid: gidMatch ? gidMatch[1] : '0'
    };
  }

  return {
    spreadsheetId: clean,
    gid: gidMatch ? gidMatch[1] : '0'
  };
}

export async function fetchGoogleSheetTabsWithOAuth(
  spreadsheetId: string,
  accessToken: string
): Promise<{ title: string; sheetId: number }[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Gagal membaca metadata Google Sheets (HTTP ${res.status})`);
  }
  const data = await res.json();
  const sheets = Array.isArray(data.sheets) ? data.sheets : [];
  return sheets.map((s: any) => ({
    title: s?.properties?.title || 'Sheet1',
    sheetId: Number(s?.properties?.sheetId ?? 0)
  }));
}

export async function fetchGoogleSheetRows(params: {
  spreadsheetId: string;
  sheetName?: string;
  gid?: string;
  authMode: 'public_link' | 'oauth';
  accessToken?: string | null;
}): Promise<{ headers: string[]; rows: Record<string, any>[] }> {
  const { spreadsheetId, sheetName, gid, authMode, accessToken } = params;

  if (!spreadsheetId) {
    throw new Error('ID atau URL Google Sheets belum diisi.');
  }

  // 1. OAuth Mode (Google Sheets API v4)
  if (authMode === 'oauth') {
    if (!accessToken) {
      throw new Error('Sesi Google OAuth belum aktif. Silakan klik "Sign in with Google" terlebih dahulu.');
    }

    let targetSheet = (sheetName || '').trim();
    if (!targetSheet) {
      const tabs = await fetchGoogleSheetTabsWithOAuth(spreadsheetId, accessToken);
      targetSheet = tabs[0]?.title || 'Sheet1';
    }

    const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(targetSheet)}?valueRenderOption=FORMATTED_VALUE`;
    const res = await fetch(valuesUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Gagal menarik data Google Sheets via OAuth (HTTP ${res.status})`);
    }

    const data = await res.json();
    const matrix: any[][] = Array.isArray(data.values) ? data.values : [];
    const rows = extractRowsFromSheetMatrix(matrix);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  // 2. Public Link Mode — Try server-side proxy first (/api/sheets/fetch-csv) to bypass CORS, fallback to direct fetch
  let csvText = '';
  try {
    const proxyParams = new URLSearchParams({
      spreadsheetId,
      gid: gid || '0',
      ...(sheetName ? { sheetName: sheetName.trim() } : {})
    });
    const proxyRes = await fetch(`/api/sheets/fetch-csv?${proxyParams.toString()}`);
    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      if (proxyData?.csvText) {
        csvText = proxyData.csvText;
      }
    }
  } catch {
    // Fallback to client direct fetch below
  }

  if (!csvText) {
    const sheetParam = sheetName && sheetName.trim()
      ? `&sheet=${encodeURIComponent(sheetName.trim())}`
      : `&gid=${encodeURIComponent(gid || '0')}`;
    const gvizUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?tqx=out:csv${sheetParam}`;

    const res = await fetch(gvizUrl);
    if (res.ok) {
      csvText = await res.text();
    } else {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(gid || '0')}`;
      const fallbackRes = await fetch(exportUrl);
      if (!fallbackRes.ok) {
        throw new Error('Gagal mengakses Google Sheets publik. Pastikan akses berbagi spreadsheet diatur ke "Siapa saja yang memiliki link dapat melihat" atau gunakan mode Google OAuth.');
      }
      csvText = await fallbackRes.text();
    }
  }

  if (csvText.trim().startsWith('<!DOCTYPE html') || csvText.trim().startsWith('<html')) {
    throw new Error('Spreadsheet ini bersifat privat. Ubah akses berbagi di Google Sheets menjadi "Siapa saja yang memiliki link" atau pilih metode Google OAuth.');
  }

  const workbook = XLSX.read(csvText, { type: 'string', raw: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });
  const rows = extractRowsFromSheetMatrix(matrix);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

/**
 * Fetches pending rows pushed from Google Apps Script to /api/webhooks/sheets-sync
 */
export async function fetchWebhookStagingQueue(): Promise<WebhookQueueItem[]> {
  try {
    const res = await fetch('/api/webhooks/sheets-sync/queue');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.queue) ? data.queue : [];
  } catch {
    return [];
  }
}

/**
 * Acknowledges / removes processed rows from the server webhook queue
 */
export async function acknowledgeWebhookStagingQueue(params: {
  ids?: string[];
  clearAll?: boolean;
}): Promise<void> {
  try {
    await fetch('/api/webhooks/sheets-sync/ack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  } catch (err) {
    console.warn('[acknowledgeWebhookStagingQueue] Error:', err);
  }
}

/**
 * Generates the ready-to-use Google Apps Script (Code.gs) snippet for real-time push to /api/webhooks/sheets-sync
 */
export function generateGoogleAppsScriptCode(webhookEndpointUrl: string): string {
  return `/**
 * ============================================================================
 * D'KANDANG AMAZING FARM ERP — GOOGLE SHEETS LIVE WEBHOOK SYNC (Code.gs)
 * ============================================================================
 * Cara Pemasangan di Google Sheets Anda:
 * 1. Buka Google Spreadsheet Anda -> klik menu "Extensions" > "Apps Script".
 * 2. Hapus kode bawaan, lalu tempel (paste) seluruh kode ini ke dalam Code.gs.
 * 3. Klik ikon Simpan (Ctrl+S), lalu muat ulang (refresh) tab Google Sheets Anda.
 * 4. Akan muncul menu baru "D'Kandang ERP Sync" di bagian atas Google Sheets.
 * 5. Pilih "Pasang Trigger Real-Time (onEdit)" untuk sinkronisasi otomatis
 *    setiap kali baris selesai diisi, atau klik "Kirim Semua Baris Sekarang".
 * ============================================================================
 */

const ERP_WEBHOOK_URL = '${webhookEndpointUrl}';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("D'Kandang ERP Sync")
    .addItem('Kirim Semua Baris Sheet Aktif ke ERP', 'pushAllRowsToERP')
    .addItem('Kirim Baris yang Diblok/Dipilih ke ERP', 'pushSelectedRowsToERP')
    .addSeparator()
    .addItem('Pasang Trigger Otomatis Real-Time (onEdit)', 'installRealtimeEditTrigger')
    .addToUi();
}

/**
 * Mengirim seluruh baris data pada sheet aktif ke Endpoint Webhook ERP
 */
function pushAllRowsToERP() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) {
    SpreadsheetApp.getUi().alert('Tidak ada baris data untuk dikirim.');
    return;
  }

  const headers = data[0].map(function(h, idx) {
    return String(h || '').trim() || ('Kolom_' + (idx + 1));
  });

  const rows = [];
  for (var r = 1; r < data.length; r++) {
    var rowValues = data[r];
    var isEmpty = rowValues.every(function(cell) { return String(cell || '').trim() === ''; });
    if (isEmpty) continue;

    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = rowValues[c];
    }
    rows.push(obj);
  }

  const result = sendPayloadToERP({
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetName: sheet.getName(),
    rows: rows
  });

  SpreadsheetApp.getUi().alert(
    result.success
      ? ('Berhasil! ' + result.queuedCount + ' baris telah dikirim ke Staging Tabel ERP D\\'Kandang.')
      : ('Gagal mengirim: ' + (result.error || 'Unknown error'))
  );
}

/**
 * Mengirim hanya baris yang sedang dipilih (diblok) oleh pengguna
 */
function pushSelectedRowsToERP() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();
  const range = sheet.getActiveRange();
  if (!range || range.getRow() < 2) {
    SpreadsheetApp.getUi().alert('Pilih minimal 1 baris data (di bawah baris header).');
    return;
  }

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h, i) {
    return String(h || '').trim() || ('Kolom_' + (i + 1));
  });

  const startRow = range.getRow();
  const numRows = range.getNumRows();
  const selectedMatrix = sheet.getRange(startRow, 1, numRows, lastCol).getDisplayValues();

  const rows = [];
  for (var r = 0; r < selectedMatrix.length; r++) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = selectedMatrix[r][c];
    }
    rows.push(obj);
  }

  const result = sendPayloadToERP({
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheetName: sheet.getName(),
    rows: rows
  });

  SpreadsheetApp.getUi().alert(
    result.success
      ? ('Berhasil! ' + result.queuedCount + ' baris terpilih dikirim ke ERP.')
      : ('Gagal mengirim: ' + (result.error || 'Unknown error'))
  );
}

/**
 * Trigger otomatis saat baris diedit (dipasang melalui installRealtimeEditTrigger)
 */
function onSheetRowEdited(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const editedRow = e.range.getRow();
  if (editedRow < 2) return; // Abaikan baris header

  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0].map(function(h, i) {
    return String(h || '').trim() || ('Kolom_' + (i + 1));
  });
  const rowCells = sheet.getRange(editedRow, 1, 1, lastCol).getDisplayValues()[0];

  var rowObj = {};
  var nonEmptyCount = 0;
  for (var c = 0; c < headers.length; c++) {
    var val = String(rowCells[c] || '').trim();
    if (val !== '') nonEmptyCount++;
    rowObj[headers[c]] = val;
  }

  // Kirim otomatis jika minimal 3 kolom terisi (misal Tanggal, Uraian, Nominal)
  if (nonEmptyCount >= 3) {
    const ss = sheet.getParent();
    sendPayloadToERP({
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      sheetName: sheet.getName(),
      row: rowObj
    });
  }
}

function installRealtimeEditTrigger() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onSheetRowEdited') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  ScriptApp.newTrigger('onSheetRowEdited')
    .forSpreadsheet(ss)
    .onEdit()
    .create();
  SpreadsheetApp.getUi().alert('Trigger Real-Time (onEdit) berhasil diaktifkan!');
}

function sendPayloadToERP(payload) {
  try {
    const response = UrlFetchApp.fetch(ERP_WEBHOOK_URL, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    return JSON.parse(response.getContentText());
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
`;
}

export function downloadTransactionImportTemplate(
  templateType: 'standard' | 'inflow' | 'outflow' | 'combined' = 'standard'
): void {
  const today = new Date().toISOString().split('T')[0];

  // Standard canonical schema matching (`date`, `type`, `amount`, `sourceAccount`, `category`, `description`, `referenceNo`, `incomeSource`)
  const standardSample = [
    {
      date: today,
      type: 'inflow',
      amount: 6000000,
      sourceAccount: 'BCA - IBU',
      category: 'operating',
      description: 'DP Kunjungan Wisata Edukasi SDIT Al-Hikmah (120 Siswa)',
      referenceNo: 'INV-2026-001',
      incomeSource: 'school_visit'
    },
    {
      date: today,
      type: 'inflow',
      amount: 4500000,
      sourceAccount: 'BSI - IBU',
      category: 'operating',
      description: 'Penjualan Tiket Gate & Wahana Berkuda Akhir Pekan',
      referenceNo: 'POS-GATE-002',
      incomeSource: 'ticket_gate'
    },
    {
      date: today,
      type: 'outflow',
      amount: 1850000,
      sourceAccount: 'BCA Manajemen',
      category: 'operating',
      description: 'Pembelian Pakan Konsentrat & Rumput Ododot Sapi Perah (10 Karung)',
      referenceNo: 'EXP-2026-001',
      incomeSource: ''
    },
    {
      date: today,
      type: 'outflow',
      amount: 1002500,
      sourceAccount: 'BCA Manajemen',
      category: 'operating',
      description: 'Biaya Listrik & Token Operasional Area Farm',
      referenceNo: 'EXP-2026-002',
      incomeSource: ''
    }
  ];

  const inflowSample = [
    {
      'Tanggal': today,
      'Tanggal Diterima': today,
      'Tipe': 'Pemasukan',
      'Uraian / Deskripsi': 'DP Kunjungan Wisata Edukasi SDIT Al-Hikmah (120 Siswa)',
      'Nominal': 6000000,
      'Rekening Bank': 'BCA - IBU',
      'Sumber Pendapatan': 'Kunjungan Sekolah',
      'Nama Sekolah / Instansi': 'SDIT Al-Hikmah Depok',
      'Tahap Pembayaran': 'DP',
      'Kategori Arus Kas': 'Operating',
      'No Referensi': 'INV-2026-001'
    },
    {
      'Tanggal': today,
      'Tanggal Diterima': today,
      'Tipe': 'Pemasukan',
      'Uraian / Deskripsi': 'Penjualan Tiket Gate & Wahana Berkuda Akhir Pekan',
      'Nominal': 4500000,
      'Rekening Bank': 'BSI - IBU',
      'Sumber Pendapatan': 'Tiket Loket Gate Wisata',
      'Nama Sekolah / Instansi': '',
      'Tahap Pembayaran': 'Lunas',
      'Kategori Arus Kas': 'Operating',
      'No Referensi': 'POS-GATE-002'
    }
  ];

  const outflowSample = [
    {
      'Tanggal': today,
      'Tipe': 'Pengeluaran',
      'Uraian / Deskripsi': 'Pembelian Pakan Konsentrat & Rumput Ododot Sapi Perah',
      'Qty': 10,
      'Satuan': 'Karung',
      'Harga Satuan': 185000,
      'Nominal': 1850000,
      'Rekening Bank': 'BCA Manajemen',
      'Pos Anggaran': 'Kebutuhan Operasional',
      'Kategori Arus Kas': 'Operating',
      'No Referensi': 'EXP-2026-001'
    },
    {
      'Tanggal': today,
      'Tipe': 'Pengeluaran',
      'Uraian / Deskripsi': 'Biaya Listrik & Token Operasional Area Farm',
      'Qty': 1,
      'Satuan': 'Paket',
      'Harga Satuan': 1002500,
      'Nominal': 1002500,
      'Rekening Bank': 'BCA Manajemen',
      'Pos Anggaran': 'Kebutuhan Operasional',
      'Kategori Arus Kas': 'Operating',
      'No Referensi': 'EXP-2026-002'
    }
  ];

  const wb = XLSX.utils.book_new();

  if (templateType === 'standard') {
    const ws = XLSX.utils.json_to_sheet(standardSample);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Standar_ERP');
    XLSX.writeFile(wb, 'Template_Standar_Cash_Transactions_DKandang.xlsx');
  } else if (templateType === 'inflow') {
    const ws = XLSX.utils.json_to_sheet(inflowSample);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Pemasukan');
    XLSX.writeFile(wb, 'Template_Import_Pemasukan_DKandang.xlsx');
  } else if (templateType === 'outflow') {
    const ws = XLSX.utils.json_to_sheet(outflowSample);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Pengeluaran');
    XLSX.writeFile(wb, 'Template_Import_Pengeluaran_DKandang.xlsx');
  } else {
    const wsIn = XLSX.utils.json_to_sheet(inflowSample);
    const wsOut = XLSX.utils.json_to_sheet(outflowSample);
    XLSX.utils.book_append_sheet(wb, wsIn, 'Pemasukan');
    XLSX.utils.book_append_sheet(wb, wsOut, 'Pengeluaran');
    XLSX.writeFile(wb, 'Template_Import_Kas_Masuk_Keluar_DKandang.xlsx');
  }
}
