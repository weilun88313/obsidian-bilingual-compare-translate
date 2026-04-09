import { requestUrl } from "obsidian";
import type { BilingualTranslateSettings } from "../../types";
import { resolveApiKey } from "../resolveApiKey";

export type SecretLookup = (name: string) => string | undefined | Promise<string | undefined>;

export async function translateWithOpenAI(
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
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: settings.temperature,
      messages: [
        {
          role: "system",
          content: `You are a precise translator. Translate from ${settings.sourceLanguage} to ${settings.targetLanguage}. Return only the translated text.`,
        },
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
      `OpenAI-compatible request failed with status ${response.status}${body ? `: ${body}` : "."}`
    );
  }

  const text = response.json?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenAI-compatible response did not include translated text.");
  }

  return text.trim();
}
