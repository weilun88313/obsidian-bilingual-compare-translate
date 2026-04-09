export const DEFAULT_PANE_WIDTH_RATIO = 0.36;
export const MIN_PANE_WIDTH_RATIO = 0.24;
export const MAX_PANE_WIDTH_RATIO = 0.6;

export function clampPaneWidthRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) {
    return DEFAULT_PANE_WIDTH_RATIO;
  }

  return Math.min(MAX_PANE_WIDTH_RATIO, Math.max(MIN_PANE_WIDTH_RATIO, ratio));
}

export function getPaneWidthRatioFromPointer(
  containerLeft: number,
  containerWidth: number,
  pointerX: number
): number {
  if (containerWidth <= 0) {
    return DEFAULT_PANE_WIDTH_RATIO;
  }

  const rightEdge = containerLeft + containerWidth;
  return clampPaneWidthRatio((rightEdge - pointerX) / containerWidth);
}
