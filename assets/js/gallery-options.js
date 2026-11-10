const DEFAULTS = {
  spacing: 8,
  rowHeight: 288,
  heightTolerance: 0.25,
};

const numberOr = (value, fallback) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);

/**
 * Maps the gallery site params to justified layout options, falling back to defaults for missing or invalid values.
 * @param {{boxSpacing?: number, targetRowHeight?: number, targetRowHeightTolerance?: number}} params
 */
export function layoutOptions(params) {
  return {
    spacing: numberOr(params.boxSpacing, DEFAULTS.spacing),
    rowHeight: numberOr(params.targetRowHeight, DEFAULTS.rowHeight) || DEFAULTS.rowHeight,
    heightTolerance: numberOr(params.targetRowHeightTolerance, DEFAULTS.heightTolerance),
  };
}
