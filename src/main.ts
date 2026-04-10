import {
  Component,
  MarkdownRenderer,
  MarkdownView,
  Notice,
  Plugin,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";
import { TranslationCache } from "./cache/TranslationCache";
import { getMarkdownFileFromInfo, isMarkdownFile } from "./files/markdownFiles";
import { DEFAULT_SETTINGS } from "./settings";
import { getEffectiveTranslationConcurrency } from "./translation/requestPolicy";
import type {
  BilingualTranslateSettings,
  MarkdownBlock,
  TranslationCacheData,
} from "./types";
import { createTranslationTasks } from "./translation/createTranslationTasks";
import {
  collectTranslatableTextNodes,
  translateRenderedText,
  type RenderedTextSegment,
} from "./translation/renderedText";
import { shouldPreferWholeBlockTranslation } from "./translation/shouldPreferWholeBlockTranslation";
import { translateBlock } from "./translation/translateBlock";
import { translateMarkdownBlock } from "./translation/translateMarkdownBlock";
import { hashText } from "./utils/hash";
import { BilingualTranslateSettingTab } from "./ui/SettingsTab";
import { InlineBilingualPane } from "./view/InlineBilingualPane";

interface PersistedPluginData {
  settings?: Partial<BilingualTranslateSettings>;
  cache?: TranslationCacheData;
}

export default class BilingualCompareTranslatePlugin extends Plugin {
  settings: BilingualTranslateSettings = DEFAULT_SETTINGS;
  cache = new TranslationCache();
  private inlinePanes = new Map<WorkspaceLeaf, InlineBilingualPane>();

  async onload(): Promise<void> {
    await this.loadPluginState();

    this.addRibbonIcon(
      "languages",
      "Toggle live translation pane for current note",
      () => {
        void this.toggleInlinePaneForActiveView();
      }
    );

    this.addCommand({
      id: "toggle-bilingual-compare-view",
      name: "Toggle live translation pane for current file",
      callback: () => {
        void this.toggleInlinePaneForActiveView();
      },
    });

    this.addCommand({
      id: "close-bilingual-compare-view",
      name: "Close live translation pane",
      callback: () => {
        const view = this.getActiveMarkdownView();
        if (view) {
          void this.closeInlinePane(view.leaf);
        }
      },
    });

    this.addCommand({
      id: "refresh-bilingual-compare-view",
      name: "Refresh live translation pane",
      callback: () => {
        void this.refreshInlinePanes();
      },
    });

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!isMarkdownFile(file)) {
          return;
        }

        menu.addItem((item) =>
          item
            .setTitle("Open live translation pane")
            .setIcon("languages")
            .onClick(() => {
              void this.openInlinePaneForFile(file);
            })
        );
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, _editor, info) => {
        const file = getMarkdownFileFromInfo(info);
        if (!file) {
          return;
        }

        menu.addItem((item) =>
          item
            .setTitle("Open live translation pane")
            .setIcon("languages")
            .onClick(() => {
              void this.openInlinePaneForActiveView();
            })
        );
      })
    );

    this.addSettingTab(new BilingualTranslateSettingTab(this.app, this));
  }

  onunload(): void {
    const panes = Array.from(this.inlinePanes.values());
    panes.forEach((pane) => pane.detach());
    this.inlinePanes.clear();
  }

  async loadPluginState(): Promise<void> {
    const data = (await this.loadData()) as PersistedPluginData | null;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...data?.settings,
    };
    this.cache = TranslationCache.fromJSON(data?.cache);
  }

  async saveSettings(): Promise<void> {
    await this.persistPluginState();
  }

  async saveCache(): Promise<void> {
    await this.persistPluginState();
  }

  getActiveMarkdownFile(): TFile | null {
    return this.getActiveMarkdownView()?.file ?? null;
  }

  getActiveMarkdownView(): MarkdownView | null {
    return this.app.workspace.getActiveViewOfType(MarkdownView);
  }

  async toggleInlinePaneForActiveView(): Promise<void> {
    const view = this.getActiveMarkdownView();
    if (!view?.file) {
      new Notice("Open a Markdown note before toggling the live translation pane.");
      return;
    }

    if (this.inlinePanes.has(view.leaf)) {
      this.closeInlinePane(view.leaf);
      return;
    }

    await this.ensureInlinePane(view);
  }

  async openInlinePaneForActiveView(): Promise<void> {
    const view = this.getActiveMarkdownView();
    if (!view?.file) {
      new Notice("Open a Markdown note before launching the live translation pane.");
      return;
    }

    await this.ensureInlinePane(view);
  }

  async openInlinePaneForFile(file: TFile): Promise<void> {
    const leaf =
      this.getActiveMarkdownView()?.leaf ??
      this.app.workspace.getMostRecentLeaf() ??
      this.app.workspace.getLeaf(false);
    if (!leaf) {
      new Notice("Could not find a leaf to open the selected file.");
      return;
    }

    await leaf.openFile(file);
    const view = leaf.view instanceof MarkdownView ? leaf.view : this.getActiveMarkdownView();
    if (!view) {
      new Notice("Could not attach the live translation pane to the selected file.");
      return;
    }

    await this.ensureInlinePane(view);
  }

  closeInlinePane(leaf: WorkspaceLeaf): void {
    const pane = this.inlinePanes.get(leaf);
    if (!pane) {
      return;
    }

    this.inlinePanes.delete(leaf);
    pane.detach();
  }

  getLiveMarkdownForFile(filePath: string): string | null {
    for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
      if (leaf.view instanceof MarkdownView && leaf.view.file?.path === filePath) {
        return leaf.view.editor?.getValue() ?? null;
      }
    }

    return null;
  }

  async refreshInlinePanes(): Promise<void> {
    await Promise.all(Array.from(this.inlinePanes.values()).map((pane) => pane.refresh()));
  }

  async ensureTranslations(file: TFile, blocks: MarkdownBlock[]): Promise<Record<string, string>> {
    const planned = createTranslationTasks({
      blocks,
      cacheLookup: (block) => this.cache.get(this.createCacheKey(file.path, block)),
    });
    const translations = { ...planned.resolved };

    if (!planned.pending.length) {
      return translations;
    }

    if (this.settings.apiProvider !== "mymemory" && !this.settings.apiKeySecretName.trim()) {
      throw new Error("Configure your API key secret in the plugin settings first.");
    }

    const concurrency = getEffectiveTranslationConcurrency(
      this.settings.apiProvider,
      this.settings.concurrency
    );

    for (let start = 0; start < planned.pending.length; start += concurrency) {
      const batch = planned.pending.slice(start, start + concurrency);
      const results = await Promise.all(
        batch.map(async ({ block }) => {
          const translated = await translateMarkdownBlock(
            block,
            (text) =>
              translateBlock(text, this.settings, (name) =>
                this.app.secretStorage.getSecret(name) ?? undefined
              )
          );
          const cacheKey = this.createCacheKey(file.path, block);
          this.cache.set(cacheKey, translated);

          return {
            id: block.id,
            translated,
          };
        })
      );

      for (const result of results) {
        translations[result.id] = result.translated;
      }
    }

    await this.saveCache();
    return translations;
  }

  private async ensureInlinePane(view: MarkdownView): Promise<void> {
    const existing = this.inlinePanes.get(view.leaf);
    if (existing) {
      await existing.attach();
      return;
    }

    const pane = new InlineBilingualPane(this, view);
    this.inlinePanes.set(view.leaf, pane);
    await pane.attach();
  }

  private createCacheKey(filePath: string, block: MarkdownBlock): string {
    const blockHash = block.hash ?? this.cache.createBlockHash(block.sourceText);

    return this.cache.createKey({
      filePath,
      apiProvider: this.settings.apiProvider,
      model: this.settings.model,
      sourceLanguage: this.settings.sourceLanguage,
      targetLanguage: this.settings.targetLanguage,
      blockHash,
    });
  }

  createTextCacheKey(filePath: string, text: string): string {
    return this.cache.createKey({
      filePath,
      apiProvider: this.settings.apiProvider,
      model: this.settings.model,
      sourceLanguage: this.settings.sourceLanguage,
      targetLanguage: this.settings.targetLanguage,
      blockHash: hashText(text),
    });
  }

  async renderTranslatedPreview(
    file: TFile,
    blocks: MarkdownBlock[],
    containerEl: HTMLElement,
    component: Component
  ): Promise<number> {
    const fragment = containerEl.ownerDocument.createDocumentFragment();
    const segments: RenderedTextSegment[] = [];
    const wholeBlockTranslations = await this.ensureTranslations(
      file,
      blocks.filter((block) => shouldPreferWholeBlockTranslation(block))
    );

    for (const block of blocks) {
      const blockEl = containerEl.ownerDocument.createElement("div");
      blockEl.className = "bct-translation-block markdown-rendered";
      blockEl.dataset.bctBlockId = block.id;
      blockEl.dataset.bctLineStart = String(block.lineStart);
      blockEl.dataset.bctLineEnd = String(block.lineEnd);

      const renderMarkdown = wholeBlockTranslations[block.id] ?? block.markdown;
      await MarkdownRenderer.render(this.app, renderMarkdown, blockEl, file.path, component);

      if (!wholeBlockTranslations[block.id]) {
        segments.push(...collectTranslatableTextNodes(blockEl));
      }

      fragment.appendChild(blockEl);
    }

    const translations = await this.ensureRenderedTextTranslations(file, segments);

    for (const segment of segments) {
      const translated = translations.get(segment.coreText);
      if (typeof translated !== "string") {
        continue;
      }

      segment.node.nodeValue = `${segment.leadingWhitespace}${translated}${segment.trailingWhitespace}`;
    }

    containerEl.empty();
    const contentEl = containerEl.ownerDocument.createElement("div");
    contentEl.className = "markdown-rendered bct-preview__content";
    contentEl.appendChild(fragment);
    containerEl.appendChild(contentEl);
    return segments.length;
  }

  async ensureRenderedTextTranslations(
    file: TFile,
    segments: RenderedTextSegment[]
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    const pending: Array<{ text: string; cacheKey: string }> = [];

    for (const segment of segments) {
      if (translations.has(segment.coreText)) {
        continue;
      }

      const cacheKey = this.createTextCacheKey(file.path, segment.coreText);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        translations.set(segment.coreText, cached);
        continue;
      }

      pending.push({
        text: segment.coreText,
        cacheKey,
      });
    }

    if (!pending.length) {
      return translations;
    }

    if (this.settings.apiProvider !== "mymemory" && !this.settings.apiKeySecretName.trim()) {
      throw new Error("Configure your API key secret in the plugin settings first.");
    }

    const concurrency = getEffectiveTranslationConcurrency(
      this.settings.apiProvider,
      this.settings.concurrency
    );
    for (let start = 0; start < pending.length; start += concurrency) {
      const batch = pending.slice(start, start + concurrency);
      const results = await Promise.all(
        batch.map(async ({ text, cacheKey }) => {
          const translated = await translateRenderedText(text, this.settings, (name) =>
            this.app.secretStorage.getSecret(name) ?? undefined
          );
          this.cache.set(cacheKey, translated);
          return { text, translated };
        })
      );

      for (const result of results) {
        translations.set(result.text, result.translated);
      }
    }

    await this.saveCache();
    return translations;
  }

  private async persistPluginState(): Promise<void> {
    const data: PersistedPluginData = {
      settings: this.settings,
      cache: this.cache.toJSON(),
    };

    await this.saveData(data);
  }
}
