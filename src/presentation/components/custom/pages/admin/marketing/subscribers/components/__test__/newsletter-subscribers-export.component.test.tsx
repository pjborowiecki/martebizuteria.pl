import { Suspense } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type NewsletterStatus } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

import { type TextFileDownload } from "~/src/presentation/components/custom/datagrid/lib/download"

const calls = vi.hoisted(() => ({
  download: vi.fn<(file: TextFileDownload) => void>(),
  exportSubscribers: vi.fn<(input: { data: unknown }) => Promise<Newsletter["adminListItem"][]>>(),
  page: vi.fn<(input: Record<string, unknown>) => Promise<unknown>>(),
  stats: vi.fn<() => Promise<Newsletter["adminStats"]>>(),
}))

vi.mock("~/src/presentation/components/custom/datagrid/lib/download", () => ({ downloadTextFile: calls.download }))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/unsubscribe-newsletter-subscriber", () => ({
  unsubscribeNewsletterSubscriberMutation: { mutationFn: vi.fn() },
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/erase-newsletter-subscriber", () => ({
  eraseNewsletterSubscriberMutation: { mutationFn: vi.fn() },
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/get-admin-newsletter-page", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getAdminNewsletterPageQuery: (input: Record<string, unknown>) =>
      queryOptions({ queryFn: () => calls.page(input), queryKey: ["admin", "newsletter", "page", input] }),
  }
})
vi.mock("~/src/modules/newsletter-subscriber/use-cases/get-newsletter-stats", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return { getNewsletterStatsQuery: () => queryOptions({ queryFn: () => calls.stats(), queryKey: ["admin", "newsletter", "stats"] }) }
})
vi.mock("~/src/modules/newsletter-subscriber/use-cases/export-admin-newsletter-subscribers", () => ({
  exportAdminNewsletterSubscribers: calls.exportSubscribers,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  buildNewsletterStats,
  buildSubscriber,
} from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/__test__/newsletter-subscriber.fixture"
import { NewsletterSubscribersTableContent } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-table"

const BOM = "\uFEFF"

const renderSubscribers = (initialStatus?: NewsletterStatus) =>
  renderWithProviders(
    <Suspense fallback={<p>loading subscribers</p>}>
      <NewsletterSubscribersTableContent initialStatus={initialStatus} />
    </Suspense>,
  )

const exportAs = async (format: RegExp): Promise<TextFileDownload | undefined> => {
  await userEvent.click(await screen.findByRole("button", { name: "Export" }))
  await userEvent.click(await screen.findByRole("menuitem", { name: format }))
  await waitFor(() => {
    expect(calls.download).toHaveBeenCalledTimes(1)
  })

  return calls.download.mock.lastCall?.[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  calls.page.mockResolvedValue({ hasMore: false, items: [buildSubscriber()], limit: 50, offset: 0, total: 1 })
  calls.stats.mockResolvedValue(buildNewsletterStats())
  calls.exportSubscribers.mockResolvedValue([
    buildSubscriber(),
    buildSubscriber({ confirmedAt: undefined, email: "jan@example.com", status: "pending", userId: "user-7" }),
  ])
})

afterEach(cleanup)

describe("NewsletterSubscribersTableContent export", () => {
  it("downloads every subscriber the list selects, with the columns the table shows", async () => {
    renderSubscribers()

    const file = await exportAs(/^CSV/u)

    expect(calls.exportSubscribers).toHaveBeenCalledExactlyOnceWith({ data: { search: undefined, status: undefined } })
    expect(file?.fileName).toMatch(/^newsletter-subscribers-\d{4}-\d{2}-\d{2}-\d{4}\.csv$/u)
    expect(file?.content).toBe(
      `${BOM}Email,Status,Language,Signed up on,Account,Signed up,Confirmed\r\n` +
        'anna@example.com,Confirmed,Polish,Home page,,"Mar 1, 2026","Mar 1, 2026"\r\n' +
        'jan@example.com,Awaiting confirmation,Polish,Home page,user-7,"Mar 1, 2026",\r\n',
    )
  })

  it("describes the status the list is narrowed to", async () => {
    renderSubscribers("pending")

    const file = await exportAs(/^JSON/u)

    expect(calls.exportSubscribers).toHaveBeenCalledExactlyOnceWith({ data: { search: undefined, status: "pending" } })
    expect(file?.content).toContain(
      '"filters": [\n      {\n        "label": "Status",\n        "value": "Awaiting confirmation"\n      }\n    ]',
    )
    expect(file?.content).toContain('"title": "Subscribers"')
  })

  it("names the search the list sent to the server", async () => {
    renderSubscribers()

    await userEvent.type(await screen.findByRole("searchbox"), "anna")
    await waitFor(() => {
      expect(calls.page).toHaveBeenLastCalledWith(expect.objectContaining({ search: "anna" }))
    })
    const file = await exportAs(/^JSON/u)

    expect(calls.exportSubscribers).toHaveBeenCalledExactlyOnceWith({ data: { search: "anna", status: undefined } })
    expect(file?.content).toContain('"filters": [\n      {\n        "label": "Search",\n        "value": "anna"\n      }\n    ]')
  })
})
