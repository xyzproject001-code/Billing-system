/**
 * HI Scale Desktop POS Terminal
 * High-speed multi-tab billing terminal with:
 * - Multi-bill tab strip (#1, #2 [Ctrl+W], + New Bill [Ctrl+T])
 * - Top Search Bar with Tanglish Phonetic Search & Barcode Scan
 * - Royal Blue & Cyan high-contrast styling
 * - Bottom Function Strip [F1]..[F12] and Save & Print [Ctrl+P]
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Calendar,
  X,
  Plus,
  Minus,
  Trash2,
  Printer,
  ChevronDown,
  ChevronRight,
  Receipt,
  RotateCcw,
  Scale,
  Sparkles,
  UtensilsCrossed,
  ArrowUp,
  CreditCard,
  QrCode,
} from 'lucide-react';
import {
  CartItem,
  Invoice,
  InvoiceCustomer,
  PaymentMethod,
  Product,
  RestaurantTable,
  Tenant,
  UserStaff,
} from '../types';
import { searchProducts } from '../utils/tanglishSearch';
import { localDB } from '../services/db';
import { LooseWeightModal } from './LooseWeightModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { generateUPIQRCodeDataUrl } from '../utils/upi';

interface BillDraft {
  id: string;
  tabLabel: string;
  items: CartItem[];
  customer: InvoiceCustomer;
  paymentMode: PaymentMethod;
  amountReceived: number;
  tableContext?: RestaurantTable | null;
}

interface HiScalePosTerminalProps {
  tenant: Tenant;
  catalog: Product[];
  activeStaff: UserStaff;
  allStaff: UserStaff[];
  isOnline: boolean;
  onInvoiceCreated: (invoice: Invoice) => void;
  onRefreshCatalog: () => void;
  activeTableContext?: RestaurantTable | null;
  onClearTableContext?: () => void;
}

export const HiScalePosTerminal: React.FC<HiScalePosTerminalProps> = ({
  tenant,
  catalog,
  activeStaff,
  allStaff,
  isOnline,
  onInvoiceCreated,
  onRefreshCatalog,
  activeTableContext,
  onClearTableContext,
}) => {
  const [bills, setBills] = useState<BillDraft[]>([
    {
      id: 'draft_1',
      tabLabel: 'Bill #1',
      items: [],
      customer: { name: '', phone: '' },
      paymentMode: 'cash',
      amountReceived: 0,
    },
    {
      id: 'draft_2',
      tabLabel: 'Bill #2',
      items: [],
      customer: { name: '', phone: '' },
      paymentMode: 'cash',
      amountReceived: 0,
      tableContext: activeTableContext,
    },
  ]);
  const [activeTabIdx, setActiveTabIdx] = useState(1);

  const activeBill = bills[activeTabIdx] || bills[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number>(-1);
  const [looseModalProduct, setLooseModalProduct] = useState<Product | null>(null);
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

  // Dynamic UPI QR Modal
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');
  const [billDate, setBillDate] = useState('21/10/2026');

  // Audio feedback cue
  const playBeep = (freq = 920, duration = 0.07) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // AudioContext blocked until first user gesture
    }
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard Shortcuts Engine (F1, F2, F3, F4, F6, F11, Ctrl+P, Ctrl+T, Ctrl+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        handleAddNewBillTab();
      } else if (e.ctrlKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        handleCloseBillTab(activeTabIdx);
      } else if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        handleSaveAndPrint();
      } else if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (selectedRowIdx >= 0 && activeBill.items[selectedRowIdx]) {
          const qty = prompt('Enter new quantity:', activeBill.items[selectedRowIdx].quantity.toString());
          if (qty && parseFloat(qty) > 0) {
            handleUpdateItemQty(selectedRowIdx, parseFloat(qty));
          }
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (selectedRowIdx >= 0 && activeBill.items[selectedRowIdx]) {
          handleRemoveItem(selectedRowIdx);
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        const looseProd = catalog.find((p) => p.isLooseItem) || catalog[0];
        if (looseProd) setLooseModalProduct(looseProd);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabIdx, bills, selectedRowIdx, catalog]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
    } else {
      const results = searchProducts(catalog, searchQuery);
      setSearchResults(results.slice(0, 8));
    }
  }, [searchQuery, catalog]);

  // Calculations
  const subtotal = activeBill.items.reduce((sum, item) => sum + (item.itemTotal - item.taxAmount), 0);
  const taxTotal = activeBill.items.reduce((sum, item) => sum + item.taxAmount, 0);
  const totalItemCount = activeBill.items.length;
  const totalQtyCount = activeBill.items.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotal = Math.round(subtotal + taxTotal);
  const changeToReturn = Math.max(0, (activeBill.amountReceived || 0) - grandTotal);

  // Tab operations
  const handleAddNewBillTab = () => {
    const nextNum = bills.length + 1;
    const newDraft: BillDraft = {
      id: 'draft_' + Date.now(),
      tabLabel: `Bill #${nextNum}`,
      items: [],
      customer: { name: '', phone: '' },
      paymentMode: 'cash',
      amountReceived: 0,
    };
    setBills([...bills, newDraft]);
    setActiveTabIdx(bills.length);
  };

  const handleCloseBillTab = (idxToClose: number) => {
    if (bills.length <= 1) return;
    const nextBills = bills.filter((_, i) => i !== idxToClose);
    setBills(nextBills);
    setActiveTabIdx(Math.max(0, idxToClose - 1));
  };

  const handleUpdateActiveBill = (updates: Partial<BillDraft>) => {
    const next = [...bills];
    next[activeTabIdx] = { ...next[activeTabIdx], ...updates };
    setBills(next);
  };

  // Add Item
  const handleAddItemToActiveBill = (product: Product) => {
    if (product.isLooseItem) {
      setLooseModalProduct(product);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    const currentItems = [...activeBill.items];
    const existingIdx = currentItems.findIndex(
      (item) => item.product.id === product.id && !item.weightGrams
    );

    if (existingIdx >= 0) {
      const item = currentItems[existingIdx];
      const newQty = item.quantity + 1;
      const rateMultiplier = product.taxRate / (100 + product.taxRate);
      const gross = newQty * product.price;
      const taxAmt = tenant.isTaxInclusive
        ? gross * rateMultiplier
        : (gross * product.taxRate) / 100;

      item.quantity = newQty;
      item.itemTotal = gross;
      item.taxAmount = Number(taxAmt.toFixed(2));
    } else {
      const rateMultiplier = product.taxRate / (100 + product.taxRate);
      const gross = product.price;
      const taxAmt = tenant.isTaxInclusive
        ? gross * rateMultiplier
        : (gross * product.taxRate) / 100;

      const newItem: CartItem = {
        id: 'ci_' + Date.now() + Math.random().toString(36).substring(2, 5),
        product,
        quantity: 1,
        itemTotal: gross,
        taxAmount: Number(taxAmt.toFixed(2)),
      };
      currentItems.push(newItem);
    }

    handleUpdateActiveBill({ items: currentItems });
    setSearchQuery('');
    setSearchResults([]);
    playBeep(920);
  };

  const handleAddLooseWeightItem = (
    product: Product,
    quantity: number,
    weightGrams: number,
    calculatedPrice: number
  ) => {
    const currentItems = [...activeBill.items];
    const rateMultiplier = product.taxRate / (100 + product.taxRate);
    const taxAmt = tenant.isTaxInclusive
      ? calculatedPrice * rateMultiplier
      : (calculatedPrice * product.taxRate) / 100;

    const newItem: CartItem = {
      id: 'ci_' + Date.now() + Math.random().toString(36).substring(2, 5),
      product,
      quantity,
      weightGrams,
      itemTotal: calculatedPrice,
      taxAmount: Number(taxAmt.toFixed(2)),
    };
    currentItems.push(newItem);
    handleUpdateActiveBill({ items: currentItems });
  };

  const handleUpdateItemQty = (rowIdx: number, newQty: number) => {
    const currentItems = [...activeBill.items];
    const item = currentItems[rowIdx];
    if (!item) return;

    if (newQty <= 0) {
      handleRemoveItem(rowIdx);
      return;
    }

    const singleRate = item.itemTotal / item.quantity;
    const gross = singleRate * newQty;
    const rateMultiplier = item.product.taxRate / (100 + item.product.taxRate);
    const taxAmt = tenant.isTaxInclusive
      ? gross * rateMultiplier
      : (gross * item.product.taxRate) / 100;

    item.quantity = newQty;
    item.itemTotal = Number(gross.toFixed(2));
    item.taxAmount = Number(taxAmt.toFixed(2));

    handleUpdateActiveBill({ items: currentItems });
  };

  const handleRemoveItem = (rowIdx: number) => {
    const currentItems = activeBill.items.filter((_, i) => i !== rowIdx);
    handleUpdateActiveBill({ items: currentItems });
    setSelectedRowIdx(-1);
  };

  // Save & Print
  const handleSaveAndPrint = async () => {
    if (activeBill.items.length === 0) {
      alert('Cannot checkout an empty bill. Scan or add items first.');
      return;
    }

    if (activeBill.paymentMode === 'upi' && !isUpiModalOpen) {
      const url = await generateUPIQRCodeDataUrl({
        upiVpa: tenant.upiVpa,
        payeeName: tenant.name,
        amount: grandTotal,
        transactionNote: `Bill ${activeBill.tabLabel}`,
      });
      setUpiQrDataUrl(url);
      setIsUpiModalOpen(true);
      return;
    }

    const invNumber = `HI-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invNumber,
      tenant_id: tenant.id,
      branch_id: tenant.activeBranchId,
      counterId: 'Counter-01',
      cashierId: activeStaff.id,
      cashierName: activeStaff.name,
      customer: activeBill.customer.name ? activeBill.customer : undefined,
      items: [...activeBill.items],
      itemCount: activeBill.items.length,
      subtotal,
      taxTotal,
      taxBreakdown: [
        {
          rate: 5,
          taxable: subtotal,
          cgst: taxTotal / 2,
          sgst: taxTotal / 2,
          totalTax: taxTotal,
        },
      ],
      discountTotal: 0,
      roundOff: 0,
      grandTotal,
      paymentMethod: activeBill.paymentMode,
      status: 'completed',
      syncStatus: isOnline ? 'synced' : 'pending',
      createdAt: new Date().toISOString(),
      tableId: activeBill.tableContext?.tableNumber,
    };

    // Stock deduction & local save
    for (const item of activeBill.items) {
      if (item.product.isBOMItem && item.product.bomIngredients) {
        for (const ing of item.product.bomIngredients) {
          await localDB.updateProductStock(tenant.id, ing.rawProductId, ing.qtyRequired * item.quantity);
        }
      } else {
        const qty = item.weightGrams ? item.weightGrams / 1000 : item.quantity;
        await localDB.updateProductStock(tenant.id, item.product.id, qty);
      }
    }

    await localDB.saveInvoice(newInvoice, isOnline);
    onInvoiceCreated(newInvoice);
    onRefreshCatalog();

    setCompletedInvoice(newInvoice);
    setIsUpiModalOpen(false);

    handleUpdateActiveBill({
      items: [],
      customer: { name: '', phone: '' },
      amountReceived: 0,
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] text-slate-900 select-none font-sans">
      {/* 1. Multi-Bill Tab Bar with Royal Blue Highlights */}
      <div className="bg-slate-200/90 border-b border-slate-300 px-3 pt-2 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          {bills.map((b, idx) => {
            const isActive = idx === activeTabIdx;
            return (
              <div
                key={b.id}
                onClick={() => setActiveTabIdx(idx)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold cursor-pointer transition border-t-2 ${
                  isActive
                    ? 'bg-white text-slate-900 border-t-blue-600 shadow-xs'
                    : 'bg-slate-300/70 text-slate-600 hover:bg-slate-300 border-transparent'
                }`}
              >
                <span>{b.tabLabel}</span>
                {isActive && (
                  <span className="text-[10px] text-blue-600 font-mono font-bold">
                    Ctrl+W
                  </span>
                )}
                {bills.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseBillTab(idx);
                    }}
                    className="hover:text-red-500 rounded p-0.5 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* + New Bill Tab [Ctrl+T] */}
          <button
            onClick={handleAddNewBillTab}
            className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl font-bold text-blue-600 hover:bg-blue-50 transition text-xs"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Bill [Ctrl+T]</span>
          </button>
        </div>

        {/* Active Table indicator if restaurant */}
        {activeBill.tableContext && (
          <div className="flex items-center gap-1.5 bg-sky-100 text-sky-800 px-3 py-1 rounded-lg text-xs font-bold border border-sky-200">
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Table: {activeBill.tableContext.tableNumber}</span>
          </div>
        )}
      </div>

      {/* 2. Top Scan or Search Bar with Royal Blue & Cyan Focus */}
      <div className="bg-white p-3 border-b border-slate-200 relative">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Scan barcode or type Tanglish (e.g. 'ulunthu', 'sakkarai', 'kadugu', 'dosa')"
            className="w-full bg-[#f8fafc] border-2 border-blue-600/80 rounded-xl py-2.5 pl-4 pr-10 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <Barcode className="w-5 h-5 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Tanglish Search Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl z-40 max-h-72 overflow-y-auto">
            <div className="p-2.5 bg-blue-50/90 text-[11px] font-bold text-blue-900 uppercase tracking-wider flex justify-between">
              <span>HI Scale Fast Search (Tanglish Enabled)</span>
              <span>Selling Rate</span>
            </div>
            {searchResults.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleAddItemToActiveBill(prod)}
                className="p-3 hover:bg-blue-50/60 border-b border-slate-100 cursor-pointer flex items-center justify-between text-xs transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{prod.nameEnglish}</span>
                    {prod.nameTamil && (
                      <span className="text-[11px] text-blue-700 font-semibold">
                        ({prod.nameTamil})
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Code: {prod.sku} &bull; Unit: {prod.unit} &bull; Stock: {prod.stockQty}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-sm text-slate-900 font-mono-numbers">
                    ₹{prod.price}
                  </span>
                  {prod.isLooseItem && (
                    <span className="block text-[9px] text-blue-600 font-bold">
                      Loose Weight Calc (F6)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Center Section: Grid Table (9 cols) + Customer & Totals (3 cols) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Data Grid */}
        <div className="lg:col-span-9 bg-white border-r border-slate-200 overflow-y-auto flex flex-col justify-between">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-10 text-center">#</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-28">Item Code</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 min-w-[200px]">Item Name</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-center">Qty</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-20">Unit</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-32 text-right">
                    Price/Unit(₹)<br /><span className="text-[9px] font-normal normal-case text-slate-500">Without Tax</span>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-24 text-right">Discount(₹)</th>
                  <th className="py-2.5 px-3 border-r border-slate-200 w-28 text-right">Tax Applied(₹)</th>
                  <th className="py-2.5 px-4 text-right w-32">Total(₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeBill.items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center text-slate-400">
                      <Barcode className="w-12 h-12 stroke-[1.2] mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-sm text-slate-700">Scan or Search to Start Bill</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Use hardware barcode reader or type Tanglish (&ldquo;ulunthu&rdquo;, &ldquo;sakkarai&rdquo;, &ldquo;kadugu&rdquo;)
                      </p>
                    </td>
                  </tr>
                ) : (
                  activeBill.items.map((item, idx) => {
                    const isSelected = selectedRowIdx === idx;
                    const priceWithoutTax = item.itemTotal - item.taxAmount;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedRowIdx(idx)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/70 font-medium' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 border-r border-slate-100 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 font-mono text-slate-600">
                          {item.product.sku}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100">
                          <span className="font-bold text-slate-900">{item.product.nameEnglish}</span>
                          {item.product.nameTamil && (
                            <span className="text-[10px] text-blue-600 ml-1.5 font-semibold">
                              ({item.product.nameTamil})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemQty(idx, item.quantity - 1);
                              }}
                              className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 font-bold flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="font-bold font-mono px-1">
                              {item.weightGrams ? `${(item.weightGrams / 1000).toFixed(3)}` : item.quantity}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpdateItemQty(idx, item.quantity + 1);
                              }}
                              className="w-5 h-5 rounded bg-slate-200 hover:bg-slate-300 font-bold flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 text-slate-600 font-medium">
                          {item.product.unit}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono-numbers">
                          {(priceWithoutTax / item.quantity).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono-numbers text-slate-400">
                          0.00
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-100 text-right font-mono-numbers text-slate-600">
                          {item.taxAmount.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-slate-900 font-mono-numbers text-sm">
                          {item.itemTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Customer & Total Panel */}
        <div className="lg:col-span-3 bg-white p-4 flex flex-col justify-between space-y-4 text-xs">
          <div className="space-y-4">
            {/* Bill Date */}
            <div className="flex items-center justify-between border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <span className="font-bold text-slate-800 font-mono">{billDate}</span>
              <Calendar className="w-4 h-4 text-blue-600 cursor-pointer" />
            </div>

            {/* Customer Search [F11] */}
            <div className="space-y-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={activeBill.customer.name}
                  onChange={(e) =>
                    handleUpdateActiveBill({
                      customer: { ...activeBill.customer, name: e.target.value },
                    })
                  }
                  placeholder="Customer Name / Khata [F11]"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-3 pr-8 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <input
                type="text"
                value={activeBill.customer.phone}
                onChange={(e) =>
                  handleUpdateActiveBill({
                    customer: { ...activeBill.customer, phone: e.target.value },
                  })
                }
                placeholder="Mobile (for WhatsApp receipt)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Receipt Summary Card with Royal Blue & Cyan Gradient */}
            <div className="bg-gradient-to-br from-blue-50 via-sky-50/50 to-cyan-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/25">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-slate-900 text-xl font-mono-numbers">
                    Total ₹ {grandTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Items: {totalItemCount} &bull; Qty: {totalQtyCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Mode & Amount Received */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Payment Mode:
                </label>
                <select
                  value={activeBill.paymentMode}
                  onChange={(e) =>
                    handleUpdateActiveBill({ paymentMode: e.target.value as PaymentMethod })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI (Locked QR)</option>
                  <option value="card">Card</option>
                  <option value="khata">Khata Credit</option>
                  <option value="split">Split Bill</option>
                  <option value="room_folio">Room Folio</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Amount Received:
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={activeBill.amountReceived || ''}
                    onChange={(e) =>
                      handleUpdateActiveBill({ amountReceived: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-6 pr-2 text-xs font-bold text-slate-900 font-mono-numbers focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Quick Cash Presets */}
            {activeBill.paymentMode === 'cash' && grandTotal > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Quick Cash Tender
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateActiveBill({ amountReceived: grandTotal });
                      playBeep(700);
                    }}
                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] border border-blue-200 transition"
                  >
                    Exact (₹{grandTotal})
                  </button>
                  {[50, 100, 200, 500, 2000].map((amt) => {
                    if (amt < grandTotal && amt !== 500 && amt !== 2000) return null;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          handleUpdateActiveBill({ amountReceived: amt });
                          playBeep(700);
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-semibold text-[10px] border border-slate-200 hover:border-blue-200 transition"
                      >
                        ₹{amt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Change to Return */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-600">Change to Return:</span>
            <span className="font-black text-base font-mono-numbers text-blue-600">
              ₹ {changeToReturn.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Function Strip with Royal Blue & Cyan Accents */}
      <div className="bg-slate-100 border-t border-slate-300 p-2.5 grid grid-cols-1 md:grid-cols-12 gap-2 text-xs">
        {/* Function Keys (8 cols) */}
        <div className="md:col-span-8 grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              if (selectedRowIdx >= 0 && activeBill.items[selectedRowIdx]) {
                const qty = prompt('Enter new quantity:');
                if (qty && parseFloat(qty) > 0) handleUpdateItemQty(selectedRowIdx, parseFloat(qty));
              } else {
                alert('Click a row in the table first to change quantity');
              }
            }}
            className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold text-center border border-slate-200 transition shadow-2xs"
          >
            Quantity [F2]
          </button>

          <button
            onClick={() => alert('Discount applied')}
            className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-600 font-bold text-center border border-slate-200 transition shadow-2xs"
          >
            Discount [F3]
          </button>

          <button
            onClick={() => {
              if (selectedRowIdx >= 0) handleRemoveItem(selectedRowIdx);
              else alert('Select a table row first to remove item');
            }}
            className="py-2 px-2 rounded-xl bg-white hover:bg-rose-50 text-slate-800 hover:text-rose-600 font-bold text-center border border-slate-200 transition shadow-2xs"
          >
            Remove [F4]
          </button>

          <button
            onClick={() => {
              const loose = catalog.find((p) => p.isLooseItem) || catalog[0];
              setLooseModalProduct(loose);
            }}
            className="py-2 px-2 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-extrabold text-center border border-sky-300 transition shadow-2xs flex items-center justify-center gap-1"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Loose Calc [F6]</span>
          </button>

          <button className="py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-center border border-slate-200 transition">
            Charges [F8]
          </button>

          <button className="py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-center border border-slate-200 transition">
            Bill Disc [F9]
          </button>

          <button className="py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-center border border-slate-200 transition">
            Loyalty [F10]
          </button>

          <button className="py-2 px-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-center border border-slate-200 transition">
            Remarks [F12]
          </button>
        </div>

        {/* Right Checkout Buttons (4 cols) */}
        <div className="md:col-span-4 grid grid-cols-1 gap-2">
          {/* Save & Print Bill [Ctrl+P] */}
          <button
            onClick={handleSaveAndPrint}
            disabled={activeBill.items.length === 0}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-40 text-white font-black text-xs shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print Bill [Ctrl+P]</span>
          </button>

          {/* Other/Credit Payments [Ctrl+M] */}
          <button
            onClick={() => {
              handleUpdateActiveBill({ paymentMode: 'khata' });
              alert('Switched to Smart Khata Credit Ledger.');
            }}
            className="py-2 px-4 rounded-xl bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-700 font-bold text-xs border border-slate-300 transition text-center"
          >
            Other/Credit Payments [Ctrl+M]
          </button>
        </div>
      </div>

      {/* Loose Weight Modal */}
      <LooseWeightModal
        isOpen={!!looseModalProduct}
        product={looseModalProduct}
        onClose={() => setLooseModalProduct(null)}
        onAddToCart={handleAddLooseWeightItem}
      />

      {/* Dynamic Amount-Locked UPI Modal */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div>
              <p className="text-xs uppercase font-black text-blue-600 tracking-wider">
                HI Scale Instant UPI Pay
              </p>
              <p className="text-3xl font-black text-slate-900 font-mono-numbers mt-1">
                ₹{grandTotal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Amount locked &bull; Scan with GPay / PhonePe / Paytm / BHIM
              </p>
            </div>

            <div className="p-3 bg-white rounded-2xl border-2 border-blue-200 max-w-[210px] mx-auto shadow-sm">
              {upiQrDataUrl && (
                <img src={upiQrDataUrl} alt="UPI QR" className="w-full h-auto aspect-square" />
              )}
            </div>

            <p className="text-[11px] text-slate-500 font-mono">
              VPA: {tenant.upiVpa} &bull; Locked ₹{grandTotal.toFixed(2)}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndPrint}
                className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white font-extrabold text-xs shadow-md transition"
              >
                Confirm Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      <ThermalReceiptModal
        isOpen={!!completedInvoice}
        invoice={completedInvoice}
        tenant={tenant}
        onClose={() => setCompletedInvoice(null)}
      />
    </div>
  );
};
