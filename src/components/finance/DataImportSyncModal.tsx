import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Trash2,
  Eye,
  Link2,
  ShieldCheck,
  School,
  Filter,
  Settings2,
  Sparkles,
  Check,
  Copy,
  Code2,
  Webhook,
  Lock,
  Layers,
  LogOut
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { GoogleSheetSyncConfig, WebhookQueueItem } from '../../types';
import {
  ColumnMappingConfig,
  ParsedSpreadsheetRow,
  autoDetectColumnMapping,
  requestGeminiColumnMapping,
  extractRowsFromSheetMatrix,
  normalizeSpreadsheetRows,
  extractSpreadsheetIdAndGid,
  fetchGoogleSheetRows,
  fetchGoogleSheetTabsWithOAuth,
  downloadTransactionImportTemplate,
  fetchWebhookStagingQueue,
  acknowledgeWebhookStagingQueue,
  generateGoogleAppsScriptCode
} from '../../utils/spreadsheetImportHelper';
import {
  googleSignInForSheets,
  getSheetsAccessToken,
  logoutGoogleSheets
} from '../../firebase';

export interface DataImportSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataImportSyncModal: React.FC<DataImportSyncModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    bankAccounts,
    budgetAllocations: budgets,
    cashTransactions,
    chartOfAccounts,
    accountingPeriods,
    leads,
    salesInvoices,
    salesOrders,
    sheetSyncConfigs,
    bulkImportCashTransactions,
    saveSheetSyncConfig,
    deleteSheetSyncConfig,
    runGoogleSheetSync,
    showNotification
  } = useERP();

  // Primary Modal Tab: 'upload' (Tab 1: Excel/CSV & Staging Preview) | 'gsheets' (Tab 2: Google Sheets Live Sync & Webhook)
  const [activeTab, setActiveTab] = useState<'upload' | 'gsheets'>('upload');
  // Sub-option inside Tab 2: 'pull_url' (Opsi A: Pull via URL/OAuth) | 'push_webhook' (Opsi B: Push via Google Apps Script)
  const [gsSubMode, setGsSubMode] = useState<'pull_url' | 'push_webhook'>('pull_url');

  // --- TAB 1: UPLOAD & STAGING PREVIEW STATE ---
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [workbookRef, setWorkbookRef] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [sourceTag, setSourceTag] = useState<'excel' | 'gsheets' | 'webhook'>('excel');
  const [loadedWebhookIds, setLoadedWebhookIds] = useState<string[]>([]);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rawObjects, setRawObjects] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig>({
    dateCol: '',
    receivedDateCol: '',
    typeCol: '',
    descriptionCol: '',
    amountCol: '',
    qtyCol: '',
    unitCol: '',
    unitPriceCol: '',
    sourceAccountCol: '',
    budgetCol: '',
    schoolOrEntityCol: '',
    paymentStageCol: '',
    incomeSourceCol: '',
    referenceCol: '',
    categoryCol: ''
  });

  const [defaultType, setDefaultType] = useState<'auto' | 'inflow' | 'outflow'>('auto');
  const [defaultSourceAccount, setDefaultSourceAccount] = useState<string>('BCA Manajemen');
  const [defaultBudgetId, setDefaultBudgetId] = useState<string>('');
  const [showColumnMapper, setShowColumnMapper] = useState<boolean>(false);
  const [isAiMapping, setIsAiMapping] = useState<boolean>(false);

  // Per-row interactive overrides in Staging Preview Table
  const [rowSelectionOverrides, setRowSelectionOverrides] = useState<Record<number, boolean>>({});
  const [rowTypeOverrides, setRowTypeOverrides] = useState<Record<number, 'inflow' | 'outflow'>>({});
  const [rowBankOverrides, setRowBankOverrides] = useState<Record<number, string>>({});
  const [rowContraOverrides, setRowContraOverrides] = useState<Record<number, string>>({});
  const [bulkBankTarget, setBulkBankTarget] = useState<string>('');
  const [bulkContraTarget, setBulkContraTarget] = useState<string>('');

  const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'warning' | 'duplicate' | 'error'>('all');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [lastExecutionResult, setLastExecutionResult] = useState<{
    importedCount: number;
    integrityHash?: string;
    totalInflow: number;
    totalOutflow: number;
  } | null>(null);

  // --- TAB 2: GOOGLE SHEETS & WEBHOOK STATE ---
  const [gsName, setGsName] = useState<string>('');
  const [gsUrl, setGsUrl] = useState<string>('');
  const [gsSheetName, setGsSheetName] = useState<string>('');
  const [gsAuthMode, setGsAuthMode] = useState<'public_link' | 'oauth'>('public_link');
  const [gsDefaultType, setGsDefaultType] = useState<'auto' | 'inflow' | 'outflow'>('auto');
  const [gsDefaultSourceAccount, setGsDefaultSourceAccount] = useState<string>('BCA Manajemen');
  const [gsDefaultBudgetId, setGsDefaultBudgetId] = useState<string>('');
  const [gsAutoSync, setGsAutoSync] = useState<boolean>(true);
  const [gsIntervalMinutes, setGsIntervalMinutes] = useState<1 | 5 | 15 | 30 | 60>(5);

  const [oauthToken, setOauthToken] = useState<string | null>(() => getSheetsAccessToken());
  const [availableRemoteTabs, setAvailableRemoteTabs] = useState<{ title: string; sheetId: number }[]>([]);
  const [isFetchingSheet, setIsFetchingSheet] = useState<boolean>(false);
  const [syncingConfigId, setSyncingConfigId] = useState<string | null>(null);

  // Webhook Queue & Apps Script Snippet State
  const [webhookQueue, setWebhookQueue] = useState<WebhookQueueItem[]>([]);
  const [isLoadingWebhookQueue, setIsLoadingWebhookQueue] = useState<boolean>(false);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState<boolean>(false);

  const webhookEndpointUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://erp.dkandangfarm.co.id';
    return `${origin}/api/webhooks/sheets-sync`;
  }, []);

  const appsScriptSnippet = useMemo(
    () => generateGoogleAppsScriptCode(webhookEndpointUrl),
    [webhookEndpointUrl]
  );

  const refreshWebhookQueue = useCallback(async () => {
    setIsLoadingWebhookQueue(true);
    try {
      const items = await fetchWebhookStagingQueue();
      setWebhookQueue(items);
    } finally {
      setIsLoadingWebhookQueue(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshWebhookQueue();
    const timer = setInterval(refreshWebhookQueue, 8000);
    return () => clearInterval(timer);
  }, [isOpen, refreshWebhookQueue]);

  // Collect school candidates from Sales & Receivables for automatic matching
  const schoolCandidates = useMemo(() => {
    const set = new Set<string>();
    leads.forEach(l => {
      if (l.company) set.add(l.company.trim());
    });
    salesInvoices.forEach(inv => {
      if (inv.customerName) set.add(inv.customerName.trim());
    });
    salesOrders.forEach(so => {
      if (so.customerName) set.add(so.customerName.trim());
    });
    cashTransactions.forEach(tx => {
      if (tx.linkedEntityName) set.add(tx.linkedEntityName.trim());
    });
    return Array.from(set).filter(Boolean);
  }, [leads, salesInvoices, salesOrders, cashTransactions]);

  // Contra Account options from COA (excluding 1110 Cash/Bank which is the primary leg)
  const contraAccountOptions = useMemo(() => {
    return chartOfAccounts.filter(acc => acc.code !== '1110');
  }, [chartOfAccounts]);

  // 4-Stage Validated & Normalized Staging Rows
  const parsedRows: ParsedSpreadsheetRow[] = useMemo(() => {
    if (rawObjects.length === 0) return [];
    const baseRows = normalizeSpreadsheetRows({
      rawRows: rawObjects,
      mapping: columnMapping,
      defaultType,
      defaultSourceAccount,
      defaultBudgetId: defaultBudgetId || undefined,
      existingTransactions: cashTransactions,
      bankAccounts,
      budgetAllocations: budgets,
      accountingPeriods,
      chartOfAccounts
    });

    return baseRows.map(row => {
      const overriddenType = rowTypeOverrides[row.rowIndex] || row.type;
      const hasManualBankOverride = Boolean(rowBankOverrides[row.rowIndex]);
      const overriddenBank = rowBankOverrides[row.rowIndex] || row.sourceAccount;
      const overriddenContraCode = rowContraOverrides[row.rowIndex] || row.contraAccountCode;
      const matchedContra = chartOfAccounts.find(a => a.code === overriddenContraCode);
      const overriddenContraName = matchedContra ? matchedContra.name : row.contraAccountName;

      // Error rows are strictly blocked (cannot be selected even if overridden)
      const isSelected = !row.isValid
        ? false
        : rowSelectionOverrides[row.rowIndex] !== undefined
        ? rowSelectionOverrides[row.rowIndex]
        : row.selected;

      let matchedSchool = row.linkedEntityName;
      if (!matchedSchool && overriddenType === 'inflow' && row.description) {
        const descLower = row.description.toLowerCase();
        const foundCandidate = schoolCandidates.find(
          s => s.length >= 4 && descLower.includes(s.toLowerCase())
        );
        if (foundCandidate) {
          matchedSchool = foundCandidate;
        }
      }

      return {
        ...row,
        type: overriddenType,
        sourceAccount: overriddenBank,
        hasWarning: hasManualBankOverride ? false : row.hasWarning,
        contraAccountCode: overriddenContraCode,
        contraAccountName: overriddenContraName,
        linkedEntityName: matchedSchool,
        selected: isSelected
      };
    });
  }, [
    rawObjects,
    columnMapping,
    defaultType,
    defaultSourceAccount,
    defaultBudgetId,
    bankAccounts,
    budgets,
    cashTransactions,
    accountingPeriods,
    chartOfAccounts,
    schoolCandidates,
    rowSelectionOverrides,
    rowTypeOverrides,
    rowBankOverrides,
    rowContraOverrides
  ]);

  const filteredRows = useMemo(() => {
    return parsedRows.filter(r => {
      if (previewFilter === 'valid') return r.isValid && !r.isDuplicate;
      if (previewFilter === 'warning') return r.isValid && r.hasWarning;
      if (previewFilter === 'duplicate') return r.isDuplicate;
      if (previewFilter === 'error') return !r.isValid;
      return true;
    });
  }, [parsedRows, previewFilter]);

  const summaryStats = useMemo(() => {
    const validNonDup = parsedRows.filter(r => r.isValid && !r.isDuplicate);
    const selectedExecutable = parsedRows.filter(r => r.isValid && r.selected);
    const warnings = parsedRows.filter(r => r.isValid && r.hasWarning);
    const duplicates = parsedRows.filter(r => r.isDuplicate);
    const selectedDuplicates = parsedRows.filter(r => r.isDuplicate && r.selected);
    const invalid = parsedRows.filter(r => !r.isValid);
    const lockedCount = parsedRows.filter(r => r.isPeriodLocked).length;

    const totalInflow = selectedExecutable
      .filter(r => r.type === 'inflow')
      .reduce((sum, r) => sum + r.amount, 0);
    const totalOutflow = selectedExecutable
      .filter(r => r.type === 'outflow')
      .reduce((sum, r) => sum + r.amount, 0);
    const matchedSchools = selectedExecutable.filter(r => Boolean(r.linkedEntityName)).length;

    return {
      total: parsedRows.length,
      validNewCount: validNonDup.length,
      selectedCount: selectedExecutable.length,
      warningCount: warnings.length,
      duplicateCount: duplicates.length,
      selectedDuplicateCount: selectedDuplicates.length,
      invalidCount: invalid.length,
      lockedCount,
      totalInflow,
      totalOutflow,
      matchedSchools
    };
  }, [parsedRows]);

  if (!isOpen) return null;

  const loadRowsIntoPreview = (
    rows: Record<string, any>[],
    detectedHeaders: string[],
    labelName: string,
    source: 'excel' | 'gsheets' | 'webhook',
    webhookIds: string[] = []
  ) => {
    const autoMap = autoDetectColumnMapping(detectedHeaders);
    setHeaders(detectedHeaders);
    setRawObjects(rows);
    setColumnMapping(autoMap);
    setRowSelectionOverrides({});
    setRowTypeOverrides({});
    setRowBankOverrides({});
    setRowContraOverrides({});
    setUploadedFileName(labelName);
    setSourceTag(source);
    setLoadedWebhookIds(webhookIds);
    setLastExecutionResult(null);

    // Automatically open column mapper if key columns (description or amount) could not be detected
    if (!autoMap.descriptionCol || !autoMap.amountCol) {
      setShowColumnMapper(true);
    }
  };

  const processFileObject = (file: File) => {
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const wb = XLSX.read(data, { type: 'array' });
        setWorkbookRef(wb);
        setSheetNames(wb.SheetNames);
        const firstSheet = wb.SheetNames[0];
        setSelectedSheetName(firstSheet);

        const ws = wb.Sheets[firstSheet];
        const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
        const extractedRows = extractRowsFromSheetMatrix(matrix);
        const detectedHeaders = extractedRows.length > 0 ? Object.keys(extractedRows[0]) : [];
        loadRowsIntoPreview(extractedRows, detectedHeaders, `${file.name} (${firstSheet})`, 'excel');
        showNotification(`File "${file.name}" berhasil dimuat (${extractedRows.length} baris terdeteksi).`, 'info');
      } catch (err: any) {
        showNotification(`Gagal membaca file Excel/CSV: ${err?.message || 'Format tidak didukung'}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileObject(file);
  };

  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      showNotification('Format file tidak didukung. Gunakan file .xlsx, .xls, atau .csv.', 'error');
      return;
    }
    processFileObject(file);
  };

  const handleSelectWorkbookSheet = (sheetName: string) => {
    if (!workbookRef) return;
    setSelectedSheetName(sheetName);
    const ws = workbookRef.Sheets[sheetName];
    if (!ws) return;
    const matrix = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: '' });
    const extractedRows = extractRowsFromSheetMatrix(matrix);
    const detectedHeaders = extractedRows.length > 0 ? Object.keys(extractedRows[0]) : [];
    loadRowsIntoPreview(
      extractedRows,
      detectedHeaders,
      `${uploadedFileName.split(' (')[0]} (${sheetName})`,
      'excel'
    );
  };

  const handleRunGeminiAutoMapper = async () => {
    if (headers.length === 0) return;
    setIsAiMapping(true);
    try {
      const aiMapped = await requestGeminiColumnMapping(headers, rawObjects);
      setColumnMapping(prev => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(aiMapped).filter(([_, val]) => Boolean(val))
        )
      }));
      setShowColumnMapper(true);
      showNotification('Pemetaan kolom cerdas berbasis Gemini AI berhasil diterapkan!', 'success');
    } catch (err: any) {
      showNotification(`Gemini AI Mapper: ${err?.message || 'Menggunakan fallback Fuzzy Matching lokal.'}`, 'error');
    } finally {
      setIsAiMapping(false);
    }
  };

  const handleApplyBulkBank = () => {
    if (!bulkBankTarget) return;
    const next: Record<number, string> = { ...rowBankOverrides };
    parsedRows.forEach(r => {
      if (r.isValid && r.selected) {
        next[r.rowIndex] = bulkBankTarget;
      }
    });
    setRowBankOverrides(next);
    showNotification(`Rekening "${bulkBankTarget}" diterapkan ke seluruh baris terpilih.`, 'info');
  };

  const handleApplyBulkContraAccount = () => {
    if (!bulkContraTarget) return;
    const next: Record<number, string> = { ...rowContraOverrides };
    parsedRows.forEach(r => {
      if (r.isValid && r.selected) {
        next[r.rowIndex] = bulkContraTarget;
      }
    });
    setRowContraOverrides(next);
    const matched = chartOfAccounts.find(a => a.code === bulkContraTarget);
    showNotification(`Akun lawan COA [${bulkContraTarget} - ${matched?.name || ''}] diterapkan ke baris terpilih.`, 'info');
  };

  const handleLoadWebhookQueueToStaging = () => {
    if (webhookQueue.length === 0) {
      showNotification('Belum ada data baru di antrean Webhook Google Apps Script.', 'info');
      return;
    }

    const rawRows = webhookQueue.map(item => item.rawRow);
    const allKeysSet = new Set<string>();
    rawRows.forEach(r => Object.keys(r || {}).forEach(k => allKeysSet.add(k)));
    const detectedHeaders = Array.from(allKeysSet);
    const firstItem = webhookQueue[0];
    const label = `${firstItem.spreadsheetName || 'Google Sheets Webhook'} (${firstItem.sheetName || 'Live Push'})`;

    loadRowsIntoPreview(
      rawRows,
      detectedHeaders,
      label,
      'webhook',
      webhookQueue.map(w => w.id)
    );
    setActiveTab('upload');
    showNotification(`${webhookQueue.length} baris dari Webhook Google Apps Script dimuat ke Staging Preview Table.`, 'success');
  };

  const handleClearWebhookQueue = async () => {
    await acknowledgeWebhookStagingQueue({ clearAll: true });
    setWebhookQueue([]);
    showNotification('Antrean Webhook Google Sheets telah dibersihkan.', 'info');
  };

  const handleExecuteImport = async () => {
    const rowsToImport = parsedRows.filter(r => r.isValid && r.selected);
    if (rowsToImport.length === 0) {
      showNotification('Tidak ada baris transaksi valid yang dipilih untuk dieksekusi.', 'error');
      return;
    }

    setIsImporting(true);
    try {
      const sourceLabel =
        sourceTag === 'webhook'
          ? `Webhook Google Sheets (${uploadedFileName})`
          : sourceTag === 'gsheets'
          ? `Google Sheets (${uploadedFileName})`
          : `Excel/CSV (${uploadedFileName})`;

      const res = await bulkImportCashTransactions(
        rowsToImport.map(r => ({
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
          notes: r.notes,
          contraAccountCode: r.contraAccountCode,
          contraAccountName: r.contraAccountName,
          allowDuplicateOverride: r.isDuplicate && r.selected
        })),
        sourceLabel
      );

      if (res.success) {
        setLastExecutionResult({
          importedCount: res.importedCount,
          integrityHash: res.integrityHash,
          totalInflow: res.totalInflowAmount,
          totalOutflow: res.totalOutflowAmount
        });

        if (sourceTag === 'webhook' && loadedWebhookIds.length > 0) {
          await acknowledgeWebhookStagingQueue({ ids: loadedWebhookIds });
          setLoadedWebhookIds([]);
          refreshWebhookQueue();
        }
      }
    } catch (err: any) {
      showNotification(`Gagal mengeksekusi batch import: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleGoogleOAuthSignIn = async () => {
    try {
      const { accessToken } = await googleSignInForSheets();
      setOauthToken(accessToken);
      showNotification('Berhasil terhubung dengan akun Google (Google Sheets Readonly).', 'info');
    } catch (err: any) {
      showNotification(`Gagal login Google OAuth: ${err?.message || 'Popup ditutup'}`, 'error');
    }
  };

  const handleFetchRemoteSheetTabs = async () => {
    const { spreadsheetId } = extractSpreadsheetIdAndGid(gsUrl);
    if (!spreadsheetId) {
      showNotification('Masukkan URL atau ID Google Spreadsheet terlebih dahulu.', 'error');
      return;
    }

    let token = oauthToken || getSheetsAccessToken();
    if (!token) {
      try {
        const res = await googleSignInForSheets();
        token = res.accessToken;
        setOauthToken(token);
      } catch {
        showNotification('Login Google diperlukan untuk melihat daftar tab sheet privat.', 'error');
        return;
      }
    }

    setIsFetchingSheet(true);
    try {
      const tabs = await fetchGoogleSheetTabsWithOAuth(spreadsheetId, token);
      setAvailableRemoteTabs(tabs);
      if (!gsSheetName && tabs.length > 0) {
        setGsSheetName(tabs[0].title);
      }
      showNotification(`Ditemukan ${tabs.length} tab pada Google Spreadsheet.`, 'info');
    } catch (err: any) {
      showNotification(`Gagal mengambil daftar tab sheet: ${err?.message}`, 'error');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handlePreviewGoogleSheet = async (configOverride?: GoogleSheetSyncConfig) => {
    const targetUrl = configOverride ? configOverride.spreadsheetUrl : gsUrl;
    const targetSheetName = configOverride ? configOverride.sheetName : gsSheetName;
    const targetAuthMode = configOverride ? configOverride.authMode : gsAuthMode;
    const targetDefType = configOverride ? configOverride.defaultType : gsDefaultType;
    const targetDefBank = configOverride ? configOverride.defaultSourceAccount : gsDefaultSourceAccount;
    const targetDefBudget = configOverride ? configOverride.defaultBudgetId || '' : gsDefaultBudgetId;

    const { spreadsheetId, gid } = extractSpreadsheetIdAndGid(targetUrl);
    if (!spreadsheetId) {
      showNotification('URL atau ID Google Spreadsheet tidak valid.', 'error');
      return;
    }

    setIsFetchingSheet(true);
    try {
      let token = oauthToken || getSheetsAccessToken();
      if (targetAuthMode === 'oauth' && !token) {
        const authRes = await googleSignInForSheets();
        token = authRes.accessToken;
        setOauthToken(token);
      }

      const { headers: remoteHeaders, rows: remoteRows } = await fetchGoogleSheetRows({
        spreadsheetId,
        gid,
        sheetName: targetSheetName,
        authMode: targetAuthMode,
        accessToken: token
      });

      setDefaultType(targetDefType);
      setDefaultSourceAccount(targetDefBank);
      setDefaultBudgetId(targetDefBudget);
      loadRowsIntoPreview(
        remoteRows,
        remoteHeaders,
        configOverride?.name || gsName || `Sheet ${spreadsheetId.slice(0, 8)}`,
        'gsheets'
      );
      setActiveTab('upload');
      showNotification('Data Google Sheets berhasil ditarik ke Staging Preview Table.', 'info');
    } catch (err: any) {
      showNotification(`Gagal menarik data Google Sheets: ${err?.message}`, 'error');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleSaveAndSyncGoogleSheet = async () => {
    const { spreadsheetId, gid } = extractSpreadsheetIdAndGid(gsUrl);
    if (!spreadsheetId) {
      showNotification('Masukkan URL atau ID Google Spreadsheet yang valid.', 'error');
      return;
    }

    setIsFetchingSheet(true);
    try {
      if (gsAuthMode === 'oauth' && !getSheetsAccessToken()) {
        const authRes = await googleSignInForSheets();
        setOauthToken(authRes.accessToken);
      }

      const saved = await saveSheetSyncConfig({
        name: gsName.trim() || `Google Sheet (${gsSheetName || 'Utama'})`,
        spreadsheetUrl: gsUrl.trim(),
        spreadsheetId,
        sheetName: gsSheetName.trim() || '',
        gid,
        authMode: gsAuthMode,
        defaultType: gsDefaultType,
        defaultSourceAccount: gsDefaultSourceAccount,
        defaultBudgetId: gsDefaultBudgetId || undefined,
        autoSyncEnabled: gsAutoSync,
        intervalMinutes: gsIntervalMinutes,
        lastSyncStatus: 'idle'
      });

      await runGoogleSheetSync(saved.id);
      setGsName('');
      setGsUrl('');
    } catch (err: any) {
      showNotification(`Gagal menyimpan/sinkronisasi: ${err?.message}`, 'error');
    } finally {
      setIsFetchingSheet(false);
    }
  };

  const handleManualSyncCard = async (cfg: GoogleSheetSyncConfig) => {
    setSyncingConfigId(cfg.id);
    try {
      if (cfg.authMode === 'oauth' && !getSheetsAccessToken()) {
        const authRes = await googleSignInForSheets();
        setOauthToken(authRes.accessToken);
      }
      await runGoogleSheetSync(cfg.id);
    } finally {
      setSyncingConfigId(null);
    }
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpointUrl);
    setCopiedWebhookUrl(true);
    showNotification('URL Endpoint Webhook berhasil disalin ke clipboard.', 'info');
    setTimeout(() => setCopiedWebhookUrl(false), 2000);
  };

  const handleCopyAppsScript = () => {
    navigator.clipboard.writeText(appsScriptSnippet);
    setCopiedScript(true);
    showNotification('Kode Google Apps Script (Code.gs) berhasil disalin!', 'success');
    setTimeout(() => setCopiedScript(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Hybrid Bulk Data Importer & Google Sheets Live Sync
              </h2>
              <p className="text-xs text-slate-400">
                Zero-Fault 4-Stage Validation · Smart AI Column Mapper · Double-Entry Journal & Bank Balance Sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'upload'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Tab 1: Upload File (Excel/CSV) & Staging Tabel</span>
              {parsedRows.length > 0 && (
                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-md font-mono tabular-nums">
                  {parsedRows.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('gsheets')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'gsheets'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <span>Tab 2: Automasi Google Sheets (Live Sync / Webhook)</span>
              {(sheetSyncConfigs.length > 0 || webhookQueue.length > 0) && (
                <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-md font-mono tabular-nums">
                  {webhookQueue.length > 0 ? `${webhookQueue.length} Antrean` : `${sheetSyncConfigs.length} Aktif`}
                </span>
              )}
            </button>
          </div>

          {/* Standard & Specialized Template Download Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button
              onClick={() => downloadTransactionImportTemplate('standard')}
              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer whitespace-nowrap shrink-0"
              title="Unduh file .xlsx kosong dengan header baku (date, type, amount, sourceAccount, category, description, referenceNo, incomeSource)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Standar (.xlsx)</span>
            </button>
            <button
              onClick={() => downloadTransactionImportTemplate('inflow')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Unduh Template Khusus Pemasukan"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pemasukan</span>
            </button>
            <button
              onClick={() => downloadTransactionImportTemplate('outflow')}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Unduh Template Khusus Pengeluaran"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Pengeluaran</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'upload' ? (
            <>
              {/* Step 1: Drag & Drop Upload Zone + Default Reconciliation Settings */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(true);
                  }}
                  onDragLeave={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingOver(false);
                  }}
                  onDrop={handleDropFile}
                  className={`lg:col-span-5 border-2 border-dashed rounded-xl p-5 flex flex-col justify-center items-center text-center transition-all ${
                    isDraggingOver
                      ? 'bg-emerald-50 border-emerald-500 scale-[0.99]'
                      : 'bg-slate-50 border-slate-300 hover:border-emerald-500'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl mb-2">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    {uploadedFileName
                      ? uploadedFileName
                      : 'Tarik & Lepas (Drag & Drop) File .xlsx, .xls, atau .csv'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Mendukung skema standar ERP maupun tabel multi-kolom pengeluaran harian
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      Pilih File dari Komputer
                    </button>
                    {sheetNames.length > 1 && (
                      <select
                        value={selectedSheetName}
                        onChange={e => handleSelectWorkbookSheet(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                      >
                        {sheetNames.map(name => (
                          <option key={name} value={name}>
                            Sheet: {name}
                          </option>
                        ))}
                      </select>
                    )}
                    {webhookQueue.length > 0 && (
                      <button
                        type="button"
                        onClick={handleLoadWebhookQueueToStaging}
                        className="px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Muat {webhookQueue.length} Baris dari Webhook
                      </button>
                    )}
                  </div>
                </div>

                {/* Default Rules & Smart Column Mapper Trigger */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Settings2 className="w-4 h-4 text-emerald-600" />
                      <span>Konfigurasi Default & Smart Column Mapper</span>
                    </h3>
                    {headers.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleRunGeminiAutoMapper}
                          disabled={isAiMapping}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                        >
                          <Sparkles className={`w-3.5 h-3.5 text-emerald-600 ${isAiMapping ? 'animate-spin' : ''}`} />
                          <span>{isAiMapping ? 'Memetakan via Gemini AI...' : 'Auto-Map dengan Gemini AI'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowColumnMapper(prev => !prev)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                          <span>{showColumnMapper ? 'Tutup Mapper' : 'Pemetaan Kolom'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tipe Arus Kas Default
                      </label>
                      <select
                        value={defaultType}
                        onChange={e => setDefaultType(e.target.value as 'auto' | 'inflow' | 'outflow')}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                      >
                        <option value="auto">Deteksi Otomatis (Masuk / Keluar)</option>
                        <option value="outflow">Semua Pengeluaran (Outflow)</option>
                        <option value="inflow">Semua Pemasukan (Inflow)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rekening Bank Default
                      </label>
                      <select
                        value={defaultSourceAccount}
                        onChange={e => setDefaultSourceAccount(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                      >
                        {bankAccounts.map(acc => (
                          <option key={acc.id} value={acc.bankName}>
                            {acc.bankName} ({acc.accountNumber})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pos Anggaran Default (Outflow)
                      </label>
                      <select
                        value={defaultBudgetId}
                        onChange={e => setDefaultBudgetId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                      >
                        <option value="">Cocokkan Otomatis per Kategori</option>
                        {budgets.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.department} ({b.category})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>4-Stage Zero-Fault Validation:</strong> (1) Format ISO & Kunci Periode · (2) Integritas Rekening Bank · (3) Fingerprint Anti-Duplikat · (4) Double-Entry COA.
                    </span>
                    <span className="text-emerald-700 font-semibold font-mono tabular-nums">
                      1110 Kas & Bank ⇄ Contra COA
                    </span>
                  </div>
                </div>
              </div>

              {/* AI-Assisted & Fuzzy Smart Column Mapper Panel */}
              {showColumnMapper && headers.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Smart Column Mapper (Fuzzy Matching + Gemini AI Fallback)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Sesuaikan pemetaan header file Anda ke skema baku <code className="font-mono">cash_transactions</code> sebelum divalidasi.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setColumnMapping(autoDetectColumnMapping(headers))}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Reset ke Deteksi Fuzzy Otomatis
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {[
                      { key: 'dateCol', label: 'Tanggal (date) *' },
                      { key: 'typeCol', label: 'Tipe (type: Masuk/Keluar)' },
                      { key: 'amountCol', label: 'Nominal Rp (amount) *' },
                      { key: 'sourceAccountCol', label: 'Rekening (sourceAccount)' },
                      { key: 'categoryCol', label: 'Kategori Arus (category)' },
                      { key: 'descriptionCol', label: 'Uraian (description) *' },
                      { key: 'referenceNo', mapKey: 'referenceCol', label: 'No. Referensi (referenceNo)' },
                      { key: 'incomeSourceCol', label: 'Sumber Pendapatan (incomeSource)' },
                      { key: 'schoolOrEntityCol', label: 'Nama Sekolah / Instansi' },
                      { key: 'budgetCol', label: 'Pos Anggaran (budget)' }
                    ].map(field => {
                      const targetKey = field.mapKey || field.key;
                      return (
                        <div key={targetKey}>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            {field.label}
                          </label>
                          <select
                            value={(columnMapping as any)[targetKey] || ''}
                            onChange={e =>
                              setColumnMapping(prev => ({
                                ...prev,
                                [targetKey]: e.target.value
                              }))
                            }
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            <option value="">-- Otomatis / Kosong --</option>
                            {headers.map(h => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Execution Result Banner (if just executed) */}
              {lastExecutionResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-600 text-white rounded-lg">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Batch Import Berhasil Dieksekusi ({lastExecutionResult.importedCount} Transaksi Tersimpan)
                      </h4>
                      <p className="text-[11px] text-emerald-800 font-mono tabular-nums mt-0.5">
                        Inflow: Rp {lastExecutionResult.totalInflow.toLocaleString('id-ID')} · Outflow: Rp {lastExecutionResult.totalOutflow.toLocaleString('id-ID')}
                        {lastExecutionResult.integrityHash && ` · SHA-256: ${lastExecutionResult.integrityHash.slice(0, 20)}...`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLastExecutionResult(null)}
                    className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Tutup Ringkasan
                  </button>
                </div>
              )}

              {/* Pre-Commit Staging Preview Table (4-Stage Validation) */}
              {parsedRows.length > 0 && (
                <div className="space-y-4">
                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <p className="text-[11px] text-slate-500 font-medium">Total Baris Staging</p>
                      <p className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                        {summaryStats.total}
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-[11px] text-emerald-800 font-medium">Siap Eksekusi (Valid)</p>
                      <p className="text-lg font-bold text-emerald-900 font-mono tabular-nums">
                        {summaryStats.selectedCount}
                      </p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-[11px] text-amber-800 font-medium">Duplikat / Warning</p>
                      <p className="text-lg font-bold text-amber-900 font-mono tabular-nums">
                        {summaryStats.duplicateCount} / {summaryStats.warningCount}
                      </p>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                      <p className="text-[11px] text-rose-800 font-medium">Ditolak (Error / Locked)</p>
                      <p className="text-lg font-bold text-rose-900 font-mono tabular-nums">
                        {summaryStats.invalidCount}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <p className="text-[11px] text-slate-500 font-medium">Estimasi Kas Masuk</p>
                      <p className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                        +Rp {summaryStats.totalInflow.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-3">
                      <p className="text-[11px] text-slate-500 font-medium">Estimasi Kas Keluar</p>
                      <p className="text-sm font-bold text-rose-700 font-mono tabular-nums">
                        -Rp {summaryStats.totalOutflow.toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Filter Tabs & Bulk Assignment Toolbar */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Filter className="w-4 h-4 text-slate-400 mr-1" />
                      {[
                        { id: 'all', label: `Semua (${summaryStats.total})` },
                        { id: 'valid', label: `Valid (${summaryStats.validNewCount})` },
                        { id: 'warning', label: `Warning Bank (${summaryStats.warningCount})` },
                        { id: 'duplicate', label: `Duplikat (${summaryStats.duplicateCount})` },
                        { id: 'error', label: `Error / Terkunci (${summaryStats.invalidCount})` }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setPreviewFilter(tab.id as any)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            previewFilter === tab.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Bulk Account & Contra COA Assigners */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1">
                        <select
                          value={bulkBankTarget}
                          onChange={e => setBulkBankTarget(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                        >
                          <option value="">Ubah Bank Massal...</option>
                          {bankAccounts.map(b => (
                            <option key={b.id} value={b.bankName}>
                              {b.bankName}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleApplyBulkBank}
                          disabled={!bulkBankTarget}
                          className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          Terapkan Bank
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <select
                          value={bulkContraTarget}
                          onChange={e => setBulkContraTarget(e.target.value)}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 max-w-[200px]"
                        >
                          <option value="">Ubah Akun Lawan COA Massal...</option>
                          {contraAccountOptions.map(acc => (
                            <option key={acc.code} value={acc.code}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleApplyBulkContraAccount}
                          disabled={!bulkContraTarget}
                          className="px-2.5 py-1 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 disabled:opacity-40 cursor-pointer whitespace-nowrap"
                        >
                          Terapkan COA
                        </button>
                      </div>

                      <div className="flex items-center gap-2 pl-2 border-l border-slate-300 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<number, boolean> = {};
                            parsedRows.forEach(r => {
                              next[r.rowIndex] = r.isValid && !r.isDuplicate;
                            });
                            setRowSelectionOverrides(next);
                          }}
                          className="font-semibold text-emerald-700 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Pilih Valid
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next: Record<number, boolean> = {};
                            parsedRows.forEach(r => {
                              next[r.rowIndex] = false;
                            });
                            setRowSelectionOverrides(next);
                          }}
                          className="font-semibold text-slate-500 hover:underline cursor-pointer whitespace-nowrap"
                        >
                          Reset Pilihan
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Staging Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[390px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold sticky top-0 z-10 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">Pilih</th>
                          <th className="py-2.5 px-3">Status 4-Tahap</th>
                          <th className="py-2.5 px-3">Tanggal ISO</th>
                          <th className="py-2.5 px-3">Tipe</th>
                          <th className="py-2.5 px-3">Uraian & Referensi</th>
                          <th className="py-2.5 px-3">Rekening Bank (Tahap 2)</th>
                          <th className="py-2.5 px-3">Akun Lawan COA (Tahap 4)</th>
                          <th className="py-2.5 px-3 text-right">Nominal (Rp)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredRows.slice(0, 250).map(row => (
                          <tr
                            key={row.rowIndex}
                            className={`hover:bg-slate-50 transition-colors ${
                              !row.isValid
                                ? 'bg-rose-50/50 text-rose-800'
                                : row.isDuplicate
                                ? 'bg-amber-50/40 text-slate-600'
                                : row.hasWarning
                                ? 'bg-amber-50/20'
                                : ''
                            }`}
                          >
                            {/* Checkbox: Error rows disabled; Duplicate rows unchecked by default but manually checkable */}
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!row.isValid}
                                checked={row.selected}
                                onChange={e =>
                                  setRowSelectionOverrides(prev => ({
                                    ...prev,
                                    [row.rowIndex]: e.target.checked
                                  }))
                                }
                                title={
                                  !row.isValid
                                    ? `Diblokir: ${row.invalidReason}`
                                    : row.isDuplicate
                                    ? 'Baris terdeteksi duplikat (dikecualikan otomatis). Centang manual jika ingin tetap mengimpor ulang.'
                                    : 'Pilih baris untuk dieksekusi'
                                }
                                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            {/* 4-Stage Status Indicator */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              {!row.isValid ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-rose-700 text-[11px] font-bold">
                                    {row.isPeriodLocked ? (
                                      <Lock className="w-3.5 h-3.5 text-rose-600" />
                                    ) : (
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    )}
                                    <span>{row.isPeriodLocked ? 'Periode Terkunci' : 'Error'}</span>
                                  </span>
                                  <p className="text-[10px] text-rose-600 max-w-[170px] truncate" title={row.invalidReason}>
                                    {row.invalidReason}
                                  </p>
                                </div>
                              ) : row.isDuplicate ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center gap-1 text-amber-700 text-[11px] font-bold">
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>
                                      Duplikat {row.duplicateSource === 'file' ? '(File)' : '(DB)'}
                                    </span>
                                  </span>
                                  <p className="text-[10px] text-slate-500">
                                    {row.selected ? 'Override: Akan Diimpor' : 'Dikecualikan Otomatis'}
                                  </p>
                                </div>
                              ) : row.hasWarning ? (
                                <div className="space-y-0.5">
                                  <span
                                    className="inline-flex items-center gap-1 text-amber-700 text-[11px] font-bold"
                                    title={row.bankWarning}
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Warning Bank</span>
                                  </span>
                                  <p className="text-[10px] text-amber-700 max-w-[170px] truncate" title={row.bankWarning}>
                                    Cek pilihan rekening
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Valid</span>
                                </span>
                              )}
                            </td>

                            {/* ISO Date */}
                            <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700">
                              {row.date || '-'}
                            </td>

                            {/* Inline Type Selector */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <select
                                value={row.type}
                                disabled={!row.isValid}
                                onChange={e =>
                                  setRowTypeOverrides(prev => ({
                                    ...prev,
                                    [row.rowIndex]: e.target.value as 'inflow' | 'outflow'
                                  }))
                                }
                                className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
                                  row.type === 'inflow'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                }`}
                              >
                                <option value="inflow">MASUK</option>
                                <option value="outflow">KELUAR</option>
                              </select>
                            </td>

                            {/* Description, Reference & School/Budget Metadata */}
                            <td className="py-2 px-3 max-w-xs">
                              <div className="font-semibold text-slate-800 truncate" title={row.description}>
                                {row.description || '-'}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                                <span className="font-mono tabular-nums">{row.referenceNo}</span>
                                <span>·</span>
                                {row.linkedEntityName ? (
                                  <span className="text-emerald-700 font-medium inline-flex items-center gap-1 truncate">
                                    <School className="w-3 h-3 shrink-0" />
                                    {row.linkedEntityName}
                                  </span>
                                ) : row.budgetName ? (
                                  <span>Pos: {row.budgetName}</span>
                                ) : (
                                  <span>{row.category}</span>
                                )}
                              </div>
                            </td>

                            {/* Stage 2: Referential Integrity — Inline Bank Account Selector */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <select
                                value={row.sourceAccount}
                                disabled={!row.isValid}
                                onChange={e =>
                                  setRowBankOverrides(prev => ({
                                    ...prev,
                                    [row.rowIndex]: e.target.value
                                  }))
                                }
                                className={`px-2 py-1 bg-white border rounded-md text-[11px] font-medium ${
                                  row.hasWarning
                                    ? 'border-amber-400 text-amber-900 bg-amber-50'
                                    : 'border-slate-200 text-slate-700'
                                }`}
                              >
                                {bankAccounts.map(b => (
                                  <option key={b.id} value={b.bankName}>
                                    {b.bankName}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Stage 4: Auto-Account Mapping — Inline Double-Entry Contra Account Selector */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <select
                                value={row.contraAccountCode}
                                disabled={!row.isValid}
                                onChange={e =>
                                  setRowContraOverrides(prev => ({
                                    ...prev,
                                    [row.rowIndex]: e.target.value
                                  }))
                                }
                                className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-mono tabular-nums text-slate-700 max-w-[210px] truncate"
                                title={`Pasangan Double-Entry dengan 1110 Kas & Bank: ${row.contraAccountCode} - ${row.contraAccountName}`}
                              >
                                {contraAccountOptions.map(acc => (
                                  <option key={acc.code} value={acc.code}>
                                    {acc.code} - {acc.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Amount */}
                            <td
                              className={`py-2 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                                row.type === 'inflow' ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {row.type === 'inflow' ? '+' : '-'} Rp{' '}
                              {row.amount.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredRows.length > 250 && (
                      <div className="p-2.5 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
                        Menampilkan 250 baris pertama dari {filteredRows.length} baris. Seluruh {summaryStats.selectedCount} baris terpilih tetap akan dieksekusi penuh.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* TAB 2: GOOGLE SHEETS AUTOMATION (OPSI A: PULL VIA URL & OPSI B: PUSH VIA GOOGLE APPS SCRIPT) */
            <div className="space-y-5">
              {/* Sub-mode Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setGsSubMode('pull_url')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      gsSubMode === 'pull_url'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Link2 className="w-4 h-4 text-emerald-600" />
                    <span>Opsi A: Pull via URL Google Sheets (CSV Export / OAuth Polling)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGsSubMode('push_webhook')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      gsSubMode === 'push_webhook'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Webhook className="w-4 h-4 text-emerald-600" />
                    <span>Opsi B: Push via Google Apps Script (Code.gs Real-Time Webhook)</span>
                    {webhookQueue.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-emerald-600 text-white rounded-md font-mono tabular-nums">
                        {webhookQueue.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {gsSubMode === 'pull_url' ? (
                /* OPSI A: PULL VIA GOOGLE SHEETS URL */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: New Connection Form */}
                  <div className="lg:col-span-6 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>Tarik Data via URL Google Sheets (/export?format=csv&gid=...)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mendukung link Google Sheets publik/shared maupun sheet privat dengan Google OAuth 2.0
                      </p>
                    </div>

                    {/* Connection Method Selector */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setGsAuthMode('public_link')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gsAuthMode === 'public_link'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Link Spreadsheet Publik / Shared</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGsAuthMode('oauth')}
                        className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          gsAuthMode === 'oauth'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Google OAuth (Sheet Privat)</span>
                      </button>
                    </div>

                    {gsAuthMode === 'oauth' && (
                      <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800">
                            Otorisasi Google Sheets API (Read-Only)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {oauthToken
                              ? 'Terhubung! Anda dapat mengakses spreadsheet privat & daftar tab.'
                              : 'Login dengan akun Google Anda untuk membaca spreadsheet privat.'}
                          </p>
                        </div>
                        {oauthToken ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                              <Check className="w-3.5 h-3.5" /> Terhubung
                            </span>
                            <button
                              type="button"
                              onClick={async () => {
                                await logoutGoogleSheets();
                                setOauthToken(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Putuskan sesi Google OAuth"
                            >
                              <LogOut className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleGoogleOAuthSignIn}
                            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-2xs transition-all cursor-pointer"
                          >
                            <span>Sign in with Google</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          URL atau ID Google Spreadsheet *
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={gsUrl}
                            onChange={e => setGsUrl(e.target.value)}
                            placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0"
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 font-mono"
                          />
                          {gsAuthMode === 'oauth' && (
                            <button
                              type="button"
                              onClick={handleFetchRemoteSheetTabs}
                              disabled={isFetchingSheet}
                              className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 whitespace-nowrap cursor-pointer"
                            >
                              Ambil Tab
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Koneksi / Label
                          </label>
                          <input
                            type="text"
                            value={gsName}
                            onChange={e => setGsName(e.target.value)}
                            placeholder="Contoh: Arus Kas Operasional 2026"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nama Tab / Sheet (Opsional)
                          </label>
                          {availableRemoteTabs.length > 0 ? (
                            <select
                              value={gsSheetName}
                              onChange={e => setGsSheetName(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                            >
                              {availableRemoteTabs.map(t => (
                                <option key={t.sheetId} value={t.title}>
                                  {t.title}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={gsSheetName}
                              onChange={e => setGsSheetName(e.target.value)}
                              placeholder="Contoh: Sheet1 atau Pengeluaran"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                            />
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tipe Default
                          </label>
                          <select
                            value={gsDefaultType}
                            onChange={e => setGsDefaultType(e.target.value as any)}
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            <option value="auto">Deteksi Otomatis</option>
                            <option value="outflow">Pengeluaran</option>
                            <option value="inflow">Pemasukan</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rekening Bank Default
                          </label>
                          <select
                            value={gsDefaultSourceAccount}
                            onChange={e => setGsDefaultSourceAccount(e.target.value)}
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            {bankAccounts.map(acc => (
                              <option key={acc.id} value={acc.bankName}>
                                {acc.bankName}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Interval Live Polling
                          </label>
                          <select
                            value={gsIntervalMinutes}
                            onChange={e => setGsIntervalMinutes(Number(e.target.value) as 1 | 5 | 15 | 30 | 60)}
                            className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                          >
                            <option value={1}>Setiap 1 Menit</option>
                            <option value={5}>Setiap 5 Menit</option>
                            <option value={15}>Setiap 15 Menit</option>
                            <option value={30}>Setiap 30 Menit</option>
                            <option value={60}>Setiap 1 Jam</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={gsAutoSync}
                            onChange={e => setGsAutoSync(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            Aktifkan Sinkronisasi Berkala Otomatis (Background Live Sync)
                          </span>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isFetchingSheet}
                          onClick={() => handlePreviewGoogleSheet()}
                          className="flex-1 py-2.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-emerald-600" />
                          <span>Tarik ke Staging Preview Table</span>
                        </button>
                        <button
                          type="button"
                          disabled={isFetchingSheet}
                          onClick={handleSaveAndSyncGoogleSheet}
                          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                        >
                          <RefreshCw className={`w-4 h-4 ${isFetchingSheet ? 'animate-spin' : ''}`} />
                          <span>Simpan & Eksekusi Live Sync</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Active Connections */}
                  <div className="lg:col-span-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Koneksi Google Sheets Terdaftar ({sheetSyncConfigs.length})
                      </h3>
                      <span className="text-xs text-slate-500">
                        Idempotency fingerprint mencegah double-input
                      </span>
                    </div>

                    {sheetSyncConfigs.length === 0 ? (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-2">
                        <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-sm font-semibold text-slate-700">
                          Belum ada koneksi Google Sheets terdaftar
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Masukkan tautan Google Sheets di sebelah kiri untuk menarik data CSV secara langsung atau mengaktifkan sinkronisasi berkala.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {sheetSyncConfigs.map(cfg => {
                          const isSyncing = syncingConfigId === cfg.id;
                          return (
                            <div
                              key={cfg.id}
                              className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900">{cfg.name}</h4>
                                    <span className="text-[11px] font-semibold text-emerald-700">
                                      · {cfg.authMode === 'oauth' ? 'OAuth Privat' : 'CSV Publik'}
                                      {cfg.autoSyncEnabled ? ` · Auto ${cfg.intervalMinutes}m` : ''}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5 font-mono truncate max-w-md">
                                    ID: {cfg.spreadsheetId} {cfg.sheetName ? `· Tab: ${cfg.sheetName}` : ''}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewGoogleSheet(cfg)}
                                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Buka di Staging Preview Table"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleManualSyncCard(cfg)}
                                    disabled={isSyncing}
                                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                                    <span>Sync</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => deleteSheetSyncConfig(cfg.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus koneksi"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                                <div className="flex items-center gap-2 font-mono tabular-nums">
                                  <span>
                                    Status:{' '}
                                    <strong
                                      className={
                                        cfg.lastSyncStatus === 'success'
                                          ? 'text-emerald-600'
                                          : cfg.lastSyncStatus === 'error'
                                          ? 'text-rose-600'
                                          : 'text-slate-700'
                                      }
                                    >
                                      {cfg.lastSyncStatus === 'success'
                                        ? 'Berhasil'
                                        : cfg.lastSyncStatus === 'error'
                                        ? 'Gagal'
                                        : 'Siap'}
                                    </strong>
                                  </span>
                                  {cfg.lastSyncedAt && (
                                    <span>
                                      · {new Date(cfg.lastSyncedAt).toLocaleTimeString('id-ID')}
                                    </span>
                                  )}
                                  {cfg.lastSyncCount !== undefined && (
                                    <span>
                                      · +{cfg.lastSyncCount} baru ({cfg.lastSkippedCount || 0} duplikat)
                                    </span>
                                  )}
                                </div>

                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={cfg.autoSyncEnabled}
                                    onChange={e =>
                                      saveSheetSyncConfig({
                                        ...cfg,
                                        autoSyncEnabled: e.target.checked
                                      })
                                    }
                                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                  <span className="font-semibold text-slate-700">Auto-Sync</span>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* OPSI B: PUSH VIA GOOGLE APPS SCRIPT (Code.gs) & WEBHOOK STAGING QUEUE */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Webhook Endpoint & Incoming Staging Queue */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                          <Webhook className="w-4 h-4 text-emerald-600" />
                          <span>Endpoint Backend Express Aktif</span>
                        </h3>
                        <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                          POST /api/webhooks/sheets-sync
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookEndpointUrl}
                          className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
                        />
                        <button
                          type="button"
                          onClick={handleCopyWebhookUrl}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          {copiedWebhookUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedWebhookUrl ? 'Tersalin' : 'Salin URL'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Setiap baris yang dikirim dari Google Sheets melalui <code className="font-mono">Code.gs</code> akan masuk ke antrean staging di bawah ini untuk divalidasi 4-tahap sebelum disimpan ke Firestore.
                      </p>
                    </div>

                    {/* Incoming Webhook Queue Panel */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            Antrean Push Webhook ({webhookQueue.length} Baris)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Data real-time yang diterima dari Google Apps Script
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={refreshWebhookQueue}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Perbarui antrean webhook"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWebhookQueue ? 'animate-spin' : ''}`} />
                          </button>
                          {webhookQueue.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearWebhookQueue}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Bersihkan antrean"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {webhookQueue.length === 0 ? (
                        <div className="py-8 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-1.5">
                          <Layers className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">
                            Antrean Webhook Kosong
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Pasang kode <code className="font-mono">Code.gs</code> di sebelah kanan pada Google Sheets Anda lalu jalankan menu sinkronisasi.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="max-h-[190px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                            {webhookQueue.slice(0, 30).map((item, idx) => (
                              <div key={item.id} className="p-2.5 flex items-center justify-between gap-2">
                                <div className="truncate">
                                  <span className="font-mono text-[11px] text-slate-400 mr-2">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-800">
                                    {JSON.stringify(item.rawRow).slice(0, 75)}...
                                  </span>
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {new Date(item.receivedAt).toLocaleTimeString('id-ID')}
                                </span>
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={handleLoadWebhookQueueToStaging}
                            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Muat {webhookQueue.length} Baris ke Staging Preview Table</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Ready-to-use Google Apps Script (Code.gs) Snippet */}
                  <div className="lg:col-span-7 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
                    <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold font-mono text-white">
                          Code.gs — Google Apps Script Real-Time Webhook Connector
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyAppsScript}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedScript ? 'Kode Tersalin!' : 'Salin Kode Code.gs'}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono leading-relaxed text-emerald-300 overflow-x-auto overflow-y-auto max-h-[380px] select-all">
                      {appsScriptSnippet}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-600">
            {activeTab === 'upload' ? (
              <span>
                Setiap baris valid yang dieksekusi otomatis memposting{' '}
                <strong>Jurnal Umum Double-Entry (Debit = Kredit)</strong>, mengupdate{' '}
                <strong>Saldo Rekening Bank & COA</strong>, serta mencatat <strong>Audit Log SHA-256</strong>.
              </span>
            ) : (
              <span>
                Gunakan <strong>Opsi A (Pull URL)</strong> untuk mengambil CSV publik atau{' '}
                <strong>Opsi B (Code.gs)</strong> untuk mendorong perubahan dari Google Sheets secara real-time.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {activeTab === 'upload' && parsedRows.length > 0 && (
              <button
                type="button"
                disabled={isImporting || summaryStats.selectedCount === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengeksekusi Batch Firestore...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Eksekusi Import ({summaryStats.selectedCount} Baris Valid)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportSyncModal;
