import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

const { deleteRequest, reorderRequest, toastError, toastSuccess } = vi.hoisted(() => ({
  deleteRequest: vi.fn(),
  reorderRequest: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/modules/product-category/use-cases/delete-categories", () => ({
  deleteCategoriesMutation: { mutationFn: deleteRequest, mutationKey: ["product-category", "deleteCategories"] },
}))
vi.mock("~/src/modules/product-category/use-cases/reorder-categories", () => ({
  reorderCategoriesMutation: { mutationFn: reorderRequest, mutationKey: ["product-category", "reorderCategories"] },
}))

import { CATEGORY_ERROR_CODES, CATEGORY_QUERY_KEYS } from "~/src/modules/product-category/product-category.constants"

import { useDeleteCategories } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-delete-categories"
import { useReorderCategories } from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-reorder-categories"

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })

const Providers = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone="Europe/Warsaw">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
)

const DELETE_ERROR_TITLE = "Couldn't delete"

beforeEach(() => {
  deleteRequest.mockReset()
  reorderRequest.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
})

describe("useDeleteCategories", () => {
  it("passes the selected ids to the delete use case", async () => {
    deleteRequest.mockResolvedValueOnce({ deleted: 2, ok: true })
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await result.current.mutateAsync(["cat-1", "cat-2"])
    })

    expect(deleteRequest).toHaveBeenCalledWith(["cat-1", "cat-2"], expect.anything())
  })

  it("confirms how many categories were deleted", async () => {
    deleteRequest.mockResolvedValueOnce({ deleted: 3, ok: true })
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await result.current.mutateAsync(["cat-1", "cat-2", "cat-3"])
    })

    expect(toastSuccess).toHaveBeenCalledWith("Categories deleted", { description: "Deleted 3 category(ies)." })
  })

  it("explains that child categories block the delete", async () => {
    deleteRequest.mockRejectedValueOnce(new Error(CATEGORY_ERROR_CODES.HAS_CHILDREN))
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-1"])).rejects.toThrow(CATEGORY_ERROR_CODES.HAS_CHILDREN)
    })

    expect(toastError).toHaveBeenCalledWith(DELETE_ERROR_TITLE, {
      description: "Remove or reassign child categories before deleting a parent category.",
    })
  })

  it("explains that assigned products block the delete", async () => {
    deleteRequest.mockRejectedValueOnce(new Error(CATEGORY_ERROR_CODES.HAS_PRODUCTS))
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-1"])).rejects.toThrow(CATEGORY_ERROR_CODES.HAS_PRODUCTS)
    })

    expect(toastError).toHaveBeenCalledWith(DELETE_ERROR_TITLE, {
      description: "Reassign or remove products from these categories before deleting them.",
    })
  })

  it("falls back to the generic delete failure copy", async () => {
    deleteRequest.mockRejectedValueOnce(new Error("D1_ERROR"))
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-1"])).rejects.toThrow("D1_ERROR")
    })

    expect(toastError).toHaveBeenCalledWith(DELETE_ERROR_TITLE, {
      description: "The selected categories could not be deleted. Please try again.",
    })
  })

  it("handles a provider rejection that is not an Error and still refreshes stale lists", async () => {
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    deleteRequest.mockRejectedValueOnce({ reason: "database unavailable" })
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-1"])).rejects.toStrictEqual({ reason: "database unavailable" })
    })

    expect(toastError).toHaveBeenCalledWith(DELETE_ERROR_TITLE, {
      description: "The selected categories could not be deleted. Please try again.",
    })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ALL })
    invalidateQueries.mockRestore()
  })

  it("does not announce success when the delete failed", async () => {
    deleteRequest.mockRejectedValueOnce(new Error("D1_ERROR"))
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-1"])).rejects.toThrow("D1_ERROR")
    })

    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("refreshes the admin and storefront category lists once the delete settles", async () => {
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    deleteRequest.mockResolvedValueOnce({ deleted: 1, ok: true })
    const { result } = renderHook(() => useDeleteCategories(), { wrapper: Providers })

    await act(async () => {
      await result.current.mutateAsync(["cat-1"])
    })

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ALL })
    invalidateQueries.mockRestore()
  })
})

describe("useReorderCategories", () => {
  it("passes the new order to the reorder use case", async () => {
    reorderRequest.mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useReorderCategories(), { wrapper: Providers })

    await act(async () => {
      await result.current.mutateAsync(["cat-2", "cat-1"])
    })

    expect(reorderRequest).toHaveBeenCalledWith(["cat-2", "cat-1"], expect.anything())
    expect(toastError).not.toHaveBeenCalled()
  })

  it("reports that the new order could not be saved", async () => {
    reorderRequest.mockRejectedValueOnce(new Error("D1_ERROR"))
    const { result } = renderHook(() => useReorderCategories(), { wrapper: Providers })

    await act(async () => {
      await expect(result.current.mutateAsync(["cat-2", "cat-1"])).rejects.toThrow("D1_ERROR")
    })

    expect(toastError).toHaveBeenCalledWith("Couldn't save order", {
      description: "The new category order could not be saved. Please try again.",
    })
  })

  it("refreshes the admin and storefront category lists once the reorder settles", async () => {
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    reorderRequest.mockResolvedValueOnce({ ok: true })
    const { result } = renderHook(() => useReorderCategories(), { wrapper: Providers })

    await act(async () => {
      await result.current.mutateAsync(["cat-2", "cat-1"])
    })

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ADMIN.ALL })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CATEGORY_QUERY_KEYS.ALL })
    invalidateQueries.mockRestore()
  })
})
