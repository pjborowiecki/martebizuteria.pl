import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { useCartHydrated, useCartStore } from "~/src/modules/cart/cart.store"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("useCartHydrated", () => {
  it("reports the store as hydrated once the effect has run", () => {
    const { result } = renderHook(() => useCartHydrated())

    expect(result.current).toBe(true)
  })

  it("starts as not hydrated while the persisted cart is still being read", () => {
    vi.spyOn(useCartStore.persist, "hasHydrated").mockReturnValue(false)

    const { result } = renderHook(() => useCartHydrated())

    expect(result.current).toBe(false)
  })

  it("flips to hydrated when the persisted cart finishes loading", async () => {
    vi.spyOn(useCartStore.persist, "hasHydrated").mockReturnValue(false)
    const { result } = renderHook(() => useCartHydrated())

    await act(async () => {
      await useCartStore.persist.rehydrate()
    })

    expect(result.current).toBe(true)
  })

  it("stops listening for hydration once unmounted", () => {
    const unsubscribe = vi.fn<() => void>()
    vi.spyOn(useCartStore.persist, "onFinishHydration").mockReturnValue(unsubscribe)
    const { unmount } = renderHook(() => useCartHydrated())

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
