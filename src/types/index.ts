/**
 * Multi-Tenant SaaS POS & Billing System
 * Core Types & Data Definitions
 */

export type PlanTier = 'basic' | 'medium' | 'high';

export type BusinessType = 'grocery' | 'restaurant' | 'hotel' | 'supermarket';

export type FeatureKey =
  | 'tanglishSearch'
  | 'looseWeightCalculator'
  | 'dynamicUpiQr'
  | 'khataLedger'
  | 'offlineSync'
  | 'kotAndTableManagement'
  | 'voiceMicBilling'
  | 'expiryAlerts'
  | 'staffRbac'
  | 'splitPayments'
  | 'ownerDailySummary'
  | 'multiBranchHq'
  | 'bomRecipeTracking'
  | 'roomFolioBilling'
  | 'auditLogGstExport'
  | 'webhookVerification';

export interface PlanDetails {
  id: PlanTier;
  name: string;
  pricePerMonth: number;
  tagline: string;
  recommendedFor: string;
  features: FeatureKey[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  isHQ?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  planTier: PlanTier;
  gstNumber: string;
  fssaiNumber?: string;
  address: string;
  phone: string;
  email: string;
  upiVpa: string;
  currencySymbol: string;
  branches: Branch[];
  activeBranchId: string;
  isTaxInclusive: boolean;
  receiptFooter: string;
  createdAt: string;
}

export type UnitType = 'kg' | 'g' | 'piece' | 'liter' | 'ml' | 'packet' | 'plate' | 'box';

export interface BOMIngredient {
  rawProductId: string;
  rawProductName: string;
  qtyRequired: number;
  unit: UnitType;
}

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  costPrice: number;
  salePrice: number;
  mrp: number;
  initialQty: number;
  availableQty: number;
  inwardDate: string;
  expiryDate: string; // YYYY-MM-DD
}

export interface OutboxSyncItem {
  id: string;
  tenant_id: string;
  client_tx_id?: string;
  entityType: 'invoice' | 'khata_transaction' | 'stock_deduction' | 'batch_delta' | 'kot';
  entityId: string;
  operation?: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'dead_letter';
  retryCount: number;
  lastError?: string;
  nextRetryAt?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockDiscrepancy {
  id: string;
  tenant_id: string;
  batchId: string;
  batchNumber: string;
  productId: string;
  productName: string;
  resultingQty: number; // e.g. -3
  discrepancyType: 'OFFLINE_OVERSOLD' | 'PHYSICAL_VARIANCE';
  countersInvolved: string[];
  invoices: string[];
  status: 'REQUIRES_PHYSICAL_RECONCILIATION' | 'RESOLVED_ADJUSTED';
  reconciledBy?: string;
  reconciliationNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface KhataPaymentAllocation {
  id: string;
  paymentTransactionId: string;
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
  allocatedAt: string;
}

export interface KhataAgingBucket {
  customerId: string;
  customerName: string;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  totalOutstanding: number;
}

export interface HardwareScaleReading {
  rawString: string;
  isStable: boolean;
  weightKg: number;
  unit: string;
  timestamp: number;
}

export interface HardwareConfig {
  scaleBaudRate: 9600 | 19200 | 38400;
  scaleDataBits: 7 | 8;
  scalePortConnected: boolean;
  printerWidth: '80mm' | '58mm';
  printerMode: 'raster_canvas_indic' | 'standard_text';
  barcodeWedgeThresholdMs: number;
}


export interface Product {
  id: string;
  tenant_id: string;
  branch_id?: string;
  barcode: string;
  sku: string;
  nameEnglish: string;
  nameTamil?: string;
  phoneticKeywords: string[];
  category: string;
  price: number;
  costPrice: number;
  mrp: number;
  unit: UnitType;
  isLooseItem: boolean;
  taxRate: 0 | 5 | 12 | 18 | 28;
  hsnCode: string;
  stockQty: number;
  lowStockThreshold: number;
  expiryDate?: string; // YYYY-MM-DD
  isBOMItem?: boolean;
  bomIngredients?: BOMIngredient[];
  batches?: ProductBatch[];
  imageUrl?: string;
}

export interface CartItem {
  id: string; // unique cart line id
  product: Product;
  quantity: number;
  weightGrams?: number;
  customPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  notes?: string;
  taxAmount: number;
  itemTotal: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split' | 'khata' | 'room_folio';

export interface SplitPaymentDetail {
  cash?: number;
  upi?: number;
  card?: number;
  khata?: number;
}

export interface InvoiceCustomer {
  id?: string;
  name: string;
  phone: string;
  address?: string;
  gstNumber?: string;
  isKhata?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  tenant_id: string;
  branch_id: string;
  counterId: string;
  cashierId: string;
  cashierName: string;
  customer?: InvoiceCustomer;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  taxTotal: number;
  taxBreakdown: {
    rate: number;
    taxable: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  }[];
  discountTotal: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  splitDetails?: SplitPaymentDetail;
  status: 'completed' | 'voided' | 'held' | 'refunded';
  syncStatus: 'synced' | 'pending' | 'failed';
  createdAt: string;
  // Medium Tier Restaurant Fields
  tableId?: string;
  kotId?: string;
  // High Tier Hotel Fields
  roomNumber?: string;
  folioId?: string;
  // Security & Audit
  voidReason?: string;
  managerPinVerified?: boolean;
}

export type TableStatus = 'vacant' | 'occupied' | 'kot_sent' | 'billed';

export interface RestaurantTable {
  id: string;
  tenant_id: string;
  branch_id: string;
  tableNumber: string;
  capacity: number;
  floor: 'Ground Floor' | 'AC Hall' | 'Rooftop / Garden';
  status: TableStatus;
  activeOrderId?: string;
  guestCount?: number;
  waiterName?: string;
  startedAt?: string;
  currentTotal?: number;
  notes?: string;
}

export interface KOTItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'cooking' | 'ready' | 'served';
}

export interface KitchenOrderTicket {
  id: string;
  kotNumber: string;
  tenant_id: string;
  branch_id: string;
  tableId: string;
  tableNumber: string;
  items: KOTItem[];
  timestamp: string;
  waiterName: string;
  status: 'active' | 'completed' | 'cancelled';
  orderType: 'dine_in' | 'takeaway' | 'room_service';
}

export interface KhataCustomer {
  id: string;
  tenant_id: string;
  name: string;
  phone: string;
  address?: string;
  creditLimit: number;
  currentBalance: number; // positive = customer owes shop
  lastTransactionAt: string;
  createdAt: string;
}

export interface KhataTransaction {
  id: string;
  tenant_id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  type: 'credit_given' | 'payment_received';
  amount: number;
  invoiceId?: string;
  balanceAfter: number;
  notes?: string;
  createdAt: string;
}

export interface HotelRoomFolio {
  id: string;
  tenant_id: string;
  roomNumber: string;
  roomType: 'Deluxe' | 'Executive Suite' | 'Standard AC';
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  roomChargesPerNight: number;
  nights: number;
  restaurantAndPosCharges: number;
  advancePaid: number;
  totalBalance: number;
  status: 'checked_in' | 'settled';
  linkedInvoices: string[];
}

export interface StockTransfer {
  id: string;
  tenant_id: string;
  transferNumber: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unit: UnitType;
  }[];
  status: 'pending' | 'dispatched' | 'received';
  requestedBy: string;
  createdAt: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  tenant_id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  role: 'owner' | 'manager' | 'cashier';
  action:
    | 'CREATE_BILL'
    | 'VOID_BILL'
    | 'APPLY_DISCOUNT'
    | 'STOCK_TRANSFER'
    | 'BOM_DEDUCT'
    | 'PRICE_OVERRIDE'
    | 'KHATA_TRANSACTION'
    | 'LOGIN';
  details: string;
  metadata?: Record<string, any>;
}

export interface UserStaff {
  id: string;
  tenant_id: string;
  name: string;
  role: 'owner' | 'manager' | 'cashier';
  pin: string; // 4-digit PIN
  phone: string;
}
