import React, { useState } from 'react';
import { useERP } from '../../context/ERPContext';
import { Lead, LeadFollowUp } from '../../types';
import { formatRupiah } from '../../utils/crypto';
import { 
  getLeadStudentPax, 
  getLeadTotalPax, 
  getLeadPackage, 
  getLeadEventDate, 
  getLeadSalesRep, 
  getLeadProbability 
} from '../../utils/salesProgressHelper';
import { 
  X, 
  Plus, 
  Calendar, 
  MessageSquare, 
  Phone, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  Sparkles, 
  TrendingUp, 
  Mail,
  AlertCircle
} from 'lucide-react';

interface Props {
  lead?: Lead | null;
  onClose: () => void;
}

export default function LogProgressModal({ lead, onClose }: Props) {
  const { leads, addLeadFollowUp, updateLeadDetails, updateLeadStage, currentUser } = useERP();

  // If no lead passed, default to first lead or empty
  const [selectedLeadId, setSelectedLeadId] = useState<string>(lead?.id || leads[0]?.id || '');
  const activeLead = leads.find(l => l.id === selectedLeadId) || lead || leads[0];

  // Stage & Probability
  const [stage, setStage] = useState<Lead['stage']>(activeLead?.stage || 'qualified');
  const [probability, setProbability] = useState<number>(activeLead ? getLeadProbability(activeLead) : 25);
  const [dealValue, setDealValue] = useState<number>(activeLead?.dealValue || 0);
  const [participantsCount, setParticipantsCount] = useState<number>(activeLead ? getLeadStudentPax(activeLead) : 0);
  const [targetEventDate, setTargetEventDate] = useState<string>(activeLead ? getLeadEventDate(activeLead) : '');

  // Interaction Details
  const [actionType, setActionType] = useState<'WhatsApp' | 'Telepon' | 'Survey Lokasi' | 'Meeting Proposal' | 'Email'>('WhatsApp');
  const [actionDate, setActionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');
  const [nextAction, setNextAction] = useState<string>('');
  const [nextActionDate, setNextActionDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // When changing selected lead from dropdown
  const handleLeadChange = (id: string) => {
    setSelectedLeadId(id);
    const chosen = leads.find(l => l.id === id);
    if (chosen) {
      setStage(chosen.stage || 'qualified');
      setProbability(getLeadProbability(chosen));
      setDealValue(chosen.dealValue || 0);
      setParticipantsCount(getLeadStudentPax(chosen));
      setTargetEventDate(getLeadEventDate(chosen));
    }
  };

  const handleStageChange = (newStage: Lead['stage']) => {
    setStage(newStage);
    if (newStage === 'won') setProbability(100);
    else if (newStage === 'lost') setProbability(0);
    else if (newStage === 'negotiation') setProbability(75);
    else if (newStage === 'proposal') setProbability(50);
    else if (newStage === 'qualified') setProbability(25);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLead) return;

    setIsSubmitting(true);
    try {
      // 1. Add follow-up log if note is provided or action selected
      if (note.trim() || actionType) {
        const followUpPayload: LeadFollowUp = {
          id: `FLW-${Date.now()}`,
          date: actionDate || new Date().toISOString().split('T')[0],
          user: currentUser.name || 'Staff Sales',
          action: actionType,
          note: note.trim() || `Pencatatan progres ${actionType} dengan PIC`,
          nextAction: nextAction.trim() || undefined,
          nextActionDate: nextActionDate || undefined,
          salesPerson: currentUser.name
        };
        await addLeadFollowUp(activeLead.id, followUpPayload);
      }

      // 2. Update lead attributes
      await updateLeadDetails(activeLead.id, {
        stage,
        probability,
        dealValue,
        participantsCount,
        targetEventDate
      });

      // 3. Update stage explicitly if changed
      if (stage !== activeLead.stage) {
        await updateLeadStage(activeLead.id, stage);
      }

      onClose();
    } catch (err) {
      console.error('Error logging sales progress:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Catat Interaksi & Progres Sales</h3>
              <p className="text-xs text-slate-500">Perbarui tahapan pipeline, probabilitas, dan tindak lanjut rombongan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Target Lead Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Rombongan / Sekolah Prospek <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedLeadId}
              onChange={(e) => handleLeadChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              required
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company || l.name} — PIC: {l.name} ({formatRupiah(l.dealValue || 0)})
                </option>
              ))}
            </select>
          </div>

          {/* Pipeline Stage & Probability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahap Pipeline</label>
              <select
                value={stage}
                onChange={(e) => handleStageChange(e.target.value as Lead['stage'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="qualified">1. Prospek Masuk (Qualified)</option>
                <option value="proposal">2. Penawaran & SPH (Proposal)</option>
                <option value="negotiation">3. Negosiasi & Survey (Negotiation)</option>
                <option value="won">4. Closing / Menang (Won)</option>
                <option value="lost">5. Batal / Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Probabilitas Closing: <strong>{probability}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value))}
                className="w-full accent-emerald-600 mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Deal Value & Student Pax */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nilai Deal (IDR)</label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Siswa</label>
              <input
                type="number"
                value={participantsCount}
                onChange={(e) => setParticipantsCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tgl Kunjungan</label>
              <input
                type="date"
                value={targetEventDate}
                onChange={(e) => setTargetEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Follow-Up Action Type & Date */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Rincian Interaksi / Follow-Up Baru</h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Metode Interaksi</label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="WhatsApp">WhatsApp Chat</option>
                  <option value="Telepon">Panggilan Telepon</option>
                  <option value="Survey Lokasi">Survey Lokasi Farm</option>
                  <option value="Meeting Proposal">Meeting & Presentasi SPH</option>
                  <option value="Email">Email Korespondensi</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Interaksi</label>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Catatan Hasil Interaksi & Respon PIC <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Contoh: Sudah konfirmasi jadwal tanggal 15 Juli, guru meminta tambahan paket souvenir dan DP dibayarkan minggu depan..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Rencana Tindak Lanjut</label>
                <input
                  type="text"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  placeholder="Contoh: Kirim invoice DP / SPH Revisi"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Follow-Up Berikutnya</label>
                <input
                  type="date"
                  value={nextActionDate}
                  onChange={(e) => setNextActionDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Submit Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Progres Sales'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
