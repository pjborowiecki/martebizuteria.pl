import { Suspense } from "react"

import { cleanup, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type ContentPage } from "~/src/modules/content-page/content-page.types"

const remote = vi.hoisted(() => ({ page: undefined as ContentPage["view"] | undefined, requests: [] as string[] }))

vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({ getCurrentLocale: () => "en-US" }))
vi.mock("~/src/modules/content-page/use-cases/get-content-page", () => ({
  getContentPageQuery: (handle: string, locale: string) => ({
    queryFn: () => {
      remote.requests.push(`${handle}:${locale}`)

      return Promise.resolve(remote.page)
    },
    queryKey: ["content-page", handle, locale],
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

  it("drops raw HTML instead of rendering it", async () => {
    const { container } = await renderArticle({ body: 'Hello <img src=x onerror="alert(1)"> world' })

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText(/Hello/u)).toBeInTheDocument()
  })
})
