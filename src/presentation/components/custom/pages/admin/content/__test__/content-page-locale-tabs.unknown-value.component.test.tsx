import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import type * as TabsComponents from "~/src/presentation/components/shadcn/tabs"

vi.mock("~/src/presentation/components/shadcn/tabs", async (importOriginal) => ({
  ...(await importOriginal<typeof TabsComponents>()),
  Tabs: ({ children, onValueChange }: Readonly<{ children: ReactNode; onValueChange: (value: unknown) => void }>): JSX.Element => (
    <div>
      <button
        type="button"
        onClick={() => {
          onValueChange("de-DE")
        }}
      >
        report German
      </button>
      <button
        type="button"
        onClick={() => {
          onValueChange(1)
        }}
      >
        report tab index
      </button>
      <button
        type="button"
        onClick={() => {
          onValueChange("en-US")
        }}
      >
        report English
      </button>
      {children}
    </div>
  ),
  TabsContent: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  TabsList: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <div>{children}</div>,
  TabsTrigger: ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => <span>{children}</span>,
}))

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ContentPageLocaleTabs } from "~/src/presentation/components/custom/pages/admin/content/content-page-locale-tabs"

const renderTabs = () => {
  const onLocaleChange = vi.fn<(locale: SupportedLocale) => void>()
  renderWithProviders(
    <ContentPageLocaleTabs invalidLocales={[]} locale="pl-PL" onLocaleChange={onLocaleChange}>
      <p>Fields for the active language</p>
    </ContentPageLocaleTabs>,
  )

  return { onLocaleChange }
}

afterEach(cleanup)

describe("ContentPageLocaleTabs given a tab value it cannot use", () => {
  it("stays on the current language when the tabs report one the storefront does not support", async () => {
    const { onLocaleChange } = renderTabs()

    await userEvent.click(screen.getByRole("button", { name: "report German" }))

    expect(onLocaleChange).not.toHaveBeenCalled()
  })

  it("stays on the current language when the tabs report something other than a language code", async () => {
    const { onLocaleChange } = renderTabs()

    await userEvent.click(screen.getByRole("button", { name: "report tab index" }))

    expect(onLocaleChange).not.toHaveBeenCalled()
  })

  it("passes a supported language straight through", async () => {
    const { onLocaleChange } = renderTabs()

    await userEvent.click(screen.getByRole("button", { name: "report English" }))

    expect(onLocaleChange).toHaveBeenCalledExactlyOnceWith("en-US")
  })
})
