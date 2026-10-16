import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import {
  ORDER_ID,
  buildAdminOrderDetail,
} from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderSummaryPage } from "~/src/presentation/components/custom/pages/admin/orders/summary/order-summary-page"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("OrderSummaryPage", () => {
  it("titles the page as an order summary with the order number and date", () => {
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("heading", { level: 1, name: "Order summary" })).toBeInTheDocument()
    expect(screen.getByText("Order number").nextSibling).toHaveTextContent("#A1B2C3D4")
    expect(screen.getByText("Order date").nextSibling).toHaveTextContent("March 4, 2026")
  })

  it("says plainly that it is not a VAT invoice", () => {
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("note")).toHaveTextContent(/^This document is not a VAT invoice\.$/u)
  })

  it("shows the seller, the buyer and the lines", () => {
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("heading", { level: 2, name: "Seller" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Buyer" })).toBeInTheDocument()
    expect(screen.getByRole("row", { name: /Aura Hoop I/u })).toBeInTheDocument()
  })

  it("opens the browser's print dialog", async () => {
    const print = vi.fn<() => void>()
    vi.stubGlobal("print", print)
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    await userEvent.click(screen.getByRole("button", { name: "Print" }))

    expect(print).toHaveBeenCalledOnce()
  })

  it("links back to the order", () => {
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("link", { name: "Back to order" })).toHaveAttribute("href", `/admin/orders/${ORDER_ID}`)
  })

  it("keeps the 16px phone margin of the other admin pages and widens it from the small breakpoint", () => {
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(screen.getByRole("main").firstElementChild).toHaveClass("px-4", "sm:px-6", "print:p-0")
  })

  it("keeps the admin light theme on a dark storefront", () => {
    document.documentElement.classList.add("dark")
    renderWithProviders(<OrderSummaryPage order={buildAdminOrderDetail()} />, { queryClient: createSellerDetailsQueryClient() })

    expect(document.documentElement).not.toHaveClass("dark")
  })
})
