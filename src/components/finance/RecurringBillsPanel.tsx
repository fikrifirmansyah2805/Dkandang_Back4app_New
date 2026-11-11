import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { RecurringBill } from '../../types';
import { formatRupiah } from '../../utils/crypto';
import { 
  CalendarClock, 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  AlertCircle,
  Search,
  X,
  Layers,
  Clock,
  AlertTriangle,
  RotateCcw,
  Receipt
} from 'lucide-react';

export default function RecurringBillsPanel() {
  const { 
    recurringBills, 
    addRecurringBill, 
    updateRecurringBill, 
    deleteRecurringBill,
    addCashTransaction,
    cashTransactions,
    bankAccounts,
    showNotification
  } = useERP();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<RecurringBill | null>(null);
  const [showPayModal, setShowPayModal] = useState<RecurringBill | null>(null);

  // Clean Tab Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue_soon' | 'paid' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [billName, setBillName] = useState('');
  const [billEstAmount, setBillEstAmount] = useState('');
  const [billDueDay, setBillDueDay] = useState('');
  const [billSourceAcc, setBillSourceAcc] = useState('');
  const [billNotes, setBillNotes] = useState('');

  // Payment states
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setBillName('');
    setBillEstAmount('');
    setBillDueDay('');
    setBillSourceAcc('');
    setBillNotes('');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billName || !billEstAmount || !billDueDay || !billSourceAcc) return;
    
    await addRecurringBill({
      name: billName,
      category: 'operating',
      estimatedAmount: Number(billEstAmount),
      dueDay: Number(billDueDay),
      sourceAccount: billSourceAcc,
      isActive: true,
      notes: billNotes
    });
    
    resetForm();
    setShowAddModal(false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    
    await updateRecurringBill(showEditModal.id, {
      name: billName,
      estimatedAmount: Number(billEstAmount),
      dueDay: Number(billDueDay),
      sourceAccount: billSourceAcc,
      notes: billNotes
    });
    
    resetForm();
    setShowEditModal(null);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPayModal || !payAmount || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await addCashTransaction({
        date: payDate,
        type: 'outflow',
        category: 'operating',
        description: `Pembayaran: ${showPayModal.name}`,
        amount: Number(payAmount),
        sourceAccount: showPayModal.sourceAccount,
        referenceNo: `RB-${Date.now().toString().slice(-6)}`,
        linkedEntityId: showPayModal.id,
        linkedEntityName: showPayModal.name
      });
      setShowPayModal(null);
      setPayAmount('');
    } catch (err) {
      console.error(err);
      showNotification('Gagal memproses pembayaran tagihan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentDay = new Date().getDate();

  const billsWithStatus = useMemo(() => {
    return recurringBills.map(bill => {
      const isPaid = cashTransactions.some(
        t => t.linkedEntityId === bill.id && t.type === 'outflow' && t.date.startsWith(currentMonthStr)
      );
      const isOverdue = !isPaid && currentDay > bill.dueDay;
      const isDueSoon = !isPaid && !isOverdue && (bill.dueDay - currentDay) <= 3;
      return {
        bill,
        isPaid,
        isOverdue,
        isDueSoon,
        isPending: !isPaid && bill.isActive,
        isOverdueOrDueSoon: isOverdue || isDueSoon
      };
    });
  }, [recurringBills, cashTransactions, currentMonthStr, currentDay]);

  const filteredBills = useMemo(() => {
    return billsWithStatus.filter(item => {
      // Tab filter
      if (statusFilter === 'unpaid' && item.isPaid) return false;
      if (statusFilter === 'unpaid' && !item.bill.isActive) return false;
      if (statusFilter === 'overdue_soon' && (!item.isOverdueOrDueSoon || !item.bill.isActive)) return false;
      if (statusFilter === 'paid' && !item.isPaid) return false;
      if (statusFilter === 'inactive' && item.bill.isActive) return false;

      // Search engine
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.bill.name.toLowerCase().includes(q);
        const matchNotes = (item.bill.notes || '').toLowerCase().includes(q);
        const sourceName = bankAccounts.find(b => b.id === item.bill.sourceAccount)?.bankName || item.bill.sourceAccount;
        const matchSource = sourceName.toLowerCase().includes(q);
        if (!matchName && !matchNotes && !matchSource) return false;
      }

      return true;
    });
  }, [billsWithStatus, statusFilter, searchQuery, bankAccounts]);

  const summary = useMemo(() => {
    const totalEst = recurringBills.filter(b => b.isActive).reduce((s, b) => s + (b.estimatedAmount || 0), 0);
    const paidList = billsWithStatus.filter(x => x.isPaid && x.bill.isActive);
    const totalPaid = paidList.reduce((s, x) => s + (x.bill.estimatedAmount || 0), 0);
    const totalRemaining = Math.max(0, totalEst - totalPaid);
    return {
      totalEst,
      totalPaid,
      totalRemaining,
      paidCount: paidList.length,
      unpaidCount: billsWithStatus.filter(x => x.isPending).length,
      overdueSoonCount: billsWithStatus.filter(x => x.isOverdueOrDueSoon && x.bill.isActive).length,
      inactiveCount: billsWithStatus.filter(x => !x.bill.isActive).length
    };
  }, [recurringBills, billsWithStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-emerald-600" />
            Tagihan Berulang Bulanan
          </h2>
          <p className="text-sm text-slate-500">Kelola dan pantau pembayaran rutin operasional farm secara teratur</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            if (bankAccounts.length > 0) setBillSourceAcc(bankAccounts[0].id);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Tagihan
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Anggaran Rutin Bulanan</span>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatRupiah(summary.totalEst)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Dari {recurringBills.filter(b => b.isActive).length} pos tagihan aktif
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Sudah Dibayar Bulan Ini</span>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {formatRupiah(summary.totalPaid)}
          </div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> {summary.paidCount} tagihan lunas
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Sisa Tagihan Belum Dibayar</span>
          <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {formatRupiah(summary.totalRemaining)}
          </div>
          <div className="text-[11px] text-amber-700 flex items-center gap-1 mt-1 font-semibold">
            <Clock className="w-3.5 h-3.5" /> {summary.unpaidCount} tagihan menunggu
          </div>
        </div>
      </div>

      {/* Clean Tab Filters & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs font-semibold border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Semua Tagihan
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {recurringBills.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'unpaid'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Belum Dibayar
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'unpaid' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {summary.unpaidCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('overdue_soon')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'overdue_soon'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Jatuh Tempo Dekat / Terlewat
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'overdue_soon' ? 'bg-rose-900 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {summary.overdueSoonCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Lunas Bulan Ini
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              statusFilter === 'paid' ? 'bg-emerald-900 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {summary.paidCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              statusFilter === 'inactive'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Nonaktif ({summary.inactiveCount})
          </button>
        </div>

        {/* Search Engine */}
        <div className="flex items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama tagihan, bank sumber, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(searchQuery || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto opacity-60" />
          <h4 className="text-sm font-bold text-slate-700">Tidak ada tagihan yang cocok</h4>
          <p className="text-xs text-slate-400">Silakan ubah tab filter atau kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBills.map(({ bill, isPaid, isOverdue, isDueSoon }) => {
            return (
              <div key={bill.id} className={`p-5 rounded-2xl border ${!bill.isActive ? 'bg-slate-50 border-slate-200 opacity-60' : isPaid ? 'bg-white border-emerald-200 shadow-xs' : isOverdue ? 'bg-white border-rose-200 shadow-sm' : isDueSoon ? 'bg-white border-amber-200 shadow-sm' : 'bg-white border-slate-200 shadow-xs'} transition-all`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="font-bold text-slate-800 text-sm">{bill.name}</div>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      onClick={() => {
                        setBillName(bill.name);
                        setBillEstAmount(bill.estimatedAmount.toString());
                        setBillDueDay(bill.dueDay.toString());
                        setBillSourceAcc(bill.sourceAccount);
                        setBillNotes(bill.notes || '');
                        setShowEditModal(bill);
                      }} 
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Edit Tagihan"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm('Yakin ingin menghapus tagihan ini?')) {
                          deleteRecurringBill(bill.id);
                        }
                      }} 
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Tagihan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="text-xs text-slate-600 mb-4 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Jatuh Tempo:</span>
                    <span className="font-semibold text-slate-800">Tgl {bill.dueDay} tiap bulan</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimasi:</span>
                    <span className="font-semibold text-slate-900 font-mono">{formatRupiah(bill.estimatedAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sumber Dana:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{bankAccounts.find(b => b.id === bill.sourceAccount)?.bankName || bill.sourceAccount}</span>
                  </div>
                  {bill.notes && (
                    <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      Catatan: {bill.notes}
                    </div>
                  )}
                </div>

                {bill.isActive ? (
                  isPaid ? (
                    <div className="w-full py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" /> Sudah Dibayar Bulan Ini
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(bill.estimatedAmount.toString());
                        setPayDate(new Date().toISOString().split('T')[0]);
                        setShowPayModal(bill);
                      }}
                      className={`w-full py-2 ${isOverdue ? 'bg-rose-600 hover:bg-rose-700' : isDueSoon ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-900 hover:bg-slate-800'} text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Tandai Sudah Dibayar
                    </button>
                  )
                ) : (
                  <div className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 border border-slate-200">
                    <AlertCircle className="w-4 h-4" /> Nonaktif
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">
                {showAddModal ? 'Tambah Tagihan Baru' : 'Edit Tagihan'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(null);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={showAddModal ? handleSaveAdd : handleSaveEdit} className="p-5 overflow-y-auto">
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nama Tagihan</label>
                  <input
                    type="text"
                    required
                    value={billName}
                    onChange={(e) => setBillName(e.target.value)}
                    placeholder="Contoh: Pulsa Admin WA"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Estimasi Nominal (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={billEstAmount}
                    onChange={(e) => setBillEstAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Jatuh Tempo (1-31)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={billDueDay}
                    onChange={(e) => setBillDueDay(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Sumber Dana Default</label>
                  <select
                    required
                    value={billSourceAcc}
                    onChange={(e) => setBillSourceAcc(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="">Pilih Rekening/Kas...</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Catatan Tambahan</label>
                  <textarea
                    value={billNotes}
                    onChange={(e) => setBillNotes(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    rows={2}
                  />
                </div>
                {showEditModal && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={showEditModal.isActive}
                      onChange={(e) => {
                        updateRecurringBill(showEditModal.id, { isActive: e.target.checked });
                        setShowEditModal({ ...showEditModal, isActive: e.target.checked });
                      }}
                      className="w-4 h-4 text-emerald-600 rounded"
                    />
                    <label htmlFor="isActive" className="text-slate-700 font-medium cursor-pointer">
                      Tagihan Aktif
                    </label>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl"
                >
                  {showAddModal ? 'Simpan Tagihan' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Catat Pembayaran Tagihan</h3>
              <p className="text-xs text-slate-500 mt-1">{showPayModal.name}</p>
            </div>
            <form onSubmit={handlePay} className="p-5">
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Nominal Aktual (Rp)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Estimasi awal: Rp {showPayModal.estimatedAmount.toLocaleString('id-ID')}</p>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tanggal Bayar</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPayModal(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Memproses...' : <><CheckCircle2 className="w-4 h-4" /> Bukukan Pembayaran</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
