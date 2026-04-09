import type { BilingualTranslateSettings } from "../types";
import { translateBlock } from "./translateBlock";
import type { SecretLookup } from "./providers/openai";

export interface RenderedTextSegment {
  node: Text;
  coreText: string;
  leadingWhitespace: string;
  trailingWhitespace: string;
}

const SKIPPED_TRANSLATION_TAGS = new Set([
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "BUTTON",
  "KBD",
  "SAMP",
  "SVG",
  "CANVAS",
]);

const SKIPPED_TRANSLATION_SELECTORS = [
  ".math",
  ".MathJax",
  ".callout-icon",
  ".contains-task-list .task-list-item-checkbox",
];

const URL_LIKE_RE = /^(?:https?:\/\/|www\.|mailto:|obsidian:\/\/)\S+$/i;
const EMAIL_LIKE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitOuterWhitespace(text: string): {
  leadingWhitespace: string;
  coreText: string;
  trailingWhitespace: string;
} {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/);

  return {
    leadingWhitespace: match?.[1] ?? "",
    coreText: match?.[2] ?? text,
    trailingWhitespace: match?.[3] ?? "",
  };
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text);
}

export function shouldTranslateRenderedText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  if (!hasLetters(trimmed)) {
    return false;
  }

  if (URL_LIKE_RE.test(trimmed) || EMAIL_LIKE_RE.test(trimmed)) {
    return false;
  }

  return true;
}

function isSkippedTranslationContext(element: Element | null): boolean {
  let current = element;

  while (current) {
    if (SKIPPED_TRANSLATION_TAGS.has(current.tagName)) {
      return true;
    }

    if (current.matches?.("mjx-container")) {
      return true;
    }

    for (const selector of SKIPPED_TRANSLATION_SELECTORS) {
      if (current.matches?.(selector)) {
        return true;
      }
    }

    current = current.parentElement;
  }

  return false;
}

export function collectTranslatableTextNodes(root: HTMLElement): RenderedTextSegment[] {
  const segments: RenderedTextSegment[] = [];
  const nodeFilter = root.ownerDocument.defaultView?.NodeFilter;

  if (!nodeFilter) {
    return segments;
  }

  const walker = root.ownerDocument.createTreeWalker(root, nodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const textNode = currentNode as Text;
    const parentElement = textNode.parentElement;
    const originalText = textNode.nodeValue ?? "";
    const { leadingWhitespace, coreText, trailingWhitespace } = splitOuterWhitespace(originalText);

    if (
      parentElement &&
      !isSkippedTranslationContext(parentElement) &&
      shouldTranslateRenderedText(coreText)
    ) {
      segments.push({
        node: textNode,
        coreText,
        leadingWhitespace,
        trailingWhitespace,
      });
    }

    currentNode = walker.nextNode();
  }

  return segments;
}

function getUtf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

function splitOversizedToken(token: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const character of token) {
    if (current && getUtf8Length(current + character) > maxBytes) {
      chunks.push(current);
      current = character;
      continue;
    }

    current += character;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function splitTextForProvider(
  text: string,
  settings: Pick<BilingualTranslateSettings, "apiProvider">
): string[] {
  const maxBytes = settings.apiProvider === "mymemory" ? 450 : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(maxBytes) || getUtf8Length(text) <= maxBytes) {
    return [text];
  }

  const tokens = text.match(/\S+\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";

  for (const token of tokens) {
    if (getUtf8Length(token) > maxBytes) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      chunks.push(...splitOversizedToken(token, maxBytes));
      continue;
    }

    if (!current || getUtf8Length(current + token) <= maxBytes) {
      current += token;
      continue;
    }

    chunks.push(current);
    current = token;
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export async function translateRenderedText(
  text: string,
  settings: BilingualTranslateSettings,
  getSecret: SecretLookup
): Promise<string> {
  if (!shouldTranslateRenderedText(text)) {
    return text;
  }

  const chunks = splitTextForProvider(text, settings);
  if (chunks.length === 1) {
    return translateBlock(chunks[0], settings, getSecret);
  }

  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    translatedChunks.push(await translateBlock(chunk, settings, getSecret));
  }

  return translatedChunks.join("");
}
