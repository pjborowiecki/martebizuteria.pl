import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const reorderAttributes = vi.hoisted(() => vi.fn())

const toastSpies = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("~/src/modules/product-attribute/use-cases/reorder-product-attributes", () => ({
  reorderProductAttributesMutation: { mutationFn: reorderAttributes, mutationKey: ["product-attribute", "reorder"] },
}))

vi.mock("sonner", () => ({ toast: toastSpies }))

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"

import { useReorderAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-reorder-attributes"

const router = createTestRouter()

const renderReorderHook = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={router}>
      {children}
    </TestProviders>
  )

  return { invalidate, ...renderHook(() => useReorderAttributes(), { wrapper }) }
}

describe("useReorderAttributes", () => {
  beforeEach(() => {
    reorderAttributes.mockReset()
    toastSpies.error.mockReset()
    toastSpies.success.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("sends the new order to the reorder use case", async () => {
    reorderAttributes.mockResolvedValue({ ok: true })
    const { result } = renderReorderHook()

    result.current.mutate(["attr_2", "attr_1"])

    await waitFor(() => {
      expect(reorderAttributes).toHaveBeenCalledWith(["attr_2", "attr_1"], expect.anything())
    })
  })

  it("stays quiet on success", async () => {
    reorderAttributes.mockResolvedValue({ ok: true })
    const { result } = renderReorderHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(toastSpies.success).not.toHaveBeenCalled()
    expect(toastSpies.error).not.toHaveBeenCalled()
  })

  it("warns when the new order could not be saved", async () => {
    reorderAttributes.mockRejectedValue(new Error("network"))
    const { result } = renderReorderHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith("Couldn't save order", {
        description: "The new attribute order could not be saved. Please try again.",
      })
    })
  })

  it("invalidates the attribute list and its stats once the reorder settles", async () => {
    reorderAttributes.mockResolvedValue({ ok: true })
    const { invalidate, result } = renderReorderHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL })
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS })
  })
})
