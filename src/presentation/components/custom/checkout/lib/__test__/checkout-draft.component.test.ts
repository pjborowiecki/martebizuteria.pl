import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  loadCheckoutSessionId,
  saveCheckoutDraft,
  saveCheckoutSessionId,
  subscribeToCheckoutSessionId,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const STORAGE_KEY = "marte-checkout-draft"

const SESSION_ID_STORAGE_KEY = "marte-checkout-session"

beforeEach(() => {
  sessionStorage.clear()
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("saveCheckoutDraft and loadCheckoutDraft", () => {
  it("reports no draft before anything is saved", () => {
    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("restores the values that were saved", () => {
    saveCheckoutDraft({ city: "Warszawa", email: "shopper@example.com", sameAsShipping: false })

    expect(loadCheckoutDraft()).toStrictEqual({ city: "Warszawa", email: "shopper@example.com", sameAsShipping: false })
  })

  it("wraps the values in a versioned envelope rather than storing them bare", () => {
    saveCheckoutDraft({ email: "shopper@example.com" })

    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null")).toStrictEqual({
      v: 1,
      values: { email: "shopper@example.com" },
    })
  })

  it("replaces the previous draft instead of merging into it", () => {
    saveCheckoutDraft({ city: "Warszawa", email: "shopper@example.com" })
    saveCheckoutDraft({ email: "other@example.com" })

    expect(loadCheckoutDraft()).toStrictEqual({ email: "other@example.com" })
  })

  it("keeps an empty draft so a cleared form is remembered as cleared", () => {
    saveCheckoutDraft({})

    expect(loadCheckoutDraft()).toStrictEqual({})
  })
})

describe("loadCheckoutDraft rejecting untrusted storage", () => {
  it("discards a draft written by an older schema version", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 0, values: { email: "shopper@example.com" } }))

    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("discards an envelope whose values are not an object", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, values: "shopper@example.com" }))

    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("discards bare values stored without an envelope", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email: "shopper@example.com" }))

    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("discards a value that is not JSON at all", () => {
    sessionStorage.setItem(STORAGE_KEY, "{not json")

    expect(loadCheckoutDraft()).toBeUndefined()
  })

  it("discards a JSON null", () => {
    sessionStorage.setItem(STORAGE_KEY, "null")

    expect(loadCheckoutDraft()).toBeUndefined()
  })
})

describe("saveCheckoutSessionId and loadCheckoutSessionId", () => {
  it("reports no open session before one is saved", () => {
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("keeps the open session in storage every tab of the browser shares", () => {
    saveCheckoutSessionId("cs_test_open")

    expect(loadCheckoutSessionId()).toBe("cs_test_open")
    expect(localStorage.getItem(SESSION_ID_STORAGE_KEY)).toBe("cs_test_open")
    expect(sessionStorage.getItem(SESSION_ID_STORAGE_KEY)).toBeNull()
  })

  it("replaces the session the browser held with the one that superseded it", () => {
    saveCheckoutSessionId("cs_test_old")
    saveCheckoutSessionId("cs_test_new")

    expect(loadCheckoutSessionId()).toBe("cs_test_new")
  })
})

describe("subscribeToCheckoutSessionId", () => {
  it("tells a subscriber when this tab saves a session", () => {
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    saveCheckoutSessionId("cs_test_open")
    unsubscribe()

    expect(onChange).toHaveBeenCalledOnce()
  })

  it("tells a subscriber when another tab changes the storage", () => {
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    globalThis.dispatchEvent(new StorageEvent("storage", { key: SESSION_ID_STORAGE_KEY, newValue: "cs_test_other_tab" }))
    unsubscribe()

    expect(onChange).toHaveBeenCalledOnce()
  })

  it("stops telling a subscriber once it unsubscribes", () => {
    const onChange = vi.fn<() => void>()
    subscribeToCheckoutSessionId(onChange)()

    saveCheckoutSessionId("cs_test_open")
    globalThis.dispatchEvent(new StorageEvent("storage", { key: SESSION_ID_STORAGE_KEY }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("clearCheckoutDraft", () => {
  it("forgets the saved draft", () => {
    saveCheckoutDraft({ email: "shopper@example.com" })
    clearCheckoutDraft()

    expect(loadCheckoutDraft()).toBeUndefined()
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it("forgets the open session too and tells subscribers it is gone", () => {
    saveCheckoutSessionId("cs_test_paid")
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    clearCheckoutDraft()
    unsubscribe()

    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("is harmless when there is no draft to forget", () => {
    expect(() => {
      clearCheckoutDraft()
    }).not.toThrow()
  })
})

describe("storage that refuses to cooperate", () => {
  it("keeps checkout usable when the browser blocks access to the storage property", () => {
    vi.spyOn(globalThis, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError")
    })

    expect(loadCheckoutDraft()).toBeUndefined()
    expect(() => {
      saveCheckoutDraft({ email: "shopper@example.com" })
      clearCheckoutDraft()
    }).not.toThrow()
  })

  it("keeps checkout usable when the browser blocks the storage the open session lives in", () => {
    vi.spyOn(globalThis, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage is blocked", "SecurityError")
    })
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(() => {
      saveCheckoutSessionId("cs_test_open")
    }).not.toThrow()
    unsubscribe()

    expect(onChange).not.toHaveBeenCalled()
  })

  it("still announces a session it could not store, so subscribers read storage again", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    saveCheckoutSessionId("cs_test_open")
    unsubscribe()

    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("does not surface a quota error from saving", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError")
    })

    expect(() => {
      saveCheckoutDraft({ email: "shopper@example.com" })
    }).not.toThrow()
  })

  it("reports no draft and no open session when reading throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })

    expect(loadCheckoutDraft()).toBeUndefined()
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("does not surface an error from clearing", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError")
    })

    expect(() => {
      clearCheckoutDraft()
    }).not.toThrow()
  })
})

describe("an environment without web storage", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", undefined)
    vi.stubGlobal("localStorage", undefined)
  })

  it("reports no draft and no open session", () => {
    expect(loadCheckoutDraft()).toBeUndefined()
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("accepts a save without anywhere to put it", () => {
    expect(() => {
      saveCheckoutDraft({ email: "shopper@example.com" })
      saveCheckoutSessionId("cs_test_open")
    }).not.toThrow()
  })

  it("accepts a clear without anywhere to clear", () => {
    expect(() => {
      clearCheckoutDraft()
    }).not.toThrow()
  })
})
