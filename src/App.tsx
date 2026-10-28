/**
 * HI Scale Multi-Tenant Desktop POS & Billing System
 * Main Application Entry Point
 */

import React, { useState, useEffect } from 'react';
import { Invoice, PlanTier, RestaurantTable, Tenant, UserStaff } from './types';
import {
  SEED_TENANTS,
  SEED_STAFF,
  SEED_GROCERY_PRODUCTS,
  SEED_CAFE_PRODUCTS,
  SEED_HOTEL_PRODUCTS,
  SEED_KHATA_CUSTOMERS,
  SEED_TABLES,
  SEED_ROOM_FOLIOS,
} from './data/seedData';
import { localDB } from './services/db';
import { HiScaleDesktopShell } from './components/HiScaleDesktopShell';
import { HiScaleDashboard } from './components/HiScaleDashboard';
import { HiScalePosTerminal } from './components/HiScalePosTerminal';
import { HiScaleAddItemModal } from './components/HiScaleAddItemModal';
import { KhataLedgerView } from './components/KhataLedgerView';
import { TableAndKotView } from './components/TableAndKotView';
import { EnterpriseHqView } from './components/EnterpriseHqView';
import { InvoicesListView } from './components/InvoicesListView';
import { PlanEntitlementModal } from './components/PlanEntitlementModal';
import { CustomerDisplayModal } from './components/CustomerDisplayModal';
import { ManagerSyncModal } from './components/ManagerSyncModal';
import { HardwareHubModal } from './components/HardwareHubModal';
import { fastCatalogCache } from './utils/storageAdapter';
import { getOutboxQueue } from './utils/outboxSync';


export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>(SEED_TENANTS);
  const [activeTenant, setActiveTenant] = useState<Tenant>(SEED_TENANTS[0]);
  const [activeStaff, setActiveStaff] = useState<UserStaff>(SEED_STAFF[0]);

  // Active Navigation Section: Defaulting to 'home' (Executive Dashboard)
  const [activeSection, setActiveSection] = useState<string>('home');

  // Network & Outbox Sync State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [outboxCount, setOutboxCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Catalog Products & Invoices
  const [catalog, setCatalog] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isCustomerDisplayOpen, setIsCustomerDisplayOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isHardwareHubOpen, setIsHardwareHubOpen] = useState(false);
  const [unresolvedDiscrepancyCount, setUnresolvedDiscrepancyCount] = useState<number>(0);

  // Table context when navigating from Table Floor -> POS to settle
  const [activeTableContext, setActiveTableContext] = useState<RestaurantTable | null>(null);

  // Initialize Seed Data into IndexedDB on first load
  useEffect(() => {
    const initSeedData = async () => {
      // 1. Seed Products if empty
      const existingProds = await localDB.getProductsByTenant(activeTenant.id);
      if (existingProds.length === 0) {
        await localDB.saveProducts([
          ...SEED_GROCERY_PRODUCTS,
          ...SEED_CAFE_PRODUCTS,
          ...SEED_HOTEL_PRODUCTS,
        ]);
      }

      // 2. Seed Khata customers
      const existingKhata = await localDB.getKhataCustomers(activeTenant.id);
      if (existingKhata.length === 0) {
        for (const cust of SEED_KHATA_CUSTOMERS) {
          await localDB.saveKhataCustomer(cust);
        }
      }

      // 3. Seed Tables
      const existingTables = await localDB.getTables(activeTenant.id);
      if (existingTables.length === 0) {
        await localDB.saveTables(SEED_TABLES);
      }

      // 4. Seed Room Folios
      const existingFolios = await localDB.getRoomFolios(activeTenant.id);
      if (existingFolios.length === 0) {
        await localDB.saveRoomFolios(SEED_ROOM_FOLIOS);
      }

      loadCatalog();
      loadInvoices();
      updateOutboxCount();
      checkDiscrepancies();
    };

    initSeedData();
  }, [activeTenant.id]);

  const loadCatalog = async () => {
    let prods = await localDB.getProductsByTenant(activeTenant.id);
    if (prods.length === 0) {
      if (activeTenant.businessType === 'grocery') prods = SEED_GROCERY_PRODUCTS;
      else if (activeTenant.businessType === 'restaurant') prods = SEED_CAFE_PRODUCTS;
      else prods = SEED_HOTEL_PRODUCTS;
    }
    setCatalog(prods);
    // Instant < 10ms in-memory Trie indexing
    fastCatalogCache.indexProducts(prods);
  };

  const checkDiscrepancies = async () => {
    try {
      const res = await fetch('/api/v1/sync/discrepancies');
      if (res.ok) {
        const data = await res.json();
        const pending = (data.discrepancies || []).filter(
          (d: any) => d.status === 'REQUIRES_PHYSICAL_RECONCILIATION'
        );
        setUnresolvedDiscrepancyCount(pending.length);
      }
    } catch {}
  };

  const loadInvoices = async () => {
    const list = await localDB.getInvoicesByTenant(activeTenant.id);
    setInvoices(list);
  };

  const updateOutboxCount = async () => {
    const items = getOutboxQueue();
    const pending = items.filter((i) => i.status === 'pending' || i.status === 'failed');
    setOutboxCount(pending.length);
  };


  // Sync Outbox queue with server
  const handleSyncOutbox = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      await localDB.syncOutboxQueue(activeTenant.id);
      await updateOutboxCount();
      await loadInvoices();
    } catch (e) {
      console.warn('Sync failed', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Switch Active Tenant
  const handleSelectTenant = (tenant: Tenant) => {
    setActiveTenant(tenant);
    const matchedStaff = SEED_STAFF.find((s) => s.tenant_id === tenant.id) || SEED_STAFF[0];
    setActiveStaff(matchedStaff);
    setActiveTableContext(null);
  };

  // Live update subscription tier for active tenant
  const handleUpdateTier = (newTier: PlanTier) => {
    const updated = { ...activeTenant, planTier: newTier };
    setActiveTenant(updated);
    setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
    setIsPlanModalOpen(false);
  };

  // Save new item from Add Item modal
  const handleSaveProduct = async (newProd: any, saveAndNew: boolean) => {
    await localDB.saveProducts([newProd, ...catalog]);
    loadCatalog();
  };

  return (
    <HiScaleDesktopShell
      tenants={tenants}
      activeTenant={activeTenant}
      onSelectTenant={handleSelectTenant}
      activeStaff={activeStaff}
      activeSection={activeSection}
      onNavigate={(sec) => {
        setActiveSection(sec);
        if (sec !== 'pos') setActiveTableContext(null);
      }}
      onOpenAddItem={() => setIsAddItemModalOpen(true)}
      onOpenAddSale={() => setActiveSection('pos')}
      onOpenAddPurchase={() => setActiveSection('bom')}
      onOpenPlanModal={() => setIsPlanModalOpen(true)}
      onOpenCustomerDisplay={() => setIsCustomerDisplayOpen(true)}
      onOpenHardwareHub={() => setIsHardwareHubOpen(true)}
      onOpenSyncManager={() => setIsSyncModalOpen(true)}
      unresolvedDiscrepancyCount={unresolvedDiscrepancyCount}
      isOnline={isOnline}
      onToggleOnline={() => setIsOnline(!isOnline)}
      outboxCount={outboxCount}
      onSyncOutbox={() => setIsSyncModalOpen(true)}
      isSyncing={isSyncing}
    >

      {/* 1. HI Scale Executive Dashboard */}
      {activeSection === 'home' && (
        <HiScaleDashboard
          tenant={activeTenant}
          invoices={invoices}
          onNavigate={(sec) => setActiveSection(sec)}
          onOpenAddSale={() => setActiveSection('pos')}
          onOpenAddPurchase={() => setActiveSection('bom')}
        />
      )}

      {/* 2. HI Scale Tabbed POS Quick Billing Terminal */}
      {activeSection === 'pos' && (
        <HiScalePosTerminal
          tenant={activeTenant}
          catalog={catalog}
          activeStaff={activeStaff}
          allStaff={SEED_STAFF}
          isOnline={isOnline}
          onInvoiceCreated={() => {
            updateOutboxCount();
            loadInvoices();
          }}
          onRefreshCatalog={loadCatalog}
          activeTableContext={activeTableContext}
          onClearTableContext={() => setActiveTableContext(null)}
        />
      )}

      {/* 3. Parties & Smart Khata Credit Ledger */}
      {activeSection === 'parties' && <KhataLedgerView tenant={activeTenant} />}

      {/* 4. Sale -> Tables & Kitchen Order Tickets (KOT) */}
      {activeSection === 'tables' && (
        <TableAndKotView
          tenant={activeTenant}
          catalog={catalog}
          onOpenPosForTable={(table) => {
            setActiveTableContext(table);
            setActiveSection('pos');
          }}
        />
      )}

      {/* 5. Items -> BOM Recipes & Raw Materials Stock */}
      {activeSection === 'bom' && (
        <EnterpriseHqView
          tenant={activeTenant}
          catalog={catalog}
          onRefreshCatalog={loadCatalog}
        />
      )}

      {/* 6. Utilities -> Hotel Room Folios */}
      {activeSection === 'folios' && (
        <EnterpriseHqView
          tenant={activeTenant}
          catalog={catalog}
          onRefreshCatalog={loadCatalog}
        />
      )}

      {/* 7. Reports & GST GSTR-1 */}
      {activeSection === 'reports' && (
        <EnterpriseHqView
          tenant={activeTenant}
          catalog={catalog}
          onRefreshCatalog={loadCatalog}
        />
      )}

      {/* 8. Sale Invoices & Audit List */}
      {activeSection === 'invoices' && (
        <InvoicesListView tenant={activeTenant} staffList={SEED_STAFF} />
      )}

      {/* HI Scale Add Item Modal */}
      <HiScaleAddItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onSaveProduct={handleSaveProduct}
        tenantId={activeTenant.id}
      />

      {/* HI Scale Plans & Pricing Entitlement Matrix Modal */}
      <PlanEntitlementModal
        isOpen={isPlanModalOpen}
        onClose={() => setIsPlanModalOpen(false)}
        activeTenant={activeTenant}
        onUpdateTier={handleUpdateTier}
      />

      {/* Customer Facing Pole Display Modal */}
      <CustomerDisplayModal
        isOpen={isCustomerDisplayOpen}
        onClose={() => setIsCustomerDisplayOpen(false)}
        cart={[]}
        grandTotal={0}
        subtotal={0}
        taxTotal={0}
        tenant={activeTenant}
      />

      {/* Layer 2: Manager Outbox Sync & Stock Conflict Resolution Center */}
      <ManagerSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={isOnline}
        onToggleOnline={() => setIsOnline(!isOnline)}
        onSyncComplete={() => {
          updateOutboxCount();
          loadInvoices();
          checkDiscrepancies();
        }}
      />

      {/* Layer 4: Hardware Abstraction Layer (HAL) Hub (ESC/POS Tamil, Weighing Scale, Barcode) */}
      <HardwareHubModal
        isOpen={isHardwareHubOpen}
        onClose={() => setIsHardwareHubOpen(false)}
        sampleInvoice={invoices[0]}
      />
    </HiScaleDesktopShell>
  );
}

