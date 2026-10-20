import { noop } from "@tanstack/react-query"

const RELOADED_AT_KEY = "marte-stale-chunk-reloaded-at"

const RELOAD_GUARD_MS = 10_000

const page = { leaving: false }

const markLeaving = (): void => {
  page.leaving = true
}

const markShown = (): void => {
  page.leaving = false
}

const isServedByThisDeploy = async (): Promise<boolean> => {
  const response = await fetch(import.meta.url, { cache: "no-store", method: "HEAD" })

  return response.ok
}

const reloadIfDeployReplacedChunks = async (): Promise<void> => {
  if (await isServedByThisDeploy()) {
    return
  }

  const now = Date.now()
  if (page.leaving || now - Number(sessionStorage.getItem(RELOADED_AT_KEY)) < RELOAD_GUARD_MS) {
    return
  }

  sessionStorage.setItem(RELOADED_AT_KEY, String(now))
  globalThis.location.reload()
}

const reloadAfterStaleChunk = (): void => {
  reloadIfDeployReplacedChunks().catch(noop)
}

export const listenForStaleChunks = (): void => {
  globalThis.addEventListener("beforeunload", markLeaving)
  globalThis.addEventListener("pagehide", markLeaving)
  globalThis.addEventListener("pageshow", markShown)
  globalThis.addEventListener("vite:preloadError", reloadAfterStaleChunk)
}
