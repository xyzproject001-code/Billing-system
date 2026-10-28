/**
 * Recipe BOM Compensating Transaction Logic
 * Handles KOT voids, cancellations, and returns in restaurant / cafe operations.
 * Distinguishes between "Wasted/Spoiled in Kitchen" (expense booked, stock not returned)
 * versus "Returned to Stock" (stock replenished in reverse FIFO batch allocation).
 */

import { Product, ProductBatch } from '../types';

export interface BOMReversalAction {
  kotId: string;
  tableNumber: string;
  dishName: string;
  dishQuantity: number;
  reason: string;
  disposition: 'RETURN_TO_STOCK' | 'KITCHEN_SPOILAGE_WASTE';
  authorizedByStaff: string;
}

export interface ReversalResultItem {
  rawProductId: string;
  rawProductName: string;
  qtyToRevert: number;
  unit: string;
  batchIdUpdated?: string;
  costImpact: number;
  actionTaken: 'INVENTORY_REPLENISHED' | 'WASTAGE_EXPENSE_LOGGED';
}

/**
 * Calculates raw material compensation when a prepared or ordered dish is cancelled.
 */
export function processBomReversal(
  action: BOMReversalAction,
  catalog: Product[]
): {
  reversalItems: ReversalResultItem[];
  totalCostImpact: number;
  auditMessage: string;
} {
  // Find dish in catalog
  const dish = catalog.find((p) => p.nameEnglish.toLowerCase() === action.dishName.toLowerCase());
  
  if (!dish || !dish.isBOMItem || !dish.bomIngredients || dish.bomIngredients.length === 0) {
    return {
      reversalItems: [],
      totalCostImpact: 0,
      auditMessage: `No BOM recipe mapped for "${action.dishName}". Standard order voided without ingredient adjustments.`,
    };
  }

  const reversalItems: ReversalResultItem[] = [];
  let totalCostImpact = 0;

  for (const ingredient of dish.bomIngredients) {
    const totalQtyNeeded = ingredient.qtyRequired * action.dishQuantity;
    const rawProd = catalog.find((p) => p.id === ingredient.rawProductId);
    const unitCost = rawProd?.costPrice || 20;
    const ingredientCostImpact = Number((totalQtyNeeded * unitCost).toFixed(2));

    totalCostImpact += ingredientCostImpact;

    if (action.disposition === 'RETURN_TO_STOCK') {
      // Compensating stock replenishment
      reversalItems.push({
        rawProductId: ingredient.rawProductId,
        rawProductName: ingredient.rawProductName,
        qtyToRevert: totalQtyNeeded,
        unit: ingredient.unit,
        batchIdUpdated: rawProd?.batches?.[0]?.id || 'BATCH_COMP_RESTOCK',
        costImpact: ingredientCostImpact,
        actionTaken: 'INVENTORY_REPLENISHED',
      });
    } else {
      // Kitchen Spoilage / Food wasted
      reversalItems.push({
        rawProductId: ingredient.rawProductId,
        rawProductName: ingredient.rawProductName,
        qtyToRevert: totalQtyNeeded,
        unit: ingredient.unit,
        costImpact: ingredientCostImpact,
        actionTaken: 'WASTAGE_EXPENSE_LOGGED',
      });
    }
  }

  const auditMessage =
    action.disposition === 'RETURN_TO_STOCK'
      ? `KOT ${action.kotId} (${action.dishName} x${action.dishQuantity}) voided. ${reversalItems.length} raw ingredients safely returned to store batches by ${action.authorizedByStaff}.`
      : `KOT ${action.kotId} (${action.dishName} x${action.dishQuantity}) voided as kitchen waste. Food cost of ₹${totalCostImpact.toFixed(2)} booked to Kitchen Spoilage Ledger by ${action.authorizedByStaff}.`;

  return {
    reversalItems,
    totalCostImpact: Number(totalCostImpact.toFixed(2)),
    auditMessage,
  };
}
