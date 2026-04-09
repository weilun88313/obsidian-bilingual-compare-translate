import { describe, expect, it } from "vitest";
import {
  extractMyMemoryText,
  normalizeMyMemoryLanguage,
} from "../src/translation/providers/mymemoryHelpers";

describe("normalizeMyMemoryLanguage", () => {
  it("maps common language names to MyMemory-compatible codes", () => {
    expect(normalizeMyMemoryLanguage("English")).toBe("en");
    expect(normalizeMyMemoryLanguage("Chinese")).toBe("zh-CN");
    expect(normalizeMyMemoryLanguage("Japanese")).toBe("ja");
  });

  it("passes through language codes unchanged", () => {
    expect(normalizeMyMemoryLanguage("fr")).toBe("fr");
    expect(normalizeMyMemoryLanguage("zh-TW")).toBe("zh-TW");
  });
});

describe("extractMyMemoryText", () => {
  it("reads translatedText from the documented response shape", () => {
    expect(
      extractMyMemoryText({
        responseData: {
          translatedText: "你好",
        },
      })
    ).toBe("你好");
  });
});
