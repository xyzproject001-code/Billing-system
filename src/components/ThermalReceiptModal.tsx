/**
 * Layer 1: ESC/POS Thermal Receipt Printer Modal
 * Renders 58mm / 80mm receipt with tax breakdown, store branding & UPI QR
 */

import React, { useState, useEffect } from 'react';
import { Printer, X, Download, Share2, Copy, Check, QrCode } from 'lucide-react';
import { Invoice, Tenant } from '../types';
import { formatEscPosReceiptText } from '../utils/escpos';
import { generateUPIQRCodeDataUrl } from '../utils/upi';

interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  tenant: Tenant;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  tenant,
}) => {
  if (!isOpen || !invoice) return null;

  const [paperWidth, setPaperWidth] = useState<58 | 80>(80);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [showRawText, setShowRawText] = useState(false);

  useEffect(() => {
    if (invoice && tenant) {
      generateUPIQRCodeDataUrl({
        upiVpa: tenant.upiVpa,
        payeeName: tenant.name,
        amount: invoice.grandTotal,
        transactionNote: `Bill ${invoice.invoiceNumber}`,
      }).then((url) => setUpiQrUrl(url));
    }
  }, [invoice, tenant]);

  const rawText = formatEscPosReceiptText(invoice, tenant, paperWidth);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawText);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Controls */}
        <div className="no-print p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                ESC/POS Thermal Receipt
              </h3>
              <p className="text-xs text-slate-400">
                Invoice #{invoice.invoiceNumber} &bull; ₹{invoice.grandTotal.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm Switcher */}
            <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                onClick={() => setPaperWidth(80)}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  paperWidth === 80
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm (Wide)
              </button>
              <button
                onClick={() => setPaperWidth(58)}
                className={`px-2.5 py-1 rounded font-semibold transition ${
                  paperWidth === 58
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm (Small)
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Receipt Container Preview */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-950/70 flex justify-center">
          {showRawText ? (
            <div className="w-full bg-black p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre overflow-x-auto">
              {rawText}
            </div>
          ) : (
            /* Printable Thermal Roll Replica */
            <div
              id="thermal-receipt-print-area"
              className={`bg-white text-black p-5 shadow-2xl rounded-sm font-mono text-[11px] leading-tight select-text transition-all ${
                paperWidth === 58 ? 'w-[320px]' : 'w-[400px]'
              }`}
            >
              {/* Store Header */}
              <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
                <p className="font-bold text-sm tracking-wider uppercase">{tenant.name}</p>
                <p className="text-[10px] text-gray-700">{tenant.address}</p>
                <p className="text-[10px] text-gray-700">Phone: {tenant.phone}</p>
                {tenant.gstNumber && (
                  <p className="text-[10px] font-semibold text-gray-800">
                    GSTIN: {tenant.gstNumber}
                  </p>
                )}
                {tenant.fssaiNumber && (
                  <p className="text-[10px] text-gray-700">FSSAI: {tenant.fssaiNumber}</p>
                )}
              </div>

              {/* Bill Details */}
              <div className="space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
                <div className="flex justify-between">
                  <span>BILL NO: {invoice.invoiceNumber}</span>
                  <span>{new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                  <span>DATE: {new Date(invoice.createdAt).toLocaleDateString('en-IN')}</span>
                  <span>CASHIER: {invoice.cashierName}</span>
                </div>
                {invoice.tableId && (
                  <div className="flex justify-between font-bold">
                    <span>TABLE: {invoice.tableId}</span>
                    <span>MODE: {invoice.paymentMethod.toUpperCase()}</span>
                  </div>
                )}
                {invoice.roomNumber && (
                  <div className="flex justify-between font-bold">
                    <span>ROOM: {invoice.roomNumber}</span>
                    <span>MODE: ROOM FOLIO</span>
                  </div>
                )}
                {invoice.customer?.name && (
                  <div className="text-[10px] text-gray-800">
                    CUSTOMER: {invoice.customer.name} ({invoice.customer.phone})
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="border-b border-dashed border-gray-400 pb-2 mb-2">
                <div className="flex justify-between font-bold text-[10px] border-b border-gray-300 pb-1 mb-1">
                  <span className="w-1/2">ITEM / HSN</span>
                  <span className="w-1/4 text-center">QTY</span>
                  <span className="w-1/4 text-right">TOTAL</span>
                </div>

                <div className="space-y-1.5">
                  {invoice.items.map((item, idx) => (
                    <div key={idx} className="text-[10px]">
                      <div className="flex justify-between font-semibold">
                        <span className="truncate pr-1">{item.product.nameEnglish}</span>
                        <span className="font-bold">₹{item.itemTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-600">
                        <span>
                          HSN: {item.product.hsnCode} ({item.product.taxRate}%)
                        </span>
                        <span>
                          {item.weightGrams
                            ? `${(item.weightGrams / 1000).toFixed(3)}kg`
                            : `${item.quantity} x ₹${item.product.price}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Discount:</span>
                    <span>-₹{invoice.discountTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Total Tax (GST):</span>
                  <span>₹{invoice.taxTotal.toFixed(2)}</span>
                </div>
                {invoice.roundOff !== 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Round Off:</span>
                    <span>₹{invoice.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-xs pt-1 border-t border-gray-400">
                  <span>NET PAYABLE:</span>
                  <span>₹{invoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] text-gray-700 pt-0.5">
                  <span>PAYMENT MODE:</span>
                  <span className="uppercase font-bold">{invoice.paymentMethod} (PAID)</span>
                </div>
              </div>

              {/* Dynamic Amount-Locked UPI QR Code */}
              {upiQrUrl && (
                <div className="text-center py-2 border-b border-dashed border-gray-400 mb-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Scan with GPay / PhonePe / Paytm / CRED
                  </p>
                  <img
                    src={upiQrUrl}
                    alt="UPI Payment QR"
                    className="w-28 h-28 mx-auto border border-gray-200 p-1"
                  />
                  <p className="text-[9px] text-gray-600 mt-1">
                    UPI VPA: {tenant.upiVpa} &bull; Locked ₹{invoice.grandTotal.toFixed(2)}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-[9px] text-gray-600 space-y-0.5">
                <p className="font-semibold">{tenant.receiptFooter}</p>
                {invoice.syncStatus === 'pending' && (
                  <p className="text-red-600 font-bold">[OFFLINE BILL - SAVED LOCALLY]</p>
                )}
                <p className="text-[8px] text-gray-400">Powered by HI Scale POS OS</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="no-print p-4 border-t border-slate-800 bg-slate-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              {showRawText ? 'Show Receipt View' : 'View ESC/POS Raw Text'}
            </button>
            <button
              onClick={handleCopyRaw}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1"
            >
              {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRaw ? 'Copied' : 'Copy Raw'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white flex items-center gap-1.5 shadow-lg shadow-blue-600/30 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Thermal Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
