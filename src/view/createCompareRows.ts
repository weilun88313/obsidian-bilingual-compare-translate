import type { MarkdownBlock } from "../types";

export interface CompareRow {
  id: string;
  type: MarkdownBlock["type"];
  sourceMarkdown: string;
  translatedMarkdown: string;
  shouldTranslate: boolean;
}

export function createCompareRows(
  blocks: MarkdownBlock[],
  translations: Record<string, string>
): CompareRow[] {
  return blocks.map((block) => ({
    id: block.id,
    type: block.type,
    sourceMarkdown: block.markdown,
    translatedMarkdown: translations[block.id] ?? block.markdown,
    shouldTranslate: block.shouldTranslate,
  }));
}

