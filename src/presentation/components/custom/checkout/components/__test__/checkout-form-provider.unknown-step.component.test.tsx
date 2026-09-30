import { type JSX } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as CheckoutSteps from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

const { navigate } = vi.hoisted<{ navigate: ReturnType<typeof vi.fn<(options: unknown) => void>> }>(() => ({
  navigate: vi.fn<(options: unknown) => void>(),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate, useSearch: () => ({ step: 1 }) }
})

vi.mock("~/src/presentation/components/custom/checkout/lib/checkout-steps", async (importOriginal) => {
  const actual = await importOriginal<typeof CheckoutSteps>()
  const contactOnly = actual.CHECKOUT_STEP_DEFINITIONS.filter((definition) => definition.id === actual.CHECKOUT_STEP_ID.CONTACT)

  return { ...actual, CHECKOUT_STEP_DEFINITIONS: contactOnly }
})

import { CheckoutFormProvider, useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

afterEach(cleanup)

const Probe = (): JSX.Element => {
  const { activeStepIndex, isPending, onEdit, onNext } = useCheckoutForm()

  return (
    <div>
      <output data-testid="active-step">{activeStepIndex}</output>
      <output data-testid="pending">{String(isPending)}</output>
      <button
        onClick={() => {
          void onNext(CHECKOUT_STEP_ID.DELIVERY)
        }}
        type="button"
      >
        next from delivery
      </button>
      <button
        onClick={() => {
          onEdit(CHECKOUT_STEP_ID.DELIVERY)
        }}
        type="button"
      >
        edit delivery
      </button>
    </div>
  )
}

const renderProvider = () =>
  renderWithProviders(
    <CheckoutFormProvider>
      <Probe />
    </CheckoutFormProvider>,
  )

beforeEach(() => {
  navigate.mockReset()
  sessionStorage.clear()
})

describe("CheckoutFormProvider with a step the checkout no longer defines", () => {
  it("ignores a request to continue past a step that has no definition", async () => {
    renderProvider()
    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })

    await userEvent.click(screen.getByRole("button", { name: "next from delivery" }))

    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    expect(screen.getByTestId("pending")).toHaveTextContent("false")
  })

  it("ignores a request to edit a step that has no definition", async () => {
    renderProvider()
    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })

    await userEvent.click(screen.getByRole("button", { name: "edit delivery" }))

    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId("active-step")).toHaveTextContent("0")
  })
})
