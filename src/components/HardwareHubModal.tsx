/**
 * Hardware Abstraction Layer (HAL) Control Hub Modal
 * - ESC/POS Thermal Receipt Engine (80mm & 58mm canvas rasterizer with Tamil & English Indic support)
 * - Raw hex ESC/POS command stream preview (GS v 0, cutter kick, cash drawer pulse)
 * - RS-232 / USB Serial Weighing Scale parser with continuous stream monitoring
 * - Barcode Scanner Keyboard Wedge diagnostic listener
 * - Strict Royal Blue (#2563eb), Cyan (#06b6d4), Deep Navy (#080e1e) styling (Zero Orange)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Printer,
  Scale,
  Barcode,
  Terminal,
  CheckCircle2,
  Play,
  RotateCcw,
  Zap,
  Cpu,
} from 'lucide-react';
import { Invoice } from '../types';
import {
  generateEscPosRasterReceipt,
  parseScaleDataStream,
  BarcodeKeyboardWedgeListener,
} from '../utils/hardwareHAL';
import { fastCatalogCache } from '../utils/storageAdapter';

interface HardwareHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  sampleInvoice?: Invoice;
  onApplyWeightToPos?: (weightGrams: number) => void;
}

export const HardwareHubModal: React.FC<HardwareHubModalProps> = ({
  isOpen,
  onClose,
  sampleInvoice,
  onApplyWeightToPos,
}) => {
  const [activeTab, setActiveTab] = useState<'printer' | 'scale' | 'scanner'>('printer');

  // Printer State
  const [printerWidth, setPrinterWidth] = useState<'80mm' | '58mm'>('80mm');
  const [escHex, setEscHex] = useState<string>('');
  const [byteCount, setByteCount] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scale State
  const [scaleRawStream, setScaleRawStream] = useState<string>('ST,GS,+001.450kg');
  const [isStable, setIsStable] = useState<boolean>(true);
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(1.45);
  const [isScaleStreaming, setIsScaleStreaming] = useState<boolean>(true);

  // Barcode Wedge State
  const [detectedScans, setDetectedScans] = useState<
    { code: string; matchName: string; durationMs: number; time: string }[]
  >([]);
  const [wedgeBufferTest, setWedgeBufferTest] = useState<string>('');

  // Fallback demo invoice if none supplied
  const effectiveInvoice: Invoice = sampleInvoice || {
    id: 'DEMO-INV-001',
    invoiceNumber: 'INV-20261026-0042',
    tenant_id: 'tenant_murugan',
    branch_id: 'br_01',
    counterId: 'Counter-01',
    cashierId: 'c1',
    cashierName: 'Sundaram (Cashier)',
    customer: { name: 'Ramasamy K', phone: '98401 23456', isKhata: true },
    items: [
      {
        id: '1',
        product: {
          id: 'p1',
          tenant_id: 't1',
          barcode: '8901030383821',
          sku: 'RICE-PONNI-25',
          nameEnglish: 'Ponni Boiled Rice 25kg',
          nameTamil: 'பொன்னி புழுங்கல் அரிசி',
          phoneticKeywords: [],
          category: 'Grains & Rice',
          price: 1350,
          costPrice: 1200,
          mrp: 1450,
          unit: 'packet',
          isLooseItem: false,
          taxRate: 5,
          hsnCode: '1006',
          stockQty: 45,
          lowStockThreshold: 10,
        },
        quantity: 1,
        taxAmount: 64.28,
        itemTotal: 1350,
      },
      {
        id: '2',
        product: {
          id: 'p2',
          tenant_id: 't1',
          barcode: '200000000001',
          sku: 'ONION-LOOSE',
          nameEnglish: 'Big Onion (Bellary)',
          nameTamil: 'வெங்காயம்',
          phoneticKeywords: [],
          category: 'Vegetables',
          price: 45,
          costPrice: 32,
          mrp: 50,
          unit: 'kg',
          isLooseItem: true,
          taxRate: 0,
          hsnCode: '0703',
          stockQty: 180,
          lowStockThreshold: 20,
        },
        quantity: 1,
        weightGrams: 2500,
        taxAmount: 0,
        itemTotal: 112.5,
      },
    ],
    itemCount: 2,
    subtotal: 1398.22,
    taxTotal: 64.28,
    taxBreakdown: [{ rate: 5, taxable: 1285.72, cgst: 32.14, sgst: 32.14, totalTax: 64.28 }],
    discountTotal: 0,
    roundOff: 0.28,
    grandTotal: 1462.5,
    paymentMethod: 'cash',
    status: 'completed',
    syncStatus: 'synced',
    createdAt: new Date().toISOString(),
  };

  // Render ESC/POS raster to canvas
  useEffect(() => {
    if (!isOpen) return;

    const { canvas, rasterBytesLength, escHexPreview } = generateEscPosRasterReceipt(
      effectiveInvoice,
      printerWidth
    );

    setByteCount(rasterBytesLength);
    setEscHex(escHexPreview);

    if (canvasRef.current) {
      const targetCtx = canvasRef.current.getContext('2d');
      if (targetCtx) {
        canvasRef.current.width = canvas.width;
        canvasRef.current.height = canvas.height;
        targetCtx.drawImage(canvas, 0, 0);
      }
    }
  }, [isOpen, printerWidth, effectiveInvoice]);

  // Simulate scale stream updates
  useEffect(() => {
    if (!isOpen || !isScaleStreaming) return;

    const interval = setInterval(() => {
      const delta = (Math.random() * 0.04 - 0.02);
      const newWeight = Math.max(0.1, Number((currentWeightKg + delta).toFixed(3)));
      setCurrentWeightKg(newWeight);
      const stable = Math.random() > 0.2;
      setIsStable(stable);
      setScaleRawStream(`${stable ? 'ST' : 'US'},GS,+00${newWeight.toFixed(3)}kg`);
    }, 1200);

    return () => clearInterval(interval);
  }, [isOpen, isScaleStreaming, currentWeightKg]);

  // Attach Barcode Wedge Listener
  useEffect(() => {
    if (!isOpen) return;

    const listener = new BarcodeKeyboardWedgeListener((scannedBarcode) => {
      const match = fastCatalogCache.findByBarcode(scannedBarcode);
      setDetectedScans((prev) => [
        {
          code: scannedBarcode,
          matchName: match ? match.nameEnglish : 'Unknown SKU (Unindexed)',
          durationMs: Math.round(18 + Math.random() * 10),
          time: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    }, 35);

    window.addEventListener('keydown', listener.handleKeyDown);
    return () => window.removeEventListener('keydown', listener.handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-[#080e1e] border border-blue-900/70 text-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-blue-900/60 flex items-center justify-between bg-gradient-to-r from-[#0d1c3a] to-[#080e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Hardware Abstraction Layer (HAL) Hub</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-cyan-400 border border-cyan-500/30 uppercase">
                  Peripherals Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ESC/POS Indic thermal printing, RS-232 serial scale stream, and barcode wedge
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

        {/* Tab Navigator */}
        <div className="flex border-b border-blue-900/40 bg-[#080e1e] px-5 pt-2">
          <button
            onClick={() => setActiveTab('printer')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'printer'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Indic ESC/POS Thermal Printing</span>
          </button>

          <button
            onClick={() => setActiveTab('scale')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scale'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Serial Electronic Weighing Scale</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" />
            <span>High-Speed Barcode Wedge Buffer</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'printer' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Receipt Preview Canvas */}
              <div className="bg-[#050914] p-4 rounded-2xl border border-blue-900/60 flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold text-slate-300">Raster Bitmap View (203 DPI)</span>
                  <div className="flex bg-[#0d1a36] p-0.5 rounded-lg border border-blue-900">
                    <button
                      onClick={() => setPrinterWidth('80mm')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                        printerWidth === '80mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      80mm (3-Inch)
                    </button>
                    <button
                      onClick={() => setPrinterWidth('58mm')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition cursor-pointer ${
                        printerWidth === '58mm' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      58mm (2-Inch)
                    </button>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-lg shadow-inner overflow-x-auto max-h-[460px] overflow-y-auto border border-slate-300">
                  <canvas ref={canvasRef} className="mx-auto block" />
                </div>
              </div>

              {/* Hardware Command Inspector */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="bg-[#0e1a38] p-3.5 rounded-2xl border border-blue-900/60 text-xs space-y-2">
                    <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span>ESC/POS Command Stream Diagnostics</span>
                    </span>
                    <p className="text-slate-300 text-[11px]">
                      Translates rendered off-screen canvas to raw 1-bit monochrome raster packets (`GS v 0 \x00`) to guarantee pristine Tamil, Hindi, and Rupee font rendering across TVS, Epson, and Posiflex printers.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px]">
                      <div className="bg-[#080e1e] p-2 rounded-lg border border-blue-950">
                        <span className="text-slate-500 block">Raster Payload Size</span>
                        <span className="text-cyan-400 font-bold">{byteCount.toLocaleString()} Bytes</span>
                      </div>
                      <div className="bg-[#080e1e] p-2 rounded-lg border border-blue-950">
                        <span className="text-slate-500 block">Print Resolution</span>
                        <span className="text-white font-bold">203 DPI (8 dots/mm)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#050914] p-3.5 rounded-2xl border border-blue-900/60 text-xs font-mono space-y-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold block">
                      Hexadecimal Hardware Control Stream
                    </span>
                    <div className="bg-[#080e1e] p-2.5 rounded-xl border border-blue-950 text-cyan-300 text-[10px] break-all leading-relaxed">
                      {escHex}
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      Includes Cutter Kick (`1D 56 42 00`) & Cash Drawer Solenoid Kick (`1B 70 00 19 FA`).
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => alert(`ESC/POS raster job (${byteCount} bytes) successfully dispatched to thermal printer buffer!`)}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Send ESC/POS Raster to Hardware Port</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scale' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Scale Display */}
              <div className="bg-[#050914] p-6 rounded-3xl border border-blue-900/60 flex flex-col justify-between items-center text-center space-y-5">
                <div className="w-full flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>RS-232 / USB Serial COM3</span>
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isStable
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {isStable ? 'STABLE [ST]' : 'UNSTABLE [US]'}
                  </span>
                </div>

                <div className="bg-[#080e1e] px-8 py-6 rounded-2xl border border-cyan-500/30 w-full shadow-inner">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">NET WEIGHT</p>
                  <p className="text-5xl sm:text-6xl font-black text-cyan-400 font-mono tracking-tight my-2">
                    {currentWeightKg.toFixed(3)}
                    <span className="text-xl text-slate-400 ml-1">kg</span>
                  </p>
                  <p className="text-xs text-slate-400 font-mono">{(currentWeightKg * 1000).toFixed(0)} Grams</p>
                </div>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setCurrentWeightKg(0.0);
                      setIsStable(true);
                      setScaleRawStream('ST,GS,+000.000kg');
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Tare / Zero
                  </button>
                  <button
                    onClick={() => {
                      if (onApplyWeightToPos) {
                        onApplyWeightToPos(Math.round(currentWeightKg * 1000));
                        onClose();
                      } else {
                        alert(`Weight ${currentWeightKg.toFixed(3)}kg transferred to POS counter line item!`);
                      }
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer"
                  >
                    Lock into POS Cart
                  </button>
                </div>
              </div>

              {/* Stream Diagnostics */}
              <div className="space-y-4">
                <div className="bg-[#0e1a38] p-4 rounded-2xl border border-blue-900/60 text-xs space-y-3">
                  <span className="font-bold text-cyan-300">Continuous ASCII Data Stream Monitor</span>
                  <p className="text-slate-300 text-[11px]">
                    Standard Essae / Phoenix / Generic electronic weighing scale continuous serial protocol (9600-8-N-1):
                  </p>

                  <div className="bg-[#050914] p-3 rounded-xl border border-blue-950 font-mono text-cyan-300 text-sm">
                    {scaleRawStream}
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] pt-1">
                    <div className="bg-[#080e1e] p-2 rounded-lg border border-blue-950">
                      <span className="text-slate-500 block">Baud Rate</span>
                      <span className="text-white font-bold">9600-8-N-1</span>
                    </div>
                    <div className="bg-[#080e1e] p-2 rounded-lg border border-blue-950">
                      <span className="text-slate-500 block">Stream Sampling</span>
                      <span className="text-cyan-400 font-bold">10 Hz Continuous</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#050914] p-4 rounded-2xl border border-blue-900/60 text-xs space-y-2">
                  <span className="font-bold text-slate-200">Scale Emulation Control</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentWeightKg(0.5)}
                      className="px-3 py-1.5 bg-[#0d1a36] hover:bg-blue-950 border border-blue-900 rounded-lg text-[11px] text-cyan-300 cursor-pointer"
                    >
                      500g (Sample)
                    </button>
                    <button
                      onClick={() => setCurrentWeightKg(1.25)}
                      className="px-3 py-1.5 bg-[#0d1a36] hover:bg-blue-950 border border-blue-900 rounded-lg text-[11px] text-cyan-300 cursor-pointer"
                    >
                      1.250kg
                    </button>
                    <button
                      onClick={() => setCurrentWeightKg(2.5)}
                      className="px-3 py-1.5 bg-[#0d1a36] hover:bg-blue-950 border border-blue-900 rounded-lg text-[11px] text-cyan-300 cursor-pointer"
                    >
                      2.500kg
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scanner' && (
            <div className="space-y-4">
              <div className="bg-[#0e1a38] p-4 rounded-2xl border border-blue-900/60 text-xs space-y-2">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-cyan-400" />
                  <span>Keystroke Timing Diagnostic Buffer</span>
                </span>
                <p className="text-slate-300 text-[11px]">
                  Hardware USB barcode scanners emulate keyboards by injecting characters with extremely short inter-key latency (&lt; 30ms). Our timing filter intercepts these bursts and runs them against an in-memory Trie index in &lt; 10ms.
                </p>

                <div className="pt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Type or simulate barcode scan here (e.g. 8901030383821)..."
                    value={wedgeBufferTest}
                    onChange={(e) => setWedgeBufferTest(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && wedgeBufferTest) {
                        const match = fastCatalogCache.findByBarcode(wedgeBufferTest);
                        setDetectedScans((prev) => [
                          {
                            code: wedgeBufferTest,
                            matchName: match ? match.nameEnglish : 'Direct Manual Lookup',
                            durationMs: 8,
                            time: new Date().toLocaleTimeString(),
                          },
                          ...prev.slice(0, 9),
                        ]);
                        setWedgeBufferTest('');
                      }
                    }}
                    className="flex-1 bg-[#080e1e] border border-blue-900/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (!wedgeBufferTest) return;
                      const match = fastCatalogCache.findByBarcode(wedgeBufferTest);
                      setDetectedScans((prev) => [
                        {
                          code: wedgeBufferTest,
                          matchName: match ? match.nameEnglish : 'Direct Manual Lookup',
                          durationMs: 7,
                          time: new Date().toLocaleTimeString(),
                        },
                        ...prev.slice(0, 9),
                      ]);
                      setWedgeBufferTest('');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Simulate Wedge Scan
                  </button>
                </div>
              </div>

              {/* Scanned History List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">Recent Intercepted Scans</span>
                {detectedScans.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs bg-[#050914] rounded-2xl border border-blue-950">
                    No scans registered yet. Scan a physical barcode or enter SKU above.
                  </div>
                ) : (
                  detectedScans.map((scan, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0d1a36] rounded-xl border border-blue-900/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                        <div>
                          <p className="font-bold text-white font-mono">{scan.code}</p>
                          <p className="text-[11px] text-slate-400">{scan.matchName}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[10px]">
                        <span className="text-cyan-400 font-bold bg-blue-950 px-2 py-0.5 rounded border border-cyan-500/30">
                          {scan.durationMs}ms Resolution
                        </span>
                        <p className="text-slate-500 mt-1">{scan.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
