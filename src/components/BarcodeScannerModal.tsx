/**
 * Layer 1: Hardware Barcode Scanner & Camera Simulator
 * Supports USB/Bluetooth hardware scanners (keyboard emulation) and on-screen testing
 */

import React, { useState } from 'react';
import { Barcode, Search, X, Check, Scan, Volume2 } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: Product[];
  onScanProduct: (product: Product) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onScanProduct,
}) => {
  if (!isOpen) return null;

  const [inputCode, setInputCode] = useState('');
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Audio beep playback for authentic hardware scanner feel
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, audioCtx.currentTime); // High pitch POS scan beep
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {
      // Audio not permitted or supported
    }
  };

  const handleProcessScan = (codeToSearch: string) => {
    const code = codeToSearch.trim();
    if (!code) return;

    const matched = catalog.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      playBeep();
      setLastScanned(matched);
      setErrorMsg('');
      onScanProduct(matched);
      setInputCode('');
    } else {
      setErrorMsg(`Barcode "${code}" not found in catalog.`);
      setLastScanned(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-cyan-400">
              <Scan className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                Hardware Barcode Scanner
              </h3>
              <p className="text-xs text-slate-400">
                Layer 1: Keyboard-emulation USB & Bluetooth scanners
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

        {/* Scanner Simulation Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Scan Barcode / Enter SKU:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleProcessScan(inputCode);
                  }}
                  placeholder="e.g. 8901030383121 or GRO-SUG-01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-white text-sm focus:outline-none focus:border-blue-500 font-mono-numbers"
                />
              </div>
              <button
                onClick={() => handleProcessScan(inputCode)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Scan
              </button>
            </div>
          </div>

          {/* Feedback & Beep Indicator */}
          {lastScanned && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center justify-between text-xs animate-in zoom-in-95">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Check className="w-4 h-4" />
                </span>
                <div>
                  <p className="font-bold text-white">{lastScanned.nameEnglish}</p>
                  <p className="text-[11px] text-emerald-300">
                    ₹{lastScanned.price} &bull; Added to active bill
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                <Volume2 className="w-3.5 h-3.5" /> Beep!
              </span>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-lg border border-rose-900/60">
              {errorMsg}
            </p>
          )}

          {/* Quick Click Barcode Palette */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Sample Barcodes in Active Catalog (Click to test scan):
            </p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {catalog.slice(0, 7).map((prod) => (
                <button
                  key={prod.id}
                  onClick={() => handleProcessScan(prod.barcode)}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-cyan-500 text-left transition group text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
                    <div>
                      <p className="font-semibold text-slate-200">{prod.nameEnglish}</p>
                      <p className="text-[10px] text-slate-400 font-mono-numbers">
                        Barcode: {prod.barcode} | SKU: {prod.sku}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-bold font-mono-numbers">
                    ₹{prod.price}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
