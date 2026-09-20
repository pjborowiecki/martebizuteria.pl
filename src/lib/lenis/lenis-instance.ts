import type Lenis from "lenis"
export const setLenisInstance = (instance: Lenis | undefined): void => {
  lenisStore.instance = instance
}
export const getLenisInstance = (): Lenis | undefined => lenisStore.instance

/** Align Lenis virtual scroll with the native position TanStack Router just applied. */
export const syncLenisToWindowScroll = (): void => {
  const lenis = lenisStore.instance
  if (lenis === undefined) {
    return
  }
  const targetY = window.scrollY
  lenis.scrollTo(targetY, {
    force: true,
    immediate: true,
  })
  lenis.resize()
}
const lenisStore: {
  instance: Lenis | undefined
} = {
  instance: undefined,
}
