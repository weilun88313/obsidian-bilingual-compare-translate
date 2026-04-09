import { describe, expect, it } from "vitest";
import {
  resolveTrackedFilePathOnRename,
  shouldClosePaneForOpenedFile,
} from "../src/view/inlinePaneBehavior";

describe("shouldClosePaneForOpenedFile", () => {
  it("keeps the pane open for the tracked file", () => {
    expect(shouldClosePaneForOpenedFile("docs/a.md", "docs/a.md")).toBe(false);
  });

  it("closes the pane when the leaf opens a different file", () => {
    expect(shouldClosePaneForOpenedFile("docs/a.md", "docs/b.md")).toBe(true);
  });

  it("ignores empty paths", () => {
    expect(shouldClosePaneForOpenedFile(null, "docs/b.md")).toBe(false);
    expect(shouldClosePaneForOpenedFile("docs/a.md", null)).toBe(false);
  });
});

describe("resolveTrackedFilePathOnRename", () => {
  it("follows the tracked note after rename", () => {
    expect(resolveTrackedFilePathOnRename("docs/a.md", "docs/a.md", "docs/renamed.md")).toBe(
      "docs/renamed.md"
    );
  });

  it("leaves unrelated renames alone", () => {
    expect(resolveTrackedFilePathOnRename("docs/a.md", "docs/other.md", "docs/new.md")).toBe(
      "docs/a.md"
    );
  });
});
