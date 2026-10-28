/**
 * Dynamic UPI QR Generator
 * Generates NPCI-compliant UPI payment intent URLs with locked invoice amount
 * format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */

import QRCode from 'qrcode';

export interface UPILinkParams {
  upiVpa: string;
  payeeName: string;
  amount: number;
  transactionNote: string;
}

export function generateUPIUrl({
  upiVpa,
  payeeName,
  amount,
  transactionNote,
}: UPILinkParams): string {
  const cleanVpa = encodeURIComponent(upiVpa.trim());
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(transactionNote.trim());
  const cleanAmount = amount.toFixed(2);

  return `upi://pay?pa=${cleanVpa}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
}

export async function generateUPIQRCodeDataUrl(params: UPILinkParams): Promise<string> {
  const upiUrl = generateUPIUrl(params);
  try {
    return await QRCode.toDataURL(upiUrl, {
      margin: 1,
      width: 256,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code', err);
    return '';
  }
}
