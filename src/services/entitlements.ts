/**
 * Layer 3: Entitlement Guard & Subscription Tier System
 * Enforces feature availability across Basic, Medium, and High plans
 */

import { FeatureKey, PlanDetails, PlanTier } from '../types';

export const PLANS: Record<PlanTier, PlanDetails> = {
  basic: {
    id: 'basic',
    name: 'Basic Plan (Grocery / Petty)',
    pricePerMonth: 299,
    tagline: 'Speed, zero typing, credit tracking & offline reliability',
    recommendedFor: 'Small grocery shops, kirana, vegetable vendors, petty shops',
    features: [
      'tanglishSearch',
      'looseWeightCalculator',
      'dynamicUpiQr',
      'khataLedger',
      'offlineSync',
    ],
  },
  medium: {
    id: 'medium',
    name: 'Medium Plan (Restaurants / Supermarkets)',
    pricePerMonth: 699,
    tagline: 'Table management, KOT, staff loss prevention & expiry alerts',
    recommendedFor: 'Bakeries, cafes, dine-in restaurants, sweet stalls, supermarkets',
    features: [
      // Inherits all basic features
      'tanglishSearch',
      'looseWeightCalculator',
      'dynamicUpiQr',
      'khataLedger',
      'offlineSync',
      // Medium Tier Features
      'kotAndTableManagement',
      'voiceMicBilling',
      'expiryAlerts',
      'staffRbac',
      'splitPayments',
      'ownerDailySummary',
    ],
  },
  high: {
    id: 'high',
    name: 'High Plan (Hotels / Chains)',
    pricePerMonth: 1499,
    tagline: 'Multi-branch HQ control, recipe BOM tracking & GST compliance',
    recommendedFor: 'Hotels with lodging & restaurant, multi-outlet chains, franchises',
    features: [
      // Inherits all basic & medium features
      'tanglishSearch',
      'looseWeightCalculator',
      'dynamicUpiQr',
      'khataLedger',
      'offlineSync',
      'kotAndTableManagement',
      'voiceMicBilling',
      'expiryAlerts',
      'staffRbac',
      'splitPayments',
      'ownerDailySummary',
      // High Tier Features
      'multiBranchHq',
      'bomRecipeTracking',
      'roomFolioBilling',
      'auditLogGstExport',
      'webhookVerification',
    ],
  },
};

export const FEATURE_INFO: Record<
  FeatureKey,
  { name: string; requiredTier: PlanTier; description: string; icon: string }
> = {
  tanglishSearch: {
    name: 'Tanglish Phonetic Search',
    requiredTier: 'basic',
    description: 'Search items using Tamil sounds in English script (e.g., "sakkarai", "ulunthu", "kadugu")',
    icon: 'Languages',
  },
  looseWeightCalculator: {
    name: 'Reverse Loose Weight Calc',
    requiredTier: 'basic',
    description: 'Auto-calculates exact grams when customer specifies rupee amount (e.g. ₹40 of sugar)',
    icon: 'Scale',
  },
  dynamicUpiQr: {
    name: 'Dynamic Amount-Locked UPI QR',
    requiredTier: 'basic',
    description: 'Instant zero-fee QR code with exact invoice total encoded to avoid cash counting and unpaid disputes',
    icon: 'QrCode',
  },
  khataLedger: {
    name: 'Smart Khata & WhatsApp Links',
    requiredTier: 'basic',
    description: 'Digital credit ledger with 1-click WhatsApp payment reminder links to recover debts 3x faster',
    icon: 'BookOpen',
  },
  offlineSync: {
    name: 'Offline-First Outbox Sync',
    requiredTier: 'basic',
    description: 'Zero lag checkout even without internet. Stores bills in IndexedDB and syncs to cloud on reconnect',
    icon: 'WifiOff',
  },
  kotAndTableManagement: {
    name: 'Table & KOT Manager',
    requiredTier: 'medium',
    description: 'Floor layout, live table status (vacant/occupied/billed) and Kitchen Order Tickets (KOT)',
    icon: 'UtensilsCrossed',
  },
  voiceMicBilling: {
    name: 'Voice-to-Cart Mic Billing',
    requiredTier: 'medium',
    description: 'Speak items into the microphone (e.g. "2 Dosa, 1 Tea") to populate cart with zero clicking',
    icon: 'Mic',
  },
  expiryAlerts: {
    name: 'Expiry & Dead-Stock Clearance',
    requiredTier: 'medium',
    description: 'Automated warnings for products nearing expiry with 1-click 15% clearance discount application',
    icon: 'AlertTriangle',
  },
  staffRbac: {
    name: 'Staff RBAC & Void Protections',
    requiredTier: 'medium',
    description: 'Role-based cashier restrictions; bill voids and manual price overrides require 4-digit Manager PIN',
    icon: 'ShieldAlert',
  },
  splitPayments: {
    name: 'Split & Hybrid Payments',
    requiredTier: 'medium',
    description: 'Accept combinations of Cash, UPI, Card, and Credit ledger in a single transaction',
    icon: 'CreditCard',
  },
  ownerDailySummary: {
    name: 'Owner 9 PM WhatsApp Summary',
    requiredTier: 'medium',
    description: 'Automated daily business digest dispatched to the owner: sales, cash vs UPI, voids, low stock',
    icon: 'MessageSquare',
  },
  multiBranchHq: {
    name: 'Central HQ & Multi-Branch Control',
    requiredTier: 'high',
    description: 'Manage multiple retail or restaurant outlets from one dashboard with stock transfers and consolidated analytics',
    icon: 'Building2',
  },
  bomRecipeTracking: {
    name: 'Recipe BOM Inventory Deduction',
    requiredTier: 'high',
    description: 'Selling 1 Masala Dosa automatically subtracts batter, potatoes, oil, and ghee from raw materials stock',
    icon: 'Layers',
  },
  roomFolioBilling: {
    name: 'Hotel Room-Folio Billing Link',
    requiredTier: 'high',
    description: 'Assign restaurant and cafe bills to hotel room numbers; consolidate into a single checkout invoice',
    icon: 'BedDouble',
  },
  auditLogGstExport: {
    name: '1-Click Auditor GST CSV/JSON',
    requiredTier: 'high',
    description: 'GSTR-1 compliant sales register, HSN tax summary, and immutable tamper-proof staff audit logs',
    icon: 'FileSpreadsheet',
  },
  webhookVerification: {
    name: 'Automated UPI Webhook Verification',
    requiredTier: 'high',
    description: 'Server-side payment verification webhooks with Razorpay/UPI gateway integration',
    icon: 'Webhook',
  },
};

export function canAccess(tier: PlanTier, feature: FeatureKey): boolean {
  return PLANS[tier].features.includes(feature);
}

export function getTierLevel(tier: PlanTier): number {
  switch (tier) {
    case 'basic':
      return 1;
    case 'medium':
      return 2;
    case 'high':
      return 3;
    default:
      return 1;
  }
}
