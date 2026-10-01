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
  updateUser: vi.fn<(input: { timezone: string }) => Promise<{ error?: { message?: string } }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser: mocks.updateUser } }))
vi.mock("~/src/modules/session/session.constants", () => ({ SESSION_QUERY_KEYS: { CURRENT: mocks.sessionKey } }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: mocks.toastSuccess } }))
vi.mock("~/src/modules/newsletter/use-cases/get-own-newsletter-subscription", () => ({
  getOwnNewsletterSubscriptionQuery: () => ({
    queryFn: () => Promise.resolve({ status: mocks.status.current }),
    queryKey: mocks.subscriptionKey,
  }),
}))
vi.mock("~/src/modules/newsletter/use-cases/subscribe-to-newsletter", () => ({
  subscribeToNewsletterMutation: { mutationFn: mocks.subscribe, mutationKey: ["newsletter", "subscribe"] },
}))
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-own-newsletter", () => ({
  unsubscribeOwnNewsletterMutation: { mutationFn: mocks.unsubscribe, mutationKey: ["newsletter", "unsubscribeOwn"] },
}))

import { PreferencesSection } from "~/src/presentation/components/custom/pages/account/profile/sections/preferences-section"

const renderSection = (options: { readonly subscription?: string; readonly timezone?: string } = {}) => {
  mocks.status.current = options.subscription
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(mocks.subscriptionKey, { status: options.subscription })

  return renderWithProviders(<PreferencesSection email="anna@example.com" timezone={options.timezone} />, { queryClient })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updateUser.mockResolvedValue({})
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

  it("offers the timezone control", () => {
    renderSection()

    expect(screen.getByLabelText("Timezone")).toBeInTheDocument()
  })

  it("shows the timezone the profile carries", () => {
    renderSection({ timezone: "America/New_York" })

    expect(screen.getByRole("combobox")).toHaveTextContent("America/New_York")
  })

  it("falls back to the store timezone when the profile carries none", () => {
    renderSection()

    expect(screen.getByRole("combobox")).toHaveTextContent("Europe/Warsaw")
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

  it("says so while a signup is still waiting on the confirmation email", () => {
    renderSection({ subscription: "pending" })

    expect(screen.getByText("Awaiting your email confirmation")).toBeInTheDocument()
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
