import { describe, expect, it } from "vitest";
import { parseProviderJson } from "../src/translation/providers/parseProviderJson";

describe("parseProviderJson", () => {
  it("parses valid JSON text", () => {
    expect(parseProviderJson('{"ok":true}', "Anthropic")).toEqual({ ok: true });
  });

  it("throws a readable error for non-JSON text", () => {
    expect(() => parseProviderJson("Hello, World!", "Anthropic")).toThrow(
      'Anthropic endpoint did not return JSON. Response started with: "Hello, World!"'
    );
  });
});
