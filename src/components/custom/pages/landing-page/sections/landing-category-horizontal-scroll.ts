import { gsap, ScrollTrigger } from "~/src/lib/gsap";

const HORIZONTAL_SLIDE_SELECTOR = ":scope > article";
const MIN_SLIDES_FOR_SCROLL = 2;
const VIEWPORT_HEIGHTS_PER_SLIDE = 1;
const REFRESH_FRAME_DELAY = 0;
const NO_TRANSITIONS = 0;
const SLIDE_TRANSITION_OFFSET = 1;

/** Direct scrub — horizontal track follows scroll 1:1 (no lag stutter). */
export const HORIZONTAL_SCROLL_SCRUB = true;

export function countHorizontalSlides(track: HTMLElement): number {
  return track.querySelectorAll(HORIZONTAL_SLIDE_SELECTOR).length;
}

export function getHorizontalSlideTransitions(slideCount: number): number {
  return Math.max(NO_TRANSITIONS, slideCount - SLIDE_TRANSITION_OFFSET);
}

export function canRunHorizontalCategoryScroll(track: HTMLElement): boolean {
  return countHorizontalSlides(track) >= MIN_SLIDES_FOR_SCROLL;
}

export function resolveHorizontalTrackOffset(track: HTMLElement, section: HTMLElement): number {
  return -(track.scrollWidth - section.clientWidth);
}

export function resolveHorizontalScrollEnd(track: HTMLElement): string {
  const transitions = getHorizontalSlideTransitions(countHorizontalSlides(track));

  return `+=${transitions * window.innerHeight * VIEWPORT_HEIGHTS_PER_SLIDE}`;
}

export function refreshHorizontalCategoryScroll(): void {
  ScrollTrigger.refresh();
}

export function observeHorizontalCategoryScrollLayout(track: HTMLElement, onLayoutChange: () => void): () => void {
  const scheduleRefresh = () => {
    onLayoutChange();
  };

  const resizeObserver = new ResizeObserver(scheduleRefresh);
  resizeObserver.observe(track);

  const imageLoadCleanups: (() => void)[] = [];

  for (const image of track.querySelectorAll("img")) {
    if (!image.complete) {
      const handleLoad = () => {
        scheduleRefresh();
      };

      image.addEventListener("load", handleLoad, { once: true });
      imageLoadCleanups.push(() => {
        image.removeEventListener("load", handleLoad);
      });
    }
  }

  return () => {
    resizeObserver.disconnect();

    for (const cleanup of imageLoadCleanups) {
      cleanup();
    }
  };
}

export function scheduleHorizontalCategoryScrollRefresh(): void {
  gsap.delayedCall(REFRESH_FRAME_DELAY, refreshHorizontalCategoryScroll);
}
