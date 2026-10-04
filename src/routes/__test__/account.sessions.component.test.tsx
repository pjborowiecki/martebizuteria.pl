import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT,
  CUSTOMER_ACCOUNT_QUERY_KEYS,
} from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

import polishAccountMessages from "~/messages/pl-PL/pages.account.json"

interface SessionsState {
  history: CustomerAccount["loginHistoryItem"][]
  sessions: CustomerAccount["session"][]
}

const state = vi.hoisted((): SessionsState => ({
  history: [],
  sessions: [],
}))

const mutations = vi.hoisted(() => ({
  revokeOne: vi.fn(),
  revokeOthers: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("sonner", () => ({ toast: { error: mutations.toastError, success: mutations.toastSuccess } }))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-sessions", () => ({
  listCustomerSessionsQuery: () => ({ queryFn: () => Promise.resolve(state.sessions), queryKey: ["customer-account", "sessions"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-login-history", () => ({
  listCustomerLoginHistoryQuery: () => ({ queryFn: () => Promise.resolve(state.history), queryKey: ["customer-account", "login-history"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-customer-session", () => ({
  revokeCustomerSessionMutation: { mutationFn: mutations.revokeOne, mutationKey: ["customer-account", "revoke-session"] },
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-other-customer-sessions", () => ({
  revokeOtherCustomerSessionsMutation: { mutationFn: mutations.revokeOthers, mutationKey: ["customer-account", "revoke-other-sessions"] },
}))

import { Route } from "~/src/routes/account.sessions"

const SessionsPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the sessions route renders no component")
  }

  return <Page />
}

const session = (overrides: Partial<CustomerAccount["session"]> = {}): CustomerAccount["session"] => ({
  browser: "Safari 18",
  createdAt: new Date("2026-01-01T09:00:00.000Z"),
  device: "MacBook Pro",
  deviceType: "desktop",
  id: "session-1",
  isCurrent: true,
  lastActiveAt: new Date(),
  ...overrides,
})

const historyEntry = (minutesAgo: number): CustomerAccount["loginHistoryItem"] => ({
  createdAt: new Date(Date.UTC(2026, 1, 1, 10, 0) - minutesAgo * 60_000),
  ipAddress: "198.51.100.7",
  status: "success",
})

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading sessions</p>}>
      <SessionsPage />
    </Suspense>,
  )

const renderPolishPage = () =>
  renderWithProviders(
    <IntlProvider locale="pl-PL" messages={{ pages: { account: polishAccountMessages } }} timeZone={I18N.DEFAULT_TIMEZONE}>
      <Suspense fallback={<p>loading sessions</p>}>
        <SessionsPage />
      </Suspense>
    </IntlProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  state.history = []
  state.sessions = []
})

afterEach(cleanup)

describe("account sessions page", () => {
  it("titles the security page", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1, name: "Active Sessions" })).toBeInTheDocument()
    expect(screen.getByText("Security")).toBeInTheDocument()
  })

  it("tells the customer when this is the only device signed in", async () => {
    state.sessions = [session()]
    renderPage()

    expect(await screen.findByText("You're signed in on this device only.")).toBeInTheDocument()
  })

  it("says so when there is no login history", async () => {
    renderPage()

    expect(await screen.findByText("No login history yet.")).toBeInTheDocument()
  })

  it("lists every device with its browser and address", async () => {
    state.sessions = [session({ ipAddress: "203.0.113.4" })]
    renderPage()

    expect(await screen.findByText("MacBook Pro")).toBeInTheDocument()
    expect(screen.getByText("Safari 18 · 203.0.113.4")).toBeInTheDocument()
  })

  it("leaves the address out when the session has none", async () => {
    state.sessions = [session()]
    renderPage()

    expect(await screen.findByText("Safari 18")).toBeInTheDocument()
  })

  it("marks the session the customer is using", async () => {
    state.sessions = [session()]
    renderPage()

    expect(await screen.findByText("Current Session")).toBeInTheDocument()
  })

  it("calls a session used moments ago active now", async () => {
    state.sessions = [session({ lastActiveAt: new Date(Date.now() - 60_000) })]
    renderPage()

    expect(await screen.findByText("Active now")).toBeInTheDocument()
  })

  it("dates a session that has been idle for hours", async () => {
    state.sessions = [session({ lastActiveAt: new Date(Date.now() - 7_200_000) })]
    renderPage()

    await screen.findByText("MacBook Pro")

    expect(screen.queryByText("Active now")).toBeNull()
  })

  it("offers no sign-out action at all while this is the only device", async () => {
    state.sessions = [session()]
    renderPage()

    await screen.findByText("MacBook Pro")

    expect(screen.queryAllByRole("button")).toHaveLength(0)
  })

  it("points two-factor advice at the profile settings", async () => {
    renderPage()

    expect(await screen.findByText("Turn on two-factor authentication in your profile settings.")).toBeInTheDocument()
  })

  it("leaves closing the account to the profile page", async () => {
    renderPage()

    expect(await screen.findByText("Security Recommendations")).toBeInTheDocument()
    expect(screen.queryByText("Permanently delete account")).toBeNull()
    expect(screen.queryByRole("link", { name: "Delete Account" })).toBeNull()
  })
})

describe("account sessions revoking", () => {
  it("names the device each revoke control signs out, without hiding it behind a hover", async () => {
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPage()
    await screen.findByText("iPhone")

    const revoke = screen.getByRole("button", { name: "Sign out iPhone" })

    expect(revoke).toBeVisible()
    expect(revoke.className).not.toContain("opacity-0")
  })

  it("offers to sign out the other devices once another one is signed in", async () => {
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    renderPage()

    expect(await screen.findByRole("button", { name: "Sign out other devices" })).toBeEnabled()
    expect(screen.queryByText("You're signed in on this device only.")).toBeNull()
  })

  it("signs the other devices out and refreshes the list", async () => {
    mutations.revokeOthers.mockResolvedValue({ ok: true })
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await screen.findByText("iPhone")

    await userEvent.click(screen.getByRole("button", { name: "Sign out other devices" }))

    expect(mutations.revokeOthers).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
    expect(mutations.toastSuccess).toHaveBeenCalledWith("Signed out of your other devices.")
  })

  it("reports a failed bulk sign-out", async () => {
    mutations.revokeOthers.mockRejectedValue(new Error("network"))
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Sign out other devices" }))

    expect(mutations.toastError).toHaveBeenCalledWith("We couldn't sign out your other devices. Please try again.")
  })

  it("signs out the single device the customer picked", async () => {
    mutations.revokeOne.mockResolvedValue(true)
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Sign out iPhone" }))

    expect(mutations.revokeOne.mock.lastCall?.[0]).toStrictEqual({ sessionId: "session-2" })
    expect(mutations.toastSuccess).toHaveBeenCalledWith("Device signed out.")
  })

  it("reports a failed single sign-out", async () => {
    mutations.revokeOne.mockRejectedValue(new Error("network"))
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPage()

    await userEvent.click(await screen.findByRole("button", { name: "Sign out iPhone" }))

    expect(mutations.toastError).toHaveBeenCalledWith("We couldn't sign that device out. Please try again.")
  })
})

describe("account sessions login history", () => {
  it("states a successful sign-in once, with the address it came from", async () => {
    state.history = [historyEntry(0)]
    renderPage()

    expect(await screen.findByText("from 198.51.100.7")).toBeInTheDocument()
    expect(screen.getAllByText("Successful sign-in")).toHaveLength(1)
  })

  it("says so when the address behind a sign in was not recorded", async () => {
    state.history = [{ createdAt: new Date("2026-02-01T10:00:00.000Z"), status: "success" }]
    renderPage()

    expect(await screen.findByText("Address not recorded")).toBeInTheDocument()
  })

  it("calls a rejected password a failed attempt rather than a block", async () => {
    state.history = [{ ...historyEntry(0), status: "failed" }]
    renderPage()

    expect(await screen.findAllByText("Failed sign-in attempt")).toHaveLength(1)
    expect(screen.queryByText("Blocked")).toBeNull()
  })

  it("says the history stops at the newest attempts once it reaches the limit", async () => {
    state.history = Array.from({ length: CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT }, (_, index) => historyEntry(index))
    renderPage()

    expect(
      await screen.findByText(`Showing your ${String(CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT)} most recent sign-in attempts.`),
    ).toBeInTheDocument()
  })

  it("adds no limit note to a history shorter than the limit", async () => {
    state.history = Array.from({ length: CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT - 1 }, (_, index) => historyEntry(index))
    renderPage()

    await screen.findAllByText("Successful sign-in")

    expect(screen.queryByText(/most recent sign-in attempts/u)).toBeNull()
  })
})

describe("account sessions page in Polish", () => {
  it("names each sign-in outcome once and says the history stops at the newest attempts", async () => {
    state.history = [
      { ...historyEntry(0), status: "failed" },
      ...Array.from({ length: CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT - 1 }, (_, index) => historyEntry(index + 1)),
    ]
    renderPolishPage()

    expect(
      await screen.findByText(`Pokazujemy ${String(CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT)} ostatnich prób logowania.`),
    ).toBeInTheDocument()
    expect(screen.getAllByText("Nieudana próba logowania")).toHaveLength(1)
    expect(screen.getAllByText("Udane logowanie")).toHaveLength(CUSTOMER_ACCOUNT_LOGIN_HISTORY_LIMIT - 1)
  })

  it("says this is the only device signed in, with nothing to sign out", async () => {
    state.sessions = [session()]
    renderPolishPage()

    expect(await screen.findByText("Nie masz aktywnych sesji na innych urządzeniach.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Wyloguj pozostałe urządzenia" })).toBeNull()
  })

  it("offers to sign out the other devices once another one is signed in", async () => {
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPolishPage()

    expect(await screen.findByRole("button", { name: "Wyloguj pozostałe urządzenia" })).toBeEnabled()
  })
})
