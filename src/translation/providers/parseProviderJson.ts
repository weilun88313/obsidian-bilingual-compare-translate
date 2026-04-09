export function parseProviderJson(rawText: string, providerName: string): unknown {
  try {
    return JSON.parse(rawText);
  } catch {
    const preview = rawText.trim().slice(0, 200) || "<empty response>";
    throw new Error(
      `${providerName} endpoint did not return JSON. Response started with: "${preview}"`
    );
  }
}
