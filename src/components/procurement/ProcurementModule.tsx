import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { printHtmlContent } from '../../utils/printHelper';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate, 
  simulateDecrypt, 
  maskSensitive 
} from '../../utils/crypto';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Building2, 
  FileText, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  X, 
  Star, 
  Truck, 
  AlertCircle,
  PackageCheck,
  Search,
  Filter,
  Trash2,
  Printer,
  ChevronRight,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  FileCheck2,
  DollarSign,
  Copy,
  Lock,
  Download
} from 'lucide-react';
import { PurchaseOrder, PurchaseRequisition, Vendor } from '../../types';
import { exportToCSV } from '../../utils/exportHelper';

export default function ProcurementModule() {
  const { 
    purchaseRequisitions, 
    purchaseOrders, 
    vendors, 
    addPurchaseRequisition, 
    deletePurchaseRequisition,
    approvePurchaseRequisition, 
    convertPRToPO, 
    addDirectPurchaseOrder,
    deletePurchaseOrder,
    addVendor,
    deleteVendor,
    currentUser,
    companyProfile,
    checkPermission,
    setActiveModule,
    showNotification
  } = useERP();

  const handlePrintPO = (po: PurchaseOrder) => {
    const vendor = vendors.find(v => v.id === po.vendorId);
    const poHtml = `
      <div class="kop-surat">
        <div class="kop-title">${companyProfile.name.toUpperCase()}</div>
        <div class="kop-sub">${companyProfile.ptName}</div>
        <div class="kop-desc">${companyProfile.address} | Telp: ${companyProfile.phone} | Email: ${companyProfile.email}</div>
      </div>
      <div class="doc-header">
        <div class="doc-title">SURAT PESANAN RESMI (PURCHASE ORDER)</div>
        <div class="doc-meta">No. Dokumen: <strong>${po.poNumber}</strong> | Tanggal Terbit: ${formatDate(po.orderDate)}</div>
      </div>
      <div class="meta-box">
        <div>
          <span class="meta-label">Vendor Dituju:</span><br/>
          <span class="meta-val">${po.vendorName}</span><br/>
          <span style="font-size: 8pt; color: #64748b;">PIC / Kontak: ${vendor?.contactPerson || '-'} (${vendor?.phone || '-'})</span><br/>
          <span style="font-size: 8pt; color: #64748b;">Alamat: ${vendor?.address || 'Depok / Jabodetabek'}</span>
        </div>
        <div>
          <span class="meta-label">Alamat Pengiriman & Gudang Penerima:</span><br/>
          <span class="meta-val">Gudang Sentral D'Kandang Farm</span><br/>
          <span style="font-size: 8pt; color: #64748b;">Estimasi Tiba: ${po.expectedDelivery ? formatDate(po.expectedDelivery) : 'Sesuai Kesepakatan'}</span><br/>
          <span style="font-size: 8pt; color: #64748b;">Status PO: <strong style="color: #065f46; text-transform: uppercase;">${po.status}</strong></span>
        </div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 40px; text-align: center;">No.</th>
            <th>Uraian Barang / Spesifikasi Material</th>
            <th style="width: 80px; text-align: center;">Jumlah (Qty)</th>
            <th style="width: 120px; text-align: right;">Harga Satuan</th>
            <th style="width: 140px; text-align: right;">Subtotal (Rp)</th>
          </tr>
        </thead>
        <tbody>
          ${po.items.map((it, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td><strong>${it.name}</strong></td>
              <td style="text-align: center;">${it.quantity}</td>
              <td style="text-align: right;">${formatRupiah(it.unitCost)}</td>
              <td style="text-align: right; font-weight: 600;">${formatRupiah(it.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="text-align: right; font-weight: 700;">TOTAL NILAI PENGADAAN (PO):</td>
            <td style="text-align: right; font-weight: 800; color: #065f46; font-size: 10pt;">${formatRupiah(po.totalCost)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 8pt; color: #475569; margin-bottom: 20px;">
        <strong>Ketentuan Pengiriman & Penagihan:</strong>
        <ol style="margin-left: 16px; margin-top: 4px; line-height: 1.5;">
          <li>Fisik barang wajib disertai Surat Jalan resmi dan diperiksa oleh tim Logistik D'Kandang Farm saat penerimaan.</li>
          <li>Kwitansi penagihan & Faktur Pajak dilampirkan bersama bukti tanda terima barang (Good Receipt) dari gudang.</li>
          <li>Pembayaran dilakukan via transfer bank sesuai Term of Payment yang disepakati.</li>
        </ol>
      </div>

      <div class="signatures-block">
        <div>
          <div class="signature-title">Dipesan Oleh (Purchasing)</div>
          <div class="signature-name">${currentUser.name}</div>
          <div class="signature-role">Staff Pengadaan & Logistik</div>
        </div>
        <div>
          <div class="signature-title">Disetujui Oleh (Direksi/Manager)</div>
          <div class="signature-name">${companyProfile.directorName}</div>
          <div class="signature-role">${companyProfile.directorTitle}</div>
        </div>
        <div>
          <div class="signature-title">Diterima & Dikonfirmasi Vendor</div>
          <div class="signature-name">${po.vendorName}</div>
          <div class="signature-role">Tanda Tangan & Stempel Vendor</div>
        </div>
      </div>

      <div class="footer-stamp">
        <span>Dicetak dari Sistem ERP D'Kandang Amazing Farm</span>
        <span>Dokumen PO Sah Digital • ${new Date().toLocaleDateString('id-ID')}</span>
      </div>
    `;

    printHtmlContent(`PO_${po.poNumber}`, poHtml);
  };

  const [activeTab, setActiveTab] = useState<'po' | 'pr' | 'threeway' | 'vendors'>('po');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [showAddPRModal, setShowAddPRModal] = useState(false);
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showDirectPOModal, setShowDirectPOModal] = useState(false);
  const [selectedPRForPO, setSelectedPRForPO] = useState<string | null>(null);
  const [selectedVendorForPO, setSelectedVendorForPO] = useState<string>('');
  const [selectedPODetail, setSelectedPODetail] = useState<PurchaseOrder | null>(null);
  const [revealedVendorBankIds, setRevealedVendorBankIds] = useState<Record<string, boolean>>({});

  // New PR Form State
  const [prDept, setPrDept] = useState('Logistik & Gudang Farm');
  const [prItemName, setPrItemName] = useState('');
  const [prQty, setPrQty] = useState('10');
  const [prCost, setPrCost] = useState('500000');
  const [prReason, setPrReason] = useState('');

  // New Direct PO Form State
  const [poVendorId, setPoVendorId] = useState(vendors[0]?.id || '');
  const [poDeliveryDate, setPoDeliveryDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [poTerms, setPoTerms] = useState('NET 30');
  const [poItems, setPoItems] = useState<Array<{ name: string; quantity: number; unitCost: number }>>([
    { name: 'Pakan Konsentrat / Benih Hidroponik', quantity: 10, unitCost: 150000 }
  ]);

  // New Vendor Form State
  const [vndName, setVndName] = useState('');
  const [vndCategory, setVndCategory] = useState('');
  const [vndContact, setVndContact] = useState('');
  const [vndPhone, setVndPhone] = useState('');
  const [vndEmail, setVndEmail] = useState('');
  const [vndBank, setVndBank] = useState('');
  const [vndTerms, setVndTerms] = useState<'NET 15' | 'NET 30' | 'NET 60' | 'COD'>('NET 30');

  // KPIs calculation
  const totalPOSpend = purchaseOrders.reduce((acc, p) => acc + p.totalCost, 0);
  const pendingPRs = purchaseRequisitions.filter(p => p.status === 'pending');
  const approvedPRs = purchaseRequisitions.filter(p => p.status === 'approved');
  const activePOs = purchaseOrders.filter(p => p.status === 'issued');
  const receivedPOs = purchaseOrders.filter(p => p.status === 'goods_received' || p.status === 'completed');
  const threeWayMatchedCount = purchaseOrders.filter(p => p.threeWayMatched).length;

  const toggleVendorReveal = (id: string) => {
    setRevealedVendorBankIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [isSubmittingPR, setIsSubmittingPR] = useState(false);
  const [isSubmittingPO, setIsSubmittingPO] = useState(false);
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [isConvertingPR, setIsConvertingPR] = useState(false);
  const [isApprovingPRId, setIsApprovingPRId] = useState<string | null>(null);

  const handleApprovePR = async (id: string) => {
    if (isApprovingPRId) return;
    try {
      setIsApprovingPRId(id);
      await approvePurchaseRequisition(id);
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyetujui PR', 'error');
    } finally {
      setIsApprovingPRId(null);
    }
  };

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prItemName || !prCost || isSubmittingPR) return;

    try {
      setIsSubmittingPR(true);
      const qty = Number(prQty) || 1;
      const unitCost = Number(prCost) || 0;
      const totalEst = qty * unitCost;

      await addPurchaseRequisition({
        requestedBy: currentUser.name,
        department: prDept,
        requestDate: new Date().toISOString().split('T')[0],
        items: [
          { itemName: prItemName, quantity: qty, estimatedCost: unitCost, reason: prReason || 'Pengadaan operasional kebutuhan farm rutin.' }
        ],
        totalEstimated: totalEst
      });

      setShowAddPRModal(false);
      setPrItemName('');
      setPrReason('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal membuat PR', 'error');
    } finally {
      setIsSubmittingPR(false);
    }
  };

  const handleExecuteConvertPR = async () => {
    if (!selectedPRForPO || !selectedVendorForPO || isConvertingPR) return;
    try {
      setIsConvertingPR(true);
      await convertPRToPO(selectedPRForPO, selectedVendorForPO);
      setSelectedPRForPO(null);
      setSelectedVendorForPO('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal mengonversi PR ke PO', 'error');
    } finally {
      setIsConvertingPR(false);
    }
  };

  const handleCreateDirectPO = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = vendors.find(v => v.id === poVendorId);
    if (!vendor || poItems.length === 0 || isSubmittingPO) return;

    try {
      setIsSubmittingPO(true);
      const formattedItems = poItems.map((item, idx) => ({
        sku: `PO-ITEM-${idx + 101}`,
        name: item.name,
        quantity: Number(item.quantity) || 1,
        unitCost: Number(item.unitCost) || 0,
        total: (Number(item.quantity) || 1) * (Number(item.unitCost) || 0)
      }));

      const totalCost = formattedItems.reduce((acc, it) => acc + it.total, 0);

      await addDirectPurchaseOrder({
        vendorId: vendor.id,
        vendorName: vendor.name,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: poDeliveryDate,
        items: formattedItems,
        totalCost,
        paymentTerms: poTerms
      });

      setShowDirectPOModal(false);
      setPoItems([{ name: '', quantity: 1, unitCost: 0 }]);
    } catch (error) {
      console.error(error);
      showNotification('Gagal membuat PO', 'error');
    } finally {
      setIsSubmittingPO(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vndName || !vndContact || isSubmittingVendor) return;

    try {
      setIsSubmittingVendor(true);
      await addVendor({
        name: vndName,
        category: vndCategory || 'General Supplies & Pakan Farm',
        contactPerson: vndContact,
        phone: vndPhone || '+62 21-7788-0000',
        email: vndEmail || 'sales@rekanan.co.id',
        bankAccountEncrypted: vndBank || 'BCA: 000-000-0000',
        rating: 4.8,
        paymentTerms: vndTerms,
        status: 'active'
      });

      setShowAddVendorModal(false);
      setVndName('');
      setVndContact('');
      setVndBank('');
    } catch (error) {
      console.error(error);
      showNotification('Gagal menyimpan vendor', 'error');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const canCreate = checkPermission('procurement', 'create');
  const canApprove = checkPermission('procurement', 'approve');
  const canDelete = checkPermission('procurement', 'delete');

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          po.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleExportPOCSV = () => {
    const headers = [
      'No. Purchase Order',
      'Nama Vendor',
      'Tanggal Pesan',
      'Estimasi Tiba',
      'Total Biaya (Rp)',
      'Status PO',
      'Jumlah Macam Barang',
      'Rincian Barang'
    ];

    const rows = filteredPOs.map(po => {
      const itemsSummary = po.items.map(it => `${it.name} (${it.quantity}x)`).join('; ');
      return [
        po.poNumber,
        po.vendorName,
        po.orderDate,
        po.expectedDelivery || '-',
        po.totalCost,
        po.status,
        po.items.length,
        itemsSummary
      ];
    });

    const filename = `Purchase_Orders_DKandang_${new Date().toISOString().split('T')[0]}`;
    const success = exportToCSV(filename, headers, rows);
    if (success) {
      showNotification('Daftar Purchase Order berhasil diekspor ke CSV/Excel!', 'success');
    } else {
      showNotification('Gagal mengekspor Purchase Order.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-8 font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Purchasing (Manajemen Pembelian)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Jobdesk: Otorisasi Permintaan Pembelian (PR) lintas unit, Penerbitan Purchase Order (PO) ke Rekanan Pemasok, Direktori Vendor, serta Rekonsiliasi 3-Way Matching untuk Pembayaran Keuangan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <>
              <button
                onClick={() => setShowAddVendorModal(true)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-blue-700" /> Daftarkan Vendor
              </button>
              <button
                onClick={() => setShowAddPRModal(true)}
                className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <FileText className="w-4 h-4 text-blue-700" /> Ajukan PR
              </button>
              <button
                onClick={() => setShowDirectPOModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Terbitkan PO Baru
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Nilai Pembelian (PO)</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatRupiah(totalPOSpend)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {purchaseOrders.length} Surat Pesanan Diterbitkan
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">PR Menunggu Otorisasi Purchasing</span>
          <div className="text-xl font-bold text-amber-700 mt-1">{pendingPRs.length} Permintaan</div>
          <div className="text-[11px] text-amber-800 font-semibold mt-1">
            {approvedPRs.length} Siap Dikonversi ke PO
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Status Pengiriman & Penerimaan Fisik</span>
          <div className="text-xl font-bold text-emerald-800 mt-1">
            {receivedPOs.length} Diterima di Gudang
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {activePOs.length} Menunggu Pengiriman Vendor ke Logistik
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Rekanan Pemasok Terdaftar</span>
          <div className="text-xl font-bold text-blue-800 mt-1">{vendors.length} Vendor</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Rekening bank terenkripsi & aman
          </div>
        </div>
      </div>

      {/* Integration Notice Bar */}
      <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between text-xs text-slate-700 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div>
            <strong className="text-blue-900 font-semibold">Integrasi Flow Purchasing ➔ Logistik ➔ Keuangan:</strong> PO yang Anda terbitkan akan otomatis muncul di modul <strong>Logistik</strong> untuk diverifikasi fisik & QC saat barang tiba di gudang. Setelah Logistik menerbitkan GRN, status PO terupdate dan 3-Way Match siap diteruskan ke <strong>Keuangan</strong> untuk pembayaran.
          </div>
        </div>
        <button 
          onClick={() => setActiveModule('warehouse')}
          className="shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          Buka Logistik <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          onClick={() => setActiveTab('po')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'po' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Surat Pesanan Pembelian / PO ({purchaseOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('pr')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'pr' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Permintaan Pembelian / PR ({purchaseRequisitions.length})
        </button>
        <button
          onClick={() => setActiveTab('threeway')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'threeway' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Pencocokan 3 Dokumen (PO - Surat Terima Logistik - Faktur)
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`pb-3 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'vendors' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Direktori Rekanan & Pemasok ({vendors.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'po' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari nomor PO atau nama vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Semua Status PO</option>
                <option value="issued">Diterbitkan (Menunggu Pengiriman ke Logistik)</option>
                <option value="goods_received">Barang Diterima Logistik Gudang</option>
                <option value="completed">Selesai & Lunas</option>
              </select>
              <button
                onClick={handleExportPOCSV}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer shrink-0"
                title="Ekspor daftar Purchase Order ke CSV/Excel"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" /> Ekspor CSV
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">No. Purchase Order</th>
                    <th className="p-3.5">Vendor Pemasok</th>
                    <th className="p-3.5">Tgl Pesan</th>
                    <th className="p-3.5">Estimasi Tiba</th>
                    <th className="p-3.5">Rincian Barang</th>
                    <th className="p-3.5">Termin Bayar</th>
                    <th className="p-3.5 text-right">Total Biaya (IDR)</th>
                    <th className="p-3.5 text-center">Status Pemenuhan Logistik</th>
                    <th className="p-3.5 text-center">Aksi Purchasing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPOs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-400">
                        Belum ada Surat Pesanan Pembelian yang sesuai dengan pencarian/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-emerald-800">{po.poNumber}</td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{po.vendorName}</div>
                          {po.prReference && (
                            <span className="text-[10px] text-slate-500 font-mono">Ref PR: {po.prReference}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500">{formatDate(po.orderDate)}</td>
                        <td className="p-3.5 text-slate-500">{formatDate(po.expectedDelivery)}</td>
                        <td className="p-3.5 text-slate-700 max-w-xs truncate">
                          {po.items.map(it => `${it.name} (${it.quantity}x)`).join(', ')}
                        </td>
                        <td className="p-3.5 text-slate-700 font-medium">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                            {po.paymentTerms || 'NET 30'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(po.totalCost)}
                        </td>
                        <td className="p-3.5 text-center">
                          {po.status === 'goods_received' || po.status === 'completed' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Barang Diterima Logistik
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-700" /> Menunggu Kedatangan Fisik
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedPODetail(po)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Lihat Detail & Cetak PO"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button
                                onClick={() => deletePurchaseOrder(po.id)}
                                className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                                title="Hapus PO"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE REQUISITIONS */}
      {activeTab === 'pr' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Daftar Permintaan Pembelian dari Seluruh Unit</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengajuan kebutuhan barang/pakan dari Logistik, Kandang Satwa, Kebun Hidroponik, Saung Resto, dan Operasional.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowAddPRModal(true)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Buat PR Baru
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">No. Permintaan (PR)</th>
                  <th className="p-3.5">Pemohon & Divisi</th>
                  <th className="p-3.5">Tgl Pengajuan</th>
                  <th className="p-3.5">Detail Barang & Alasan</th>
                  <th className="p-3.5 text-right">Estimasi Biaya</th>
                  <th className="p-3.5 text-center">Status PR</th>
                  <th className="p-3.5 text-center">Tindakan Purchasing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseRequisitions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Belum ada Permintaan Pembelian (PR) yang diajukan.
                    </td>
                  </tr>
                ) : (
                  purchaseRequisitions.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-emerald-800">{pr.prNumber}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{pr.requestedBy}</div>
                        <div className="text-[11px] text-slate-500">{pr.department}</div>
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDate(pr.requestDate)}</td>
                      <td className="p-3.5 text-slate-700">
                        {pr.items.map(it => `${it.itemName} (${it.quantity}x) - ${it.reason}`).join('; ')}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                        {formatRupiah(pr.totalEstimated)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pr.status === 'approved' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          pr.status === 'converted_to_po' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                          'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}>
                          {pr.status === 'converted_to_po' ? 'PO Telah Terbit' : pr.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {pr.status === 'pending' && canApprove && (
                            <button
                              onClick={() => handleApprovePR(pr.id)}
                              disabled={isApprovingPRId === pr.id}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              {isApprovingPRId === pr.id ? (
                                <>Memproses...</>
                              ) : (
                                <><CheckCircle2 className="w-3.5 h-3.5" /> Setujui PR</>
                              )}
                            </button>
                          )}
                          {pr.status === 'approved' && canCreate && (
                            <button
                              onClick={() => {
                                setSelectedPRForPO(pr.id);
                                setSelectedVendorForPO(vendors[0]?.id || '');
                              }}
                              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> Terbitkan PO
                            </button>
                          )}
                          {pr.status === 'converted_to_po' && (
                            <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Diproses Vendor
                            </span>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => deletePurchaseRequisition(pr.id)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                              title="Hapus PR"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 3-WAY MATCHING */}
      {activeTab === 'threeway' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Pencocokan 3 Dokumen (3-Way Matching Dashboard)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Prinsip kepatuhan purchasing & akuntansi: Memastikan Surat Pesanan (PO) Purchasing, Tanda Terima Fisik & QC (GRN Logistik), dan Faktur Tagihan Pemasok telah cocok sebelum pembayaran diproses di Keuangan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-blue-800 font-semibold flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" /> 1. Purchase Order (Purchasing)
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">{purchaseOrders.length} Dokumen PO</div>
              <p className="text-[11px] text-slate-500 mt-1">Total harga & kuantitas disepakati dengan vendor</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-blue-800 font-semibold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" /> 2. Goods Receipt (Logistik)
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">{receivedPOs.length} Diterima di Gudang</div>
              <p className="text-[11px] text-slate-500 mt-1">Fisik barang terverifikasi lolos QC oleh tim Logistik</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" /> 3. Siap Bayar di Keuangan
              </div>
              <div className="text-lg font-bold text-slate-800 mt-1">{threeWayMatchedCount} Siap Bayar</div>
              <p className="text-[11px] text-slate-500 mt-1">Otorisasi transfer kas keluar tanpa selisih</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Dokumen PO</th>
                  <th className="p-3.5">Vendor Pemasok</th>
                  <th className="p-3.5">Nilai PO (Purchasing)</th>
                  <th className="p-3.5 text-center">Fisik Diterima (Logistik)</th>
                  <th className="p-3.5 text-center">Status 3-Way Match</th>
                  <th className="p-3.5 text-center">Otorisasi Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchaseOrders.map(po => {
                  const isReceived = po.status === 'goods_received' || po.status === 'completed';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-emerald-800">{po.poNumber}</td>
                      <td className="p-3.5 font-semibold text-slate-800">{po.vendorName}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-800">{formatRupiah(po.totalCost)}</td>
                      <td className="p-3.5 text-center">
                        {isReceived ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            Lolos QC & Diterima
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                            Menunggu di Logistik
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isReceived ? (
                          <span className="text-emerald-800 font-semibold flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> 100% Cocok
                          </span>
                        ) : (
                          <span className="text-amber-800 font-semibold flex items-center justify-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending GRN
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isReceived ? (
                          <button
                            onClick={() => {
                              showNotification(`Dokumen PO ${po.poNumber} terverifikasi cocok untuk pembayaran Keuangan.`, 'success');
                              setActiveModule('finance');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 mx-auto shadow-xs cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" /> Buka di Keuangan
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Menunggu Fisik Gudang</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VENDORS */}
      {activeTab === 'vendors' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Direktori Rekanan Pemasok Resmi</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mitra penyuplai pakan konsentrat, hijauan rumput, bibit tanaman, kemasan yogurt/susu, dan obat-obatan hewan.
              </p>
            </div>
            {canCreate && (
              <button
                onClick={() => setShowAddVendorModal(true)}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Pemasok
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3.5">Kode & Nama Pemasok</th>
                  <th className="p-3.5">Kategori Pasokan</th>
                  <th className="p-3.5">Kontak PIC</th>
                  <th className="p-3.5">Rating Kinerja</th>
                  <th className="p-3.5">Termin Kredit</th>
                  <th className="p-3.5">Rekening Bank</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vendors.map((v) => {
                  const plainBank = simulateDecrypt(v.bankAccountEncrypted);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{v.name}</div>
                        <span className="text-[10px] text-emerald-700 font-mono font-bold">{v.code}</span>
                      </td>
                      <td className="p-3.5 text-slate-600">{v.category}</td>
                      <td className="p-3.5">
                        <div className="text-slate-800 font-medium">{v.contactPerson}</div>
                        <div className="text-[11px] text-slate-500">{v.phone} • {v.email}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-amber-700 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{v.rating.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold">
                          {v.paymentTerms}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 max-w-[220px]">
                          <span className="font-mono text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-semibold select-all">
                            {plainBank}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(plainBank);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/60 transition cursor-pointer shrink-0"
                            title="Salin Nomor Rekening"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {canDelete && (
                          <button
                            onClick={() => deleteVendor(v.id)}
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                            title="Hapus Vendor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: AJUKAN PR */}
      {showAddPRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" /> Form Permintaan Pembelian (PR)
              </h3>
              <button onClick={() => setShowAddPRModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Departemen / Unit Pemohon</label>
                <select
                  value={prDept}
                  onChange={(e) => setPrDept(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Logistik & Gudang Farm">Logistik & Gudang Farm</option>
                  <option value="Peternakan & Pakan Satwa">Peternakan & Pakan Satwa</option>
                  <option value="Pertanian Organik & Kebun Bibit">Pertanian Organik & Kebun Bibit</option>
                  <option value="F&B Resto & Olahan Susu Saung">F&B Resto & Olahan Susu Saung</option>
                  <option value="Kesehatan Satwa & Dokter Hewan">Kesehatan Satwa & Dokter Hewan</option>
                  <option value="Operasional Wahana & Agrowisata">Operasional Wahana & Agrowisata</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nama Barang / Spesifikasi</label>
                <input
                  type="text"
                  placeholder="Contoh: Pakan Konsentrat Sapi Perah 50Kg / Benih Sayur Organik"
                  value={prItemName}
                  onChange={(e) => setPrItemName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Jumlah (Qty)</label>
                  <input
                    type="number"
                    value={prQty}
                    onChange={(e) => setPrQty(e.target.value)}
                    required
                    min="1"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Estimasi Biaya Satuan (Rp)</label>
                  <input
                    type="number"
                    value={prCost}
                    onChange={(e) => setPrCost(e.target.value)}
                    required
                    step="1000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Alasan Kebutuhan / Urgensi</label>
                <textarea
                  rows={2}
                  placeholder="Jelaskan peruntukan barang ini untuk operasional farm..."
                  value={prReason}
                  onChange={(e) => setPrReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPRModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPR}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmittingPR ? 'Memproses...' : 'Kirim Pengajuan PR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONVERSI PR KE PO */}
      {selectedPRForPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-700" /> Terbitkan PO dari PR
              </h3>
              <button onClick={() => setSelectedPRForPO(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-3">
              <p>Pilih mitra vendor rekanan untuk menerbitkan Surat Pesanan Pembelian resmi:</p>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Pilih Vendor Rekanan</label>
                <select
                  value={selectedVendorForPO}
                  onChange={(e) => setSelectedVendorForPO(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.category} - {v.paymentTerms})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                Setelah PO diterbitkan, data pesanan otomatis terhubung ke modul Logistik untuk penerimaan barang fisik di farm.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPRForPO(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConvertPR}
                  disabled={isConvertingPR}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isConvertingPR ? 'Memproses...' : 'Terbitkan Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT PO CREATION */}
      {showDirectPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-700" /> Buat Purchase Order (PO) Langsung
              </h3>
              <button onClick={() => setShowDirectPOModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectPO} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Vendor Pemasok</label>
                  <select
                    value={poVendorId}
                    onChange={(e) => setPoVendorId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Estimasi Tiba di Gudang</label>
                  <input
                    type="date"
                    value={poDeliveryDate}
                    onChange={(e) => setPoDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Syarat Pembayaran (Term of Payment)</label>
                <select
                  value={poTerms}
                  onChange={(e) => setPoTerms(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NET 15">NET 15 Hari</option>
                  <option value="NET 30">NET 30 Hari</option>
                  <option value="NET 60">NET 60 Hari</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Daftar Barang yang Dipesan:</span>
                  <button
                    type="button"
                    onClick={() => setPoItems(prev => [...prev, { name: '', quantity: 1, unitCost: 0 }])}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah Baris Barang
                  </button>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <div className="col-span-6">
                      <input
                        type="text"
                        placeholder="Nama Barang / SKU"
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].name = e.target.value;
                          setPoItems(updated);
                        }}
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].quantity = Number(e.target.value);
                          setPoItems(updated);
                        }}
                        min="1"
                        required
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-center text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Harga Satuan"
                        value={item.unitCost}
                        onChange={(e) => {
                          const updated = [...poItems];
                          updated[idx].unitCost = Number(e.target.value);
                          setPoItems(updated);
                        }}
                        step="1000"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-right text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="col-span-1 text-center">
                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPoItems(poItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono">
                <span className="text-slate-600 font-medium">Estimasi Total Biaya PO:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatRupiah(poItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0))}
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDirectPOModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPO}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmittingPO ? 'Memproses...' : 'Terbitkan Surat Pesanan (PO)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DAFTARKAN VENDOR */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-700" /> Pendaftaran Pemasok / Vendor Baru
              </h3>
              <button onClick={() => setShowAddVendorModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nama Perusahaan / Kelompok Tani</label>
                <input
                  type="text"
                  placeholder="Contoh: CV Pakan Segar Parung / Koperasi Sapi Sawangan"
                  value={vndName}
                  onChange={(e) => setVndName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Kategori Produk / Komoditas</label>
                <input
                  type="text"
                  placeholder="Contoh: Pakan Hijauan & Konsentrat / Pupuk Organik / Kemasan"
                  value={vndCategory}
                  onChange={(e) => setVndCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nama Kontak PIC</label>
                  <input
                    type="text"
                    placeholder="Nama PIC Sales"
                    value={vndContact}
                    onChange={(e) => setVndContact(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Nomor Telepon / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+62 812-xxxx-xxxx"
                    value={vndPhone}
                    onChange={(e) => setVndPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Email Resmi</label>
                  <input
                    type="email"
                    placeholder="sales@vendor.com"
                    value={vndEmail}
                    onChange={(e) => setVndEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 mb-1 font-semibold">Termin Pembayaran</label>
                  <select
                    value={vndTerms}
                    onChange={(e) => setVndTerms(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="NET 15">NET 15 Hari</option>
                    <option value="NET 30">NET 30 Hari</option>
                    <option value="NET 60">NET 60 Hari</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-semibold">Nomor Rekening Bank (Terenkripsi)</label>
                <input
                  type="text"
                  placeholder="Contoh: BCA: 554-129-8871 (a.n CV Pakan Segar)"
                  value={vndBank}
                  onChange={(e) => setVndBank(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVendor}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {isSubmittingVendor ? 'Memproses...' : 'Simpan Mitra Pemasok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL PO / CETAK PO */}
      {selectedPODetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" /> Surat Pesanan Pembelian ({selectedPODetail.poNumber})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">D'KANDANG FARM PASIR PUTIH SAWANGAN DEPOK</p>
              </div>
              <button onClick={() => setSelectedPODetail(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <div className="text-slate-500">Kepada Vendor:</div>
                  <div className="font-bold text-slate-800 text-sm">{selectedPODetail.vendorName}</div>
                  <div className="text-slate-500 mt-1">Termin Pembayaran: <strong className="text-slate-700">{selectedPODetail.paymentTerms}</strong></div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500">Tanggal PO: <strong className="text-slate-700">{formatDate(selectedPODetail.orderDate)}</strong></div>
                  <div className="text-slate-500 mt-0.5">Estimasi Pengiriman: <strong className="text-emerald-800 font-bold">{formatDate(selectedPODetail.expectedDelivery)}</strong></div>
                  <div className="text-slate-500 mt-0.5">Status: <span className="uppercase font-bold text-emerald-800">{selectedPODetail.status}</span></div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-800 mb-2">Daftar Barang:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="p-2.5">SKU / Nama Barang</th>
                        <th className="p-2.5 text-center">Kuantitas</th>
                        <th className="p-2.5 text-right">Harga Satuan</th>
                        <th className="p-2.5 text-right">Total Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedPODetail.items.map((it, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-medium text-slate-800">{it.name}</td>
                          <td className="p-2.5 text-center">{it.quantity}x</td>
                          <td className="p-2.5 text-right font-mono">{formatRupiah(it.unitCost)}</td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-800">{formatRupiah(it.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-2.5 text-right">Grand Total:</td>
                        <td className="p-2.5 text-right font-mono text-emerald-800 text-sm">
                          {formatRupiah(selectedPODetail.totalCost)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                Penerimaan fisik barang & inspeksi kualitas dilakukan oleh tim Logistik di Gudang Sentral D'Kandang Farm.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintPO(selectedPODetail)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" /> Cetak / Unduh PDF PO
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPODetail(null)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
