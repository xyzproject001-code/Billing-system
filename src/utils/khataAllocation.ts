/**
 * Layer 3 & Layer 5: Khata Double-Entry FIFO Payment Allocation & Aging Calculator
 * Resolves offline customer credit payments against outstanding invoices in chronological sequence.
 */

import { Invoice, KhataAgingBucket, KhataCustomer, KhataPaymentAllocation } from '../types';

/**
 * Calculates aging buckets (0-30, 31-60, 61-90, 90+ days) for a given Khata customer
 * based on their pending/unsettled credit invoices.
 */
export function calculateKhataAging(
  customer: KhataCustomer,
  invoices: Invoice[]
): KhataAgingBucket {
  const customerCreditInvoices = invoices.filter(
    (inv) =>
      inv.paymentMethod === 'khata' &&
      inv.status !== 'voided' &&
      inv.status !== 'refunded' &&
      (inv.customer?.id === customer.id || inv.customer?.phone === customer.phone)
  );

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  let bucket_0_30 = 0;
  let bucket_31_60 = 0;
  let bucket_61_90 = 0;
  let bucket_90_plus = 0;

  for (const inv of customerCreditInvoices) {
    const invDate = new Date(inv.createdAt).getTime();
    const daysAgo = Math.max(0, Math.floor((now - invDate) / ONE_DAY_MS));
    const amount = inv.grandTotal;

    if (daysAgo <= 30) {
      bucket_0_30 += amount;
    } else if (daysAgo <= 60) {
      bucket_31_60 += amount;
    } else if (daysAgo <= 90) {
      bucket_61_90 += amount;
    } else {
      bucket_90_plus += amount;
    }
  }

  // If customer has a net currentBalance that differs from raw invoice totals (due to unlinked payments),
  // scale proportionately to match customer.currentBalance
  const totalInvoiced = bucket_0_30 + bucket_31_60 + bucket_61_90 + bucket_90_plus;
  if (totalInvoiced > 0 && customer.currentBalance > 0) {
    const ratio = customer.currentBalance / totalInvoiced;
    bucket_0_30 = Number((bucket_0_30 * ratio).toFixed(2));
    bucket_31_60 = Number((bucket_31_60 * ratio).toFixed(2));
    bucket_61_90 = Number((bucket_61_90 * ratio).toFixed(2));
    bucket_90_plus = Number((bucket_90_plus * ratio).toFixed(2));
  } else if (customer.currentBalance > 0) {
    bucket_0_30 = customer.currentBalance;
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    bucket_0_30,
    bucket_31_60,
    bucket_61_90,
    bucket_90_plus,
    totalOutstanding: customer.currentBalance,
  };
}

/**
 * Allocates a lump-sum payment against customer credit invoices in strict FIFO order (oldest first).
 */
export function allocatePaymentFIFO(
  paymentId: string,
  paymentAmount: number,
  pendingInvoices: Invoice[]
): {
  allocations: KhataPaymentAllocation[];
  unallocatedSurplus: number;
  settledInvoiceIds: string[];
} {
  // Sort oldest first
  const sorted = [...pendingInvoices].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  let remaining = paymentAmount;
  const allocations: KhataPaymentAllocation[] = [];
  const settledInvoiceIds: string[] = [];

  for (const inv of sorted) {
    if (remaining <= 0) break;

    const dueAmount = inv.grandTotal; // or unpaid portion
    const allocated = Math.min(dueAmount, remaining);

    allocations.push({
      id: `alloc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      paymentTransactionId: paymentId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      allocatedAmount: Number(allocated.toFixed(2)),
      allocatedAt: new Date().toISOString(),
    });

    remaining -= allocated;

    if (allocated >= dueAmount) {
      settledInvoiceIds.push(inv.id);
    }
  }

  return {
    allocations,
    unallocatedSurplus: Number(Math.max(0, remaining).toFixed(2)),
    settledInvoiceIds,
  };
}
