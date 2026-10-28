/**
 * Layer 4: KOT & Table Manager (Medium & High Plan)
 * Interactive restaurant floor layout, waiter table tracking, and Kitchen Order Tickets (KDS)
 */

import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  ChefHat,
  Users,
  Clock,
  Plus,
  CheckCircle,
  FileText,
  DollarSign,
  QrCode,
  Flame,
  Coffee,
  X,
  Play,
  CheckCheck,
  RotateCcw,
} from 'lucide-react';
import { KitchenOrderTicket, Product, RestaurantTable, TableStatus, Tenant } from '../types';
import { localDB } from '../services/db';
import { BomReversalModal } from './BomReversalModal';


interface TableAndKotViewProps {
  tenant: Tenant;
  catalog: Product[];
  onOpenPosForTable: (table: RestaurantTable) => void;
}

export const TableAndKotView: React.FC<TableAndKotViewProps> = ({
  tenant,
  catalog,
  onOpenPosForTable,
}) => {
  const [activeTab, setActiveTab] = useState<'floor' | 'kitchen'>('floor');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [kots, setKots] = useState<KitchenOrderTicket[]>([]);
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [isQrOrderModalOpen, setIsQrOrderModalOpen] = useState(false);
  const [isCreateKotModalOpen, setIsCreateKotModalOpen] = useState(false);
  const [reversalTarget, setReversalTarget] = useState<{
    kot: KitchenOrderTicket;
    dishName: string;
    qty: number;
  } | null>(null);
  const [reversalNotice, setReversalNotice] = useState<string | null>(null);

  // New KOT creation inputs
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [kotItemQty, setKotItemQty] = useState(1);
  const [kotItemNotes, setKotItemNotes] = useState('');
  const [pendingKotItems, setPendingKotItems] = useState<
    { productId: string; productName: string; quantity: number; notes: string }[]
  >([]);

  const loadData = async () => {

    const tbls = await localDB.getTables(tenant.id);
    const tickets = await localDB.getKOTs(tenant.id);
    setTables(tbls);
    setKots(tickets);
  };

  useEffect(() => {
    loadData();
  }, [tenant.id]);

  const handleUpdateKotStatus = async (
    kotId: string,
    newStatus: 'active' | 'completed' | 'cancelled'
  ) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot) return;
    kot.status = newStatus;
    await localDB.saveKOT(kot);
    loadData();
  };

  const handleUpdateItemStatus = async (
    kotId: string,
    itemId: string,
    nextStatus: 'pending' | 'cooking' | 'ready' | 'served'
  ) => {
    const kot = kots.find((k) => k.id === kotId);
    if (!kot) return;
    const it = kot.items.find((i) => i.id === itemId);
    if (it) it.status = nextStatus;
    await localDB.saveKOT(kot);
    loadData();
  };

  const handleSendNewKot = async () => {
    if (!selectedTable || pendingKotItems.length === 0) return;

    const newKot: KitchenOrderTicket = {
      id: 'kot_' + Date.now(),
      kotNumber: `KOT-${Math.floor(100 + Math.random() * 900)}`,
      tenant_id: tenant.id,
      branch_id: tenant.activeBranchId,
      tableId: selectedTable.id,
      tableNumber: selectedTable.tableNumber,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waiterName: selectedTable.waiterName || 'Staff',
      status: 'active',
      orderType: 'dine_in',
      items: pendingKotItems.map((p, idx) => ({
        id: `koti_${Date.now()}_${idx}`,
        productId: p.productId,
        productName: p.productName,
        quantity: p.quantity,
        notes: p.notes,
        status: 'pending',
      })),
    };

    await localDB.saveKOT(newKot);

    // Update table status to KOT sent
    selectedTable.status = 'kot_sent';
    selectedTable.activeOrderId = newKot.id;
    await localDB.updateTable(selectedTable);

    setPendingKotItems([]);
    setIsCreateKotModalOpen(false);
    loadData();
  };

  const handleAddPendingItem = () => {
    const prod = catalog.find((p) => p.id === selectedProductToAdd);
    if (!prod) return;
    setPendingKotItems([
      ...pendingKotItems,
      {
        productId: prod.id,
        productName: prod.nameEnglish,
        quantity: kotItemQty,
        notes: kotItemNotes,
      },
    ]);
    setSelectedProductToAdd('');
    setKotItemQty(1);
    setKotItemNotes('');
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'vacant':
        return 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300';
      case 'occupied':
        return 'border-amber-500/50 bg-amber-950/20 text-amber-300 ring-1 ring-amber-500/40';
      case 'kot_sent':
        return 'border-blue-500/60 bg-blue-950/30 text-blue-300 ring-1 ring-blue-500/50 animate-pulse';
      case 'billed':
        return 'border-purple-500/60 bg-purple-950/20 text-purple-300';
    }
  };

  const filteredTables =
    selectedFloor === 'All'
      ? tables
      : tables.filter((t) => t.floor === selectedFloor);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-cyan-400">
              <UtensilsCrossed className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Table & Kitchen Order Ticket (KOT) Manager
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time dine-in floor status, live KDS chef display, and table QR self-ordering
          </p>
        </div>

        {/* Floor vs KDS Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('floor')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'floor'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Dining Floor Plan</span>
          </button>
          <button
            onClick={() => setActiveTab('kitchen')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'kitchen'
                ? 'bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Kitchen Display (KDS)</span>
            {kots.filter((k) => k.status === 'active').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                {kots.filter((k) => k.status === 'active').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'floor' ? (
        <div className="space-y-4">
          {/* Section Filter Pills */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {['All', 'Ground Floor', 'AC Hall', 'Rooftop / Garden'].map((floor) => (
                <button
                  key={floor}
                  onClick={() => setSelectedFloor(floor)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedFloor === floor
                      ? 'bg-slate-800 text-white border border-slate-700'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>

            {/* Status Legend */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Vacant
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Occupied
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span> KOT Sent
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Billed
              </span>
            </div>
          </div>

          {/* Tables Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredTables.map((tbl) => (
              <div
                key={tbl.id}
                onClick={() => setSelectedTable(tbl)}
                className={`p-4 rounded-2xl border cursor-pointer transition hover:scale-[1.02] flex flex-col justify-between min-h-[140px] ${getStatusColor(
                  tbl.status
                )}`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-base font-black text-white">{tbl.tableNumber}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-300">
                    <Users className="w-3 h-3" /> {tbl.capacity}
                  </span>
                </div>

                <div className="my-2">
                  <span className="uppercase text-[9px] font-bold tracking-wider px-2 py-0.5 rounded bg-black/40">
                    {tbl.status.replace('_', ' ')}
                  </span>
                  {tbl.currentTotal && (
                    <p className="text-base font-extrabold text-white mt-1 font-mono-numbers">
                      ₹{tbl.currentTotal}
                    </p>
                  )}
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between border-t border-white/10 pt-1.5">
                  <span>{tbl.floor.split(' ')[0]}</span>
                  {tbl.waiterName && <span>{tbl.waiterName}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Table Detail Drawer / Actions */}
          {selectedTable && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">
                    {selectedTable.tableNumber} ({selectedTable.floor})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-300">
                    Status: {selectedTable.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Capacity: {selectedTable.capacity} guests &bull; Waiter: {selectedTable.waiterName || 'None assigned'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsQrOrderModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                >
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Table QR Menu</span>
                </button>

                <button
                  onClick={() => setIsCreateKotModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ChefHat className="w-4 h-4" />
                  <span>New KOT Ticket</span>
                </button>

                <button
                  onClick={() => onOpenPosForTable(selectedTable)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Settle & Print Bill</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Kitchen Display System (KDS) View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-cyan-400" />
              <span>Active Kitchen Order Tickets (Chef Station)</span>
            </h3>
            <span className="text-xs text-slate-400">
              Live Real-Time Updates &bull; Cooking Status Automation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kots
              .filter((k) => k.status === 'active')
              .map((kot) => (
                <div
                  key={kot.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl space-y-3"
                >
                  {/* KOT Header */}
                  <div className="flex items-start justify-between pb-2 border-b border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{kot.tableNumber}</span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {kot.kotNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Waiter: {kot.waiterName} &bull; Time: {kot.timestamp}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-600/20 text-cyan-300 border border-cyan-500/30">
                      Active
                    </span>
                  </div>

                  {/* KOT Items */}
                  <div className="space-y-2 flex-1">
                    {kot.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-emerald-400">
                              {item.quantity}x
                            </span>
                            <span className="font-bold text-white">{item.productName}</span>
                          </div>
                          {item.notes && (
                            <p className="text-[10px] text-amber-300 italic mt-0.5">
                              Note: {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Interactive Status Button */}
                        <button
                          onClick={() => {
                            const next =
                              item.status === 'pending'
                                ? 'cooking'
                                : item.status === 'cooking'
                                ? 'ready'
                                : 'served';
                            handleUpdateItemStatus(kot.id, item.id, next);
                          }}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                            item.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : item.status === 'cooking'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.status}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* KOT Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        const firstItem = kot.items[0];
                        setReversalTarget({
                          kot,
                          dishName: firstItem ? firstItem.productName : 'Kitchen Order Ticket',
                          qty: firstItem ? firstItem.quantity : 1,
                        });
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                      title="Compensating BOM Reversal (Return to Stock or Waste)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Void / BOM Return</span>
                    </button>

                    <button
                      onClick={() => handleUpdateKotStatus(kot.id, 'completed')}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Order Ready & Served</span>
                    </button>
                  </div>
                </div>
              ))}

          </div>
        </div>
      )}

      {/* New KOT Modal */}
      {isCreateKotModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                New Kitchen Order Ticket (KOT) - {selectedTable.tableNumber}
              </h3>
              <button
                onClick={() => setIsCreateKotModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select Item */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Dish / Item:
                </label>
                <select
                  value={selectedProductToAdd}
                  onChange={(e) => setSelectedProductToAdd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Choose Menu Item --</option>
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEnglish} (₹{p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quantity:</label>
                  <input
                    type="number"
                    min="1"
                    value={kotItemQty}
                    onChange={(e) => setKotItemQty(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-orange-500 font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Kitchen Note:</label>
                  <input
                    type="text"
                    value={kotItemNotes}
                    onChange={(e) => setKotItemNotes(e.target.value)}
                    placeholder="e.g. Less spicy, crispy"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                onClick={handleAddPendingItem}
                disabled={!selectedProductToAdd}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold border border-cyan-500/30 transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to KOT</span>
              </button>
            </div>

            {/* Added Items Queue */}
            {pendingKotItems.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Items to Fire to Kitchen:
                </p>
                {pendingKotItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 rounded-lg bg-slate-800 text-xs"
                  >
                    <span>
                      {item.quantity}x {item.productName}{' '}
                      {item.notes && <span className="text-sky-300">({item.notes})</span>}
                    </span>
                    <button
                      onClick={() =>
                        setPendingKotItems(pendingKotItems.filter((_, i) => i !== idx))
                      }
                      className="text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCreateKotModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNewKot}
                disabled={pendingKotItems.length === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white shadow-lg shadow-blue-600/30 disabled:opacity-50"
              >
                Send KOT to Kitchen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table QR Ordering Modal */}
      {isQrOrderModalOpen && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Self-Ordering QR: {selectedTable.tableNumber}
            </h3>
            <p className="text-xs text-slate-400">
              Customers scan this QR on their table to browse digital menu and order without waiting for staff.
            </p>

            <div className="p-4 bg-white rounded-2xl max-w-[200px] mx-auto shadow-lg">
              <div className="w-40 h-40 flex items-center justify-center text-black font-mono text-center">
                <QrCode className="w-36 h-36 text-slate-950" />
              </div>
            </div>

            <p className="text-[11px] text-cyan-400 font-mono">
              https://menu.hiscale.in/{tenant.slug}/{selectedTable.tableNumber.toLowerCase()}
            </p>

            <button
              onClick={() => setIsQrOrderModalOpen(false)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition"
            >
              Close QR
            </button>
          </div>
        </div>
      )}

      {/* Recipe BOM Compensating Reversal Modal */}
      {reversalTarget && (
        <BomReversalModal
          isOpen={true}
          onClose={() => setReversalTarget(null)}
          catalog={catalog}
          dishName={reversalTarget.dishName}
          dishQuantity={reversalTarget.qty}
          tableNumber={reversalTarget.kot.tableNumber}
          kotId={reversalTarget.kot.kotNumber}
          onConfirmReversal={(auditMsg) => {
            handleUpdateKotStatus(reversalTarget.kot.id, 'cancelled');
            setReversalNotice(auditMsg);
            setTimeout(() => setReversalNotice(null), 5000);
            loadData();
          }}
        />
      )}

    </div>
  );
};

