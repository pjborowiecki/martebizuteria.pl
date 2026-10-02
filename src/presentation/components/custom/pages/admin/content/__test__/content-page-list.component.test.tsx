import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type ContentPage } from "~/src/modules/content-page/content-page.types"

const PAGES = vi.hoisted((): ContentPage["adminListItem"][] => [
  {
    handle: "exchanges-and-returns",
    titles: { "en-US": "Exchanges and returns", "pl-PL": "Wymiana i zwroty" },
    updatedAt: new Date("2026-09-29T08:00:00.000Z"),
  },
  {
    handle: "privacy-policy",
    titles: { "en-US": "Privacy policy", "pl-PL": "Polityka prywatności" },
    updatedAt: new Date("2026-10-01T15:30:00.000Z"),
  },
])

vi.mock("~/src/modules/content-page/use-cases/get-admin-content-pages", () => ({
  getAdminContentPagesQuery: () => ({ queryFn: () => Promise.resolve(PAGES), queryKey: ["admin", "content-pages"] }),
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentPageList } from "~/src/presentation/components/custom/pages/admin/content/content-page-list"

const renderList = async () => {
  renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <ContentPageList />
    </Suspense>,
  )
  await screen.findByText("Privacy policy")
}

afterEach(cleanup)

describe("ContentPageList", () => {
  it("names every page in the admin's language and links it to its editor", async () => {
    await renderList()

    expect(screen.getByRole("link", { name: /Exchanges and returns/u })).toHaveAttribute("href", "/admin/content/exchanges-and-returns")
    expect(screen.getByRole("link", { name: /Privacy policy/u })).toHaveAttribute("href", "/admin/content/privacy-policy")
  })

  it("shows where each page lives on the storefront and when it last changed", async () => {
    await renderList()

    expect(screen.getByText("/privacy-policy")).toBeInTheDocument()
    expect(screen.getByText("/exchanges-and-returns")).toBeInTheDocument()
    expect(screen.getByText(/Updated Oct 1, 2026/u)).toBeInTheDocument()
  })
})
