/**
 * Layer 2: Offline-First Local Sync Engine (IndexedDB + Outbox Queue)
 * Ensures zero lag during checkout even if internet connectivity drops completely.
 * Features an Outbox Queue that automatically syncs pending bills back to cloud.
 */

import {
  AuditLog,
  HotelRoomFolio,
  Invoice,
  KitchenOrderTicket,
  KhataCustomer,
  KhataTransaction,
  Product,
  RestaurantTable,
} from '../types';

const DB_NAME = 'VyapaarOS_LocalDB_v1';
const DB_VERSION = 1;

interface OutboxItem {
  id: string;
  type: 'INVOICE_CREATE' | 'KHATA_UPDATE' | 'STOCK_UPDATE' | 'AUDIT_LOG';
  payload: any;
  tenant_id: string;
  attempts: number;
  lastAttemptAt?: string;
  createdAt: string;
}

class VyapaarIndexedDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Products catalog
        if (!db.objectStoreNames.contains('products')) {
          const store = db.createObjectStore('products', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('barcode', 'barcode', { unique: false });
        }

        // Invoices store
        if (!db.objectStoreNames.contains('invoices')) {
          const store = db.createObjectStore('invoices', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Outbox queue for offline transactions
        if (!db.objectStoreNames.contains('outbox')) {
          const store = db.createObjectStore('outbox', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Khata customers & transactions
        if (!db.objectStoreNames.contains('khata_customers')) {
          const store = db.createObjectStore('khata_customers', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('phone', 'phone', { unique: false });
        }
        if (!db.objectStoreNames.contains('khata_transactions')) {
          const store = db.createObjectStore('khata_transactions', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
          store.createIndex('customerId', 'customerId', { unique: false });
        }

        // Tables & KOTs
        if (!db.objectStoreNames.contains('tables')) {
          const store = db.createObjectStore('tables', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('kots')) {
          const store = db.createObjectStore('kots', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
        }

        // Hotel Room Folios
        if (!db.objectStoreNames.contains('room_folios')) {
          const store = db.createObjectStore('room_folios', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
        }

        // Audit Logs
        if (!db.objectStoreNames.contains('audit_logs')) {
          const store = db.createObjectStore('audit_logs', { keyPath: 'id' });
          store.createIndex('tenant_id', 'tenant_id', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Generic Helpers ---
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result as T);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: string, item: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async putBatch<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      items.forEach((item) => store.put(item));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // --- Products Operations ---
  async getProductsByTenant(tenantId: string): Promise<Product[]> {
    const all = await this.getAll<Product>('products');
    return all.filter((p) => p.tenant_id === tenantId);
  }

  async saveProducts(products: Product[]): Promise<void> {
    await this.putBatch('products', products);
  }

  async updateProductStock(
    tenantId: string,
    productId: string,
    quantityDelta: number
  ): Promise<Product | null> {
    const prod = await this.getById<Product>('products', productId);
    if (!prod || prod.tenant_id !== tenantId) return null;
    prod.stockQty = Math.max(0, Number((prod.stockQty - quantityDelta).toFixed(3)));
    await this.put('products', prod);
    return prod;
  }

  // --- Invoices & Outbox Operations ---
  async saveInvoice(invoice: Invoice, isOnline: boolean): Promise<void> {
    // Save to local invoices store
    await this.put('invoices', invoice);

    // If offline, add to Outbox queue
    if (!isOnline || invoice.syncStatus === 'pending') {
      const outboxItem: OutboxItem = {
        id: 'outbox_' + invoice.id,
        type: 'INVOICE_CREATE',
        payload: invoice,
        tenant_id: invoice.tenant_id,
        attempts: 0,
        createdAt: new Date().toISOString(),
      };
      await this.put('outbox', outboxItem);
    }
  }

  async getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
    const all = await this.getAll<Invoice>('invoices');
    return all
      .filter((inv) => inv.tenant_id === tenantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getOutboxItems(tenantId?: string): Promise<OutboxItem[]> {
    const all = await this.getAll<OutboxItem>('outbox');
    if (!tenantId) return all;
    return all.filter((item) => item.tenant_id === tenantId);
  }

  async removeOutboxItem(id: string): Promise<void> {
    await this.delete('outbox', id);
  }

  // Sync Outbox queue with server
  async syncOutboxQueue(
    tenantId: string,
    onProgress?: (syncedCount: number, total: number) => void
  ): Promise<{ synced: number; failed: number }> {
    const items = await this.getOutboxItems(tenantId);
    if (items.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        // Send to backend API
        const res = await fetch('/api/v1/sync/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({ item }),
        });

        if (res.ok) {
          // Mark invoice as synced locally
          if (item.type === 'INVOICE_CREATE') {
            const inv = await this.getById<Invoice>('invoices', item.payload.id);
            if (inv) {
              inv.syncStatus = 'synced';
              await this.put('invoices', inv);
            }
          }
          await this.removeOutboxItem(item.id);
          synced++;
        } else {
          item.attempts += 1;
          item.lastAttemptAt = new Date().toISOString();
          await this.put('outbox', item);
          failed++;
        }
      } catch (err) {
        // Network still unreachable
        item.attempts += 1;
        item.lastAttemptAt = new Date().toISOString();
        await this.put('outbox', item);
        failed++;
      }

      if (onProgress) {
        onProgress(i + 1, items.length);
      }
    }

    return { synced, failed };
  }

  // --- Khata Operations ---
  async getKhataCustomers(tenantId: string): Promise<KhataCustomer[]> {
    const all = await this.getAll<KhataCustomer>('khata_customers');
    return all.filter((c) => c.tenant_id === tenantId);
  }

  async saveKhataCustomer(customer: KhataCustomer): Promise<void> {
    await this.put('khata_customers', customer);
  }

  async getKhataTransactions(tenantId: string, customerId?: string): Promise<KhataTransaction[]> {
    const all = await this.getAll<KhataTransaction>('khata_transactions');
    return all
      .filter((t) => t.tenant_id === tenantId && (!customerId || t.customerId === customerId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async recordKhataTransaction(txn: KhataTransaction): Promise<void> {
    await this.put('khata_transactions', txn);
    const customer = await this.getById<KhataCustomer>('khata_customers', txn.customerId);
    if (customer) {
      customer.currentBalance = txn.balanceAfter;
      customer.lastTransactionAt = txn.createdAt;
      await this.put('khata_customers', customer);
    }
  }

  // --- Restaurant Table & KOT Operations ---
  async getTables(tenantId: string): Promise<RestaurantTable[]> {
    const all = await this.getAll<RestaurantTable>('tables');
    return all.filter((t) => t.tenant_id === tenantId);
  }

  async saveTables(tables: RestaurantTable[]): Promise<void> {
    await this.putBatch('tables', tables);
  }

  async updateTable(table: RestaurantTable): Promise<void> {
    await this.put('tables', table);
  }

  async getKOTs(tenantId: string): Promise<KitchenOrderTicket[]> {
    const all = await this.getAll<KitchenOrderTicket>('kots');
    return all
      .filter((k) => k.tenant_id === tenantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async saveKOT(kot: KitchenOrderTicket): Promise<void> {
    await this.put('kots', kot);
  }

  // --- Hotel Room Folio Operations ---
  async getRoomFolios(tenantId: string): Promise<HotelRoomFolio[]> {
    const all = await this.getAll<HotelRoomFolio>('room_folios');
    return all.filter((rf) => rf.tenant_id === tenantId);
  }

  async saveRoomFolios(folios: HotelRoomFolio[]): Promise<void> {
    await this.putBatch('room_folios', folios);
  }

  async updateRoomFolio(folio: HotelRoomFolio): Promise<void> {
    await this.put('room_folios', folio);
  }

  // --- Audit Logs ---
  async addAuditLog(log: AuditLog): Promise<void> {
    await this.put('audit_logs', log);
  }

  async getAuditLogs(tenantId: string): Promise<AuditLog[]> {
    const all = await this.getAll<AuditLog>('audit_logs');
    return all
      .filter((l) => l.tenant_id === tenantId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
}

export const localDB = new VyapaarIndexedDB();
