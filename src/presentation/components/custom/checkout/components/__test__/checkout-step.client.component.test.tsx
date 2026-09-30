import { type JSX, lazy } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  CHECKOUT_STEP_DEFINITIONS,
  CHECKOUT_STEP_ID,
  type CheckoutStepId,
} from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

interface StepState {
  activeStepIndex: number
  deliveryMethods: { id: string; name: string }[]
  values: Record<string, unknown>
}

const state = vi.hoisted((): StepState => ({
  activeStepIndex: 0,
  deliveryMethods: [{ id: "courier-1", name: "Courier" }],
  values: {},
}))

const onEdit = vi.hoisted(() => vi.fn())

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({
    activeStepIndex: state.activeStepIndex,
    getValues: () => state.values,
    onEdit,
  }),
}))
vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({
  listDeliveryMethodsQuery: () => ({
    queryFn: () => Promise.resolve(state.deliveryMethods),
    queryKey: ["deliveryMethods"],
  }),
}))

import { CheckoutStep } from "~/src/presentation/components/custom/checkout/components/checkout-step.client"

const StepBody = (): JSX.Element => <p>Step body</p>

const LazyStepBody = lazy(() => Promise.resolve({ default: StepBody }))

const stepIndexOf = (stepId: CheckoutStepId): number => CHECKOUT_STEP_DEFINITIONS.findIndex((definition) => definition.id === stepId)

const configFor = (stepId: CheckoutStepId) => {
  const definition = CHECKOUT_STEP_DEFINITIONS[stepIndexOf(stepId)]

  return {
    component: LazyStepBody,
    fields: definition?.fields ?? [],
    id: stepId,
    titleKey: definition?.titleKey ?? "",
  }
}

const renderStep = (stepId: CheckoutStepId) =>
  renderWithProviders(<CheckoutStep stepConfig={configFor(stepId)} stepIndex={stepIndexOf(stepId)} />)

const completeStep = (stepId: CheckoutStepId): void => {
  state.activeStepIndex = stepIndexOf(stepId) + 1
}

describe("CheckoutStep header", () => {
  beforeEach(() => {
    onEdit.mockClear()
    state.activeStepIndex = 0
    state.deliveryMethods = [{ id: "courier-1", name: "Courier" }]
    state.values = {}
  })
  afterEach(cleanup)

  it("numbers the first step with a leading zero", () => {
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.getByText("01")).toBeInTheDocument()
  })

  it("numbers the delivery step by its position", () => {
    state.activeStepIndex = stepIndexOf(CHECKOUT_STEP_ID.DELIVERY)
    renderStep(CHECKOUT_STEP_ID.DELIVERY)

    expect(screen.getByText("03")).toBeInTheDocument()
  })

  it("titles the step from the checkout catalogue", () => {
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.getByText("Contact Details")).toBeInTheDocument()
  })

  it("titles the billing step as the address step", () => {
    state.activeStepIndex = stepIndexOf(CHECKOUT_STEP_ID.BILLING)
    renderStep(CHECKOUT_STEP_ID.BILLING)

    expect(screen.getByText("Address")).toBeInTheDocument()
  })

  it("renders the body of the step that is active", async () => {
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(await screen.findByText("Step body")).toBeInTheDocument()
  })

  it("keeps the body out of the tree while the step is not active", () => {
    state.activeStepIndex = stepIndexOf(CHECKOUT_STEP_ID.DELIVERY)
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.queryByText("Step body")).not.toBeInTheDocument()
  })

  it("outlines a step the customer has not reached yet with a dashed border", () => {
    state.activeStepIndex = stepIndexOf(CHECKOUT_STEP_ID.CONTACT)
    const { container } = renderStep(CHECKOUT_STEP_ID.DELIVERY)
    const step = container.firstElementChild

    expect(step).toHaveClass("border-dashed")
    expect(step).not.toHaveClass("bg-muted/40")
    expect(screen.getByRole("button").textContent).toBe("03Delivery Method")
  })

  it("asks to edit a step the customer already finished", async () => {
    completeStep(CHECKOUT_STEP_ID.CONTACT)
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    await userEvent.click(screen.getByRole("button"))

    expect(onEdit).toHaveBeenCalledWith(CHECKOUT_STEP_ID.CONTACT)
  })

  it("ignores a click on a step that is not finished yet", async () => {
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    await userEvent.click(screen.getByRole("button"))

    expect(onEdit).not.toHaveBeenCalled()
  })
})

describe("CheckoutStep summary", () => {
  beforeEach(() => {
    onEdit.mockClear()
    state.activeStepIndex = 0
    state.deliveryMethods = [{ id: "courier-1", name: "Courier" }]
    state.values = {}
  })
  afterEach(cleanup)

  it("joins the contact email and phone once the step is done", () => {
    completeStep(CHECKOUT_STEP_ID.CONTACT)
    state.values = { email: "anna@example.com", phone: "+48123456789" }
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.getByText("anna@example.com, +48123456789")).toBeInTheDocument()
  })

  it("shows the only contact detail that was filled in", () => {
    completeStep(CHECKOUT_STEP_ID.CONTACT)
    state.values = { email: "anna@example.com", phone: "" }
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
  })

  it("shows no contact summary while nothing was filled in", () => {
    completeStep(CHECKOUT_STEP_ID.CONTACT)
    state.values = { email: "", phone: "" }
    renderStep(CHECKOUT_STEP_ID.CONTACT)

    expect(screen.getByRole("button").textContent).toBe("01Contact Details")
  })

  it("joins the street with the postal code and the city", () => {
    completeStep(CHECKOUT_STEP_ID.BILLING)
    state.values = { address1: "ul. Krucza 1", city: "Warszawa", postalCode: "00-001" }
    renderStep(CHECKOUT_STEP_ID.BILLING)

    expect(screen.getByText("ul. Krucza 1, 00-001 Warszawa")).toBeInTheDocument()
  })

  it("drops the locality from the address summary when it is blank", () => {
    completeStep(CHECKOUT_STEP_ID.BILLING)
    state.values = { address1: "ul. Krucza 1", city: "", postalCode: "" }
    renderStep(CHECKOUT_STEP_ID.BILLING)

    expect(screen.getByText("ul. Krucza 1")).toBeInTheDocument()
  })

  it("omits the address summary when the completed step has been cleared", () => {
    completeStep(CHECKOUT_STEP_ID.BILLING)
    state.values = { address1: "", city: "", postalCode: "" }
    renderStep(CHECKOUT_STEP_ID.BILLING)

    expect(screen.getByRole("button").textContent).toBe("02Address")
  })

  it("names the chosen delivery method", async () => {
    completeStep(CHECKOUT_STEP_ID.DELIVERY)
    state.values = { deliveryMethod: "courier-1", deliveryMethodType: "courier" }
    renderStep(CHECKOUT_STEP_ID.DELIVERY)

    expect(await screen.findByText("Courier")).toBeInTheDocument()
  })

  it("appends the locker code to the method name", async () => {
    completeStep(CHECKOUT_STEP_ID.DELIVERY)
    state.deliveryMethods = [{ id: "locker-1", name: "Parcel locker" }]
    state.values = { deliveryMethod: "locker-1", deliveryMethodType: "locker", lockerId: "WAW01A" }
    renderStep(CHECKOUT_STEP_ID.DELIVERY)

    expect(await screen.findByText("Parcel locker WAW01A")).toBeInTheDocument()
  })

  it("keeps the method name alone when the locker was not picked", async () => {
    completeStep(CHECKOUT_STEP_ID.DELIVERY)
    state.deliveryMethods = [{ id: "locker-1", name: "Parcel locker" }]
    state.values = { deliveryMethod: "locker-1", deliveryMethodType: "locker", lockerId: "" }
    renderStep(CHECKOUT_STEP_ID.DELIVERY)

    expect(await screen.findByText("Parcel locker")).toBeInTheDocument()
  })

  it("shows no delivery summary while the saved method is unknown", () => {
    completeStep(CHECKOUT_STEP_ID.DELIVERY)
    state.values = { deliveryMethod: "removed-method" }
    renderStep(CHECKOUT_STEP_ID.DELIVERY)

    expect(screen.getByRole("button").textContent).toBe("03Delivery Method")
  })

  it("never summarises the payment step", () => {
    completeStep(CHECKOUT_STEP_ID.PAYMENT)
    state.values = { email: "anna@example.com" }
    renderStep(CHECKOUT_STEP_ID.PAYMENT)

    expect(screen.getByRole("button").textContent).toBe("04Payment")
  })
})
