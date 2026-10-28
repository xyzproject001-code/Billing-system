/**
 * Voice-to-Cart Speech Recognition Utility (Medium Plan feature)
 * Parses spoken commands like "Add 2 Masala Dosa and 1 Filter Coffee"
 */

import { Product } from '../types';
import { normalizePhonetic } from './tanglishSearch';

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  oru: 1,
  onnu: 1,
  rendu: 2,
  moonu: 3,
  naalu: 4,
  anju: 5,
};

export interface VoiceRecognizedItem {
  product: Product;
  quantity: number;
}

export function parseVoiceCommand(
  transcript: string,
  catalog: Product[]
): VoiceRecognizedItem[] {
  const recognized: VoiceRecognizedItem[] = [];
  const clean = transcript.toLowerCase().replace(/please|add|gimme|give me|podu/g, '');

  // Split by common delimiters: "and", ",", "plus", "aduthu"
  const segments = clean.split(/\band\b|,|\bplus\b|\baduthu\b/);

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const words = trimmed.split(/\s+/);
    let qty = 1;

    // Check first word for quantity (digit or word)
    const firstWord = words[0];
    if (/^\d+$/.test(firstWord)) {
      qty = parseInt(firstWord, 10);
      words.shift();
    } else if (NUMBER_WORDS[firstWord]) {
      qty = NUMBER_WORDS[firstWord];
      words.shift();
    }

    const itemQuery = words.join(' ').trim();
    if (!itemQuery) continue;

    // Find best matching product
    const normItemQuery = normalizePhonetic(itemQuery);
    const match = catalog.find((prod) => {
      const engName = normalizePhonetic(prod.nameEnglish);
      if (engName.includes(normItemQuery) || normItemQuery.includes(engName)) return true;
      if (prod.phoneticKeywords.some((kw) => normalizePhonetic(kw).includes(normItemQuery))) return true;
      return false;
    });

    if (match) {
      recognized.push({ product: match, quantity: qty });
    }
  }

  return recognized;
}
