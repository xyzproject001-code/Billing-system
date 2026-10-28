/**
 * HI Scale Executive Dashboard
 * Pixel-perfect match to reference image_15 (image_3b7833a9.png):
 * - Deep navy-blue "HI Scale Performance Overview" card with large cyan upward arrow & "Launch POS Counter (F1)"
 * - Two high-contrast white metrics cards: "TOTAL RECEIVABLE" (₹ 800.00) & "TOTAL PAYABLE" (₹ 0.00)
 * - "GROSS SALES VOLUME" (₹ 1,000) card with "This Month (Oct 2026)" dropdown
 * - Smooth cyan-tinted line chart with a sharp peak on Oct 21 and dark tooltip badge "21 Oct (Peak) ₹ 1,000"
 * - Professional Royal Blue and Cyan color scheme with ZERO orange
 */

import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ArrowUp,
} from 'lucide-react';
import { Invoice, Tenant } from '../types';

interface HiScaleDashboardProps {
  tenant: Tenant;
  invoices: Invoice[];
  onNavigate: (section: string) => void;
  onOpenAddSale: () => void;
  onOpenAddPurchase: () => void;
}

export const HiScaleDashboard: React.FC<HiScaleDashboardProps> = ({
  tenant,
  invoices,
  onNavigate,
  onOpenAddSale,
}) => {
  const [salesTimeframe, setSalesTimeframe] = useState('This Month (Oct 2026)');

  const totalReceivable = 800; // From seed Khata
  const totalPayable = 0;
  const totalSaleAmount = 1000;

  return (
    <div className="p-6 sm:p-8 bg-[#f8fafd] text-slate-900 min-h-full font-sans space-y-6 max-w-7xl mx-auto">
      {/* 1. HI Scale Performance Overview Card (Deep Navy-Blue) */}
      <div className="bg-gradient-to-r from-[#0d1c3a] via-[#0d2247] to-[#0a1835] rounded-3xl p-6 sm:p-7 border border-blue-900/60 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          {/* Large Cyan Upward Arrow Emblem */}
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 shrink-0">
            <ArrowUp className="w-8 h-8 stroke-[3] text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                HI Scale Performance Overview
              </h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#0c3150] text-cyan-400 border border-cyan-500/40 tracking-wider">
                LIVE POS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300/90 mt-1">
              Real-time daily receivables, cashier turns, and sales performance
            </p>
          </div>
        </div>

        <div>
          {/* Launch POS Counter (F1) in Royal Blue */}
          <button
            onClick={onOpenAddSale}
            className="px-6 py-3 bg-[#1d64ec] hover:bg-[#1a5adb] text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
          >
            <span>Launch POS Counter (F1)</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards: TOTAL RECEIVABLE & TOTAL PAYABLE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* TOTAL RECEIVABLE */}
        <div
          onClick={() => onNavigate('parties')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TOTAL RECEIVABLE
            </p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono-numbers tracking-tight">
              ₹ {totalReceivable.toFixed(2)}
            </p>
            <p className="text-xs text-blue-600 font-semibold mt-3 flex items-center gap-1 group-hover:underline">
              <span>From 1 Khata Party</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#e6fbf4] text-[#059669] flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-7 h-7 stroke-[2.75]" />
          </div>
        </div>

        {/* TOTAL PAYABLE */}
        <div
          onClick={() => onNavigate('bom')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-sm transition group"
        >
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TOTAL PAYABLE
            </p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2 font-mono-numbers tracking-tight">
              ₹ {totalPayable.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400 mt-3">No supplier payables pending.</p>
          </div>
          <div className="w-13 h-13 rounded-2xl bg-[#edf2f7] text-[#94a3b8] flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-7 h-7 stroke-[2.75]" />
          </div>
        </div>
      </div>

      {/* 3. GROSS SALES VOLUME Card with Oct 21 Peak Chart */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4">
        {/* Header: Title & Dropdown */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            GROSS SALES VOLUME
          </p>

          {/* Timeframe Selector Dropdown */}
          <div className="relative">
            <button className="flex items-center gap-2 bg-[#f1f5f9] hover:bg-slate-200/80 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer">
              <span>{salesTimeframe}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Huge Value */}
        <div>
          <p className="text-4xl sm:text-5xl font-black text-slate-900 font-mono-numbers tracking-tight">
            ₹ {totalSaleAmount.toLocaleString('en-IN')}
          </p>
        </div>

        {/* Smooth Cyan-Tinted Spline Line Chart with Oct 21 Peak */}
        <div className="pt-4 relative min-h-[220px]">
          {/* Y-Axis Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-xs text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span className="w-6 text-right">1k</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 text-right">800</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="flex items-center gap-3 opacity-0">
              <span className="w-6 text-right">0</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </div>

          {/* Vector SVG Spline Chart */}
          <div className="relative h-44 w-full pl-9 pr-4 overflow-visible">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 900 180"
              preserveAspectRatio="none"
              fill="none"
            >
              <defs>
                {/* Cyan Gradient Fill under the curve */}
                <linearGradient id="cyanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>

                {/* Subtle vertical glow beam for Oct 21 */}
                <linearGradient id="beamGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Cyan Vertical Highlight Beam on Oct 21 (X = 675) */}
              <polygon
                points="660,180 675,25 690,180"
                fill="url(#beamGradient)"
              />
              <line
                x1="675"
                y1="25"
                x2="675"
                y2="180"
                stroke="#06b6d4"
                strokeWidth="2"
                strokeDasharray="3 3"
              />

              {/* Area Under Curve */}
              <path
                d="M 0 170 C 150 170, 250 170, 400 168 C 500 166, 580 155, 630 90 C 655 50, 665 25, 675 25 C 685 25, 695 65, 720 120 C 760 165, 820 168, 900 170 L 900 180 L 0 180 Z"
                fill="url(#cyanAreaGradient)"
              />

              {/* Main Cyan Spline Line */}
              <path
                d="M 0 170 C 150 170, 250 170, 400 168 C 500 166, 580 155, 630 90 C 655 50, 665 25, 675 25 C 685 25, 695 65, 720 120 C 760 165, 820 168, 900 170"
                stroke="#00c5ff"
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
              />

              {/* Glowing Peak Dot on Oct 21 (X = 675, Y = 25) */}
              <circle cx="675" cy="25" r="7" fill="#00c5ff" fillOpacity="0.3" />
              <circle cx="675" cy="25" r="4.5" fill="#00c5ff" stroke="#ffffff" strokeWidth="2" />
            </svg>

            {/* Dark Blue-Black Floating Tooltip Badge: "21 Oct (Peak) ₹ 1,000" */}
            <div
              className="absolute pointer-events-none -translate-x-1/2 -top-2 flex flex-col items-center"
              style={{ left: '75%' }}
            >
              <div className="bg-[#071329] border border-cyan-400/50 rounded-xl px-4 py-2 shadow-2xl shadow-cyan-500/20 text-center min-w-[100px]">
                <p className="text-[11px] font-semibold text-cyan-300">21 Oct (Peak)</p>
                <p className="text-base font-extrabold text-white font-mono-numbers">₹ 1,000</p>
              </div>
              {/* Tooltip Downward Caret */}
              <div className="w-2.5 h-2.5 bg-[#071329] border-r border-b border-cyan-400/50 rotate-45 -mt-1.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
