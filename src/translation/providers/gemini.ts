import { requestUrl } from "obsidian";
import type { BilingualTranslateSettings } from "../../types";
import type { SecretLookup } from "./openai";
import { resolveApiKey } from "../resolveApiKey";

export async function translateWithGemini(
  block: string,
  settings: BilingualTranslateSettings,
  getSecret: SecretLookup
): Promise<string> {
  const apiKey = await resolveApiKey(settings.apiKeySecretName, getSecret);
  if (!apiKey) {
    throw new Error("API key is missing. Enter either a raw API key or a SecretStorage name.");
  }

  const url = `${settings.apiUrl}/models/${settings.model}:generateContent`;
  const response = await requestUrl({
    url: `${url}?key=${apiKey}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `You are a precise translator. Translate from ${settings.sourceLanguage} to ${settings.targetLanguage}. Return only the translated text.`,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: block }],
        },
      ],
      generationConfig: {
        temperature: settings.temperature,
      },
    }),
  });

  if (response.status !== 200) {
    const body = typeof response.text === "string" ? response.text.slice(0, 400) : "";
    throw new Error(
      `Gemini request failed with status ${response.status}${body ? `: ${body}` : "."}`
    );
  }

  const text = response.json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new Error("Gemini response did not include translated text.");
  }

  return text.trim();
}
