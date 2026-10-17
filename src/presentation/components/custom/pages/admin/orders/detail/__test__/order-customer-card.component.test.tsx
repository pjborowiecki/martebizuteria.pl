import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildAdminOrderDetail } from "~/src/presentation/components/custom/pages/admin/orders/detail/__test__/order-detail.fixture"
import { OrderCustomerCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-card"

const order = buildAdminOrderDetail()

afterEach(() => {
  cleanup()
})

describe("OrderCustomerCard", () => {
  it("titles the card and names the customer", () => {
    renderWithProviders(<OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />)

    expect(screen.getByText("Customer")).toBeInTheDocument()
    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("AK")).toBeInTheDocument()
  })

  it("pluralises the order count through the translation", () => {
    renderWithProviders(<OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />)

    expect(screen.getByText("3 orders")).toBeInTheDocument()
  })

  it("lists the contact details the support team needs", () => {
    renderWithProviders(<OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />)

    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
    expect(screen.getByText("+48 600 123 456")).toBeInTheDocument()
  })

  it("shows the account's address and where the order's e-mails go only when they differ from the order's address", () => {
    const moved = buildAdminOrderDetail({
      customer: { ...order.customer, accountEmail: "anna@new.example", recipientEmail: "anna@new.example" },
    })
    renderWithProviders(<OrderCustomerCard currencyCode={moved.currencyCode} customer={moved.customer} />)

    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
    expect(screen.getByText("Account email now: anna@new.example")).toBeInTheDocument()
    expect(
      screen.getByText(
        "The account no longer uses the address this order was placed with, so emails about the order go to anna@new.example.",
      ),
    ).toBeInTheDocument()
  })

  it("leaves both lines out while the order's address is the account's", () => {
    renderWithProviders(<OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />)

    expect(screen.queryByText(/Account email now/u)).not.toBeInTheDocument()
    expect(screen.queryByText(/emails about the order go to/u)).not.toBeInTheDocument()
  })

  it("links to the customer profile for registered customers", () => {
    renderWithProviders(<OrderCustomerCard currencyCode={order.currencyCode} customer={order.customer} />)

    expect(screen.getByRole("link", { name: /View profile/u })).toBeInTheDocument()
  })

  it("marks guest checkouts and hides the profile link", () => {
    const guest = buildAdminOrderDetail({
      customer: { ...order.customer, orderCount: 0, totalSpentMinorUnits: 0, userId: undefined },
    })
    renderWithProviders(<OrderCustomerCard currencyCode={guest.currencyCode} customer={guest.customer} />)

    expect(screen.getByText("Guest checkout")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: /View profile/u })).not.toBeInTheDocument()
  })
})
