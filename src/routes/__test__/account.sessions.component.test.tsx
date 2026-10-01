import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

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

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading sessions</p>}>
      <SessionsPage />
    </Suspense>,
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

  it("says so when there is no session to show", async () => {
    renderPage()

    expect(await screen.findByText("No other active sessions.")).toBeInTheDocument()
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

  it("offers no revoke action on the current session", async () => {
    state.sessions = [session()]
    renderPage()

    await screen.findByText("MacBook Pro")

    expect(screen.getAllByRole("button")).toHaveLength(1)
  })

  it("keeps revoke all disabled while there is nothing else signed in", async () => {
    state.sessions = [session()]
    renderPage()

    expect(await screen.findByRole("button", { name: "Revoke All" })).toBeDisabled()
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

  it("enables revoke all once another device is signed in", async () => {
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    renderPage()

    expect(await screen.findByRole("button", { name: "Revoke All" })).toBeEnabled()
  })

  it("signs the other devices out and refreshes the list", async () => {
    mutations.revokeOthers.mockResolvedValue(1)
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    const { queryClient } = renderPage()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await screen.findByText("iPhone")

    await userEvent.click(screen.getByRole("button", { name: "Revoke All" }))

    expect(mutations.revokeOthers).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
    expect(mutations.toastSuccess).toHaveBeenCalledWith("Other sessions signed out.")
  })

  it("reports a failed bulk revoke", async () => {
    mutations.revokeOthers.mockRejectedValue(new Error("network"))
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    renderPage()
    await screen.findByRole("button", { name: "Revoke All" })

    await userEvent.click(screen.getByRole("button", { name: "Revoke All" }))

    expect(mutations.toastError).toHaveBeenCalledWith("Could not revoke session.")
  })

  it("revokes the single session the customer picked", async () => {
    mutations.revokeOne.mockResolvedValue(true)
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPage()
    await screen.findByText("iPhone")
    const buttons = screen.getAllByRole("button")

    await userEvent.click(buttons.at(-1) ?? document.body)

    expect(mutations.revokeOne.mock.lastCall?.[0]).toStrictEqual({ sessionId: "session-2" })
    expect(mutations.toastSuccess).toHaveBeenCalledWith("Session revoked.")
  })

  it("reports a failed single revoke", async () => {
    mutations.revokeOne.mockRejectedValue(new Error("network"))
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    renderPage()
    await screen.findByText("iPhone")
    const buttons = screen.getAllByRole("button")

    await userEvent.click(buttons.at(-1) ?? document.body)

    expect(mutations.toastError).toHaveBeenCalledWith("Could not revoke session.")
  })
})

describe("account sessions login history", () => {
  it("describes a sign in by its outcome and the address it came from", async () => {
    state.history = [{ createdAt: new Date("2026-02-01T10:00:00.000Z"), ipAddress: "198.51.100.7", status: "success" }]
    renderPage()

    expect(await screen.findByText("from 198.51.100.7")).toBeInTheDocument()
    expect(screen.getAllByText("Success")).toHaveLength(2)
  })

  it("says so when the address behind a sign in was not recorded", async () => {
    state.history = [{ createdAt: new Date("2026-02-01T10:00:00.000Z"), status: "success" }]
    renderPage()

    expect(await screen.findByText("Address not recorded")).toBeInTheDocument()
  })

  it("marks a refused sign in as blocked", async () => {
    state.history = [{ createdAt: new Date("2026-02-01T10:00:00.000Z"), ipAddress: "198.51.100.7", status: "blocked" }]
    renderPage()

    expect(await screen.findAllByText("Blocked")).toHaveLength(2)
  })

  it("keeps the security advice and the account closing block on the page", async () => {
    renderPage()

    expect(await screen.findByText("Security Recommendations")).toBeInTheDocument()
    expect(screen.getByText("Permanently delete account")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Delete Account" })).toBeInTheDocument()
  })
})
