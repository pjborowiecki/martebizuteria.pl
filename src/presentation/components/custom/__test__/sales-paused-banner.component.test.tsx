import { noop } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"

import { SalesPausedBanner } from "~/src/presentation/components/custom/sales-paused-banner"

const sales = vi.hoisted(() => ({ fetchStatus: vi.fn<() => Promise<{ salesPaused: boolean }>>() }))

vi.mock("~/src/modules/store-setting/use-cases/get-sales-status", async () => {
  const { STORE_SETTING_QUERY_KEYS: keys } = await import("~/src/modules/store-setting/store-setting.constants")

  return { getSalesStatusQuery: () => ({ queryFn: sales.fetchStatus, queryKey: keys.SALES }) }
})

const NOTICE =
  "We have paused orders for a while. You can still browse and keep pieces in your cart, but checkout is closed until we reopen."

beforeEach(() => {
  sales.fetchStatus.mockReset()
})

afterEach(cleanup)

describe("SalesPausedBanner", () => {
  it("tells every shopper that orders are paused while the switch is on", async () => {
    sales.fetchStatus.mockResolvedValue({ salesPaused: true })

    renderWithProviders(<SalesPausedBanner />)

    expect(await screen.findByRole("status")).toHaveTextContent(NOTICE)
  })

  it("stays out of the way while sales are open", async () => {
    sales.fetchStatus.mockResolvedValue({ salesPaused: false })

    const { container, queryClient } = renderWithProviders(<SalesPausedBanner />)

    await vi.waitFor(() => {
      expect(queryClient.getQueryData(STORE_SETTING_QUERY_KEYS.SALES)).toStrictEqual({ salesPaused: false })
    })
    expect(container).toBeEmptyDOMElement()
  })

  it("stays out of the way until the status is known", () => {
    sales.fetchStatus.mockReturnValue(new Promise(noop))

    const { container } = renderWithProviders(<SalesPausedBanner />)

    expect(container).toBeEmptyDOMElement()
  })
})
