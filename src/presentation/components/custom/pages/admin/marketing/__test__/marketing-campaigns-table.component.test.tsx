import { cleanup, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"

import { CAMPAIGNS } from "~/src/data/marketing"

import { MarketingCampaignsTable } from "~/src/presentation/components/custom/pages/admin/marketing/marketing-campaigns-table"

const countByStatus = (status: (typeof CAMPAIGNS)[number]["status"]) => CAMPAIGNS.filter((campaign) => campaign.status === status).length

describe("MarketingCampaignsTable", () => {
  afterEach(cleanup)

  it("labels every translated column header", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toStrictEqual([
      "",
      "Campaign",
      "Channel",
      "Status",
      "Reach",
      "Open Rate",
      "Revenue",
      "",
    ])
  })

  it("renders one selectable row per campaign", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    expect(screen.getAllByLabelText("Select row")).toHaveLength(CAMPAIGNS.length)
  })

  it("renders a campaign row with its name, date, channel and metrics", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    const cells = screen.getByText("Holiday Collection Launch").closest("tr")?.querySelectorAll("td")

    expect([...(cells ?? [])].map((cell) => cell.textContent)).toStrictEqual([
      "",
      "Holiday Collection LaunchOct 20, 2023",
      "Email",
      "Active",
      "12,400",
      "62%",
      "$48,200",
      "",
    ])
  })

  it("shows the empty placeholder for metrics a draft campaign has not produced yet", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    const row = screen.getByText("Bridal Season Preview").closest("tr")

    expect([...(row?.querySelectorAll("td") ?? [])].slice(4, 7).map((cell) => cell.textContent)).toStrictEqual([
      EMPTY_VALUE,
      EMPTY_VALUE,
      EMPTY_VALUE,
    ])
  })

  it.each([
    ["active", "Active"],
    ["completed", "Completed"],
    ["draft", "Draft"],
  ] as const)("translates the %s status badge", (status, label) => {
    renderWithProviders(<MarketingCampaignsTable />)

    expect(screen.getAllByText(label)).toHaveLength(countByStatus(status))
  })

  it("renders the channel badge straight from the campaign data", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    expect(screen.getByText("Referral Program").closest("tr")?.textContent).toContain("SMS")
    expect(screen.getByText("Autumn Lookbook").closest("tr")?.textContent).toContain("Social")
  })

  it("keeps the previous page control disabled on the first page", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    const [previous, next] = screen.getAllByRole("button").filter((button) => button.textContent !== "")

    expect(previous).toBeDisabled()
    expect(next).not.toBeDisabled()
  })

  it("exposes a search input for campaigns", () => {
    renderWithProviders(<MarketingCampaignsTable />)

    expect(screen.getByLabelText("Search campaigns")).toHaveAttribute("placeholder", "Search campaigns...")
  })
})

it("opens campaign actions without propagating the row's click", () => {
  renderWithProviders(<MarketingCampaignsTable />)
  const row = screen.getByText("Holiday Collection Launch").closest("tr")
  if (row === null) {
    throw new Error("Campaign row is missing")
  }
  const onDocumentClick = vi.fn<() => void>()
  document.addEventListener("click", onDocumentClick)

  try {
    fireEvent.click(within(row).getByRole("button", { expanded: false }))

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toStrictEqual(["Duplicate campaign", "View details"])
    expect(onDocumentClick).not.toHaveBeenCalled()
  } finally {
    document.removeEventListener("click", onDocumentClick)
  }
})
