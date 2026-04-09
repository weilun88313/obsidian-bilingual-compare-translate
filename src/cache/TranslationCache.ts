import type { TranslationCacheData } from "../types";
import { hashText } from "../utils/hash";

export interface TranslationCacheKeyParts {
  filePath: string;
  apiProvider: string;
  model: string;
  sourceLanguage: string;
  targetLanguage: string;
  blockHash: string;
}

export interface TranslationCacheEntry {
  value: string;
  updatedAt: string;
}

export class TranslationCache {
  private readonly entries = new Map<string, string>();

  constructor(data?: TranslationCacheData) {
    if (data?.entries) {
      for (const [key, value] of Object.entries(data.entries)) {
        this.entries.set(key, value);
      }
    }
  }

  static fromJSON(data?: TranslationCacheData): TranslationCache {
    return new TranslationCache(data);
  }

  toJSON(): TranslationCacheData {
    return {
      entries: Object.fromEntries(this.entries.entries()),
    };
  }

  get(key: string): string | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: string): void {
    this.entries.set(key, value);
  }

  createKey(parts: TranslationCacheKeyParts): string {
    return [
      parts.filePath,
      parts.apiProvider,
      parts.model,
      parts.sourceLanguage,
      parts.targetLanguage,
      parts.blockHash,
    ].join("::");
  }

  createBlockHash(blockText: string): string {
    return hashText(blockText);
  }
}
