import type { MarkdownBlock } from "../types";

export function buildTranslatedDocument(
  blocks: MarkdownBlock[],
  translations: Record<string, string>
): string {
  return blocks
    .map((block) => translations[block.id] ?? block.markdown)
    .join("\n\n");
}
