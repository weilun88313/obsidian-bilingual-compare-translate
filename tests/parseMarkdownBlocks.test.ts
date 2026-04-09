import { describe, expect, it } from "vitest";
import { parseMarkdownBlocks } from "../src/markdown/parseMarkdownBlocks";

describe("parseMarkdownBlocks", () => {
  it("keeps headings, paragraphs, lists, tables, and code blocks aligned as blocks", () => {
    const markdown = [
      "---",
      "title: Example",
      "---",
      "",
      "# Hello",
      "",
      "This is the first line",
      "that should stay in one paragraph.",
      "",
      "- One item",
      "- Two item",
      "",
      "| A | B |",
      "| - | - |",
      "| 1 | 2 |",
      "",
      "```ts",
      "const answer = 42;",
      "```",
      "",
      "> Quote line",
    ].join("\n");

    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks.map((block) => ({ type: block.type, translate: block.shouldTranslate }))).toEqual([
      { type: "frontmatter", translate: false },
      { type: "heading", translate: true },
      { type: "paragraph", translate: true },
      { type: "list-item", translate: true },
      { type: "list-item", translate: true },
      { type: "table", translate: false },
      { type: "code", translate: false },
      { type: "blockquote", translate: true },
    ]);

    expect(blocks[2].markdown).toContain("that should stay in one paragraph.");
    expect(blocks[6].markdown).toContain("const answer = 42;");
    expect(blocks[1].lineStart).toBe(4);
    expect(blocks[1].lineEnd).toBe(4);
    expect(blocks[2].lineStart).toBe(6);
    expect(blocks[2].lineEnd).toBe(7);
  });

  it("skips empty blocks while preserving source order", () => {
    const markdown = "\n\n# Title\n\nParagraph\n\n";
    const blocks = parseMarkdownBlocks(markdown);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].markdown).toBe("# Title");
    expect(blocks[1].markdown).toBe("Paragraph");
    expect(blocks[0].lineStart).toBe(2);
    expect(blocks[1].lineStart).toBe(4);
  });
});
