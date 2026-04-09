import { requestUrl } from "obsidian";
import type { BilingualTranslateSettings } from "../../types";
import { parseProviderJson } from "./parseProviderJson";
import {
  extractMyMemoryText,
  normalizeMyMemoryLanguage,
} from "./mymemoryHelpers";
import { getRetryDelayMs, isRateLimitStatus } from "../requestPolicy";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function translateWithMyMemory(
  block: string,
  settings: BilingualTranslateSettings
): Promise<string> {
  const source = normalizeMyMemoryLanguage(settings.sourceLanguage);
  const target = normalizeMyMemoryLanguage(settings.targetLanguage);

  if (!source || source === "auto") {
    throw new Error("MyMemory requires an explicit source language code, for example en.");
  }

  if (!target) {
    throw new Error("MyMemory requires an explicit target language code, for example zh-CN.");
  }

  if (new TextEncoder().encode(block).length > 500) {
    throw new Error("MyMemory only accepts up to 500 bytes per request.");
  }

  const url = new URL(settings.apiUrl);
  url.searchParams.set("q", block);
  url.searchParams.set("langpair", `${source}|${target}`);
  url.searchParams.set("mt", "1");

  if (settings.mymemoryContactEmail.trim()) {
    url.searchParams.set("de", settings.mymemoryContactEmail.trim());
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await requestUrl({
      url: url.toString(),
      method: "GET",
    });

    if (response.status === 200) {
      const payload = parseProviderJson(response.text, "MyMemory");
      return extractMyMemoryText(payload as { responseData?: { translatedText?: string } }).trim();
    }

    if (isRateLimitStatus(response.status) && attempt < 2) {
      await delay(getRetryDelayMs(attempt));
      continue;
    }

    const body = typeof response.text === "string" ? response.text.slice(0, 400) : "";
    if (isRateLimitStatus(response.status)) {
      throw new Error(
        "MyMemory rate limited the translation request (429). Wait a moment and try again, or reduce refresh frequency."
      );
    }

    throw new Error(
      `MyMemory request failed with status ${response.status}${body ? `: ${body}` : "."}`
    );
  }

  throw new Error("MyMemory rate limited the translation request repeatedly. Please try again shortly.");
}
