import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mocks = vi.hoisted(() => {
  const zones = ["Europe/Warsaw", "America/New_York", "Asia/Tokyo"]
  Intl.supportedValuesOf = (key: string) => (key === "timeZone" ? zones : [])

  return {
    sessionKey: ["session", "current"] as const,
    toastError: vi.fn<(message: string) => void>(),
    toastSuccess: vi.fn<(message: string) => void>(),
    updateUser: vi.fn<(input: { timezone: string }) => Promise<{ error?: { message?: string } }>>(),
    zones,
  }
})

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser: mocks.updateUser } }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getCurrentSessionQuery: { queryKey: mocks.sessionKey } }))
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

import { TimezoneField } from "~/src/presentation/components/custom/pages/account/profile/timezone-field"

const renderField = (timezone?: string) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  if (timezone !== undefined) {
    queryClient.setQueryData(mocks.sessionKey, { user: { timezone } })
  }

  renderWithProviders(<TimezoneField />, { queryClient })

  return screen.getByRole("combobox")
}

const pick = async (trigger: HTMLElement, label: string) => {
  const user = userEvent.setup({ delay: null })
  await user.click(trigger)
  await user.click(await screen.findByRole("option", { name: label }))
}

describe("TimezoneField", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateUser.mockResolvedValue({})
  })

  afterEach(() => {
    cleanup()
  })

  it("labels the field and falls back to the store timezone", () => {
    const trigger = renderField()

    expect(screen.getByText("Timezone")).toBeInTheDocument()
    expect(trigger).toHaveTextContent("Europe/Warsaw")
  })

  it("shows the timezone stored on the session", () => {
    expect(renderField("America/New_York")).toHaveTextContent("America/New_York")
  })

  it("saves the timezone the shopper picked and confirms it", async () => {
    const trigger = renderField("Europe/Warsaw")

    await pick(trigger, "America/New_York")

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ timezone: "America/New_York" })
    })
    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Timezone updated")
    })
  })

  it("does not save again when the shopper reselects the current timezone", async () => {
    const trigger = renderField("Europe/Warsaw")

    await pick(trigger, "Europe/Warsaw")

    expect(mocks.updateUser).not.toHaveBeenCalled()
  })

  it.each([{ message: "nope" }, {}])("reports a failed save with error %j", async (error) => {
    mocks.updateUser.mockResolvedValue({ error })
    const trigger = renderField("Europe/Warsaw")

    await pick(trigger, "America/New_York")

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not update timezone")
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})
