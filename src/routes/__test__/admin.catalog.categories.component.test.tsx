import { type JSX, type ReactNode } from "react"

import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return { ...actual, Outlet: (): JSX.Element => <div data-testid="outlet" /> }
})
vi.mock("~/src/presentation/components/custom/pages/admin/admin-header", () => ({
  AdminHeader: ({ description, tabs, title }: Readonly<{ description?: string; tabs?: ReactNode; title: ReactNode }>): JSX.Element => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
      <div data-testid="tabs">{tabs}</div>
    </header>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/catalog-tabs", () => ({
  CatalogTabs: ({ active }: Readonly<{ active: string }>): JSX.Element => <nav data-testid="catalog-tabs">{active}</nav>,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { Route } from "~/src/routes/admin.catalog.categories"

const renderLayout = () => {
  const CategoriesSectionLayoutRoute = Route.options.component
  if (CategoriesSectionLayoutRoute === undefined) {
    throw new Error("the categories layout route registered no component")
  }

  return renderWithProviders(<CategoriesSectionLayoutRoute />)
}

afterEach(() => {
  cleanup()
})

describe("admin categories layout route", () => {
  it("heads the section with the translated title and description", () => {
    renderLayout()

    expect(screen.getByRole("heading", { name: "Categories" })).toBeInTheDocument()
    expect(screen.getByText("Organize your products into collections and categories.")).toBeInTheDocument()
  })

  it("marks the categories catalogue tab as the active one", () => {
    renderLayout()

    expect(screen.getByTestId("catalog-tabs")).toHaveTextContent("categories")
  })

  it("puts the catalogue tabs inside the header", () => {
    renderLayout()

    expect(screen.getByTestId("tabs")).toContainElement(screen.getByTestId("catalog-tabs"))
  })

  it("renders the nested route below the header", () => {
    renderLayout()

    expect(screen.getByTestId("outlet")).toBeInTheDocument()
  })

  it("declares the message namespaces the section needs", () => {
    expect(Route.options.staticData?.namespaces).toStrictEqual([
      "pages.admin.catalog.categories",
      "pages.admin.catalog.products",
      "pages.admin.catalog.products.catalogList",
    ])
  })
})
