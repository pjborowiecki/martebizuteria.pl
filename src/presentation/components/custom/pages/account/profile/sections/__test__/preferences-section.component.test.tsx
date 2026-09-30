import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const mocks = vi.hoisted(() => ({
  sessionKey: ["session", "current"] as const,
  updateUser: vi.fn<(input: { timezone: string }) => Promise<{ error?: { message?: string } }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ authClient: { updateUser: mocks.updateUser } }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getCurrentSessionQuery: { queryKey: mocks.sessionKey } }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import { PreferencesSection } from "~/src/presentation/components/custom/pages/account/profile/sections/preferences-section"

const renderSection = (timezone?: string): void => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  if (timezone !== undefined) {
    queryClient.setQueryData(mocks.sessionKey, { user: { timezone } })
  }

  renderWithProviders(<PreferencesSection />, { queryClient })
}

afterEach(cleanup)

describe("PreferencesSection", () => {
  it("heads the section with the preferences label", () => {
    renderSection()

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument()
  })

  it("offers the timezone control", () => {
    renderSection()

    expect(screen.getByText("Timezone")).toBeInTheDocument()
    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("shows the timezone stored on the session", () => {
    renderSection("America/New_York")

    expect(screen.getByRole("combobox")).toHaveTextContent("America/New_York")
  })

  it("falls back to the store timezone when the session carries none", () => {
    renderSection()

    expect(screen.getByRole("combobox")).toHaveTextContent("Europe/Warsaw")
  })
})
