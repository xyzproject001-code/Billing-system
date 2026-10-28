/**
 * HI Scale Desktop Application Shell
 * Pixel-accurate implementation matching reference image_15 (image_3b7833a9.png):
 * - Professional Royal Blue and Cyan color scheme (with zero orange)
 * - Dark Navy sidebar with geometric shop-awning icon in cyan and white
 * - Sidebar navigation with cyan highlight icons
 * - Blue-tinted "HI Scale Enterprise ACTIVE" card with cyan gradient button
 * - Clean white-dominant main workspace with Royal Blue and Cyan accents
 */

import React, { useState } from 'react';
import {
  Home,
  Users,
  ShoppingBag,
  FileText,
  ShoppingCart,
  TrendingUp,
  BarChart2,
  Wrench,
  Award,
  ChevronDown,
  ChevronRight,
  Plus,
  MessageCircle,
  Minimize2,
  Square,
  X,
  Wifi,
  Tv,
  Building2,
  RotateCcw,
  Zap,
  User,
  Scale,
  Printer,
  Server,
  AlertTriangle,
} from 'lucide-react';

import { Tenant, UserStaff } from '../types';

interface HiScaleDesktopShellProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  activeStaff: UserStaff;
  activeSection: string;
  onNavigate: (section: string) => void;
  onOpenAddItem: () => void;
  onOpenAddSale: () => void;
  onOpenAddPurchase: () => void;
  onOpenPlanModal: () => void;
  onOpenCustomerDisplay: () => void;
  onOpenHardwareHub?: () => void;
  onOpenSyncManager?: () => void;
  unresolvedDiscrepancyCount?: number;
  isOnline: boolean;
  onToggleOnline: () => void;
  outboxCount: number;
  onSyncOutbox: () => void;
  isSyncing: boolean;
  children: React.ReactNode;
}

export const HiScaleDesktopShell: React.FC<HiScaleDesktopShellProps> = ({
  tenants,
  activeTenant,
  onSelectTenant,
  activeStaff,
  activeSection,
  onNavigate,
  onOpenAddItem,
  onOpenAddSale,
  onOpenAddPurchase,
  onOpenPlanModal,
  onOpenCustomerDisplay,
  onOpenHardwareHub,
  onOpenSyncManager,
  unresolvedDiscrepancyCount = 0,
  isOnline,
  onToggleOnline,
  outboxCount,
  onSyncOutbox,
  isSyncing,
  children,
}) => {
  const [isSalesOrdersOpen, setIsSalesOrdersOpen] = useState(true);
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f4f6fa] text-slate-800 font-sans overflow-hidden select-none">
      {/* 1. Top Window Titlebar (Dark Blue / Deep Navy) */}
      <div className="no-print bg-[#080e1e] border-b border-slate-800/90 px-3.5 py-1.5 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center space-x-3.5">
          {/* HI Scale Logo: Geometric Shop-Edges / Awning Icon in Cyan & White */}
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2 font-black text-white cursor-pointer group"
          >
            {/* Geometric Awning Shop Icon */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Awning stripes */}
                <path d="M3 5H21V9.5C21 11 19.8 12.2 18.3 12.2C16.8 12.2 15.6 11 15.6 9.5V5H12V9.5C12 11 10.8 12.2 9.3 12.2C7.8 12.2 6.6 11 6.6 9.5V5H3V9.5C3 11 4.2 12.2 5.7 12.2" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 5H7.5V11C7.5 12 6.5 12.8 5.3 12.8C4 12.8 3 11.8 3 10.5V5Z" fill="#1d4ed8" />
                <path d="M7.5 5H12V11C12 12 11 12.8 9.8 12.8C8.5 12.8 7.5 11.8 7.5 10.5V5Z" fill="#38bdf8" />
                <path d="M12 5H16.5V11C16.5 12 15.5 12.8 14.3 12.8C13 12.8 12 11.8 12 10.5V5Z" fill="#ffffff" />
                <path d="M16.5 5H21V10.5C21 11.8 20 12.8 18.8 12.8C17.5 12.8 16.5 12 16.5 11V5Z" fill="#0284c7" />
                {/* Base Frame */}
                <path d="M4 12.5V19C4 19.6 4.4 20 5 20H19C19.6 20 20 19.6 20 19V12.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="8.5" y="14" width="7" height="6" rx="1" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1" />
              </svg>
            </div>

            {/* Brand Typography */}
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-white">HI Scale</span>
              <span className="text-[9px] uppercase font-bold bg-[#0284c7] text-white px-1.5 py-0.5 rounded shadow-xs tracking-wider">
                POS
              </span>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block" />

          {/* Desktop Menu Links */}
          <div className="hidden md:flex items-center space-x-3.5 text-slate-300 text-[11px] font-medium">
            <span
              onClick={() => onNavigate('home')}
              className="hover:text-white transition cursor-pointer"
            >
              Workspace
            </span>
            <button
              onClick={() => setShowShortcutsModal(true)}
              className="hover:text-white transition cursor-pointer flex items-center gap-1 bg-transparent border-0 p-0 text-inherit font-inherit text-[11px]"
            >
              <span>Shortcuts</span>
              <span className="text-[9px] bg-[#0c2340] text-cyan-400 px-1.5 py-0.2 rounded border border-cyan-500/40 font-mono font-bold">
                F1-F12
              </span>
            </button>
            <span
              onClick={onOpenPlanModal}
              className="hover:text-cyan-300 transition cursor-pointer text-cyan-400 font-semibold"
            >
              SaaS Tiers (₹299 / ₹699 / ₹1499)
            </span>
            <span
              onClick={() => window.location.reload()}
              className="hover:text-white transition cursor-pointer text-slate-400 hover:text-white"
              title="Reload App"
            >
              <RotateCcw className="w-3.5 h-3.5 inline" />
            </span>
          </div>
        </div>

        {/* Center Support & Live Resilience */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300">
            <span className="text-slate-400">Support Hotline:</span>
            <span className="text-emerald-400">
              <MessageCircle className="w-3.5 h-3.5 fill-current inline" />
            </span>
            <a
              href="https://wa.me/918050298743"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 font-bold hover:underline"
            >
              +91 8050 298 743
            </a>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Online Sync Indicator in bright cyan/mint green */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition ${
              isOnline
                ? 'bg-[#062024] text-cyan-300 border border-cyan-500/40'
                : 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
            }`}
            title="Toggle Online / Offline status"
          >
            <Wifi className="w-3 h-3 text-cyan-400" />
            <span>{isOnline ? 'Online Sync' : 'Offline Mode'}</span>
          </button>
        </div>

        {/* Right Window Controls */}
        <div className="flex items-center space-x-2 text-slate-400 pl-2">
          <Minimize2 className="w-3.5 h-3.5 hover:text-white cursor-pointer transition" />
          <Square className="w-3 h-3 hover:text-white cursor-pointer transition" />
          <X className="w-3.5 h-3.5 hover:text-rose-400 cursor-pointer transition" />
        </div>
      </div>

      {/* 2. Top Action Ribbon with Royal Blue & Cyan Accents */}
      <div className="no-print bg-white border-b border-slate-200/90 px-5 py-3 flex items-center justify-between gap-3 shrink-0 shadow-xs">
        {/* Active Store Name & Branch */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/80 animate-pulse shrink-0"></div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-black text-slate-900 text-lg tracking-tight">
                {activeTenant.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 border border-sky-200">
                {activeTenant.planTier} Tier
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              GSTIN: {activeTenant.gstNumber} &bull; Counter-01
            </p>
          </div>
        </div>

        {/* Action Controls: Royal Blue & Slate Buttons */}
        <div className="flex items-center space-x-2">
          {/* Hardware HAL & ESC/POS Button */}
          {onOpenHardwareHub && (
            <button
              onClick={onOpenHardwareHub}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 cursor-pointer"
              title="Hardware Peripherals Hub (ESC/POS Tamil, Weighing Scale, Barcode)"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden md:inline">Hardware HAL</span>
            </button>
          )}

          {/* Outbox Sync & Conflict Resolution Center */}
          {onOpenSyncManager && (
            <button
              onClick={onOpenSyncManager}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                unresolvedDiscrepancyCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : outboxCount > 0
                  ? 'bg-sky-50 text-sky-700 border-sky-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Outbox Sync Queue & Manager Conflict Resolution"
            >
              {unresolvedDiscrepancyCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              ) : (
                <Server className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {unresolvedDiscrepancyCount > 0
                  ? `${unresolvedDiscrepancyCount} Stock Conflict!`
                  : outboxCount > 0
                  ? `Outbox (${outboxCount})`
                  : 'Sync Hub'}
              </span>
            </button>
          )}

          {/* Customer Facing Display Modal */}
          <button
            onClick={onOpenCustomerDisplay}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer"
            title="Launch Customer Facing QR Screen"
          >
            <Tv className="w-4 h-4 text-slate-600" />
          </button>


          {/* + Add Sale (F1) in bold Royal Blue */}
          <button
            onClick={onOpenAddSale}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Sale (F1)</span>
          </button>

          {/* + Add Purchase in dark slate */}
          <button
            onClick={onOpenAddPurchase}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Purchase</span>
          </button>

          {/* + New Item Master in Royal Blue */}
          <button
            onClick={onOpenAddItem}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-sm transition"
            title="Add New Product / Dish"
          >
            +
          </button>
        </div>
      </div>

      {/* 3. Main Workspace: Dark Navy Sidebar (#080e1e) + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Dark Navy-Blue Sidebar */}
        <aside className="no-print w-64 bg-[#080e1e] text-slate-300 flex flex-col justify-between shrink-0 select-none overflow-y-auto border-r border-slate-800">
          <div className="p-3 space-y-1">
            {/* Sidebar Navigation Items in Soft White & Gray */}
            <nav className="space-y-1 text-xs font-medium">
              {/* 1. POS Counter & Products */}
              <div
                onClick={() => onNavigate('pos')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                  activeSection === 'pos'
                    ? 'bg-blue-600/20 text-cyan-400 font-bold border-l-2 border-cyan-400'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <span>POS Counter & Products</span>
              </div>

              {/* 2. Recipe BOM & Raw Materials */}
              <div
                onClick={() => onNavigate('bom')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                  activeSection === 'bom'
                    ? 'bg-blue-600/20 text-cyan-400 font-bold border-l-2 border-cyan-400'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <span>Recipe BOM & Raw Materials</span>
              </div>

              {/* 3. Sales & Orders (Nested) */}
              <div>
                <div
                  onClick={() => setIsSalesOrdersOpen(!isSalesOrdersOpen)}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-slate-800/60 text-slate-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <span className="font-semibold text-white">Sales & Orders</span>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isSalesOrdersOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {isSalesOrdersOpen && (
                  <div className="pl-6 pr-2 py-1 space-y-1 text-[11px]">
                    <div
                      onClick={() => onNavigate('pos')}
                      className={`py-2 px-3 rounded-lg cursor-pointer transition ${
                        activeSection === 'pos'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      POS Billing Counter [Ctrl+T]
                    </div>
                    <div
                      onClick={() => onNavigate('tables')}
                      className={`py-2 px-3 rounded-lg cursor-pointer transition ${
                        activeSection === 'tables'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      Restaurant Tables & KOT
                    </div>
                    <div
                      onClick={() => onNavigate('invoices')}
                      className={`py-2 px-3 rounded-lg cursor-pointer transition ${
                        activeSection === 'invoices'
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                      }`}
                    >
                      Bills & Audit History
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Purchase & Transfers */}
              <div
                onClick={() => {
                  setIsPurchaseOpen(!isPurchaseOpen);
                  onNavigate('bom');
                }}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-slate-800/60 text-slate-300 hover:text-white transition"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-4 h-4 text-cyan-400" />
                  <span>Purchase & Transfers</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>

              {/* 5. Reports & GSTR-1 GST */}
              <div
                onClick={() => onNavigate('reports')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                  activeSection === 'reports'
                    ? 'bg-blue-600/20 text-cyan-400 font-bold border-l-2 border-cyan-400'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Reports & GSTR-1 GST</span>
              </div>

              {/* 6. Hotel Room-Folios */}
              <div
                onClick={() => onNavigate('folios')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition ${
                  activeSection === 'folios'
                    ? 'bg-blue-600/20 text-cyan-400 font-bold border-l-2 border-cyan-400'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <Wrench className="w-4 h-4 text-cyan-400" />
                <span>Hotel Room-Folios</span>
              </div>

              {/* 7. Subscription Tiers with Cyan Highlight Icon */}
              <div
                onClick={onOpenPlanModal}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer hover:bg-slate-800/60 text-slate-300 hover:text-cyan-300 transition"
              >
                <Award className="w-4 h-4 text-cyan-400" />
                <span>Subscription Tiers</span>
              </div>
            </nav>
          </div>

          {/* Bottom Sidebar: Blue-tinted "HI Scale Enterprise ACTIVE" Card + Profile Pill */}
          <div className="p-3 border-t border-slate-800 space-y-3 text-xs">
            {/* Blue-Tinted HI Scale Enterprise Card */}
            <div className="bg-[#0b1736] rounded-2xl p-3 border border-cyan-500/30 shadow-lg space-y-2.5">
              <div className="flex justify-between items-center text-[11px] font-bold text-white">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>HI Scale Enterprise</span>
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider">
                  ACTIVE
                </span>
              </div>
              <button
                onClick={onOpenPlanModal}
                className="w-full py-2 px-3 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white rounded-xl font-bold text-[11px] flex items-center justify-between transition shadow-md shadow-cyan-500/20"
              >
                <span>View Entitlement Matrix</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Pill: Murugan Provisions & Kirana */}
            <div className="bg-[#0b1328] border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden">
                <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="font-semibold text-white text-xs truncate">
                  {activeTenant.name}
                </span>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-700/80 flex items-center justify-center text-slate-300 shrink-0 ml-1">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center Main Viewport */}
        <main className="flex-1 bg-[#f8fafd] overflow-y-auto">{children}</main>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#080e1e] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-white">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold text-sm">HI Scale Keyboard Shortcuts</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-700/50 px-2 py-0.5 rounded font-mono">F1-F12</span>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Add Sale / POS Billing</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">F1</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Change Item Quantity</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">F2</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">New Bill Tab</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">Ctrl + T</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Close Bill Tab</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">Ctrl + W</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Reverse Loose Weight Calc</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">F6</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">Save & Print Thermal</span>
                  <span className="bg-[#0c2340] text-cyan-400 font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40">Ctrl + P</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center pt-2">
                Designed for high-speed counter operations with tactile barcode scanners and weighing scales.
              </p>
            </div>
            <div className="px-5 py-3 bg-[#050a16] border-t border-slate-800 text-right">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
