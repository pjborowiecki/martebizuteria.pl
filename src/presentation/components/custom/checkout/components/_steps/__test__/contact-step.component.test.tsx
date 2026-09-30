import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type Control, type UseFormGetValues, type UseFormSetValue, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const { checkoutForm, sessionState } = vi.hoisted(() => ({
  checkoutForm: { isPending: false, onNext: vi.fn<(stepId: string, event?: unknown) => Promise<void>>() },
  sessionState: { email: undefined as string | undefined },
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => checkoutForm,
}))
vi.mock("~/src/integrations/better-auth/auth.session", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getCurrentSessionQuery: queryOptions({
      queryFn: () => (sessionState.email === undefined ? undefined : { user: { email: sessionState.email } }),
      queryKey: ["session", "current"],
    }),
  }
})

const { ContactStep } = await import("~/src/presentation/components/custom/checkout/components/_steps/contact-step")
const { CHECKOUT_STEP_ID } = await import("~/src/presentation/components/custom/checkout/lib/checkout-steps")

interface HarnessForm {
  control: Control<CheckoutFormSchema>
  getValues: UseFormGetValues<CheckoutFormSchema>
  isPending: boolean
  onNext: (stepId: string, event?: unknown) => Promise<void>
  setValue: UseFormSetValue<CheckoutFormSchema>
}

const ContactStepHarness = ({ email = "", phone = "" }: Readonly<{ email?: string; phone?: string }>): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({ defaultValues: { email, phone } })
  const harness: HarnessForm = {
    control: form.control,
    getValues: form.getValues,
    isPending: checkoutForm.isPending,
    onNext: checkoutForm.onNext,
    setValue: form.setValue,
  }
  Object.assign(checkoutForm, harness)

  return <ContactStep />
}

beforeEach(() => {
  checkoutForm.onNext.mockReset()
  checkoutForm.onNext.mockResolvedValue()
  checkoutForm.isPending = false
  sessionState.email = undefined
})

afterEach(() => {
  cleanup()
})

describe("ContactStep fields", () => {
  it("asks for an email address and a phone number", () => {
    renderWithProviders(<ContactStepHarness />)

    expect(screen.getByLabelText(/Email/u)).toBeInTheDocument()
    expect(screen.getByLabelText(/Mobile Phone/u)).toBeInTheDocument()
  })

  it("marks both fields as required", () => {
    renderWithProviders(<ContactStepHarness />)

    expect(screen.getByLabelText(/Email/u)).toHaveAttribute("aria-required", "true")
    expect(screen.getByLabelText(/Mobile Phone/u)).toHaveAttribute("aria-required", "true")
  })

  it("uses the email input type, so mobile keyboards help", () => {
    renderWithProviders(<ContactStepHarness />)

    expect(screen.getByLabelText(/Email/u)).toHaveAttribute("type", "email")
  })

  it("shows the value the form already holds", () => {
    renderWithProviders(<ContactStepHarness email="anna@example.com" />)

    expect(screen.getByLabelText(/Email/u)).toHaveValue("anna@example.com")
  })
})

describe("ContactStep email prefill", () => {
  it("fills the signed-in shopper's email into an empty field", async () => {
    sessionState.email = "anna@example.com"
    renderWithProviders(<ContactStepHarness />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/u)).toHaveValue("anna@example.com")
    })
  })

  it("leaves an email the shopper already typed alone", async () => {
    sessionState.email = "anna@example.com"
    renderWithProviders(<ContactStepHarness email="guest@example.com" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/u)).toHaveValue("guest@example.com")
    })
  })

  it("leaves the field empty for a guest", async () => {
    renderWithProviders(<ContactStepHarness />)

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/u)).toHaveValue("")
    })
  })
})

describe("ContactStep continue button", () => {
  it("advances the checkout from the contact step", async () => {
    renderWithProviders(<ContactStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: /Address/u }))

    expect(checkoutForm.onNext.mock.calls[0]?.[0]).toBe(CHECKOUT_STEP_ID.CONTACT)
  })

  it("is disabled while the checkout is working", () => {
    checkoutForm.isPending = true
    renderWithProviders(<ContactStepHarness />)

    expect(screen.getByRole("button", { name: /Address/u })).toBeDisabled()
  })

  it("does not advance the checkout while it is working", async () => {
    checkoutForm.isPending = true
    renderWithProviders(<ContactStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: /Address/u }))

    expect(checkoutForm.onNext).not.toHaveBeenCalled()
  })
})
