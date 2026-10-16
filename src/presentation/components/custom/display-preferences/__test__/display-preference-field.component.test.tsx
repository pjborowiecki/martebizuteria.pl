import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mocks = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  toastSuccess: vi.fn<(message: string) => void>(),
  update: vi.fn<(input: { preference: string; value: string }) => Promise<boolean>>(),
}))

vi.mock("~/src/modules/user/use-cases/update-display-preference", () => ({
  updateDisplayPreferenceMutation: { mutationFn: mocks.update, mutationKey: ["user", "updateDisplayPreference"] },
}))
vi.mock("~/src/integrations/use-intl/i18n.display-preferences", () => ({
  displayPreferencesQuery: {
    queryFn: () => Promise.reject(new Error("display preferences are seeded by the test")),
    queryKey: ["i18n", "displayPreferences"],
    staleTime: Number.POSITIVE_INFINITY,
  },
}))
vi.mock("sonner", () => ({ toast: { error: mocks.toastError, success: mocks.toastSuccess } }))

import { DISPLAY_PREFERENCES_QUERY_KEY, type SavedDisplayPreferences } from "~/src/integrations/use-intl/i18n.display"

import { DisplayPreferenceField } from "~/src/presentation/components/custom/display-preferences/display-preference-field"
import {
  describeFormatSample,
  useDisplayPreferenceOptions,
} from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"

const NOTHING_SAVED: SavedDisplayPreferences = { formatLocale: undefined, timeZone: undefined }

const Fields = (): JSX.Element => {
  const options = useDisplayPreferenceOptions()

  return (
    <>
      <DisplayPreferenceField
        choice={options.timeZone}
        className=""
        label="Zone"
        labelClassName=""
        preference="timeZone"
        triggerClassName=""
      />
      <DisplayPreferenceField
        choice={options.formatLocale}
        className=""
        label="Format"
        labelClassName=""
        preference="formatLocale"
        triggerClassName=""
      />
    </>
  )
}

const renderFields = (saved: SavedDisplayPreferences = NOTHING_SAVED) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  queryClient.setQueryData(DISPLAY_PREFERENCES_QUERY_KEY, { detected: { formatLocale: "pl-PL", timeZone: "Europe/Warsaw" }, saved })
  renderWithProviders(<Fields />, { queryClient })

  return queryClient
}

const pick = async (label: string, option: string | RegExp) => {
  const user = userEvent.setup({ delay: null })
  await user.click(screen.getByLabelText(label))
  await user.click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue(true)
})

afterEach(cleanup)

describe("DisplayPreferenceField", () => {
  it("shows the detected values as automatic until the user chooses", () => {
    renderFields()

    expect(screen.getByLabelText("Zone")).toHaveTextContent("Automatic (Europe/Warsaw)")
    expect(screen.getByLabelText("Format")).toHaveTextContent(`Automatic (Polish (Poland) — ${describeFormatSample("pl-PL")})`)
  })

  it("shows the values the user saved", () => {
    renderFields({ formatLocale: "en-GB", timeZone: "America/New_York" })

    expect(screen.getByLabelText("Zone")).toHaveTextContent("America/New_York")
    expect(screen.getByLabelText("Format")).toHaveTextContent(`British English — ${describeFormatSample("en-GB")}`)
  })

  it("keeps a saved format locale or time zone the lists do not offer selectable", () => {
    renderFields({ formatLocale: "ko-KR", timeZone: "America/Indiana/Indianapolis" })

    expect(screen.getByLabelText("Format")).toHaveTextContent(`Korean (South Korea) — ${describeFormatSample("ko-KR")}`)
    expect(screen.getByLabelText("Zone")).toHaveTextContent("America/Indiana/Indianapolis")
  })

  it("saves the time zone the user picks, refreshes everything formatted or dated with it and confirms", async () => {
    const queryClient = renderFields()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await pick("Zone", "America/New_York")

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("Preference saved")
    })
    expect(mocks.update.mock.calls[0]?.[0]).toStrictEqual({ preference: "timeZone", value: "America/New_York" })
    expect(invalidate).toHaveBeenCalledExactlyOnceWith()
  })

  it("saves automatic as no choice, so the format follows the browser again", async () => {
    renderFields({ formatLocale: "en-GB", timeZone: undefined })

    await pick("Format", /^Automatic/u)

    await waitFor(() => {
      expect(mocks.update.mock.calls[0]?.[0]).toStrictEqual({ preference: "formatLocale", value: "" })
    })
  })

  it("does not save again when the user reselects the current value", async () => {
    renderFields({ formatLocale: undefined, timeZone: "America/New_York" })

    await pick("Zone", "America/New_York")

    expect(mocks.update).not.toHaveBeenCalled()
  })

  it("reports a save the server refused", async () => {
    mocks.update.mockRejectedValue(new Error("Unknown time zone"))
    renderFields()

    await pick("Zone", "Asia/Tokyo")

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Could not save the preference")
    })
    expect(mocks.toastSuccess).not.toHaveBeenCalled()
  })
})
