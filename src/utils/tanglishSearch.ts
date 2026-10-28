/**
 * Phonetic Tanglish & Multi-Script Search Engine
 * Allows cashiers to type Tamil product names phonetically in English
 * (e.g., 'ulunthu', 'sakkarai', 'seeni', 'kadugu', 'arisi') or English or barcode
 */

import { Product } from '../types';

// Common phonetic replacements to normalize transliteration variations
const PHONETIC_MAP: [RegExp, string][] = [
  [/oo/g, 'u'],
  [/ee/g, 'i'],
  [/dh/g, 'd'],
  [/th/g, 't'],
  [/zh/g, 'l'],
  [/sh/g, 's'],
  [/ch/g, 'c'],
  [/kk/g, 'k'],
  [/pp/g, 'p'],
  [/tt/g, 't'],
  [/ll/g, 'l'],
  [/nn/g, 'n'],
  [/rr/g, 'r'],
  [/mm/g, 'm'],
];

export function normalizePhonetic(text: string): string {
  if (!text) return '';
  let normalized = text.toLowerCase().trim();
  for (const [regex, replacement] of PHONETIC_MAP) {
    normalized = normalized.replace(regex, replacement);
  }
  return normalized;
}

export function searchProducts(
  products: Product[],
  searchQuery: string,
  categoryFilter?: string
): Product[] {
  if (!searchQuery && !categoryFilter) {
    return products;
  }

  const query = searchQuery.trim().toLowerCase();
  const normalizedQuery = normalizePhonetic(query);

  return products.filter((prod) => {
    // Category match
    if (categoryFilter && categoryFilter !== 'ALL' && prod.category !== categoryFilter) {
      return false;
    }

    if (!query) return true;

    // Exact barcode match (fast hardware scanner)
    if (prod.barcode && prod.barcode.toLowerCase() === query) {
      return true;
    }

    // SKU match
    if (prod.sku && prod.sku.toLowerCase().includes(query)) {
      return true;
    }

    // English name match
    if (prod.nameEnglish.toLowerCase().includes(query)) {
      return true;
    }

    // Tamil native script match
    if (prod.nameTamil && prod.nameTamil.toLowerCase().includes(query)) {
      return true;
    }

    // Phonetic keywords array match
    if (prod.phoneticKeywords && prod.phoneticKeywords.some((kw) => kw.toLowerCase().includes(query))) {
      return true;
    }

    // Normalized phonetic match on English name and keywords
    const normName = normalizePhonetic(prod.nameEnglish);
    if (normName.includes(normalizedQuery)) {
      return true;
    }

    if (
      prod.phoneticKeywords &&
      prod.phoneticKeywords.some((kw) => normalizePhonetic(kw).includes(normalizedQuery))
    ) {
      return true;
    }

    return false;
  });
}
