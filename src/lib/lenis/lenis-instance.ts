import type Lenis from "lenis";

const lenisStore: { instance: Lenis | undefined } = { instance: undefined };

export function setLenisInstance(instance: Lenis | undefined): void {
  lenisStore.instance = instance;
}

export function getLenisInstance(): Lenis | undefined {
  return lenisStore.instance;
}

/** Align Lenis virtual scroll with the native position TanStack Router just applied. */
export function syncLenisToWindowScroll(): void {
  const lenis = lenisStore.instance;
  if (lenis === undefined) {
    return;
  }

  const targetY = window.scrollY;
  lenis.scrollTo(targetY, { force: true, immediate: true });
  lenis.resize();
}
