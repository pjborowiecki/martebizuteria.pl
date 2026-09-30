import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderCustomerCell } from "~/src/presentation/components/custom/pages/admin/orders/components/order-customer-cell"

afterEach(() => {
  cleanup()
})

describe("OrderCustomerCell", () => {
  it("shows the customer name, initials, reference and email", () => {
    renderWithProviders(<OrderCustomerCell customer="Anna Kowalska" customerId="CUST-0042" email="anna@example.com" initials="AK" />)

    expect(screen.getByText("Anna Kowalska")).toBeInTheDocument()
    expect(screen.getByText("AK")).toBeInTheDocument()
    expect(screen.getByText("CUST-0042")).toBeInTheDocument()
    expect(screen.getByText(/anna@example\.com/u)).toBeInTheDocument()
  })

  it("separates the reference from the email with a middot", () => {
    renderWithProviders(<OrderCustomerCell customer="Anna Kowalska" customerId="CUST-0042" email="anna@example.com" initials="AK" />)

    expect(screen.getByText("·")).toBeInTheDocument()
  })

  it("shows only the email for a guest without a customer reference", () => {
    renderWithProviders(<OrderCustomerCell customer="Guest" customerId="" email="guest@example.com" initials="G" />)

    expect(screen.getByText("guest@example.com")).toBeInTheDocument()
    expect(screen.queryByText("·")).not.toBeInTheDocument()
  })
})
