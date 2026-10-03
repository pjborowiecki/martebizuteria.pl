import { type JSX, type MouseEvent, useEffect } from "react"

import type * as TanStackRouter from "@tanstack/react-router"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { navigate, searchState } = vi.hoisted<{
  navigate: ReturnType<typeof vi.fn<(options: unknown) => void>>
  searchState: { step: number | undefined }
}>(() => ({
  navigate: vi.fn<(options: unknown) => void>(),
  searchState: { step: 1 },
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanStackRouter>("@tanstack/react-router")

  return { ...actual, useNavigate: () => navigate, useSearch: () => searchState }
})

import { CheckoutFormProvider, useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

afterEach(cleanup)

const DRAFT_KEY = "marte-checkout-draft"

const contactDraft = {
  v: 1,
  values: { email: "anna@example.com", phone: "+48512345678" },
}

const Probe = (): JSX.Element => {
  const { activeStepIndex, checkoutSession, control, isFormValid, isPending, onEdit, onNext, setCheckoutSession, setValue } =
    useCheckoutForm()
  const email = useWatch({ control, name: "email" })

  return (
    <div>
      <output data-testid="active-step">{activeStepIndex}</output>
      <output data-testid="form-valid">{String(isFormValid)}</output>
      <output data-testid="pending">{String(isPending)}</output>
      <output data-testid="email">{email}</output>
      <output data-testid="session">{checkoutSession?.sessionId ?? "none"}</output>
      <output data-testid="prevented">{String(prevented.value)}</output>
      <button
        onClick={() => {
          void onNext(CHECKOUT_STEP_ID.CONTACT)
        }}
        type="button"
      >
        next from contact
      </button>
      <button
        onClick={() => {
          void onNext(CHECKOUT_STEP_ID.BILLING)
        }}
        type="button"
      >
        next from address
      </button>
      <button
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          void onNext(CHECKOUT_STEP_ID.PAYMENT, event)
          prevented.value = event.defaultPrevented
        }}
        type="button"
      >
        next from payment
      </button>
      <button
        onClick={() => {
          onEdit(CHECKOUT_STEP_ID.CONTACT)
        }}
        type="button"
      >
        edit contact
      </button>
      <button
        onClick={() => {
          setValue("email", "typed@example.com")
        }}
        type="button"
      >
        type email
      </button>
      <button
        onClick={() => {
          setCheckoutSession({
            amount: 24_900,
            clientSecret: "cs_test",
            linesFingerprint: "v-1:2",
            sessionId: "cs_live_1",
            valuesFingerprint: "checkout-values",
          })
        }}
        type="button"
      >
        store session
      </button>
    </div>
  )
}

const prevented = { value: false }

interface FirstEffectState {
  readonly activeStepIndex: number
  readonly email: string
}

const FirstEffectProbe = ({ onFirstEffect }: Readonly<{ onFirstEffect: (state: FirstEffectState) => void }>): undefined => {
  const { activeStepIndex, getValues } = useCheckoutForm()
  useEffect(() => {
    onFirstEffect({ activeStepIndex, email: getValues("email") })
  }, [activeStepIndex, getValues, onFirstEffect])

  return undefined
}

const renderProvider = () =>
  renderWithProviders(
    <CheckoutFormProvider>
      <Probe />
    </CheckoutFormProvider>,
  )

beforeEach(() => {
  navigate.mockReset()
  searchState.step = 1
  prevented.value = false
  sessionStorage.clear()
})

describe("useCheckoutForm", () => {
  it("refuses to hand out context outside the provider", () => {
    expect(() => renderWithProviders(<Probe />)).toThrow("useCheckoutForm must be used within CheckoutFormProvider")
  })
})

describe("CheckoutFormProvider step selection", () => {
  it("defaults to contact when the URL has no step parameter", async () => {
    searchState.step = undefined
    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })
  })

  it("starts on the first step for a fresh checkout", async () => {
    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })
    expect(screen.getByTestId("form-valid")).toHaveTextContent("false")
    expect(screen.getByTestId("pending")).toHaveTextContent("false")
  })

  it("pulls a requested later step back to the furthest reachable one", async () => {
    searchState.step = 3
    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })
  })

  it("lets the second step be reached once contact details are restored from the draft", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(contactDraft))
    searchState.step = 2

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("1")
    })
  })

  it("clamps a step number beyond the last step", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(contactDraft))
    searchState.step = 99

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("1")
    })
  })
})

describe("CheckoutFormProvider draft persistence", () => {
  it("restores the saved contact details into the form", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(contactDraft))

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("anna@example.com")
    })
  })

  it("gives a remounted step the saved draft and its reachable step from its first effect", () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(contactDraft))
    searchState.step = 4
    const onFirstEffect = vi.fn<(state: FirstEffectState) => void>()

    renderWithProviders(
      <CheckoutFormProvider>
        <FirstEffectProbe onFirstEffect={onFirstEffect} />
      </CheckoutFormProvider>,
    )

    expect(onFirstEffect).toHaveBeenNthCalledWith(1, { activeStepIndex: 1, email: "anna@example.com" })
  })

  it("ignores a draft written by an older schema version", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ v: 0, values: { email: "stale@example.com" } }))

    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("email")).toBeEmptyDOMElement()
    })
  })

  it("writes every edit back into the draft", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "type email" }))

    await waitFor(() => {
      expect(sessionStorage.getItem(DRAFT_KEY)).toContain("typed@example.com")
    })
  })
})

describe("CheckoutFormProvider navigation", () => {
  it("refuses to advance while the current step is invalid", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "next from contact" }))

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("0")
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("advances to the next step once the current one validates", async () => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(contactDraft))
    renderProvider()
    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("anna@example.com")
    })

    await userEvent.click(screen.getByRole("button", { name: "next from contact" }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: { step: 2 }, to: "." })
    })
  })

  it("stops the browser from submitting the step form itself", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "next from payment" }))

    await waitFor(() => {
      expect(screen.getByTestId("prevented")).toHaveTextContent("true")
    })
  })

  it("sends the customer back to the step they asked to edit", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "edit contact" }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ search: { step: 1 }, to: "." })
    })
  })
})

describe("CheckoutFormProvider optional address validation", () => {
  it.each([
    { field: "address2", length: 513 },
    { field: "province", length: 257 },
  ])("keeps a restored overlong $field on the address step and blocks Continue", async ({ field, length }) => {
    sessionStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        v: 1,
        values: {
          ...contactDraft.values,
          address1: "Krucza 1",
          city: "Warszawa",
          countryCode: "PL",
          deliveryMethod: "courier",
          firstName: "Anna",
          lastName: "Kowalska",
          postalCode: "00-001",
          [field]: "a".repeat(length),
        },
      }),
    )
    searchState.step = 4
    renderProvider()

    await waitFor(() => {
      expect(screen.getByTestId("active-step")).toHaveTextContent("1")
    })
    await userEvent.click(screen.getByRole("button", { name: "next from address" }))

    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByTestId("form-valid")).toHaveTextContent("false")
  })
})

describe("CheckoutFormProvider payment session", () => {
  it("has no checkout session before payment starts", () => {
    renderProvider()

    expect(screen.getByTestId("session")).toHaveTextContent("none")
  })

  it("keeps the created checkout session for the payment step", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "store session" }))

    expect(screen.getByTestId("session")).toHaveTextContent("cs_live_1")
  })
})
