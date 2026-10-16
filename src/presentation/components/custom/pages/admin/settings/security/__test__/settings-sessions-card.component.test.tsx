import { Suspense } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const state = vi.hoisted(() => ({
  history: [] as CustomerAccount["loginHistoryItem"][],
  sessions: [] as CustomerAccount["session"][],
}))

const mocks = vi.hoisted(() => ({
  revokeOthers: vi.fn<() => Promise<boolean>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-sessions", () => ({
  listCustomerSessionsQuery: () => ({ queryFn: () => Promise.resolve(state.sessions), queryKey: ["customer-account", "sessions"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-login-history", () => ({
  listCustomerLoginHistoryQuery: () => ({ queryFn: () => Promise.resolve(state.history), queryKey: ["customer-account", "login-history"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-customer-session", () => ({
  revokeCustomerSessionMutation: { mutationFn: vi.fn(), mutationKey: ["customer-account", "revoke-session"] },
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-other-customer-sessions", () => ({
  revokeOtherCustomerSessionsMutation: { mutationFn: mocks.revokeOthers, mutationKey: ["customer-account", "revoke-other-sessions"] },
}))

const { SettingsLoginHistoryCard } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/settings-login-history-card")
const { SettingsSessionsCard } = await import("~/src/presentation/components/custom/pages/admin/settings/security/settings-sessions-card")

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

const renderSessions = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsSessionsCard />
    </Suspense>,
  )

const signOutOthers = async (): Promise<void> => {
  await userEvent.setup({ delay: null }).click(await screen.findByRole("button", { name: "Sign out other devices" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  state.history = []
  state.sessions = []
})

afterEach(cleanup)

describe("SettingsSessionsCard", () => {
  it("lists the devices signed in and offers no sign-out when this is the only one", async () => {
    state.sessions = [session()]
    renderSessions()

    expect(await screen.findByRole("heading", { name: "Active sessions" })).toBeInTheDocument()
    expect(screen.getByText(/MacBook Pro/u)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out other devices" })).not.toBeInTheDocument()
  })

  it("signs the other devices out and reloads the list", async () => {
    state.sessions = [session(), session({ device: "iPhone", deviceType: "mobile", id: "session-2", isCurrent: false })]
    mocks.revokeOthers.mockResolvedValue(true)
    const { queryClient } = renderSessions()
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries")

    await signOutOthers()

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledOnce()
    })
    expect(mocks.revokeOthers).toHaveBeenCalledOnce()
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
  })

  it("holds the button while the other devices are being signed out", async () => {
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    const pending = Promise.withResolvers<boolean>()
    mocks.revokeOthers.mockReturnValue(pending.promise)
    renderSessions()

    await signOutOthers()

    expect(screen.getByRole("button", { name: "Sign out other devices" })).toBeDisabled()
    pending.resolve(true)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign out other devices" })).toBeEnabled()
    })
  })

  it("says so when the other devices could not be signed out", async () => {
    state.sessions = [session(), session({ id: "session-2", isCurrent: false })]
    mocks.revokeOthers.mockRejectedValue(new Error("network"))
    renderSessions()

    await signOutOthers()

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledOnce()
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})

describe("SettingsLoginHistoryCard", () => {
  it("lists recent sign-in attempts", async () => {
    state.history = [{ createdAt: new Date("2026-02-01T10:00:00.000Z"), ipAddress: "198.51.100.7", status: "failed" }]
    renderWithProviders(
      <Suspense fallback={<p>loading</p>}>
        <SettingsLoginHistoryCard />
      </Suspense>,
    )

    expect(await screen.findByRole("heading", { name: "Sign-in history" })).toBeInTheDocument()
    expect(screen.getByText(/198\.51\.100\.7/u)).toBeInTheDocument()
  })
})
