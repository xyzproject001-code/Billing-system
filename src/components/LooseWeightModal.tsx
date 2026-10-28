/**
 * Layer 1 & 4: Reverse Loose-Item Weight Calculator (Basic Plan Feature)
 * Allows cashiers to type rupees (e.g. ₹30 worth of sugar) and auto-calculates weight in grams
 * or vice-versa with zero mental arithmetic.
 */

import React, { useState, useEffect } from 'react';
import { Scale, X, ArrowRightLeft, Plus } from 'lucide-react';
import { Product } from '../types';

interface LooseWeightModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product, quantity: number, weightGrams: number, calculatedPrice: number) => void;
}

export const LooseWeightModal: React.FC<LooseWeightModalProps> = ({
  isOpen,
  onClose,
  product,
  onAddToCart,
}) => {
  if (!isOpen || !product) return null;

  const [mode, setMode] = useState<'byRupees' | 'byWeight'>('byRupees');
  const [rupeesInput, setRupeesInput] = useState<string>('50');
  const [gramsInput, setGramsInput] = useState<string>('500');

  const pricePerKg = product.price;

  // Auto-calculated values
  let calculatedWeightGrams = 0;
  let calculatedAmount = 0;

  if (mode === 'byRupees') {
    const rs = parseFloat(rupeesInput) || 0;
    calculatedAmount = rs;
    calculatedWeightGrams = pricePerKg > 0 ? Math.round((rs / pricePerKg) * 1000) : 0;
  } else {
    const g = parseFloat(gramsInput) || 0;
    calculatedWeightGrams = g;
    calculatedAmount = Number(((g / 1000) * pricePerKg).toFixed(2));
  }

  const handleAdd = () => {
    if (calculatedWeightGrams <= 0 || calculatedAmount <= 0) return;
    onAddToCart(product, 1, calculatedWeightGrams, calculatedAmount);
    onClose();
  };

  const rupeePresets = [10, 20, 30, 50, 100, 200];
  const weightPresets = [100, 250, 500, 750, 1000, 2000];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-cyan-400">
              <Scale className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                Loose-Item Weight Calculator
              </h3>
              <p className="text-xs text-cyan-300 font-medium">
                {product.nameEnglish} {product.nameTamil && `(${product.nameTamil})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle & Rate Display */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-400">Rate: </span>
            <span className="text-emerald-400 font-bold text-sm">
              ₹{pricePerKg} / kg
            </span>
          </div>

          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setMode('byRupees')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                mode === 'byRupees'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By Amount (₹)
            </button>
            <button
              onClick={() => setMode('byWeight')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                mode === 'byWeight'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By Weight (g)
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-5 space-y-4">
          {mode === 'byRupees' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Customer Wants Rupees (₹):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  ₹
                </span>
                <input
                  type="number"
                  autoFocus
                  value={rupeesInput}
                  onChange={(e) => setRupeesInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-white text-2xl font-bold font-mono-numbers focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {rupeePresets.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRupeesInput(amt.toString())}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700 hover:border-slate-600 transition"
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter Weight in Grams:
              </label>
              <div className="relative">
                <input
                  type="number"
                  autoFocus
                  value={gramsInput}
                  onChange={(e) => setGramsInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-4 text-white text-2xl font-bold font-mono-numbers focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  grams
                </span>
              </div>

              {/* Weight Presets */}
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {weightPresets.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGramsInput(g.toString())}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold border border-slate-700 hover:border-slate-600 transition"
                  >
                    {g >= 1000 ? `${g / 1000} kg` : `${g} g`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result Calculation Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30">
            <div className="flex items-center justify-between text-xs text-cyan-300 font-medium mb-1">
              <span>Automatic Conversion Result:</span>
              <span className="bg-blue-500/20 px-2 py-0.5 rounded text-[10px] text-cyan-300 font-semibold">
                Zero Mental Lag
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-2">
              <div>
                <p className="text-[11px] text-slate-400">Exact Weight</p>
                <p className="text-xl font-extrabold text-white font-mono-numbers">
                  {(calculatedWeightGrams / 1000).toFixed(3)}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    kg ({calculatedWeightGrams} g)
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[11px] text-slate-400">Total Charge</p>
                <p className="text-2xl font-black text-emerald-400 font-mono-numbers">
                  ₹{calculatedAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
};
