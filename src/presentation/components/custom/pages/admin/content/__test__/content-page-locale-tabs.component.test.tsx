import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ContentPageLocaleTabs } from "~/src/presentation/components/custom/pages/admin/content/content-page-locale-tabs"

const renderTabs = (invalidLocales: readonly SupportedLocale[] = [], locale: SupportedLocale = "pl-PL") => {
  const onLocaleChange = vi.fn<(locale: SupportedLocale) => void>()
  renderWithProviders(
    <ContentPageLocaleTabs invalidLocales={invalidLocales} locale={locale} onLocaleChange={onLocaleChange}>
      <p>Fields for the active language</p>
    </ContentPageLocaleTabs>,
  )

  return { onLocaleChange }
}

afterEach(cleanup)

describe("ContentPageLocaleTabs", () => {
  it("offers one tab per storefront language under a language label", () => {
    renderTabs()

    const tabs = screen.getAllByRole("tab")

    expect(screen.getByRole("tablist", { name: "Language" })).toBeInTheDocument()
    expect(tabs.map((tab) => tab.textContent)).toStrictEqual(["Polish", "English"])
  })

  it("selects the tab of the language being edited and shows its fields", () => {
    renderTabs([], "en-US")

    expect(screen.getByRole("tab", { name: "English", selected: true })).toBeInTheDocument()
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Fields for the active language")
  })

  it("asks to switch when the admin picks another language", async () => {
    const { onLocaleChange } = renderTabs()

    await userEvent.click(screen.getByRole("tab", { name: "English" }))

    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith("en-US")
  })

  it("flags only the languages that still contain errors", () => {
    renderTabs(["en-US"])

    expect(screen.getByRole("tab", { name: "English, contains errors" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Polish" })).toBeInTheDocument()
  })
})
