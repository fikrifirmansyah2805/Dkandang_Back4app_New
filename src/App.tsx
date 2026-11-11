/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import Header from './components/common/Header';
import Sidebar from './components/common/Sidebar';
import MobileNavBar from './components/common/MobileNavBar';
import RoleSwitcherModal from './components/common/RoleSwitcherModal';
import E2EEVaultModal from './components/common/E2EEVaultModal';
import NotificationCenterModal from './components/common/NotificationCenterModal';
import LoginScreen from './components/auth/LoginScreen';

// Lazy load Module Components for performance optimization
const ExecutiveDashboard = React.lazy(() => import('./components/dashboard/ExecutiveDashboard'));
const FinanceModule = React.lazy(() => import('./components/finance/FinanceModule'));
const AccountingModule = React.lazy(() => import('./components/accounting/AccountingModule'));
const MarketingModule = React.lazy(() => import('./components/marketing/MarketingModule'));
const SalesModule = React.lazy(() => import('./components/sales/SalesModule'));
const SalesProgressModule = React.lazy(() => import('./components/sales-progress/SalesProgressModule'));
const ProcurementModule = React.lazy(() => import('./components/procurement/ProcurementModule'));
const WarehouseModule = React.lazy(() => import('./components/warehouse/WarehouseModule'));
const AutomatedReportsModule = React.lazy(() => import('./components/reports/AutomatedReportsModule'));
const CustomTransactionReportsModule = React.lazy(() => import('./components/reports/CustomTransactionReportsModule'));
const SecurityModule = React.lazy(() => import('./components/security/SecurityModule'));

import { ShieldAlert, RefreshCw, Loader2, CloudOff, Info } from 'lucide-react';
import { ROLE_LABELS, MODULE_LABELS } from './utils/crypto';

// Fallback loader for Suspense
const ModuleLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 space-y-4">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    <p className="text-xs font-medium">Memuat Modul...</p>
  </div>
);

function MainAppLayout() {
  const { 
    isAuthenticated,
    activeModule, 
    viewportMode, 
    checkPermission, 
    currentUser, 
    showRoleSwitcher,
    setShowRoleSwitcher,
    showVaultModal,
    setShowVaultModal,
    setActiveModule,
    isQuotaExceeded
  } = useERP();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Determine viewport width simulation wrapper
  const getViewportClass = () => {
    switch (viewportMode) {
      case 'mobile':
        return 'max-w-sm mx-auto shadow-2xl border-x border-slate-200 my-4 rounded-3xl overflow-hidden min-h-[90vh] bg-white';
      case 'tablet':
        return 'max-w-3xl mx-auto shadow-2xl border-x border-slate-200 my-4 rounded-3xl overflow-hidden min-h-[90vh] bg-white';
      default:
        return 'w-full';
    }
  };

  const hasAccess = checkPermission(activeModule, 'view');

  const renderModuleContent = () => {
    if (!hasAccess) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-200 rounded-3xl space-y-4 max-w-lg mx-auto my-12 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Akses Modul Ditolak (RBAC Restriction)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Peran aktif Anda: <strong className="text-slate-900">{ROLE_LABELS[currentUser.role]}</strong> tidak memiliki otorisasi akses baca untuk <strong className="text-blue-700">Modul {MODULE_LABELS[activeModule]}</strong>.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowRoleSwitcher(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Ganti Peran User (RBAC Tester)
            </button>
            <button
              onClick={() => setActiveModule('dashboard')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold"
            >
              Kembali ke Dashboard
            </button>
          </div>
        </div>
      );
    }

    let content;
    switch (activeModule) {
      case 'dashboard':
        content = <ExecutiveDashboard />;
        break;
      case 'finance':
        content = <FinanceModule />;
        break;
      case 'accounting':
        content = <AccountingModule />;
        break;
      case 'marketing':
        content = <MarketingModule />;
        break;
      case 'sales':
        content = <SalesModule />;
        break;
      case 'sales_progress':
        content = <SalesProgressModule />;
        break;
      case 'procurement':
        content = <ProcurementModule />;
        break;
      case 'warehouse':
        content = <WarehouseModule />;
        break;
      case 'reports':
        content = <AutomatedReportsModule />;
        break;
      case 'custom_reports':
        content = <CustomTransactionReportsModule />;
        break;
      case 'security':
        content = <SecurityModule />;
        break;
      default:
        content = <ExecutiveDashboard />;
    }
    
    return (
      <Suspense fallback={<ModuleLoader />}>
        {content}
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] text-slate-800 flex flex-col antialiased selection:bg-emerald-200 selection:text-emerald-900 font-sans">
      
      <div className={`flex flex-col flex-1 ${getViewportClass()} bg-[#f4f7f6] transition-all duration-300`}>
        {/* Global Header */}
        <Header />

        {/* Firestore Quota Notice Banner */}
        {isQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900 shadow-xs z-20">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <CloudOff className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-amber-950">Mode Offline Aktif (Batas Kuota Firestore Harian Tercapai):</span>{' '}
                <span className="text-amber-800">
                  Penulisan cloud ditangguhkan hingga reset kuota harian (tengah malam waktu Pasifik). Semua transaksi dan data Anda tetap tersimpan utuh di penyimpanan lokal peramban.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="px-2 py-0.5 rounded-full bg-amber-200/70 border border-amber-300 text-[11px] font-medium text-amber-900">
                Spark Free Tier (20.000 writes/hari)
              </span>
              <a 
                href="https://firebase.google.com/pricing#cloud-firestore" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 flex items-center gap-1"
              >
                <Info className="w-3 h-3" /> Info Kuota
              </a>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Desktop/Tablet Sidebar */}
          <Sidebar />

          {/* Main Content Area */}
          <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-7 overflow-y-auto w-full max-w-[1600px] mx-auto pb-20 md:pb-8 transition-all duration-300">
            {renderModuleContent()}
          </main>
        </div>

        {/* Mobile Navigation Bar */}
        <MobileNavBar />
      </div>

      {/* Global Modals */}
      {showRoleSwitcher && <RoleSwitcherModal onClose={() => setShowRoleSwitcher(false)} />}
      {showVaultModal && <E2EEVaultModal onClose={() => setShowVaultModal(false)} />}
      <NotificationCenterModal />
    </div>
  );
}

export default function App() {
  return (
    <ERPProvider>
      <MainAppLayout />
    </ERPProvider>
  );
}
