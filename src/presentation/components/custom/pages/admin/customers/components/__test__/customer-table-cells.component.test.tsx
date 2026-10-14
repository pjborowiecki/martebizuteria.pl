import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { markAsCut } from "~/src/platform/testing/lib/cut-text"
import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"

import {
  CustomerPhoneCell,
  CustomerStripeCustomerIdCell,
} from "~/src/presentation/components/custom/pages/admin/customers/components/customer-table-cells"

const LONG_PHONE = "+48 22 123 45 67 wew. 1234"

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

  it("cuts a long phone number short inside its column and shows it in full on hover", async () => {
    renderWithProviders(<CustomerPhoneCell phone={LONG_PHONE} />)
    const phone = screen.getByText(LONG_PHONE)

    expect(phone).toHaveClass("truncate", "min-w-0", "font-mono")

    await userEvent.hover(markAsCut(phone))

    expect(await screen.findByText(LONG_PHONE, { selector: "[data-slot='tooltip-content']" })).toBeInTheDocument()
  })

  it("treats an empty stored phone as no phone at all", () => {
    renderWithProviders(<CustomerPhoneCell phone="" />)

    expect(screen.getByText(EMPTY_VALUE)).toBeInTheDocument()
  })
})
