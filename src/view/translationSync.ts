import type { MarkdownBlock } from "../types";

export function findBlockForLine(
  blocks: MarkdownBlock[],
  line: number
): MarkdownBlock | null {
  if (!blocks.length) {
    return null;
  }

  let previous: MarkdownBlock | null = null;
  for (const block of blocks) {
    if (line < block.lineStart) {
      return previous ?? block;
    }

    if (line <= block.lineEnd) {
      return block;
    }

    previous = block;
  }

  return previous;
}

export function getSyncedScrollTop(
  sourceTop: number,
  sourceScrollableHeight: number,
  targetScrollableHeight: number
): number {
  if (sourceScrollableHeight <= 0 || targetScrollableHeight <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(targetScrollableHeight, (sourceTop / sourceScrollableHeight) * targetScrollableHeight));
}
