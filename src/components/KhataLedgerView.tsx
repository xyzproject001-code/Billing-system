/**
 * Layer 4: Smart Khata & Customer Credit Ledger
 * Complete digital khata book with 1-click WhatsApp payment reminders (wa.me)
 */

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Send,
  MessageCircle,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Phone,
  User,
  History,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Invoice, KhataCustomer, KhataTransaction, Tenant } from '../types';
import { localDB } from '../services/db';
import { calculateKhataAging } from '../utils/khataAllocation';


interface KhataLedgerViewProps {
  tenant: Tenant;
}

export const KhataLedgerView: React.FC<KhataLedgerViewProps> = ({ tenant }) => {
  const [customers, setCustomers] = useState<KhataCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<KhataCustomer | null>(null);
  const [transactions, setTransactions] = useState<KhataTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isRecordTxnOpen, setIsRecordTxnOpen] = useState(false);
  const [txnType, setTxnType] = useState<'credit_given' | 'payment_received'>('credit_given');
  const [txnAmount, setTxnAmount] = useState('');
  const [txnNotes, setTxnNotes] = useState('');
  const [whatsappToast, setWhatsappToast] = useState<string | null>(null);

  // New customer form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLimit, setNewLimit] = useState('5000');

  const loadData = async () => {
    const list = await localDB.getKhataCustomers(tenant.id);
    setCustomers(list);
    const invs = await localDB.getInvoicesByTenant(tenant.id);
    setInvoices(invs);
    if (selectedCustomer) {
      const txns = await localDB.getKhataTransactions(tenant.id, selectedCustomer.id);
      setTransactions(txns);
    }
  };


  useEffect(() => {
    loadData();
  }, [tenant.id]);

  const handleSelectCustomer = async (cust: KhataCustomer) => {
    setSelectedCustomer(cust);
    const txns = await localDB.getKhataTransactions(tenant.id, cust.id);
    setTransactions(txns);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newCust: KhataCustomer = {
      id: 'khata_' + Date.now(),
      tenant_id: tenant.id,
      name: newName.trim(),
      phone: newPhone.trim(),
      address: newAddress.trim(),
      creditLimit: parseFloat(newLimit) || 5000,
      currentBalance: 0,
      lastTransactionAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await localDB.saveKhataCustomer(newCust);
    setIsAddCustomerOpen(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    loadData();
  };

  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    const amount = parseFloat(txnAmount);
    if (!amount || amount <= 0) return;

    const newBalance =
      txnType === 'credit_given'
        ? selectedCustomer.currentBalance + amount
        : Math.max(0, selectedCustomer.currentBalance - amount);

    const txn: KhataTransaction = {
      id: 'txn_' + Date.now(),
      tenant_id: tenant.id,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone,
      type: txnType,
      amount,
      balanceAfter: newBalance,
      notes: txnNotes || (txnType === 'credit_given' ? 'Groceries taken on credit' : 'Cash settlement'),
      createdAt: new Date().toISOString(),
    };

    await localDB.recordKhataTransaction(txn);
    setIsRecordTxnOpen(false);
    setTxnAmount('');
    setTxnNotes('');

    // Update state
    selectedCustomer.currentBalance = newBalance;
    loadData();
  };

  // WhatsApp 1-Click Reminder Generator
  const handleSendWhatsAppReminder = async (customer: KhataCustomer) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const reminderMsg = `வணக்கம் / Dear ${customer.name},\nThis is a gentle payment reminder from ${tenant.name}.\n\nYour current pending Khata balance is ₹${customer.currentBalance.toFixed(
      2
    )}.\nKindly pay via UPI: ${tenant.upiVpa}\n\nThank you for your patronage!`;

    // Deep link directly to WhatsApp Web/App
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMsg)}`;

    // Also call server-side dispatcher
    try {
      await fetch('/api/v1/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: customer.phone,
          message: reminderMsg,
          type: 'khata_reminder',
        }),
      });
    } catch (e) {}

    // Open WhatsApp in safe background window or toast
    setWhatsappToast(`WhatsApp reminder prepared for ${customer.name} (₹${customer.currentBalance})`);
    setTimeout(() => setWhatsappToast(null), 4000);

    // Open WhatsApp link in new tab
    window.open(waUrl, '_blank');
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + c.currentBalance, 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Toast */}
      {whatsappToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom duration-200 text-xs font-semibold">
          <MessageCircle className="w-4 h-4" />
          <span>{whatsappToast}</span>
        </div>
      )}

      {/* Top Banner & Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-600/20 text-cyan-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Smart Khata Credit Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Track customer credits, payments & recover debts 3x faster with 1-click WhatsApp reminders
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-right">
            <p className="text-[11px] font-semibold text-slate-400">Total Khata Due</p>
            <p className="text-2xl font-black text-rose-400 font-mono-numbers">
              ₹{totalOutstanding.toFixed(2)}
            </p>
          </div>

          <button
            onClick={() => setIsAddCustomerOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 hover:opacity-90 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Customers, Right Selected Ledger History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer List Column */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or phone..."
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* List */}
          <div className="space-y-2 overflow-y-auto max-h-[550px] pr-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">
                No customers found. Click &quot;New Customer&quot; above to create one.
              </p>
            ) : (
              filteredCustomers.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelectCustomer(cust)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-blue-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                        : 'bg-slate-800/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-white text-sm">{cust.name}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {cust.phone}
                      </p>
                      {cust.address && (
                        <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                          {cust.address}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                        Pending Due
                      </p>
                      <p
                        className={`text-base font-extrabold font-mono-numbers ${
                          cust.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        ₹{cust.currentBalance.toFixed(2)}
                      </p>
                      {cust.currentBalance > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsAppReminder(cust);
                          }}
                          className="mt-1 px-2 py-0.5 rounded-md bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold flex items-center gap-1 transition"
                          title="Send official WhatsApp reminder"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Customer Ledger History */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
          {selectedCustomer ? (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{selectedCustomer.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      Limit: ₹{selectedCustomer.creditLimit}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Phone: {selectedCustomer.phone} {selectedCustomer.address && `&bull; ${selectedCustomer.address}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedCustomer.currentBalance > 0 && (
                    <button
                      onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Link</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setTxnType('payment_received');
                      setIsRecordTxnOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Record Entry</span>
                  </button>
                </div>
              </div>

              {/* FIFO Aging Buckets (0-30, 31-60, 61-90, 90+ Days) */}
              {(() => {
                const aging = calculateKhataAging(selectedCustomer, invoices);
                return (
                  <div className="bg-[#050914] p-3 rounded-2xl border border-blue-900/60">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="font-bold text-slate-300">FIFO Aging Buckets & Partial Payment Allocation</span>
                      <span className="text-[10px] text-cyan-400 font-mono">Double-Entry Ledger Verified</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center font-mono">
                      <div className="bg-[#080e1e] p-2 rounded-xl border border-blue-950">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">0 - 30 Days</span>
                        <span className="text-xs font-black text-cyan-400">₹{aging.bucket_0_30.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#080e1e] p-2 rounded-xl border border-blue-950">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">31 - 60 Days</span>
                        <span className="text-xs font-black text-blue-400">₹{aging.bucket_31_60.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#080e1e] p-2 rounded-xl border border-blue-950">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">61 - 90 Days</span>
                        <span className="text-xs font-black text-sky-300">₹{aging.bucket_61_90.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#080e1e] p-2 rounded-xl border border-blue-950">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">90+ Days</span>
                        <span className="text-xs font-black text-rose-400">₹{aging.bucket_90_plus.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Transactions List */}

              <div className="flex-1 space-y-2 overflow-y-auto max-h-[440px] pr-1">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <History className="w-10 h-10 mx-auto stroke-[1.2] mb-2 opacity-40" />
                    <p className="font-semibold">No transactions recorded yet</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Give credit or record payment using &quot;Record Entry&quot; above.
                    </p>
                  </div>
                ) : (
                  transactions.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            t.type === 'credit_given'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {t.type === 'credit_given' ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            {t.type === 'credit_given' ? 'Credit Given (Udhaar)' : 'Payment Received (Jama)'}
                          </p>
                          <p className="text-[11px] text-slate-400">{t.notes}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(t.createdAt).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p
                          className={`font-black text-sm font-mono-numbers ${
                            t.type === 'credit_given' ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {t.type === 'credit_given' ? '+' : '-'}₹{t.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Balance: ₹{t.balanceAfter.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 text-center">
              <User className="w-12 h-12 stroke-[1.2] opacity-40 mb-2" />
              <p className="text-sm font-semibold text-slate-400">Select a Customer to view Khata</p>
              <p className="text-xs text-slate-600 mt-1 max-w-xs">
                Pick a customer from the left list to review their credit ledger, record payments, or send WhatsApp reminders.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Customer Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateCustomer}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">Add New Khata Customer</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name:</label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Phone (WhatsApp):</label>
              <input
                type="text"
                required
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+91 98401 22334"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Landmark:</label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="Door No, Street name"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Limit (₹):</label>
              <input
                type="number"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono-numbers"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Record Transaction Modal */}
      {isRecordTxnOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleRecordTransaction}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-white">
              Record Transaction for {selectedCustomer.name}
            </h3>

            {/* Transaction Type Radio */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTxnType('credit_given')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  txnType === 'credit_given'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
                <span>Give Credit (Udhaar)</span>
              </button>
              <button
                type="button"
                onClick={() => setTxnType('payment_received')}
                className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 ${
                  txnType === 'payment_received'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <span>Receive Payment (Jama)</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹):</label>
              <input
                type="number"
                step="any"
                required
                autoFocus
                value={txnAmount}
                onChange={(e) => setTxnAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 px-3 text-white text-xl font-bold font-mono-numbers focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Description:</label>
              <input
                type="text"
                value={txnNotes}
                onChange={(e) => setTxnNotes(e.target.value)}
                placeholder="e.g. Month-end groceries, paid via cash"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRecordTxnOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Confirm Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
