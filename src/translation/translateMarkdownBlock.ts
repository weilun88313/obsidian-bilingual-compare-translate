import type { MarkdownBlock } from "../types";

type TranslateText = (text: string) => Promise<string>;

const HEADING_RE = /^(\s*#{1,6})(\s+)(.*)$/;
const BLOCKQUOTE_RE = /^(\s*>)(\s?)(.*)$/;
const LIST_RE = /^(\s*(?:[-*+]|\d+[.)]))(\s+)(.*)$/;
const INDENTED_RE = /^(\s+)(.*)$/;

export async function translateMarkdownBlock(
  block: MarkdownBlock,
  translateText: TranslateText
): Promise<string> {
  switch (block.type) {
    case "heading":
      return translateStructuredLine(block.markdown, HEADING_RE, translateText);
    case "blockquote":
      return translateLineSet(block.markdown, BLOCKQUOTE_RE, translateText);
    case "list-item":
      return translateListBlock(block.markdown, translateText);
    case "paragraph":
      return translateText(block.markdown);
    default:
      return block.markdown;
  }
}

async function translateLineSet(
  markdown: string,
  pattern: RegExp,
  translateText: TranslateText
): Promise<string> {
  const lines = markdown.split("\n");
  const translated = await Promise.all(
    lines.map(async (line) => {
      if (!line.trim()) {
        return line;
      }

      return translateStructuredLine(line, pattern, translateText);
    })
  );

  return translated.join("\n");
}

async function translateListBlock(markdown: string, translateText: TranslateText): Promise<string> {
  const lines = markdown.split("\n");
  const translated = await Promise.all(
    lines.map(async (line, index) => {
      if (!line.trim()) {
        return line;
      }

      if (index === 0) {
        return translateStructuredLine(line, LIST_RE, translateText);
      }

      const indentedMatch = line.match(INDENTED_RE);
      if (!indentedMatch) {
        return translateText(line);
      }

      const [, indent, text] = indentedMatch;
      const translatedText = text.trim() ? await translateText(text) : text;
      return `${indent}${translatedText}`;
    })
  );

  return translated.join("\n");
}

async function translateStructuredLine(
  line: string,
  pattern: RegExp,
  translateText: TranslateText
): Promise<string> {
  const match = line.match(pattern);
  if (!match) {
    return translateText(line);
  }

  const [, prefix, spacing, text] = match;
  const translatedText = text.trim() ? await translateText(text) : text;
  return `${prefix}${spacing}${translatedText}`;
}
