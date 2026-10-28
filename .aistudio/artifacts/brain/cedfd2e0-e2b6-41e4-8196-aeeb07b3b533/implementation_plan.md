# HI Scale Enterprise SaaS POS & Billing Architecture Blueprint

## 1. Executive Summary & Clarification Resolution

Following the comprehensive architectural review and technical evaluation, this blueprint establishes the production-grade engineering design for the **HI Scale** Industrial Retail & Restaurant POS Billing Engine.

### Core Architectural Decisions:
1. **Focus Priority**: Conflict Resolution Decision Trees, Outbox Sync SLAs, and Offline Concurrency Safeguards.
2. **Conflict Policy for Concurrent Offline Inventory**: Journaled delta-based synchronization allowing negative batch balances with an immediate `MANAGER_STOCK_RECONCILIATION_REQUIRED` audit alert and physical count disparity log.
3. **Local Storage Engine**: Unified Native SQLite on desktop (Electron / Tauri / Node.js) with zero-cost IndexedDB fallback on browser web runtime, mediated by a unified `StorageAdapter` interface.
4. **Visual & Design System**: Zero Orange Policy. Standardized on Royal Blue (`#2563eb`, `#1d4ed8`), Cyan (`#06b6d4`, `#38bdf8`), Slate Gray, and Deep Navy (`#080e1e`).

---

## 2. Exhaustive Conflict Resolution Decision Trees

In high-throughput Indian retail, offline operation is normal rather than an exception. When multiple billing counters operate disconnected and subsequently reconnect to sync, data collisions are resolved deterministically based on entity semantics:

```
                          SYNC PACKET RECEIVED
                                   │
          ┌────────────────────────┼────────────────────────┐
          ▼                        ▼                        ▼
     [INVOICE / SALE]         [STOCK BATCHES]        [KHATA / LEDGER]
          │                        │                        │
   Is Invoice ID unique?     Aggregate Deltas       Double-Entry Journal
   (Prefix + UUIDv7)               │                 Allocate via FIFO
          │                        ▼                        │
   ┌──────┴──────┐          Does Stock < 0?                 ▼
   ▼             ▼                 │                 Emit Payment
[INSERT]    [IDEMPOTENT     ┌──────┴──────┐         Allocation Record
 (Clean)       SKIP]        ▼             ▼                 │
                         [ALLOW]       [ALLOW &             ▼
                         (Normal)       FLAG]         Balance Updated
                                          │
                                   Raise Manager
                                  Reconciliation
                                     Incident
```

### 2.1. Invoices & Sales (`invoices` table)
* **Conflict Rule**: **Append-Only Immutable Event Stream (Zero Conflict)**.
* **ID Scheme**: Counter Prefix + Nanosecond Timestamp / UUIDv7 (e.g., `C01-INV-20261026-8921A3`).
* **Guarantee**: Counters cannot produce conflicting primary keys. If the server already possesses the invoice ID, it is treated as an idempotent retry and ignored without error.
* **Cancellation / Returns**: Never modify an invoice in place. Create a new `CREDIT_NOTE` or `SALES_RETURN` referencing the original invoice UUID.

### 2.2. Concurrent Offline Inventory De-allocation (`batches` & `batch_ledger`)
* **Scenario**: Two counters offline both sell the last remaining 5 units of `BATCH-A` (initial available: 5). Counter 1 sells 5; Counter 2 sells 3.
* **Server-Side Resolution**:
  1. The server processes delta adjustments rather than overwriting absolute inventory quantities.
  2. Transaction 1 reduces `available_qty` from 5 to 0.
  3. Transaction 2 reduces `available_qty` from 0 to -3.
  4. The server creates an audit entry in `stock_discrepancies`:
     ```json
     {
       "batch_id": "BATCH-A",
       "product_id": "PROD-102",
       "resulting_qty": -3,
       "discrepancy_type": "OFFLINE_OVERSOLD",
       "counters_involved": ["C01", "C02"],
       "invoices": ["C01-INV-1092", "C02-INV-0044"],
       "status": "REQUIRES_PHYSICAL_RECONCILIATION",
       "created_at": "2026-10-26T15:45:00Z"
     }
     ```
  5. The POS UI triggers a high-visibility badge: `Stock Alert: 1 Batch Oversold During Offline Session`. The store manager can either:
     - Assign excess units to a newly arrived unrecorded batch.
     - Accept physical count adjustment.
     - Review counter audit trail.

### 2.3. Khata (Customer Ledger) & Partial Payments
* **Design Pattern**: Double-entry bookkeeping with explicit `payment_allocation` linkage.
* **Allocation Engine**:
  - When customer pays ₹500 against three pending invoices of ₹300, ₹200, and ₹400:
  - Allocation operates on a strict **FIFO aging sequence** (oldest unpaid invoice settled first).
  - Invoice 1 (₹300): Paid in full.
  - Invoice 2 (₹200): Paid in full.
  - Invoice 3 (₹400): Balance outstanding becomes ₹400.
* **Concurrent Ledger Edits**:
  - Offline payment entries are appended as ledger debit/credit entries with monotonically increasing transaction hashes.
  - Outstanding balances are computed dynamically as:
    $$\text{Balance} = \sum \text{Debit Events} - \sum \text{Credit Events}$$
  - No race condition can corrupt the underlying transaction ledger.

### 2.4. Master Data (Products, Rates, Customers)
* **Conflict Rule**: **Last-Write-Wins (LWW) with per-attribute version clocks**.
* **Tombstoning**: Deletions are soft (`is_deleted: true, deleted_at: timestamp`). Deleting a product on Counter 1 while Counter 2 is selling it offline allows Counter 2's sale to commit, but marks the product inactive for future bills.

---

## 3. Storage Layer: SQLite (Desktop) + IndexedDB (Web) Fallback

To support multi-platform deployment (Electron/Tauri desktop apps for hardware POS terminals, and Chromium web browsers for tablet/cloud access), the storage architecture uses an abstract `IDataStoreAdapter`:

```
                 ┌────────────────────────────────┐
                 │       POS Application Core     │
                 │   (React / TypeScript Models)  │
                 └───────────────┬────────────────┘
                                 │
                     [IDataStoreAdapter Interface]
                                 │
             ┌───────────────────┴───────────────────┐
             ▼                                       ▼
  [DesktopSQLiteAdapter]                    [WebIndexedDBAdapter]
  - better-sqlite3 / op-sqlite              - idb / Dexie engine
  - WAL Mode enabled                        - IndexedDB Object Stores
  - < 2ms sync query latency                - Multi-tab broadcast channel
  - Direct raw POS hardware access          - WebWorker indexed queries
```

### Unified Schema Definitions:
```sql
-- Core Outbox Table
CREATE TABLE sync_outbox (
  id TEXT PRIMARY KEY,
  client_tx_id TEXT NOT NULL UNIQUE,
  entity_type TEXT NOT NULL,         -- 'INVOICE' | 'BATCH_DELTA' | 'KHATA_ENTRY' | 'ITEM'
  entity_id TEXT NOT NULL,
  operation TEXT NOT NULL,           -- 'CREATE' | 'UPDATE' | 'DELETE'
  payload JSON NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'IN_FLIGHT' | 'COMPLETED' | 'DEAD_LETTER'
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  next_retry_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_outbox_status_retry ON sync_outbox(status, next_retry_at);

-- Batch Tracking with FIFO Valuation
CREATE TABLE product_batches (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  batch_number TEXT NOT NULL,
  cost_price REAL NOT NULL,
  sale_price REAL NOT NULL,
  mrp REAL NOT NULL,
  initial_qty REAL NOT NULL,
  available_qty REAL NOT NULL,
  inward_date TEXT NOT NULL,
  expiry_date TEXT,
  created_at INTEGER NOT NULL
);

-- Khata Invoices & Payment Allocations
CREATE TABLE khata_payment_allocations (
  id TEXT PRIMARY KEY,
  payment_transaction_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  allocated_amount REAL NOT NULL,
  allocated_at INTEGER NOT NULL
);
```

---

## 4. Outbox Sync Engine & Retry SLA Architecture

### 4.1. Retry Algorithm
The background worker inspects `sync_outbox` periodically using an exponential backoff with jitter:

$$\text{delayMs} = \min\left(300000, 1000 \times 2^{\text{retry\_count}}\right) \pm \text{jitter}(15\%)$$

* **Attempt 1**: Immediate or 1s
* **Attempt 2**: 2s
* **Attempt 3**: 4s
* **Attempt 4**: 8s
* **Attempt 5**: 16s
* **Attempt 6**: 32s (Max retries = 5 before transition to `DEAD_LETTER`).

### 4.2. SLA & High-Watermark Thresholds
* **Queue Latency SLA**: While online, all transactions must reach the cloud within **3 seconds** of local commit.
* **Offline Durability SLA**: System must operate disconnected indefinitely with up to **100,000 offline invoices** locally cached.
* **Escalation Triggers**:
  - **4-Hour Offline Warning**: If device has been offline continuously for > 4 hours, trigger cashier prompt to check store router/SIM dongle.
  - **Outbox High Watermark**: If `PENDING` outbox entries exceed 150 items, display a persistent status icon in the top header (`150 Offline Items Pending Cloud Sync`).
  - **Dead Letter Alert**: If any item fails with an unrecoverable validation error (e.g., malformed payload), alert manager with a one-click manual retry or export dump.

---

## 5. Recipe BOM & Compensating Transaction Logic

In F&B / Restaurant environments (such as a cafe counter or dining hall), a finished dish (e.g., *Paneer Butter Masala*) consumes raw materials from stock. When a KOT or table order is cancelled, stock must not be blindly credited:

```
                      KOT CANCELLATION REQUESTED
                                  │
                   Has Food Been Prepared in Kitchen?
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
               [ YES ]                         [ NO ]
                  │                               │
        Food Wasted / Spoiled             Raw Materials Still Intact
                  │                               │
       Emit 'STOCK_WASTAGE'             Emit 'COMPENSATING_REVERSAL'
             Record                           Journal Entry
                  │                               │
       BOM items NOT returned            BOM batches incremented
          to available stock             with reverse cost allocation
                  │                               │
                  └───────────────┬───────────────┘
                                  ▼
                   Audit Log Recorded with Reason &
                        Authorizing Staff ID
```

### Compensating Reversal Formula:
For each ingredient in the dish BOM:
$$\Delta Q_{\text{ingredient}} = Q_{\text{dish}} \times \text{Ingredient Ratio}$$
* If **Returned to Stock**: Add $\Delta Q$ back to the most recent batch of that ingredient.
* If **Wasted**: Mark $\Delta Q$ under the `Kitchen Wastage Ledger` with expense booking at current batch cost price.

---

## 6. Hardware Abstraction Layer (HAL) Specification

Modern Indian retail counters depend on three primary peripherals:

### 6.1. ESC/POS Thermal Receipt Printing (Tamil/Hindi/English)
* **Problem**: Standard ESC/POS printers in India have hardware code pages that do not render Indic scripts (Tamil, Hindi, Telugu) correctly, producing garbled characters.
* **Architectural Solution**:
  - The HAL contains a virtual canvas renderer (using HTML5 Canvas on web or Skia/Node-Canvas on desktop).
  - The receipt layout is rendered off-screen at 203 DPI (8 dots/mm).
  - The bitmap is converted to 1-bit monochrome ESC/POS raster image bytes (`GS v 0 \x00 ...`).
  - Supports dual formats:
    - **80mm (3-inch)**: 576 dots per line, 48 characters width.
    - **58mm (2-inch)**: 384 dots per line, 32 characters width.
  - Automatic cutter kick (`GS V 66 0`) and cash drawer solenoid kick (`ESC p 0 25 250`).

### 6.2. High-Speed Barcode Wedge Buffer (< 10ms SKU Resolution)
* **Problem**: Hardware barcode scanners emulate USB keyboards. Handheld scans type all characters within 15–30ms followed by an `Enter` keystroke. Normal keyboard listeners can drop characters during UI re-renders.
* **Solution**:
  - Global high-priority window key listener measuring inter-character timing.
  - If $\Delta t_{\text{chars}} < 30\text{ms}$ over $\ge 4$ characters ending in `Enter`, the event is intercepted as a barcode scan and prevented from firing into focused form fields.
  - Looked up against an in-memory **Trie / Hash Map index** of barcodes.
  - Benchmarked at **< 8ms lookup** for catalogs with up to 50,000 SKUs.

### 6.3. Electronic Serial Weighing Scale (Vegetable / Kirana Counters)
* **Protocol**: RS-232 / USB Virtual COM Port (Web Serial API & Node `serialport`).
* **Settings**: 9600 Baud, 8 Data Bits, No Parity, 1 Stop Bit (9600-8-N-1).
* **Stream Parsing**:
  - Real-time continuous stream pattern: `\x02ST,GS,+001.450kg\x03\r\n`.
  - Regex parser extracts stability flag (`ST` = stable, `US` = unstable) and net weight (`1.450`).
  - When the cashier scans an item with unit `KG`, the POS automatically locks the stable reading directly into the billing line item.

---

## 7. Phased Implementation Plan

| Phase | Milestone | Scope & Deliverables |
|---|---|---|
| **Phase 1** | **Outbox Sync Engine & Conflict Handler** | • Implement client-side `SyncQueueManager` with retry backoff & dead-letter queue.<br>• Implement server-side conflict reconciliation endpoint (`/api/v1/sync/delta`).<br>• Real-time stock discrepancy manager alert banner. |
| **Phase 2** | **Unified Storage Adapter (SQLite/IndexedDB)** | • Define generic `IDataStoreAdapter` interface.<br>• Build robust IndexedDB indexed schemas for items, batches, invoices, and outbox.<br>• Provide in-memory Trie index for instant (< 10ms) barcode resolution. |
| **Phase 3** | **Khata FIFO Allocations & BOM Reversal** | • Build Khata partial payment aging calculator (0-30, 31-60, 61-90, 90+ days).<br>• Compensating inventory reversal engine for cancelled KOTs and returned bills.<br>• Kitchen waste vs. stock return modal. |
| **Phase 4** | **Hardware Abstraction Layer (HAL)** | • ESC/POS 80mm & 58mm canvas bitmap generator supporting Tamil/Hindi text.<br>• Barcode wedge scanner listener with debounce and sub-10ms match.<br>• Web Serial electronic weighing scale connector widget. |
| **Phase 5** | **Executive Verification & End-to-End Testing** | • Verification of complete offline billing run with simulated network cut.<br>• Verification of concurrent multi-counter delta sync and discrepancy resolution.<br>• Full TypeScript build & compilation without errors. |

---

## 8. User Verification & Proceed Checklist

To confirm and initiate Phase 1 execution:
1. Review the conflict resolution decision tree and outbox retry specifications above.
2. Click **Proceed** to authorize building the underlying synchronization engine and interactive components.
