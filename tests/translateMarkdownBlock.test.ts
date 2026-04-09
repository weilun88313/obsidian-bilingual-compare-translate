import { describe, expect, it } from "vitest";
import type { MarkdownBlock } from "../src/types";
import { translateMarkdownBlock } from "../src/translation/translateMarkdownBlock";

const fakeTranslate = async (text: string): Promise<string> => {
  const map: Record<string, string> = {
    "What Can Be Exported": "可以导出的内容",
    "Open an unlocked event.": "打开一个已解锁的活动。",
    "Quoted text": "引用内容",
    "Original paragraph": "翻译后的段落",
  };

  return map[text] ?? `T:${text}`;
};

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

describe("translateMarkdownBlock", () => {
  it("preserves heading markers", async () => {
    await expect(
      translateMarkdownBlock(block("heading", "# What Can Be Exported"), fakeTranslate)
    ).resolves.toBe("# 可以导出的内容");
  });

  it("preserves list markers", async () => {
    await expect(
      translateMarkdownBlock(block("list-item", "1. Open an unlocked event."), fakeTranslate)
    ).resolves.toBe("1. 打开一个已解锁的活动。");
  });

  it("preserves blockquote markers", async () => {
    await expect(
      translateMarkdownBlock(block("blockquote", "> Quoted text"), fakeTranslate)
    ).resolves.toBe("> 引用内容");
  });

  it("passes paragraphs through as plain text", async () => {
    await expect(
      translateMarkdownBlock(block("paragraph", "Original paragraph"), fakeTranslate)
    ).resolves.toBe("翻译后的段落");
  });
});
