import { Component, MarkdownView, Notice, TFile, setIcon } from "obsidian";
import type BilingualCompareTranslatePlugin from "../main";
import { parseMarkdownBlocks } from "../markdown/parseMarkdownBlocks";
import type { MarkdownBlock } from "../types";
import { formatLanguageStatus, getLanguageOptions } from "../ui/languageOptions";
import {
  resolveTrackedFilePathOnRename,
  shouldClosePaneForOpenedFile,
} from "./inlinePaneBehavior";
import {
  clampPaneWidthRatio,
  getPaneWidthRatioFromPointer,
} from "./paneSizing";
import { findBlockForLine, getSyncedScrollTop } from "./translationSync";

export class InlineBilingualPane extends Component {
  private wrapperEl: HTMLDivElement | null = null;
  private sourcePaneEl: HTMLDivElement | null = null;
  private translationPaneEl: HTMLDivElement | null = null;
  private statusEl: HTMLDivElement | null = null;
  private refreshButtonEl: HTMLButtonElement | null = null;
  private sourceLanguageSelectEl: HTMLSelectElement | null = null;
  private targetLanguageSelectEl: HTMLSelectElement | null = null;
  private refreshTimer: number | null = null;
  private isRefreshing = false;
  private needsRerender = false;
  private mutationObserver: MutationObserver | null = null;
  private registeredPaneEvents = false;
  private stopDragging: (() => void) | null = null;
  private isDetaching = false;
  private trackedFilePath: string | null;
  private sourceScrollEl: HTMLElement | null = null;
  private boundSourcePaneEl: HTMLElement | null = null;
  private activeBlockId: string | null = null;
  private renderedBlocks: MarkdownBlock[] = [];
  private syncScrollFrame: number | null = null;

  constructor(
    private readonly plugin: BilingualCompareTranslatePlugin,
    readonly view: MarkdownView
  ) {
    super();
    this.trackedFilePath = view.file?.path ?? null;
  }

  async attach(): Promise<void> {
    this.isDetaching = false;
    this.ensureLayoutMounted();

    if (!this.registeredPaneEvents) {
      this.registerPaneEvents();
      this.registeredPaneEvents = true;
    }

    await this.refresh();
  }

  detach(): void {
    this.isDetaching = true;

    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.stopDragging) {
      this.stopDragging();
      this.stopDragging = null;
    }

    if (this.syncScrollFrame) {
      window.cancelAnimationFrame(this.syncScrollFrame);
      this.syncScrollFrame = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    this.restoreSourceContent();
    this.wrapperEl = null;
    this.sourcePaneEl = null;
    this.translationPaneEl = null;
    this.statusEl = null;
    this.refreshButtonEl = null;
    this.sourceLanguageSelectEl = null;
    this.targetLanguageSelectEl = null;
    this.sourceScrollEl = null;
    this.boundSourcePaneEl = null;
    this.activeBlockId = null;
    this.renderedBlocks = [];

    this.unload();
  }

  scheduleRefresh(): void {
    if (this.isDetaching) {
      return;
    }

    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
    }

    const delay = this.plugin.settings.apiProvider === "mymemory" ? 1200 : 500;
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, delay);
  }

  async refresh(): Promise<void> {
    if (this.isDetaching) {
      return;
    }

    this.ensureLayoutMounted();

    if (!this.translationPaneEl || !this.statusEl || !this.refreshButtonEl) {
      return;
    }

    if (this.refreshTimer) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (this.isRefreshing) {
      this.needsRerender = true;
      return;
    }

    const file = this.view.file;
    if (!(file instanceof TFile)) {
      this.statusEl.setText("Open a Markdown note to use live translation.");
      return;
    }

    if (shouldClosePaneForOpenedFile(this.trackedFilePath, file.path)) {
      this.plugin.closeInlinePane(this.view.leaf);
      return;
    }

    this.isRefreshing = true;
    this.refreshButtonEl.addClass("is-loading");
    this.refreshButtonEl.disabled = true;
    this.refreshButtonEl.ariaBusy = "true";
    this.statusEl.setText("Updating translation...");

    try {
      const markdown =
        this.plugin.getLiveMarkdownForFile(file.path) ?? (await this.plugin.app.vault.cachedRead(file));
      const blocks = parseMarkdownBlocks(markdown);
      this.renderedBlocks = blocks;
      await this.plugin.renderTranslatedPreview(
        file,
        blocks,
        this.translationPaneEl,
        this
      );
      this.syncMetadataMirror();
      this.bindSourceInteractions();
      this.syncTranslationScroll();
      this.syncActiveBlockFromEditor();

      this.statusEl.setText(
        formatLanguageStatus(this.plugin.settings.sourceLanguage, this.plugin.settings.targetLanguage)
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRateLimited =
        message.includes("429") || message.toLowerCase().includes("rate limit");
      this.statusEl.setText(
        isRateLimited
          ? "Provider rate limit reached. The pane will recover after a short pause."
          : `Could not update translation: ${message}`
      );
      new Notice(`Bilingual compare failed: ${message}`);
    } finally {
      this.isRefreshing = false;
      this.refreshButtonEl.removeClass("is-loading");
      this.refreshButtonEl.disabled = false;
      this.refreshButtonEl.ariaBusy = "false";

      if (this.needsRerender) {
        this.needsRerender = false;
        void this.refresh();
      }
    }
  }

  private ensureLayoutMounted(): void {
    if (this.isDetaching) {
      return;
    }

    const contentEl = this.view.contentEl;

    if (
      this.wrapperEl &&
      this.wrapperEl.parentElement === contentEl &&
      this.sourcePaneEl &&
      this.translationPaneEl &&
      this.statusEl
    ) {
      return;
    }

    const existingChildren = Array.from(contentEl.childNodes).filter((node) => node !== this.wrapperEl);

    if (this.wrapperEl?.isConnected) {
      this.wrapperEl.remove();
    }

    contentEl.addClass("bct-inline-host");

    const wrapperEl = contentEl.createDiv({ cls: "bct-inline-layout" });
    const sourcePaneEl = wrapperEl.createDiv({ cls: "bct-inline-source" });
    const dividerEl = wrapperEl.createDiv({ cls: "bct-inline-divider" });
    dividerEl.role = "separator";
    dividerEl.setAttr("aria-orientation", "vertical");
    dividerEl.setAttr("aria-label", "Resize translation pane");
    const translationShellEl = wrapperEl.createDiv({ cls: "bct-inline-translation-shell" });
    const headerEl = translationShellEl.createDiv({ cls: "bct-inline-pane-header" });
    const metaEl = headerEl.createDiv({ cls: "bct-inline-pane-meta" });
    const titleEl = metaEl.createDiv({ cls: "bct-inline-pane-title", text: "Translation" });
    titleEl.setAttr("aria-hidden", "true");
    const statusEl = metaEl.createDiv({
      cls: "bct-inline-pane-status",
      text: "Updates as you type",
    });
    const controlsEl = headerEl.createDiv({ cls: "bct-inline-pane-controls" });
    const sourceLanguageSelectEl = this.createLanguageSelect(
      controlsEl,
      "source",
      "Source language"
    );
    const swapButtonEl = this.createIconButton(controlsEl, "left-right", "Swap languages");
    const targetLanguageSelectEl = this.createLanguageSelect(
      controlsEl,
      "target",
      "Target language"
    );
    const actionsEl = headerEl.createDiv({ cls: "bct-inline-pane-actions" });
    const refreshButtonEl = this.createIconButton(actionsEl, "refresh-cw", "Refresh translation");
    const closeButtonEl = this.createIconButton(actionsEl, "x", "Close translation pane");
    const translationPaneEl = translationShellEl.createDiv({ cls: "bct-inline-translation-body" });

    sourcePaneEl.append(...existingChildren);
    this.applyPaneWidth(wrapperEl);

    this.registerDomEvent(refreshButtonEl, "click", () => {
      void this.refresh();
    });
    this.registerDomEvent(sourceLanguageSelectEl, "change", () => {
      void this.handleLanguageChange("source", sourceLanguageSelectEl.value);
    });
    this.registerDomEvent(targetLanguageSelectEl, "change", () => {
      void this.handleLanguageChange("target", targetLanguageSelectEl.value);
    });
    this.registerDomEvent(swapButtonEl, "click", () => {
      void this.swapLanguages();
    });
    this.registerDomEvent(closeButtonEl, "click", () => {
      void this.plugin.closeInlinePane(this.view.leaf);
    });
    this.registerResizeHandle(dividerEl, wrapperEl);

    this.wrapperEl = wrapperEl;
    this.sourcePaneEl = sourcePaneEl;
    this.translationPaneEl = translationPaneEl;
    this.statusEl = statusEl;
    this.refreshButtonEl = refreshButtonEl;
    this.sourceLanguageSelectEl = sourceLanguageSelectEl;
    this.targetLanguageSelectEl = targetLanguageSelectEl;
    this.populateLanguageSelects();

    if (!this.mutationObserver) {
      this.mutationObserver = new MutationObserver(() => {
        if (this.isDetaching || this.view.leaf.view !== this.view) {
          return;
        }

        if (this.wrapperEl?.parentElement !== this.view.contentEl) {
          this.ensureLayoutMounted();
          this.scheduleRefresh();
        }
      });
      this.mutationObserver.observe(contentEl, { childList: true });
      this.register(() => {
        this.mutationObserver?.disconnect();
        this.mutationObserver = null;
      });
    }
  }

  private applyPaneWidth(wrapperEl: HTMLElement): void {
    const ratio = clampPaneWidthRatio(this.plugin.settings.paneWidthRatio);
    wrapperEl.style.setProperty("--bct-inline-pane-width", `${(ratio * 100).toFixed(1)}%`);
  }

  private registerResizeHandle(dividerEl: HTMLElement, wrapperEl: HTMLElement): void {
    this.registerDomEvent(dividerEl, "pointerdown", (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      dividerEl.addClass("is-dragging");

      const handleMove = (moveEvent: PointerEvent) => {
        const bounds = wrapperEl.getBoundingClientRect();
        const nextRatio = getPaneWidthRatioFromPointer(bounds.left, bounds.width, moveEvent.clientX);
        this.plugin.settings.paneWidthRatio = nextRatio;
        this.applyPaneWidth(wrapperEl);
      };

      const handleUp = () => {
        dividerEl.removeClass("is-dragging");
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        this.stopDragging = null;
        void this.plugin.saveSettings();
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
      this.stopDragging = () => {
        dividerEl.removeClass("is-dragging");
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };
    });
  }

  private populateLanguageSelects(): void {
    if (!this.sourceLanguageSelectEl || !this.targetLanguageSelectEl) {
      return;
    }

    const sourceOptions = getLanguageOptions(
      this.plugin.settings.apiProvider,
      "source",
      this.plugin.settings.sourceLanguage
    );
    const targetOptions = getLanguageOptions(
      this.plugin.settings.apiProvider,
      "target",
      this.plugin.settings.targetLanguage
    );

    this.populateLanguageSelect(this.sourceLanguageSelectEl, sourceOptions, this.plugin.settings.sourceLanguage);
    this.populateLanguageSelect(this.targetLanguageSelectEl, targetOptions, this.plugin.settings.targetLanguage);
  }

  private populateLanguageSelect(
    selectEl: HTMLSelectElement,
    options: Array<{ value: string; label: string }>,
    currentValue: string
  ): void {
    selectEl.empty();

    for (const option of options) {
      const optionEl = selectEl.createEl("option", {
        value: option.value,
        text: option.label,
      });
      optionEl.selected = option.value === currentValue;
    }

    selectEl.value = currentValue;
  }

  private createLanguageSelect(
    parentEl: HTMLElement,
    field: "source" | "target",
    label: string
  ): HTMLSelectElement {
    const selectEl = parentEl.createEl("select", {
      cls: "dropdown bct-language-select",
    });
    selectEl.setAttr("aria-label", label);
    selectEl.dataset.bctLanguageField = field;
    return selectEl;
  }

  private async handleLanguageChange(field: "source" | "target", value: string): Promise<void> {
    if (!value) {
      return;
    }

    if (field === "source") {
      this.plugin.settings.sourceLanguage = value;
    } else {
      this.plugin.settings.targetLanguage = value;
    }

    this.populateLanguageSelects();
    await this.plugin.saveSettings();
    await this.refresh();
  }

  private async swapLanguages(): Promise<void> {
    const currentSource = this.plugin.settings.sourceLanguage;
    const currentTarget = this.plugin.settings.targetLanguage;

    if (currentSource === "auto" || this.plugin.settings.apiProvider === "mymemory" && currentTarget === "auto") {
      return;
    }

    this.plugin.settings.sourceLanguage = currentTarget;
    this.plugin.settings.targetLanguage = currentSource;
    this.populateLanguageSelects();
    await this.plugin.saveSettings();
    await this.refresh();
  }

  private bindSourceInteractions(): void {
    if (!this.sourcePaneEl) {
      return;
    }

    if (this.sourcePaneEl !== this.boundSourcePaneEl) {
      this.boundSourcePaneEl = this.sourcePaneEl;
      this.registerDomEvent(this.sourcePaneEl, "mouseup", () => {
        this.syncActiveBlockFromEditor();
      });
      this.registerDomEvent(this.sourcePaneEl, "keyup", () => {
        this.syncActiveBlockFromEditor();
      });
    }

    const nextScrollEl = this.findSourceScrollElement(this.sourcePaneEl);
    if (nextScrollEl && nextScrollEl !== this.sourceScrollEl) {
      this.sourceScrollEl = nextScrollEl;
      this.registerDomEvent(this.sourceScrollEl, "scroll", () => {
        this.syncTranslationScroll();
      });
    }
  }

  private syncMetadataMirror(): void {
    if (!this.sourcePaneEl || !this.translationPaneEl) {
      return;
    }

    this.translationPaneEl.querySelector(".bct-metadata-mirror")?.remove();

    const sourceMetadataEl = this.findSourceMetadataContainer(this.sourcePaneEl);
    if (!sourceMetadataEl) {
      return;
    }

    const mirrorEl = sourceMetadataEl.cloneNode(true) as HTMLElement;
    mirrorEl.addClass("bct-metadata-mirror");
    mirrorEl.querySelectorAll("[id]").forEach((element) => {
      element.removeAttribute("id");
    });
    mirrorEl.querySelectorAll<HTMLElement>("[contenteditable]").forEach((element) => {
      element.setAttr("contenteditable", "false");
    });
    mirrorEl.querySelectorAll<HTMLElement>(
      "a, button, input, select, textarea, [role='button'], .clickable-icon"
    ).forEach((element) => {
      element.setAttr("tabindex", "-1");
      element.setAttr("aria-hidden", "true");
    });
    mirrorEl.setAttr("aria-hidden", "true");

    this.translationPaneEl.prepend(mirrorEl);
  }

  private findSourceMetadataContainer(root: HTMLElement): HTMLElement | null {
    const selectors = [
      ".metadata-container",
      ".markdown-preview-view .metadata-container",
      ".markdown-reading-view .metadata-container",
      ".cm-contentContainer .metadata-container",
    ];

    for (const selector of selectors) {
      const match = root.querySelector<HTMLElement>(selector);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private findSourceScrollElement(root: HTMLElement): HTMLElement {
    const preferredSelectors = [
      ".cm-scroller",
      ".markdown-preview-view",
      ".markdown-reading-view",
      ".view-content",
    ];

    for (const selector of preferredSelectors) {
      const match = root.querySelector<HTMLElement>(selector);
      if (match) {
        return match;
      }
    }

    return root;
  }

  private syncTranslationScroll(): void {
    if (!this.sourceScrollEl || !this.translationPaneEl || this.syncScrollFrame) {
      return;
    }

    this.syncScrollFrame = window.requestAnimationFrame(() => {
      this.syncScrollFrame = null;

      if (!this.sourceScrollEl || !this.translationPaneEl) {
        return;
      }

      const sourceScrollableHeight =
        this.sourceScrollEl.scrollHeight - this.sourceScrollEl.clientHeight;
      const targetScrollableHeight =
        this.translationPaneEl.scrollHeight - this.translationPaneEl.clientHeight;

      this.translationPaneEl.scrollTop = getSyncedScrollTop(
        this.sourceScrollEl.scrollTop,
        sourceScrollableHeight,
        targetScrollableHeight
      );
    });
  }

  private syncActiveBlockFromEditor(): void {
    if (!this.renderedBlocks.length || !this.view.editor) {
      this.setActiveBlock(null);
      return;
    }

    const line = this.view.editor.getCursor("from").line;
    const block = findBlockForLine(this.renderedBlocks, line);
    this.setActiveBlock(block?.id ?? null);
  }

  private setActiveBlock(blockId: string | null): void {
    if (!this.translationPaneEl || this.activeBlockId === blockId) {
      return;
    }

    if (this.activeBlockId) {
      const previous = this.translationPaneEl.querySelector<HTMLElement>(
        `[data-bct-block-id="${this.activeBlockId}"]`
      );
      previous?.removeClass("is-active");
    }

    this.activeBlockId = blockId;

    if (!blockId) {
      return;
    }

    const next = this.translationPaneEl.querySelector<HTMLElement>(`[data-bct-block-id="${blockId}"]`);
    next?.addClass("is-active");
  }

  private restoreSourceContent(): void {
    const contentEl = this.view.contentEl;
    contentEl.removeClass("bct-inline-host");

    if (!this.wrapperEl || !this.sourcePaneEl || this.wrapperEl.parentElement !== contentEl) {
      return;
    }

    const sourceChildren = Array.from(this.sourcePaneEl.childNodes);
    this.wrapperEl.remove();
    contentEl.append(...sourceChildren);
    this.view.editor?.refresh();
  }

  private registerPaneEvents(): void {
    this.registerEvent(
      this.plugin.app.workspace.on("editor-change", (_editor, info) => {
        if (info === this.view || info.file?.path === this.view.file?.path) {
          this.syncActiveBlockFromEditor();
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.plugin.app.vault.on("modify", (file) => {
        if (file.path === this.view.file?.path) {
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.plugin.app.vault.on("rename", (file, oldPath) => {
        this.trackedFilePath = resolveTrackedFilePathOnRename(
          this.trackedFilePath,
          oldPath,
          file.path
        );

        if (oldPath === this.view.file?.path || file.path === this.view.file?.path) {
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.plugin.app.workspace.on("file-open", (file) => {
        if (shouldClosePaneForOpenedFile(this.trackedFilePath, file?.path)) {
          void this.plugin.closeInlinePane(this.view.leaf);
          return;
        }

        if (file?.path === this.trackedFilePath) {
          this.scheduleRefresh();
        }
      })
    );

    this.registerEvent(
      this.plugin.app.workspace.on("layout-change", () => {
        if (this.isDetaching) {
          return;
        }

        if (this.view.leaf.view !== this.view) {
          void this.plugin.closeInlinePane(this.view.leaf);
          return;
        }

        if (shouldClosePaneForOpenedFile(this.trackedFilePath, this.view.file?.path)) {
          void this.plugin.closeInlinePane(this.view.leaf);
          return;
        }

        this.ensureLayoutMounted();
        this.scheduleRefresh();
      })
    );
  }

  private createIconButton(parentEl: HTMLElement, icon: string, label: string): HTMLButtonElement {
    const buttonEl = parentEl.createEl("button", {
      cls: "clickable-icon bct-icon-button",
    });
    buttonEl.type = "button";
    buttonEl.ariaLabel = label;
    buttonEl.title = label;
    setIcon(buttonEl, icon);
    return buttonEl;
  }
}
