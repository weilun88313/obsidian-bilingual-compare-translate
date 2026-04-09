import type { MarkdownFileInfo, TAbstractFile, TFile } from "obsidian";

export function isMarkdownFile(file: Pick<TFile, "extension"> | TAbstractFile | null | undefined): file is TFile {
  return Boolean(file && "extension" in file && file.extension === "md");
}

export function getMarkdownFileFromInfo(
  info: MarkdownFileInfo | { file?: TFile | null }
): TFile | null {
  return isMarkdownFile(info.file) ? info.file : null;
}
