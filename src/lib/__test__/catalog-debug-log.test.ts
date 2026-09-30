import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { catalogDebugLog } from "~/src/lib/catalog-debug-log"

const info = vi.spyOn(console, "info").mockImplementation(() => {})

describe("catalogDebugLog", () => {
  beforeEach(() => {
    info.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("prefixes the label so catalog traces stay greppable", () => {
    catalogDebugLog("create-category")

    expect(info).toHaveBeenCalledExactlyOnceWith("[catalog] create-category")
  })

  it("appends the payload as a second argument so devtools keeps it inspectable", () => {
    const payload = { handle: "rings" }
    catalogDebugLog("create-category", payload)

    expect(info).toHaveBeenCalledExactlyOnceWith("[catalog] create-category", payload)
  })

  it("logs an explicitly null payload rather than treating it as absent", () => {
    catalogDebugLog("create-category", null)

    expect(info).toHaveBeenCalledExactlyOnceWith("[catalog] create-category", null)
  })

  it("stays silent outside development builds", () => {
    vi.stubEnv("DEV", false)
    catalogDebugLog("create-category", { handle: "rings" })

    expect(info).not.toHaveBeenCalled()
  })
})
