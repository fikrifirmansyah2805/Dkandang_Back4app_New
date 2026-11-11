import React, { useState, useMemo } from 'react';
import { useERP } from '../../context/ERPContext';
import { PackageCostingSimulation } from '../../types';
import { formatRupiah } from '../../utils/crypto';
import { 
  Calculator, 
  Sparkles, 
  ArrowRight, 
  Save, 
  Trash2, 
  FileText, 
  TrendingUp, 
  Percent, 
  Users, 
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Utensils,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';

interface PresetPackage {
  name: string;
  targetPax: number;
  proposedPrice: number;
  variable: {
    fnbLunchBox: number;
    animalFeed: number;
    craftWorkshopKit: number;
    equipmentRental: number;
    souvenirWelcomeDrink: number;
    otherVariable: number;
  };
  fixed: {
    tourGuideHonor: number;
    areaCleaningDisinfection: number;
    soundAndSoundSystem: number;
    firstAidAndSafety: number;
    otherFixed: number;
  };
  overheadPct: number;
}

const PRESET_PACKAGES: PresetPackage[] = [
  {
    name: 'Paket Edukasi Ternak Pintar (TK/SD)',
    targetPax: 120,
    proposedPrice: 110000,
    variable: {
      fnbLunchBox: 25000,
      animalFeed: 12000,
      craftWorkshopKit: 15000,
      equipmentRental: 4000,
      souvenirWelcomeDrink: 6000,
      otherVariable: 2000
    },
    fixed: {
      tourGuideHonor: 600000,
      areaCleaningDisinfection: 150000,
      soundAndSoundSystem: 100000,
      firstAidAndSafety: 75000,
      otherFixed: 50000
    },
    overheadPct: 7
  },
  {
    name: 'Paket Farmer Adventure & Berkuda (SD/SMP)',
    targetPax: 90,
    proposedPrice: 145000,
    variable: {
      fnbLunchBox: 32000,
      animalFeed: 18000,
      craftWorkshopKit: 22000,
      equipmentRental: 8000,
      souvenirWelcomeDrink: 7500,
      otherVariable: 3500
    },
    fixed: {
      tourGuideHonor: 750000,
      areaCleaningDisinfection: 200000,
      soundAndSoundSystem: 150000,
      firstAidAndSafety: 100000,
      otherFixed: 75000
    },
    overheadPct: 8
  },
  {
    name: 'Paket Workshop Olahan Susu & Hidroponik (SMP/SMA)',
    targetPax: 75,
    proposedPrice: 165000,
    variable: {
      fnbLunchBox: 35000,
      animalFeed: 10000,
      craftWorkshopKit: 28000,
      equipmentRental: 10000,
      souvenirWelcomeDrink: 10000,
      otherVariable: 5000
    },
    fixed: {
      tourGuideHonor: 800000,
      areaCleaningDisinfection: 200000,
      soundAndSoundSystem: 150000,
      firstAidAndSafety: 100000,
      otherFixed: 100000
    },
    overheadPct: 9
  }
];

interface PackageCostingSimulatorProps {
  onApplyToQuotation?: (createdQuotationId: string) => void;
}

export default function PackageCostingSimulator({ onApplyToQuotation }: PackageCostingSimulatorProps) {
  const { 
    packageSimulations, 
    savePackageCostingSimulation, 
    deletePackageCostingSimulation, 
    convertSimulationToQuotationDraft,
    leads,
    showNotification
  } = useERP();

  // Form states
  const [packageName, setPackageName] = useState<string>('Paket Edukasi Ternak Pintar (TK/SD)');
  const [targetPax, setTargetPax] = useState<number>(120);
  const [proposedPricePerPax, setProposedPricePerPax] = useState<number>(110000);
  const [notes, setNotes] = useState<string>('');

  // Variable Costs
  const [fnbLunchBox, setFnbLunchBox] = useState<number>(25000);
  const [animalFeed, setAnimalFeed] = useState<number>(12000);
  const [craftWorkshopKit, setCraftWorkshopKit] = useState<number>(15000);
  const [equipmentRental, setEquipmentRental] = useState<number>(4000);
  const [souvenirWelcomeDrink, setSouvenirWelcomeDrink] = useState<number>(6000);
  const [otherVariable, setOtherVariable] = useState<number>(2000);

  // Fixed Costs
  const [tourGuideHonor, setTourGuideHonor] = useState<number>(600000);
  const [areaCleaningDisinfection, setAreaCleaningDisinfection] = useState<number>(150000);
  const [soundAndSoundSystem, setSoundAndSoundSystem] = useState<number>(100000);
  const [firstAidAndSafety, setFirstAidAndSafety] = useState<number>(75000);
  const [otherFixed, setOtherFixed] = useState<number>(50000);

  // Overhead %
  const [overheadPercentage, setOverheadPercentage] = useState<number>(7);

  // Convert modal
  const [convertingSimId, setConvertingSimId] = useState<string | null>(null);
  const [convertCustomerName, setConvertCustomerName] = useState<string>('');
  const [convertLeadId, setConvertLeadId] = useState<string>('');
  const [isProcessingConvert, setIsProcessingConvert] = useState<boolean>(false);

  // Load preset
  const handleLoadPreset = (preset: PresetPackage) => {
    setPackageName(preset.name);
    setTargetPax(preset.targetPax);
    setProposedPricePerPax(preset.proposedPrice);
    setFnbLunchBox(preset.variable.fnbLunchBox);
    setAnimalFeed(preset.variable.animalFeed);
    setCraftWorkshopKit(preset.variable.craftWorkshopKit);
    setEquipmentRental(preset.variable.equipmentRental);
    setSouvenirWelcomeDrink(preset.variable.souvenirWelcomeDrink);
    setOtherVariable(preset.variable.otherVariable);
    setTourGuideHonor(preset.fixed.tourGuideHonor);
    setAreaCleaningDisinfection(preset.fixed.areaCleaningDisinfection);
    setSoundAndSoundSystem(preset.fixed.soundAndSoundSystem);
    setFirstAidAndSafety(preset.fixed.firstAidAndSafety);
    setOtherFixed(preset.fixed.otherFixed);
    setOverheadPercentage(preset.overheadPct);
  };

  // Calculations
  const calculations = useMemo(() => {
    const validPax = Math.max(1, targetPax || 1);
    
    // 1. Total Variable per Pax
    const totalVariablePerPax = 
      (fnbLunchBox || 0) + 
      (animalFeed || 0) + 
      (craftWorkshopKit || 0) + 
      (equipmentRental || 0) + 
      (souvenirWelcomeDrink || 0) + 
      (otherVariable || 0);

    // 2. Total Fixed per Event
    const totalFixedEvent = 
      (tourGuideHonor || 0) + 
      (areaCleaningDisinfection || 0) + 
      (soundAndSoundSystem || 0) + 
      (firstAidAndSafety || 0) + 
      (otherFixed || 0);

    const fixedCostAllocatedPerPax = Math.round(totalFixedEvent / validPax);

    // 3. Overhead Cost per Pax
    const baseDirectCost = totalVariablePerPax + fixedCostAllocatedPerPax;
    const overheadCostAllocatedPerPax = Math.round((baseDirectCost * (overheadPercentage || 0)) / 100);

    // 4. Total HPP per Pax
    const totalHPPPerPax = totalVariablePerPax + fixedCostAllocatedPerPax + overheadCostAllocatedPerPax;

    // 5. Margin & Profit
    const grossProfitPerPax = proposedPricePerPax - totalHPPPerPax;
    const grossProfitMarginPercent = proposedPricePerPax > 0 
      ? (grossProfitPerPax / proposedPricePerPax) * 100 
      : 0;

    const totalRevenue = proposedPricePerPax * validPax;
    const totalTotalHPP = totalHPPPerPax * validPax;
    const totalGrossProfit = totalRevenue - totalTotalHPP;

    // 6. Break-Even Point (BEP Pax)
    // BEP Pax = Total Fixed Cost / (Price - Variable Cost per Pax)
    const contributionMarginPerPax = proposedPricePerPax - totalVariablePerPax - overheadCostAllocatedPerPax;
    const breakEvenPax = contributionMarginPerPax > 0 
      ? Math.ceil(totalFixedEvent / contributionMarginPerPax) 
      : 0;

    // 7. Max Recommended Discount (leave min 20% margin)
    const minSafePrice = Math.round(totalHPPPerPax / 0.8);
    const maxRecommendedDiscount = Math.max(0, proposedPricePerPax - minSafePrice);

    return {
      validPax,
      totalVariablePerPax,
      totalFixedEvent,
      fixedCostAllocatedPerPax,
      overheadCostAllocatedPerPax,
      totalHPPPerPax,
      grossProfitPerPax,
      grossProfitMarginPercent,
      totalRevenue,
      totalTotalHPP,
      totalGrossProfit,
      breakEvenPax,
      maxRecommendedDiscount
    };
  }, [
    targetPax,
    proposedPricePerPax,
    fnbLunchBox,
    animalFeed,
    craftWorkshopKit,
    equipmentRental,
    souvenirWelcomeDrink,
    otherVariable,
    tourGuideHonor,
    areaCleaningDisinfection,
    soundAndSoundSystem,
    firstAidAndSafety,
    otherFixed,
    overheadPercentage
  ]);

  const handleSaveSimulation = async () => {
    if (!packageName.trim()) {
      showNotification('Nama paket tidak boleh kosong', 'warning');
      return;
    }

    await savePackageCostingSimulation({
      packageName: packageName.trim(),
      targetPax: calculations.validPax,
      proposedPricePerPax,
      variableCostsPerPax: {
        fnbLunchBox,
        animalFeed,
        craftWorkshopKit,
        equipmentRental,
        souvenirWelcomeDrink,
        otherVariable
      },
      fixedCostsPerEvent: {
        tourGuideHonor,
        areaCleaningDisinfection,
        soundAndSoundSystem,
        firstAidAndSafety,
        otherFixed
      },
      overheadPercentage,
      totalVariablePerPax: calculations.totalVariablePerPax,
      fixedCostAllocatedPerPax: calculations.fixedCostAllocatedPerPax,
      overheadCostAllocatedPerPax: calculations.overheadCostAllocatedPerPax,
      totalHPPPerPax: calculations.totalHPPPerPax,
      grossProfitPerPax: calculations.grossProfitPerPax,
      grossProfitMarginPercent: calculations.grossProfitMarginPercent,
      breakEvenPax: calculations.breakEvenPax,
      maxRecommendedDiscount: calculations.maxRecommendedDiscount,
      notes: notes.trim() || undefined
    });
  };

  const handleExecuteConvert = async () => {
    if (!convertingSimId || !convertCustomerName.trim()) {
      showNotification('Pilih atau ketik nama sekolah calon pemesan', 'warning');
      return;
    }

    try {
      setIsProcessingConvert(true);
      const created = await convertSimulationToQuotationDraft(
        convertingSimId,
        convertCustomerName.trim(),
        convertLeadId || undefined
      );
      setConvertingSimId(null);
      setConvertCustomerName('');
      setConvertLeadId('');
      if (onApplyToQuotation) {
        onApplyToQuotation(created.id);
      }
    } catch (e) {
      console.error(e);
      showNotification('Gagal membuat draft penawaran', 'error');
    } finally {
      setIsProcessingConvert(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-semibold">
            <Calculator className="w-3.5 h-3.5" /> Kalkulator HPP & Simulasi Profit Rombongan
          </div>
          <h2 className="text-2xl font-black tracking-tight">Simulator Margin Paket Edukasi</h2>
          <p className="text-xs text-emerald-100/80 leading-relaxed">
            Hitung biaya riil per siswa (F&B, pakan, craft workshop, pemandu wisata) sebelum mengajukan penawaran harga. Cegah resiko rugi dan ketahui diskon batas aman secara transparan.
          </p>
        </div>

        {/* Quick Presets Buttons */}
        <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-emerald-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Preset Cepat:
          </span>
          {PRESET_PACKAGES.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleLoadPreset(preset)}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{preset.name.split(' (')[0]}</span>
              <span className="text-[10px] text-emerald-300 font-mono">Rp {preset.proposedPrice.toLocaleString('id-ID')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Inputs vs Live Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Form Inputs (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Section 1: Paket & Target Siswa */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800">1. Identitas Paket & Target Siswa</h3>
                <p className="text-[11px] text-slate-500">Tentukan nama paket dan jumlah rombongan yang disimulasikan</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Nama Paket Wisata</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="Contoh: Paket Edukasi Petik Buah & Perah Susu"
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Jumlah Siswa (Pax)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={targetPax}
                    onChange={(e) => setTargetPax(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full pl-3 pr-10 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-right font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">Pax</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Rencana Harga Jual ke Sekolah (per Pax)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">Rp</span>
                  <input
                    type="number"
                    step="1000"
                    value={proposedPricePerPax}
                    onChange={(e) => setProposedPricePerPax(Number(e.target.value) || 0)}
                    className="w-full pl-10 pr-3 py-2 text-xs font-black text-emerald-800 bg-emerald-50/50 border border-emerald-300 rounded-xl focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Alokasi Overhead Wisata (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={overheadPercentage}
                    onChange={(e) => setOverheadPercentage(Number(e.target.value) || 0)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-600 text-right font-mono"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">%</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Listrik, penyusutan fasilitas saung & kebun</span>
              </div>
            </div>
          </div>

          {/* Section 2: Variable Costs per Pax */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">2. Biaya Variabel per Siswa (Direct Variable Cost)</h3>
                  <p className="text-[11px] text-slate-500">Biaya yang bertambah secara proporsional sesuai jumlah siswa</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Subtotal Variabel/Pax</span>
                <span className="text-xs font-bold text-blue-700 font-mono">Rp {calculations.totalVariablePerPax.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Makan Siang (Bento Box Resto Sunda)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={fnbLunchBox}
                    onChange={(e) => setFnbLunchBox(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Pakan Edukasi (Rumput Kelinci/Kambing/Ikan)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={animalFeed}
                    onChange={(e) => setAnimalFeed(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Kit Workshop (Tanah Liat/Bibit Tanaman)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={craftWorkshopKit}
                    onChange={(e) => setCraftWorkshopKit(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Sewa Perlengkapan (Caping Petani & Sepatu Boot)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={equipmentRental}
                    onChange={(e) => setEquipmentRental(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Welcome Drink & Susu Cup Pasteurisasi</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={souvenirWelcomeDrink}
                    onChange={(e) => setSouvenirWelcomeDrink(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Biaya Variabel Lainnya</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="500"
                    value={otherVariable}
                    onChange={(e) => setOtherVariable(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Fixed Event Costs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">3. Biaya Tetap per Acara / Event Kunjungan</h3>
                  <p className="text-[11px] text-slate-500">Biaya rombongan yang dibagi rata ke seluruh siswa ({calculations.validPax} pax)</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-medium">Alokasi per Siswa</span>
                <span className="text-xs font-bold text-amber-700 font-mono">Rp {calculations.fixedCostAllocatedPerPax.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Honor Guide Pemandu Edukasi & Instruktur</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="50000"
                    value={tourGuideHonor}
                    onChange={(e) => setTourGuideHonor(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Kebersihan & Disinfeksi Area Saung</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="25000"
                    value={areaCleaningDisinfection}
                    onChange={(e) => setAreaCleaningDisinfection(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Sound System & Mic Wireless</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="25000"
                    value={soundAndSoundSystem}
                    onChange={(e) => setSoundAndSoundSystem(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">P3K, Paramedis & Asuransi Kecelakaan</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="25000"
                    value={firstAidAndSafety}
                    onChange={(e) => setFirstAidAndSafety(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] text-slate-600 block mb-1">Biaya Tetap Lainnya (Tenda/Banner Sekolah)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Rp</span>
                  <input
                    type="number"
                    step="25000"
                    value={otherFixed}
                    onChange={(e) => setOtherFixed(Number(e.target.value) || 0)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono text-right"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[11px] text-slate-600 block mb-1">Catatan Tambahan Spesifikasi Paket (Opsional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Termasuk pendamping guru gratis 5 orang, parkir bus gratis 2 unit..."
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveSimulation}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan Hasil Simulasi Ini
            </button>
          </div>
        </div>

        {/* Right Column: Instant Live Analysis KPIs (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Main Profit Card */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl space-y-5 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Analisis Keuntungan
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                calculations.grossProfitMarginPercent >= 40 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                  : calculations.grossProfitMarginPercent >= 25
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {calculations.grossProfitMarginPercent.toFixed(1)}% Gross Margin
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-slate-400">Total Proyeksi Laba Kotor (Event Ini)</span>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">
                {formatRupiah(calculations.totalGrossProfit)}
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">
                (Laba Bersih Rp {calculations.grossProfitPerPax.toLocaleString('id-ID')} / anak)
              </span>
            </div>

            {/* Breakdown Bars */}
            <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Harga Jual Diajukan:</span>
                <span className="font-bold font-mono text-white">Rp {proposedPricePerPax.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Biaya Variabel / Pax:</span>
                <span className="font-mono text-blue-300">- Rp {calculations.totalVariablePerPax.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Alokasi Biaya Tetap / Pax:</span>
                <span className="font-mono text-amber-300">- Rp {calculations.fixedCostAllocatedPerPax.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Alokasi Overhead ({overheadPercentage}%):</span>
                <span className="font-mono text-purple-300">- Rp {calculations.overheadCostAllocatedPerPax.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 font-bold text-sm">
                <span className="text-slate-200">Total HPP per Siswa:</span>
                <span className="font-mono text-amber-400">Rp {calculations.totalHPPPerPax.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>

          {/* BEP & Safety Indicator Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600" /> Titik Impas & Diskon Maksimal
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <span className="text-[10px] text-blue-700 font-semibold block uppercase">Titik Impas (BEP)</span>
                <div className="text-xl font-bold text-blue-900 font-mono">
                  {calculations.breakEvenPax} <span className="text-xs font-normal">Pax</span>
                </div>
                <p className="text-[10px] text-blue-600">
                  Minimal peserta agar tidak merugi: {calculations.breakEvenPax} siswa.
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] text-emerald-700 font-semibold block uppercase">Diskon Maksimal</span>
                <div className="text-xl font-bold text-emerald-900 font-mono">
                  Rp {calculations.maxRecommendedDiscount.toLocaleString('id-ID')}
                </div>
                <p className="text-[10px] text-emerald-700">
                  Batas nego harga tanpa memakan margin aman 20%.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Omset Penjualan Kotor:</span>
                <span className="font-bold text-slate-800 font-mono">{formatRupiah(calculations.totalRevenue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Modal HPP Event:</span>
                <span className="font-bold text-rose-700 font-mono">{formatRupiah(calculations.totalTotalHPP)}</span>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Tips Negosiasi Sales:</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Jika pihak sekolah meminta potongan harga lebih tinggi dari Rp {calculations.maxRecommendedDiscount.toLocaleString('id-ID')}/pax, pertimbangkan untuk menyesuaikan menu lunch box atau mengurangi item souvenir tanpa mengurangi standar keamanan dan edukasi.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Saved Simulations Archive */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800">Daftar Simulasi HPP Tersimpan ({packageSimulations.length})</h3>
          </div>
          <span className="text-[11px] text-slate-400">Tersinkronisasi ke cloud</span>
        </div>

        {packageSimulations.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            Belum ada simulasi HPP yang disimpan. Buat simulasi di atas dan klik tombol "Simpan Hasil Simulasi Ini".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                  <th className="py-2.5 px-3">Nama Paket</th>
                  <th className="py-2.5 px-3 text-right">Target Pax</th>
                  <th className="py-2.5 px-3 text-right">HPP / Pax</th>
                  <th className="py-2.5 px-3 text-right">Harga Jual</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                  <th className="py-2.5 px-3 text-right">BEP</th>
                  <th className="py-2.5 px-3">Disimulasikan Oleh</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {packageSimulations.map((sim) => (
                  <tr key={sim.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{sim.packageName}</div>
                      {sim.notes && <div className="text-[10px] text-slate-400 line-clamp-1">{sim.notes}</div>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">{sim.targetPax} pax</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">Rp {sim.totalHPPPerPax.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">Rp {sim.proposedPricePerPax.toLocaleString('id-ID')}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        sim.grossProfitMarginPercent >= 40 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sim.grossProfitMarginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700 font-semibold">{sim.breakEvenPax} pax</td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">
                      <div>{sim.simulatedBy}</div>
                      <div className="text-[10px] text-slate-400">{new Date(sim.createdAt).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setConvertingSimId(sim.id);
                            setConvertCustomerName('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                          title="Ubah Jadi Draft Surat Penawaran Resmi"
                        >
                          <FileText className="w-3 h-3" /> Buat Penawaran
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus simulasi "${sim.packageName}"?`)) {
                              deletePackageCostingSimulation(sim.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Hapus Simulasi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Convert Simulation to Quotation */}
      {convertingSimId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Konversi Simulasi ke Draft Penawaran</h3>
                  <p className="text-[10px] text-slate-500">Otomatis buat Surat Penawaran Harga (QTN) resmi</p>
                </div>
              </div>
              <button 
                onClick={() => setConvertingSimId(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Pilih dari Calon Rombongan (Leads) atau Ketik Manual:
                </label>
                <select
                  value={convertLeadId}
                  onChange={(e) => {
                    const lId = e.target.value;
                    setConvertLeadId(lId);
                    const found = leads.find(l => l.id === lId);
                    if (found) {
                      setConvertCustomerName(found.company);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl mb-2"
                >
                  <option value="">-- Ketik Nama Sekolah Baru Manual --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.company} ({l.name}) - {l.participantCount || 0} pax
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  required
                  placeholder="Nama Sekolah / Lembaga Pemesan..."
                  value={convertCustomerName}
                  onChange={(e) => setConvertCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs space-y-1">
                <span className="font-bold block">Detail yang Diteruskan:</span>
                <p className="text-[11px] text-emerald-800">
                  Draft penawaran akan terbit dengan item paket wisata, harga satuan Rp {packageSimulations.find(s => s.id === convertingSimId)?.proposedPricePerPax.toLocaleString('id-ID')}, dan perkiraan peserta {packageSimulations.find(s => s.id === convertingSimId)?.targetPax} pax.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConvertingSimId(null)}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isProcessingConvert || !convertCustomerName.trim()}
                onClick={handleExecuteConvert}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isProcessingConvert ? 'Membuat...' : 'Buat Draft Penawaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
