import { describe, expect, it } from "vitest";
import { createCompareRows } from "../src/view/createCompareRows";
import type { MarkdownBlock } from "../src/types";

describe("createCompareRows", () => {
  it("pairs source blocks with translated markdown in source order", () => {
    const blocks: MarkdownBlock[] = [
      {
        id: "a",
        type: "heading",
        markdown: "# Hello",
        sourceText: "# Hello",
        shouldTranslate: true,
        lineStart: 0,
        lineEnd: 0,
      },
      {
        id: "b",
        type: "code",
        markdown: "```ts\nconst a = 1;\n```",
        sourceText: "```ts\nconst a = 1;\n```",
        shouldTranslate: false,
        lineStart: 2,
        lineEnd: 4,
      },
    ];

    const rows = createCompareRows(blocks, {
      a: "# 你好",
      b: "```ts\nconst a = 1;\n```",
    });

    expect(rows).toEqual([
      {
        id: "a",
        type: "heading",
        sourceMarkdown: "# Hello",
        translatedMarkdown: "# 你好",
        shouldTranslate: true,
      },
      {
        id: "b",
        type: "code",
        sourceMarkdown: "```ts\nconst a = 1;\n```",
        translatedMarkdown: "```ts\nconst a = 1;\n```",
        shouldTranslate: false,
      },
    ]);
  });
});
