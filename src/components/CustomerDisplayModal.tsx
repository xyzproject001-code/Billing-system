/**
 * Layer 1: Customer-Facing Display (Dual-Screen Mode)
 * Shows live line items and large UPI QR code for the customer standing at the counter
 */

import React, { useState, useEffect } from 'react';
import { Tv, X, QrCode, CheckCircle2, ShoppingBag } from 'lucide-react';
import { CartItem, Tenant } from '../types';
import { generateUPIQRCodeDataUrl } from '../utils/upi';

interface CustomerDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
  tenant: Tenant;
}

export const CustomerDisplayModal: React.FC<CustomerDisplayModalProps> = ({
  isOpen,
  onClose,
  cart,
  grandTotal,
  subtotal,
  taxTotal,
  tenant,
}) => {
  if (!isOpen) return null;

  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (grandTotal > 0 && tenant) {
      generateUPIQRCodeDataUrl({
        upiVpa: tenant.upiVpa,
        payeeName: tenant.name,
        amount: grandTotal,
        transactionNote: `Counter Checkout`,
      }).then((url) => setQrUrl(url));
    }
  }, [grandTotal, tenant]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="p-4 px-6 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-cyan-400 flex items-center justify-center">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white uppercase tracking-wider">
                  {tenant.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-600/20 text-cyan-400 border border-cyan-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                  HI Scale POS
                </span>
              </div>
              <p className="text-xs text-slate-400">Customer Checkout Terminal & UPI Payment Screen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body: Left Items, Right QR & Totals */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-y-auto">
          {/* Left: Cart Items List */}
          <div className="md:col-span-7 flex flex-col bg-slate-950/50 rounded-2xl border border-slate-800/80 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-cyan-400" />
                Scanned Items ({cart.length})
              </span>
              <span className="text-xs text-emerald-400 font-semibold">Live Billing</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 min-h-[240px]">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
                  <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-2 opacity-50" />
                  <p className="text-sm font-medium">Ready for next customer</p>
                  <p className="text-xs text-slate-600">Items will appear here as scanned</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                  >
                    <div>
                      <p className="font-bold text-white text-sm">{item.product.nameEnglish}</p>
                      {item.product.nameTamil && (
                        <p className="text-[11px] text-sky-300">{item.product.nameTamil}</p>
                      )}
                      <p className="text-[11px] text-slate-400">
                        {item.weightGrams
                          ? `${(item.weightGrams / 1000).toFixed(3)} kg`
                          : `${item.quantity} ${item.product.unit}`}{' '}
                        &bull; ₹{item.product.price} / {item.product.unit}
                      </p>
                    </div>
                    <span className="font-extrabold text-base text-white font-mono-numbers">
                      ₹{item.itemTotal.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Subtotal & Tax bar */}
            <div className="pt-3 border-t border-slate-800 text-xs space-y-1 text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST / Tax:</span>
                <span className="text-slate-200">₹{taxTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Right: Large Dynamic UPI QR & Big Total */}
          <div className="md:col-span-5 flex flex-col justify-between bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-950 rounded-2xl border border-blue-500/30 p-5 text-center">
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-cyan-400 mb-1">
                Net Amount Payable
              </p>
              <p className="text-4xl font-black text-white font-mono-numbers tracking-tight">
                ₹{grandTotal.toFixed(2)}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Amount locked in QR &bull; Zero typing needed
              </p>
            </div>

            {/* High-Contrast QR Code */}
            <div className="my-4 bg-white p-4 rounded-2xl shadow-xl max-w-[220px] mx-auto">
              {qrUrl ? (
                <img
                  src={qrUrl}
                  alt="Dynamic UPI QR"
                  className="w-full h-auto aspect-square"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Supports GPay, PhonePe, Paytm, CRED & BHIM</span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                UPI ID: {tenant.upiVpa}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <span>Thank you for shopping at {tenant.name}</span>
          <span>&bull;</span>
          <span className="text-cyan-400 font-bold">Powered by HI Scale POS OS</span>
        </div>
      </div>
    </div>
  );
};
