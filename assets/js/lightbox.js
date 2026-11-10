import PhotoSwipeLightbox from "./photoswipe/photoswipe-lightbox.esm.js";
import PhotoSwipe from "./photoswipe/photoswipe.esm.js";
import PhotoSwipeDynamicCaption from "./photoswipe/photoswipe-dynamic-caption-plugin.esm.min.js";
import * as params from "@params";
import { buildCaption, buildCaptionText } from "./caption.js";
import { resetFilters } from "./gallery-filter.js";

const gallery = document.getElementById("gallery");

if (gallery) {
  const lightbox = new PhotoSwipeLightbox({
    gallery,
    // Photos hidden by the gallery filter are left out of the lightbox
    children: ".gallery-item:not([hidden])",
    showHideAnimationType: "zoom",
    bgOpacity: 1,
    pswpModule: PhotoSwipe,
    imageClickAction: "zoom",
    closeTitle: params.closeTitle,
    zoomTitle: params.zoomTitle,
    arrowPrevTitle: params.arrowPrevTitle,
    arrowNextTitle: params.arrowNextTitle,
    errorMsg: params.errorMsg,
  });

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "fullscreen-button",
      order: 15,
      isButton: true,
      html: {
        isCustomSVG: true,
        inner: '<path d="M8 8H15V11H11V21H15V24H8ZM24 8H17V11H21V21H17V24H24Z" id="pswp__icn-fullscreen-enter"/><path hidden id="pswp__icn-fullscreen-exit" d="M8 8H15V11H11V21H15V24H8ZM24 8H17V11H21V21H17V24H24Z"/>',
        outlineID: "pswp__icn-fullscreen-enter",
      },
      title: "Toggle fullscreen",
      onInit: (el, pswp) => {
        const enterIcon = el.querySelector("#pswp__icn-fullscreen-enter");
        const exitIcon = el.querySelector("#pswp__icn-fullscreen-exit");
        const updateIcon = () => {
          const isFullscreen = !!document.fullscreenElement;
          enterIcon.hidden = isFullscreen;
          exitIcon.hidden = !isFullscreen;
        };
        document.addEventListener("fullscreenchange", updateIcon);
        pswp.on("close", () => document.removeEventListener("fullscreenchange", updateIcon));
        el.addEventListener("click", () => {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        });
      },
    });
  });

  if (params.enableDownload) {
    lightbox.on("uiRegister", () => {
      lightbox.pswp.ui.registerElement({
        name: "download-button",
        order: 8,
        isButton: true,
        tagName: "a",
        html: {
          isCustomSVG: true,
          inner: '<path d="M20.5 14.3 17.1 18V10h-2.2v7.9l-3.4-3.6L10 16l6 6.1 6-6.1ZM23 23H9v2h14Z" id="pswp__icn-download"/>',
          outlineID: "pswp__icn-download",
        },
        onInit: (el, pswp) => {
          el.setAttribute("download", "");
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener");
          el.setAttribute("title", params.downloadTitle || "Download");
          pswp.on("change", () => {
            el.href = pswp.currSlide.data.element.href;
          });
        },
      });
    });
  }

  // Copies camera, film and lens as emoji lines, e.g. for social media posts
  const COPY_ICON = "M11 8h11v2h-9v12h-2zm4 4h11v13H15zm2 2v9h7v-9z";
  const COPIED_ICON = "M13.5 21.2 9.4 17.1 8 18.5l5.5 5.5L25 12.5l-1.4-1.4z";
  const captionTextFor = (slide) => {
    const { captionCamera, captionFilm, captionLens } = slide.data.element.dataset;
    return buildCaptionText({ camera: captionCamera, film: captionFilm, lens: captionLens });
  };

  lightbox.on("uiRegister", () => {
    lightbox.pswp.ui.registerElement({
      name: "copy-caption-button",
      order: 9,
      isButton: true,
      title: params.copyCaptionTitle || "Copy camera, film and lens",
      html: {
        isCustomSVG: true,
        inner: `<path fill-rule="evenodd" d="${COPY_ICON}" id="pswp__icn-copy"/>`,
        outlineID: "pswp__icn-copy",
      },
      onInit: (el, pswp) => {
        // The Clipboard API is only available in secure contexts (https, localhost)
        if (!navigator.clipboard) {
          el.hidden = true;
          return;
        }
        const icon = el.querySelector("#pswp__icn-copy");
        let resetTimer;
        pswp.on("change", () => {
          el.hidden = !captionTextFor(pswp.currSlide);
        });
        el.addEventListener("click", async () => {
          const text = captionTextFor(pswp.currSlide);
          if (!text) return;
          try {
            await navigator.clipboard.writeText(text);
            icon.setAttribute("d", COPIED_ICON);
            clearTimeout(resetTimer);
            resetTimer = setTimeout(() => icon.setAttribute("d", COPY_ICON), 1500);
          } catch (error) {
            console.warn("Copying the caption failed", error);
          }
        });
      },
    });
  });

  // Path and query string (active gallery filter) are kept, only the hash changes
  lightbox.on("change", () => {
    const target = lightbox.pswp.currSlide?.data?.element?.dataset["pswpTarget"];
    history.replaceState("", document.title, window.location.pathname + window.location.search + "#" + target);
  });

  lightbox.on("close", () => {
    history.replaceState("", document.title, window.location.pathname + window.location.search);
  });

  new PhotoSwipeDynamicCaption(lightbox, {
    mobileLayoutBreakpoint: 700,
    type: "auto",
    mobileCaptionOverlapRatio: 1,
    captionContent: (slide) => {
      const el = slide.data.element;
      return buildCaption({
        title: el.title,
        camera: el.dataset.captionCamera,
        film: el.dataset.captionFilm,
        lens: el.dataset.captionLens,
      });
    },
  });

  lightbox.init();

  if (window.location.hash.substring(1).length > 1) {
    const target = window.location.hash.substring(1);
    const linked = Array.from(gallery.querySelectorAll(".gallery-item")).find((item) => item.dataset["pswpTarget"] === target);
    if (linked) {
      // A shared link to a photo wins over an active filter that hides it
      if (linked.hidden) resetFilters();
      const visible = Array.from(gallery.querySelectorAll(".gallery-item:not([hidden])"));
      lightbox.loadAndOpen(visible.indexOf(linked), { gallery });
    }
  }
}
