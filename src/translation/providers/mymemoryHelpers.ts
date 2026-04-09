const LANGUAGE_MAP: Record<string, string> = {
  english: "en",
  chinese: "zh-CN",
  "simplified chinese": "zh-CN",
  "traditional chinese": "zh-TW",
  japanese: "ja",
  korean: "ko",
  french: "fr",
  german: "de",
  spanish: "es",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
};

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
  };
}

export function normalizeMyMemoryLanguage(input: string): string {
  const normalized = input.trim();
  if (!normalized) {
    return "";
  }

  const mapped = LANGUAGE_MAP[normalized.toLowerCase()];
  return mapped ?? normalized;
}

export function extractMyMemoryText(payload: MyMemoryResponse): string {
  const text = payload.responseData?.translatedText;
  if (typeof text === "string" && text.trim()) {
    return text;
  }

  throw new Error("MyMemory response did not include translated text.");
}
