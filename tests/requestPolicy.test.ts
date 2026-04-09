import { describe, expect, it } from "vitest";
import {
  getEffectiveTranslationConcurrency,
  getRetryDelayMs,
  isRateLimitStatus,
} from "../src/translation/requestPolicy";

describe("getEffectiveTranslationConcurrency", () => {
  it("forces MyMemory to run serially", () => {
    expect(getEffectiveTranslationConcurrency("mymemory", 4)).toBe(1);
  });

  it("keeps other providers at the requested concurrency", () => {
    expect(getEffectiveTranslationConcurrency("anthropic", 3)).toBe(3);
  });

  it("never returns less than one", () => {
    expect(getEffectiveTranslationConcurrency("openai", 0)).toBe(1);
  });
});

describe("getRetryDelayMs", () => {
  it("backs off between retry attempts", () => {
    expect(getRetryDelayMs(0)).toBe(1200);
    expect(getRetryDelayMs(1)).toBe(2400);
    expect(getRetryDelayMs(2)).toBe(4000);
  });
});

describe("isRateLimitStatus", () => {
  it("identifies HTTP 429 as rate limiting", () => {
    expect(isRateLimitStatus(429)).toBe(true);
    expect(isRateLimitStatus(500)).toBe(false);
  });
});
