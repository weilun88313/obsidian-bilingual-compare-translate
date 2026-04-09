import type { SecretLookup } from "./providers/openai";

export async function resolveApiKey(
  secretNameOrRawKey: string,
  getSecret: SecretLookup
): Promise<string | undefined> {
  const value = secretNameOrRawKey.trim();
  if (!value) {
    return undefined;
  }

  const storedSecret = await getSecret(value);
  return storedSecret ?? value;
}
