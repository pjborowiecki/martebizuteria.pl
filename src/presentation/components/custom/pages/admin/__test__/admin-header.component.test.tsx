import { type ReactElement } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { AdminHeader } from "~/src/presentation/components/custom/pages/admin/admin-header"

import { ROUTES } from "~/src/routes"

const renderHeader = (header: ReactElement) => renderWithProviders(<SidebarProvider>{header}</SidebarProvider>)

afterEach(() => {
  cleanup()
})

describe("AdminHeader", () => {
  it("renders a string title as the page heading", () => {
    renderHeader(<AdminHeader title="Products" />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Products")
  })

  it("does not wrap a non string title in a heading element", () => {
    renderHeader(<AdminHeader title={<em>Draft product</em>} />)

    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
    expect(screen.getByText("Draft product")).toBeInTheDocument()
  })

  it("renders the description under the title when one is supplied", () => {
    renderHeader(<AdminHeader description="Manage your catalog" title="Products" />)

    expect(screen.getByText("Manage your catalog")).toBeInTheDocument()
  })

  it("shows the sidebar trigger when there is nowhere to go back to", () => {
    renderHeader(<AdminHeader title="Products" />)

    expect(screen.getByRole("button")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("replaces the sidebar trigger with a back link when a back target is given", () => {
    renderHeader(<AdminHeader backHref={ROUTES.ADMIN_PRODUCTS} title="Silver ring" />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", expect.stringContaining("products"))
  })

  it("renders breadcrumb labels, linking only the ones that carry a target", () => {
    renderHeader(
      <AdminHeader breadcrumbs={[{ href: ROUTES.ADMIN_PRODUCTS, label: "Catalog" }, { label: "Silver ring" }]} title="Silver ring" />,
    )

    expect(screen.getByRole("link", { name: "Catalog" })).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Silver ring" })).not.toBeInTheDocument()
  })

  it("renders no breadcrumb navigation for an empty breadcrumb list", () => {
    renderHeader(<AdminHeader breadcrumbs={[]} title="Products" />)

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument()
  })

  it("renders the actions and the tab strip it was handed", () => {
    renderHeader(<AdminHeader actions={<button type="button">New product</button>} tabs={<div>All products</div>} title="Products" />)

    expect(screen.getByRole("button", { name: "New product" })).toBeInTheDocument()
    expect(screen.getByText("All products")).toBeInTheDocument()
  })
})
