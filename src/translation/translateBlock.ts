import type { BilingualTranslateSettings } from "../types";
import { translateWithAnthropic } from "./providers/anthropic";
import { translateWithGemini } from "./providers/gemini";
import { translateWithMyMemory } from "./providers/mymemory";
import { translateWithOpenAI } from "./providers/openai";
import type { SecretLookup } from "./providers/openai";

export async function translateBlock(
  block: string,
  settings: BilingualTranslateSettings,
  getSecret: SecretLookup
): Promise<string> {
  if (settings.apiProvider === "mymemory") {
    return translateWithMyMemory(block, settings);
  }

  if (settings.apiProvider === "anthropic") {
    return translateWithAnthropic(block, settings, getSecret);
  }

  if (settings.apiProvider === "gemini") {
    return translateWithGemini(block, settings, getSecret);
  }

  return translateWithOpenAI(block, settings, getSecret);
}
