import { type JSX, type ReactNode } from "react"

import { type StripeElementsOptionsClientSecret } from "@stripe/stripe-js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

import { STRIPE_FONTS, getStripeAppearance } from "~/src/integrations/stripe/stripe.appearance"
import type * as StripeClient from "~/src/integrations/stripe/stripe.client"

const STRIPE_INSTANCE = { kind: "stripe" }

const elements = vi.hoisted(() => ({
  getStripe: vi.fn<(locale: string) => Promise<object | null>>(),
  options: { current: undefined as StripeElementsOptionsClientSecret | undefined },
  stripe: { current: undefined as object | undefined },
  theme: { current: "light" },
}))

vi.mock("@wrksz/themes/client", () => ({ useTheme: () => ({ theme: elements.theme.current }) }))
vi.mock("~/src/integrations/stripe/stripe.client", async (importOriginal) => {
  const actual = await importOriginal<typeof StripeClient>()

  return {
    ...actual,
    stripeJsQuery: (locale: string) => ({ ...actual.stripeJsQuery(locale), queryFn: () => elements.getStripe(locale) }),
  }
})
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({
    children,
    options,
    stripe,
  }: Readonly<{ children: ReactNode; options: StripeElementsOptionsClientSecret; stripe: object }>): JSX.Element => {
    elements.options.current = options
    elements.stripe.current = stripe

    return <div data-testid="elements">{children}</div>
  },
}))
vi.mock("~/src/presentation/components/custom/pages/account/payment/add-card-fields.client", () => ({
  AddCardFields: ({
    onCancel,
    onFailed,
    onSaved,
  }: Readonly<{ onCancel: () => void; onFailed: () => void; onSaved: () => void }>): JSX.Element => (
    <div>
      <button onClick={onCancel} type="button">
        Cancel adding
      </button>
      <button onClick={onFailed} type="button">
        Card failed
      </button>
      <button onClick={onSaved} type="button">
        Card saved
      </button>
    </div>
  ),
}))

import { AddCardForm } from "~/src/presentation/components/custom/pages/account/payment/add-card-form.client"

const onCancel = vi.fn<() => void>()

const onSetupEnded = vi.fn<() => void>()

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

const renderForm = ({ locale = "en-US", queryClient = createQueryClient() } = {}) =>
  render(
    <IntlProvider locale={locale} messages={TEST_MESSAGES}>
      <QueryClientProvider client={queryClient}>
        <AddCardForm clientSecret="seti_1_secret_a" onCancel={onCancel} onSetupEnded={onSetupEnded} />
      </QueryClientProvider>
    </IntlProvider>,
  )

const cardFields = (): Promise<HTMLElement> => screen.findByTestId("elements")

beforeEach(() => {
  vi.clearAllMocks()
  elements.theme.current = "light"
  elements.options.current = undefined
  elements.stripe.current = undefined
  elements.getStripe.mockReset().mockResolvedValue(STRIPE_INSTANCE)
})

afterEach(cleanup)

describe("AddCardForm", () => {
  it("binds Stripe's card fields to the setup intent the server created once Stripe.js has loaded", async () => {
    renderForm()

    await cardFields()

    expect(elements.options.current?.clientSecret).toBe("seti_1_secret_a")
    expect(elements.stripe.current).toBe(STRIPE_INSTANCE)
  })

  it("shows a placeholder while Stripe.js downloads", () => {
    elements.getStripe.mockReturnValue(new Promise(() => {}))
    renderForm()

    expect(screen.queryByTestId("elements")).toBeNull()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("styles the card fields with the checkout appearance and font", async () => {
    renderForm()

    await cardFields()

    expect(elements.options.current?.appearance).toStrictEqual(getStripeAppearance("light"))
    expect(elements.options.current?.fonts).toBe(STRIPE_FONTS)
  })

  it("switches the card fields to the dark appearance with the shop", async () => {
    elements.theme.current = "dark"
    renderForm()

    await cardFields()

    expect(elements.options.current?.appearance).toStrictEqual(getStripeAppearance("dark"))
  })

  it.each([
    ["pl-PL", "pl"],
    ["en-US", "en"],
  ])("passes Elements the Stripe locale for %s", async (locale, stripeLocale) => {
    renderForm({ locale })

    await cardFields()

    expect(elements.getStripe).toHaveBeenCalledWith(locale)
    expect(elements.options.current?.locale).toBe(stripeLocale)
  })

  it("hands closing back to the wallet page, and ends the setup intent whether the card saved or failed", async () => {
    renderForm()

    await userEvent.click(await screen.findByRole("button", { name: "Cancel adding" }))
    await userEvent.click(screen.getByRole("button", { name: "Card failed" }))
    await userEvent.click(screen.getByRole("button", { name: "Card saved" }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSetupEnded).toHaveBeenCalledTimes(2)
  })
})

describe("AddCardForm without Stripe.js", () => {
  it("explains that the card form could not load when Stripe.js fails to download, and lets the shopper close it", async () => {
    elements.getStripe.mockRejectedValue(new Error("Failed to load Stripe.js"))
    renderForm()

    expect(await screen.findByRole("alert")).toHaveTextContent("The card form could not load. Please try again in a moment.")
    expect(screen.queryByTestId("elements")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it("treats a Stripe.js that resolved to nothing as unavailable", async () => {
    elements.getStripe.mockResolvedValue(null)
    renderForm()

    expect(await screen.findByRole("alert")).toHaveTextContent("The card form could not load. Please try again in a moment.")
  })

  it("tries to download Stripe.js again when the shopper reopens the form", async () => {
    const queryClient = createQueryClient()
    elements.getStripe.mockRejectedValueOnce(new Error("Failed to load Stripe.js"))
    const first = renderForm({ queryClient })
    await screen.findByRole("alert")
    first.unmount()

    renderForm({ queryClient })

    await cardFields()
    expect(elements.getStripe).toHaveBeenCalledTimes(2)
  })
})
