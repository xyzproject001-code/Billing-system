/**
 * Layer 4: FIFO (First-In, First-Out) Inventory & Batch Tracking Engine
 * Accurately allocates sales against batches ordered by inward date,
 * calculates true Cost of Goods Sold (COGS), and raises near-expiry flags.
 */

import { Product, ProductBatch, CartItem } from '../types';

export interface BatchAllocationResult {
  productId: string;
  productName: string;
  qtyAllocated: number;
  totalCostOfGoodsSold: number;
  batchAllocations: {
    batchId: string;
    batchNumber: string;
    qtyDeducted: number;
    costPerUnit: number;
    expiryDate: string;
  }[];
  unallocatedQty: number; // if stock was insufficient
}

/**
 * Allocates a sold quantity against product batches using strict FIFO (earliest inward date first).
 */
export function allocateFIFOBatches(
  product: Product,
  qtyToDeduct: number
): {
  updatedBatches: ProductBatch[];
  allocation: BatchAllocationResult;
} {
  const batches = [...(product.batches || [])];

  // Sort batches by inward date ascending (earliest first)
  batches.sort((a, b) => new Date(a.inwardDate).getTime() - new Date(b.inwardDate).getTime());

  let remainingQtyToDeduct = qtyToDeduct;
  let totalCogs = 0;
  const batchAllocations: BatchAllocationResult['batchAllocations'] = [];

  const updatedBatches = batches.map((batch) => {
    if (remainingQtyToDeduct <= 0 || batch.availableQty <= 0) {
      return batch;
    }

    const deduct = Math.min(batch.availableQty, remainingQtyToDeduct);
    remainingQtyToDeduct -= deduct;
    totalCogs += deduct * batch.costPrice;

    batchAllocations.push({
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      qtyDeducted: deduct,
      costPerUnit: batch.costPrice,
      expiryDate: batch.expiryDate,
    });

    return {
      ...batch,
      availableQty: Number((batch.availableQty - deduct).toFixed(3)),
    };
  });

  return {
    updatedBatches,
    allocation: {
      productId: product.id,
      productName: product.nameEnglish,
      qtyAllocated: qtyToDeduct - remainingQtyToDeduct,
      totalCostOfGoodsSold: Number(totalCogs.toFixed(2)),
      batchAllocations,
      unallocatedQty: remainingQtyToDeduct,
    },
  };
}

/**
 * Checks for near-expiry batches (expiring within `daysAhead`, default 7 days)
 */
export function getNearExpiryBatches(
  products: Product[],
  daysAhead: number = 7
): { product: Product; batch: ProductBatch; daysRemaining: number }[] {
  const now = new Date().getTime();
  const thresholdMs = daysAhead * 24 * 60 * 60 * 1000;
  const results: { product: Product; batch: ProductBatch; daysRemaining: number }[] = [];

  for (const prod of products) {
    if (!prod.batches) continue;
    for (const batch of prod.batches) {
      if (batch.availableQty <= 0) continue;
      const expTime = new Date(batch.expiryDate).getTime();
      const diff = expTime - now;
      if (diff <= thresholdMs) {
        const daysRemaining = Math.ceil(diff / (24 * 60 * 60 * 1000));
        results.push({ product: prod, batch, daysRemaining });
      }
    }
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
