import {
  ItemView,
  MarkdownRenderer,
  Notice,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";
import { getMarkdownFileFromInfo } from "../files/markdownFiles";
import type BilingualCompareTranslatePlugin from "../main";
import { parseMarkdownBlocks } from "../markdown/parseMarkdownBlocks";
import { buildTranslatedDocument } from "./buildTranslatedDocument";

export const VIEW_TYPE_BILINGUAL_COMPARE = "bilingual-compare-view";

export interface BilingualCompareViewState extends Record<string, unknown> {
  filePath?: string;
}

export class BilingualCompareView extends ItemView {
  private state: BilingualCompareViewState = {};
  private isRendering = false;
  private needsRerender = false;
  private refreshTimer: number | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: BilingualCompareTranslatePlugin
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_BILINGUAL_COMPARE;
  }

  getDisplayText(): string {
    return "Bilingual Compare";
  }

  getIcon(): string {
    return "languages";
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass("bct-view");

    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (this.state.filePath && file.path === this.state.filePath) {
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (this.state.filePath && oldPath === this.state.filePath) {
          this.state.filePath = file.path;
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", (_editor, info) => {
        const file = getMarkdownFileFromInfo(info);
        if (this.state.filePath && file?.path === this.state.filePath) {
          this.scheduleRefresh();
        }
      })
    );

    await this.render();
  }

  async setState(state: BilingualCompareViewState): Promise<void> {
    this.state = state ?? {};
    await this.render();
  }

  getState(): BilingualCompareViewState {
    return this.state;
  }

  async refresh(): Promise<void> {
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    await this.render();
  }

  onClose(): Promise<void> {
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    return super.onClose();
  }

  private async render(): Promise<void> {
    if (this.isRendering) {
      this.needsRerender = true;
      return;
    }

    this.isRendering = true;

    try {
      await this.renderInternal();
    } finally {
      this.isRendering = false;
      if (this.needsRerender) {
        this.needsRerender = false;
        await this.render();
      }
    }
  }

  private async renderInternal(): Promise<void> {
    const { contentEl } = this;
    contentEl.empty();

    const toolbarEl = contentEl.createDiv({ cls: "bct-toolbar" });
    const titleEl = toolbarEl.createDiv({ cls: "bct-toolbar__title" });
    const actionsEl = toolbarEl.createDiv({ cls: "bct-toolbar__actions" });
    const refreshButton = actionsEl.createEl("button", {
      cls: "mod-cta",
      text: "Refresh",
    });

    refreshButton.addEventListener("click", () => {
      void this.refresh();
    });

    const bodyEl = contentEl.createDiv({ cls: "bct-body" });
    const statusEl = bodyEl.createDiv({ cls: "bct-status" });

    const file = this.resolveFile();
    if (!file) {
      titleEl.setText("Bilingual Compare");
      statusEl.setText("Open a Markdown note from the ribbon, note menu, file menu, or settings page.");
      return;
    }

    titleEl.setText(file.basename);
    statusEl.setText("Parsing and translating note blocks...");

    try {
      const markdown =
        this.plugin.getLiveMarkdownForFile(file.path) ??
        (await this.app.vault.cachedRead(file));
      const blocks = parseMarkdownBlocks(markdown);
      const translations = await this.plugin.ensureTranslations(file, blocks);
      const translatedMarkdown = buildTranslatedDocument(blocks, translations);

      statusEl.setText(
        `Live translation · ${blocks.length} blocks · ${this.plugin.settings.sourceLanguage} -> ${this.plugin.settings.targetLanguage}`
      );

      const previewEl = bodyEl.createDiv({ cls: "bct-preview" });
      await MarkdownRenderer.render(this.app, translatedMarkdown, previewEl, file.path, this);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      statusEl.setText(`Could not render translation: ${message}`);
      new Notice(`Bilingual compare failed: ${message}`);
    }
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
    }

    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 700);
  }

  private resolveFile(): TFile | null {
    if (!this.state.filePath) {
      return null;
    }

    const abstractFile = this.app.vault.getAbstractFileByPath(this.state.filePath);
    return abstractFile instanceof TFile ? abstractFile : null;
  }
}
