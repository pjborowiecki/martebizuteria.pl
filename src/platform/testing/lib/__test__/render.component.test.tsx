import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const OverviewHeading = ({ messageKey }: Readonly<{ messageKey: string }>): JSX.Element => {
  const t = useTranslations("pages.account.overview")

  return <h1>{t(messageKey)}</h1>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("renderWithProviders", () => {
  it("renders messages from the English catalogue", () => {
    renderWithProviders(<OverviewHeading messageKey="activity" />)

    expect(screen.getByRole("heading", { level: 1, name: "Recent Activity" })).toBeInTheDocument()
  })

  it("fails the render when a component asks for a message the catalogue does not have", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => renderWithProviders(<OverviewHeading messageKey="noSuchMessage" />)).toThrow(
      "MISSING_MESSAGE: Could not resolve `pages.account.overview.noSuchMessage` in messages for locale `en-US`.",
    )
  })
})
