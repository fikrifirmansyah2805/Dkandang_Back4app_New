import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { 
  formatRupiah, 
  formatCompactRupiah, 
  formatDate 
} from '../../utils/crypto';
import { 
  Megaphone, 
  Plus, 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  BarChart2, 
  Layers, 
  X,
  Sparkles,
  ArrowUpRight,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { MarketingCampaign } from '../../types';

export default function MarketingModule() {
  const { 
    marketingCampaigns, 
    addMarketingCampaign, 
    updateMarketingCampaign,
    deleteMarketingCampaign,
    currentUser,
    checkPermission,
    setActiveModule
  } = useERP();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MarketingCampaign | null>(null);

  // Form State Tambah
  const [campName, setCampName] = useState('');
  const [campChannel, setCampChannel] = useState<'Google Ads' | 'Meta Ads' | 'Email Marketing' | 'SEO / Content' | 'Event Expo' | 'Partnership'>('Google Ads');
  const [campBudget, setCampBudget] = useState('');
  const [campStartDate, setCampStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [campEndDate, setCampEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [campAudience, setCampAudience] = useState('');

  // Form State Edit
  const [editName, setEditName] = useState('');
  const [editChannel, setEditChannel] = useState<'Google Ads' | 'Meta Ads' | 'Email Marketing' | 'SEO / Content' | 'Event Expo' | 'Partnership'>('Google Ads');
  const [editBudget, setEditBudget] = useState('');
  const [editSpent, setEditSpent] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'completed' | 'paused' | 'planning'>('active');
  const [editLeads, setEditLeads] = useState('');
  const [editConversions, setEditConversions] = useState('');
  const [editAudience, setEditAudience] = useState('');

  const totalBudget = marketingCampaigns.reduce((acc, c) => acc + c.budget, 0);
  const totalSpent = marketingCampaigns.reduce((acc, c) => acc + c.spent, 0);
  const totalLeads = marketingCampaigns.reduce((acc, c) => acc + c.leadsGenerated, 0);
  const totalConversions = marketingCampaigns.reduce((acc, c) => acc + c.conversions, 0);
  const averageROI = marketingCampaigns.length > 0
    ? Math.round(marketingCampaigns.reduce((acc, c) => acc + c.roiPercentage, 0) / marketingCampaigns.length)
    : 0;

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campName || !campBudget) return;

    await addMarketingCampaign({
      name: campName,
      channel: campChannel,
      budget: Number(campBudget),
      startDate: campStartDate,
      endDate: campEndDate,
      status: 'active',
      targetAudience: campAudience || 'Kepala Sekolah & Panitia Field Trip'
    });

    setShowAddModal(false);
    setCampName('');
    setCampBudget('');
    setCampAudience('');
  };

  const handleOpenEdit = (c: MarketingCampaign) => {
    setEditingCampaign(c);
    setEditName(c.name);
    setEditChannel(c.channel);
    setEditBudget(String(c.budget));
    setEditSpent(String(c.spent));
    setEditStartDate(c.startDate);
    setEditEndDate(c.endDate);
    setEditStatus(c.status);
    setEditLeads(String(c.leadsGenerated));
    setEditConversions(String(c.conversions));
    setEditAudience(c.targetAudience);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    await updateMarketingCampaign(editingCampaign.id, {
      name: editName,
      channel: editChannel,
      budget: Number(editBudget) || 0,
      spent: Number(editSpent) || 0,
      startDate: editStartDate,
      endDate: editEndDate,
      status: editStatus,
      leadsGenerated: Number(editLeads) || 0,
      conversions: Number(editConversions) || 0,
      targetAudience: editAudience
    });

    setEditingCampaign(null);
  };

  const handleDelete = async (c: MarketingCampaign) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kegiatan promosi "${c.name}"?`)) {
      await deleteMarketingCampaign(c.id);
    }
  };

  const canCreate = checkPermission('marketing', 'create');

  return (
    <div className="space-y-6 pb-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Megaphone className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Promosi & Pemasaran Eduwisata</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan iklan media sosial, brosur sekolah, pameran pendidikan, dan pantauan calon rombongan yang tertarik.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Kegiatan Promosi Baru
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Anggaran Promosi</span>
          <div className="text-xl font-bold text-slate-800 mt-1">{formatCompactRupiah(totalBudget)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Terpakai: <span className="text-rose-700 font-bold">{formatCompactRupiah(totalSpent)}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Calon Sekolah Tertarik (Tanya Info)</span>
          <div className="text-xl font-bold text-blue-700 mt-1">{totalLeads} Sekolah & Rombongan</div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" /> Biaya per Peminat: Rp 740 Rb
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Berhasil Menjadi Pesanan Resmi</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">{totalConversions} Sekolah Sepakat</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Persentase Berhasil: <strong className="text-slate-800">{totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0}%</strong>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Hasil Imbal Balik Biaya Promosi</span>
          <div className="text-xl font-bold text-emerald-700 mt-1">+{averageROI}% Untung</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            Sangat Menguntungkan
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="font-bold text-xs text-slate-800">Daftar Kegiatan Promosi & Iklan Berjalan</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Dapat ditambah, diedit target & anggarannya, atau dihapus kapan saja.</p>
          </div>
          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-mono font-bold">
            {marketingCampaigns.length} Kegiatan Terdaftar
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          {marketingCampaigns.map((c) => {
            const percentBudget = c.budget > 0 ? Math.min(100, Math.round((c.spent / c.budget) * 100)) : 0;

            return (
              <div key={c.id} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="pr-4">
                    <h4 className="font-bold text-slate-800 text-sm">{c.name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-medium">
                        {c.channel}
                      </span>
                      <span>{formatDate(c.startDate)} s/d {formatDate(c.endDate)}</span>
                    </div>
                  </div>

                  {/* Edit & Delete Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 text-slate-600 hover:text-blue-700 transition-colors shadow-2xs cursor-pointer"
                      title="Edit Detail Kegiatan Promosi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors shadow-2xs cursor-pointer"
                      title="Hapus Kegiatan Promosi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    c.status === 'completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    c.status === 'paused' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {c.status === 'active' ? 'Aktif' : c.status === 'completed' ? 'Selesai' : c.status === 'paused' ? 'Dijeda' : 'Rencana'}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">Target: {c.targetAudience}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Penyerapan Anggaran:</span>
                    <strong className="text-slate-800 font-mono">{formatCompactRupiah(c.spent)} / {formatCompactRupiah(c.budget)} ({percentBudget}%)</strong>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${percentBudget}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Peminat (Leads)</span>
                    <strong className="text-blue-700 font-bold text-sm">{c.leadsGenerated}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Pesanan Deal</span>
                    <strong className="text-emerald-700 font-bold text-sm">{c.conversions}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">ROI</span>
                    <strong className="text-emerald-700 font-bold text-sm">+{c.roiPercentage}%</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Buat Kampanye Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-700" /> Buat Kegiatan Promosi Baru
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kegiatan Promosi / Iklan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Paket Edukasi Kunjungan TK/SD Semester Ganjil 2026"
                  value={campName}
                  onChange={(e) => setCampName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kanal Promosi:</label>
                  <select
                    value={campChannel}
                    onChange={(e) => setCampChannel(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Google Ads">Google Ads (Pencarian)</option>
                    <option value="Meta Ads">Meta Ads (IG & FB)</option>
                    <option value="Email Marketing">Email Penawaran Sekolah</option>
                    <option value="Event Expo">Pameran Edu Expo</option>
                    <option value="SEO / Content">Konten Edukasi Medsos</option>
                    <option value="Partnership">Kemitraan Dinas / Yayasan</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plafon Anggaran (Rp):</label>
                  <input
                    type="number"
                    required
                    placeholder="Contoh: 15000000"
                    value={campBudget}
                    onChange={(e) => setCampBudget(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    required
                    value={campStartDate}
                    onChange={(e) => setCampStartDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Berakhir:</label>
                  <input
                    type="date"
                    required
                    value={campEndDate}
                    onChange={(e) => setCampEndDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Sasaran / Audiens:</label>
                <input
                  type="text"
                  placeholder="Contoh: Kepala Sekolah TK/SD Jabodetabek & Guru Pembina"
                  value={campAudience}
                  onChange={(e) => setCampAudience(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 border border-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Daftarkan Promosi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Kampanye Promosi */}
      {editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" /> Edit Detail Kegiatan Promosi
              </h3>
              <button onClick={() => setEditingCampaign(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Nama Kegiatan Promosi:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kanal Promosi:</label>
                  <select
                    value={editChannel}
                    onChange={(e) => setEditChannel(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Google Ads">Google Ads (Pencarian)</option>
                    <option value="Meta Ads">Meta Ads (IG & FB)</option>
                    <option value="Email Marketing">Email Penawaran Sekolah</option>
                    <option value="Event Expo">Pameran Edu Expo</option>
                    <option value="SEO / Content">Konten Edukasi Medsos</option>
                    <option value="Partnership">Kemitraan Dinas / Yayasan</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Kegiatan:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="active">Aktif Berjalan</option>
                    <option value="paused">Dijeda Sementara</option>
                    <option value="completed">Selesai (Ditutup)</option>
                    <option value="planning">Rencana Jadwal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Plafon Anggaran (Rp):</label>
                  <input
                    type="number"
                    required
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Realisasi Biaya Terpakai (Rp):</label>
                  <input
                    type="number"
                    required
                    value={editSpent}
                    onChange={(e) => setEditSpent(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jumlah Peminat (Leads):</label>
                  <input
                    type="number"
                    value={editLeads}
                    onChange={(e) => setEditLeads(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Konversi Pesanan Sepakat:</label>
                  <input
                    type="number"
                    value={editConversions}
                    onChange={(e) => setEditConversions(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Mulai:</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tanggal Berakhir:</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Sasaran / Audiens:</label>
                <input
                  type="text"
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCampaign(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 border border-slate-200 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
