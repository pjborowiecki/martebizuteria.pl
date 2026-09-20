import { ScrollTrigger, gsap } from "~/src/lib/gsap"
export const countHorizontalSlides = (track: HTMLElement): number => track.querySelectorAll(HORIZONTAL_SLIDE_SELECTOR).length

export const getHorizontalSlideTransitions = (slideCount: number): number => Math.max(0, slideCount - SLIDE_TRANSITION_OFFSET)

export const canRunHorizontalCategoryScroll = (track: HTMLElement): boolean => countHorizontalSlides(track) >= MIN_SLIDES_FOR_SCROLL

export const resolveHorizontalTrackOffset = (track: HTMLElement, section: HTMLElement): number => -(track.scrollWidth - section.clientWidth)

export const resolveHorizontalScrollEnd = (track: HTMLElement): string => {
  const transitions = getHorizontalSlideTransitions(countHorizontalSlides(track))
  return `+=${transitions * window.innerHeight * VIEWPORT_HEIGHTS_PER_SLIDE}`
}
export const refreshHorizontalCategoryScroll = (): void => {
  ScrollTrigger.refresh()
}
export const observeHorizontalCategoryScrollLayout = (track: HTMLElement, onLayoutChange: () => void): (() => void) => {
  const scheduleRefresh = () => {
    onLayoutChange()
  }
  const resizeObserver = new ResizeObserver(scheduleRefresh)
  resizeObserver.observe(track)
  const imageLoadCleanups: (() => void)[] = []
  for (const image of track.querySelectorAll("img")) {
    if (!image.complete) {
      const handleLoad = () => {
        scheduleRefresh()
      }
      image.addEventListener("load", handleLoad, { once: true })
      imageLoadCleanups.push(() => {
        image.removeEventListener("load", handleLoad)
      })
    }
  }
  return () => {
    resizeObserver.disconnect()
    for (const cleanup of imageLoadCleanups) {
      cleanup()
    }
  }
}
export const scheduleHorizontalCategoryScrollRefresh = (): void => {
  gsap.delayedCall(REFRESH_FRAME_DELAY, refreshHorizontalCategoryScroll)
}
const HORIZONTAL_SLIDE_SELECTOR = ":scope > article"
const MIN_SLIDES_FOR_SCROLL = 2
const VIEWPORT_HEIGHTS_PER_SLIDE = 1
const REFRESH_FRAME_DELAY = 0
const SLIDE_TRANSITION_OFFSET = 1

/** Direct scrub — horizontal track follows scroll 1:1 (no lag stutter). */
export const HORIZONTAL_SCROLL_SCRUB = true
