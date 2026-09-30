import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_CUSTOMER } from "~/src/data/order-detail"

import { OrderCustomerCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-customer-card"

afterEach(() => {
  cleanup()
})

describe("OrderCustomerCard", () => {
  it("titles the card and names the customer", () => {
    renderWithProviders(<OrderCustomerCard />)

    expect(screen.getByText("Customer")).toBeInTheDocument()
    expect(screen.getByText(DEMO_CUSTOMER.name)).toBeInTheDocument()
    expect(screen.getByText(DEMO_CUSTOMER.initials)).toBeInTheDocument()
  })

  it("pluralises the order count through the translation", () => {
    renderWithProviders(<OrderCustomerCard />)

    expect(screen.getByText(`${DEMO_CUSTOMER.orders} orders`)).toBeInTheDocument()
  })

  it("shows the customer number next to the order count", () => {
    renderWithProviders(<OrderCustomerCard />)

    expect(screen.getByText(DEMO_CUSTOMER.number)).toBeInTheDocument()
  })

  it("lists the contact details the support team needs", () => {
    renderWithProviders(<OrderCustomerCard />)

    expect(screen.getByText(DEMO_CUSTOMER.email)).toBeInTheDocument()
    expect(screen.getByText(DEMO_CUSTOMER.phone)).toBeInTheDocument()
  })

  it("badges the loyalty tier and offers the profile link", () => {
    renderWithProviders(<OrderCustomerCard />)

    expect(screen.getByText(DEMO_CUSTOMER.tier)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "View profile" })).toBeInTheDocument()
  })
})
