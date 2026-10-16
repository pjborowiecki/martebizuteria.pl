import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/modules/user/use-cases/update-display-preference", () => ({
  updateDisplayPreferenceMutation: { mutationFn: () => Promise.resolve(true), mutationKey: ["user", "updateDisplayPreference"] },
}))
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  displayPreferencesQuery: {
    queryFn: () => Promise.reject(new Error("display preferences are seeded by the test")),
    queryKey: ["i18n", "displayPreferences"],
    staleTime: Number.POSITIVE_INFINITY,
  },
}))

import { DISPLAY_PREFERENCES_QUERY_KEY } from "~/src/integrations/use-intl/i18n.display"

import { SettingsPreferencesCard } from "~/src/presentation/components/custom/pages/admin/settings/account/settings-preferences-card"

const navigation = { assign: vi.fn<(url: string) => void>(), pathname: "/en-US/admin/settings/account", search: "?from=menu" }

const renderCard = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(DISPLAY_PREFERENCES_QUERY_KEY, {
    detected: { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" },
    saved: { formatLocale: undefined, timeZone: undefined },
  })

  return renderWithProviders(<SettingsPreferencesCard />, { queryClient })
}

const pick = async (label: string, option: string) => {
  const user = userEvent.setup({ delay: null })
  await user.click(screen.getByLabelText(label))
  await user.click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal("location", navigation)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("SettingsPreferencesCard", () => {
  it("offers the panel language, the time zone and the date and number format", () => {
    renderCard()

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument()
    expect(screen.getByLabelText("Admin panel language")).toHaveTextContent("English")
    expect(screen.getByLabelText("Time zone")).toBeInTheDocument()
    expect(screen.getByLabelText("Date and number format")).toBeInTheDocument()
  })

  it("reopens the same page in the other language, keeping its query", async () => {
    renderCard()

    await pick("Admin panel language", "Polski")

    expect(navigation.assign).toHaveBeenCalledWith("/admin/settings/account?from=menu")
  })

  it("stays put when the current language is chosen again", async () => {
    renderCard()

    await pick("Admin panel language", "English")

    expect(navigation.assign).not.toHaveBeenCalled()
  })
})
