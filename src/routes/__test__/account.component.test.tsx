import { type JSX } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return { ...actual, Outlet: (): JSX.Element => <section data-testid="outlet" /> }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => ({ requireCustomer: vi.fn() }))
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({ getCollectionsQuery: vi.fn() }))
vi.mock("~/src/modules/store-setting/use-cases/get-sales-status", () => ({ getSalesStatusQuery: vi.fn() }))
vi.mock("~/src/presentation/components/custom/pages/account/account-sidebar", () => ({
  AccountSidebar: (): JSX.Element => <nav data-testid="account-sidebar" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <header data-testid="storefront-navigation" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/footer/footer", () => ({
  Footer: (): JSX.Element => <footer data-testid="storefront-footer" />,
}))
vi.mock("~/src/presentation/components/custom/sales-paused-banner", () => ({
  SalesPausedBanner: (): JSX.Element => <div data-testid="sales-paused-banner" />,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/account"

import { pageHead } from "~/src/lib/seo"

const renderLayout = () => {
  const AccountLayout = Route.options.component
  if (AccountLayout === undefined) {
    throw new Error("the account route registered no component")
  }

  return renderWithProviders(<AccountLayout />)
}

afterEach(cleanup)

describe("account layout", () => {
  it("keeps the storefront navigation above the account area", () => {
    renderLayout()

    expect(screen.getByTestId("storefront-navigation")).toBeInTheDocument()
  })

  it("puts the paused-sales notice between the navigation and the account area", () => {
    renderLayout()

    const notice = screen.getByTestId("sales-paused-banner")
    expect(screen.getByTestId("storefront-navigation").compareDocumentPosition(notice)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(notice.compareDocumentPosition(screen.getByRole("main"))).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  it("renders the account sidebar beside the routed page", () => {
    renderLayout()

    expect(screen.getByTestId("account-sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })
})

describe("account layout surroundings", () => {
  it("keeps the storefront footer under the account area", () => {
    renderLayout()

    expect(screen.getByTestId("storefront-footer")).toBeInTheDocument()
  })
})

describe("account failure handling", () => {
  it("shows a recoverable error state instead of a dead end", () => {
    expect(Route.options.errorComponent).toBeTypeOf("function")
  })

  it("answers a missing account page with its own not-found state", () => {
    expect(Route.options.notFoundComponent).toBeTypeOf("function")
  })
})

describe("account head metadata", () => {
  it("registers the shared page head builder", () => {
    expect(Route.options.head).toBe(pageHead)
  })
})

describe("account route wiring", () => {
  it("guards the whole account area before loading and preloads its message namespaces", () => {
    expect(Route.options.beforeLoad).toBeTypeOf("function")
    expect(Route.options.loader).toBeTypeOf("function")
    expect(Route.options.staticData).toStrictEqual({
      namespaces: ["pages.account", "pages.account.meta", "pages.auth.errors", "pages.auth.validations", "pages.cart"],
    })
  })
})
