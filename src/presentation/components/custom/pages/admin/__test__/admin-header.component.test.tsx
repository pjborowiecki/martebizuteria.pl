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

  it("names the back link so a screen reader announces it", () => {
    renderHeader(<AdminHeader backHref={ROUTES.ADMIN_PRODUCTS} title="Silver ring" />)

    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument()
  })

  it("lets the header scroll away with the page below desktop and keeps it pinned on desktop", () => {
    renderHeader(<AdminHeader title="Products" />)
    const headerBar = screen.getByRole("banner").parentElement

    expect(headerBar).toHaveClass("lg:sticky", "lg:top-0")
    expect(headerBar).not.toHaveClass("sticky")
  })

  it("lets the actions wrap under the title below desktop instead of running off the screen", () => {
    renderHeader(<AdminHeader actions={<button type="button">Refund</button>} title="MRT-2026-00001" />)

    expect(screen.getByRole("button", { name: "Refund" }).parentElement).toHaveClass("flex-wrap", "lg:flex-nowrap")
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("max-lg:truncate")
  })

  it("lines actions that wrap onto a second row up on the right, like actions that fit beside the title", () => {
    renderHeader(
      <AdminHeader
        actions={
          <>
            <button type="button">Print summary</button>
            <button type="button">Cancel order</button>
          </>
        }
        title="MRT-2026-00001"
      />,
    )

    expect(screen.getByRole("button", { name: "Print summary" }).parentElement).toHaveClass("ml-auto", "max-lg:justify-end")
  })

  it("names the sidebar button so a screen reader announces it", () => {
    renderHeader(<AdminHeader title="Products" />)

    expect(screen.getByRole("button", { name: "Toggle Sidebar" })).toBeInTheDocument()
  })

  it("keeps the description off phone headers so the title stays readable", () => {
    renderHeader(<AdminHeader description="Manage your catalog" title="Products" />)

    expect(screen.getByText("Manage your catalog")).toHaveClass("max-sm:hidden", "max-lg:truncate")
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
