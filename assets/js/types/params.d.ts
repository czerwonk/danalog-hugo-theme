// Params passed to js.Build in layouts/partials/head.html; keep both in sync
declare module "@params" {
  export const closeTitle: string | undefined;
  export const zoomTitle: string | undefined;
  export const arrowPrevTitle: string | undefined;
  export const arrowNextTitle: string | undefined;
  export const errorMsg: string | undefined;
  export const downloadTitle: string | undefined;
  export const copyCaptionTitle: string | undefined;
  export const filterCamera: string | undefined;
  export const filterLens: string | undefined;
  export const filterFilm: string | undefined;
  export const filterOrientation: string | undefined;
  export const filterAll: string | undefined;
  export const filterReset: string | undefined;
  export const orientationLandscape: string | undefined;
  export const orientationPortrait: string | undefined;
  export const orientationSquare: string | undefined;
  export const enableDownload: boolean | undefined;
}
