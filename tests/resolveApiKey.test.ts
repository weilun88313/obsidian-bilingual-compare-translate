import { describe, expect, it, vi } from "vitest";
import { resolveApiKey } from "../src/translation/resolveApiKey";

describe("resolveApiKey", () => {
  it("returns the stored secret when a SecretStorage entry exists", async () => {
    const getSecret = vi.fn(async (name: string) =>
      name === "my-secret-name" ? "secret-value" : undefined
    );

    await expect(resolveApiKey("my-secret-name", getSecret)).resolves.toBe("secret-value");
  });

  it("falls back to the raw field value when no SecretStorage entry exists", async () => {
    const getSecret = vi.fn(async () => undefined);

    await expect(resolveApiKey("sk-third-party-raw-key", getSecret)).resolves.toBe(
      "sk-third-party-raw-key"
    );
  });

  it("returns undefined for an empty field", async () => {
    const getSecret = vi.fn(async () => undefined);

    await expect(resolveApiKey("   ", getSecret)).resolves.toBeUndefined();
  });
});
