import { type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const deleteAttributes = vi.hoisted(() => vi.fn())

const toastSpies = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("~/src/modules/product-attribute/use-cases/delete-product-attributes", () => ({
  deleteProductAttributesMutation: { mutationFn: deleteAttributes, mutationKey: ["product-attribute", "delete"] },
}))

vi.mock("sonner", () => ({ toast: toastSpies }))

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PRODUCT_ATTRIBUTE_QUERY_KEYS } from "~/src/modules/product-attribute/product-attribute.constants"

import { useDeleteAttributes } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-delete-attributes"

const router = createTestRouter()

const renderDeleteHook = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <TestProviders queryClient={queryClient} router={router}>
      {children}
    </TestProviders>
  )

  return { invalidate, ...renderHook(() => useDeleteAttributes(), { wrapper }) }
}

describe("useDeleteAttributes", () => {
  beforeEach(() => {
    deleteAttributes.mockReset()
    toastSpies.error.mockReset()
    toastSpies.success.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it("reports how many attributes were deleted", async () => {
    deleteAttributes.mockResolvedValue({ deleted: 2, ok: true })
    const { result } = renderDeleteHook()

    result.current.mutate(["attr_1", "attr_2"])

    await waitFor(() => {
      expect(toastSpies.success).toHaveBeenCalledWith("Attributes deleted", { description: "Deleted 2 attribute(s)." })
    })
  })

  it("explains that attributes still in use cannot be deleted", async () => {
    deleteAttributes.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    const { result } = renderDeleteHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith("Couldn't delete", {
        description: "One or more attributes are assigned to products. Remove them from products before deleting.",
      })
    })
  })

  it("falls back to the generic delete error for other failures", async () => {
    deleteAttributes.mockRejectedValue(new Error("network"))
    const { result } = renderDeleteHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(toastSpies.error).toHaveBeenCalledWith("Couldn't delete", {
        description: "The selected attributes could not be deleted. Please try again.",
      })
    })
  })

  it("invalidates both the attribute list and its stats after a successful delete", async () => {
    deleteAttributes.mockResolvedValue({ deleted: 1, ok: true })
    const { invalidate, result } = renderDeleteHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL })
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.STATS })
  })

  it("invalidates the attribute queries after a failed delete too", async () => {
    deleteAttributes.mockRejectedValue(new Error("network"))
    const { invalidate, result } = renderDeleteHook()

    result.current.mutate(["attr_1"])

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL })
    })
  })
})
