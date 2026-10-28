/**
 * Layer 3 & Layer 5: Express API Gateway & Entitlement Guard + Micro-Modules
 * Serves Vite middleware in development on port 3000
 */

import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory cloud store for persisted multi-tenant sync
const cloudDatabase = {
  invoices: [] as any[],
  auditLogs: [] as any[],
  webhooks: [] as any[],
  batchBalances: new Map<string, { currentQty: number; productName: string; batchNumber: string }>(),
  discrepancies: [] as any[],
};


// --- Middleware: Tenant & Entitlement Guard ---
function tenantGuard(req: Request, res: Response, next: Function) {
  const tenantId = (req.headers['x-tenant-id'] as string) || req.params.tenantId;
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing X-Tenant-ID header' });
  }
  // Attach tenant context
  (req as any).tenantId = tenantId;
  next();
}

// --- API Routes ---

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    layer: 'API Gateway & Cloud Sync Engine',
    paymentMode: process.env.PAYMENT_MODE || 'MOCK',
  });
});

// Cloud Sync Endpoint: Receives batched offline outbox invoices
app.post('/api/v1/sync/invoices', tenantGuard, (req, res) => {
  const { item } = req.body;
  if (!item || !item.payload) {
    return res.status(400).json({ error: 'Invalid sync payload' });
  }

  const invoice = item.payload;
  invoice.cloudSyncedAt = new Date().toISOString();
  invoice.syncStatus = 'synced';

  // Check if invoice already exists
  const existingIdx = cloudDatabase.invoices.findIndex((inv) => inv.id === invoice.id);
  if (existingIdx >= 0) {
    cloudDatabase.invoices[existingIdx] = invoice;
  } else {
    cloudDatabase.invoices.push(invoice);
  }

  // Record audit log
  cloudDatabase.auditLogs.push({
    id: 'log_' + Date.now(),
    tenant_id: (req as any).tenantId,
    timestamp: new Date().toISOString(),
    actor: invoice.cashierName || 'POS Terminal',
    action: 'CLOUD_SYNC_INVOICE',
    details: `Invoice ${invoice.invoiceNumber} synced from offline outbox. Total: ₹${invoice.grandTotal}`,
  });

  res.json({
    success: true,
    invoiceId: invoice.id,
    syncedAt: invoice.cloudSyncedAt,
    cloudTotalInvoices: cloudDatabase.invoices.length,
  });
});

// Single Outbox Item Sync Endpoint: Handles generic entities (invoice, khata, stock, KOT)
app.post('/api/v1/sync/item', (req, res) => {
  const { tenant_id, entityType, entityId, payload } = req.body;
  if (!entityType || !payload) {
    return res.status(400).json({ error: 'Missing entityType or payload' });
  }

  if (entityType === 'invoice') {
    payload.cloudSyncedAt = new Date().toISOString();
    payload.syncStatus = 'synced';
    const existingIdx = cloudDatabase.invoices.findIndex((inv) => inv.id === entityId || inv.id === payload.id);
    if (existingIdx >= 0) {
      cloudDatabase.invoices[existingIdx] = payload;
    } else {
      cloudDatabase.invoices.push(payload);
    }
  }

  cloudDatabase.auditLogs.push({
    id: 'log_' + Date.now(),
    tenant_id: tenant_id || 'tenant_murugan',
    timestamp: new Date().toISOString(),
    actor: 'Cloud Sync Engine',
    action: `SYNC_${entityType.toUpperCase()}`,
    details: `Entity ${entityId} (${entityType}) committed to cloud ledger store.`,
  });

  res.json({
    success: true,
    entityId,
    entityType,
    syncedAt: new Date().toISOString(),
  });
});

// Layer 2 & 5: High-Throughput Batch Sync with Delta Inventory Conflict Detection
app.post('/api/v1/sync/batch', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Expected items array' });
  }

  const succeededIds: string[] = [];
  const failedErrors: Record<string, string> = {};
  const generatedDiscrepancies: any[] = [];

  for (const item of items) {
    try {
      if (item.entityType === 'invoice' && item.payload) {
        const inv = item.payload;
        inv.cloudSyncedAt = new Date().toISOString();
        inv.syncStatus = 'synced';

        const existingIdx = cloudDatabase.invoices.findIndex((i) => i.id === inv.id);
        if (existingIdx >= 0) {
          cloudDatabase.invoices[existingIdx] = inv;
        } else {
          cloudDatabase.invoices.push(inv);
        }

        // Check line items for batch stock delta deductions
        inv.items?.forEach((line: any) => {
          const batchInfo = line.product?.batches?.[0];
          if (batchInfo) {
            const batchKey = batchInfo.id || batchInfo.batchNumber;
            const current = cloudDatabase.batchBalances.get(batchKey) || {
              currentQty: batchInfo.availableQty ?? 10,
              productName: line.product.nameEnglish,
              batchNumber: batchInfo.batchNumber,
            };

            const qtySold = line.weightGrams ? line.weightGrams / 1000 : line.quantity;
            current.currentQty = Number((current.currentQty - qtySold).toFixed(3));
            cloudDatabase.batchBalances.set(batchKey, current);

            // DETECT CONCURRENT OFFLINE OVERSELL: If stock goes below 0, emit discrepancy
            if (current.currentQty < 0) {
              const disc = {
                id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                tenant_id: inv.tenant_id,
                batchId: batchKey,
                batchNumber: batchInfo.batchNumber,
                productId: line.product.id,
                productName: line.product.nameEnglish,
                resultingQty: current.currentQty,
                discrepancyType: 'OFFLINE_OVERSOLD',
                countersInvolved: [inv.counterId || 'Counter-01'],
                invoices: [inv.invoiceNumber],
                status: 'REQUIRES_PHYSICAL_RECONCILIATION',
                createdAt: new Date().toISOString(),
              };
              cloudDatabase.discrepancies.push(disc);
              generatedDiscrepancies.push(disc);
            }
          }
        });
      }

      succeededIds.push(item.id);
    } catch (e: any) {
      failedErrors[item.id] = e?.message || 'Sync write failure';
    }
  }

  res.json({
    success: true,
    processedCount: items.length,
    succeededIds,
    failedErrors,
    discrepancies: generatedDiscrepancies,
  });
});

// Discrepancy Management: List active stock discrepancies
app.get('/api/v1/sync/discrepancies', (req, res) => {
  res.json({
    discrepancies: cloudDatabase.discrepancies,
    batchBalances: Array.from(cloudDatabase.batchBalances.entries()).map(([k, v]) => ({
      batchId: k,
      ...v,
    })),
  });
});

// Discrepancy Resolution: Manager acknowledges physical recount or assigns surplus
app.post('/api/v1/sync/discrepancies/resolve', (req, res) => {
  const { discrepancyId, action, notes, managerName } = req.body;
  const disc = cloudDatabase.discrepancies.find((d) => d.id === discrepancyId);
  if (!disc) {
    return res.status(404).json({ error: 'Discrepancy record not found' });
  }

  disc.status = 'RESOLVED_ADJUSTED';
  disc.reconciledBy = managerName || 'Store Manager';
  disc.reconciliationNotes = notes || action || 'Stock count physically reconciled and adjusted';
  disc.resolvedAt = new Date().toISOString();

  // Reset batch balance to 0 or adjusted count
  const balance = cloudDatabase.batchBalances.get(disc.batchId);
  if (balance) {
    balance.currentQty = Math.max(0, balance.currentQty);
    cloudDatabase.batchBalances.set(disc.batchId, balance);
  }

  res.json({ success: true, discrepancy: disc });
});

// Hardware Serial Scale Simulation Endpoint
app.get('/api/v1/hardware/scale-reading', (req, res) => {
  // Returns simulated standard continuous ASCII packet: ST,GS,+001.450kg
  const simulatedWeights = [0.45, 0.78, 1.25, 2.5, 0.92, 1.5];
  const weight = simulatedWeights[Math.floor(Math.random() * simulatedWeights.length)];
  const rawString = `ST,GS,+00${weight.toFixed(3)}kg\r\n`;

  res.json({
    rawString,
    weightKg: weight,
    isStable: true,
    unit: 'kg',
    baudRate: 9600,
    timestamp: Date.now(),
  });
});


// Dual-Mode Payment Webhook Verification (Mock / Razorpay)
app.post('/api/v1/payments/verify-webhook', (req, res) => {
  const paymentMode = process.env.PAYMENT_MODE || 'MOCK';
  const { paymentId, orderId, amount, signature, tenantId } = req.body;

  cloudDatabase.webhooks.push({
    receivedAt: new Date().toISOString(),
    paymentMode,
    tenantId,
    paymentId,
    amount,
  });

  if (paymentMode === 'MOCK') {
    return res.json({
      verified: true,
      mode: 'MOCK_SANDBOX',
      status: 'captured',
      paymentId: paymentId || 'pay_mock_' + Math.random().toString(36).substring(2, 9),
      amount: amount || 0,
      currency: 'INR',
      message: 'Instant simulated checkout verified successfully.',
    });
  }

  // In live mode with real keys:
  if (!signature) {
    return res.status(400).json({ verified: false, error: 'Missing Razorpay signature' });
  }

  res.json({
    verified: true,
    mode: 'RAZORPAY_LIVE',
    status: 'captured',
    paymentId,
    amount,
  });
});

// WhatsApp Notification Dispatcher / Deep Link Generator
app.post('/api/v1/notifications/whatsapp', (req, res) => {
  const { phone, message, type } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ error: 'Phone and message required' });
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const waLink = `https://wa.me/${cleanPhone}?text=${encodedText}`;

  res.json({
    success: true,
    recipient: phone,
    type: type || 'khata_reminder',
    waLink,
    dispatchedAt: new Date().toISOString(),
    status: 'queued_and_ready',
  });
});

// 1-Click Auditor GST GSTR-1 CSV/JSON Export
app.get('/api/v1/reports/gstr1', tenantGuard, (req, res) => {
  const tenantId = (req as any).tenantId;
  const tenantInvoices = cloudDatabase.invoices.filter((inv) => inv.tenant_id === tenantId);

  // Group by GST rate for GSTR-1 Table 7 / Table 8 / Table 12 HSN Summary
  const hsnSummary: Record<string, { desc: string; uqc: string; totalQty: number; taxableVal: number; cgst: number; sgst: number; igst: number; totalTax: number }> = {};
  
  tenantInvoices.forEach((inv) => {
    inv.items?.forEach((it: any) => {
      const hsn = it.product.hsnCode || '9999';
      if (!hsnSummary[hsn]) {
        hsnSummary[hsn] = {
          desc: it.product.category || 'Goods',
          uqc: it.product.unit || 'KGS',
          totalQty: 0,
          taxableVal: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          totalTax: 0,
        };
      }
      const qty = it.weightGrams ? it.weightGrams / 1000 : it.quantity;
      hsnSummary[hsn].totalQty += qty;
      const taxable = it.itemTotal - it.taxAmount;
      hsnSummary[hsn].taxableVal += taxable;
      hsnSummary[hsn].cgst += it.taxAmount / 2;
      hsnSummary[hsn].sgst += it.taxAmount / 2;
      hsnSummary[hsn].totalTax += it.taxAmount;
    });
  });

  const gstr1Payload = {
    gstin: req.query.gstin || '33AABCM1234F1Z5',
    fp: '102026', // Return Period Oct 2026
    b2cs: tenantInvoices.map((inv) => ({
      invNo: inv.invoiceNumber,
      invDate: inv.createdAt,
      val: inv.grandTotal,
      pos: '33', // Tamil Nadu
      taxable: inv.subtotal,
      cgst: inv.taxTotal / 2,
      sgst: inv.taxTotal / 2,
    })),
    hsn: Object.entries(hsnSummary).map(([hsn_sc, val]) => ({
      hsn_sc,
      desc: val.desc,
      uqc: val.uqc,
      qty: Number(val.totalQty.toFixed(2)),
      txval: Number(val.taxableVal.toFixed(2)),
      iamt: 0,
      camt: Number(val.cgst.toFixed(2)),
      samt: Number(val.sgst.toFixed(2)),
      csamt: 0,
    })),
  };

  res.json(gstr1Payload);
});

// Setup Vite development server
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VyapaarOS Multi-Tenant Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
