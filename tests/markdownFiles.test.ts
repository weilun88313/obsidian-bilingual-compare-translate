import { describe, expect, it } from "vitest";
import { isMarkdownFile } from "../src/files/markdownFiles";

describe("isMarkdownFile", () => {
  it("accepts markdown files", () => {
    expect(
      isMarkdownFile({
        extension: "md",
      })
    ).toBe(true);
  });

  it("rejects non-markdown files and null values", () => {
    expect(
      isMarkdownFile({
        extension: "png",
      })
    ).toBe(false);
    expect(isMarkdownFile(null)).toBe(false);
  });
});
