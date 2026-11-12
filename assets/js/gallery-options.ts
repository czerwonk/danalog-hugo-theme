import type { LayoutOptions } from "./justified-layout.ts";

export interface GalleryParams {
  boxSpacing?: unknown;
  targetRowHeight?: unknown;
  targetRowHeightTolerance?: unknown;
}

const DEFAULTS = {
  spacing: 8,
  rowHeight: 288,
  heightTolerance: 0.25,
};

const numberOr = (value: unknown, fallback: number): number => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/**
 * Maps the gallery site params to justified layout options, falling back to defaults for missing or invalid values.
 * The params come from site config, so their types are not trusted.
 */
export function layoutOptions(params: GalleryParams): Omit<LayoutOptions, "rowWidth"> {
  return {
    spacing: numberOr(params.boxSpacing, DEFAULTS.spacing),
    rowHeight: numberOr(params.targetRowHeight, DEFAULTS.rowHeight) || DEFAULTS.rowHeight,
    heightTolerance: numberOr(params.targetRowHeightTolerance, DEFAULTS.heightTolerance),
  };
}
