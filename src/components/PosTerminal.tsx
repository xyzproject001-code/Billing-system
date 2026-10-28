/**
 * Layer 1 & 4: Core POS Terminal & Billing Counter
 * High-speed checkout with Tanglish search, loose weight calculator,
 * hardware barcode scan, voice mic, and instant amount-locked UPI payment.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Barcode,
  Mic,
  Scale,
  Trash2,
  Plus,
  Minus,
  Sparkles,
  CreditCard,
  QrCode,
  DollarSign,
  User,
  PauseCircle,
  FileText,
  RotateCcw,
  Percent,
  CheckCircle2,
  UtensilsCrossed,
  BedDouble,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import {
  CartItem,
  Invoice,
  InvoiceCustomer,
  PaymentMethod,
  Product,
  RestaurantTable,
  SplitPaymentDetail,
  Tenant,
  UserStaff,
} from '../types';
import { searchProducts } from '../utils/tanglishSearch';
import { canAccess } from '../services/entitlements';
import { localDB } from '../services/db';
import { LooseWeightModal } from './LooseWeightModal';
import { VoiceMicModal } from './VoiceMicModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { StaffPinModal } from './StaffPinModal';
import { ExpiryAlertsBanner } from './ExpiryAlertsBanner';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { generateUPIQRCodeDataUrl } from '../utils/upi';

interface PosTerminalProps {
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

export const PosTerminal: React.FC<PosTerminalProps> = ({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<InvoiceCustomer>({
    name: '',
    phone: '',
    isKhata: false,
  });

  // Modals state
  const [looseModalProduct, setLooseModalProduct] = useState<Product | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetail>({
    cash: 0,
    upi: 0,
    card: 0,
  });

  // Quick UPI Modal
  const [isUpiModalOpen, setIsUpiModalOpen] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState('');

  // Manager PIN Authorization Modal
  const [pinAction, setPinAction] = useState<{
    isOpen: boolean;
    description: string;
    action: () => void;
  }>({
    isOpen: false,
    description: '',
    action: () => {},
  });

  // Thermal Receipt Modal after bill creation
  const [completedInvoice, setCompletedInvoice] = useState<Invoice | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global hardware keyboard listener for barcode scanner & function keys
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys: F1 (Focus Search), F2 (Loose Weight), F4 (Voice Mic)
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Barcode Scanner detection (rapid key presses ending with Enter)
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 4) {
          const matched = catalog.find((p) => p.barcode === barcodeBuffer);
          if (matched) {
            handleQuickAddToCart(matched);
            barcodeBuffer = '';
          }
        }
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [catalog]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalog.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [catalog]);

  // Filtered products using Tanglish search
  const filteredProducts = useMemo(() => {
    return searchProducts(catalog, searchQuery, selectedCategory);
  }, [catalog, searchQuery, selectedCategory]);

  // Cart Calculations
  const { subtotal, taxTotal, taxBreakdown, grandTotal, roundOff } = useMemo(() => {
    let sub = 0;
    let tax = 0;
    const breakdownMap: Record<number, { taxable: number; cgst: number; sgst: number; totalTax: number }> = {};

    cart.forEach((item) => {
      sub += item.itemTotal - item.taxAmount;
      tax += item.taxAmount;

      const rate = item.product.taxRate;
      if (!breakdownMap[rate]) {
        breakdownMap[rate] = { taxable: 0, cgst: 0, sgst: 0, totalTax: 0 };
      }
      breakdownMap[rate].taxable += item.itemTotal - item.taxAmount;
      breakdownMap[rate].cgst += item.taxAmount / 2;
      breakdownMap[rate].sgst += item.taxAmount / 2;
      breakdownMap[rate].totalTax += item.taxAmount;
    });

    const exactTotal = sub + tax;
    const rounded = Math.round(exactTotal);
    const diff = Number((rounded - exactTotal).toFixed(2));

    const breakdownArray = Object.entries(breakdownMap).map(([rateStr, val]) => ({
      rate: Number(rateStr),
      taxable: Number(val.taxable.toFixed(2)),
      cgst: Number(val.cgst.toFixed(2)),
      sgst: Number(val.sgst.toFixed(2)),
      totalTax: Number(val.totalTax.toFixed(2)),
    }));

    return {
      subtotal: Number(sub.toFixed(2)),
      taxTotal: Number(tax.toFixed(2)),
      taxBreakdown: breakdownArray,
      grandTotal: rounded,
      roundOff: diff,
    };
  }, [cart]);

  // Add standard packaged or non-loose product
  const handleQuickAddToCart = (product: Product) => {
    if (product.isLooseItem) {
      setLooseModalProduct(product);
      return;
    }

    const existingIdx = cart.findIndex(
      (item) => item.product.id === product.id && !item.weightGrams
    );

    if (existingIdx >= 0) {
      const nextCart = [...cart];
      const item = nextCart[existingIdx];
      const newQty = item.quantity + 1;
      const rateMultiplier = product.taxRate / (100 + product.taxRate);
      const grossTotal = newQty * product.price;
      const taxAmt = tenant.isTaxInclusive
        ? grossTotal * rateMultiplier
        : (grossTotal * product.taxRate) / 100;

      item.quantity = newQty;
      item.itemTotal = grossTotal;
      item.taxAmount = Number(taxAmt.toFixed(2));
      setCart(nextCart);
    } else {
      const rateMultiplier = product.taxRate / (100 + product.taxRate);
      const grossTotal = product.price;
      const taxAmt = tenant.isTaxInclusive
        ? grossTotal * rateMultiplier
        : (grossTotal * product.taxRate) / 100;

      const newItem: CartItem = {
        id: 'cart_' + Date.now() + Math.random().toString(36).substring(2, 5),
        product,
        quantity: 1,
        itemTotal: grossTotal,
        taxAmount: Number(taxAmt.toFixed(2)),
      };
      setCart([...cart, newItem]);
    }
  };

  // Add loose product with computed weight
  const handleAddLooseProductToCart = (
    product: Product,
    quantity: number,
    weightGrams: number,
    calculatedPrice: number
  ) => {
    const rateMultiplier = product.taxRate / (100 + product.taxRate);
    const taxAmt = tenant.isTaxInclusive
      ? calculatedPrice * rateMultiplier
      : (calculatedPrice * product.taxRate) / 100;

    const newItem: CartItem = {
      id: 'cart_' + Date.now() + Math.random().toString(36).substring(2, 5),
      product,
      quantity,
      weightGrams,
      itemTotal: calculatedPrice,
      taxAmount: Number(taxAmt.toFixed(2)),
    };
    setCart([...cart, newItem]);
  };

  // Adjust item quantity
  const handleUpdateQty = (cartItemId: string, delta: number) => {
    const nextCart = cart
      .map((item) => {
        if (item.id === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;

          const singleItemPrice = item.itemTotal / item.quantity;
          const grossTotal = singleItemPrice * newQty;
          const rateMultiplier = item.product.taxRate / (100 + item.product.taxRate);
          const taxAmt = tenant.isTaxInclusive
            ? grossTotal * rateMultiplier
            : (grossTotal * item.product.taxRate) / 100;

          return {
            ...item,
            quantity: newQty,
            itemTotal: Number(grossTotal.toFixed(2)),
            taxAmount: Number(taxAmt.toFixed(2)),
          };
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    setCart(nextCart);
  };

  // Remove item
  const handleRemoveCartItem = (cartItemId: string) => {
    setCart(cart.filter((i) => i.id !== cartItemId));
  };

  // Void entire bill (Requires Manager PIN in Medium/High)
  const handleVoidCart = () => {
    if (cart.length === 0) return;

    if (tenant.planTier === 'basic') {
      setCart([]);
    } else {
      setPinAction({
        isOpen: true,
        description: 'Voiding current customer bill (Shrinkage Prevention)',
        action: () => {
          setCart([]);
        },
      });
    }
  };

  // Apply clearance discount from banner
  const handleApplyClearance = (productIds: string[], discountPercent: number) => {
    const nextCart = cart.map((item) => {
      if (productIds.includes(item.product.id)) {
        const disc = (item.itemTotal * discountPercent) / 100;
        return {
          ...item,
          discountPercent,
          discountAmount: Number(disc.toFixed(2)),
          itemTotal: Number((item.itemTotal - disc).toFixed(2)),
        };
      }
      return item;
    });
    setCart(nextCart);
  };

  // Process checkout & create invoice
  const handleCheckout = async (method: PaymentMethod) => {
    if (cart.length === 0) return;

    // If UPI selected, open dynamic QR modal first
    if (method === 'upi' && !isUpiModalOpen) {
      const url = await generateUPIQRCodeDataUrl({
        upiVpa: tenant.upiVpa,
        payeeName: tenant.name,
        amount: grandTotal,
        transactionNote: `Bill Checkout`,
      });
      setUpiQrDataUrl(url);
      setIsUpiModalOpen(true);
      return;
    }

    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

    const newInvoice: Invoice = {
      id: 'inv_' + Date.now(),
      invoiceNumber: invNumber,
      tenant_id: tenant.id,
      branch_id: tenant.activeBranchId,
      counterId: 'Counter-01',
      cashierId: activeStaff.id,
      cashierName: activeStaff.name,
      customer: customer.name ? customer : undefined,
      items: [...cart],
      itemCount: cart.length,
      subtotal,
      taxTotal,
      taxBreakdown,
      discountTotal: cart.reduce((sum, i) => sum + (i.discountAmount || 0), 0),
      roundOff,
      grandTotal,
      paymentMethod: method,
      splitDetails: method === 'split' ? splitDetails : undefined,
      status: 'completed',
      syncStatus: isOnline ? 'synced' : 'pending',
      createdAt: new Date().toISOString(),
      tableId: activeTableContext?.tableNumber,
      kotId: activeTableContext?.activeOrderId,
      roomNumber: customer.address?.startsWith('Room') ? customer.address : undefined,
    };

    // 1. Stock reduction (Layer 4)
    for (const item of cart) {
      // If item has BOM recipe (High tier), deduct ingredients
      if (item.product.isBOMItem && item.product.bomIngredients) {
        for (const ing of item.product.bomIngredients) {
          const qtyToDeduct = ing.qtyRequired * item.quantity;
          await localDB.updateProductStock(tenant.id, ing.rawProductId, qtyToDeduct);
        }
      } else {
        const qtyToDeduct = item.weightGrams ? item.weightGrams / 1000 : item.quantity;
        await localDB.updateProductStock(tenant.id, item.product.id, qtyToDeduct);
      }
    }

    // 2. If payment is Khata, record transaction
    if (method === 'khata' && customer.name && customer.phone) {
      const existingCustomers = await localDB.getKhataCustomers(tenant.id);
      let khataCust = existingCustomers.find((c) => c.phone === customer.phone);

      if (!khataCust) {
        khataCust = {
          id: 'khata_' + Date.now(),
          tenant_id: tenant.id,
          name: customer.name,
          phone: customer.phone,
          creditLimit: 5000,
          currentBalance: grandTotal,
          lastTransactionAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        await localDB.saveKhataCustomer(khataCust);
      } else {
        khataCust.currentBalance += grandTotal;
        khataCust.lastTransactionAt = new Date().toISOString();
        await localDB.saveKhataCustomer(khataCust);
      }

      await localDB.recordKhataTransaction({
        id: 'txn_' + Date.now(),
        tenant_id: tenant.id,
        customerId: khataCust.id,
        customerName: khataCust.name,
        customerPhone: khataCust.phone,
        type: 'credit_given',
        amount: grandTotal,
        invoiceId: newInvoice.id,
        balanceAfter: khataCust.currentBalance,
        notes: `POS Bill #${newInvoice.invoiceNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Save to local IndexedDB (Layer 2)
    await localDB.saveInvoice(newInvoice, isOnline);

    // 4. Record Audit Log
    await localDB.addAuditLog({
      id: 'log_' + Date.now(),
      tenant_id: tenant.id,
      timestamp: new Date().toISOString(),
      actorId: activeStaff.id,
      actorName: activeStaff.name,
      role: activeStaff.role,
      action: 'CREATE_BILL',
      details: `Generated Bill #${newInvoice.invoiceNumber} for ₹${newInvoice.grandTotal} via ${newInvoice.paymentMethod.toUpperCase()}`,
    });

    // 5. If table was billed, free table
    if (activeTableContext) {
      activeTableContext.status = 'vacant';
      activeTableContext.activeOrderId = undefined;
      activeTableContext.currentTotal = undefined;
      await localDB.updateTable(activeTableContext);
      if (onClearTableContext) onClearTableContext();
    }

    // Callback & UI updates
    onInvoiceCreated(newInvoice);
    onRefreshCatalog();
    setCompletedInvoice(newInvoice);
    setCart([]);
    setCustomer({ name: '', phone: '', isKhata: false });
    setIsUpiModalOpen(false);
    setIsSplitPaymentOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4">
      {/* Expiry alerts banner (Medium/High) */}
      {canAccess(tenant.planTier, 'expiryAlerts') && (
        <ExpiryAlertsBanner
          products={catalog}
          onApplyClearanceDiscount={handleApplyClearance}
        />
      )}

      {/* Table Context Banner if billing a specific restaurant table */}
      {activeTableContext && (
        <div className="bg-indigo-950/60 border border-indigo-500/50 rounded-xl p-3 flex items-center justify-between text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-indigo-400" />
            <span>
              Settling Bill for Table:{' '}
              <strong className="text-white font-bold">{activeTableContext.tableNumber}</strong>{' '}
              ({activeTableContext.floor})
            </span>
          </div>
          <button
            onClick={onClearTableContext}
            className="text-xs text-indigo-300 hover:text-white underline"
          >
            Switch to Direct Counter
          </button>
        </div>
      )}

      {/* Main Grid: Left Products Catalog & Search, Right Bill & Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Product Search & Item Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Top Bar: Search + Quick Hardware Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5 shadow-lg">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tanglish search (e.g. 'ulunthu', 'sakkarai', 'kadugu') or barcode..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Hardware Barcode Scanner Button */}
              <button
                onClick={() => setIsBarcodeModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                title="Barcode Scanner & Camera Simulator"
              >
                <Barcode className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Barcode</span>
              </button>

              {/* Voice-to-Cart Mic Billing Button (Medium+) */}
              {canAccess(tenant.planTier, 'voiceMicBilling') ? (
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  title="Voice-to-Cart Mic Billing"
                >
                  <Mic className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">Voice Mic</span>
                </button>
              ) : null}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {cat === 'ALL' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleQuickAddToCart(prod)}
                className="bg-slate-900 border border-slate-800 hover:border-indigo-500/80 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition hover:scale-[1.01] hover:shadow-lg group"
              >
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      {prod.unit}
                    </span>
                    {prod.isLooseItem && (
                      <span className="p-1 rounded bg-amber-500/20 text-amber-400" title="Loose item: supports reverse weight calculator">
                        <Scale className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-xs sm:text-sm mt-1 line-clamp-2 group-hover:text-indigo-300 transition">
                    {prod.nameEnglish}
                  </h4>
                  {prod.nameTamil && (
                    <p className="text-[11px] text-amber-300/80 font-medium mt-0.5 line-clamp-1">
                      {prod.nameTamil}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
                  <span className="text-base font-extrabold text-white font-mono-numbers">
                    ₹{prod.price}
                  </span>
                  <span
                    className={`text-[10px] font-semibold ${
                      prod.stockQty <= prod.lowStockThreshold
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    Stock: {prod.stockQty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Bill & Cart Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl min-h-[640px]">
          {/* Bill Top Header */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Active Customer Bill</h3>
                <span className="px-2 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
                  {cart.length} items
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={handleVoidCart}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold transition"
                  title="Clear / Void Bill"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Void</span>
                </button>
              )}
            </div>

            {/* Optional Customer Contact / Khata Field */}
            <div className="grid grid-cols-2 gap-2 my-2.5">
              <input
                type="text"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                placeholder="Customer Name (Optional)"
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl py-1.5 px-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                placeholder="Mobile / Khata Phone"
                className="bg-slate-800/80 border border-slate-700/80 rounded-xl py-1.5 px-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  <p className="font-semibold">Cart is currently empty</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Scan a barcode or tap products from the left to start billing
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{item.product.nameEnglish}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.weightGrams
                          ? `${(item.weightGrams / 1000).toFixed(3)} kg @ ₹${item.product.price}/kg`
                          : `₹${item.product.price} each &bull; GST ${item.product.taxRate}%`}
                      </p>
                    </div>

                    {/* Quantity Adjustment Buttons */}
                    {!item.weightGrams && (
                      <div className="flex items-center gap-1.5 bg-slate-900 px-1.5 py-0.5 rounded-lg border border-slate-700">
                        <button
                          onClick={() => handleUpdateQty(item.id, -1)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold font-mono text-xs w-4 text-center text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.id, 1)}
                          className="text-slate-400 hover:text-white p-0.5"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Line total */}
                    <div className="text-right shrink-0">
                      <span className="font-bold text-sm text-white font-mono-numbers">
                        ₹{item.itemTotal.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleRemoveCartItem(item.id)}
                        className="block ml-auto text-[10px] text-rose-400 hover:text-rose-300 mt-0.5"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Totals & Payment Actions */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            {/* Calculation Breakdown */}
            <div className="space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-slate-200 font-mono-numbers">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax Total (GST):</span>
                <span className="text-slate-200 font-mono-numbers">₹{taxTotal.toFixed(2)}</span>
              </div>
              {roundOff !== 0 && (
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Round Off:</span>
                  <span className="font-mono-numbers">₹{roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-white pt-1 border-t border-slate-800 font-mono-numbers">
                <span>Grand Total:</span>
                <span className="text-emerald-400 text-lg">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Instant Payment Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {/* Cash Payment */}
                <button
                  onClick={() => handleCheckout('cash')}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition active:scale-95"
                >
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  <span>Cash Payment</span>
                </button>

                {/* Amount-Locked UPI QR (Available on all tiers) */}
                <button
                  onClick={() => handleCheckout('upi')}
                  disabled={cart.length === 0}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 transition active:scale-95"
                >
                  <QrCode className="w-4 h-4 text-white" />
                  <span>Dynamic UPI QR</span>
                </button>
              </div>

              {/* Hybrid & Advanced Payment options */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleCheckout('card')}
                  disabled={cart.length === 0}
                  className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/60"
                >
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  <span>Card</span>
                </button>

                {/* Smart Khata (Credit) */}
                <button
                  onClick={() => {
                    if (!customer.name || !customer.phone) {
                      alert('Please enter customer Name and Phone number to bill to Khata credit ledger.');
                      return;
                    }
                    handleCheckout('khata');
                  }}
                  disabled={cart.length === 0}
                  className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/60"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Khata Credit</span>
                </button>

                {/* Split Payments (Medium/High) */}
                {canAccess(tenant.planTier, 'splitPayments') ? (
                  <button
                    onClick={() => {
                      setSplitDetails({ cash: Math.floor(grandTotal / 2), upi: Math.ceil(grandTotal / 2) });
                      setIsSplitPaymentOpen(true);
                    }}
                    disabled={cart.length === 0}
                    className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/60"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-purple-400" />
                    <span>Split Bill</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout('card')}
                    disabled={cart.length === 0}
                    className="py-2 px-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/60"
                  >
                    <span>Instant POS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loose Weight Modal */}
      <LooseWeightModal
        isOpen={!!looseModalProduct}
        product={looseModalProduct}
        onClose={() => setLooseModalProduct(null)}
        onAddToCart={handleAddLooseProductToCart}
      />

      {/* Voice Mic Modal */}
      <VoiceMicModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        catalog={catalog}
        onAddItemsToCart={(items) => {
          items.forEach((item) => {
            for (let i = 0; i < item.quantity; i++) {
              handleQuickAddToCart(item.product);
            }
          });
        }}
      />

      {/* Hardware Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        catalog={catalog}
        onScanProduct={handleQuickAddToCart}
      />

      {/* Staff Manager PIN Modal */}
      <StaffPinModal
        isOpen={pinAction.isOpen}
        onClose={() => setPinAction({ ...pinAction, isOpen: false })}
        staffList={allStaff}
        actionDescription={pinAction.description}
        onAuthorized={() => pinAction.action()}
      />

      {/* Dynamic Amount-Locked UPI QR Checkout Modal */}
      {isUpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div>
              <p className="text-xs uppercase font-extrabold text-indigo-400">
                Dynamic Amount-Locked UPI QR
              </p>
              <p className="text-3xl font-black text-white font-mono-numbers mt-1">
                ₹{grandTotal.toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Scan with any UPI App (GPay, PhonePe, Paytm, BHIM)
              </p>
            </div>

            <div className="p-3 bg-white rounded-2xl max-w-[210px] mx-auto shadow-xl">
              {upiQrDataUrl && (
                <img
                  src={upiQrDataUrl}
                  alt="Locked UPI QR"
                  className="w-full h-auto aspect-square"
                />
              )}
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              VPA: {tenant.upiVpa} &bull; Locked Amount
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setIsUpiModalOpen(false)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckout('upi')}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split Payment Modal */}
      {isSplitPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Split & Hybrid Multi-Mode Payment</h3>
            <p className="text-xs text-slate-400">Total to collect: ₹{grandTotal}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cash (₹):</label>
                <input
                  type="number"
                  value={splitDetails.cash}
                  onChange={(e) =>
                    setSplitDetails({ ...splitDetails, cash: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">UPI (₹):</label>
                <input
                  type="number"
                  value={splitDetails.upi}
                  onChange={(e) =>
                    setSplitDetails({ ...splitDetails, upi: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Card (₹):</label>
                <input
                  type="number"
                  value={splitDetails.card}
                  onChange={(e) =>
                    setSplitDetails({ ...splitDetails, card: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white font-mono-numbers"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSplitPaymentOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCheckout('split')}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Complete Split Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Invoice Thermal Receipt Preview */}
      <ThermalReceiptModal
        isOpen={!!completedInvoice}
        invoice={completedInvoice}
        tenant={tenant}
        onClose={() => setCompletedInvoice(null)}
      />
    </div>
  );
};
