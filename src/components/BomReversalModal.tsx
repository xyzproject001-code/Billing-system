/**
 * Recipe BOM Compensating Reversal & KOT Void Modal
 * - Lets cashier/manager void a kitchen dish with operational transparency
 * - Selects between "Return to Stock" (replenishes raw inventory) vs "Kitchen Spoilage/Wastage" (books expense)
 * - Strict Royal Blue (#2563eb), Cyan (#06b6d4), Deep Navy (#080e1e) styling (Zero Orange)
 */

import React, { useState } from 'react';
import { X, RotateCcw, Trash2, ShieldAlert, CheckCircle2, DollarSign } from 'lucide-react';
import { Product } from '../types';
import { BOMReversalAction, processBomReversal } from '../utils/recipeBomReversal';

interface BomReversalModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  dishName: string;
  dishQuantity: number;
  tableNumber: string;
  kotId: string;
  onConfirmReversal: (auditMessage: string, costImpact: number) => void;
}

export const BomReversalModal: React.FC<BomReversalModalProps> = ({
  isOpen,
  onClose,
  catalog,
  dishName,
  dishQuantity,
  tableNumber,
  kotId,
  onConfirmReversal,
}) => {
  const [disposition, setDisposition] = useState<'RETURN_TO_STOCK' | 'KITCHEN_SPOILAGE_WASTE'>(
    'RETURN_TO_STOCK'
  );
  const [reason, setReason] = useState('Customer modified table order before prep');
  const [authorizedBy, setAuthorizedBy] = useState('Sundaram (Manager)');

  if (!isOpen) return null;

  const action: BOMReversalAction = {
    kotId,
    tableNumber,
    dishName,
    dishQuantity,
    reason,
    disposition,
    authorizedByStaff: authorizedBy,
  };

  const { reversalItems, totalCostImpact } = processBomReversal(action, catalog);

  const handleSubmit = () => {
    const result = processBomReversal(action, catalog);
    onConfirmReversal(result.auditMessage, result.totalCostImpact);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-[#080e1e] border border-blue-900/70 text-slate-100 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-blue-900/60 flex items-center justify-between bg-gradient-to-r from-[#0d1c3a] to-[#080e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Recipe BOM Compensating Reversal</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Void KOT #{kotId} &bull; Table {tableNumber} &bull; {dishName} x{dishQuantity}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {/* Disposition Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Physical Food Disposition
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDisposition('RETURN_TO_STOCK')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  disposition === 'RETURN_TO_STOCK'
                    ? 'bg-blue-950/80 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-[#0d1a36] border-blue-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <RotateCcw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-cyan-300">Return to Stock</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ingredients were not cooked. Replenishes raw batch inventories.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDisposition('KITCHEN_SPOILAGE_WASTE')}
                className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                  disposition === 'KITCHEN_SPOILAGE_WASTE'
                    ? 'bg-blue-950/80 border-cyan-400 text-white shadow-md shadow-cyan-500/10'
                    : 'bg-[#0d1a36] border-blue-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs text-rose-300">Kitchen Wastage / Spoiled</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Food was prepared and discarded. Books cost of ₹{totalCostImpact.toFixed(2)} to Wastage Ledger.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Ingredient Breakdown Table */}
          <div className="bg-[#050914] p-3.5 rounded-2xl border border-blue-900/60 space-y-2">
            <span className="font-bold text-slate-300 block">Recipe Ingredients Impacted</span>
            {reversalItems.length === 0 ? (
              <p className="text-slate-500 text-[11px]">Standard item without BOM recipe linkage.</p>
            ) : (
              <div className="space-y-1.5">
                {reversalItems.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-1 border-b border-blue-950 last:border-0 font-mono text-[11px]"
                  >
                    <span className="text-slate-300">{ing.rawProductName}</span>
                    <span className="text-cyan-400">
                      {ing.qtyToRevert} {ing.unit}
                    </span>
                    <span className="text-slate-400">₹{ing.costImpact.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reason Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
              Void Reason
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#050914] border border-blue-900/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0a1224] border-t border-blue-900/60 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Total Ingredient Cost: <span className="text-cyan-400 font-bold font-mono">₹{totalCostImpact.toFixed(2)}</span>
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 transition cursor-pointer"
            >
              Confirm Reversal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
