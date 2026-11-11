import React, { useState, useEffect } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead, SalesInvoice } from '../../types';
import { X, Printer, Download, Settings, RefreshCw, Plus, Trash2, CalendarDays } from 'lucide-react';
import { getNextDocumentNumber } from '../../utils/documentNumbering';
import { printInvoice, downloadInvoiceHtmlFile, InvoicePrintData } from '../../utils/invoiceHelper';
import { formatRupiah } from '../../utils/crypto';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultLead?: Lead;
}

export default function InvoiceGeneratorModal({ isOpen, onClose, defaultLead }: Props) {
  const { companyProfile, bankAccounts, updateLeadDetails } = useERP();

  // Invoice States
  const [invoiceNo, setInvoiceNo] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [visitDate, setVisitDate] = useState('');
  
  // Items State (defaulting from Lead if available)
  const [items, setItems] = useState<{ id: string; name: string; quantity: number; unitPrice: number; total: number }[]>([]);
  const [discount, setDiscount] = useState(0);
  
  // Customization State
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Unpaid (Belum Lunas)');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  
  // UI States
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateInvoiceNumber();
      if (defaultLead) {
        // Pre-fill from lead
        setVisitDate(defaultLead.eventDate || '');
        // If there's no complex quoting system on lead, we just use dealValue as a 1-item line
        setItems([
          {
            id: Date.now().toString(),
            name: `Paket Kunjungan Wisata Edukasi - ${defaultLead.company}`,
            quantity: defaultLead.participantCount || 1,
            unitPrice: (defaultLead.participantCount || 1) > 0 ? (defaultLead.dealValue || 0) / (defaultLead.participantCount || 1) : (defaultLead.dealValue || 0),
            total: defaultLead.dealValue || 0
          }
        ]);
        
        // Auto set due date to visit date if possible
        if (defaultLead.eventDate) {
          setDueDate(defaultLead.eventDate);
        }
      }
      
      // Default bank
      if (bankAccounts.length > 0) {
        setSelectedBankId(bankAccounts[0].id);
      }
    }
  }, [isOpen, defaultLead]);

  const generateInvoiceNumber = async (forceNew: boolean = false) => {
    try {
      setIsGenerating(true);
      
      // Jika tidak memaksa buat baru dan lead sudah punya nomor invoice, gunakan itu
      if (!forceNew && defaultLead?.invoiceNumber) {
        setInvoiceNo(defaultLead.invoiceNumber);
        return;
      }
      
      const periodKey = new Date().toISOString().slice(0, 7); // YYYY-MM
      const yyyy = new Date().getFullYear();
      
      // Gunakan 'sales_invoices' agar penomoran sekuensial dengan modul Penjualan
      const nextNo = await getNextDocumentNumber('sales_invoices', periodKey);
      const invNum = `INV-${yyyy}-${String(nextNo + 100).padStart(3, '0')}`;
      setInvoiceNo(invNum);
      
      // Simpan nomor invoice yang baru di-generate ke database Lead
      if (defaultLead && updateLeadDetails) {
        await updateLeadDetails(defaultLead.id, { invoiceNumber: invNum });
      }
    } catch (err) {
      console.error('Error generating invoice number:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: '', quantity: 1, unitPrice: 0, total: 0 }
    ]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice);
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const calculateTotal = () => calculateSubtotal() - discount;

  const preparePrintData = (): InvoicePrintData => {
    const selectedBank = bankAccounts.find(b => b.id === selectedBankId);
    const bankInfo = selectedBank 
      ? `Bank ${selectedBank.bankName}\nNo. Rekening: ${selectedBank.accountNumber}\na.n ${selectedBank.accountName}`
      : 'Harap konfirmasi ke Admin';

    return {
      invoiceNo,
      customerName: defaultLead?.company || 'Pelanggan Umum',
      issueDate,
      dueDate,
      visitDate,
      items,
      discount,
      totalAmount: calculateTotal(),
      paymentStatus,
      notes,
      bankAccountInfo: bankInfo,
      companyProfile
    };
  };

  const handlePrint = () => {
    printInvoice(preparePrintData());
  };

  const handleDownload = () => {
    downloadInvoiceHtmlFile(preparePrintData());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Printer className="w-5 h-5 text-emerald-600" />
              Generator Invoice Profesional
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Edit konten dan konfigurasi sebelum mencetak atau mengunduh invoice</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              className={`p-2 rounded-xl transition-colors flex items-center gap-2 border ${showSettingsDrawer ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Konfigurasi Panel</span>
            </button>
            <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden flex-col md:flex-row">
          
          {/* Main Preview (Left) */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex justify-center">
            {/* INVOICE PREVIEW PAPER */}
            <div className="bg-white shadow-sm border border-slate-200 w-full max-w-[210mm] min-h-[297mm] p-10 flex flex-col rounded-sm">
              {/* Header Preview */}
              <div className="flex justify-between items-start border-b-2 border-slate-100 pb-6 mb-6">
                <div>
                  <div className="w-[180px] h-[75px] bg-emerald-50 rounded-lg border-2 border-dashed border-emerald-200 flex items-center justify-center text-emerald-600 text-xs font-bold mb-3">
                    [ Logo D'Kandang ]
                  </div>
                  <h1 className="text-lg font-bold text-slate-900">{companyProfile.name}</h1>
                  <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight mt-1">{companyProfile.address}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-emerald-700 tracking-wider mb-1">INVOICE</h2>
                  <p className="text-xs font-bold text-slate-500">{invoiceNo || 'INV/2026/.../...'}</p>
                  <div className="mt-3 inline-block px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 uppercase">
                    {paymentStatus}
                  </div>
                </div>
              </div>

              {/* Meta Data Preview */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h3 className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-2">Tagihan Kepada</h3>
                  <div className="text-sm font-bold text-slate-800">{defaultLead?.company || 'Pelanggan Umum'}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                  <h3 className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mb-2">Detail Tagihan</h3>
                  <div className="flex justify-between mb-1.5"><span className="text-slate-500">Tanggal Terbit</span><span className="font-semibold">{issueDate}</span></div>
                  <div className="flex justify-between mb-1.5"><span className="text-slate-500">Jatuh Tempo</span><span className="font-semibold">{dueDate || '-'}</span></div>
                  {visitDate && <div className="flex justify-between"><span className="text-slate-500">Tgl Kunjungan</span><span className="font-semibold">{visitDate}</span></div>}
                </div>
              </div>

              {/* Items Table Preview */}
              <table className="w-full text-xs mb-8">
                <thead>
                  <tr className="bg-emerald-700 text-white">
                    <th className="text-left py-2 px-3 rounded-tl-lg font-semibold">Deskripsi / Item</th>
                    <th className="text-center py-2 px-3 font-semibold w-16">Qty</th>
                    <th className="text-right py-2 px-3 font-semibold w-32">Harga (Rp)</th>
                    <th className="text-right py-2 px-3 rounded-tr-lg font-semibold w-32">Total (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-slate-400 italic">Belum ada item tagihan</td></tr>
                  )}
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{item.name || '-'}</td>
                      <td className="py-2.5 px-3 text-center">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right">{formatRupiah(item.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{formatRupiah(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Preview */}
              <div className="flex justify-between items-start mb-8">
                <div className="w-1/2 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <h4 className="text-[10px] uppercase font-bold text-emerald-800 mb-1.5">Informasi Pembayaran</h4>
                  <div className="text-xs text-emerald-900 leading-relaxed whitespace-pre-wrap">
                    {bankAccounts.find(b => b.id === selectedBankId) ? 
                      `Bank ${bankAccounts.find(b => b.id === selectedBankId)?.bankName}\nNo. Rekening: ${bankAccounts.find(b => b.id === selectedBankId)?.accountNumber}\na.n ${bankAccounts.find(b => b.id === selectedBankId)?.accountName}` 
                      : 'Pilih rekening di panel pengaturan'}
                  </div>
                </div>
                
                <div className="w-5/12 text-xs">
                  <div className="flex justify-between py-1.5 text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">{formatRupiah(calculateSubtotal())}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between py-1.5 text-rose-600">
                      <span>Diskon</span>
                      <span className="font-semibold">- {formatRupiah(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 mt-1.5 border-t-2 border-slate-100 text-sm font-bold text-emerald-700">
                    <span>TOTAL TAGIHAN</span>
                    <span>{formatRupiah(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              {/* Notes Preview */}
              {notes && (
                <div className="mb-8">
                  <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Catatan Penting</h4>
                  <div className="text-[11px] text-slate-600 border-l-2 border-slate-200 pl-3 whitespace-pre-wrap">
                    {notes}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Settings Drawer (Right) */}
          {showSettingsDrawer && (
            <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-sm">
                Konfigurasi Konten Invoice
              </div>
              
              <div className="p-4 space-y-5">
                {/* Dokumen & Tanggal */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">No. Invoice</label>
                    <button onClick={() => generateInvoiceNumber(true)} className="text-emerald-600 hover:text-emerald-700">
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <input type="text" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                  
                  <label className="text-xs font-semibold text-slate-700 block mt-2">Tanggal Terbit</label>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                  
                  <label className="text-xs font-semibold text-slate-700 block mt-2">Jatuh Tempo</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                  
                  <label className="text-xs font-semibold text-slate-700 block mt-2">Tanggal Kunjungan</label>
                  <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                </div>

                <hr className="border-slate-100" />

                {/* Items Tagihan */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700">Item Tagihan</label>
                    <button onClick={addItem} className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded">
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl relative">
                        <button onClick={() => removeItem(item.id)} className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-rose-200 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-50">
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <input 
                          type="text" 
                          placeholder="Nama barang / paket..." 
                          value={item.name} 
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full p-1.5 text-xs border border-slate-200 rounded mb-2" 
                        />
                        <div className="flex gap-2">
                          <div className="w-1/3">
                            <label className="text-[9px] text-slate-500">Qty</label>
                            <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} className="w-full p-1 text-xs border border-slate-200 rounded" />
                          </div>
                          <div className="w-2/3">
                            <label className="text-[9px] text-slate-500">Harga Satuan</label>
                            <input type="number" min="0" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', e.target.value)} className="w-full p-1 text-xs border border-slate-200 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="text-xs font-semibold text-slate-700 block mt-4">Diskon Total (Rp)</label>
                  <input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs mt-1" />
                </div>

                <hr className="border-slate-100" />

                {/* Info & Status */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700 block">Status Pembayaran (Badge)</label>
                  <input type="text" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} placeholder="Contoh: Lunas / DP 30% / Unpaid" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs" />
                  
                  <label className="text-xs font-semibold text-slate-700 block mt-2">Rekening Tujuan</label>
                  <select value={selectedBankId} onChange={(e) => setSelectedBankId(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs">
                    <option value="">-- Pilih Rekening --</option>
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountName}</option>
                    ))}
                  </select>

                  <label className="text-xs font-semibold text-slate-700 block mt-2">Catatan Tambahan</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Syarat dan ketentuan..." className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"></textarea>
                </div>

              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 z-10">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Download HTML
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Cetak / Save PDF
          </button>
        </div>

      </div>
    </div>
  );
}
