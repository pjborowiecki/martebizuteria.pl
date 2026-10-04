export const countHorizontalSlides = (track: HTMLElement): number => track.querySelectorAll(HORIZONTAL_SLIDE_SELECTOR).length

export const getHorizontalSlideTransitions = (slideCount: number): number => Math.max(0, slideCount - SLIDE_TRANSITION_OFFSET)

export const canRunHorizontalCategoryScroll = (track: HTMLElement): boolean => countHorizontalSlides(track) >= MIN_SLIDES_FOR_SCROLL

export const resolveHorizontalTrackOffset = (track: HTMLElement, section: HTMLElement): number => -(track.scrollWidth - section.clientWidth)

export const resolveHorizontalScrollEnd = (track: HTMLElement): string => {
  const transitions = getHorizontalSlideTransitions(countHorizontalSlides(track))

  return `+=${transitions * window.innerHeight * VIEWPORT_HEIGHTS_PER_SLIDE}`
}

export const resolveHorizontalPanelScrollTop = (
  pin: Readonly<{ end: number; start: number }>,
  panelLeft: number,
  trackOverflow: number,
): number => pin.start + ((pin.end - pin.start) * panelLeft) / trackOverflow

const HORIZONTAL_SLIDE_SELECTOR = ":scope > article"

const MIN_SLIDES_FOR_SCROLL = 2

const VIEWPORT_HEIGHTS_PER_SLIDE = 1

const SLIDE_TRANSITION_OFFSET = 1
