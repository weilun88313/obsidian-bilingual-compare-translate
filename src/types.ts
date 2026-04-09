export type ApiProvider = "openai" | "gemini" | "anthropic" | "mymemory";

export type MarkdownBlockType =
  | "frontmatter"
  | "heading"
  | "paragraph"
  | "list-item"
  | "blockquote"
  | "table"
  | "code";

export interface MarkdownBlock {
  id: string;
  type: MarkdownBlockType;
  markdown: string;
  sourceText: string;
  shouldTranslate: boolean;
  lineStart: number;
  lineEnd: number;
  hash?: string;
}

export interface ProviderSettings {
  apiProvider: ApiProvider;
  apiUrl: string;
  apiKeySecretName: string;
  model: string;
  temperature: number;
  sourceLanguage: string;
  targetLanguage: string;
  anthropicVersion: string;
  anthropicAuthHeaderName: string;
  maxTokens: number;
  mymemoryContactEmail: string;
}

export interface BilingualTranslateSettings extends ProviderSettings {
  concurrency: number;
  paneWidthRatio: number;
}

export interface TranslationTask {
  block: MarkdownBlock;
  cacheKey: string;
}

export interface TranslationCacheData {
  entries: Record<string, string>;
}
