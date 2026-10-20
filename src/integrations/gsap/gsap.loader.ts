import type { gsapToolkit } from "~/src/integrations/gsap/gsap.config"

export type GsapToolkit = typeof gsapToolkit

const gsapStore: {
  listeners: Set<() => void>
  pending: Promise<GsapToolkit> | undefined
  toolkit: GsapToolkit | undefined
} = {
  listeners: new Set(),
  pending: undefined,
  toolkit: undefined,
}

const keepLoadedGsap = (toolkit: GsapToolkit): GsapToolkit => {
  gsapStore.toolkit = toolkit
  for (const listener of gsapStore.listeners) {
    listener()
  }

  return toolkit
}

export const loadGsap = (): Promise<GsapToolkit> => {
  gsapStore.pending ??= import("~/src/integrations/gsap/gsap.config").then(
    (config) => keepLoadedGsap(config.gsapToolkit),
    (error: unknown) => {
      gsapStore.pending = undefined
      throw error
    },
  )

  return gsapStore.pending
}

export const provideGsap = (toolkit: GsapToolkit): void => {
  if (typeof document !== "undefined") {
    gsapStore.pending = Promise.resolve(keepLoadedGsap(toolkit))
  }
}

export const getLoadedGsap = (): GsapToolkit | undefined => gsapStore.toolkit

export const subscribeToGsap = (listener: () => void): (() => void) => {
  gsapStore.listeners.add(listener)

  return () => {
    gsapStore.listeners.delete(listener)
  }
}
