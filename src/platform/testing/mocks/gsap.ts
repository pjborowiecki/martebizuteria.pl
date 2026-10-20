interface GsapContextStub {
  readonly add: (run: () => unknown) => unknown
  readonly revert: () => void
}

export const createGsapContextStub = (): GsapContextStub => {
  const cleanups: (() => void)[] = []

  return {
    add: (run) => {
      const result = run()
      if (typeof result === "function") {
        cleanups.push(result as () => void)
      }

      return result
    },
    revert: () => {
      for (const cleanup of cleanups.splice(0).toReversed()) {
        cleanup()
      }
    },
  }
}

export const loadedGsapModule = <Toolkit extends object>(toolkit: Toolkit) => ({
  getLoadedGsap: () => toolkit,
  loadGsap: () => Promise.resolve(toolkit),
  provideGsap: () => {},
  subscribeToGsap: () => () => {},
})
