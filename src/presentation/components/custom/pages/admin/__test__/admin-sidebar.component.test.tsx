import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const auth = vi.hoisted(() => ({ signOut: vi.fn<(input: { fetchOptions: { onSuccess: () => void } }) => Promise<void>>() }))

vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signOut: auth.signOut }))

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { AdminSidebar } from "~/src/presentation/components/custom/pages/admin/admin-sidebar"

import { ROUTES } from "~/src/routes"

const renderSidebar = (path: string) =>
  renderWithProviders(
    <SidebarProvider>
      <AdminSidebar />
    </SidebarProvider>,
    { router: createTestRouter(path) },
  )

afterEach(cleanup)

beforeEach(() => {
  auth.signOut.mockReset()
  auth.signOut.mockResolvedValue()
})

describe("AdminSidebar", () => {
  it("brands the header with the store name and groups the menus", () => {
    renderSidebar(ROUTES.ADMIN_OVERVIEW)

    expect(screen.getByText("M'ARTE")).toBeInTheDocument()
    expect(screen.getByText("Main menu")).toBeInTheDocument()
    expect(screen.getByText("Tools")).toBeInTheDocument()
  })

  it("links the brand back to the storefront home", () => {
    renderSidebar(ROUTES.ADMIN_OVERVIEW)

    expect(screen.getByText("M'ARTE").closest("a")).toHaveAttribute("href", ROUTES.HOME)
  })

  it("lists every navigable destination once", () => {
    renderSidebar(ROUTES.ADMIN_OVERVIEW)

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_OVERVIEW)
    expect(screen.getByText("Orders").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_ORDERS)
    expect(screen.getByText("Customers").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_CUSTOMERS)
    expect(screen.getByText("Audit Log").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_AUDIT)
  })

  it("renders the unbuilt tools as plain buttons that navigate nowhere", () => {
    renderSidebar(ROUTES.ADMIN_OVERVIEW)

    for (const label of ["Marketing", "Coupons", "Content", "Settings"]) {
      const trigger = screen.getByText(label).closest("button")

      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute("data-trigger-disabled")
      expect(screen.getByText(label).closest("a")).toBeNull()
    }
  })

  it("marks the dashboard entry active on the overview route", () => {
    renderSidebar(ROUTES.ADMIN_OVERVIEW)

    expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("data-active")
  })

  it("moves the active marker to the page the pathname belongs to", () => {
    renderSidebar(ROUTES.ADMIN_ORDERS)

    expect(screen.getByText("Dashboard").closest("a")).not.toHaveAttribute("data-active")
    expect(screen.getByText("Orders").closest("a")).toHaveAttribute("data-active")
  })

  it("keeps the catalog group closed and inactive off the catalog routes", () => {
    renderSidebar(ROUTES.ADMIN_ORDERS)

    expect(screen.queryByText("Products")).toBeNull()
    expect(screen.getByText("Catalog").closest("button")).not.toHaveAttribute("data-active")
  })

  it("opens the catalog submenu on a catalog route and links each catalog page", () => {
    renderSidebar(ROUTES.ADMIN_PRODUCTS)

    expect(screen.getByText("Products").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_PRODUCTS)
    expect(screen.getByText("Categories").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_CATEGORIES)
    expect(screen.getByText("Collections").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_COLLECTIONS)
    expect(screen.getByText("Attributes").closest("a")).toHaveAttribute("href", ROUTES.ADMIN_ATTRIBUTES)
    expect(screen.getByText("Catalog").closest("button")).toHaveAttribute("data-active")
  })

  it("marks only the catalog page the pathname belongs to as active", () => {
    renderSidebar(ROUTES.ADMIN_CATEGORIES)

    expect(screen.getByText("Categories").closest("a")).toHaveAttribute("data-active")
    expect(screen.getByText("Collections").closest("a")).not.toHaveAttribute("data-active")
  })

  it("treats the new product form as part of the catalog group", () => {
    renderSidebar(`${ROUTES.ADMIN_CATALOG}/new`)

    expect(screen.getByText("Catalog").closest("button")).toHaveAttribute("data-active")
  })

  it("sends a click on the closed catalog trigger straight to the products page", async () => {
    const { router } = renderSidebar(ROUTES.ADMIN_ORDERS)
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined)

    await userEvent.click(screen.getByText("Catalog"))

    expect(navigate).toHaveBeenCalledWith({ to: ROUTES.ADMIN_PRODUCTS })
  })

  it("lets the catalog trigger act as a plain toggle while already inside the catalog", async () => {
    const { router } = renderSidebar(ROUTES.ADMIN_PRODUCTS)
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue(undefined)

    await userEvent.click(screen.getByText("Catalog"))

    expect(navigate).not.toHaveBeenCalled()
  })

  it("signs the admin out and resolves the sign in page for the browser redirect", async () => {
    const { router } = renderSidebar(ROUTES.ADMIN_OVERVIEW)
    const buildLocation = vi.spyOn(router, "buildLocation")

    await userEvent.click(screen.getByText("Sign out"))

    expect(auth.signOut).toHaveBeenCalledTimes(1)
    expect(buildLocation).not.toHaveBeenCalled()

    auth.signOut.mock.calls[0]?.[0].fetchOptions.onSuccess()

    expect(buildLocation).toHaveBeenCalledWith({ to: ROUTES.AUTH_SIGN_IN })
  })
})
