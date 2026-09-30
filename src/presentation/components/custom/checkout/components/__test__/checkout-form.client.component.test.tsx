import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CHECKOUT_STEP_DEFINITIONS } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  CheckoutFormProvider: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <form>{children}</form>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-step.client", () => ({
  CheckoutStep: ({ stepConfig, stepIndex }: Readonly<{ stepConfig: { id: string }; stepIndex: number }>): JSX.Element => (
    <li>{`${String(stepIndex)}:${stepConfig.id}`}</li>
  ),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-summary", () => ({
  CheckoutSummary: (): JSX.Element => <p>Summary placeholder</p>,
}))

import { CheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form.client"

afterEach(cleanup)

describe("CheckoutForm", () => {
  it("reassures the customer that the checkout is secure", () => {
    renderWithProviders(<CheckoutForm />)

    expect(screen.getByText("Secure Checkout")).toBeInTheDocument()
  })

  it("lays out one step per checkout definition in order", () => {
    renderWithProviders(<CheckoutForm />)

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toStrictEqual(
      CHECKOUT_STEP_DEFINITIONS.map((definition, index) => `${String(index)}:${definition.id}`),
    )
  })

  it("titles the order column", () => {
    renderWithProviders(<CheckoutForm />)

    expect(screen.getByText("Your order")).toBeInTheDocument()
  })

  it("sends the edit link back to the cart", () => {
    renderWithProviders(<CheckoutForm />)

    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/cart")
  })

  it("renders the order summary beside the steps", () => {
    renderWithProviders(<CheckoutForm />)

    expect(screen.getByText("Summary placeholder")).toBeInTheDocument()
  })
})
