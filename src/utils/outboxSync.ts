/**
 * Layer 2: Offline-First Transactional Outbox Sync Engine
 * Enqueues local mutations (invoices, payments, KOTs, batch deductions)
 * and synchronizes with cloud API gateway using exponential backoff retry and conflict resolution.
 */

import { OutboxSyncItem, StockDiscrepancy } from '../types';

const OUTBOX_STORAGE_KEY = 'hiscale_outbox_queue_v2';
const DISCREPANCIES_KEY = 'hiscale_stock_discrepancies_v1';
const LAST_ONLINE_KEY = 'hiscale_last_online_timestamp';

export function getOutboxQueue(): OutboxSyncItem[] {
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read outbox queue:', e);
    return [];
  }
}

export function saveOutboxQueue(queue: OutboxSyncItem[]): void {
  try {
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to persist outbox queue:', e);
  }
}

export function getStockDiscrepancies(): StockDiscrepancy[] {
  try {
    const raw = localStorage.getItem(DISCREPANCIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStockDiscrepancies(items: StockDiscrepancy[]): void {
  try {
    localStorage.setItem(DISCREPANCIES_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to persist discrepancies:', e);
  }
}

export function recordOnlineHeartbeat(): void {
  try {
    localStorage.setItem(LAST_ONLINE_KEY, Date.now().toString());
  } catch {}
}

export function checkOfflineDurationHours(): number {
  try {
    const last = localStorage.getItem(LAST_ONLINE_KEY);
    if (!last) return 0;
    const diffMs = Date.now() - parseInt(last, 10);
    return Number((diffMs / (1000 * 60 * 60)).toFixed(1));
  } catch {
    return 0;
  }
}

/**
 * Calculates exponential backoff with 15% random jitter: min(300000, 1000 * 2^retryCount) +/- jitter
 */
export function calculateBackoffMs(retryCount: number): number {
  const base = Math.min(300000, 1000 * Math.pow(2, retryCount));
  const jitter = (Math.random() * 0.3 - 0.15) * base; // +/- 15%
  return Math.round(base + jitter);
}

export function enqueueOutboxItem(
  tenantId: string,
  entityType: OutboxSyncItem['entityType'],
  entityId: string,
  payload: any,
  operation: 'CREATE' | 'UPDATE' | 'DELETE' = 'CREATE'
): OutboxSyncItem {
  const queue = getOutboxQueue();
  const newItem: OutboxSyncItem = {
    id: 'sync_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    tenant_id: tenantId,
    client_tx_id: `tx_${entityType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    entityType,
    entityId,
    operation,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  queue.push(newItem);
  saveOutboxQueue(queue);
  return newItem;
}

export interface SyncProgressResult {
  synced: number;
  failed: number;
  deadLetter: number;
  discrepancies: StockDiscrepancy[];
}

/**
 * Synchronizes pending items to backend API in batches.
 * Handles retry limits (max 5), moves unrecoverable items to dead-letter, and returns oversold discrepancies.
 */
export async function processOutboxSync(
  onStatusChange?: (pendingCount: number, syncing: boolean) => void
): Promise<SyncProgressResult> {
  const queue = getOutboxQueue();
  const now = Date.now();

  const eligibleItems = queue.filter((item) => {
    if (item.status === 'completed' || item.status === 'dead_letter') return false;
    if (item.nextRetryAt && item.nextRetryAt > now) return false;
    return true;
  });

  if (eligibleItems.length === 0) {
    const remaining = queue.filter((i) => i.status === 'pending' || i.status === 'failed').length;
    onStatusChange?.(remaining, false);
    return { synced: 0, failed: 0, deadLetter: 0, discrepancies: [] };
  }

  onStatusChange?.(eligibleItems.length, true);

  let synced = 0;
  let failed = 0;
  let deadLetter = 0;
  const newDiscrepancies: StockDiscrepancy[] = [];

  // Take up to 25 items per batch
  const batch = eligibleItems.slice(0, 25);

  try {
    const res = await fetch('/api/v1/sync/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: batch }),
    });

    if (res.ok) {
      const data = await res.json();
      recordOnlineHeartbeat();

      const succeededIds = new Set(data.succeededIds || []);
      const failedMap: Record<string, string> = data.failedErrors || {};

      if (data.discrepancies && Array.isArray(data.discrepancies)) {
        newDiscrepancies.push(...data.discrepancies);
        const existingDisc = getStockDiscrepancies();
        saveStockDiscrepancies([...existingDisc, ...data.discrepancies]);
      }

      for (const item of batch) {
        if (succeededIds.has(item.id)) {
          item.status = 'completed';
          item.updatedAt = new Date().toISOString();
          synced++;
        } else {
          item.retryCount += 1;
          item.lastError = failedMap[item.id] || 'Cloud rejected item';
          if (item.retryCount >= 5) {
            item.status = 'dead_letter';
            deadLetter++;
          } else {
            item.status = 'failed';
            item.nextRetryAt = Date.now() + calculateBackoffMs(item.retryCount);
          }
          failed++;
        }
      }
    } else {
      // Server returned error status code
      for (const item of batch) {
        item.retryCount += 1;
        item.lastError = `HTTP ${res.status}`;
        if (item.retryCount >= 5) {
          item.status = 'dead_letter';
          deadLetter++;
        } else {
          item.status = 'failed';
          item.nextRetryAt = Date.now() + calculateBackoffMs(item.retryCount);
        }
        failed++;
      }
    }
  } catch (netErr: any) {
    // Total offline / network timeout
    for (const item of batch) {
      item.status = 'pending';
      item.lastError = netErr?.message || 'Network disconnected';
      item.nextRetryAt = Date.now() + 5000;
      failed++;
    }
  }

  // Save updated items back
  saveOutboxQueue(queue);

  const pendingRemaining = queue.filter(
    (i) => i.status === 'pending' || i.status === 'failed'
  ).length;
  onStatusChange?.(pendingRemaining, false);

  return { synced, failed, deadLetter, discrepancies: newDiscrepancies };
}
