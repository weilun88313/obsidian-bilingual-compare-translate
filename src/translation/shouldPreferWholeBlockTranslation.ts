import type { MarkdownBlock } from "../types";

const SUPPORTED_BLOCK_TYPES = new Set<MarkdownBlock["type"]>([
  "paragraph",
  "heading",
  "list-item",
  "blockquote",
]);

const INLINE_EMPHASIS_RE =
  /(?:\*\*[^*\n][\s\S]*?[^*\n]\*\*|__[^_\n][\s\S]*?[^_\n]__|\*[^*\s\n][\s\S]*?[^*\s\n]\*|_[^_\s\n][\s\S]*?[^_\s\n]_)/;

export function shouldPreferWholeBlockTranslation(block: MarkdownBlock): boolean {
  if (!block.shouldTranslate || !SUPPORTED_BLOCK_TYPES.has(block.type)) {
    return false;
  }

  return INLINE_EMPHASIS_RE.test(block.markdown);
}
