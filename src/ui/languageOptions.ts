import type { ApiProvider } from "../types";

type LanguageField = "source" | "target";

export interface LanguageOption {
  value: string;
  label: string;
}

const MODEL_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "auto", label: "Auto" },
  { value: "English", label: "English" },
  { value: "Chinese", label: "Chinese" },
  { value: "Japanese", label: "Japanese" },
  { value: "Korean", label: "Korean" },
  { value: "French", label: "French" },
  { value: "German", label: "German" },
  { value: "Spanish", label: "Spanish" },
  { value: "Italian", label: "Italian" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Russian", label: "Russian" },
];

const MYMEMORY_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "en", label: "EN" },
  { value: "zh-CN", label: "ZH-CN" },
  { value: "zh-TW", label: "ZH-TW" },
  { value: "ja", label: "JA" },
  { value: "ko", label: "KO" },
  { value: "fr", label: "FR" },
  { value: "de", label: "DE" },
  { value: "es", label: "ES" },
  { value: "it", label: "IT" },
  { value: "pt", label: "PT" },
  { value: "ru", label: "RU" },
];

export function getLanguageOptions(
  provider: ApiProvider,
  field: LanguageField,
  currentValue: string
): LanguageOption[] {
  const baseOptions =
    provider === "mymemory"
      ? MYMEMORY_LANGUAGE_OPTIONS
      : field === "source"
        ? MODEL_LANGUAGE_OPTIONS
        : MODEL_LANGUAGE_OPTIONS.filter((option) => option.value !== "auto");

  if (!currentValue || baseOptions.some((option) => option.value === currentValue)) {
    return baseOptions;
  }

  return [{ value: currentValue, label: currentValue }, ...baseOptions];
}

export function formatLanguageStatus(sourceLanguage: string, targetLanguage: string): string {
  return `${sourceLanguage} -> ${targetLanguage}`;
}
