import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterAll, afterEach, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

const { supportedValuesOf } = vi.hoisted(() => {
  const original = Intl.supportedValuesOf
  Object.defineProperty(Intl, "supportedValuesOf", { configurable: true, value: undefined, writable: true })

  return { supportedValuesOf: original }
})

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser: vi.fn() } }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSessionQuery: { queryFn: () => Promise.resolve(null), queryKey: ["session", "current"] },
}))

import { TimezoneField } from "~/src/presentation/components/custom/pages/account/profile/timezone-field"

afterEach(cleanup)
afterAll(() => {
  Object.defineProperty(Intl, "supportedValuesOf", { configurable: true, value: supportedValuesOf, writable: true })
})

it("offers the configured timezones on browsers without Intl.supportedValuesOf", async () => {
  renderWithProviders(<TimezoneField />)

  await userEvent.click(screen.getByRole("combobox"))

  const options = await screen.findAllByRole("option")

  expect(options.map((option) => option.textContent)).toStrictEqual([...I18N.TIME_ZONES])
  expect(await screen.findByRole("option", { name: I18N.DEFAULT_TIMEZONE })).toHaveAttribute("aria-selected", "true")
})
