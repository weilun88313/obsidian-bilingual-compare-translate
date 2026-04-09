import { hashText } from "../utils/hash";
import type { MarkdownBlock, MarkdownBlockType } from "../types";

const LIST_ITEM_RE = /^(?:[-*+]|(?:\d+\.))\s+/;
const HEADING_RE = /^#{1,6}\s+/;
const BLOCKQUOTE_RE = /^>\s?/;
const TABLE_SEPARATOR_RE = /^\s*\|?(?:\s*:?-{1,}:?\s*\|)+\s*:?-{1,}:?\s*\|?\s*$/;
const FENCE_RE = /^(```|~~~)/;

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  let blockCounter = 0;

  const pushBlock = (
    type: MarkdownBlockType,
    blockLines: string[],
    shouldTranslate: boolean,
    lineStart: number,
    lineEnd: number
  ) => {
    const text = blockLines.join("\n");
    if (!text.trim()) {
      return;
    }

    blocks.push({
      id: String(++blockCounter),
      type,
      markdown: text,
      sourceText: text,
      shouldTranslate,
      lineStart,
      lineEnd,
      hash: hashText(text),
    });
  };

  const consumeParagraph = () => {
    const lineStart = index;
    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        break;
      }
      if (isBlockStart(line, index, lines)) {
        break;
      }
      paragraphLines.push(line);
      index++;
    }
    pushBlock("paragraph", paragraphLines, true, lineStart, index - 1);
  };

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index++;
      continue;
    }

    if (index === 0 && line.trim() === "---") {
      const lineStart = index;
      const frontmatterLines = [line];
      index++;
      while (index < lines.length) {
        const current = lines[index];
        frontmatterLines.push(current);
        index++;
        if (current.trim() === "---") {
          break;
        }
      }
      pushBlock("frontmatter", frontmatterLines, false, lineStart, index - 1);
      continue;
    }

    if (FENCE_RE.test(line.trim())) {
      const lineStart = index;
      const fence = line.trim().slice(0, 3);
      const codeLines = [line];
      index++;
      while (index < lines.length) {
        const current = lines[index];
        codeLines.push(current);
        index++;
        if (current.trim().startsWith(fence)) {
          break;
        }
      }
      pushBlock("code", codeLines, false, lineStart, index - 1);
      continue;
    }

    if (isTableStart(index, lines)) {
      const lineStart = index;
      const tableLines = [line];
      index++;
      while (index < lines.length && lines[index].trim()) {
        const current = lines[index];
        if (!current.includes("|")) {
          break;
        }
        tableLines.push(current);
        index++;
      }
      pushBlock("table", tableLines, false, lineStart, index - 1);
      continue;
    }

    if (HEADING_RE.test(line)) {
      pushBlock("heading", [line], true, index, index);
      index++;
      continue;
    }

    if (BLOCKQUOTE_RE.test(line)) {
      const lineStart = index;
      const quoteLines = [line];
      index++;
      while (index < lines.length && BLOCKQUOTE_RE.test(lines[index])) {
        quoteLines.push(lines[index]);
        index++;
      }
      pushBlock("blockquote", quoteLines, true, lineStart, index - 1);
      continue;
    }

    if (LIST_ITEM_RE.test(line)) {
      const lineStart = index;
      const listLines = [line];
      index++;
      while (index < lines.length && lines[index].trim().startsWith("  ")) {
        listLines.push(lines[index]);
        index++;
      }
      pushBlock("list-item", listLines, true, lineStart, index - 1);
      continue;
    }

    consumeParagraph();
  }

  return blocks;
}

function isTableStart(index: number, lines: string[]): boolean {
  const current = lines[index];
  const next = lines[index + 1];
  return Boolean(
    current?.includes("|") &&
      next &&
      TABLE_SEPARATOR_RE.test(next)
  );
}

function isBlockStart(line: string, index: number, lines: string[]): boolean {
  return (
    HEADING_RE.test(line) ||
    LIST_ITEM_RE.test(line) ||
    BLOCKQUOTE_RE.test(line) ||
    (index === 0 && line.trim() === "---") ||
    FENCE_RE.test(line.trim()) ||
    isTableStart(index, lines)
  );
}
