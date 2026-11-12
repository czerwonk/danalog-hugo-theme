// The plugin ships no types; covers the options the theme uses
import type PhotoSwipe from "photoswipe";
import type PhotoSwipeLightbox from "photoswipe/lightbox";

type Slide = NonNullable<PhotoSwipe["currSlide"]>;

export interface DynamicCaptionOptions {
  captionContent?: string | ((slide: Slide) => string);
  type?: "auto" | "below" | "aside";
  horizontalEdgeThreshold?: number;
  mobileCaptionOverlapRatio?: number;
  mobileLayoutBreakpoint?: number | (() => boolean);
  verticallyCenterImage?: boolean;
}

export default class PhotoSwipeDynamicCaption {
  constructor(lightbox: PhotoSwipeLightbox, options?: DynamicCaptionOptions);
}
