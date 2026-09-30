import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface StubCollection {
  readonly handle: string
  readonly id: string
}

const state = vi.hoisted((): { collections: StubCollection[] } => ({ collections: [] }))

vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => Promise.resolve(state.collections), queryKey: ["collections", "storefront"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/collections/collection-card", () => ({
  CollectionCard: ({ collection }: Readonly<{ collection: StubCollection }>): JSX.Element => <li>{collection.handle}</li>,
}))

import { Route } from "~/src/routes/_storefront.collections.index"

const CollectionsPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the collections route renders no component")
  }

  return <Page />
}

const renderPage = () =>
  renderWithProviders(
    <Suspense fallback={<p>loading collections</p>}>
      <CollectionsPage />
    </Suspense>,
  )

beforeEach(() => {
  state.collections = []
})

afterEach(cleanup)

describe("storefront collections page", () => {
  it("titles the curated editions", async () => {
    renderPage()

    expect(await screen.findByRole("heading", { level: 1, name: "Collections" })).toBeInTheDocument()
    expect(screen.getByText("Curated editions")).toBeInTheDocument()
    expect(screen.getByText("Discover our curated collections.")).toBeInTheDocument()
  })

  it("says so when the storefront has no collection to show", async () => {
    renderPage()

    expect(await screen.findByText("No collections found.")).toBeInTheDocument()
    expect(screen.queryAllByRole("listitem")).toStrictEqual([])
  })

  it("renders a card for every collection", async () => {
    state.collections = [
      { handle: "srebro-925", id: "collection-1" },
      { handle: "zloto", id: "collection-2" },
    ]
    renderPage()

    const cards = await screen.findAllByRole("listitem")

    expect(cards.map((item) => item.textContent)).toStrictEqual(["srebro-925", "zloto"])
  })

  it("drops the empty notice once a collection exists", async () => {
    state.collections = [{ handle: "srebro-925", id: "collection-1" }]
    renderPage()

    await screen.findByText("srebro-925")

    expect(screen.queryByText("No collections found.")).toBeNull()
  })
})

describe("storefront collections route", () => {
  it("loads only the collections namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.collections"] })
  })
})
