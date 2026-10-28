/**
 * Layer 1 & 4: Invoices & Sales History View
 * Review past bills, reprints, offline sync indicators, and manager bill voids
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Printer,
  Trash2,
  CheckCircle2,
  WifiOff,
  Filter,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Invoice, Tenant, UserStaff } from '../types';
import { localDB } from '../services/db';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { StaffPinModal } from './StaffPinModal';

interface InvoicesListViewProps {
  tenant: Tenant;
  staffList: UserStaff[];
}

export const InvoicesListView: React.FC<InvoicesListViewProps> = ({ tenant, staffList }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pinAction, setPinAction] = useState<{
    isOpen: boolean;
    description: string;
    action: () => void;
  }>({
    isOpen: false,
    description: '',
    action: () => {},
  });

  const loadInvoices = async () => {
    const list = await localDB.getInvoicesByTenant(tenant.id);
    setInvoices(list);
  };

  useEffect(() => {
    loadInvoices();
  }, [tenant.id]);

  const handleVoidInvoice = (inv: Invoice) => {
    setPinAction({
      isOpen: true,
      description: `Voiding Invoice #${inv.invoiceNumber} for ₹${inv.grandTotal}`,
      action: async () => {
        inv.status = 'voided';
        await localDB.saveInvoice(inv, true);
        await localDB.addAuditLog({
          id: 'log_' + Date.now(),
          tenant_id: tenant.id,
          timestamp: new Date().toISOString(),
          actorId: 'manager_auth',
          actorName: 'Authorized Manager',
          role: 'manager',
          action: 'VOID_BILL',
          details: `Voided Invoice #${inv.invoiceNumber} (Total: ₹${inv.grandTotal}).`,
        });
        loadInvoices();
      },
    });
  };

  const filtered = invoices.filter(
    (inv) =>
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.cashierName.toLowerCase().includes(search.toLowerCase()) ||
      inv.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSales = invoices
    .filter((i) => i.status !== 'voided')
    .reduce((sum, i) => sum + i.grandTotal, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Invoices & Sales History
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable invoice logs, thermal reprints, offline outbox audit, and manager void reversals
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl px-5 py-2.5 text-right">
          <p className="text-[11px] font-semibold text-slate-400">Total Valid Sales</p>
          <p className="text-2xl font-black text-emerald-400 font-mono-numbers">
            ₹{totalSales.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Search and Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Bill #, Customer, or Cashier..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          <span className="text-xs text-slate-400">Showing {filtered.length} Invoices</span>
        </div>

        <div className="border border-slate-800 rounded-xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-300 font-semibold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Cashier / Staff</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Payment</th>
                <th className="py-3 px-3">Cloud Sync</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/40">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white font-mono">{inv.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(inv.createdAt).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 text-slate-300">{inv.cashierName}</td>
                    <td className="py-3 px-3 text-slate-300">
                      {inv.customer?.name ? (
                        <span>
                          {inv.customer.name} ({inv.customer.phone})
                        </span>
                      ) : (
                        <span className="text-slate-500">Walk-in</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {inv.syncStatus === 'synced' ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-amber-400 font-semibold">
                          <WifiOff className="w-3.5 h-3.5" /> Outbox (Offline)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sm font-mono-numbers">
                      {inv.status === 'voided' ? (
                        <span className="text-slate-500 line-through">₹{inv.grandTotal.toFixed(2)}</span>
                      ) : (
                        <span className="text-white">₹{inv.grandTotal.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition"
                          title="Reprint Thermal Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {inv.status !== 'voided' && (
                          <button
                            onClick={() => handleVoidInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition"
                            title="Void Bill (Manager PIN required)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        isOpen={!!selectedInvoice}
        invoice={selectedInvoice}
        tenant={tenant}
        onClose={() => setSelectedInvoice(null)}
      />

      {/* Staff Pin Modal for Voids */}
      <StaffPinModal
        isOpen={pinAction.isOpen}
        onClose={() => setPinAction({ ...pinAction, isOpen: false })}
        staffList={staffList}
        actionDescription={pinAction.description}
        onAuthorized={() => pinAction.action()}
      />
    </div>
  );
};
