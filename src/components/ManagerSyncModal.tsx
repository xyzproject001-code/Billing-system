/**
 * Manager Outbox Sync & Stock Discrepancy Reconciliation Center
 * - Live queue monitor with exponential retry backoff & dead-letter tracking
 * - High-watermark warning & 4-hour offline alert indicator
 * - Delta-based stock conflict resolution panel for concurrent offline overselling
 * - Strictly styled in Royal Blue (#2563eb), Cyan (#06b6d4), and Deep Navy (#080e1e) - Zero Orange!
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Server,
  Zap,
} from 'lucide-react';
import { OutboxSyncItem, StockDiscrepancy } from '../types';
import {
  getOutboxQueue,
  processOutboxSync,
  checkOfflineDurationHours,
  getStockDiscrepancies,
  saveStockDiscrepancies,
} from '../utils/outboxSync';

interface ManagerSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onToggleOnline: () => void;
  onSyncComplete?: () => void;
}

export const ManagerSyncModal: React.FC<ManagerSyncModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onToggleOnline,
  onSyncComplete,
}) => {
  const [queue, setQueue] = useState<OutboxSyncItem[]>([]);
  const [discrepancies, setDiscrepancies] = useState<StockDiscrepancy[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [offlineHours, setOfflineHours] = useState(0);
  const [activeTab, setActiveTab] = useState<'queue' | 'discrepancies'>('queue');
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<StockDiscrepancy | null>(null);
  const [managerNotes, setManagerNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = async () => {
    setQueue(getOutboxQueue());
    setOfflineHours(checkOfflineDurationHours());

    // Fetch discrepancies from server & local storage
    try {
      const res = await fetch('/api/v1/sync/discrepancies');
      if (res.ok) {
        const data = await res.json();
        if (data.discrepancies) {
          setDiscrepancies(data.discrepancies);
          saveStockDiscrepancies(data.discrepancies);
          return;
        }
      }
    } catch {}
    setDiscrepancies(getStockDiscrepancies());
  };

  const handleTriggerSync = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await processOutboxSync();
      await refreshData();
      onSyncComplete?.();
      if (result.discrepancies.length > 0) {
        setActiveTab('discrepancies');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveDiscrepancy = async (discId: string) => {
    try {
      const res = await fetch('/api/v1/sync/discrepancies/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discrepancyId: discId,
          action: 'PHYSICAL_RECONCILIATION_CONFIRMED',
          notes: managerNotes || 'Physical inventory verified and recount entered',
          managerName: 'Store Manager (Admin)',
        }),
      });

      if (res.ok) {
        setSelectedDiscrepancy(null);
        setManagerNotes('');
        await refreshData();
        onSyncComplete?.();
      }
    } catch (e) {
      console.error('Failed to resolve discrepancy', e);
    }
  };

  if (!isOpen) return null;

  const pendingCount = queue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
  const deadLetterCount = queue.filter((i) => i.status === 'dead_letter').length;
  const unresolvedDiscrepancies = discrepancies.filter((d) => d.status === 'REQUIRES_PHYSICAL_RECONCILIATION');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-[#080e1e] border border-blue-900/70 text-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-blue-900/60 flex items-center justify-between bg-gradient-to-r from-[#0d1c3a] to-[#080e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-white">Outbox Sync & Conflict Resolution Engine</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-cyan-400 border border-cyan-500/30 uppercase">
                  Layer 2/5 Core
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Offline transactional outbox with exponential backoff & delta-based reconciliation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleOnline}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                isOnline
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:bg-rose-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-cyan-400 animate-pulse' : 'bg-rose-400'}`} />
              <span>{isOnline ? 'Network Online' : 'Network Disconnected (Offline Sim)'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-Hour Warning & Discrepancy Alert Banner */}
        {offlineHours >= 4 && (
          <div className="px-5 py-2.5 bg-sky-950/90 border-b border-sky-800/80 flex items-center gap-3 text-sky-200 text-xs">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              <strong>Network Outage SLA Warning:</strong> Terminal has been disconnected for {offlineHours} hours. Reconnect store router to prevent outbox buffer accumulation.
            </span>
          </div>
        )}

        {unresolvedDiscrepancies.length > 0 && (
          <div className="px-5 py-2.5 bg-blue-950/90 border-b border-cyan-500/40 flex items-center justify-between text-cyan-200 text-xs">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Concurrent Offline Oversell Detected:</strong> {unresolvedDiscrepancies.length} batch(es) oversold during offline concurrent checkout. Manager physical count required.
              </span>
            </div>
            <button
              onClick={() => setActiveTab('discrepancies')}
              className="underline font-bold text-cyan-300 hover:text-white cursor-pointer"
            >
              Review Now &rarr;
            </button>
          </div>
        )}

        {/* Summary Metrics Bar */}
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a1224] border-b border-blue-900/40 text-xs">
          <div className="bg-[#0e1a38] p-3 rounded-2xl border border-blue-900/50">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Pending in Outbox</p>
            <p className="text-xl font-black text-cyan-400 font-mono mt-1">{pendingCount}</p>
          </div>

          <div className="bg-[#0e1a38] p-3 rounded-2xl border border-blue-900/50">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Retry Backoff Active</p>
            <p className="text-xl font-black text-blue-400 font-mono mt-1">
              {queue.filter((i) => i.status === 'failed').length}
            </p>
          </div>

          <div className="bg-[#0e1a38] p-3 rounded-2xl border border-blue-900/50">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Dead Letter Queue (&ge; 5 Retries)</p>
            <p className="text-xl font-black text-rose-400 font-mono mt-1">{deadLetterCount}</p>
          </div>

          <div className="bg-[#0e1a38] p-3 rounded-2xl border border-blue-900/50">
            <p className="text-slate-400 text-[10px] uppercase font-bold">Stock Discrepancies</p>
            <p className="text-xl font-black text-sky-300 font-mono mt-1">{unresolvedDiscrepancies.length}</p>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-blue-900/40 bg-[#080e1e] px-5 pt-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'queue'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Outbox Mutation Queue ({queue.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('discrepancies')}
            className={`pb-2.5 px-4 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'discrepancies'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Concurrent Stock Discrepancies ({unresolvedDiscrepancies.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'queue' ? (
            <div className="space-y-3">
              {queue.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-white">Outbox is Completely Clean</p>
                  <p className="text-xs text-slate-400 mt-1">All sales transactions, payments, and batch deductions are in sync with the cloud.</p>
                </div>
              ) : (
                queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-[#0d1a36] border border-blue-900/60 flex items-center justify-between text-xs hover:border-cyan-500/40 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-bold text-cyan-300">
                          {item.entityType.toUpperCase()}
                        </span>
                        <span className="text-slate-400 font-mono text-[10px]">ID: {item.entityId}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'syncing'
                              ? 'bg-blue-950 text-cyan-400 border border-cyan-500/30 animate-pulse'
                              : item.status === 'dead_letter'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                              : 'bg-blue-950 text-sky-300 border border-blue-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300">
                        {item.entityType === 'invoice' && item.payload
                          ? `Invoice ${item.payload.invoiceNumber} | ₹${item.payload.grandTotal?.toFixed(2)} | Cashier: ${item.payload.cashierName}`
                          : `Operation: ${item.operation || 'MUTATION'} | Retries: ${item.retryCount}`}
                      </p>

                      {item.lastError && (
                        <p className="text-[10px] text-rose-400 font-mono">Error: {item.lastError}</p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </p>
                      {item.retryCount > 0 && (
                        <p className="text-[10px] text-blue-400 font-semibold mt-1">
                          Backoff Retries: {item.retryCount}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {discrepancies.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-cyan-400 mx-auto mb-2 opacity-80" />
                  <p className="font-bold text-white">No Concurrent Stock Conflicts</p>
                  <p className="text-xs text-slate-400 mt-1">All offline counters sold within verified physical inventory tolerances.</p>
                </div>
              ) : (
                discrepancies.map((disc) => (
                  <div
                    key={disc.id}
                    className="p-4 rounded-2xl bg-[#0d1a36] border border-blue-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                        <span className="font-bold text-white text-sm">{disc.productName}</span>
                        <span className="text-xs font-mono text-cyan-300 bg-blue-950 px-2 py-0.5 rounded border border-cyan-500/30">
                          Batch: {disc.batchNumber}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded uppercase tracking-wider ${
                          disc.status === 'RESOLVED_ADJUSTED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {disc.status === 'RESOLVED_ADJUSTED' ? 'Resolved' : 'Requires Recount'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-[#081024] p-3 rounded-xl border border-blue-950">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Resulting Delta Balance</span>
                        <span className="text-rose-400 font-mono font-black text-base">{disc.resultingQty} units</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Counters Involved</span>
                        <span className="text-slate-200 font-mono">{disc.countersInvolved.join(', ')}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Invoices Recorded</span>
                        <span className="text-slate-200 font-mono">{disc.invoices.join(', ')}</span>
                      </div>
                    </div>

                    {disc.status === 'REQUIRES_PHYSICAL_RECONCILIATION' ? (
                      <div className="pt-1 flex items-center justify-between gap-3">
                        <input
                          type="text"
                          placeholder="Manager physical count notes (e.g., Unrecorded carton found in stockroom)..."
                          value={selectedDiscrepancy?.id === disc.id ? managerNotes : ''}
                          onChange={(e) => {
                            setSelectedDiscrepancy(disc);
                            setManagerNotes(e.target.value);
                          }}
                          className="bg-[#080e1e] border border-blue-900/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 flex-1 focus:outline-none focus:border-cyan-400"
                        />
                        <button
                          onClick={() => handleResolveDiscrepancy(disc.id)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md shadow-cyan-500/20 transition cursor-pointer shrink-0"
                        >
                          Confirm & Adjust Stock
                        </button>
                      </div>
                    ) : (
                      <div className="text-[11px] text-emerald-400 font-mono flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Reconciled by {disc.reconciledBy}: "{disc.reconciliationNotes}"</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#0a1224] border-t border-blue-900/60 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Push interval: <span className="text-cyan-400 font-mono font-bold">Automatic on network reconnect</span>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Refresh
            </button>

            <button
              onClick={handleTriggerSync}
              disabled={isProcessing}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Processing Cloud Sync...' : 'Sync Outbox Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
