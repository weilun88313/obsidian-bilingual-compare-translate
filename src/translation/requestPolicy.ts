import type { ApiProvider } from "../types";

export function getEffectiveTranslationConcurrency(
  provider: ApiProvider,
  requested: number
): number {
  if (provider === "mymemory") {
    return 1;
  }

  return Math.max(1, requested);
}

export function getRetryDelayMs(attempt: number): number {
  return Math.min(4000, 1200 * 2 ** attempt);
}

export function isRateLimitStatus(status: number): boolean {
  return status === 429;
}
