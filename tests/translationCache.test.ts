import { describe, expect, it } from "vitest";
import { TranslationCache } from "../src/cache/TranslationCache";

describe("TranslationCache", () => {
  it("stores and retrieves entries with a stable key", () => {
    const cache = new TranslationCache({
      entries: {},
    });

    const key = cache.createKey({
      filePath: "notes/demo.md",
      apiProvider: "openai",
      model: "gpt-4o-mini",
      sourceLanguage: "English",
      targetLanguage: "Chinese",
      blockHash: "abc123",
    });

    cache.set(key, "你好");

    expect(cache.get(key)).toBe("你好");
    expect(cache.toJSON()).toEqual({
      entries: {
        [key]: "你好",
      },
    });
  });
});
