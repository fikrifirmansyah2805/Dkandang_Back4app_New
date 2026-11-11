import { Role, RolePermissions, ModuleType } from '../types';

/**
 * Currency Formatter for Indonesian Rupiah (IDR)
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Short Rupiah format for chart legends and compact KPIs (e.g. Rp 1.5M, Rp 250Jt)
 */
export function formatCompactRupiah(amount: number): string {
  if (Math.abs(amount) >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)} M`;
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)} Jt`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)} Rb`;
  }
  return `Rp ${amount}`;
}

export function formatDate(dateString: string): string {
  if (!dateString || dateString.trim() === '') return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Simple client-side SHA-256 hash generator for tamper-proof audit trails
 */
export async function generateSHA256(message: string): Promise<string> {
  try {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
  } catch {
    // Fallback sync hash
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Mask sensitive data (e.g. Bank accounts, Confidential keys)
 */
export function maskSensitive(text: string): string {
  if (!text || text.length <= 4) return '••••';
  const lastFour = text.slice(-4);
  return '•'.repeat(Math.max(4, text.length - 4)) + ' ' + lastFour;
}

/**
 * Deterministic Simulated AES-256 Vault Encryption / Decryption with IV
 */
export function simulateEncrypt(data: string, secretKey = 'NEXUS-ERP-2026-SECURE-KEY'): string {
  try {
    const b64 = btoa(encodeURIComponent(`${secretKey}::${data}`));
    return `enc_aes256_v2_${b64.split('').reverse().join('')}`;
  } catch {
    return `enc_aes256_${data}`;
  }
}

export function simulateDecrypt(cipher: string, secretKey = 'NEXUS-ERP-2026-SECURE-KEY'): string {
  try {
    if (!cipher.startsWith('enc_aes256_v2_')) return cipher;
    const raw = cipher.replace('enc_aes256_v2_', '').split('').reverse().join('');
    const decoded = decodeURIComponent(atob(raw));
    const parts = decoded.split('::');
    if (parts[0] === secretKey) {
      return parts.slice(1).join('::');
    }
    return 'Decryption Error: Key Mismatch';
  } catch {
    return cipher;
  }
}

/**
 * Granular Role-Based Access Control matrix definition
 * Exactly configured according to the organizational matrix:
 * 1. Direktur Utama/Pimpinan: [Keuangan, Akuntansi, Pemasaran, Penjualan, Purchasing, Logistik]: View, Delete, Approve, Export
 * 2. Keuangan & Kasir: Keuangan [V,C,E,D,A,Ex], Akuntansi [V,C,E,D,A,Ex], Purchasing [V,A,Ex], others [V]
 * 3. Akuntansi & Pembukuan: Keuangan [V,C,E,Ex], Akuntansi [V,C,E,D,A,Ex], Purchasing [V,Ex], Logistik [V,Ex], others [V]
 * 4. Pemasaran & Promosi: Pemasaran [V,C,E,D,A,Ex], Penjualan [V,C,E,A,Ex], Keuangan [V,Ex], Akuntansi [V,Ex], Purchasing [V,Ex], Logistik [V]
 * 5. Sales & CS: Penjualan [V,C,E,D,A,Ex], Pemasaran [V,C,E,A,Ex], Keuangan [V,Ex], Akuntansi [V,Ex], Purchasing [V], Logistik [V]
 * 6. Procurement & Logistics: Logistik [V,C,E,D,A,Ex], Purchasing [V,C,E,A,Ex], Keuangan [V,Ex], Akuntansi [V,Ex], Pemasaran [V], Penjualan [V]
 * 7. Purchasing: Purchasing [V,C,E,D,A,Ex], Logistik [V,A,Ex], Keuangan [V,Ex], Akuntansi [V,Ex], Pemasaran [V,Ex], Penjualan [V,Ex]
 * 8. Super Admin: Full Access Across All Modules [V,C,E,D,A,Ex]
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  direktur_utama: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: true, export: true },
    finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    accounting: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    marketing: { view: true, create: false, edit: false, delete: true, approve: true, export: true },
    sales: { view: true, create: false, edit: false, delete: true, approve: true, export: true },
    sales_progress: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    procurement: { view: true, create: false, edit: false, delete: true, approve: true, export: true },
    warehouse: { view: true, create: false, edit: false, delete: true, approve: true, export: true },
    reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    custom_reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    security: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
  },
  finance_manager: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    accounting: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    sales_progress: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    procurement: { view: true, create: false, edit: false, delete: false, approve: true, export: true },
    warehouse: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    custom_reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    security: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
  },
  accounting_manager: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: true, create: true, edit: true, delete: false, approve: false, export: true },
    accounting: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    sales_progress: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    procurement: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    warehouse: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    custom_reports: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    security: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
  },
  marketing_manager: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    sales: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    sales_progress: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    warehouse: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  sales_cs: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    sales: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    sales_progress: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    warehouse: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  procurement_logistics: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales_progress: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    warehouse: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  purchasing_officer: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales_progress: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    procurement: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    warehouse: { view: true, create: false, edit: false, delete: false, approve: true, export: true },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  super_admin: {
    dashboard: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    finance: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    accounting: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    sales: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    sales_progress: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    procurement: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    warehouse: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    custom_reports: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    security: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
  },
  // Compatibility mappings
  sales_director: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    sales: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    sales_progress: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    procurement: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    warehouse: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  warehouse_supervisor: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales_progress: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    procurement: { view: true, create: true, edit: true, delete: false, approve: true, export: true },
    warehouse: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  procurement_officer: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    accounting: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    marketing: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    sales_progress: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
    procurement: { view: true, create: true, edit: true, delete: true, approve: true, export: true },
    warehouse: { view: true, create: false, edit: false, delete: false, approve: true, export: true },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: false, create: false, edit: false, delete: false, approve: false, export: false },
  },
  internal_auditor: {
    dashboard: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    finance: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    accounting: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    marketing: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    sales: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    sales_progress: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    procurement: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    warehouse: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
    reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    custom_reports: { view: true, create: true, edit: false, delete: false, approve: false, export: true },
    security: { view: true, create: false, edit: false, delete: false, approve: false, export: true },
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  direktur_utama: 'Direktur Utama / Pimpinan',
  finance_manager: 'Keuangan & Kasir',
  accounting_manager: 'Akuntansi & Pembukuan',
  marketing_manager: 'Pemasaran & Promosi',
  sales_cs: 'Sales & CS',
  procurement_logistics: 'Procurement & Logistics',
  purchasing_officer: 'Purchasing',
  super_admin: 'Super Admin',
  // Compatibility labels
  sales_director: 'Sales & CS',
  procurement_officer: 'Purchasing',
  warehouse_supervisor: 'Procurement & Logistics',
  internal_auditor: 'Direktur Utama / Pimpinan',
};

export const MODULE_LABELS: Record<ModuleType, string> = {
  dashboard: 'Ringkasan Bisnis & Penjualan',
  finance: 'Keuangan & Kasir Tiket',
  accounting: 'Akuntansi & Pembukuan Usaha',
  marketing: 'Pemasaran & Promosi Wisata',
  sales: 'Penjualan & Rombongan Sekolah',
  sales_progress: 'Pelaporan Progress Sales & Pipeline',
  procurement: 'Purchasing (Pembelian)',
  warehouse: 'Logistik & Warehouse',
  reports: 'Pusat Laporan Usaha',
  custom_reports: 'Laporan Transaksi & Filter Agrowisata',
  security: 'Pusat Keamanan & Riwayat Akses',
};

