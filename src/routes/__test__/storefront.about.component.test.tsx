import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"
import { TEST_SELLER_DETAILS, createSellerDetailsQueryClient } from "~/src/platform/testing/mocks/seller-details"

import { CONTENT_PAGE_QUERY_STALE_MS } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

import { Route } from "~/src/routes/_storefront.about"

import { ABOUT_CONTACT_HASH } from "~/src/routes"

const remote = vi.hoisted(() => ({ page: undefined as ContentPage["view"] | undefined, requests: [] as string[] }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("~/src/modules/content-page/use-cases/get-content-page", () => ({
  getContentPageQuery: (handle: string, locale: string) => ({
    queryFn: () => {
      remote.requests.push(`${handle}:${locale}`)

      return Promise.resolve(remote.page)
    },
    queryKey: ["content-page", handle, locale],
    staleTime: CONTENT_PAGE_QUERY_STALE_MS,
  }),
}))

const STORY = [
  "We make forms in silver and gold, joining a classical approach to jewellery with plain, raw design.",
  "",
  "We make bespoke jewellery to order as well.",
].join("\n")

const AboutPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the about route renders no component")
  }

  return <Page />
}

const renderAbout = async (overrides: Partial<ContentPage["view"]> = {}) => {
  remote.page = {
    body: STORY,
    description: "M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978.",
    revisedAt: new Date("2026-10-18T10:00:00.000Z"),
    title: "About M'Arte",
    ...overrides,
  }
  remote.requests = []
  const rendered = renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <AboutPage />
    </Suspense>,
    { queryClient: createSellerDetailsQueryClient() },
  )
  await screen.findByRole("heading", { level: 1 })

  return rendered
}

afterEach(cleanup)

describe("storefront about page", () => {
  it("loads the About page an admin edits in Content, in the visitor's locale", async () => {
    await renderAbout()

    expect(remote.requests).toStrictEqual(["about:en-US"])
  })

  it("heads the page with the brand eyebrow, the page's title and its description as the lead", async () => {
    await renderAbout()

    expect(screen.getByText("About the brand")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 1, name: "About M'Arte" })).toBeInTheDocument()
    expect(
      screen.getByText("M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978."),
    ).toBeInTheDocument()
  })

  it("tells the story written in Content as paragraphs, the last one in full colour, without a last updated date", async () => {
    await renderAbout()
    const story = screen.getByText(/^We make forms in silver and gold/u)

    expect(story.tagName).toBe("P")
    expect(screen.getByText("We make bespoke jewellery to order as well.").tagName).toBe("P")
    expect(story.parentElement).toHaveClass(
      "max-w-2xl",
      "[&_p]:text-base/relaxed",
      "md:[&_p]:text-lg/relaxed",
      "[&>p:last-child]:text-foreground",
    )
    expect(screen.queryByText(/Last updated/u)).not.toBeInTheDocument()
  })

  it("renders the story's Markdown like the other content pages, store details and page links included", async () => {
    await renderAbout({ body: "## Our workshop\n\nVisit us in **:seller[city]** or read the [FAQ](/faq)." })

    expect(screen.getByRole("heading", { level: 2, name: "Our workshop" })).toBeInTheDocument()
    expect(screen.getByText(TEST_SELLER_DETAILS.city).tagName).toBe("STRONG")
    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/en-US/faq")
  })

  it("ends with the seller's contact details where the contact links land", async () => {
    await renderAbout()
    const contact = screen.getByRole("region", { name: "Contact details" })

    expect(contact).toHaveAttribute("id", ABOUT_CONTACT_HASH)
    expect(contact).toHaveTextContent("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Poland")
    expect(contact).toHaveTextContent(`NIP (tax identification number): ${TEST_SELLER_DETAILS.nip}`)
    expect(contact).toHaveTextContent(`REGON (business statistics number): ${TEST_SELLER_DETAILS.regon}`)
    expect(
      screen.getByText("Write or call us with any question about an order, a piece of jewellery or a bespoke design."),
    ).toBeInTheDocument()
  })

  it("keeps the reader on the page, offering only the seller's email address and phone number", async () => {
    await renderAbout()

    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toStrictEqual([
      `mailto:${TEST_SELLER_DETAILS.email}`,
      "tel:+48600100200",
    ])
  })
})

describe("storefront about route", () => {
  it("loads only the about namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.about"] })
  })
})
