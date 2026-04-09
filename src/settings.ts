import { DEFAULT_PANE_WIDTH_RATIO } from "./view/paneSizing";
import type { ApiProvider, BilingualTranslateSettings } from "./types";

export const PROVIDER_DEFAULTS: Record<
  ApiProvider,
  Pick<BilingualTranslateSettings, "apiUrl" | "model">
> = {
  openai: {
    apiUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  gemini: {
    apiUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
  },
  anthropic: {
    apiUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-latest",
  },
  mymemory: {
    apiUrl: "https://api.mymemory.translated.net/get",
    model: "mymemory-public",
  },
};

export const DEFAULT_SETTINGS: BilingualTranslateSettings = {
  apiProvider: "openai",
  apiUrl: PROVIDER_DEFAULTS.openai.apiUrl,
  apiKeySecretName: "",
  model: PROVIDER_DEFAULTS.openai.model,
  temperature: 0.2,
  concurrency: 2,
  sourceLanguage: "auto",
  targetLanguage: "Chinese",
  anthropicVersion: "2023-06-01",
  anthropicAuthHeaderName: "x-api-key",
  maxTokens: 1024,
  mymemoryContactEmail: "",
  paneWidthRatio: DEFAULT_PANE_WIDTH_RATIO,
};

export function getProviderDefaults(provider: ApiProvider) {
  return PROVIDER_DEFAULTS[provider];
}
