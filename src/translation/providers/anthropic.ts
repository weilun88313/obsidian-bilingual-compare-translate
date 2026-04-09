import { requestUrl } from "obsidian";
import type { BilingualTranslateSettings } from "../../types";
import { resolveApiKey } from "../resolveApiKey";
import { extractAnthropicText } from "./extractAnthropicText";
import { parseProviderJson } from "./parseProviderJson";
import type { SecretLookup } from "./openai";

export async function translateWithAnthropic(
  block: string,
  settings: BilingualTranslateSettings,
  getSecret: SecretLookup
): Promise<string> {
  const apiKey = await resolveApiKey(settings.apiKeySecretName, getSecret);
  if (!apiKey) {
    throw new Error("API key is missing. Enter either a raw API key or a SecretStorage name.");
  }

  const response = await requestUrl({
    url: settings.apiUrl,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": settings.anthropicVersion,
      [settings.anthropicAuthHeaderName]: apiKey,
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      system:
        `You are a precise translator. Translate from ${settings.sourceLanguage} to ` +
        `${settings.targetLanguage}. Return only the translated text.`,
      messages: [
        {
          role: "user",
          content: block,
        },
      ],
    }),
  });

  if (response.status !== 200) {
    const body = typeof response.text === "string" ? response.text.slice(0, 400) : "";
    throw new Error(
      `Anthropic request failed with status ${response.status}${body ? `: ${body}` : "."}`
    );
  }

  const payload = parseProviderJson(response.text, "Anthropic");
  return extractAnthropicText(payload as { content?: string | { type?: string; text?: string }[] }).trim();
}
