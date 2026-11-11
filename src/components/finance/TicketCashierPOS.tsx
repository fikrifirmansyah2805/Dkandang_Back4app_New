import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../common/Pagination';
import { exportToCSV } from '../../utils/exportHelper';
import { CashTransaction } from '../../types';
import { 
  formatRupiah, 
  formatDate,
  ROLE_LABELS
} from '../../utils/crypto';
import { findTargetBankAccount } from '../../utils/bankMatcher';
import { 
  Ticket, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Users, 
  School, 
  Utensils, 
  ShoppingBag, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  X, 
  Calendar, 
  Clock, 
  Percent, 
  Tag, 
  UserCheck, 
  ArrowRight,
  Receipt,
  Download,
  Share2,
  ChevronRight,
  Shield,
  Layers,
  Sparkle,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  Copy
} from 'lucide-react';
import { soundManager } from '../../utils/sound';

export interface TicketCatalogItem {
  id: string;
  sku: string;
  name: string;
  category: 'ticket_gate' | 'ride_activity' | 'fnb_resto' | 'souvenir_farm';
  categoryLabel: string;
  price: number;
  unit: string;
  badgeColor: string;
  icon: any;
  description: string;
  popular?: boolean;
}

export const TICKET_CATALOG: TicketCatalogItem[] = [
  // Tiket Masuk & Paket Edukasi
  {
    id: 'tkt_001',
    sku: 'TKT-REG-01',
    name: 'Tiket Masuk Reguler Dewasa / Umum',
    category: 'ticket_gate',
    categoryLabel: 'Tiket Masuk',
    price: 25000,
    unit: 'Orang',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: Ticket,
    description: 'Akses masuk area D\'Kandang Amazing Farm, welcome drink susu murni & spot foto satwa.',
    popular: true
  },
  {
    id: 'tkt_002',
    sku: 'TKT-CHL-01',
    name: 'Tiket Edukasi Anak & Satwa',
    category: 'ticket_gate',
    categoryLabel: 'Tiket Masuk',
    price: 35000,
    unit: 'Anak',
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: Users,
    description: 'Akses masuk, pakan kelinci gratis, topi caping cilik & pemandu edukasi dasar.',
    popular: true
  },
  {
    id: 'tkt_003',
    sku: 'TKT-PKT-01',
    name: 'Paket Fun Farm Tour Edukasi Komplit',
    category: 'ticket_gate',
    categoryLabel: 'Paket Wisata',
    price: 85000,
    unit: 'Pax',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: School,
    description: 'Tur keliling peternakan sapi/kambing, perah susu, tanam sayur, naik kuda & makan siang box.',
    popular: true
  },
  {
    id: 'tkt_004',
    sku: 'TKT-PKT-02',
    name: 'Paket Petani Cilik & Agro Organik',
    category: 'ticket_gate',
    categoryLabel: 'Paket Wisata',
    price: 65000,
    unit: 'Pax',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Sparkles,
    description: 'Belajar hidroponik, membuat kompos, panen sayur segar bawa pulang & es krim susu.'
  },

  // Wahana & Satwa
  {
    id: 'wah_001',
    sku: 'WAH-KDA-01',
    name: 'Tunggang Kuda Poni / Dewasa (1 Putaran)',
    category: 'ride_activity',
    categoryLabel: 'Wahana Satwa',
    price: 25000,
    unit: 'Sesi',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Sparkles,
    description: 'Wahana berkuda didampingi joki profesional di trek berumput hijau.',
    popular: true
  },
  {
    id: 'wah_002',
    sku: 'WAH-KRT-01',
    name: 'Kereta Wisata Keliling Farm',
    category: 'ride_activity',
    categoryLabel: 'Wahana Satwa',
    price: 15000,
    unit: 'Orang',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Ticket,
    description: 'Keliling area perkebunan 12 hektar dengan kereta mini terbuka santai.',
    popular: true
  },
  {
    id: 'wah_003',
    sku: 'WAH-PKN-01',
    name: 'Paket Pakan Hewan (Kelinci & Kambing)',
    category: 'ride_activity',
    categoryLabel: 'Wahana Satwa',
    price: 10000,
    unit: 'Paket',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: ShoppingBag,
    description: 'Wortel segar & rumput gajah untuk interaksi langsung memberi makan ternak.'
  },
  {
    id: 'wah_004',
    sku: 'WAH-IKN-01',
    name: 'Wahana Tangkap Ikan Kolam Anak',
    category: 'ride_activity',
    categoryLabel: 'Wahana Satwa',
    price: 20000,
    unit: 'Anak',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Users,
    description: 'Sensasi menangkap ikan air tawar di kolam dangkal bersih, ikan boleh dibawa pulang.'
  },
  {
    id: 'wah_005',
    sku: 'WAH-PNH-01',
    name: 'Panahan Tradisional & Flying Fox',
    category: 'ride_activity',
    categoryLabel: 'Wahana Satwa',
    price: 30000,
    unit: 'Sesi',
    badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: Sparkles,
    description: '10 anak panah sasaran target + 1x luncuran flying fox di atas danau buatan.'
  },

  // Saung Resto & F&B
  {
    id: 'fnb_001',
    sku: 'FNB-SSU-01',
    name: 'Susu Murni Pasteurisasi D\'Kandang 250ml',
    category: 'fnb_resto',
    categoryLabel: 'Kuliner & F&B',
    price: 15000,
    unit: 'Botol',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Utensils,
    description: 'Susu sapi perah segar higienis rasa Original, Cokelat, Stroberi & Melon.',
    popular: true
  },
  {
    id: 'fnb_002',
    sku: 'FNB-GEL-01',
    name: 'Es Krim Gelato Susu Sapi Murni',
    category: 'fnb_resto',
    categoryLabel: 'Kuliner & F&B',
    price: 18000,
    unit: 'Cup',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Utensils,
    description: 'Gelato homemade lembut dari susu segar murni tanpa pemanis buatan.'
  },
  {
    id: 'fnb_003',
    sku: 'FNB-NSB-01',
    name: 'Paket Nasi Timbel Ayam Bakar Saung Farm',
    category: 'fnb_resto',
    categoryLabel: 'Kuliner & F&B',
    price: 35000,
    unit: 'Porsi',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Utensils,
    description: 'Nasi timbel komplit ayam bakar madu, tahu, tempe, lalapan & sambal terasi.'
  },
  {
    id: 'fnb_004',
    sku: 'FNB-KLP-01',
    name: 'Kelapa Muda Batok Segar Organik',
    category: 'fnb_resto',
    categoryLabel: 'Kuliner & F&B',
    price: 20000,
    unit: 'Butir',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: Utensils,
    description: 'Kelapa muda utuh petik segar dari kebun farm, disajikan dingin alami.'
  },

  // Merchandise & Bibit
  {
    id: 'sou_001',
    sku: 'SOU-BBT-01',
    name: 'Bibit Tanaman Sayur & Buah Organik',
    category: 'souvenir_farm',
    categoryLabel: 'Merchandise & Bibit',
    price: 15000,
    unit: 'Polibag',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: ShoppingBag,
    description: 'Bibit siap tanam: Tomat Cherry, Cabai Rawit, Selada Romaine, atau Terung.'
  },
  {
    id: 'sou_002',
    sku: 'SOU-PPK-01',
    name: 'Pupuk Kompos Organik D\'Kandang 5kg',
    category: 'souvenir_farm',
    categoryLabel: 'Merchandise & Bibit',
    price: 25000,
    unit: 'Karung',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: ShoppingBag,
    description: 'Pupuk kandang fermentasi mikroba aktif untuk kesuburan tanah tanaman hias.'
  },
  {
    id: 'sou_003',
    sku: 'SOU-KAO-01',
    name: 'Kaos Edukasi D\'Kandang Amazing Farm',
    category: 'souvenir_farm',
    categoryLabel: 'Merchandise & Bibit',
    price: 75000,
    unit: 'Pcs',
    badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
    icon: ShoppingBag,
    description: 'Kaos katun combed 30s premium sablon ilustrasi maskot satwa D\'Kandang.'
  }
];

export interface CartItem {
  item: TicketCatalogItem;
  quantity: number;
}

export interface TicketSaleReceipt {
  ticketNumber: string;
  dateTime: string;
  customerName: string;
  customerType: string;
  cashierName: string;
  paymentMethod: 'cash' | 'qris' | 'transfer' | 'debit';
  targetAccount: string;
  items: {
    sku: string;
    name: string;
    price: number;
    quantity: number;
    total: number;
    unit: string;
  }[];
  subtotal: number;
  discount: number;
  totalGross: number;
  companyOperatingPortion70: number;
  reservePortion30: number;
  cashTendered?: number;
  changeAmount?: number;
  notes?: string;
}

export default function TicketCashierPOS() {
  const { 
    bankAccounts, 
    cashTransactions, 
    addCashTransaction, 
    currentUser, 
    showNotification 
  } = useERP();

  // Sub-Tab Navigation: Terminal Kasir vs Riwayat Transaksi Tiket
  const [posSubTab, setPosSubTab] = useState<'terminal' | 'history'>('terminal');

  // History Sub-Tab Filters & Search States
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<'all' | 'cash' | 'qris' | 'transfer' | 'debit'>('all');
  const [historyDatePreset, setHistoryDatePreset] = useState<'all' | 'today' | '7days' | 'month'>('today');

  // POS Filter & Search
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'ticket_gate' | 'ride_activity' | 'fnb_resto' | 'souvenir_farm'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Customer details
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Pengunjung Walk-in');
  const [customerType, setCustomerType] = useState<'walkin' | 'school' | 'family' | 'b2b'>('walkin');
  const [counterNumber, setCounterNumber] = useState('Loket 01 - Gerbang Utama');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'transfer' | 'debit'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  
  // Target Bank / Cash Account
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    const kasAccount = findTargetBankAccount(bankAccounts, 'FINANCE CASH') || findTargetBankAccount(bankAccounts, 'BCA - IBU');
    return kasAccount ? kasAccount.id : (bankAccounts[0]?.id || 'bank_004');
  });

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<TicketSaleReceipt | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Item Modal
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');
  const [customItemCategory, setCustomItemCategory] = useState<'ticket_gate' | 'ride_activity' | 'fnb_resto' | 'souvenir_farm'>('ticket_gate');

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    return TICKET_CATALOG.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchSearch = searchQuery === '' || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, ci) => sum + (ci.item.price * ci.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountPercent <= 0) return 0;
    return Math.round((cartSubtotal * discountPercent) / 100);
  }, [cartSubtotal, discountPercent]);

  const totalGross = useMemo(() => {
    return Math.max(0, cartSubtotal - discountAmount);
  }, [cartSubtotal, discountAmount]);

  // THE 70% USABLE OPERATING PORTION & 30% RESERVE PORTION
  const operatingPortion70 = useMemo(() => {
    return Math.round(totalGross * 0.70);
  }, [totalGross]);

  const reservePortion30 = useMemo(() => {
    return totalGross - operatingPortion70;
  }, [totalGross, operatingPortion70]);

  const cashTenderedNum = useMemo(() => {
    return parseFloat(cashTendered.replace(/[^0-9.-]+/g, '')) || 0;
  }, [cashTendered]);

  const changeAmount = useMemo(() => {
    if (paymentMethod !== 'cash') return 0;
    return Math.max(0, cashTenderedNum - totalGross);
  }, [paymentMethod, cashTenderedNum, totalGross]);

  // Today's POS Stats from Cash Transactions
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTicketTx = useMemo(() => {
    return cashTransactions.filter(t => 
      t.type === 'inflow' && 
      (t.incomeSource === 'ticket_gate' || (t.referenceNo && t.referenceNo.startsWith('TIK-')) || (t.description && t.description.toLowerCase().includes('kasir tiket'))) &&
      (t.date === todayStr || t.receivedDate === todayStr)
    );
  }, [cashTransactions, todayStr]);

  const todayTotalOmset = useMemo(() => {
    return todayTicketTx.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [todayTicketTx]);

  const todayOperating70 = useMemo(() => {
    return Math.round(todayTotalOmset * 0.70);
  }, [todayTotalOmset]);

  const todayReserve30 = useMemo(() => {
    return todayTotalOmset - todayOperating70;
  }, [todayTotalOmset, todayOperating70]);

  // All POS Ticket Transactions (Inflows from ticket gate or reference TIK-)
  const allTicketTransactions = useMemo(() => {
    return cashTransactions.filter(t => 
      t.type === 'inflow' && 
      (
        t.incomeSource === 'ticket_gate' || 
        (t.referenceNo && t.referenceNo.startsWith('TIK-')) || 
        (t.description && t.description.toLowerCase().includes('kasir tiket')) || 
        (t.description && t.description.toLowerCase().includes('pos tiket'))
      )
    );
  }, [cashTransactions]);

  const filteredTicketHistory = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const monthStart = new Date().toISOString().slice(0, 7) + '-01';

    return allTicketTransactions.filter(tx => {
      const txDate = tx.receivedDate || tx.date;

      // Date preset
      if (historyDatePreset === 'today' && txDate !== today) return false;
      if (historyDatePreset === '7days' && txDate < sevenDaysAgo) return false;
      if (historyDatePreset === 'month' && txDate < monthStart) return false;

      // Payment method
      if (historyPaymentFilter !== 'all') {
        const descLower = (tx.description || '').toLowerCase();
        const accLower = (tx.sourceAccount || '').toLowerCase();
        if (historyPaymentFilter === 'cash' && !descLower.includes('tunai') && !accLower.includes('kas') && !accLower.includes('loket') && !accLower.includes('tunai')) return false;
        if (historyPaymentFilter === 'qris' && !descLower.includes('qris') && !accLower.includes('qris')) return false;
        if (historyPaymentFilter === 'transfer' && !descLower.includes('transfer') && !accLower.includes('bca') && !accLower.includes('mandiri') && !accLower.includes('bsi')) return false;
        if (historyPaymentFilter === 'debit' && !descLower.includes('debit') && !descLower.includes('edc')) return false;
      }

      // Search engine
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const matchRef = (tx.referenceNo || '').toLowerCase().includes(q);
        const matchDesc = (tx.description || '').toLowerCase().includes(q);
        const matchEntity = (tx.linkedEntityName || '').toLowerCase().includes(q);
        const matchUser = (tx.recordedBy || '').toLowerCase().includes(q);
        const matchAccount = (tx.sourceAccount || '').toLowerCase().includes(q);
        if (!matchRef && !matchDesc && !matchEntity && !matchUser && !matchAccount) return false;
      }

      return true;
    }).sort((a, b) => {
      const da = (a.receivedDate || a.date) + (a.id || '');
      const db = (b.receivedDate || b.date) + (b.id || '');
      return db.localeCompare(da);
    });
  }, [allTicketTransactions, historyDatePreset, historyPaymentFilter, historySearchQuery]);

  const {
    currentData: paginatedTicketHistory,
    currentPage: historyCurrentPage,
    totalPages: historyTotalPages,
    totalItems: historyTotalItems,
    itemsPerPage: historyItemsPerPage,
    nextPage: historyNextPage,
    prevPage: historyPrevPage
  } = usePagination(filteredTicketHistory, 10);

  // History Financial Summary
  const historySummary = useMemo(() => {
    const totalOmset = filteredTicketHistory.reduce((sum, t) => sum + (t.amount || 0), 0);
    const operating70 = Math.round(totalOmset * 0.70);
    const reserve30 = totalOmset - operating70;
    return {
      totalOmset,
      operating70,
      reserve30,
      count: filteredTicketHistory.length
    };
  }, [filteredTicketHistory]);

  const handleExportTicketHistory = () => {
    try {
      const headers = [
        'No Tiket',
        'Tanggal Transaksi',
        'Tanggal Penerimaan',
        'Pengunjung',
        'Rincian Transaksi',
        'Sumber Rekening / Loket',
        'Omset Kotor (Rp)',
        'Porsi Operasional 70% (Rp)',
        'Porsi Cadangan 30% (Rp)',
        'Status',
        'Kasir'
      ];
      const rows = filteredTicketHistory.map(tx => [
        tx.referenceNo || `TIK-${tx.id.slice(-6)}`,
        tx.date,
        tx.receivedDate || tx.date,
        tx.linkedEntityName || 'Pengunjung Umum',
        tx.description,
        tx.sourceAccount,
        tx.amount,
        Math.round((tx.amount || 0) * 0.70),
        (tx.amount || 0) - Math.round((tx.amount || 0) * 0.70),
        tx.status,
        (tx as any).recordedBy || tx.approvedBy || currentUser.name
      ]);
      exportToCSV(`riwayat_tiket_pos_${new Date().toISOString().split('T')[0]}`, headers, rows);
      showNotification('Riwayat transaksi kasir tiket berhasil diekspor!', 'success');
    } catch (e) {
      showNotification('Gagal mengekspor riwayat tiket.', 'error');
    }
  };

  const handleReprintReceipt = (tx: CashTransaction) => {
    let matchedReceipt: TicketSaleReceipt | null = null;
    try {
      const existingStr = localStorage.getItem('dkandang_pos_receipts');
      if (existingStr) {
        const list: TicketSaleReceipt[] = JSON.parse(existingStr);
        matchedReceipt = list.find(r => r.ticketNumber === tx.referenceNo) || null;
      }
    } catch (e) {}

    if (!matchedReceipt) {
      const totalGross = tx.amount || 0;
      const op70 = Math.round(totalGross * 0.70);
      const res30 = totalGross - op70;
      matchedReceipt = {
        ticketNumber: tx.referenceNo || `TIK-${tx.id.slice(-6)}`,
        dateTime: `${tx.receivedDate || tx.date} 09:00:00`,
        customerName: tx.linkedEntityName || 'Pengunjung Umum',
        customerType: 'Pengunjung Reguler',
        cashierName: (tx as any).recordedBy || tx.approvedBy || currentUser.name,
        paymentMethod: (tx.description?.toLowerCase().includes('qris') ? 'qris' : tx.description?.toLowerCase().includes('transfer') ? 'transfer' : 'cash'),
        targetAccount: tx.sourceAccount || "Kas Loket D'Kandang",
        items: [
          {
            sku: 'TKT-REG-POS',
            name: tx.description.replace(/^Penjualan Kasir Tiket POS \[[^\]]+\]:\s*/, '') || 'Tiket Masuk & Layanan Farm',
            price: totalGross,
            quantity: 1,
            total: totalGross,
            unit: 'Paket/Pax'
          }
        ],
        subtotal: totalGross,
        discount: 0,
        totalGross,
        companyOperatingPortion70: op70,
        reservePortion30: res30
      };
    }

    setActiveReceipt(matchedReceipt);
  };

  // Cart operations
  const addToCart = (item: TicketCatalogItem, qty: number = 1) => {
    soundManager.playClick();
    setCart(prev => {
      const existing = prev.find(ci => ci.item.id === item.id);
      if (existing) {
        return prev.map(ci => ci.item.id === item.id ? { ...ci, quantity: ci.quantity + qty } : ci);
      }
      return [...prev, { item, quantity: qty }];
    });
  };

  const updateQuantity = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(ci => ci.item.id === itemId ? { ...ci, quantity: newQty } : ci));
  };

  const removeFromCart = (itemId: string) => {
    soundManager.playClick();
    setCart(prev => prev.filter(ci => ci.item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setCashTendered('');
    setNotes('');
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(customItemPrice.replace(/[^0-9.-]+/g, '')) || 0;
    const qtyNum = parseInt(customItemQty) || 1;
    if (!customItemName.trim() || priceNum <= 0) return;

    const newItem: TicketCatalogItem = {
      id: `custom_${Date.now()}`,
      sku: `CUS-${Date.now().toString().slice(-4)}`,
      name: customItemName.trim(),
      category: customItemCategory,
      categoryLabel: 'Custom Loket',
      price: priceNum,
      unit: 'Item',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      icon: Tag,
      description: 'Tiket/item kustom loket kasir'
    };

    addToCart(newItem, qtyNum);
    setShowCustomItemModal(false);
    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    showNotification(`Item kustom "${newItem.name}" ditambahkan ke keranjang`, 'success');
  };

  // Quick Preset Cash Tendered buttons
  const setQuickCash = (amount: number) => {
    setCashTendered(amount.toString());
  };

  // Complete & Process Checkout
  const handleProcessCheckout = async () => {
    if (cart.length === 0) {
      showNotification('Keranjang masih kosong! Silakan pilih tiket/wahana terlebih dahulu.', 'warning');
      return;
    }

    if (paymentMethod === 'cash' && cashTenderedNum < totalGross) {
      showNotification(`Jumlah uang tunai yang diterima (Rp ${cashTenderedNum.toLocaleString('id-ID')}) kurang dari total tagihan (Rp ${totalGross.toLocaleString('id-ID')})!`, 'error');
      return;
    }

    setIsProcessing(true);

    try {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateOnlyStr = now.toISOString().split('T')[0];
      const ticketNum = `TIK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;

      // Resolve bank account
      const matchedBank = bankAccounts.find(b => b.id === selectedBankId) || bankAccounts[0];
      const bankNameResolved = matchedBank ? matchedBank.bankName : "Kas Kasir Tiket & Gerbang Utama D'Kandang (Tunai)";

      // Determine dominant category for cash transaction
      const hasFnb = cart.some(ci => ci.item.category === 'fnb_resto');
      const hasDairy = cart.some(ci => ci.item.category === 'souvenir_farm');
      const incomeCategory = hasFnb ? 'resto_fnb' : (hasDairy ? 'dairy_product' : 'ticket_gate');

      const itemsSummary = cart.map(ci => `${ci.item.name} (${ci.quantity}x)`).join(', ');

      // 1. Create real-time cash transaction
      await addCashTransaction({
        date: dateOnlyStr,
        receivedDate: dateOnlyStr,
        type: 'inflow',
        category: 'operating',
        description: `Penjualan Kasir Tiket POS [${ticketNum}]: ${itemsSummary}`,
        amount: totalGross,
        sourceAccount: bankNameResolved,
        referenceNo: ticketNum,
        status: 'completed',
        incomeSource: incomeCategory,
        paymentStage: 'full',
        linkedEntityName: customerName.trim() || 'Pengunjung Umum'
      });

      // 2. Prepare receipt
      const receipt: TicketSaleReceipt = {
        ticketNumber: ticketNum,
        dateTime: `${dateOnlyStr} ${timeStr}`,
        customerName: customerName.trim() || 'Pengunjung Walk-in',
        customerType: customerType === 'school' ? 'Rombongan Sekolah' : customerType === 'family' ? 'Wisata Keluarga' : customerType === 'b2b' ? 'Corporate / B2B' : 'Walk-in Reguler',
        cashierName: currentUser.name,
        paymentMethod,
        targetAccount: bankNameResolved,
        items: cart.map(ci => ({
          sku: ci.item.sku,
          name: ci.item.name,
          price: ci.item.price,
          quantity: ci.quantity,
          total: ci.item.price * ci.quantity,
          unit: ci.item.unit
        })),
        subtotal: cartSubtotal,
        discount: discountAmount,
        totalGross,
        companyOperatingPortion70: operatingPortion70,
        reservePortion30: reservePortion30,
        cashTendered: paymentMethod === 'cash' ? cashTenderedNum : undefined,
        changeAmount: paymentMethod === 'cash' ? changeAmount : undefined,
        notes: notes.trim() || undefined
      };

      // Play success audio
      soundManager.playSuccessTone();
      showNotification(`Transaksi Tiket ${ticketNum} Sukses! 70% Dana Operasional (Rp ${operatingPortion70.toLocaleString('id-ID')}) dialirkan ke anggaran perusahaan.`, 'success');

      try {
        const existingStr = localStorage.getItem('dkandang_pos_receipts');
        const existingList: TicketSaleReceipt[] = existingStr ? JSON.parse(existingStr) : [];
        const updatedList = [receipt, ...existingList.filter(r => r.ticketNumber !== receipt.ticketNumber)].slice(0, 100);
        localStorage.setItem('dkandang_pos_receipts', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('Could not store receipt in localStorage', e);
      }

      setActiveReceipt(receipt);
      clearCart();
    } catch (err: any) {
      showNotification('Gagal memproses transaksi tiket. Silakan coba lagi.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner - POS Dashboard Info & Today's 70/30 Metric */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl border border-emerald-800 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                POS TIKET & WAHANA AKTIF
              </span>
              <span className="text-xs text-slate-300">
                Kasir: <strong className="text-white font-semibold">{currentUser.name}</strong> ({ROLE_LABELS[currentUser.role] || currentUser.role})
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Ticket className="w-5 h-5 text-emerald-400" />
              Kasir Loket Tiket, Wahana & F&B D'Kandang Farm
            </h2>
            <p className="text-xs text-emerald-200/80 max-w-2xl">
              Setiap transaksi tiket langsung dicatat real-time ke arus kas: <strong className="text-amber-300 font-semibold">70% otomatis dialokasikan untuk Dana Operasional Perusahaan</strong> dan <strong className="text-blue-300 font-semibold">30% dialokasikan ke Cadangan/Bagi Hasil</strong>.
            </p>
          </div>

          {/* Realtime Live Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full lg:w-auto">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 p-2.5 rounded-xl">
              <div className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">Omset Hari Ini (100%)</div>
              <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                {formatRupiah(todayTotalOmset)}
              </div>
              <div className="text-[10px] text-slate-400">{todayTicketTx.length} Transaksi Selesai</div>
            </div>

            <div className="bg-amber-500/15 backdrop-blur-xs border border-amber-400/30 p-2.5 rounded-xl">
              <div className="text-[10px] text-amber-200 uppercase tracking-wider font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Dana Operasional (70%)
              </div>
              <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">
                {formatRupiah(todayOperating70)}
              </div>
              <div className="text-[10px] text-amber-200/70">Dapat Digunakan Perusahaan</div>
            </div>

            <div className="bg-blue-500/15 backdrop-blur-xs border border-blue-400/30 p-2.5 rounded-xl col-span-2 sm:col-span-1">
              <div className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-blue-300" /> Cadangan / Bagi Hasil (30%)
              </div>
              <div className="text-sm font-bold text-blue-300 font-mono mt-0.5">
                {formatRupiah(todayReserve30)}
              </div>
              <div className="text-[10px] text-blue-200/70">Terproteksi Khusus</div>
            </div>
          </div>
        </div>
      </div>

      {/* POS Sub-Tabs Navigation */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-semibold overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setPosSubTab('terminal')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            posSubTab === 'terminal'
              ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4" /> Terminal Kasir (POS)
        </button>

        <button
          type="button"
          onClick={() => setPosSubTab('history')}
          className={`pb-3 px-3.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            posSubTab === 'history'
              ? 'border-emerald-600 text-emerald-800 font-bold bg-emerald-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" /> Riwayat Transaksi & Tiket Terbit
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            posSubTab === 'history' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {allTicketTransactions.length}
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: Terminal Kasir POS */}
      {posSubTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Catalog & Selection (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filter & Search Bar */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'all' 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Semua Item
                </button>
                <button
                  onClick={() => setSelectedCategory('ticket_gate')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'ticket_gate' 
                      ? 'bg-emerald-700 text-white shadow-xs' 
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Ticket className="w-3.5 h-3.5" /> Tiket Masuk & Paket
                </button>
                <button
                  onClick={() => setSelectedCategory('ride_activity')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'ride_activity' 
                      ? 'bg-blue-700 text-white shadow-xs' 
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Wahana & Satwa
                </button>
                <button
                  onClick={() => setSelectedCategory('fnb_resto')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'fnb_resto' 
                      ? 'bg-rose-700 text-white shadow-xs' 
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" /> Saung Resto & F&B
                </button>
                <button
                  onClick={() => setSelectedCategory('souvenir_farm')}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${
                    selectedCategory === 'souvenir_farm' 
                      ? 'bg-slate-800 text-white shadow-xs' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" /> Merchandise & Bibit
                </button>
              </div>

              {/* Custom Item Button */}
              <button
                onClick={() => setShowCustomItemModal(true)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> + Tiket Kustom
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari tiket, wahana, pakan satwa, resto atau merchandise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredCatalog.map(item => {
              const inCartItem = cart.find(ci => ci.item.id === item.id);
              const IconComponent = item.icon;

              return (
                <div 
                  key={item.id}
                  className={`bg-white border rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                    inCartItem ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-slate-200'
                  }`}
                >
                  {item.popular && (
                    <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                      Favorit
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.badgeColor}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-slate-400 font-mono block">
                          {item.sku}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                          {item.name}
                        </h4>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {formatRupiah(item.price)}
                      </div>
                      <span className="text-[10px] text-slate-400">/{item.unit}</span>
                    </div>

                    {inCartItem ? (
                      <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                        <button
                          onClick={() => updateQuantity(item.id, inCartItem.quantity - 1)}
                          className="w-6 h-6 rounded-lg bg-white text-emerald-800 flex items-center justify-center hover:bg-emerald-100 cursor-pointer shadow-2xs text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-emerald-900">
                          {inCartItem.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, inCartItem.quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 cursor-pointer shadow-2xs text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item, 1)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Pilih
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-2">
              <Ticket className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Tidak ada tiket atau item yang cocok</h4>
              <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau ganti kategori filter.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: POS Terminal & Checkout (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
            
            {/* Terminal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-white tracking-wide">Terminal Kasir & Keranjang Tiket</h3>
                  <div className="text-[10px] text-slate-400">{counterNumber}</div>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[10px] font-semibold text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Reset
                </button>
              )}
            </div>

            {/* Customer & Loket Inputs */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Nama Pengunjung / Rombongan
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: Bpk Ahmad / SDN 01 Depok"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Kategori Pengunjung
                  </label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer"
                  >
                    <option value="walkin">Walk-in Umum</option>
                    <option value="family">Wisata Keluarga</option>
                    <option value="school">Rombongan Sekolah</option>
                    <option value="b2b">Corporate / Komunitas</option>
                  </select>
                </div>
              </div>

              {/* Rekening Penampung Kasir */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                  Rekening Penerima / Kas Loket
                </label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 font-medium cursor-pointer font-mono"
                >
                  {bankAccounts.filter(b => !b.isRestricted).map(b => (
                    <option key={b.id} value={b.id}>
                      {b.bankName} ({b.accountNumber}) - Saldo: Rp {b.balance.toLocaleString('id-ID')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="p-4 flex-1 max-h-72 overflow-y-auto divide-y divide-slate-100">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">Keranjang tiket masih kosong.</p>
                  <p className="text-[10px] text-slate-400">Pilih tiket atau wahana dari katalog di sebelah kiri.</p>
                </div>
              ) : (
                cart.map(ci => (
                  <div key={ci.item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{ci.item.name}</h5>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatRupiah(ci.item.price)} x {ci.quantity} {ci.item.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}
                          className="w-5 h-5 rounded bg-white text-slate-700 flex items-center justify-center hover:bg-slate-200 cursor-pointer font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-slate-800">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                          className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 cursor-pointer font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-xs font-bold text-slate-900 font-mono w-20 text-right">
                        {formatRupiah(ci.item.price * ci.quantity)}
                      </div>

                      <button
                        onClick={() => removeFromCart(ci.item.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & The 70% Operating Rule Highlight Box */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              
              {/* Discount / Voucher Bar */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" /> Diskon Promosi (%):
                </span>
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 20].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setDiscountPercent(pct)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        discountPercent === pct 
                          ? 'bg-emerald-700 text-white' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {pct === 0 ? '0%' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subtotal Rows */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Tiket:</span>
                  <span className="font-mono font-medium">{formatRupiah(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Potongan Diskon ({discountPercent}%):</span>
                    <span className="font-mono font-medium">-{formatRupiah(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total Omset (Gross):</span>
                  <span className="font-mono text-emerald-700 text-base">{formatRupiah(totalGross)}</span>
                </div>
              </div>

              {/* GOLDEN RULE 70/30 SPLIT BOX */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50 to-blue-50 border border-amber-200/80 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> 
                    70% Dana Operasional Perusahaan:
                  </span>
                  <span className="text-amber-900 font-mono">{formatRupiah(operatingPortion70)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-blue-600" /> 
                    30% Porsi Cadangan / Non-Operasional:
                  </span>
                  <span className="font-mono text-blue-800 font-semibold">{formatRupiah(reservePortion30)}</span>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight pt-0.5">
                  *Plafon pengeluaran operasional perusahaan terhubung langsung dengan alokasi 70% omset ini.
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'cash' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Tunai</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('qris')}
                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'qris' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span className="text-[10px]">QRIS</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('transfer')}
                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'transfer' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Transfer</span>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('debit')}
                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      paymentMethod === 'debit' 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span className="text-[10px]">EDC Debit</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered Calculator (if Cash) */}
              {paymentMethod === 'cash' && (
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Uang Diterima (Rp)</label>
                    <div className="flex gap-1">
                      {[totalGross, 50000, 100000, 200000].filter(a => a >= totalGross).slice(0, 3).map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setQuickCash(amt)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-700 cursor-pointer"
                        >
                          {amt === totalGross ? 'Pas' : `${amt / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="number"
                    placeholder="Masukkan nominal uang tunai..."
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />

                  {cashTenderedNum > 0 && (
                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                      <span className="text-slate-500 font-medium">Uang Kembalian:</span>
                      <span className={`font-mono font-bold ${changeAmount >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatRupiah(changeAmount)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* QRIS / Transfer Information Preview */}
              {paymentMethod === 'qris' && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                    <QrCode className="w-7 h-7 text-slate-800" />
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <div className="font-bold text-slate-900">QRIS Dinamis Siap Scan</div>
                    <div>Tampilkan QRIS di layar/loket, pembayaran otomatis diverifikasi.</div>
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <button
                disabled={cart.length === 0 || isProcessing}
                onClick={handleProcessCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all uppercase tracking-wider"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Memproses Transaksi...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Bayar & Terbitkan E-Tiket ({formatRupiah(totalGross)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* SUB-TAB 2: Riwayat Transaksi & Tiket Terbit */}
      {posSubTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Omset Tiket (Riwayat)</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                {formatRupiah(historySummary.totalOmset)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dari {historySummary.count} transaksi loket tersaring
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 text-amber-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Porsi Operasional (70%)
              </span>
              <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
                {formatRupiah(historySummary.operating70)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dialokasikan ke kas operasional
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1 text-blue-700">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Cadangan / Bagi Hasil (30%)
              </span>
              <div className="text-xl font-bold text-blue-700 mt-1 font-mono">
                {formatRupiah(historySummary.reserve30)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Dana terproteksi perusahaan
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">Total Tiket Terbit</span>
              <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                {filteredTicketHistory.length} Lembar
              </div>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Transaksi tervalidasi
              </div>
            </div>
          </div>

          {/* Clean Tab Filter Bar & Search Engine */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3.5">
            {/* Tab Filter Metode Pembayaran */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setHistoryPaymentFilter('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    historyPaymentFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Semua Metode
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    historyPaymentFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {allTicketTransactions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryPaymentFilter('cash')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    historyPaymentFilter === 'cash'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  Tunai / Kas
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryPaymentFilter('qris')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    historyPaymentFilter === 'qris'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QRIS Dinamis
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryPaymentFilter('transfer')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    historyPaymentFilter === 'transfer'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Transfer Bank
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryPaymentFilter('debit')}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    historyPaymentFilter === 'debit'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  EDC Debit
                </button>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportTicketHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Unduh riwayat transaksi kasir tiket ke CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor CSV</span>
              </button>
            </div>

            {/* Search Engine & Date Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari no. tiket TIK-..., pengunjung, kasir, atau item tiket..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date Preset Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px] font-medium hidden md:inline">Rentang:</span>
                  <select
                    value={historyDatePreset}
                    onChange={(e) => setHistoryDatePreset(e.target.value as any)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="today">Hari Ini</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="month">Bulan Ini</option>
                    <option value="all">Semua Waktu</option>
                  </select>
                </div>

                {(historySearchQuery || historyPaymentFilter !== 'all' || historyDatePreset !== 'today') && (
                  <button
                    type="button"
                    onClick={() => {
                      setHistorySearchQuery('');
                      setHistoryPaymentFilter('all');
                      setHistoryDatePreset('today');
                    }}
                    className="px-2.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table List of Ticket Sales */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-emerald-700" /> Log Transaksi & Arsip Struk Loket
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rekap penjualan tiket gerbang, wahana, dan F&B farm terhubung otomatis ke rekening kasir.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                Menampilkan {paginatedTicketHistory.length} dari {filteredTicketHistory.length} Tiket
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse table-auto">
                <thead className="bg-slate-50 text-[10px] sm:text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-[18%]">No. Tiket & Waktu</th>
                    <th className="p-3 w-[16%]">Pengunjung</th>
                    <th className="p-3 w-[24%]">Rincian Tiket / Item</th>
                    <th className="p-3 w-[14%]">Rekening / Jalur</th>
                    <th className="p-3 text-right w-[14%]">Omset Bruto</th>
                    <th className="p-3 text-right w-[14%]">70% Ops / 30% Cad</th>
                    <th className="p-3 text-center w-[10%]">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedTicketHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600 text-sm">Tidak ada transaksi tiket yang cocok</p>
                        <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau ganti filter rentang tanggal.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedTicketHistory.map((tx) => {
                      const totalGross = tx.amount || 0;
                      const op70 = Math.round(totalGross * 0.70);
                      const res30 = totalGross - op70;
                      const desc = tx.description || '';
                      const isQris = desc.toLowerCase().includes('qris');
                      const isTransfer = desc.toLowerCase().includes('transfer');
                      const isDebit = desc.toLowerCase().includes('debit');

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3">
                            <div className="font-bold font-mono text-emerald-800 flex items-center gap-1.5">
                              <Ticket className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{tx.referenceNo || `TIK-${tx.id.slice(-6)}`}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatDate(tx.receivedDate || tx.date)}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-bold text-slate-800">
                              {tx.linkedEntityName || 'Pengunjung Walk-in'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Kasir: <strong className="text-slate-600">{(tx as any).recordedBy || tx.approvedBy || currentUser.name}</strong>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="text-slate-700 text-xs font-medium line-clamp-2" title={desc}>
                              {desc.replace(/^Penjualan Kasir Tiket POS \[[^\]]+\]:\s*/, '') || 'Tiket Loket Masuk'}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isQris ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                                isTransfer ? 'bg-purple-50 text-purple-800 border border-purple-200' :
                                isDebit ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                                'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {isQris ? 'QRIS' : isTransfer ? 'TRANSFER' : isDebit ? 'DEBIT' : 'TUNAI'}
                              </span>
                              <span className="text-[10px] text-slate-400">• Lunas</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="font-medium text-slate-800 text-xs truncate max-w-[140px]" title={tx.sourceAccount}>
                              {tx.sourceAccount}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Arus Kas Masuk
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono font-bold text-emerald-700 text-xs">
                            {formatRupiah(totalGross)}
                          </td>

                          <td className="p-3 text-right">
                            <div className="font-mono text-[11px] font-bold text-amber-800" title="70% Dana Operasional Perusahaan">
                              {formatRupiah(op70)} <span className="text-[9px] text-amber-600 font-normal">(70%)</span>
                            </div>
                            <div className="font-mono text-[10px] text-blue-700 mt-0.5" title="30% Cadangan / Bagi Hasil">
                              {formatRupiah(res30)} <span className="text-[9px] text-blue-500 font-normal">(30%)</span>
                            </div>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex flex-col gap-1 items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleReprintReceipt(tx)}
                                className="w-full px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-xs cursor-pointer whitespace-nowrap"
                                title="Buka dan cetak ulang struk thermal transaksi ini"
                              >
                                <Printer className="w-3 h-3" /> Struk
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(tx.referenceNo || tx.id);
                                  showNotification('No. Tiket disalin ke clipboard!', 'success');
                                }}
                                className="w-full px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-medium transition flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <Copy className="w-2.5 h-2.5" /> Salin No
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={historyCurrentPage}
              totalPages={historyTotalPages}
              totalItems={historyTotalItems}
              itemsPerPage={historyItemsPerPage}
              onNext={historyNextPage}
              onPrev={historyPrevPage}
            />
          </div>
        </div>
      )}

      {/* MODAL: Thermal E-Ticket Receipt & QR Validation */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
            
            {/* Receipt Modal Header */}
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-300" />
                <span className="text-xs font-bold">Struk E-Tiket Wisata Resmi</span>
              </div>
              <button
                onClick={() => setActiveReceipt(null)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Paper Container */}
            <div className="p-6 bg-white space-y-4 text-slate-800 font-sans" id="printable-e-ticket">
              
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-black text-sm flex items-center justify-center mx-auto shadow-2xs">
                  D'K
                </div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                  PT D'KANDANG AMAZING FARM
                </h3>
                <p className="text-[10px] text-slate-500">
                  Jl. Pasir Putih No. 1, Sawangan, Depok - Jawa Barat
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  Telp: (021) 7788-7138 | NPWP: 01.345.678.9-412.000
                </p>
              </div>

              {/* Receipt Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-slate-300 pb-3 font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px]">NO. TIKET / STRUK:</span>
                  <strong className="text-slate-900">{activeReceipt.ticketNumber}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px]">WAKTU:</span>
                  <span className="text-slate-700">{activeReceipt.dateTime}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">PENGUNJUNG:</span>
                  <span className="text-slate-800 font-sans font-semibold">{activeReceipt.customerName} ({activeReceipt.customerType})</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[9px]">KASIR:</span>
                  <span className="text-slate-800 font-sans font-semibold">{activeReceipt.cashierName}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 border-b border-dashed border-slate-300 pb-3 text-xs">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Item / Wahana</span>
                  <span>Total (Rp)</span>
                </div>
                {activeReceipt.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">{it.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {it.quantity} x {formatRupiah(it.price)}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      {formatRupiah(it.total)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total & Payment Summary */}
              <div className="space-y-1.5 text-xs font-mono border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(activeReceipt.subtotal)}</span>
                </div>
                {activeReceipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(activeReceipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200 font-sans">
                  <span>TOTAL OMSET:</span>
                  <span className="font-mono text-emerald-800 text-base">{formatRupiah(activeReceipt.totalGross)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-[11px] pt-1">
                  <span>Metode Bayar:</span>
                  <span className="uppercase font-semibold text-slate-800">{activeReceipt.paymentMethod}</span>
                </div>
                {activeReceipt.cashTendered !== undefined && (
                  <>
                    <div className="flex justify-between text-slate-600 text-[11px]">
                      <span>Tunai Diterima:</span>
                      <span>{formatRupiah(activeReceipt.cashTendered)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 text-[11px] font-bold">
                      <span>Kembalian:</span>
                      <span className="text-emerald-700">{formatRupiah(activeReceipt.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* 70/30 Financial Allocation Transparency Badge */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] space-y-1 font-mono">
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Porsi Operasional Perusahaan (70%):</span>
                  <span className="text-emerald-800">{formatRupiah(activeReceipt.companyOperatingPortion70)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Porsi Cadangan / Non-Operasional (30%):</span>
                  <span>{formatRupiah(activeReceipt.reservePortion30)}</span>
                </div>
              </div>

              {/* QR Barcode Mockup */}
              <div className="text-center space-y-1 pt-1">
                <div className="font-mono text-[11px] font-black tracking-widest text-slate-900">
                  * {activeReceipt.ticketNumber} *
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Tunjukkan e-tiket ini kepada petugas di loket wahana / gerbang masuk.
                </p>
                <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold uppercase tracking-wider mt-1">
                  ✓ LUNAS - SISTEM OTOMATIS CLOUD
                </div>
              </div>
            </div>

            {/* Receipt Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Struk / Thermal
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`STRUK TIKET D'KANDANG: ${activeReceipt.ticketNumber}\nTotal: ${formatRupiah(activeReceipt.totalGross)}\nPengunjung: ${activeReceipt.customerName}`);
                  showNotification('Ringkasan struk disalin ke clipboard!', 'success');
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /> Salin Teks
              </button>

              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Selesai / Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Ticket / Item */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                Tambah Tiket / Item Khusus Loket
              </h3>
              <button
                onClick={() => setShowCustomItemModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Tiket / Layanan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paket Family Gathering Khusus"
                  value={customItemName}
                  onChange={(e) => setCustomItemName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    placeholder="Contoh: 50000"
                    value={customItemPrice}
                    onChange={(e) => setCustomItemPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Jumlah (Qty)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={customItemQty}
                    onChange={(e) => setCustomItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Kategori Akuntansi</label>
                <select
                  value={customItemCategory}
                  onChange={(e) => setCustomItemCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ticket_gate">Tiket Masuk & Wahana Gate</option>
                  <option value="ride_activity">Wahana Satwa & Aktivitas</option>
                  <option value="fnb_resto">Saung Resto & F&B</option>
                  <option value="souvenir_farm">Merchandise & Produk Farm</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                >
                  Tambahkan ke Keranjang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
