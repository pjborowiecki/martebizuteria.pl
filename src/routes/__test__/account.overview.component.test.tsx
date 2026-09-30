import { type JSX, Suspense } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/modules/customer-account/use-cases/get-customer-overview", () => ({
  getCustomerOverviewQuery: () => ({
    queryFn: () => Promise.resolve(overviewRef.current),
    queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.OVERVIEW,
  }),
}))
vi.mock("~/src/routes/account", () => ({
  Route: { useRouteContext: () => ({ user: { name: "Anna Maria Kowalska" } }) },
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }): JSX.Element => <img alt={alt} src={src} />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/account.overview"

const PLACED_AT = new Date("2026-03-14T10:00:00.000Z")

const activityItem = (overrides: Partial<CustomerAccount["activityItem"]> = {}): CustomerAccount["activityItem"] => ({
  actionKey: "orderPlaced",
  createdAt: PLACED_AT,
  params: { id: "#AB12CD" },
  ...overrides,
})

const orderSummary = (overrides: Partial<CustomerAccount["orderSummary"]> = {}): CustomerAccount["orderSummary"] => ({
  createdAt: PLACED_AT,
  currencyCode: "PLN",
  filterStatus: "shipped",
  fulfillmentStatus: "shipped",
  id: "0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee",
  items: [],
  status: "processing",
  totalMinorUnits: 49_800,
  ...overrides,
})

const recommendation = (overrides: Partial<CustomerAccount["recommendation"]> = {}): CustomerAccount["recommendation"] => ({
  handle: "aurora-bracelet",
  image: "products/aurora.jpg",
  name: "Bransoletka Aurora",
  priceMinorUnits: 24_900,
  productId: "product-1",
  ...overrides,
})

const overview = (overrides: Partial<CustomerAccount["overview"]> = {}): CustomerAccount["overview"] => ({
  activity: [],
  recentOrders: [],
  recommendations: [],
  stats: { memberSinceYear: "2021", totalOrders: 4, totalSpentMinorUnits: 129_900, wishlistCount: 7 },
  ...overrides,
})

const overviewRef: { current: CustomerAccount["overview"] } = { current: overview() }

const renderOverview = async () => {
  const OverviewPage = Route.options.component
  if (OverviewPage === undefined) {
    throw new Error("the account overview route registered no component")
  }
  const rendered = renderWithProviders(
    <Suspense fallback={<p>loading overview</p>}>
      <OverviewPage />
    </Suspense>,
  )
  await screen.findByText("Welcome back")

  return rendered
}

afterEach(cleanup)

beforeEach(() => {
  overviewRef.current = overview()
})

describe("account overview greeting and stats", () => {
  it("greets the customer by first name only", async () => {
    await renderOverview()

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Anna")
  })

  it("labels and fills every stat tile from the overview payload", async () => {
    await renderOverview()

    expect(screen.getByText("Total Spent")).toBeInTheDocument()
    expect(screen.getByText("PLN 1,299.00")).toBeInTheDocument()
    expect(screen.getByText("Orders")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
    expect(screen.getByText("Wishlist")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("Member Since")).toBeInTheDocument()
    expect(screen.getByText("2021")).toBeInTheDocument()
  })

  it("shows the empty state of every section when the overview carries no rows", async () => {
    await renderOverview()

    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument()
    expect(screen.getByText("You have not placed any orders yet.")).toBeInTheDocument()
    expect(screen.getByText("No recommendations available right now.")).toBeInTheDocument()
  })
})

describe("account overview activity feed", () => {
  it("explains that there is no activity yet", async () => {
    await renderOverview()

    expect(screen.getByText("Recent Activity")).toBeInTheDocument()
    expect(screen.getByText("No recent activity yet.")).toBeInTheDocument()
  })

  it("interpolates the activity params into the translated sentence", async () => {
    overviewRef.current = overview({ activity: [activityItem()] })
    await renderOverview()

    expect(screen.getByText("Placed order #AB12CD")).toBeInTheDocument()
  })

  it("renders one line per activity key it knows", async () => {
    overviewRef.current = overview({
      activity: [
        activityItem(),
        activityItem({ actionKey: "cartItemAdded", createdAt: new Date("2026-03-15T10:00:00.000Z"), params: { item: "Aurora" } }),
        activityItem({ actionKey: "loginSuccess", createdAt: new Date("2026-03-16T10:00:00.000Z"), params: {} }),
      ],
    })
    await renderOverview()

    expect(screen.getByText("Added Aurora to cart")).toBeInTheDocument()
    expect(screen.getByText("Signed in successfully")).toBeInTheDocument()
  })
})

describe("account overview recent orders", () => {
  it("links out to the full order history", async () => {
    await renderOverview()

    expect(screen.getByText("View all orders").closest("a")).toHaveAttribute("href", "/account/orders")
  })

  it("shows the shortened order id, the total and the localized status", async () => {
    overviewRef.current = overview({ recentOrders: [orderSummary()] })
    await renderOverview()

    expect(screen.getByText("#0199AA11")).toBeInTheDocument()
    expect(screen.getByText("PLN 498.00")).toBeInTheDocument()
    expect(screen.getByText("Shipped")).toBeInTheDocument()
  })

  it("links each recent order to its own detail page", async () => {
    overviewRef.current = overview({ recentOrders: [orderSummary()] })
    await renderOverview()

    expect(screen.getByText("#0199AA11").closest("a")).toHaveAttribute("href", "/account/orders/0199aa11-bbbb-cccc-dddd-eeeeeeeeeeee")
  })
})

describe("account overview recommendations", () => {
  it("introduces the recommendations section", async () => {
    await renderOverview()

    expect(screen.getByText("Recommended for You")).toBeInTheDocument()
    expect(screen.getByText("Based on your recent orders")).toBeInTheDocument()
    expect(screen.getByText("View").closest("a")).toHaveAttribute("href", "/products")
  })

  it("renders a priced recommendation card with its image and product link", async () => {
    overviewRef.current = overview({ recommendations: [recommendation()] })
    await renderOverview()

    expect(screen.getByText("Bransoletka Aurora").closest("a")).toHaveAttribute("href", "/products/aurora-bracelet")
    expect(screen.getByRole("img", { name: "Bransoletka Aurora" })).toHaveAttribute("src", "products/aurora.jpg")
    expect(screen.getByText("PLN 249.00")).toBeInTheDocument()
  })

  it("omits the image and the price when the recommendation carries neither", async () => {
    overviewRef.current = overview({
      recommendations: [recommendation({ handle: "plain", image: undefined, name: "Plain", priceMinorUnits: undefined })],
    })
    await renderOverview()

    expect(screen.getByText("Plain")).toBeInTheDocument()
    expect(screen.queryByRole("img")).toBeNull()
  })
})

describe("account overview route options", () => {
  it("keeps the overview fresh for the shared customer account stale window", () => {
    expect(Route.options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })
})
