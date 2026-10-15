import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

const { downloadCsvFile, exportAdminNewsletterSubscribers } = vi.hoisted(() => ({
  downloadCsvFile: vi.fn<(fileName: string, content: string) => void>(),
  exportAdminNewsletterSubscribers: vi.fn<(input: { data: unknown }) => Promise<Newsletter["adminListItem"][]>>(),
}))

vi.mock(import("~/src/modules/_core/utils/csv"), async (importOriginal) => ({ ...(await importOriginal()), downloadCsvFile }))
vi.mock("~/src/modules/newsletter/use-cases/export-admin-newsletter-subscribers", () => ({ exportAdminNewsletterSubscribers }))
vi.mock("~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscribers-data-grid", () => ({
  useNewsletterSubscribersDataGridContext: () => ({ exportListInput: { search: "anna", status: "confirmed" } }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { buildSubscriber } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/__test__/newsletter-subscriber.fixture"
import { NewsletterSubscribersExportAction } from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/components/newsletter-subscribers-export-action"

const EXPORT_LABEL = "Download table as CSV"

const HEADER_ROW = "ID,Email,Status,Language,Source,Customer Account ID,Signed Up,Confirmed,Unsubscribed"

const writtenCsv = (): { content: string; fileName: string } => {
  const [fileName, content] = downloadCsvFile.mock.calls[0] ?? []
  if (fileName === undefined || content === undefined) {
    throw new Error("No CSV was written")
  }

  return { content, fileName }
}

const exportRows = async (): Promise<string[]> => {
  renderWithProviders(<NewsletterSubscribersExportAction />)
  fireEvent.click(screen.getByRole("button", { name: EXPORT_LABEL }))
  await waitFor(() => {
    expect(downloadCsvFile).toHaveBeenCalled()
  })

  return writtenCsv().content.split("\n")
}

beforeEach(() => {
  downloadCsvFile.mockReset()
  exportAdminNewsletterSubscribers.mockReset()
  exportAdminNewsletterSubscribers.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
})

describe("NewsletterSubscribersExportAction", () => {
  it("exports the subscribers the current search and status select", async () => {
    await exportRows()

    expect(exportAdminNewsletterSubscribers).toHaveBeenCalledExactlyOnceWith({ data: { search: "anna", status: "confirmed" } })
  })

  it("names the file after the subscriber list and writes only the header row when nobody matches", async () => {
    await expect(exportRows()).resolves.toStrictEqual([HEADER_ROW])
    expect(writtenCsv().fileName).toBe("newsletter-subscribers.csv")
  })

  it("writes the address, its status, language, sign-up place, account and dates", async () => {
    exportAdminNewsletterSubscribers.mockResolvedValue([
      buildSubscriber({
        source: "account",
        status: "unsubscribed",
        unsubscribedAt: new Date("2026-04-02T09:00:00.000Z"),
        userId: "user-1",
      }),
    ])

    const [, row] = await exportRows()

    expect(row).toBe(
      '"5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50","anna@example.com","Unsubscribed","Polish","Customer account","user-1","Mar 1, 2026","Mar 1, 2026","Apr 2, 2026"',
    )
  })

  it("leaves the account and the dates a subscriber does not have empty", async () => {
    exportAdminNewsletterSubscribers.mockResolvedValue([buildSubscriber({ confirmedAt: undefined, locale: "en-US", status: "pending" })])

    const [, row] = await exportRows()

    expect(row).toBe(
      '"5f0c2a8e-1b3d-4c5e-8f9a-0b1c2d3e4f50","anna@example.com","Awaiting confirmation","English","Home page",,"Mar 1, 2026",,',
    )
  })

  it("escapes a quote inside an address", async () => {
    exportAdminNewsletterSubscribers.mockResolvedValue([buildSubscriber({ email: 'an"na@example.com' })])

    const [, row] = await exportRows()

    expect(row).toContain(',"an""na@example.com",')
  })

  it("frees the button again once the export finished", async () => {
    await exportRows()

    expect(screen.getByRole("button", { name: EXPORT_LABEL })).toBeEnabled()
  })
})
