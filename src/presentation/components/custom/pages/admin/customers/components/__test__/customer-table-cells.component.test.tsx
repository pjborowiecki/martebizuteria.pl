import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"

import {
  CustomerPhoneCell,
  CustomerStripeCustomerIdCell,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customer-table-cells"

afterEach(() => {
  cleanup()
})

describe("CustomerStripeCustomerIdCell", () => {
  it("shows the Stripe customer id", () => {
    renderWithProviders(<CustomerStripeCustomerIdCell stripeCustomerId="cus_123" />)

    expect(screen.getByText("cus_123")).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_VALUE)).not.toBeInTheDocument()
  })

  it("shows the placeholder for a customer who never reached Stripe", () => {
    renderWithProviders(<CustomerStripeCustomerIdCell stripeCustomerId={null} />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })

  it("treats an empty stored id as no id at all", () => {
    renderWithProviders(<CustomerStripeCustomerIdCell stripeCustomerId="" />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })
})

describe("CustomerPhoneCell", () => {
  it("shows the phone number", () => {
    renderWithProviders(<CustomerPhoneCell phone="+48512345678" />)

    expect(screen.getByText("+48512345678")).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_VALUE)).not.toBeInTheDocument()
  })

  it("shows the placeholder when no phone was given", () => {
    renderWithProviders(<CustomerPhoneCell phone={null} />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })

  it("treats an empty stored phone as no phone at all", () => {
    renderWithProviders(<CustomerPhoneCell phone="" />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })
})
