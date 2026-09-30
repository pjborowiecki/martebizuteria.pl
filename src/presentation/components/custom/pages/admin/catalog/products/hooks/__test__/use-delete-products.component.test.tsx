import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { PRODUCT_MUTATION_KEYS, PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

import { useDeleteProducts } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-delete-products"
import { useReorderProducts } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-reorder-products"

const mutations = vi.hoisted(() => ({
  deleteProducts: vi.fn((ids: string[]) => Promise.resolve({ deleted: ids.length, ok: true })),
  reorderProducts: vi.fn((ids: string[]) => Promise.resolve({ ok: ids.length > 0 })),
}))

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/modules/product/use-cases/delete-products", async () => {
  const { mutationOptions } = await import("@tanstack/react-query")
  const { PRODUCT_MUTATION_KEYS: keys } = await import("~/src/modules/product/product.constants")

  return {
    deleteProductsMutation: mutationOptions({ mutationFn: mutations.deleteProducts, mutationKey: keys.DELETE }),
  }
})
vi.mock("~/src/modules/product/use-cases/reorder-products", async () => {
  const { mutationOptions } = await import("@tanstack/react-query")
  const { PRODUCT_MUTATION_KEYS: keys } = await import("~/src/modules/product/product.constants")

  return {
    reorderProductsMutation: mutationOptions({ mutationFn: mutations.reorderProducts, mutationKey: keys.REORDER }),
  }
})

const renderProductMutationHook = <TResult,>(hook: () => TResult) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const router = createTestRouter()

  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={router}>
      {children}
    </TestProviders>
  )

  return { ...renderHook(hook, { wrapper }), invalidate }
}

describe("useDeleteProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("keeps the shared delete mutation key so concurrent deletes are tracked together", () => {
    const { result } = renderProductMutationHook(useDeleteProducts)

    expect(result.current.isPending).toBe(false)
    expect(PRODUCT_MUTATION_KEYS.DELETE).toStrictEqual(["product", "deleteProducts"])
  })

  it("announces how many products were deleted", async () => {
    const { result } = renderProductMutationHook(useDeleteProducts)

    result.current.mutate(["product-1", "product-2"])

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledTimes(1)
    })
    expect(mutations.deleteProducts.mock.calls[0]?.[0]).toStrictEqual(["product-1", "product-2"])
    expect(toasts.success).toHaveBeenCalledWith("Products deleted", { description: "Deleted 2 product(s)." })
  })

  it("invalidates the admin list, the admin stats and the storefront products after a delete", async () => {
    const { invalidate, result } = renderProductMutationHook(useDeleteProducts)

    result.current.mutate(["product-1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(3)
    })
    expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toStrictEqual([
      PRODUCT_QUERY_KEYS.ADMIN.ALL,
      PRODUCT_QUERY_KEYS.ADMIN.STATS,
      PRODUCT_QUERY_KEYS.ALL,
    ])
  })

  it("reports a failed delete without claiming anything was removed", async () => {
    mutations.deleteProducts.mockRejectedValueOnce(new Error("delete failed"))
    const { result } = renderProductMutationHook(useDeleteProducts)

    result.current.mutate(["product-1"])

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledTimes(1)
    })
    expect(toasts.error).toHaveBeenCalledWith("Couldn't delete", {
      description: "The selected products could not be deleted. Please try again.",
    })
    expect(toasts.success).not.toHaveBeenCalled()
  })
})

describe("useReorderProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("stays quiet on a successful reorder", async () => {
    const { result } = renderProductMutationHook(useReorderProducts)

    result.current.mutate(["product-2", "product-1"])

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(mutations.reorderProducts.mock.calls[0]?.[0]).toStrictEqual(["product-2", "product-1"])
    expect(toasts.success).not.toHaveBeenCalled()
    expect(toasts.error).not.toHaveBeenCalled()
  })

  it("invalidates the admin list, the admin page and the storefront products after a reorder", async () => {
    const { invalidate, result } = renderProductMutationHook(useReorderProducts)

    result.current.mutate(["product-1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(3)
    })
    expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toStrictEqual([
      PRODUCT_QUERY_KEYS.ADMIN.ALL,
      PRODUCT_QUERY_KEYS.ADMIN.PAGE,
      PRODUCT_QUERY_KEYS.ALL,
    ])
  })

  it("tells the admin the new order could not be saved", async () => {
    mutations.reorderProducts.mockRejectedValueOnce(new Error("reorder failed"))
    const { result } = renderProductMutationHook(useReorderProducts)

    result.current.mutate(["product-1"])

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledTimes(1)
    })
    expect(toasts.error).toHaveBeenCalledWith("Couldn't save order", {
      description: "The new product order could not be saved. Please try again.",
    })
  })
})
