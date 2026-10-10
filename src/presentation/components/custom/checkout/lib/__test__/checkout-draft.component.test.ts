import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  clearCheckoutDraft,
  forgetCheckoutSessionId,
  isCheckoutSessionHeldForCart,
  loadCheckoutDraft,
  loadCheckoutSessionId,
  loadCheckoutSessionIdOnServer,
  saveCheckoutDraft,
  saveCheckoutSession,
  subscribeToCheckoutSessionId,
  wasCheckoutSessionOpenedForAnotherCart,
} from "~/src/presentation/components/custom/checkout/lib/checkout-draft"

const STORAGE_KEY = "marte-checkout-draft"

const SESSION_ID_STORAGE_KEY = "marte-checkout-session"

const RING_AND_TWO_EARRINGS = [
  { qty: 1, variantId: "variant-ring" },
  { qty: 2, variantId: "variant-earring" },
]

const openedForRingAndEarrings = (sessionId: string) => ({ lines: RING_AND_TWO_EARRINGS, sessionId })

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

describe("saveCheckoutSession and loadCheckoutSessionId", () => {
  it("reports no open session before one is saved", () => {
    expect(loadCheckoutSessionId()).toBeUndefined()
  })

  it("keeps the open session and the cart it was opened for in storage every tab of the browser shares", () => {
    const quoted = { lines: [{ qty: 2, unitPrice: 9900, variantId: "variant-earring" }], sessionId: "cs_test_open" }

    saveCheckoutSession(quoted)

    expect(loadCheckoutSessionId()).toBe("cs_test_open")
    expect(JSON.parse(localStorage.getItem(SESSION_ID_STORAGE_KEY) ?? "null")).toStrictEqual({
      cart: "variant-earring:2",
      sessionId: "cs_test_open",
    })
    expect(sessionStorage.getItem(SESSION_ID_STORAGE_KEY)).toBeNull()
  })

  it("replaces the session the browser held with the one that superseded it", () => {
    saveCheckoutSession(openedForRingAndEarrings("cs_test_old"))
    saveCheckoutSession(openedForRingAndEarrings("cs_test_new"))

    expect(loadCheckoutSessionId()).toBe("cs_test_new")
  })
})

describe("loadCheckoutSessionIdOnServer", () => {
  it("holds no session on the server, whatever this browser stored", () => {
    saveCheckoutSession({ lines: [{ qty: 1, variantId: "variant-a" }], sessionId: "cs_test_open" })

    expect(loadCheckoutSessionIdOnServer()).toBeUndefined()
  })
})

describe("loadCheckoutSessionId rejecting untrusted storage", () => {
  it.each([
    { stored: "cs_test_bare", why: "a bare id an older build stored" },
    { stored: JSON.stringify({ sessionId: "cs_test_open" }), why: "a session without the cart it was opened for" },
    { stored: JSON.stringify({ cart: "variant-ring:1", sessionId: 7 }), why: "a session id that is not text" },
    { stored: "null", why: "a JSON null" },
  ])("holds no session for $why", ({ stored }) => {
    localStorage.setItem(SESSION_ID_STORAGE_KEY, stored)

    expect(loadCheckoutSessionId()).toBeUndefined()
  })
})

describe("wasCheckoutSessionOpenedForAnotherCart", () => {
  beforeEach(() => {
    saveCheckoutSession(openedForRingAndEarrings("cs_test_paid"))
  })

  it("matches the cart the held session was opened for, in any order and at any price", () => {
    const sameCart = [
      { qty: 2, rawPrice: 12_900, variantId: "variant-earring" },
      { qty: 1, rawPrice: 18_900, variantId: "variant-ring" },
    ]

    expect(wasCheckoutSessionOpenedForAnotherCart("cs_test_paid", sameCart)).toBe(false)
  })

  it.each([
    { cart: [{ qty: 1, variantId: "variant-ring" }], change: "a line was removed" },
    { cart: [...RING_AND_TWO_EARRINGS, { qty: 1, variantId: "variant-necklace" }], change: "a line was added" },
    {
      cart: [
        { qty: 1, variantId: "variant-ring" },
        { qty: 3, variantId: "variant-earring" },
      ],
      change: "a quantity changed",
    },
  ])("tells the held session apart from a cart in which $change", ({ cart }) => {
    expect(wasCheckoutSessionOpenedForAnotherCart("cs_test_paid", cart)).toBe(true)
  })

  it("knows nothing against a session the browser does not hold", () => {
    expect(wasCheckoutSessionOpenedForAnotherCart("cs_test_other", [])).toBe(false)
  })
})

describe("isCheckoutSessionHeldForCart", () => {
  beforeEach(() => {
    saveCheckoutSession(openedForRingAndEarrings("cs_test_paid"))
  })

  it("recognises the held session for the cart it was opened for, in any order and at any price", () => {
    const sameCart = [
      { qty: 2, rawPrice: 12_900, variantId: "variant-earring" },
      { qty: 1, rawPrice: 18_900, variantId: "variant-ring" },
    ]

    expect(isCheckoutSessionHeldForCart("cs_test_paid", sameCart)).toBe(true)
  })

  it("does not recognise the held session for a cart whose pieces changed", () => {
    expect(isCheckoutSessionHeldForCart("cs_test_paid", [{ qty: 1, variantId: "variant-ring" }])).toBe(false)
  })

  it("does not recognise a session the browser does not hold, whatever the cart", () => {
    expect(isCheckoutSessionHeldForCart("cs_test_other", RING_AND_TWO_EARRINGS)).toBe(false)
  })
})

describe("subscribeToCheckoutSessionId", () => {
  it("tells a subscriber when this tab saves a session", () => {
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    saveCheckoutSession(openedForRingAndEarrings("cs_test_open"))
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

    saveCheckoutSession(openedForRingAndEarrings("cs_test_open"))
    globalThis.dispatchEvent(new StorageEvent("storage", { key: SESSION_ID_STORAGE_KEY }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("forgetCheckoutSessionId", () => {
  it("forgets the held session but keeps the draft, so a fresh checkout starts from the same details", () => {
    saveCheckoutDraft({ email: "shopper@example.com" })
    saveCheckoutSession(openedForRingAndEarrings("cs_test_expired"))
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    forgetCheckoutSessionId("cs_test_expired")
    unsubscribe()

    expect(loadCheckoutSessionId()).toBeUndefined()
    expect(loadCheckoutDraft()).toStrictEqual({ email: "shopper@example.com" })
    expect(onChange).toHaveBeenCalledOnce()
  })

  it("keeps a newer session another tab stored in its place", () => {
    saveCheckoutSession(openedForRingAndEarrings("cs_test_other_tab"))
    const onChange = vi.fn<() => void>()
    const unsubscribe = subscribeToCheckoutSessionId(onChange)

    forgetCheckoutSessionId("cs_test_expired")
    unsubscribe()

    expect(loadCheckoutSessionId()).toBe("cs_test_other_tab")
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
    saveCheckoutSession(openedForRingAndEarrings("cs_test_paid"))
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
      saveCheckoutSession(openedForRingAndEarrings("cs_test_open"))
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

    saveCheckoutSession(openedForRingAndEarrings("cs_test_open"))
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
      saveCheckoutSession(openedForRingAndEarrings("cs_test_open"))
    }).not.toThrow()
  })

  it("accepts a clear without anywhere to clear", () => {
    expect(() => {
      clearCheckoutDraft()
    }).not.toThrow()
  })
})
