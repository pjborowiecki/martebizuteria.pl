import { Suspense } from "react"

import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { CONTENT_PAGE_QUERY_STALE_MS } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

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

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ContentPageArticle } from "~/src/presentation/components/custom/pages/content-page/content-page-article"

const BODY = [
  "## Returning goods",
  "",
  "You have **14 days** to send it back to:",
  "",
  "Pyciak Mariusz Firma Jubilerska\\",
  "ul. Wąska 11",
  "",
  "- keep the receipt,",
  "- pack it *carefully*.",
  "",
  "> Questions? Read the [FAQ](/faq) or [download the form](/forms/formularz_zwrotu.pdf).",
  "",
  "---",
  "",
  "### Complaints",
].join("\n")

const renderArticle = async (overrides: Partial<ContentPage["view"]> = {}) => {
  remote.page = {
    body: BODY,
    description: "How returns work.",
    revisedAt: new Date("2026-09-29T12:00:00.000Z"),
    title: "Exchanges and returns",
    ...overrides,
  }
  remote.requests = []
  const rendered = renderWithProviders(
    <Suspense fallback={<p>loading</p>}>
      <ContentPageArticle handle="exchanges-and-returns" />
    </Suspense>,
  )
  await screen.findByRole("heading", { level: 1 })

  return rendered
}

afterEach(cleanup)

describe("ContentPageArticle", () => {
  it("loads the page in the visitor's locale", async () => {
    await renderArticle()

    expect(remote.requests).toStrictEqual(["exchanges-and-returns:en-US"])
  })

  it("heads the page with its title and when it last changed", async () => {
    await renderArticle()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Exchanges and returns")
    expect(screen.getByText("Last updated September 29, 2026")).toBeInTheDocument()
  })

  it("places the article in the page's main landmark", async () => {
    await renderArticle()

    expect(within(screen.getByRole("main")).getByRole("article")).toContainElement(screen.getByRole("heading", { level: 1 }))
  })

  it("renders every block the editor can produce", async () => {
    const { container } = await renderArticle()

    expect(screen.getByRole("heading", { level: 2, name: "Returning goods" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Complaints" })).toBeInTheDocument()
    expect(screen.getByText("14 days").tagName).toBe("STRONG")
    expect(screen.getByText("carefully").tagName).toBe("EM")
    expect(within(screen.getByRole("list")).getAllByRole("listitem")).toHaveLength(2)
    expect(container.querySelector("blockquote")).not.toBeNull()
    expect(container.querySelector("hr")).not.toBeNull()
  })

  it("indents numbered lists far enough on phones to keep two-digit numbers inside the page margin", async () => {
    const { container } = await renderArticle()

    expect(container.querySelector("blockquote")?.parentElement).toHaveClass("[&_ol]:ml-6", "sm:[&_ol]:ml-5", "[&_ol]:list-decimal")
  })

  it("anchors every heading so links to a section keep working", async () => {
    await renderArticle()

    expect(screen.getByRole("heading", { level: 2, name: "Returning goods" })).toHaveAttribute("id", "returning-goods")
  })

  it("keeps the postal address on separate lines", async () => {
    const { container } = await renderArticle()

    expect(container.querySelector("p br")).not.toBeNull()
  })

  it("localizes links to store pages but leaves downloadable files alone", async () => {
    await renderArticle()

    expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/en-US/faq")
    expect(screen.getByRole("link", { name: "download the form" })).toHaveAttribute("href", "/forms/formularz_zwrotu.pdf")
  })

  it("writes the seller's stored details where the page names them, with working e-mail and phone links", async () => {
    const { container } = await renderArticle({
      body: [
        ":seller[legalName]\\",
        ":seller[street]\\",
        ":seller[postalCode] :seller[city]\\",
        ":seller[country]\\",
        "NIP :seller[nip], REGON :seller[regon]",
        "",
        "Write to :seller[emailLink] or :seller[email], call :seller[phoneLink] or :seller[phone].",
      ].join("\n"),
    })
    const [address, contact] = container.querySelectorAll("article p:not(header p)")

    expect(address).toHaveTextContent("Pracownia Testowa Anna Nowak ul. Floriańska 1 31-001 Kraków Poland NIP 5260250274, REGON 100000050")
    expect(contact).toHaveTextContent("Write to sklep@marte.test or sklep@marte.test, call +48 600 100 200 or +48 600 100 200.")
    expect(screen.getByRole("link", { name: "sklep@marte.test" })).toHaveAttribute("href", "mailto:sklep@marte.test")
    expect(screen.getByRole("link", { name: "+48 600 100 200" })).toHaveAttribute("href", "tel:+48600100200")
  })

  it("shows text that only looks like a placeholder exactly as it was written", async () => {
    const { container } = await renderArticle({
      body: ["Ref:ABC and :seller[iban] and :seller[**nip**] and :shop[nip]{x=1}", "", "::note", "", ":::box", "Inside", ":::"].join("\n"),
    })

    expect(container.querySelector("article div")).toHaveTextContent(
      "Ref:ABC and :seller[iban] and :seller[**nip**] and :shop[nip]{x=1} ::note :::box Inside :::",
    )
  })

  it("drops raw HTML instead of rendering it", async () => {
    const { container } = await renderArticle({ body: 'Hello <img src=x onerror="alert(1)"> world' })

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText(/Hello/u)).toBeInTheDocument()
  })
})
