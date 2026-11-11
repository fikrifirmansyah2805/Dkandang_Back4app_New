import React, { useState } from 'react';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { useERP } from '../../context/ERPContext';
import { printHtmlContent } from '../../utils/printHelper';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate 
} from '../../utils/crypto';
import { 
  Warehouse, 
  Plus, 
  AlertTriangle, 
  Boxes, 
  ArrowRightLeft, 
  SlidersHorizontal, 
  CheckCircle2, 
  Search, 
  X,
  Building2,
  Package,
  Layers,
  Truck,
  ShieldCheck,
  ClipboardList,
  FileText,
  Calendar,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Trash2,
  Printer,
  ChevronRight,
  Sparkles,
  ShoppingBag,
  Send
} from 'lucide-react';
import { InventoryItem, PurchaseOrder, SalesOrder } from '../../types';

export default function WarehouseModule() {
  const { 
    inventory, 
    stockMovements, 
    stockTransfers,
    stockOpnames,
    purchaseOrders,
    salesOrders,
    adjustInventoryStock, 
    transferStock, 
    addPurchaseRequisition,
    confirmGoodsReceipt,
    addInventoryItem,
    deleteInventoryItem,
    adjustStockQuantity,
    runStockOpname,
    processSalesOrderDelivery,
    currentUser,
    companyProfile,
    checkPermission,
    showNotification,
    setActiveModule
  } = useERP();

  const [activeTab, setActiveTab] = useState<'grn' | 'catalog' | 'transfers' | 'fulfillment' | 'locations' | 'opname'>('grn');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // Modals
  const [showGRNModal, setShowGRNModal] = useState<PurchaseOrder | null>(null);
  const [showAddSKUModal, setShowAddSKUModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showOpnameModal, setShowOpnameModal] = useState(false);

  // GRN Form State
  const [grnTargetWarehouse, setGrnTargetWarehouse] = useState('Gudang Sentral & Pakan (WH-01)');
  const [grnQCStatus, setGrnQCStatus] = useState<'passed' | 'partial'>('passed');
  const [grnDeliveryNote, setGrnDeliveryNote] = useState('');
  const [grnNotes, setGrnNotes] = useState('');

  // Add SKU Form State
  const [skuCode, setSkuCode] = useState('');
  const [skuName, setSkuName] = useState('');
  const [skuCategory, setSkuCategory] = useState('Pakan & Suplemen Satwa');
  const [skuUnit, setSkuUnit] = useState('Kg');
  const [skuQty, setSkuQty] = useState('50');
  const [skuMin, setSkuMin] = useState('15');
  const [skuCost, setSkuCost] = useState('150000');
  const [skuPrice, setSkuPrice] = useState('200000');
  const [skuLocation, setSkuLocation] = useState('Gudang Sentral & Pakan (WH-01)');

  // Adjust Form State
  const [adjItemId, setAdjItemId] = useState(inventory[0]?.id || '');
  const [adjQty, setAdjQty] = useState('10');
  const [adjType, setAdjType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjNotes, setAdjNotes] = useState('');

  // Transfer Form State
  const [trItemId, setTrItemId] = useState(inventory[0]?.id || '');
  const [trFrom, setTrFrom] = useState('Gudang Sentral & Pakan (WH-01)');
  const [trTo, setTrTo] = useState('Kandang Sapi & Edukasi Satwa (WH-02)');
  const [trQty, setTrQty] = useState('5');
  const [trNotes, setTrNotes] = useState('');

  // Stock Opname Form State
  const [opnameWarehouse, setOpnameWarehouse] = useState('Gudang Sentral & Pakan (WH-01)');
  const [opnameCategory, setOpnameCategory] = useState('Pakan & Suplemen Satwa');
  const [opnamePhysicalQty, setOpnamePhysicalQty] = useState<Record<string, number>>({});

  // KPIs
  const totalValuation = inventory.reduce((acc, it) => acc + (it.stockQty * it.unitCost), 0);
  const totalSKUs = inventory.length;
  const lowStockItems = inventory.filter(it => it.stockQty <= it.minStockLevel);
  const pendingArrivalPOs = purchaseOrders.filter(p => p.status === 'issued');
  const completedGRNPOs = purchaseOrders.filter(p => p.status === 'goods_received' || p.status === 'completed');
  const pendingDeliverySOs = salesOrders.filter(s => s.status === 'confirmed');

  const categories = Array.from(new Set(inventory.map(i => i.category)));

  // Pagination for GRN
  const {
    currentData: paginatedPurchaseOrders,
    currentPage: grnCurrentPage,
    totalPages: grnTotalPages,
    totalItems: grnTotalItems,
    itemsPerPage: grnItemsPerPage,
    nextPage: grnNextPage,
    prevPage: grnPrevPage
  } = usePagination(purchaseOrders, 25);

  // Pagination for Transfers
  const {
    currentData: paginatedStockMovements,
    currentPage: transfersCurrentPage,
    totalPages: transfersTotalPages,
    totalItems: transfersTotalItems,
    itemsPerPage: transfersItemsPerPage,
    nextPage: transfersNextPage,
    prevPage: transfersPrevPage
  } = usePagination(stockMovements, 25);

  const handlePrintOpname = (op: any) => {
    const opHtml = `
      <div class="kop-surat">
        <div class="kop-title">${companyProfile.name.toUpperCase()}</div>
        <div class="kop-sub">${companyProfile.ptName}</div>
        <div class="kop-desc">${companyProfile.address} | Telp: ${companyProfile.phone} | Email: ${companyProfile.email}</div>
      </div>
      <div class="doc-header">
        <div class="doc-title">BERITA ACARA AUDIT FISIK & STOCK OPNAME</div>
        <div class="doc-meta">No. Dokumen: <strong>${op.opnameNumber}</strong> | Tanggal Audit: ${formatDate(op.date)}</div>
      </div>

      <div class="meta-box">
        <div>
          <span class="meta-label">Lokasi Gudang / Unit Terperiksa:</span><br/>
          <span class="meta-val">${op.warehouse}</span><br/>
          <span style="font-size: 8pt; color: #64748b;">Auditor / Penanggung Jawab: ${op.auditor}</span>
        </div>
        <div>
          <span class="meta-label">Ringkasan Hasil Stock Opname:</span><br/>
          <span class="meta-val">Status: <strong style="color: #065f46; text-transform: uppercase;">${op.status}</strong></span><br/>
          <span style="font-size: 8pt; color: #64748b;">Item Teraudit: <strong>${op.itemsAudited || inventory.length} SKU</strong> | Selisih: <strong>${op.discrepancyCount} Item</strong></span><br/>
          <span style="font-size: 8pt; color: #64748b;">Total Nilai Varian: <strong>${formatRupiah(op.totalVarianceValue || 0)}</strong></span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">No.</th>
            <th>Nama SKU / Barang</th>
            <th style="width: 100px; text-align: center;">Kategori</th>
            <th style="width: 80px; text-align: center;">Stok Sistem</th>
            <th style="width: 80px; text-align: center;">Fisik Riil</th>
            <th style="width: 90px; text-align: center;">Varian</th>
          </tr>
        </thead>
        <tbody>
          ${inventory.slice(0, 15).map((it, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${it.name}</strong> <span style="font-size: 7.5pt; color: #64748b;">(${it.sku})</span></td>
              <td style="text-align: center; text-transform: uppercase; font-size: 7.5pt;">${it.category}</td>
              <td style="text-align: center;">${it.stockQty} ${it.unit}</td>
              <td style="text-align: center; font-weight: 700; color: #065f46;">${it.stockQty} ${it.unit}</td>
              <td style="text-align: center; color: #065f46; font-weight: 600;">0 (Cocok)</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 8pt; color: #475569; margin-bottom: 20px;">
        <strong>Catatan Audit & Rekomendasi:</strong>
        <p style="margin-top: 4px; line-height: 1.5;">
          Perhitungan fisik inventaris persediaan pakan, suplemen satwa, dan bibit tanaman telah diselesaikan sesuai standar operasional. Semua penyesuaian kuantitas telah tercatat pada audit log ERP.
        </p>
      </div>

      <div class="signatures-block">
        <div>
          <div class="signature-title">Petugas Gudang (Checker)</div>
          <div class="signature-name">${op.auditor}</div>
          <div class="signature-role">Staff Logistik & Pergudangan</div>
        </div>
        <div>
          <div class="signature-title">Auditor Internal (Finance)</div>
          <div class="signature-name">${currentUser.name}</div>
          <div class="signature-role">Internal Audit ERP</div>
        </div>
        <div>
          <div class="signature-title">Kepala Unit Farm & Direksi</div>
          <div class="signature-name">${companyProfile.directorName}</div>
          <div class="signature-role">${companyProfile.directorTitle}</div>
        </div>
      </div>

      <div class="footer-stamp">
        <span>Berita Acara Resmi Sistem ERP D'Kandang Amazing Farm</span>
        <span>Dokumen Audit Internal Sah • ${new Date().toLocaleDateString('id-ID')}</span>
      </div>
    `;

    printHtmlContent(`BA_Opname_${op.opnameNumber}`, opHtml);
  };

  const filteredItems = inventory.filter(it => {
    const matchesSearch = it.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          it.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          it.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = categoryFilter === 'all' || it.category === categoryFilter;
    const matchesWH = warehouseFilter === 'all' || it.warehouseLocation.includes(warehouseFilter);
    return matchesSearch && matchesCat && matchesWH;
  });

  const [isSubmittingGRN, setIsSubmittingGRN] = useState(false);
  const [isSubmittingSKU, setIsSubmittingSKU] = useState(false);
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false);
  const [isSubmittingOpname, setIsSubmittingOpname] = useState(false);

  const handleConfirmGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showGRNModal || isSubmittingGRN) return;

    try {
      setIsSubmittingGRN(true);
      await confirmGoodsReceipt(showGRNModal.id, grnTargetWarehouse);
      setShowGRNModal(null);
      setGrnDeliveryNote('');
      setGrnNotes('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal konfirmasi penerimaan barang', 'error');
    } finally {
      setIsSubmittingGRN(false);
    }
  };

  const handleCreateSKU = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuName || !skuCost || isSubmittingSKU) return;

    try {
      setIsSubmittingSKU(true);
      const generatedSKU = skuCode || `SKU-${Date.now().toString().slice(-6)}`;

      await addInventoryItem({
        sku: generatedSKU,
        name: skuName,
        category: skuCategory,
        unit: skuUnit,
        stockQty: Number(skuQty) || 0,
        minStockLevel: Number(skuMin) || 10,
        unitCost: Number(skuCost) || 0,
        sellingPrice: Number(skuPrice) || Math.round((Number(skuCost) || 0) * 1.3),
        warehouseLocation: skuLocation,
        barcode: `BRC-${Math.floor(100000000000 + Math.random() * 900000000000)}`
      });

      setShowAddSKUModal(false);
      setSkuCode('');
      setSkuName('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal membuat SKU', 'error');
    } finally {
      setIsSubmittingSKU(false);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjItemId || !adjQty || isSubmittingAdjust) return;

    try {
      setIsSubmittingAdjust(true);
      await adjustInventoryStock(
        adjItemId, 
        Number(adjQty), 
        adjType, 
        adjNotes || 'Penyesuaian stok opname manual'
      );

      setShowAdjustModal(false);
      setAdjQty('10');
      setAdjNotes('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyesuaikan stok', 'error');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trItemId || !trQty || trFrom === trTo || isSubmittingTransfer) {
      showNotification('Gudang asal dan gudang tujuan tidak boleh sama!', 'error');
      return;
    }

    try {
      setIsSubmittingTransfer(true);
      await transferStock({
        itemId: trItemId,
        sourceWarehouse: trFrom,
        targetWarehouse: trTo,
        quantity: Number(trQty),
        notes: trNotes || 'Mutasi stok harian antar unit farm'
      });

      setShowTransferModal(false);
      setTrQty('50');
      setTrNotes('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal memutasi stok', 'error');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  const handleExecuteOpname = async () => {
    if (isSubmittingOpname) return;
    try {
      setIsSubmittingOpname(true);
      await runStockOpname({
        warehouse: opnameWarehouse,
        itemsChecked: inventory.length,
        discrepancyCount: 0,
        totalAdjustedValue: 0
      });
      setShowOpnameModal(false);
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyelesaikan stock opname', 'error');
    } finally {
      setIsSubmittingOpname(false);
    }
  };

  const handleQuickReorderPR = async (item: InventoryItem) => {
    const qtyOrder = Math.max(10, item.minStockLevel * 2);
    await addPurchaseRequisition({
      requestedBy: currentUser.name,
      department: 'Logistik & Gudang Farm',
      requestDate: new Date().toISOString().split('T')[0],
      items: [
        { 
          itemName: `${item.name} (${item.sku})`, 
          quantity: qtyOrder, 
          estimatedCost: item.unitCost, 
          reason: `Stok menipis di ${item.warehouseLocation}. Stok saat ini sisa ${item.stockQty} ${item.unit} (Batas Min: ${item.minStockLevel}).` 
        }
      ],
      totalEstimated: qtyOrder * item.unitCost
    });

    showNotification(`Permintaan Pembelian (PR) untuk ${item.name} berhasil dikirim ke Bagian Purchasing!`, 'success');
  };

  const handleProcessDO = async (soId: string) => {
    await processSalesOrderDelivery(soId);
    showNotification(`Surat Jalan (DO) diproses! Barang telah disiapkan oleh Logistik & stok gudang otomatis terpotong.`, 'success');
  };

  const canCreate = checkPermission('warehouse', 'create');
  const canDelete = checkPermission('warehouse', 'delete');

  return (
    <div className="space-y-6 pb-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Warehouse className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Logistik (Warehouse, Pengadaan Fisik & Gudang)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Jobdesk: Pengadaan Fisik / Penerimaan Barang Masuk (Goods Receipt Note & QC) dari PO Purchasing, Manajemen Multi-Gudang (Satwa, Kebun, Saung Resto, Souvenir), Mutasi & Distribusi Internal, serta Surat Jalan Penjualan (Delivery Order).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-blue-700" /> Mutasi Stok Internal
              </button>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <SlidersHorizontal className="w-4 h-4 text-amber-700" /> Penyesuaian / Koreksi
              </button>
              <button
                onClick={() => setShowAddSKUModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" /> Tambah SKU Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Total Nilai Persediaan Gudang (HPP)</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatRupiah(totalValuation)}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {totalSKUs} Macam SKU Terdaftar di 5 Gudang
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Pengadaan Fisik / Menunggu Masuk</span>
          <div className="text-xl font-bold text-blue-800 mt-1">{pendingArrivalPOs.length} PO dari Purchasing</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">
            {completedGRNPOs.length} Penerimaan GRN Sukses
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Peringatan Stok Menipis</span>
          <div className="text-xl font-bold text-rose-600 mt-1">{lowStockItems.length} SKU Kritis</div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">
            Perlu Dibuatkan PR ke Purchasing
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Pesanan Rombongan (Logistics DO)</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{pendingDeliverySOs.length} Siap Siap Fisik</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Paket edukasi, souvenir & olahan susu
          </div>
        </div>
      </div>

      {/* Integration Notice Bar */}
      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between text-xs text-slate-700 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <strong className="text-amber-900 font-semibold">Integrasi Flow Logistik ➔ Purchasing & Penjualan:</strong> Saat fisik barang kiriman vendor tiba di farm, tim Logistik melakukan pengecekan QC & menerbitkan <strong className="text-slate-800">Goods Receipt Note (GRN)</strong>. Stok gudang otomatis bertambah dan status PO di Purchasing otomatis terverifikasi untuk pembayaran Keuangan.
          </div>
        </div>
        <button 
          onClick={() => setActiveModule('procurement')}
          className="shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 font-semibold flex items-center gap-1 transition-colors"
        >
          Lihat Purchasing <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('grn')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'grn' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-3.5 h-3.5" /> Pengadaan Fisik & Penerimaan Barang (GRN) ({pendingArrivalPOs.length})
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'catalog' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" /> Stok & Valuasi Multi-Gudang ({inventory.length})
        </button>
        <button
          onClick={() => setActiveTab('transfers')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'transfers' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" /> Mutasi & Distribusi Internal ({stockMovements.length})
        </button>
        <button
          onClick={() => setActiveTab('fulfillment')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'fulfillment' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Surat Jalan / DO Penjualan Rombongan ({pendingDeliverySOs.length})
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'locations' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" /> Peta 5 Unit Gudang Farm
        </button>
        <button
          onClick={() => setActiveTab('opname')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'opname' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /> Stock Opname & Audit Fisik
        </button>
      </div>

      {/* TAB 1: GOODS RECEIPT NOTE (PENGADAAN FISIK & QC) */}
      {activeTab === 'grn' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-700" />
                  Daftar Pesanan Pembelian (PO) Menunggu Penerimaan Fisik di Farm
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Surat Pesanan Pembelian yang diterbitkan oleh Bagian Purchasing. Petugas Logistik memeriksa fisik barang, kualitas QC, dan mencatat Goods Receipt Note (GRN) ke gudang yang dituju.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">No. PO Purchasing</th>
                    <th className="p-3.5">Vendor Pemasok</th>
                    <th className="p-3.5">Tgl Pesan & Estimasi Tiba</th>
                    <th className="p-3.5">Daftar Item Fisik yang Dipesan</th>
                    <th className="p-3.5 text-right">Nilai Barang</th>
                    <th className="p-3.5 text-center">Status Kedatangan Fisik</th>
                    <th className="p-3.5 text-center">Tindakan Logistik & QC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {purchaseOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Belum ada Surat Pesanan Pembelian dari Purchasing.
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchaseOrders.map((po) => {
                      const isReceived = po.status === 'goods_received' || po.status === 'completed';
                      return (
                        <tr key={po.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-emerald-800">{po.poNumber}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{po.vendorName}</td>
                          <td className="p-3.5 text-slate-600">
                            <div>Pesan: {formatDate(po.orderDate)}</div>
                            <div className="text-[11px] text-blue-700">Est. Tiba: {formatDate(po.expectedDelivery)}</div>
                          </td>
                          <td className="p-3.5 text-slate-700">
                            <ul className="space-y-0.5">
                              {po.items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <Package className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{it.name} <strong>({it.quantity}x)</strong></span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(po.totalCost)}
                          </td>
                          <td className="p-3.5 text-center">
                            {isReceived ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Barang Diterima di Gudang
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> Menunggu Pengiriman Fisik
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            {!isReceived ? (
                              <button
                                onClick={() => setShowGRNModal(po)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto shadow-sm transition-all"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Terima Barang & QC (GRN)
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> QC Selesai • Stok Masuk
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {purchaseOrders.length > 0 && (
              <Pagination
                currentPage={grnCurrentPage}
                totalPages={grnTotalPages}
                totalItems={grnTotalItems}
                itemsPerPage={grnItemsPerPage}
                onNext={grnNextPage}
                onPrev={grnPrevPage}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STOK & VALUASI MULTI-GUDANG */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari SKU, nama barang, atau kategori..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Semua Kategori</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-amber-500"
              >
                <option value="all">Semua Lokasi Gudang</option>
                <option value="WH-01">WH-01 Sentral Pakan</option>
                <option value="WH-02">WH-02 Kandang Satwa</option>
                <option value="WH-03">WH-03 Resto Saung</option>
                <option value="WH-04">WH-04 Green House Hidroponik</option>
                <option value="WH-05">WH-05 Souvenir & Olahan</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">SKU & Barcode</th>
                    <th className="p-3.5">Nama Barang Persediaan</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Lokasi Gudang</th>
                    <th className="p-3.5 text-center">Stok Fisik Saat Ini</th>
                    <th className="p-3.5 text-right">Harga Pokok (HPP)</th>
                    <th className="p-3.5 text-right">Valuasi Total</th>
                    <th className="p-3.5 text-center">Status & Aksi Logistik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Tidak ada data item barang yang sesuai dengan pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLowStock = item.stockQty <= item.minStockLevel;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 font-mono text-amber-700">
                            <div className="font-bold">{item.sku}</div>
                            {item.barcode && <div className="text-[10px] text-slate-400">{item.barcode}</div>}
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">
                            {item.name}
                          </td>
                          <td className="p-3.5 text-slate-600">{item.category}</td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px]">
                              {item.warehouseLocation}
                            </span>
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            <span className={isLowStock ? 'text-rose-600' : 'text-emerald-700'}>
                              {item.stockQty} {item.unit}
                            </span>
                            <div className="text-[10px] text-slate-400">Min: {item.minStockLevel} {item.unit}</div>
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-600">
                            {formatRupiah(item.unitCost)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                            {formatRupiah(item.stockQty * item.unitCost)}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {isLowStock && (
                                <button
                                  onClick={() => handleQuickReorderPR(item)}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                                  title="Kirim Permintaan Pembelian (PR) ke Bagian Purchasing"
                                >
                                  <Send className="w-3 h-3" /> Ajukan Beli (PR)
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => deleteInventoryItem(item.id)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition-colors"
                                  title="Hapus SKU"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MUTASI & DISTRIBUSI INTERNAL */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Catatan Riwayat Mutasi & Distribusi Stok Farm</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Log pergerakan barang masuk (inbound dari PO), barang keluar operasional (outbound pakan/kebun/resto), dan transfer antar gudang farm.
                </p>
              </div>
              {canCreate && (
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" /> Catat Mutasi Baru
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Waktu & Tanggal</th>
                    <th className="p-3.5">Jenis Mutasi</th>
                    <th className="p-3.5">SKU & Nama Barang</th>
                    <th className="p-3.5 text-center">Jumlah (Qty)</th>
                    <th className="p-3.5">Lokasi / Gudang</th>
                    <th className="p-3.5">Referensi Dokumen</th>
                    <th className="p-3.5">Operator Logistik</th>
                    <th className="p-3.5">Catatan Peruntukan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Belum ada riwayat mutasi stok.
                      </td>
                    </tr>
                  ) : (
                    paginatedStockMovements.map((mv) => (
                      <tr key={mv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 text-slate-500 whitespace-nowrap">{mv.date}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            mv.type === 'inbound' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            mv.type === 'transfer' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            mv.type === 'outbound' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {mv.type}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{mv.itemName}</div>
                          <span className="text-[10px] text-slate-400 font-mono">{mv.itemSku}</span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-800">
                          {mv.quantity}x
                        </td>
                        <td className="p-3.5 text-slate-700">{mv.warehouse}</td>
                        <td className="p-3.5 font-mono text-slate-800">{mv.referenceNo || '-'}</td>
                        <td className="p-3.5 text-slate-700 font-medium">{mv.operator}</td>
                        <td className="p-3.5 text-slate-500">{mv.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {stockMovements.length > 0 && (
              <Pagination
                currentPage={transfersCurrentPage}
                totalPages={transfersTotalPages}
                totalItems={transfersTotalItems}
                itemsPerPage={transfersItemsPerPage}
                onNext={transfersNextPage}
                onPrev={transfersPrevPage}
              />
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SURAT JALAN / DO PENJUALAN */}
      {activeTab === 'fulfillment' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Penyiapan Logistik Pesanan Rombongan & Tiket (Fulfillment)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pesanan penjualan terkonfirmasi dari modul Pemasaran/Sales yang membutuhkan pengeluaran fisik barang (paket edukasi bertani, caping lukis, goodie bag, dan susu pasteurisasi segar).
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">No. Sales Order</th>
                    <th className="p-3.5">Nama Instansi / Sekolah</th>
                    <th className="p-3.5">Tgl Kunjungan</th>
                    <th className="p-3.5">Paket & Rincian Fisik</th>
                    <th className="p-3.5 text-center">Status Pemenuhan Fisik</th>
                    <th className="p-3.5 text-center">Aksi Logistik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {salesOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Belum ada pesanan penjualan rombongan yang perlu disiapkan.
                      </td>
                    </tr>
                  ) : (
                    salesOrders.map(so => {
                      const isDelivered = so.status === 'delivered';
                      return (
                        <tr key={so.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-blue-700">{so.soNumber}</td>
                          <td className="p-3.5 font-semibold text-slate-800">{so.customerName}</td>
                          <td className="p-3.5 text-slate-600">{formatDate(so.orderDate)}</td>
                          <td className="p-3.5 text-slate-700">
                            {so.items.map(it => `${it.itemName} (${it.quantity} pax)`).join(', ')}
                          </td>
                          <td className="p-3.5 text-center">
                            {isDelivered ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Surat Jalan Terbit & Barang Diserahkan
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> Perlu Disiapkan Logistik
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            {!isDelivered ? (
                              <button
                                onClick={() => handleProcessDO(so.id)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 mx-auto shadow-sm transition-all"
                              >
                                <Truck className="w-3.5 h-3.5" /> Terbitkan Surat Jalan (DO)
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Terkirim
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PETA 5 UNIT GUDANG */}
      {activeTab === 'locations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold border border-amber-200">
                WH-01
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Aktif • Suhu Terkontrol</span>
            </div>
            <h4 className="font-bold text-slate-800 text-base">Gudang Sentral & Pakan Farm</h4>
            <p className="text-xs text-slate-500">
              Pusat penyimpanan pakan konsentrat sapi, rumput gajah, vitamin, mineral ternak, dan bibit tanaman utama.
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
              <span>Item Tersimpan:</span>
              <strong className="text-slate-800">{inventory.filter(i => i.warehouseLocation.includes('WH-01')).length} SKU</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono text-[10px] font-bold border border-blue-200">
                WH-02
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Aktif</span>
            </div>
            <h4 className="font-bold text-slate-800 text-base">Kandang Edukasi Satwa</h4>
            <p className="text-xs text-slate-500">
              Penyimpanan harian pakan wortel/kangkung kelinci, pakan unggas, kambing etawa, dan suplemen satwa edukasi.
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
              <span>Item Tersimpan:</span>
              <strong className="text-slate-800">{inventory.filter(i => i.warehouseLocation.includes('WH-02')).length} SKU</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-mono text-[10px] font-bold border border-rose-200">
                WH-03
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Aktif • Cold Storage</span>
            </div>
            <h4 className="font-bold text-slate-800 text-base">Dapur, Resto Saung & F&B</h4>
            <p className="text-xs text-slate-500">
              Bahan baku kuliner nusantara, bumbu masak, beras organik farm, minyak, dan kemasan catering prasmanan rombongan.
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
              <span>Item Tersimpan:</span>
              <strong className="text-slate-800">{inventory.filter(i => i.warehouseLocation.includes('WH-03')).length} SKU</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold border border-emerald-200">
                WH-04
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Aktif • Green House</span>
            </div>
            <h4 className="font-bold text-slate-800 text-base">Pertanian & Green House Hidroponik</h4>
            <p className="text-xs text-slate-500">
              Nutrisi AB Mix, rockwool, benih sayuran hidroponik, polybag bibit buah, pupuk kompos kasgot, dan peralatan kebun.
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
              <span>Item Tersimpan:</span>
              <strong className="text-slate-800">{inventory.filter(i => i.warehouseLocation.includes('WH-04')).length} SKU</strong>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-[10px] font-bold border border-amber-200">
                WH-05
              </span>
              <span className="text-xs text-emerald-700 font-semibold">Aktif</span>
            </div>
            <h4 className="font-bold text-slate-800 text-base">Gudang Souvenir & Olahan Susu</h4>
            <p className="text-xs text-slate-500">
              Caping lukis anak, kaos merchandise agrowisata, botol susu pasteurisasi, yoghurt cup, dan kemasan goodie bag.
            </p>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-xs text-slate-600">
              <span>Item Tersimpan:</span>
              <strong className="text-slate-800">{inventory.filter(i => i.warehouseLocation.includes('WH-05')).length} SKU</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: STOCK OPNAME */}
      {activeTab === 'opname' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Audit Fisik & Stock Opname Berkala
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pencocokan stok tercatat pada sistem ERP dengan perhitungan fisik aktual di gudang untuk mencegah kebocoran barang.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowOpnameModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Jalankan Stock Opname
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">No. Dokumen Opname</th>
                  <th className="p-3.5">Tanggal Pelaksanaan</th>
                  <th className="p-3.5">Gudang Audit</th>
                  <th className="p-3.5">Auditor / Petugas</th>
                  <th className="p-3.5 text-center">Selisih Fisik (Variance)</th>
                  <th className="p-3.5 text-center">Status Rekonsiliasi</th>
                  <th className="p-3.5 text-center">Aksi / Dokumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {stockOpnames.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Belum ada dokumen Stock Opname yang dijalankan.
                    </td>
                  </tr>
                ) : (
                  stockOpnames.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-amber-700">{op.opnameNumber}</td>
                      <td className="p-3.5 text-slate-500">{formatDate(op.date)}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{op.warehouse}</td>
                      <td className="p-3.5 text-slate-600">{op.auditor}</td>
                      <td className="p-3.5 text-center font-bold">
                        {op.discrepancyCount === 0 ? (
                          <span className="text-emerald-700 font-semibold">0 (100% Sesuai)</span>
                        ) : (
                          <span className="text-rose-600 font-semibold">{op.discrepancyCount} Item Selisih</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          {op.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handlePrintOpname(op)}
                          className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer text-[11px] font-semibold inline-flex items-center gap-1"
                          title="Cetak Berita Acara Opname (PDF)"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-700" /> Cetak BA
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: GOODS RECEIPT NOTE (GRN & QC) */}
      {showGRNModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Penerimaan Fisik & QC (Goods Receipt Note)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">PO Ref: {showGRNModal.poNumber} • Vendor: {showGRNModal.vendorName}</p>
              </div>
              <button onClick={() => setShowGRNModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGRN} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <span className="text-slate-500 font-semibold">Barang yang Tiba di Farm:</span>
                <ul className="space-y-1 text-slate-800">
                  {showGRNModal.items.map((it, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>{it.name}</span>
                      <strong className="font-mono text-emerald-700">{it.quantity} Unit</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Gudang Tujuan Penyimpanan</label>
                <select
                  value={grnTargetWarehouse}
                  onChange={(e) => setGrnTargetWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Gudang Sentral & Pakan (WH-01)">Gudang Sentral & Pakan (WH-01)</option>
                  <option value="Kandang Sapi & Edukasi Satwa (WH-02)">Kandang Sapi & Edukasi Satwa (WH-02)</option>
                  <option value="Dapur, Resto Saung & F&B (WH-03)">Dapur, Resto Saung & F&B (WH-03)</option>
                  <option value="Pertanian & Green House Hidroponik (WH-04)">Pertanian & Green House Hidroponik (WH-04)</option>
                  <option value="Gudang Souvenir & Olahan Susu (WH-05)">Gudang Souvenir & Olahan Susu (WH-05)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Hasil Uji Kualitas (QC)</label>
                  <select
                    value={grnQCStatus}
                    onChange={(e) => setGrnQCStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="passed">Lolos QC 100% (Baik & Segar)</option>
                    <option value="partial">Sebagian Perlu Dicatat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">No. Surat Jalan Vendor</label>
                  <input
                    type="text"
                    placeholder="Contoh: SJ-VND-8891"
                    value={grnDeliveryNote}
                    onChange={(e) => setGrnDeliveryNote(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Catatan Pemeriksaan Fisik</label>
                <textarea
                  rows={2}
                  placeholder="Kondisi kemasan utuh, berat sesuai timbangan, tanggal kedaluwarsa aman..."
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800">
                Konfirmasi ini otomatis: (1) Menambah stok fisik gudang, (2) Mengupdate status PO di Purchasing menjadi Diterima, dan (3) Mencatat jurnal persediaan & hutang.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGRNModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingGRN}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingGRN ? 'Memproses...' : 'Konfirmasi Penerimaan Fisik (GRN)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH SKU */}
      {showAddSKUModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" /> Pendaftaran Item SKU Baru
              </h3>
              <button onClick={() => setShowAddSKUModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSKU} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Kode SKU (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: FEED-COW-01"
                    value={skuCode}
                    onChange={(e) => setSkuCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Kategori Persediaan</label>
                  <select
                    value={skuCategory}
                    onChange={(e) => setSkuCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Pakan & Suplemen Satwa">Pakan & Suplemen Satwa</option>
                    <option value="Benih, Bibit & Pupuk Tanaman">Benih, Bibit & Pupuk Tanaman</option>
                    <option value="Bahan Baku Resto & Saung F&B">Bahan Baku Resto & Saung F&B</option>
                    <option value="Hasil Panen & Olahan Susu Farm">Hasil Panen & Olahan Susu Farm</option>
                    <option value="Souvenir & Perlengkapan Wisata">Souvenir & Perlengkapan Wisata</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Nama Barang Lengkap</label>
                <input
                  type="text"
                  placeholder="Contoh: Pakan Konsentrat Sapi Perah Super 50Kg"
                  value={skuName}
                  onChange={(e) => setSkuName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Satuan Unit</label>
                  <input
                    type="text"
                    placeholder="Kg / Karung / Botol"
                    value={skuUnit}
                    onChange={(e) => setSkuUnit(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={skuQty}
                    onChange={(e) => setSkuQty(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Batas Minimum</label>
                  <input
                    type="number"
                    value={skuMin}
                    onChange={(e) => setSkuMin(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Harga Pokok Pembelian / HPP (Rp)</label>
                  <input
                    type="number"
                    value={skuCost}
                    onChange={(e) => setSkuCost(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Harga Jual / Nilai Rujukan (Rp)</label>
                  <input
                    type="number"
                    value={skuPrice}
                    onChange={(e) => setSkuPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Lokasi Gudang Penempatan</label>
                <select
                  value={skuLocation}
                  onChange={(e) => setSkuLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="Gudang Sentral & Pakan (WH-01)">Gudang Sentral & Pakan (WH-01)</option>
                  <option value="Kandang Sapi & Edukasi Satwa (WH-02)">Kandang Sapi & Edukasi Satwa (WH-02)</option>
                  <option value="Dapur, Resto Saung & F&B (WH-03)">Dapur, Resto Saung & F&B (WH-03)</option>
                  <option value="Pertanian & Green House Hidroponik (WH-04)">Pertanian & Green House Hidroponik (WH-04)</option>
                  <option value="Gudang Souvenir & Olahan Susu (WH-05)">Gudang Souvenir & Olahan Susu (WH-05)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSKUModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSKU}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingSKU ? 'Memproses...' : 'Daftarkan SKU'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MUTASI STOK INTERNAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-700" /> Mutasi & Distribusi Stok Farm
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Pilih Barang yang Dipindahkan</label>
                <select
                  value={trItemId}
                  onChange={(e) => setTrItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Tersedia: {i.stockQty} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Gudang Asal</label>
                <select
                  value={trFrom}
                  onChange={(e) => setTrFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Gudang Sentral & Pakan (WH-01)">Gudang Sentral & Pakan (WH-01)</option>
                  <option value="Kandang Sapi & Edukasi Satwa (WH-02)">Kandang Sapi & Edukasi Satwa (WH-02)</option>
                  <option value="Dapur, Resto Saung & F&B (WH-03)">Dapur, Resto Saung & F&B (WH-03)</option>
                  <option value="Pertanian & Green House Hidroponik (WH-04)">Pertanian & Green House Hidroponik (WH-04)</option>
                  <option value="Gudang Souvenir & Olahan Susu (WH-05)">Gudang Souvenir & Olahan Susu (WH-05)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Gudang Tujuan Distribusi</label>
                <select
                  value={trTo}
                  onChange={(e) => setTrTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Kandang Sapi & Edukasi Satwa (WH-02)">Kandang Sapi & Edukasi Satwa (WH-02)</option>
                  <option value="Gudang Sentral & Pakan (WH-01)">Gudang Sentral & Pakan (WH-01)</option>
                  <option value="Dapur, Resto Saung & F&B (WH-03)">Dapur, Resto Saung & F&B (WH-03)</option>
                  <option value="Pertanian & Green House Hidroponik (WH-04)">Pertanian & Green House Hidroponik (WH-04)</option>
                  <option value="Gudang Souvenir & Olahan Susu (WH-05)">Gudang Souvenir & Olahan Susu (WH-05)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Jumlah (Qty)</label>
                <input
                  type="number"
                  value={trQty}
                  onChange={(e) => setTrQty(e.target.value)}
                  required
                  min="1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Catatan Operasional</label>
                <input
                  type="text"
                  placeholder="Contoh: Pengiriman pakan harian ke kandang sapi perah"
                  value={trNotes}
                  onChange={(e) => setTrNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingTransfer ? 'Memproses...' : 'Eksekusi Mutasi Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PENYESUAIAN STOK */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" /> Penyesuaian Stok Manual
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 mb-1">Pilih Item SKU</label>
                <select
                  value={adjItemId}
                  onChange={(e) => setAdjItemId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  {inventory.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Stok: {i.stockQty} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1">Jenis Aksi</label>
                  <select
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  >
                    <option value="in">Penambahan Stok (Inbound)</option>
                    <option value="out">Pengurangan / Pemakaian (Outbound)</option>
                    <option value="adjustment">Koreksi Opname</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Alasan Penyesuaian</label>
                <textarea
                  rows={2}
                  placeholder="Pakan terpakai untuk pelatihan satwa edukasi..."
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingAdjust ? 'Memproses...' : 'Simpan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK OPNAME */}
      {showOpnameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" /> Pelaksanaan Stock Opname Fisik
              </h3>
              <button onClick={() => setShowOpnameModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block text-slate-600 mb-1">Pilih Gudang yang Diaudit</label>
                <select
                  value={opnameWarehouse}
                  onChange={(e) => setOpnameWarehouse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500"
                >
                  <option value="Gudang Sentral & Pakan (WH-01)">Gudang Sentral & Pakan (WH-01)</option>
                  <option value="Kandang Sapi & Edukasi Satwa (WH-02)">Kandang Sapi & Edukasi Satwa (WH-02)</option>
                  <option value="Dapur, Resto Saung & F&B (WH-03)">Dapur, Resto Saung & F&B (WH-03)</option>
                  <option value="Pertanian & Green House Hidroponik (WH-04)">Pertanian & Green House Hidroponik (WH-04)</option>
                  <option value="Gudang Souvenir & Olahan Susu (WH-05)">Gudang Souvenir & Olahan Susu (WH-05)</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500">Petugas Auditor:</span>
                <div className="font-bold text-slate-800 mt-0.5">{currentUser.name} (Logistik & Gudang Farm)</div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800">
                Sistem akan memverifikasi seluruh stok item di gudang ini dan mencatat berita acara audit rekonsiliasi.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpnameModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteOpname}
                  disabled={isSubmittingOpname}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-sm transition-colors"
                >
                  {isSubmittingOpname ? 'Memproses...' : 'Selesaikan & Simpan Opname'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
