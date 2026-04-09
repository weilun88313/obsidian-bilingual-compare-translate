import { describe, expect, it } from "vitest";
import { extractAnthropicText } from "../src/translation/providers/extractAnthropicText";

describe("extractAnthropicText", () => {
  it("reads joined text parts from a native Anthropic Messages response", () => {
    const text = extractAnthropicText({
      content: [
        { type: "text", text: "第一段" },
        { type: "text", text: "第二段" },
      ],
    });

    expect(text).toBe("第一段\n\n第二段");
  });

  it("accepts a string content fallback used by some proxy providers", () => {
    const text = extractAnthropicText({
      content: "hello",
    });

    expect(text).toBe("hello");
  });
});
