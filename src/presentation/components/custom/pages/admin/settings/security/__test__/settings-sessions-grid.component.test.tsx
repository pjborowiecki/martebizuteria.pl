import { Suspense } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

const mocks = vi.hoisted(() => ({
  fetchSessions: vi.fn<() => Promise<unknown>>(),
  revokeOne: vi.fn<(input: { sessionId: string }) => Promise<unknown>>(),
  revokeOthers: vi.fn<() => Promise<unknown>>(),
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))
vi.mock("~/src/modules/customer-account/use-cases/list-customer-sessions", () => ({
  listCustomerSessionsQuery: () => ({ queryFn: mocks.fetchSessions, queryKey: ["customer-account", "sessions"] }),
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-customer-session", () => ({
  revokeCustomerSessionMutation: { mutationFn: mocks.revokeOne, mutationKey: ["customer-account", "revoke-session"] },
}))
vi.mock("~/src/modules/customer-account/use-cases/revoke-other-customer-sessions", () => ({
  revokeOtherCustomerSessionsMutation: { mutationFn: mocks.revokeOthers, mutationKey: ["customer-account", "revoke-other-sessions"] },
}))

const { SettingsSessionsGrid } =
  await import("~/src/presentation/components/custom/pages/admin/settings/security/components/settings-sessions-grid")

const session = (overrides: Partial<CustomerAccount["session"]> = {}): CustomerAccount["session"] => ({
  browser: "Safari 18",
  createdAt: new Date("2026-10-01T09:00:00.000Z"),
  device: "MacBook Pro",
  deviceType: "desktop",
  id: "session-1",
  ipAddress: "203.0.113.4",
  isCurrent: true,
  lastActiveAt: new Date(),
  ...overrides,
})

const PHONE = session({
  browser: "Chrome 140",
  device: "iPhone",
  deviceType: "mobile",
  id: "session-2",
  ipAddress: undefined,
  isCurrent: false,
  lastActiveAt: new Date("2026-10-02T09:00:00.000Z"),
})

const TABLET = session({ device: "iPad", deviceType: "tablet", id: "session-3", isCurrent: false })

const renderGrid = (sessions: readonly CustomerAccount["session"][] = [session(), PHONE]) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
  })
  queryClient.setQueryData(CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS, sessions)

  return renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <SettingsSessionsGrid />
    </Suspense>,
    { queryClient },
  )
}

const user = () => userEvent.setup({ delay: null })

const row = (device: string): HTMLElement => {
  const element = screen.getByText(device).closest("tr")
  if (element === null) {
    throw new Error(`no row for ${device}`)
  }

  return element
}

const signOutFromMenu = async (device: string) => {
  await user().click(screen.getByRole("button", { name: `Actions for ${device}` }))
  await user().click(await screen.findByRole("menuitem", { name: "Sign out this device" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.fetchSessions.mockRejectedValue(new Error("the sessions are seeded by the test"))
  mocks.revokeOne.mockResolvedValue(true)
  mocks.revokeOthers.mockResolvedValue({ ok: true })
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe("SettingsSessionsGrid", () => {
  it("heads the grid and lists every signed-in device with its browser, address and activity", () => {
    renderGrid([session(), PHONE, TABLET])

    expect(screen.getByRole("heading", { name: "Active sessions" })).toBeInTheDocument()
    expect(within(row("MacBook Pro")).getByText("This device")).toBeInTheDocument()
    expect(row("MacBook Pro")).toHaveTextContent("Safari 18")
    expect(row("MacBook Pro")).toHaveTextContent("203.0.113.4")
    expect(row("MacBook Pro")).toHaveTextContent("Active now")
    expect(row("MacBook Pro")).toHaveTextContent("Oct 1, 2026")
    expect(row("iPhone")).toHaveTextContent("Not recorded")
    expect(row("iPhone")).not.toHaveTextContent("Active now")
    expect(row("iPad")).toHaveTextContent("Active now")
  })

  it("offers no sign-out for the device in use, nor for others while it is the only one", () => {
    renderGrid([session()])

    expect(screen.queryByRole("button", { name: "Actions for MacBook Pro" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Sign out other devices" })).not.toBeInTheDocument()
  })

  it("signs one other device out from its menu", async () => {
    const { queryClient } = renderGrid()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await signOutFromMenu("iPhone")

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Device signed out.")
    })
    expect(mocks.revokeOne.mock.calls[0]?.[0]).toStrictEqual({ sessionId: "session-2" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
  })

  it("reports a device that could not be signed out", async () => {
    mocks.revokeOne.mockRejectedValue(new Error("network"))
    renderGrid()

    await signOutFromMenu("iPhone")

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("We couldn't sign that device out. Please try again.")
    })
  })

  it("signs every other device out from the toolbar", async () => {
    renderGrid()

    await user().click(screen.getByRole("button", { name: "Sign out other devices" }))

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Signed out of your other devices.")
    })
    expect(mocks.revokeOthers).toHaveBeenCalledTimes(1)
  })

  it("shows the bulk sign-out as busy while it runs and reports a failure", async () => {
    const pending = Promise.withResolvers<unknown>()
    mocks.revokeOthers.mockReturnValue(pending.promise)
    renderGrid()

    await user().click(screen.getByRole("button", { name: "Sign out other devices" }))

    expect(screen.getByRole("button", { name: "Sign out other devices" })).toBeDisabled()
    pending.reject(new Error("network"))
    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("We couldn't sign out your other devices. Please try again.")
    })
  })

  it("finds a device by its browser or address", async () => {
    renderGrid()

    fireEvent.change(screen.getByPlaceholderText("Search devices..."), { target: { value: "chrome" } })

    await waitFor(() => {
      expect(screen.queryByText("MacBook Pro")).not.toBeInTheDocument()
    })
    expect(screen.getByText("iPhone")).toBeInTheDocument()
  })

  it("reloads the devices from the toolbar", async () => {
    mocks.fetchSessions.mockReturnValue(new Promise(() => {}))
    renderGrid()

    await user().click(screen.getByRole("button", { name: "Reload table data" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reload table data" })).toBeDisabled()
    })
    expect(mocks.fetchSessions).toHaveBeenCalledTimes(1)
  })
})
