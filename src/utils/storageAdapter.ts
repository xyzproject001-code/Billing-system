/**
 * Layer 2: Unified Local Storage Adapter & High-Speed Barcode Trie / Hash Cache
 * Provides unified interface for IndexedDB (Web browser) and SQLite (Desktop),
 * with an in-memory Trie and Hash index guaranteeing < 10ms instantaneous SKU lookups.
 */

import { Product } from '../types';

export interface IDataStoreAdapter {
  init(): Promise<void>;
  getProductByBarcode(barcode: string): Promise<Product | null>;
  queryProducts(keyword: string): Promise<Product[]>;
  cacheCatalog(products: Product[]): void;
}

class InvertedTrieNode {
  children: Map<string, InvertedTrieNode> = new Map();
  productIds: Set<string> = new Set();
}

export class BarcodeAndTrieCache {
  private barcodeMap: Map<string, Product> = new Map();
  private skuMap: Map<string, Product> = new Map();
  private productList: Product[] = [];
  private trieRoot: InvertedTrieNode = new InvertedTrieNode();

  public indexProducts(products: Product[]): void {
    const start = performance.now();
    this.productList = products;
    this.barcodeMap.clear();
    this.skuMap.clear();
    this.trieRoot = new InvertedTrieNode();

    for (const prod of products) {
      if (prod.barcode) {
        this.barcodeMap.set(prod.barcode.trim(), prod);
      }
      if (prod.sku) {
        this.skuMap.set(prod.sku.trim().toUpperCase(), prod);
      }

      // Index words for fast prefix search
      const terms = [
        prod.nameEnglish,
        prod.nameTamil || '',
        ...(prod.phoneticKeywords || []),
        prod.category,
      ]
        .join(' ')
        .toLowerCase()
        .split(/[^a-z0-9\u0B80-\u0BFF]+/);

      for (const term of terms) {
        if (!term || term.length < 2) continue;
        this.insertTrie(term, prod.id);
      }
    }

    const duration = performance.now() - start;
    console.debug(`[BarcodeAndTrieCache] Indexed ${products.length} products in ${duration.toFixed(2)}ms`);
  }

  private insertTrie(word: string, productId: string): void {
    let current = this.trieRoot;
    for (const char of word) {
      if (!current.children.has(char)) {
        current.children.set(char, new InvertedTrieNode());
      }
      current = current.children.get(char)!;
      current.productIds.add(productId);
    }
  }

  /**
   * Sub-1ms instantaneous exact barcode lookup
   */
  public findByBarcode(barcode: string): Product | null {
    const clean = barcode.trim();
    return this.barcodeMap.get(clean) || this.skuMap.get(clean.toUpperCase()) || null;
  }

  /**
   * Fast prefix search using Trie
   */
  public searchPrefix(prefix: string): Product[] {
    const clean = prefix.trim().toLowerCase();
    if (!clean) return this.productList.slice(0, 30);

    let current = this.trieRoot;
    for (const char of clean) {
      if (!current.children.has(char)) {
        // Fallback to substring match
        return this.productList
          .filter(
            (p) =>
              p.nameEnglish.toLowerCase().includes(clean) ||
              (p.nameTamil && p.nameTamil.toLowerCase().includes(clean)) ||
              (p.barcode && p.barcode.includes(clean))
          )
          .slice(0, 30);
      }
      current = current.children.get(char)!;
    }

    const matchedIds = current.productIds;
    return this.productList.filter((p) => matchedIds.has(p.id)).slice(0, 30);
  }

  public getProductCount(): number {
    return this.productList.length;
  }
}

export const fastCatalogCache = new BarcodeAndTrieCache();
