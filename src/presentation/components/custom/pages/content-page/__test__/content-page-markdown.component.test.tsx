import { Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { ContentPageMarkdown } from "~/src/presentation/components/custom/pages/content-page/content-page-markdown"

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})

const renderMarkdown = async (body: string) => {
  const rendered = renderWithProviders(
    <div data-testid="page">
      <Suspense fallback={<p>loading</p>}>
        <ContentPageMarkdown body={body} />
      </Suspense>
    </div>,
    { queryClient: createSellerDetailsQueryClient() },
  )
  await screen.findByRole("heading", { level: 2 })

  return rendered
}

afterEach(cleanup)

describe("ContentPageMarkdown", () => {
  it("renders the page's blocks directly into the caller's container", async () => {
    await renderMarkdown("## Our workshop\n\nOne paragraph.\n\nAnother paragraph.")

    expect([...screen.getByTestId("page").children].map((child) => child.tagName)).toStrictEqual(["H2", "P", "P"])
  })

  it("writes the seller's stored details in the visitor's language and localizes links to store pages", async () => {
    await renderMarkdown("## Visit\n\nWe work in :seller[city], :seller[country]. Read the [FAQ](/faq) or call :seller[phoneLink].")

    expect(screen.getByText(/We work in/u)).toHaveTextContent(`We work in ${TEST_SELLER_DETAILS.city}, Poland.`)
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/en-US/faq")
    expect(screen.getByRole("link", { name: TEST_SELLER_DETAILS.phone })).toHaveAttribute("href", "tel:+48600100200")
  })
})
