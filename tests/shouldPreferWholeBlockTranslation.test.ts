import { describe, expect, it } from "vitest";
import type { MarkdownBlock } from "../src/types";
import { shouldPreferWholeBlockTranslation } from "../src/translation/shouldPreferWholeBlockTranslation";

function block(type: MarkdownBlock["type"], markdown: string): MarkdownBlock {
  return {
    id: "1",
    type,
    markdown,
    sourceText: markdown,
    shouldTranslate: true,
    lineStart: 0,
    lineEnd: markdown.split("\n").length - 1,
  };
}

describe("shouldPreferWholeBlockTranslation", () => {
  it("prefers whole-block translation for paragraphs with bold or italic inline markdown", () => {
    expect(
      shouldPreferWholeBlockTranslation(
        block(
          "paragraph",
          "By combining a global event database with **Predictive Social Signals**, we help teams who *might* go."
        )
      )
    ).toBe(true);
  });

  it("keeps plain paragraphs on the rendered-text path", () => {
    expect(
      shouldPreferWholeBlockTranslation(
        block("paragraph", "Lensmor is the Event Intelligence Radar for modern Growth and Sales teams.")
      )
    ).toBe(false);
  });

  it("does not opt tables into whole-block translation", () => {
    expect(
      shouldPreferWholeBlockTranslation(
        block("table", "| Name | Value |\n| --- | --- |\n| A | **Bold** |")
      )
    ).toBe(false);
  });
});
