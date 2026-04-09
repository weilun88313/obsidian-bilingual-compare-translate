import { describe, expect, it } from "vitest";
import {
  clampPaneWidthRatio,
  getPaneWidthRatioFromPointer,
  MAX_PANE_WIDTH_RATIO,
  MIN_PANE_WIDTH_RATIO,
} from "../src/view/paneSizing";

describe("clampPaneWidthRatio", () => {
  it("clamps values into the supported range", () => {
    expect(clampPaneWidthRatio(0.1)).toBe(MIN_PANE_WIDTH_RATIO);
    expect(clampPaneWidthRatio(0.9)).toBe(MAX_PANE_WIDTH_RATIO);
  });

  it("keeps already valid values untouched", () => {
    expect(clampPaneWidthRatio(0.38)).toBeCloseTo(0.38);
  });
});

describe("getPaneWidthRatioFromPointer", () => {
  it("computes the translation pane width from the divider position", () => {
    expect(getPaneWidthRatioFromPointer(100, 1000, 740)).toBeCloseTo(0.36, 2);
  });

  it("respects the clamp range while dragging", () => {
    expect(getPaneWidthRatioFromPointer(0, 1000, 950)).toBe(MIN_PANE_WIDTH_RATIO);
    expect(getPaneWidthRatioFromPointer(0, 1000, 150)).toBe(MAX_PANE_WIDTH_RATIO);
  });
});
