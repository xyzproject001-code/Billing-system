/**
 * Layer 1: Navigation Header & Multi-Tenant Context Switcher
 */

import React from 'react';
import {
  Building2,
  ChevronDown,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  Store,
  Wifi,
  WifiOff,
  Sparkles,
  QrCode,
  Tv,
} from 'lucide-react';
import { PlanTier, Tenant, UserStaff } from '../types';
import { PLANS } from '../services/entitlements';

interface HeaderNavProps {
  tenants: Tenant[];
  activeTenant: Tenant;
  onSelectTenant: (tenant: Tenant) => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  outboxCount: number;
  onSyncOutbox: () => void;
  isSyncing: boolean;
  activeStaff: UserStaff;
  onSwitchStaff: () => void;
  onOpenPlanModal: () => void;
  onOpenCustomerDisplay: () => void;
  activeTab: 'pos' | 'tables' | 'khata' | 'hq' | 'invoices';
  setActiveTab: (tab: 'pos' | 'tables' | 'khata' | 'hq' | 'invoices') => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  tenants,
  activeTenant,
  onSelectTenant,
  isOnline,
  onToggleOnline,
  outboxCount,
  onSyncOutbox,
  isSyncing,
  activeStaff,
  onSwitchStaff,
  onOpenPlanModal,
  onOpenCustomerDisplay,
  activeTab,
  setActiveTab,
}) => {
  const currentPlan = PLANS[activeTenant.planTier];

  const getTierBadgeColor = (tier: PlanTier) => {
    switch (tier) {
      case 'basic':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'high':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    }
  };

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none shadow-md">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Tenant Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-white">VyapaarOS</span>
                <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  SaaS POS
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Offline-First Cloud Billing</p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* Tenant Selector Dropdown */}
          <div className="relative group">
            <select
              value={activeTenant.id}
              onChange={(e) => {
                const found = tenants.find((t) => t.id === e.target.value);
                if (found) onSelectTenant(found);
              }}
              className="appearance-none bg-slate-800/90 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium py-1.5 pl-3 pr-8 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer transition shadow-inner"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.planTier.toUpperCase()} - ₹{PLANS[t.planTier].pricePerMonth}/mo)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Subscription Tier Badge */}
          <button
            onClick={onOpenPlanModal}
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition hover:brightness-110 ${getTierBadgeColor(
              activeTenant.planTier
            )}`}
            title="Click to view Entitlement Matrix & Tier Features"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{currentPlan.name.split(' ')[0]} (₹{currentPlan.pricePerMonth}/mo)</span>
          </button>
        </div>

        {/* Right Controls: Online Status, Outbox Sync, Customer Screen, Staff */}
        <div className="flex items-center gap-2">
          {/* Offline/Online Resilience Toggle */}
          <button
            onClick={onToggleOnline}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition ${
              isOnline
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/60'
                : 'bg-amber-950/80 text-amber-300 border-amber-800/80 animate-pulse'
            }`}
            title="Toggle between Online & Offline mode to test local resilience and zero-lag checkout"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold">Offline Mode</span>
              </>
            )}
          </button>

          {/* Outbox Sync Status */}
          {outboxCount > 0 ? (
            <button
              onClick={onSyncOutbox}
              disabled={isSyncing || !isOnline}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isOnline
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              }`}
              title={
                isOnline
                  ? `Click to sync ${outboxCount} pending offline bills to cloud`
                  : 'Pending bills will auto-sync once connection is restored'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>
                {isSyncing ? 'Syncing...' : `${outboxCount} in Outbox`}
              </span>
            </button>
          ) : (
            <div className="hidden xl:flex items-center gap-1 px-2 py-1 rounded bg-slate-800/60 text-slate-400 text-xs border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>All bills synced</span>
            </div>
          )}

          {/* Customer Facing Screen */}
          <button
            onClick={onOpenCustomerDisplay}
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition"
            title="Launch Customer Facing Display with Live Cart & QR"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Customer Display</span>
          </button>

          {/* Staff User */}
          <button
            onClick={onSwitchStaff}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
            title="Active Staff / Click to Switch Cashier / Manager"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[100px] truncate">{activeStaff.name}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs based on Tier Entitlements */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between border-t border-slate-800/80 bg-slate-900/60 overflow-x-auto text-xs">
        <div className="flex items-center space-x-1 sm:space-x-2 py-1.5">
          {/* POS Counter Tab - Available to all */}
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'pos'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>POS Counter (F1)</span>
          </button>

          {/* Table & KOT Management - Medium & High */}
          <button
            onClick={() => {
              if (activeTenant.planTier === 'basic') {
                onOpenPlanModal();
              } else {
                setActiveTab('tables');
              }
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-sm'
                : activeTenant.planTier === 'basic'
                ? 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/40 opacity-75'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {activeTenant.planTier === 'basic' && <Lock className="w-3 h-3 text-amber-500" />}
            <span>Tables & KOT</span>
            {activeTenant.planTier === 'basic' && (
              <span className="text-[9px] bg-slate-800 text-amber-400 px-1 py-0.2 rounded font-normal border border-slate-700">
                Medium+
              </span>
            )}
          </button>

          {/* Smart Khata Ledger - Available to all */}
          <button
            onClick={() => setActiveTab('khata')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'khata'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Smart Khata Ledger (F8)</span>
          </button>

          {/* Enterprise & Multi-Branch HQ - High Plan */}
          <button
            onClick={() => {
              if (activeTenant.planTier !== 'high') {
                onOpenPlanModal();
              } else {
                setActiveTab('hq');
              }
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'hq'
                ? 'bg-indigo-600 text-white shadow-sm'
                : activeTenant.planTier !== 'high'
                ? 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/40 opacity-75'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {activeTenant.planTier !== 'high' && <Lock className="w-3 h-3 text-amber-500" />}
            <Building2 className="w-3.5 h-3.5" />
            <span>HQ & BOM Recipes</span>
            {activeTenant.planTier !== 'high' && (
              <span className="text-[9px] bg-slate-800 text-purple-400 px-1 py-0.2 rounded font-normal border border-slate-700">
                High
              </span>
            )}
          </button>

          {/* Sales History & Invoices */}
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'invoices'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Bills & Audit</span>
          </button>
        </div>

        {/* Active Branch Display */}
        <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs py-1">
          <span className="text-slate-500">Branch:</span>
          <span className="text-slate-200 font-medium">
            {activeTenant.branches.find((b) => b.id === activeTenant.activeBranchId)?.name || 'Main Counter'}
          </span>
        </div>
      </div>
    </header>
  );
};
