import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

const remote = vi.hoisted(() => ({ campaigns: { current: [] as NewsletterCampaign["adminListItem"][] } }))

vi.mock("~/src/modules/newsletter-campaign/use-cases/get-admin-newsletter-campaigns", () => ({
  getAdminNewsletterCampaignsQuery: () => ({
    queryFn: () => Promise.resolve(remote.campaigns.current),
    queryKey: ["admin", "newsletter-campaign", "list"],
  }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewsletterCampaignsTable } from "~/src/presentation/components/custom/pages/admin/marketing/newsletter-campaigns-table"

const STARTED_AT = new Date("2026-10-08T09:30:00.000Z")

const FINISHED_AT = new Date("2026-10-08T09:42:00.000Z")

const campaign = (overrides: Partial<NewsletterCampaign["adminListItem"]>): NewsletterCampaign["adminListItem"] => ({
  completedAt: FINISHED_AT,
  createdAt: STARTED_AT,
  failure: null,
  id: "campaign-1",
  recipientCount: 120,
  sentCount: 120,
  status: "sent",
  subjects: { "en-US": "Autumn pieces", "pl-PL": "Jesienne projekty" },
  ...overrides,
})

const rowOf = async (subject: string): Promise<HTMLElement> => {
  const cell = await screen.findByText(subject)
  const row = cell.closest("tr")
  if (row === null) {
    throw new Error(`no row holds ${subject}`)
  }

  return row
}

beforeEach(() => {
  remote.campaigns.current = []
})

afterEach(cleanup)

describe("NewsletterCampaignsTable", () => {
  it("explains the empty list before the first newsletter", async () => {
    renderWithProviders(<NewsletterCampaignsTable />)

    expect(await screen.findByText("No newsletters yet")).toBeInTheDocument()
    expect(screen.getByText("Every newsletter you send appears here with its progress.")).toBeInTheDocument()
    expect(screen.queryByRole("table")).toBeNull()
  })

  it("lists a sent newsletter under its subject in the admin's language with its delivery and dates", async () => {
    remote.campaigns.current = [campaign({})]
    renderWithProviders(<NewsletterCampaignsTable />)

    const row = await rowOf("Autumn pieces")

    expect(within(row).getByText("Sent")).toBeInTheDocument()
    expect(within(row).getByText("120 of 120")).toBeInTheDocument()
    expect(within(row).getByText("Oct 8, 2026, 11:30 AM")).toBeInTheDocument()
    expect(within(row).getByText("Oct 8, 2026, 11:42 AM")).toBeInTheDocument()
  })

  it("keeps the subject column wide enough to read on phones and lets the table scroll instead", async () => {
    remote.campaigns.current = [campaign({})]
    renderWithProviders(<NewsletterCampaignsTable />)

    const subject = await screen.findByText("Autumn pieces")

    expect(subject.closest("td")).toHaveClass("whitespace-normal", "max-lg:min-w-52")
  })

  it("shows a newsletter still going out with its progress and no end date", async () => {
    remote.campaigns.current = [campaign({ completedAt: null, sentCount: 100, status: "sending" })]
    renderWithProviders(<NewsletterCampaignsTable />)

    const row = await rowOf("Autumn pieces")

    expect(within(row).getByText("Sending")).toBeInTheDocument()
    expect(within(row).getByText("100 of 120")).toBeInTheDocument()
    expect(within(row).getByText(EMPTY_VALUE)).toBeInTheDocument()
  })

  it("shows why a stopped newsletter did not reach everyone", async () => {
    remote.campaigns.current = [campaign({ failure: "Domain not verified", sentCount: 0, status: "failed" })]
    renderWithProviders(<NewsletterCampaignsTable />)

    const row = await rowOf("Autumn pieces")

    expect(within(row).getByText("Stopped")).toBeInTheDocument()
    expect(within(row).getByText("Domain not verified")).toBeInTheDocument()
    expect(within(row).getByText("0 of 120")).toBeInTheDocument()
  })
})
