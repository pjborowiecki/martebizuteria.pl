import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { StubBroadcastChannel } from "~/src/platform/testing/mocks/broadcast-channel"

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

import { ProductsRefreshAction } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-refresh-action"

const REFRESH_LABEL = "Reload table data"

const PRODUCT_DETAIL_KEY = [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "lapis"]

vi.stubGlobal("BroadcastChannel", StubBroadcastChannel)

const newQueryClient = (): QueryClient => new QueryClient({ defaultOptions: { queries: { retry: false } } })

beforeEach(() => {
  StubBroadcastChannel.posted.mockClear()
})

afterEach(() => {
  cleanup()
})

describe("ProductsRefreshAction", () => {
  it("offers an enabled reload action while nothing is loading", () => {
    renderWithProviders(<ProductsRefreshAction />, { queryClient: newQueryClient() })

    expect(screen.getByRole("button", { name: REFRESH_LABEL })).toBeEnabled()
  })

  it("drops the cached product queries off screen when pressed, without telling the browser's other tabs", () => {
    const queryClient = newQueryClient()
    queryClient.setQueryData(PRODUCT_DETAIL_KEY, { handle: "lapis" })
    renderWithProviders(<ProductsRefreshAction />, { queryClient })
    fireEvent.click(screen.getByRole("button", { name: REFRESH_LABEL }))

    expect(queryClient.getQueryState(PRODUCT_DETAIL_KEY)).toBeUndefined()
    expect(StubBroadcastChannel.posted).not.toHaveBeenCalled()
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
