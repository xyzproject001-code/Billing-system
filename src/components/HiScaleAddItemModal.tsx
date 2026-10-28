/**
 * HI Scale Add Item Master Modal
 * Modernized item catalog creation with:
 * - Product vs Service switch
 * - Royal Blue & Cyan styling
 * - Pricing & Stock tabs
 * - Reverse loose-weight calculator enablement
 */

import React, { useState } from 'react';
import { X, Search, Image as ImageIcon, Settings, Check, Sparkles, ArrowUp } from 'lucide-react';
import { Product, UnitType } from '../types';

interface HiScaleAddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: Product, saveAndNew: boolean) => void;
  tenantId: string;
}

export const HiScaleAddItemModal: React.FC<HiScaleAddItemModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
  tenantId,
}) => {
  if (!isOpen) return null;

  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [activeTab, setActiveTab] = useState<'pricing' | 'stock'>('pricing');

  // Form Fields
  const [nameEnglish, setNameEnglish] = useState('');
  const [nameTamil, setNameTamil] = useState('');
  const [hsnCode, setHsnCode] = useState('');
  const [unit, setUnit] = useState<UnitType>('piece');
  const [category, setCategory] = useState('Grocery Staples');
  const [itemCode, setItemCode] = useState('');
  const [barcode, setBarcode] = useState('');

  // Pricing
  const [salePrice, setSalePrice] = useState('');
  const [salePriceTaxMode, setSalePriceTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');
  const [discountVal, setDiscountVal] = useState('');
  const [discountType, setDiscountType] = useState<'Percentage' | 'Amount'>('Percentage');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [showWholesale, setShowWholesale] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchaseTaxMode, setPurchaseTaxMode] = useState<'Without Tax' | 'With Tax'>('Without Tax');
  const [taxRate, setTaxRate] = useState<0 | 5 | 12 | 18 | 28>(5);

  // Stock
  const [openingStock, setOpeningStock] = useState('50');
  const [minStockThreshold, setMinStockThreshold] = useState('10');
  const [expiryDate, setExpiryDate] = useState('');
  const [isLoose, setIsLoose] = useState(false);

  const handleAssignCode = () => {
    const generated = 'HI-' + Math.floor(1000 + Math.random() * 9000);
    setItemCode(generated);
    if (!barcode) setBarcode(Math.floor(8901000000000 + Math.random() * 99999999).toString());
  };

  const handleSave = (saveAndNew: boolean) => {
    if (!nameEnglish.trim()) {
      alert('Please enter Item Name');
      return;
    }

    const priceNum = parseFloat(salePrice) || 0;
    const costNum = parseFloat(purchasePrice) || priceNum * 0.75;
    const stockNum = parseFloat(openingStock) || 50;

    const newProd: Product = {
      id: 'prod_' + Date.now(),
      tenant_id: tenantId,
      barcode: barcode || Math.floor(8901000000000 + Math.random() * 99999999).toString(),
      sku: itemCode || 'SKU-' + Date.now().toString().slice(-4),
      nameEnglish: nameEnglish.trim(),
      nameTamil: nameTamil.trim() || undefined,
      phoneticKeywords: [
        nameEnglish.toLowerCase(),
        ...(nameTamil ? [nameTamil.toLowerCase()] : []),
      ],
      category,
      price: priceNum,
      costPrice: costNum,
      mrp: priceNum * 1.1,
      unit,
      isLooseItem: isLoose || unit === 'kg' || unit === 'g' || unit === 'liter',
      taxRate,
      hsnCode: hsnCode || '9999',
      stockQty: stockNum,
      lowStockThreshold: parseFloat(minStockThreshold) || 10,
      expiryDate: expiryDate || undefined,
    };

    onSaveProduct(newProd, saveAndNew);

    if (saveAndNew) {
      setNameEnglish('');
      setNameTamil('');
      setHsnCode('');
      setSalePrice('');
      setPurchasePrice('');
      setItemCode('');
      setBarcode('');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 text-slate-800 font-sans">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <ArrowUp className="w-4 h-4 stroke-[3]" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">HI Scale Add Item</h2>
            </div>

            {/* Product vs Service Switcher */}
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className={itemType === 'product' ? 'text-blue-600' : 'text-slate-500'}>
                Product
              </span>
              <button
                type="button"
                onClick={() => setItemType(itemType === 'product' ? 'service' : 'product')}
                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                  itemType === 'service' ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    itemType === 'service' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={itemType === 'service' ? 'text-blue-600' : 'text-slate-500'}>
                Service
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Top Form Fields: Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Item Name */}
            <div className="md:col-span-5 space-y-1">
              <label className="block text-[11px] font-bold text-blue-600">Item Name *</label>
              <input
                type="text"
                autoFocus
                value={nameEnglish}
                onChange={(e) => setNameEnglish(e.target.value)}
                placeholder="e.g. Ponni Boiled Rice / Masala Dosa"
                className="w-full bg-white border-2 border-blue-500 rounded-xl py-2 px-3 text-slate-900 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <input
                type="text"
                value={nameTamil}
                onChange={(e) => setNameTamil(e.target.value)}
                placeholder="Tamil / Tanglish name (e.g. உளுந்து / Ulunthu)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1 px-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 mt-1"
              />
            </div>

            {/* Item HSN */}
            <div className="md:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Item HSN Code</label>
              <div className="relative">
                <input
                  type="text"
                  value={hsnCode}
                  onChange={(e) => setHsnCode(e.target.value)}
                  placeholder="HSN Code (e.g. 0713)"
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 pl-3 pr-8 text-sm focus:outline-none focus:border-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Unit Selector */}
            <div className="md:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitType)}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold border border-blue-200 rounded-xl py-2 px-3 text-xs focus:outline-none cursor-pointer"
              >
                <option value="piece">Piece (Pcs)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="g">Gram (g)</option>
                <option value="packet">Packet (pkt)</option>
                <option value="plate">Plate</option>
                <option value="liter">Liter (L)</option>
                <option value="box">Box</option>
              </select>
            </div>

            {/* Image Placeholder */}
            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                className="w-full py-2 px-3 border border-dashed border-slate-300 hover:border-blue-400 rounded-xl text-blue-600 font-semibold flex items-center justify-center gap-1.5 transition text-xs bg-slate-50"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Row 2: Category & Item Code */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="Grocery Staples">Grocery Staples</option>
                <option value="Grains & Pulses">Grains & Pulses</option>
                <option value="Spices & Masala">Spices & Masala</option>
                <option value="Oils & Ghee">Oils & Ghee</option>
                <option value="Beverages">Beverages</option>
                <option value="Tiffin & Dosa">Tiffin & Dosa</option>
                <option value="Fine Dining & Restaurant">Fine Dining & Restaurant</option>
                <option value="Bakery & Sweets">Bakery & Sweets</option>
              </select>
            </div>

            <div className="md:col-span-4 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Item Code / SKU</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value)}
                  placeholder="e.g. HI-01"
                  className="flex-1 bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleAssignCode}
                  className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[11px] border border-blue-200 transition"
                >
                  Assign
                </button>
              </div>
            </div>

            <div className="md:col-span-4 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-500">Barcode</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter 890103..."
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Tab Navigation: Pricing vs Stock */}
          <div className="border-b border-slate-200 flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === 'pricing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Pricing Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                activeTab === 'stock'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Stock & Reverse Weight
            </button>
          </div>

          {/* Pricing Tab */}
          {activeTab === 'pricing' ? (
            <div className="space-y-6 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-700">Customer Sale Price</p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-5 flex">
                    <input
                      type="number"
                      step="any"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      placeholder="Sale Price (₹)"
                      className="w-2/3 bg-white border border-slate-300 rounded-l-xl py-2 px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                    />
                    <select
                      value={salePriceTaxMode}
                      onChange={(e) => setSalePriceTaxMode(e.target.value as any)}
                      className="w-1/3 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl px-2 text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="Without Tax">Without Tax</option>
                      <option value="With Tax">With Tax</option>
                    </select>
                  </div>

                  <div className="md:col-span-5 flex">
                    <input
                      type="number"
                      value={discountVal}
                      onChange={(e) => setDiscountVal(e.target.value)}
                      placeholder="Discount Amount"
                      className="w-2/3 bg-white border border-slate-300 rounded-l-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-mono-numbers"
                    />
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-1/3 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl px-2 text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="Percentage">%</option>
                      <option value="Amount">₹</option>
                    </select>
                  </div>
                </div>

                {!showWholesale ? (
                  <button
                    type="button"
                    onClick={() => setShowWholesale(true)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
                  >
                    + Add Wholesale Price
                  </button>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                    <input
                      type="number"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value)}
                      placeholder="Wholesale Price (₹)"
                      className="bg-white border border-slate-300 rounded-xl py-1.5 px-3 text-xs font-mono-numbers"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700">Cost / Purchase Price</p>
                  <div className="flex">
                    <input
                      type="number"
                      step="any"
                      value={purchasePrice}
                      onChange={(e) => setPurchasePrice(e.target.value)}
                      placeholder="Purchase Price (₹)"
                      className="w-2/3 bg-white border border-slate-300 rounded-l-xl py-2 px-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 font-mono-numbers"
                    />
                    <select
                      value={purchaseTaxMode}
                      onChange={(e) => setPurchaseTaxMode(e.target.value as any)}
                      className="w-1/3 bg-slate-100 border-y border-r border-slate-300 rounded-r-xl px-2 text-[11px] font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="Without Tax">Without Tax</option>
                      <option value="With Tax">With Tax</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold text-slate-700">GST Tax Bracket</p>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>GST @ 0% (Essential / Grains)</option>
                    <option value={5}>GST @ 5% (Staples, Dine-in)</option>
                    <option value={12}>GST @ 12% (Ghee, Packaged)</option>
                    <option value={18}>GST @ 18% (Bakery, Bakes)</option>
                    <option value={28}>GST @ 28% (Luxury)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Opening Stock Quantity:
                  </label>
                  <input
                    type="number"
                    value={openingStock}
                    onChange={(e) => setOpeningStock(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Low Stock Alert Threshold:
                  </label>
                  <input
                    type="number"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-bold font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Item Expiry Date:
                  </label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-950">
                <span className="font-semibold">
                  Enable Reverse Loose Weight Calculator for this item (e.g. ₹50 to calculated weight)
                </span>
                <input
                  type="checkbox"
                  checked={isLoose}
                  onChange={(e) => setIsLoose(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => handleSave(true)}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-300 transition"
          >
            Save & New
          </button>
          <button
            type="button"
            onClick={() => handleSave(false)}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-extrabold shadow-md shadow-blue-500/25 transition"
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
};
