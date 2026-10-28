/**
 * Layer 4 & 5: Enterprise HQ, Multi-Branch, BOM Recipes, Room Folios & GST Export
 * High Plan Tier Module (₹1,499/mo)
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Layers,
  BedDouble,
  FileSpreadsheet,
  ShieldAlert,
  ArrowRightLeft,
  Download,
  CheckCircle,
  MessageSquare,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Package,
} from 'lucide-react';
import { AuditLog, HotelRoomFolio, Product, StockTransfer, Tenant } from '../types';
import { localDB } from '../services/db';

interface EnterpriseHqViewProps {
  tenant: Tenant;
  catalog: Product[];
  onRefreshCatalog: () => void;
}

export const EnterpriseHqView: React.FC<EnterpriseHqViewProps> = ({
  tenant,
  catalog,
  onRefreshCatalog,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bom' | 'branches' | 'folios' | 'gst' | 'audit' | 'eod'>(
    'bom'
  );
  const [folios, setFolios] = useState<HotelRoomFolio[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bomSuccessMsg, setBomSuccessMsg] = useState('');
  const [eodToast, setEodToast] = useState<string | null>(null);

  // Stock transfer modal state
  const [stockTransfers, setStockTransfers] = useState<StockTransfer[]>([
    {
      id: 'st_01',
      tenant_id: tenant.id,
      transferNumber: 'TRF-2026-081',
      fromBranchId: 'branch_h_hq',
      fromBranchName: 'Central Warehouse & HQ',
      toBranchId: 'branch_h_guindy',
      toBranchName: 'Grand Hotel Guindy',
      items: [
        { productId: 'raw_batter', productName: 'Fermented Batter', quantity: 40, unit: 'kg' },
        { productId: 'raw_ghee', productName: 'Dairy Cow Ghee', quantity: 15, unit: 'kg' },
      ],
      status: 'dispatched',
      requestedBy: 'Executive Chef Anand',
      createdAt: '2026-10-21 07:30 AM',
    },
  ]);

  const loadData = async () => {
    const rFolios = await localDB.getRoomFolios(tenant.id);
    const logs = await localDB.getAuditLogs(tenant.id);
    setFolios(rFolios);
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  // Simulate recipe BOM raw material stock deduction
  const handleSimulateBOMDeduction = async (fgProduct: Product) => {
    if (!fgProduct.bomIngredients || fgProduct.bomIngredients.length === 0) return;

    for (const ing of fgProduct.bomIngredients) {
      await localDB.updateProductStock(tenant.id, ing.rawProductId, ing.qtyRequired);
    }

    // Add audit log
    await localDB.addAuditLog({
      id: 'log_' + Date.now(),
      tenant_id: tenant.id,
      timestamp: new Date().toISOString(),
      actorId: 'pos_auto',
      actorName: 'BOM Engine',
      role: 'owner',
      action: 'BOM_DEDUCT',
      details: `Sold 1x "${fgProduct.nameEnglish}". Auto-deducted raw materials: ${fgProduct.bomIngredients
        .map((i) => `${i.qtyRequired}${i.unit} of ${i.rawProductName}`)
        .join(', ')}.`,
    });

    onRefreshCatalog();
    loadData();
    setBomSuccessMsg(
      `BOM Auto-Deducted! Raw stock of ${fgProduct.bomIngredients
        .map((i) => `${i.rawProductName} (-${i.qtyRequired}${i.unit})`)
        .join(' & ')} updated.`
    );
    setTimeout(() => setBomSuccessMsg(''), 4500);
  };

  // 1-Click Auditor GST GSTR-1 CSV/JSON Export
  const handleDownloadGSTR1 = async (format: 'json' | 'csv') => {
    try {
      const res = await fetch(`/api/v1/reports/gstr1?gstin=${tenant.gstNumber}`, {
        headers: { 'X-Tenant-ID': tenant.id },
      });
      const data = await res.json();

      let fileData: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        fileData = JSON.stringify(data, null, 2);
        filename = `GSTR1_${tenant.gstNumber}_Oct2026.json`;
        mimeType = 'application/json';
      } else {
        // Generate CSV content
        let csv = 'HSN Code,Description,Unit,Total Quantity,Taxable Value (INR),CGST,SGST,Total Tax\n';
        data.hsn.forEach((row: any) => {
          csv += `"${row.hsn_sc}","${row.desc}","${row.uqc}",${row.qty},${row.txval},${row.camt},${row.samt},${row.camt + row.samt}\n`;
        });
        fileData = csv;
        filename = `GSTR1_HSN_Summary_${tenant.gstNumber}_Oct2026.csv`;
        mimeType = 'text/csv';
      }

      const blob = new Blob([fileData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to generate GSTR-1 export');
    }
  };

  // Simulate Owner 9 PM Daily WhatsApp Digest
  const handleTrigger9PmSummary = async () => {
    const summaryMsg = `*9:00 PM DAILY BUSINESS SUMMARY*\n🏪 *${tenant.name}*\n📅 *${new Date().toLocaleDateString('en-IN')}*\n\n💰 *Total Sales:* ₹24,850.00\n💵 *Cash:* ₹9,200 | 📱 *UPI:* ₹14,100 | 💳 *Card:* ₹1,550\n\n🧾 *Bills Count:* 42\n🛑 *Voided / Reversals:* 1 (₹180 - Table 2)\n🚨 *Low Stock Alert:* Pure Ghee (5.2kg left)\n\n_Auto-dispatched via VyapaarOS HQ Engine_`;

    try {
      await fetch('/api/v1/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: tenant.phone,
          message: summaryMsg,
          type: 'eod_summary',
        }),
      });
    } catch (e) {}

    setEodToast('9 PM Daily WhatsApp Summary dispatched to Owner!');
    setTimeout(() => setEodToast(null), 4000);
    window.open(`https://wa.me/?text=${encodeURIComponent(summaryMsg)}`, '_blank');
  };

  const rawProducts = catalog.filter((p) => p.category.includes('Raw Materials'));
  const finishedBOMProducts = catalog.filter((p) => p.isBOMItem);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Toast */}
      {eodToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200 text-xs font-semibold">
          <MessageSquare className="w-4 h-4" />
          <span>{eodToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Enterprise HQ & Multi-Branch Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            High Plan Tier: Recipe BOM inventory deduction, multi-branch control, hotel room-folio billing & GST
          </p>
        </div>

        {/* 9 PM Owner WhatsApp Summary Button */}
        <button
          onClick={handleTrigger9PmSummary}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition self-start md:self-center"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Simulate 9 PM Owner WhatsApp Digest</span>
        </button>
      </div>

      {/* Sub Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('bom')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'bom'
              ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Recipe BOM Deductions</span>
        </button>

        <button
          onClick={() => setActiveSubTab('branches')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'branches'
              ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Multi-Branch Stock Transfers</span>
        </button>

        <button
          onClick={() => setActiveSubTab('folios')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'folios'
              ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BedDouble className="w-4 h-4" />
          <span>Hotel Room-Folios</span>
        </button>

        <button
          onClick={() => setActiveSubTab('gst')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'gst'
              ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>1-Click Auditor GST GSTR-1</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeSubTab === 'audit'
              ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Immutable Audit Logs</span>
        </button>
      </div>

      {/* 1. Recipe BOM Engine Tab */}
      {activeSubTab === 'bom' && (
        <div className="space-y-6">
          {bomSuccessMsg && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{bomSuccessMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Finished Goods with Attached BOM */}
            <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Finished Goods with Bill of Materials (BOM)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  When cashiers sell these dishes, raw materials are automatically calculated and subtracted from inventory in real-time.
                </p>
              </div>

              <div className="space-y-3">
                {finishedBOMProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white text-sm">{prod.nameEnglish}</p>
                        <p className="text-xs text-emerald-400 font-bold font-mono-numbers">
                          Menu Selling Price: ₹{prod.price}
                        </p>
                      </div>
                      <button
                        onClick={() => handleSimulateBOMDeduction(prod)}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Simulate 1 Sale Deduction</span>
                      </button>
                    </div>

                    <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                      <p className="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-1">
                        Recipe Raw Material Formula:
                      </p>
                      <div className="space-y-1">
                        {prod.bomIngredients?.map((ing, idx) => (
                          <div key={idx} className="flex justify-between text-slate-300">
                            <span>&bull; {ing.rawProductName}</span>
                            <span className="font-mono text-purple-300 font-bold">
                              {ing.qtyRequired} {ing.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current Raw Material Stock Levels */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Live Kitchen Raw Stock Levels</span>
              </h3>

              <div className="space-y-2">
                {rawProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-white">{p.nameEnglish}</p>
                      <p className="text-[11px] text-slate-400">SKU: {p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base font-black font-mono-numbers ${
                          p.stockQty < p.lowStockThreshold ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {p.stockQty} {p.unit}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Min Threshold: {p.lowStockThreshold} {p.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Multi-Branch Stock Transfers */}
      {activeSubTab === 'branches' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-purple-400" />
                <span>Inter-Branch Stock Transfers & Dispatch</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transfer goods between Central Warehouse (HQ) and dining branches with transit tracking
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {stockTransfers.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {st.transferNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {st.status}
                    </span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{st.createdAt}</span>
                </div>

                <div className="flex items-center gap-4 text-slate-300">
                  <div className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Source Warehouse:</p>
                    <p className="font-bold text-white">{st.fromBranchName}</p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-purple-400 shrink-0" />
                  <div className="flex-1 p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Destination Branch:</p>
                    <p className="font-bold text-white">{st.toBranchName}</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                    Items in Shipment:
                  </p>
                  {st.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-slate-200">
                      <span>&bull; {it.productName}</span>
                      <span className="font-mono font-bold text-purple-300">
                        {it.quantity} {it.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Hotel Room Folios */}
      {activeSubTab === 'folios' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-purple-400" />
                <span>Hotel Room-Folios (Restaurant & POS Charges Consolidated)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Guests can charge dining, beverages and room service directly to their room number.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {folios.map((folio) => (
              <div
                key={folio.id}
                className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between space-y-3 text-xs"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-lg font-black text-white">{folio.roomNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {folio.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-slate-300 font-bold mt-1">{folio.guestName}</p>
                  <p className="text-[11px] text-slate-400">{folio.guestPhone}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Stay: {folio.checkInDate} to {folio.checkOutDate} ({folio.nights} nights)
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Room Charges:</span>
                    <span>₹{folio.roomChargesPerNight * folio.nights}</span>
                  </div>
                  <div className="flex justify-between text-indigo-300 font-semibold">
                    <span>POS / Dining Charges:</span>
                    <span>+₹{folio.restaurantAndPosCharges}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Advance Paid:</span>
                    <span>-₹{folio.advancePaid}</span>
                  </div>
                  <div className="flex justify-between font-black text-sm text-white pt-1 border-t border-slate-800 font-mono-numbers">
                    <span>Folio Balance:</span>
                    <span>₹{folio.totalBalance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. 1-Click Auditor GST GSTR-1 Export */}
      {activeSubTab === 'gst' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <span>1-Click Auditor GST GSTR-1 Export & HSN Summary</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official GST portal format with B2CS Sales Register & Table 12 HSN tax breakdown
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadGSTR1('json')}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              >
                <Download className="w-4 h-4" />
                <span>Download GSTR-1 JSON</span>
              </button>
              <button
                onClick={() => handleDownloadGSTR1('csv')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download HSN CSV</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Registered GSTIN</p>
              <p className="text-base font-bold text-white font-mono mt-1">{tenant.gstNumber}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Filing Period</p>
              <p className="text-base font-bold text-white mt-1">October 2026 (Monthly)</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <p className="text-xs text-slate-400 font-semibold">Place of Supply (POS)</p>
              <p className="text-base font-bold text-white mt-1">33 - Tamil Nadu</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. Immutable Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Immutable Staff Activity & Reversal Logs</span>
          </h3>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <p className="text-slate-500 text-xs py-8 text-center">No audit logs recorded yet.</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-mono text-[10px]">
                        {log.action}
                      </span>
                      <span>by {log.actorName} ({log.role})</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{log.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
