import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { syncQueryInvalidation } = vi.hoisted(() => ({ syncQueryInvalidation: vi.fn() }))

vi.mock("~/src/integrations/tanstack-query/query.sync", () => ({ syncQueryInvalidation }))

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

import { ProductsRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-refresh-action"

const REFRESH_LABEL = "Reload table data"

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  syncQueryInvalidation.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("ProductsRefreshAction", () => {
  it("offers an enabled reload action while nothing is loading", () => {
    renderWithProviders(<ProductsRefreshAction />, { queryClient: newQueryClient() })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })

  it("invalidates the admin product queries when pressed", () => {
    const queryClient = newQueryClient()
    renderWithProviders(<ProductsRefreshAction />, { queryClient })
    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(syncQueryInvalidation).toHaveBeenCalledWith(queryClient, PRODUCT_QUERY_KEYS.ADMIN.ALL)
  })

  it("waits while the admin product queries are loading", () => {
    const queryClient = newQueryClient()
    const pending = Promise.withResolvers<number>()
    void queryClient.query({ queryFn: () => pending.promise, queryKey: PRODUCT_QUERY_KEYS.ADMIN.ALL })
    renderWithProviders(<ProductsRefreshAction />, { queryClient })
    const button = screen.getByRole("button", { name: REFRESH_LABEL })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute("aria-busy", "true")
  })
})
