/**
 * Layer 3: Plan Entitlement & Subscription Matrix Modal
 * Shows the 3 tiers (₹299, ₹699, ₹1,499) and allows live switching / upgrading
 */

import React from 'react';
import { Check, X, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { PlanTier, Tenant } from '../types';
import { PLANS, FEATURE_INFO } from '../services/entitlements';

interface PlanEntitlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTenant: Tenant;
  onUpdateTier: (tier: PlanTier) => void;
}

export const PlanEntitlementModal: React.FC<PlanEntitlementModalProps> = ({
  isOpen,
  onClose,
  activeTenant,
  onUpdateTier,
}) => {
  if (!isOpen) return null;

  const currentTier = activeTenant.planTier;

  const featureList: { key: keyof typeof FEATURE_INFO; label: string; desc: string }[] = [
    { key: 'tanglishSearch', label: 'Tanglish Phonetic Search (ulunthu, sakkarai)', desc: 'Search Tamil names in English alphabet' },
    { key: 'looseWeightCalculator', label: 'Loose-Item Reverse Weight Calculator', desc: '₹30 worth of sugar -> auto-calculates 682 grams' },
    { key: 'dynamicUpiQr', label: 'Dynamic Amount-Locked UPI QR Code', desc: 'Instant zero-fee scan with pre-filled bill total' },
    { key: 'khataLedger', label: 'Smart Khata Credit Ledger + WhatsApp Links', desc: 'Track customer balances & send 1-click reminders' },
    { key: 'offlineSync', label: 'Offline-First Local Sync Engine', desc: 'Zero lag checkout even without internet connection' },
    { key: 'kotAndTableManagement', label: 'Table Management & Kitchen Order Tickets (KOT)', desc: 'Live floor plan, waiter table tracking, KDS chef view' },
    { key: 'voiceMicBilling', label: 'Voice-to-Cart Microphone Billing', desc: 'Speak order items to populate cart with zero typing' },
    { key: 'expiryAlerts', label: 'Expiry & Dead-Stock Alerts + 15% Clearance', desc: 'Automatic notification for near-expiry bakes & discounts' },
    { key: 'staffRbac', label: 'Staff RBAC & Manager Reversal PIN', desc: 'Cashiers cannot void bills without Manager authorization' },
    { key: 'splitPayments', label: 'Split & Hybrid Multi-Mode Payments', desc: 'Pay partially via Cash, UPI, and Khata' },
    { key: 'ownerDailySummary', label: 'Owner 9 PM Daily WhatsApp Summary', desc: 'Automated EOD sales, cash vs UPI, and void totals' },
    { key: 'multiBranchHq', label: 'Central HQ & Multi-Branch Management', desc: 'Cross-branch consolidated analytics and multi-counter POS' },
    { key: 'bomRecipeTracking', label: 'Recipe-level Bill of Materials (BOM) Auto-Deduction', desc: 'Selling 1 Dosa auto-deducts batter, ghee, and potatoes' },
    { key: 'roomFolioBilling', label: 'Hotel Room-Folio Billing & Check-in Link', desc: 'Bill dining to room number and consolidate at checkout' },
    { key: 'auditLogGstExport', label: '1-Click Auditor GST CSV/JSON Export & HSN Summary', desc: 'GSTR-1 compliant tax filing files & tamper-proof audit trail' },
    { key: 'webhookVerification', label: 'Automated UPI / Gateway Webhook Verification', desc: 'Dual-mode Mock & Razorpay production verification' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-600/20 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                HI Scale Modular POS & SaaS Billing Architecture
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Single unified codebase dynamically gated by SaaS subscription tiers with zero downtime.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Tier Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-800 bg-slate-950/40 overflow-y-auto">
          {/* Basic Plan */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              currentTier === 'basic'
                ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                GROCERY / PETTY
              </span>
              {currentTier === 'basic' && (
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ACTIVE PLAN
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Basic Plan</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">₹299</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Speed, zero typing, Tanglish search, loose items, dynamic UPI QR, and Khata ledger.
            </p>
            <button
              onClick={() => onUpdateTier('basic')}
              disabled={currentTier === 'basic'}
              className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                currentTier === 'basic'
                  ? 'bg-slate-800 text-slate-400 cursor-default'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {currentTier === 'basic' ? 'Current Plan' : 'Switch to Basic Plan'}
            </button>
          </div>

          {/* Medium Plan */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              currentTier === 'medium'
                ? 'border-cyan-500 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                RESTAURANTS / SUPERMARKETS
              </span>
              {currentTier === 'medium' && (
                <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ACTIVE PLAN
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">Medium Plan</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">₹699</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Table & KOT manager, voice mic billing, expiry clearance alerts, and staff RBAC.
            </p>
            <button
              onClick={() => onUpdateTier('medium')}
              disabled={currentTier === 'medium'}
              className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                currentTier === 'medium'
                  ? 'bg-slate-800 text-slate-400 cursor-default'
                  : 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white shadow-sm'
              }`}
            >
              {currentTier === 'medium' ? 'Current Plan' : 'Switch to Medium Plan'}
            </button>
          </div>

          {/* High Plan */}
          <div
            className={`rounded-xl p-4 border transition-all ${
              currentTier === 'high'
                ? 'border-purple-500 bg-purple-950/20 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                HOTELS / MULTI-BRANCH CHAINS
              </span>
              {currentTier === 'high' && (
                <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> ACTIVE PLAN
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white mt-2">High Plan</h3>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">₹1,499</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Central HQ, recipe BOM auto-deduction, hotel room folios, and 1-Click Auditor GST export.
            </p>
            <button
              onClick={() => onUpdateTier('high')}
              disabled={currentTier === 'high'}
              className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-semibold transition ${
                currentTier === 'high'
                  ? 'bg-slate-800 text-slate-400 cursor-default'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm'
              }`}
            >
              {currentTier === 'high' ? 'Current Plan' : 'Switch to High Plan'}
            </button>
          </div>
        </div>

        {/* Feature Comparison Matrix Table */}
        <div className="p-6 overflow-y-auto flex-1">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Feature Entitlement Gate Matrix
          </h4>
          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-4">Feature Capability</th>
                  <th className="py-2.5 px-3 text-center">Basic (₹299)</th>
                  <th className="py-2.5 px-3 text-center">Medium (₹699)</th>
                  <th className="py-2.5 px-3 text-center">High (₹1,499)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/40">
                {featureList.map((item) => {
                  const basicHas = PLANS.basic.features.includes(item.key as any);
                  const mediumHas = PLANS.medium.features.includes(item.key as any);
                  const highHas = PLANS.high.features.includes(item.key as any);

                  return (
                    <tr key={item.key} className="hover:bg-slate-800/30 transition">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-200">{item.label}</div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {basicHas ? (
                          <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {mediumHas ? (
                          <Check className="w-4 h-4 text-blue-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {highHas ? (
                          <Check className="w-4 h-4 text-purple-400 mx-auto" />
                        ) : (
                          <X className="w-4 h-4 text-slate-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Multi-tenant data isolation verified with Row-Level Security & tenant_id partition</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
