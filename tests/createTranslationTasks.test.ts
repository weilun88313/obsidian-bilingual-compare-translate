import { describe, expect, it } from "vitest";
import { createTranslationTasks } from "../src/translation/createTranslationTasks";
import type { MarkdownBlock } from "../src/types";

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
    type: "code",
    markdown: "```ts\nconst a = 1;\n```",
    sourceText: "```ts\nconst a = 1;\n```",
    shouldTranslate: false,
    lineStart: 2,
    lineEnd: 4,
  },
];

describe("createTranslationTasks", () => {
  it("reuses cache hits and queues only translatable misses", () => {
    const tasks = createTranslationTasks({
      blocks,
      cacheLookup: (block) => (block.id === "1" ? "你好" : null),
    });

    expect(tasks.resolved).toEqual({
      "1": "你好",
      "2": "```ts\nconst a = 1;\n```",
    });
    expect(tasks.pending).toHaveLength(0);
  });

  it("queues pending translations for missing cache entries", () => {
    const tasks = createTranslationTasks({
      blocks,
      cacheLookup: () => null,
    });

    expect(tasks.resolved).toEqual({
      "2": "```ts\nconst a = 1;\n```",
    });
    expect(tasks.pending.map((task) => task.block.id)).toEqual(["1"]);
  });
});
