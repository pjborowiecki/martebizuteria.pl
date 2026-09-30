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

import { Route } from "~/src/routes/admin.catalog.attributes"

const renderLayout = () => {
  const AttributesSectionLayoutRoute = Route.options.component
  if (AttributesSectionLayoutRoute === undefined) {
    throw new Error("the attributes layout route registered no component")
  }

  return renderWithProviders(<AttributesSectionLayoutRoute />)
}

afterEach(() => {
  cleanup()
})

describe("admin attributes layout route", () => {
  it("heads the section with the translated title and description", () => {
    renderLayout()

    expect(screen.getByRole("heading", { name: "Attributes" })).toBeInTheDocument()
    expect(screen.getByText("Reusable specification fields (materials, dimensions, care, etc.) assigned per product.")).toBeInTheDocument()
  })

  it("marks the attributes catalogue tab as the active one", () => {
    renderLayout()

    expect(screen.getByTestId("catalog-tabs")).toHaveTextContent("attributes")
  })

  it("puts the catalogue tabs inside the header", () => {
    renderLayout()

    expect(screen.getByTestId("tabs")).toContainElement(screen.getByTestId("catalog-tabs"))
  })

  it("renders the nested attributes route below the header", () => {
    renderLayout()

    expect(screen.getByTestId("outlet")).toBeInTheDocument()
  })

  it("declares only the attributes message namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.admin.catalog.attributes"] })
  })
})
