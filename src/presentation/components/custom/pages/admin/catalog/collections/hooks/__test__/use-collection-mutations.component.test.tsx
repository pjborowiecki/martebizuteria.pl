import { type JSX, type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"

import { useDeleteCollections } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections"
import { useReorderCollections } from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-reorder-collections"

const stubs = vi.hoisted(() => ({
  deleteCollections: vi.fn<(ids: string[]) => Promise<{ deleted: number; ok: boolean }>>(),
  reorderCollections: vi.fn<(ids: string[]) => Promise<{ ok: boolean }>>(),
  toastError: vi.fn<(title: string, options: { description: string }) => void>(),
  toastSuccess: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: stubs.toastError, success: stubs.toastSuccess } }))
vi.mock("~/src/modules/product-collection/use-cases/delete-collections", () => ({
  deleteCollectionsMutation: { mutationFn: stubs.deleteCollections, mutationKey: ["collection", "deleteCollections"] },
}))
vi.mock("~/src/modules/product-collection/use-cases/reorder-collections", () => ({
  reorderCollectionsMutation: { mutationFn: stubs.reorderCollections, mutationKey: ["collection", "reorderCollections"] },
}))

const { deleteCollections, reorderCollections, toastError, toastSuccess } = stubs

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })

const wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone={I18N.DEFAULT_TIMEZONE}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe("useDeleteCollections", () => {
  it("reports how many collections were deleted", async () => {
    deleteCollections.mockResolvedValue({ deleted: 3, ok: true })
    const { result } = renderHook(() => useDeleteCollections(), { wrapper })

    result.current.mutate(["col-1", "col-2", "col-3"])

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Collections deleted", { description: "Deleted 3 collection(s)." })
    })
    expect(deleteCollections.mock.calls[0]?.[0]).toStrictEqual(["col-1", "col-2", "col-3"])
  })

  it("explains that products must be reassigned when the server reports a conflict", async () => {
    deleteCollections.mockRejectedValue(new AppError(ERROR_CODES.CONFLICT))
    const { result } = renderHook(() => useDeleteCollections(), { wrapper })

    result.current.mutate(["col-1"])

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Couldn't delete", {
        description: "Reassign or remove products from these collections before deleting them.",
      })
    })
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("falls back to the generic delete failure for any other error", async () => {
    deleteCollections.mockRejectedValue(new Error("network down"))
    const { result } = renderHook(() => useDeleteCollections(), { wrapper })

    result.current.mutate(["col-1"])

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Couldn't delete", {
        description: "The selected collections could not be deleted. Please try again.",
      })
    })
  })

  it("invalidates both the admin and the storefront collection caches once it settles", async () => {
    deleteCollections.mockResolvedValue({ deleted: 1, ok: true })
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useDeleteCollections(), { wrapper })

    result.current.mutate(["col-1"])

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COLLECTION_QUERY_KEYS.ADMIN.ALL })
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COLLECTION_QUERY_KEYS.ALL })
    invalidateQueries.mockRestore()
  })
})

describe("useReorderCollections", () => {
  it("sends the new order to the server without announcing anything on success", async () => {
    reorderCollections.mockResolvedValue({ ok: true })
    const { result } = renderHook(() => useReorderCollections(), { wrapper })

    result.current.mutate(["col-2", "col-1"])

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })
    expect(reorderCollections.mock.calls[0]?.[0]).toStrictEqual(["col-2", "col-1"])
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("warns that the order could not be saved when the server refuses it", async () => {
    reorderCollections.mockRejectedValue(new Error("conflict"))
    const { result } = renderHook(() => useReorderCollections(), { wrapper })

    result.current.mutate(["col-2", "col-1"])

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Couldn't save order", {
        description: "The new collection order could not be saved. Please try again.",
      })
    })
  })

  it("refreshes the collection caches after a reorder attempt", async () => {
    reorderCollections.mockResolvedValue({ ok: true })
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useReorderCollections(), { wrapper })

    result.current.mutate(["col-2", "col-1"])

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COLLECTION_QUERY_KEYS.ALL })
    })
    invalidateQueries.mockRestore()
  })
})
