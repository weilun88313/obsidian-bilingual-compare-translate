import { describe, expect, it } from "vitest";
import { buildTranslatedDocument } from "../src/view/buildTranslatedDocument";
import type { MarkdownBlock } from "../src/types";

describe("buildTranslatedDocument", () => {
  it("reassembles translated blocks into a markdown document", () => {
    const blocks: MarkdownBlock[] = [
      {
        id: "1",
        type: "heading",
        markdown: "# Hello",
        sourceText: "# Hello",
        shouldTranslate: true,
        lineStart: 0,
        lineEnd: 0,
      },
      {
        id: "2",
        type: "paragraph",
        markdown: "Original paragraph",
        sourceText: "Original paragraph",
        shouldTranslate: true,
        lineStart: 2,
        lineEnd: 2,
      },
      {
        id: "3",
        type: "code",
        markdown: "```ts\nconst a = 1;\n```",
        sourceText: "```ts\nconst a = 1;\n```",
        shouldTranslate: false,
        lineStart: 4,
        lineEnd: 6,
      },
    ];

    const document = buildTranslatedDocument(blocks, {
      "1": "# 你好",
      "2": "翻译后的段落",
      "3": "```ts\nconst a = 1;\n```",
    });

    expect(document).toBe("# 你好\n\n翻译后的段落\n\n```ts\nconst a = 1;\n```");
  });
});
