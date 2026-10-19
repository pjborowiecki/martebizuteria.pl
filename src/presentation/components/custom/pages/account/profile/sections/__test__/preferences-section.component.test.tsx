import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mocks = vi.hoisted(() => ({
  sessionKey: ["session", "current"] as const,
  status: { current: undefined as string | undefined },
  subscribe: vi.fn<(variables: { email: string; source: string }) => Promise<unknown>>(),
  subscriptionKey: ["newsletter", "ownSubscription"] as const,
  toastSuccess: vi.fn<(message: string) => void>(),
  unsubscribe: vi.fn<() => Promise<unknown>>(),
  updateDisplayPreference: vi.fn<(input: { preference: string; value: string }) => Promise<boolean>>(),
}))

vi.mock("~/src/modules/user/use-cases/update-display-preference", () => ({
  updateDisplayPreferenceMutation: { mutationFn: mocks.updateDisplayPreference, mutationKey: ["user", "updateDisplayPreference"] },
}))
vi.mock("~/src/modules/session/session.constants", () => ({ SESSION_QUERY_KEYS: { CURRENT: mocks.sessionKey } }))
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  displayPreferencesQuery: {
    queryFn: () => Promise.reject(new Error("display preferences are seeded by the test")),
    queryKey: ["i18n", "displayPreferences"],
    staleTime: Number.POSITIVE_INFINITY,
  },
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: mocks.toastSuccess } }))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/get-own-newsletter-subscription", () => ({
  getOwnNewsletterSubscriptionQuery: () => ({
    queryFn: () => Promise.resolve({ status: mocks.status.current }),
    queryKey: mocks.subscriptionKey,
  }),
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter", () => ({
  subscribeToNewsletterMutation: { mutationFn: mocks.subscribe, mutationKey: ["newsletter", "subscribe"] },
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/unsubscribe-own-newsletter", () => ({
  unsubscribeOwnNewsletterMutation: { mutationFn: mocks.unsubscribe, mutationKey: ["newsletter", "unsubscribeOwn"] },
}))

import { DISPLAY_PREFERENCES_QUERY_KEY } from "~/src/integrations/use-intl/i18n.display"

import { PreferencesSection } from "~/src/presentation/components/custom/pages/account/profile/sections/preferences-section"

const renderSection = (options: { readonly subscription?: string; readonly timeZone?: string } = {}) => {
  mocks.status.current = options.subscription
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(mocks.subscriptionKey, { status: options.subscription })
  queryClient.setQueryData(DISPLAY_PREFERENCES_QUERY_KEY, {
    detected: { formatLocale: "en-GB", timeZone: "Europe/Warsaw" },
    saved: { formatLocale: undefined, timeZone: options.timeZone },
  })

  return renderWithProviders(<PreferencesSection email="anna@example.com" />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateDisplayPreference.mockResolvedValue(true)
  mocks.subscribe.mockResolvedValue({ outcome: "confirmationSent" })
  mocks.unsubscribe.mockResolvedValue({ unsubscribed: true })
  mocks.status.current = undefined
})

afterEach(cleanup)

describe("PreferencesSection", () => {
  it("heads the section with the preferences label", () => {
    renderSection()

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument()
  })

  it("offers the time zone and the date and number format", () => {
    renderSection()

    expect(screen.getByLabelText("Time zone")).toBeInTheDocument()
    expect(screen.getByLabelText("Date and number format")).toBeInTheDocument()
  })

  it("shows the time zone the customer chose", () => {
    renderSection({ timeZone: "America/New_York" })

    expect(screen.getByLabelText("Time zone")).toHaveTextContent("America/New_York")
  })

  it("follows the detected time zone and format until the customer chooses", () => {
    renderSection()

    expect(screen.getByLabelText("Time zone")).toHaveTextContent("Automatic (Europe/Warsaw)")
    expect(screen.getByLabelText("Date and number format")).toHaveTextContent("Automatic (British English")
  })
})

describe("PreferencesSection newsletter", () => {
  it("says a customer who never signed up is not subscribed, and offers to subscribe", () => {
    renderSection()

    expect(screen.getByText("Not Subscribed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Subscribe" })).toBeInTheDocument()
  })

  it("says a confirmed customer is subscribed, and offers to leave", () => {
    renderSection({ subscription: "confirmed" })

    expect(screen.getByText("Subscribed")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeInTheDocument()
  })

  it("says a pending signup is not confirmed yet without claiming an email is waiting", () => {
    renderSection({ subscription: "pending" })

    expect(screen.getByText("Not confirmed yet")).toBeInTheDocument()
  })

  it("offers to resend the confirmation email while the signup awaits it", () => {
    renderSection({ subscription: "pending" })

    expect(screen.getByRole("button", { name: "Resend email" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Unsubscribe" })).toBeEnabled()
  })

  it("signs the customer up with their own address and says to check the inbox", async () => {
    renderSection()

    await userEvent.click(screen.getByRole("button", { name: "Subscribe" }))

    await waitFor(() => {
      expect(mocks.subscribe.mock.calls[0]?.[0]).toMatchObject({ email: "anna@example.com", source: "account" })
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Check your inbox to confirm your subscription.")
  })

  it("lets a subscribed customer leave the list from the account", async () => {
    renderSection({ subscription: "confirmed" })

    await userEvent.click(screen.getByRole("button", { name: "Unsubscribe" }))

    await waitFor(() => {
      expect(mocks.unsubscribe).toHaveBeenCalled()
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith("You are no longer subscribed.")
  })
})
