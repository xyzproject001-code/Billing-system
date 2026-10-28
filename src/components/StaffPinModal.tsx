/**
 * Layer 3: Staff RBAC & Manager PIN Reversal Guard (Medium & High Plan)
 * Protects against cashier shrinkage, unauthorized bill voids & price overrides
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, X, AlertCircle } from 'lucide-react';
import { Tenant, UserStaff } from '../types';

interface StaffPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: UserStaff[];
  actionDescription: string;
  onAuthorized: (manager: UserStaff) => void;
}

export const StaffPinModal: React.FC<StaffPinModalProps> = ({
  isOpen,
  onClose,
  staffList,
  actionDescription,
  onAuthorized,
}) => {
  if (!isOpen) return null;

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const managers = staffList.filter((s) => s.role === 'manager' || s.role === 'owner');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const authorizedStaff = managers.find((m) => m.pin === pin.trim());

    if (authorizedStaff) {
      setErrorMsg('');
      onAuthorized(authorizedStaff);
      onClose();
    } else {
      setErrorMsg('Invalid Manager PIN. Default demo PIN is 9999 or 8888.');
      setPin('');
    }
  };

  const handleNumClick = (digit: string) => {
    if (pin.length < 4) {
      setPin(pin + digit);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-cyan-400">
              <Lock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Manager PIN Required</h3>
              <p className="text-[11px] text-slate-400">Staff RBAC & Audit Authorization</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning text */}
        <div className="p-3 bg-blue-950/40 border border-blue-900/60 rounded-xl text-xs text-cyan-300">
          <p className="font-semibold">{actionDescription}</p>
          <p className="text-[10px] text-cyan-400/80 mt-0.5">
            Cashiers are not authorized for this operation. A Manager must authenticate.
          </p>
        </div>

        {/* PIN Dots Display */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-cyan-500 border-cyan-400 scale-110'
                    : 'border-slate-700 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-400 text-center font-medium">{errorMsg}</p>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleNumClick(digit)}
                className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-xl transition shadow-sm active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleNumClick('0')}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-lg rounded-xl transition shadow-sm active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin(pin.slice(0, -1))}
              className="py-3 bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl transition"
            >
              Del
            </button>
          </div>

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
          >
            Authorize Action
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center">
          Demo Manager PIN: <span className="font-mono text-slate-400 font-bold">9999</span> (Cafe) or{' '}
          <span className="font-mono text-slate-400 font-bold">8888</span> (Hotel)
        </p>
      </div>
    </div>
  );
};
