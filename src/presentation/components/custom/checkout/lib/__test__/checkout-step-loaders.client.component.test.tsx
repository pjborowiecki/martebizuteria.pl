import { type JSX, Suspense, createElement } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/checkout/components/_steps/contact-step", () => ({
  ContactStep: (): JSX.Element => <p>contact step</p>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/address-step", () => ({
  AddressStep: (): JSX.Element => <p>address step</p>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery-step", () => ({
  DeliveryStep: (): JSX.Element => <p>delivery step</p>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/payment-step.client", () => ({
  PaymentStep: (): JSX.Element => <p>payment step</p>,
}))

import { CHECKOUT_STEPS } from "~/src/presentation/components/custom/checkout/lib/checkout-step-loaders.client"
import { CHECKOUT_STEP_DEFINITIONS, CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

afterEach(cleanup)

const renderStep = async (stepId: string, text: string): Promise<void> => {
  const step = CHECKOUT_STEPS.find((candidate) => candidate.id === stepId)
  if (step === undefined) {
    throw new Error(`No checkout step configured for ${stepId}`)
  }

  renderWithProviders(<Suspense fallback={<p>loading</p>}>{createElement(step.component)}</Suspense>)

  expect(await screen.findByText(text)).toBeInTheDocument()
}

describe("CHECKOUT_STEPS shape", () => {
  it("keeps one configured step per definition, in the same order", () => {
    expect(CHECKOUT_STEPS.map((step) => step.id)).toStrictEqual(CHECKOUT_STEP_DEFINITIONS.map((definition) => definition.id))
  })

  it("carries the fields each step validates", () => {
    expect(CHECKOUT_STEPS.map((step) => step.fields)).toStrictEqual(CHECKOUT_STEP_DEFINITIONS.map((definition) => definition.fields))
  })

  it("carries the translation key of each step title", () => {
    expect(CHECKOUT_STEPS.map((step) => step.titleKey)).toStrictEqual(["steps.contact", "steps.billing", "steps.delivery", "steps.payment"])
  })

  it("gives every step its own lazily loaded component", () => {
    const components = new Set(CHECKOUT_STEPS.map((step) => step.component))

    expect(components.size).toBe(CHECKOUT_STEPS.length)
  })
})

describe("CHECKOUT_STEPS loaders", () => {
  it("loads the contact step on demand", async () => {
    await renderStep(CHECKOUT_STEP_ID.CONTACT, "contact step")
  })

  it("loads the address step for the billing stage", async () => {
    await renderStep(CHECKOUT_STEP_ID.BILLING, "address step")
  })

  it("loads the delivery step on demand", async () => {
    await renderStep(CHECKOUT_STEP_ID.DELIVERY, "delivery step")
  })

  it("loads the client-only payment step on demand", async () => {
    await renderStep(CHECKOUT_STEP_ID.PAYMENT, "payment step")
  })
})
