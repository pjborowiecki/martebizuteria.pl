import { getLenisInstance } from "~/src/lib/lenis/lenis-instance"

const DEFAULT_SECTION_SCROLL_DURATION_S = 0.9
const REDUCED_MOTION_MEDIA_QUERY = "(prefers-reduced-motion: reduce)"

export const scrollToSectionElement = (element: HTMLElement, headerOffsetPx: number): void => {
  const lenis = getLenisInstance()
  const prefersReducedMotion = globalThis.matchMedia(REDUCED_MOTION_MEDIA_QUERY).matches
  if (lenis !== undefined) {
    lenis.scrollTo(element, {
      duration: prefersReducedMotion ? 0 : DEFAULT_SECTION_SCROLL_DURATION_S,
      immediate: prefersReducedMotion,
      offset: -headerOffsetPx,
    })
    return
  }
  const top = element.getBoundingClientRect().top + window.scrollY - headerOffsetPx
  window.scrollTo({
    behavior: prefersReducedMotion ? "instant" : "smooth",
    top,
  })
}

export const scrollToSectionById = (id: string, headerOffsetPx: number): HTMLElement | undefined => {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
  if (element === null) {
    return undefined
  }
  scrollToSectionElement(element, headerOffsetPx)
  return element
}
