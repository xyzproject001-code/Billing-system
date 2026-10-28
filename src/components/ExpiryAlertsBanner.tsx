/**
 * Layer 4: Expiry & Dead-Stock Clearance Alert (Medium & High Plan)
 * Alerts cashiers to near-expiry items with a 1-click 15% clearance discount button
 */

import React, { useState } from 'react';
import { AlertTriangle, Sparkles, Tag, Check, X } from 'lucide-react';
import { Product } from '../types';

interface ExpiryAlertsBannerProps {
  products: Product[];
  onApplyClearanceDiscount: (productIds: string[], discountPercent: number) => void;
}

export const ExpiryAlertsBanner: React.FC<ExpiryAlertsBannerProps> = ({
  products,
  onApplyClearanceDiscount,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [applied, setApplied] = useState(false);

  // Find products expiring within 2 days
  const today = new Date();
  const nearExpiryProducts = products.filter((p) => {
    if (!p.expiryDate) return false;
    const exp = new Date(p.expiryDate);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  });

  if (nearExpiryProducts.length === 0 || isDismissed) {
    return null;
  }

  const handleClearance = () => {
    onApplyClearanceDiscount(
      nearExpiryProducts.map((p) => p.id),
      15
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  return (
    <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-blue-950/60 border border-blue-500/40 rounded-2xl p-4 shadow-lg mb-4 text-xs animate-in slide-in-from-top duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-blue-500/20 text-cyan-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 text-sm">
                Expiry & Dead-Stock Clearance Alert
              </span>
              <span className="px-2 py-0.2 rounded-full bg-blue-500/20 text-cyan-300 font-semibold text-[10px]">
                {nearExpiryProducts.length} Item{nearExpiryProducts.length > 1 ? 's' : ''} Near Expiry
              </span>
            </div>
            <p className="text-slate-300 mt-0.5">
              {nearExpiryProducts.map((p) => `${p.nameEnglish} (Exp: ${p.expiryDate})`).join(', ')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleClearance}
            disabled={applied}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shadow-md ${
              applied
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
            }`}
          >
            {applied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>15% Discount Applied!</span>
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5" />
                <span>1-Click 15% Clearance</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
