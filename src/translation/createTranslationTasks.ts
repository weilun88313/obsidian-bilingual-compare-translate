import type { MarkdownBlock, TranslationTask } from "../types";

export interface CreateTranslationTasksInput {
  blocks: MarkdownBlock[];
  cacheLookup: (block: MarkdownBlock) => string | null | undefined;
}

export interface TranslationTaskPlan {
  resolved: Record<string, string>;
  pending: TranslationTask[];
}

export function createTranslationTasks({
  blocks,
  cacheLookup,
}: CreateTranslationTasksInput): TranslationTaskPlan {
  const resolved: Record<string, string> = {};
  const pending: TranslationTask[] = [];

  for (const block of blocks) {
    if (!block.shouldTranslate) {
      resolved[block.id] = block.markdown;
      continue;
    }

    const cached = cacheLookup(block);
    if (cached) {
      resolved[block.id] = cached;
      continue;
    }

    pending.push({
      block,
      cacheKey: block.hash ?? block.sourceText,
    });
  }

  return { resolved, pending };
}

