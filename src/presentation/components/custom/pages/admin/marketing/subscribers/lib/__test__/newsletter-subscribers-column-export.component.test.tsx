import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, renderHook } from "@testing-library/react"
import { useTranslations } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { ADMIN_NEWSLETTER_TABLE_COLUMN_ID } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

import { useFormatter } from "~/src/hooks/use-display-format"

import { buildSubscriber } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/__test__/newsletter-subscriber.fixture"
import { buildNewsletterSubscriberColumns } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/lib/newsletter-subscribers-column-defs"

vi.mock("~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-row-actions", () => ({
  NewsletterSubscribersRowActions: (): JSX.Element => <span />,
}))

afterEach(cleanup)

const Wrapper = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
    {children}
  </TestProviders>
)

const exportValueOf = (id: string, overrides: Partial<Newsletter["adminListItem"]> = {}): string | undefined => {
  const { result } = renderHook(
    () => {
      const t = useTranslations("pages.admin.marketing.subscribers")
      const tAdmin = useTranslations("pages.admin")
      const format = useFormatter()

      return buildNewsletterSubscriberColumns({ format, t, tAdmin })
    },
    { wrapper: Wrapper },
  )

  return result.current.find((column) => column.id === id)?.meta?.exportValue?.(buildSubscriber(overrides))
}

describe("buildNewsletterSubscriberColumns export values", () => {
  it.each([
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.email, "anna@example.com"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.recordId, "5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.status, "Confirmed"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.locale, "Polish"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.source, "Home page"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.createdAt, "Mar 1, 2026"],
    [ADMIN_NEWSLETTER_TABLE_COLUMN_ID.confirmedAt, "Mar 1, 2026"],
  ])("exports the %s column as the text its cell shows", (id, text) => {
    expect(exportValueOf(id)).toBe(text)
  })

  it("exports the customer account a subscriber belongs to by its id", () => {
    expect(exportValueOf(ADMIN_NEWSLETTER_TABLE_COLUMN_ID.account, { userId: "user-7" })).toBe("user-7")
    expect(exportValueOf(ADMIN_NEWSLETTER_TABLE_COLUMN_ID.account)).toBeUndefined()
  })

  it("dates an unsubscription and leaves it empty for an address still on the list", () => {
    expect(exportValueOf(ADMIN_NEWSLETTER_TABLE_COLUMN_ID.unsubscribedAt, { unsubscribedAt: new Date("2026-04-02T10:00:00.000Z") })).toBe(
      "Apr 2, 2026",
    )
    expect(exportValueOf(ADMIN_NEWSLETTER_TABLE_COLUMN_ID.unsubscribedAt)).toBeUndefined()
  })

  it("never exports the row actions", () => {
    expect(exportValueOf(ADMIN_NEWSLETTER_TABLE_COLUMN_ID.actions)).toBeUndefined()
  })
})
