import { describe, expect, it } from "vitest";
import type { MarkdownBlock } from "../src/types";
import { findBlockForLine, getSyncedScrollTop } from "../src/view/translationSync";

const block = (id: string, lineStart: number, lineEnd: number): MarkdownBlock => ({
  id,
  type: "paragraph",
  markdown: id,
  sourceText: id,
  shouldTranslate: true,
  lineStart,
  lineEnd,
});

describe("findBlockForLine", () => {
  const blocks = [block("1", 0, 1), block("2", 3, 5), block("3", 7, 7)];

  it("returns the block containing the line", () => {
    expect(findBlockForLine(blocks, 4)?.id).toBe("2");
  });

  it("returns the closest previous block for blank lines between blocks", () => {
    expect(findBlockForLine(blocks, 2)?.id).toBe("1");
    expect(findBlockForLine(blocks, 6)?.id).toBe("2");
  });

  it("returns null when there are no blocks", () => {
    expect(findBlockForLine([], 0)).toBeNull();
  });
});

describe("getSyncedScrollTop", () => {
  it("maps source scroll ratio into the target pane", () => {
    expect(getSyncedScrollTop(50, 200, 500)).toBeCloseTo(125);
  });

  it("returns zero when the source cannot scroll", () => {
    expect(getSyncedScrollTop(10, 0, 500)).toBe(0);
  });
});
