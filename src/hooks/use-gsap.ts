import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react"

import { type GsapToolkit, getLoadedGsap, loadGsap, subscribeToGsap } from "~/src/integrations/gsap/gsap.loader"

type GsapSetup = (toolkit: GsapToolkit) => void | (() => void)

type GsapContext = ReturnType<GsapToolkit["gsap"]["context"]>

interface GsapOptions {
  readonly dependencies?: readonly unknown[]
  readonly load?: boolean
  readonly revertOnUpdate?: boolean
  readonly scope?: RefObject<Element | null>
}

interface GsapRun {
  readonly context: GsapContext
  readonly dependencies: readonly unknown[]
}

const NO_DEPENDENCIES: readonly unknown[] = []

const sameDependencies = (left: readonly unknown[], right: readonly unknown[]): boolean =>
  left.length === right.length && left.every((entry, index) => Object.is(entry, right[index]))

export const useGsapToolkit = (load: boolean): GsapToolkit | undefined => {
  const toolkit = useSyncExternalStore(subscribeToGsap, getLoadedGsap, getLoadedGsap)
  useEffect(() => {
    if (load) {
      void loadGsap()
    }
  }, [load])

  return toolkit
}

export const useGsap = (
  setup: GsapSetup | undefined,
  { dependencies = NO_DEPENDENCIES, load = true, revertOnUpdate = false, scope }: GsapOptions = {},
) => {
  const toolkit = useGsapToolkit(load)
  const contextRef = useRef<GsapContext | undefined>(undefined)
  const lastRunRef = useRef<GsapRun | undefined>(undefined)
  useLayoutEffect(() => {
    if (toolkit === undefined) {
      return
    }
    const context = toolkit.gsap.context(() => {}, scope)
    contextRef.current = context

    return () => {
      context.revert()
      contextRef.current = undefined
    }
  }, [scope, toolkit])
  useLayoutEffect(() => {
    const context = contextRef.current
    const lastRun = lastRunRef.current
    if (toolkit === undefined || context === undefined || setup === undefined) {
      return
    }
    if (lastRun?.context === context && sameDependencies(lastRun.dependencies, dependencies)) {
      return
    }
    if (revertOnUpdate && lastRun?.context === context) {
      context.revert()
    }
    lastRunRef.current = { context, dependencies }
    context.add(() => setup(toolkit))
  })

  const contextSafe = useCallback(
    <Args extends unknown[]>(handler: (loaded: GsapToolkit, ...args: Args) => void) =>
      (...args: Args): void => {
        const context = contextRef.current
        if (toolkit === undefined || context === undefined) {
          void loadGsap()

          return
        }
        context.add(() => {
          handler(toolkit, ...args)
        })
      },
    [toolkit],
  )

  return { contextSafe, toolkit }
}
