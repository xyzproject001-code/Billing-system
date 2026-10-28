/**
 * Layer 1: Hardware & Receipt Utilities
 * ESC/POS Thermal Printer Commands & Text Formatter (58mm / 80mm)
 */

import { Invoice, Tenant } from '../types';

export function formatEscPosReceiptText(invoice: Invoice, tenant: Tenant, paperWidth: 58 | 80 = 80): string {
  const width = paperWidth === 58 ? 32 : 44;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);

  const center = (text: string) => {
    if (text.length >= width) return text.substring(0, width);
    const leftPad = Math.floor((width - text.length) / 2);
    return ' '.repeat(leftPad) + text;
  };

  const justify = (left: string, right: string) => {
    const space = width - left.length - right.length;
    if (space <= 0) return `${left} ${right}`.substring(0, width);
    return left + ' '.repeat(space) + right;
  };

  let out = '';
  // Header
  out += center(tenant.name.toUpperCase()) + '\n';
  out += center(tenant.address) + '\n';
  out += center(`Phone: ${tenant.phone}`) + '\n';
  if (tenant.gstNumber) out += center(`GSTIN: ${tenant.gstNumber}`) + '\n';
  if (tenant.fssaiNumber) out += center(`FSSAI: ${tenant.fssaiNumber}`) + '\n';
  out += doubleLine + '\n';

  // Invoice Meta
  out += justify(`BILL: ${invoice.invoiceNumber}`, new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) + '\n';
  out += justify(`DATE: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`, `CASHIER: ${invoice.cashierName}`) + '\n';
  if (invoice.tableId) out += justify(`TABLE: ${invoice.tableId}`, `MODE: ${invoice.paymentMethod.toUpperCase()}`) + '\n';
  if (invoice.roomNumber) out += justify(`ROOM: ${invoice.roomNumber}`, `MODE: ROOM FOLIO`) + '\n';
  if (invoice.customer?.name) out += `CUSTOMER: ${invoice.customer.name} (${invoice.customer.phone})\n`;
  out += line + '\n';

  // Item Headers
  if (paperWidth === 80) {
    out += justify('ITEM [HSN]', 'QTY  RATE   TOTAL') + '\n';
  } else {
    out += justify('ITEM', 'QTY  TOTAL') + '\n';
  }
  out += line + '\n';

  // Items
  for (const item of invoice.items) {
    const name = item.product.nameEnglish.substring(0, width - 16);
    const qtyStr = item.weightGrams ? `${(item.weightGrams / 1000).toFixed(3)}kg` : `${item.quantity}`;
    const rateStr = `${item.product.price}`;
    const totalStr = `${item.itemTotal.toFixed(2)}`;

    out += name + '\n';
    if (paperWidth === 80) {
      out += justify(`  HSN:${item.product.hsnCode} [${item.product.taxRate}%]`, `${qtyStr} x ${rateStr} = ₹${totalStr}`) + '\n';
    } else {
      out += justify(`  ${qtyStr} x ₹${rateStr}`, `₹${totalStr}`) + '\n';
    }
  }
  out += line + '\n';

  // Totals
  out += justify('SUBTOTAL:', `₹${invoice.subtotal.toFixed(2)}`) + '\n';
  if (invoice.discountTotal > 0) {
    out += justify('DISCOUNT:', `-₹${invoice.discountTotal.toFixed(2)}`) + '\n';
  }
  out += justify('TOTAL GST / TAX:', `₹${invoice.taxTotal.toFixed(2)}`) + '\n';
  if (invoice.roundOff !== 0) {
    out += justify('ROUND OFF:', `₹${invoice.roundOff.toFixed(2)}`) + '\n';
  }
  out += doubleLine + '\n';
  out += justify('NET PAYABLE:', `₹${invoice.grandTotal.toFixed(2)}`) + '\n';
  out += doubleLine + '\n';

  // Payment Breakdown
  out += justify('PAYMENT STATUS:', `${invoice.paymentMethod.toUpperCase()} (PAID)`) + '\n';
  if (invoice.syncStatus === 'pending') {
    out += center('[OFFLINE BILL - PENDING CLOUD SYNC]') + '\n';
  }
  out += line + '\n';

  // Footer
  out += center(tenant.receiptFooter) + '\n';
  out += center('Powered by VyapaarOS SaaS') + '\n\n\n';

  return out;
}
