import { type JSX } from "react"

import { type QueryKey } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type * as SidebarPreference from "~/src/presentation/theme/sidebar-preference"

interface AdminRouteDefinition {
  readonly beforeLoad?: (args: { readonly location: { readonly href: string } }) => Promise<{ readonly user: unknown }>
  readonly component?: () => JSX.Element
  readonly head?: () => { readonly links: readonly { readonly href: string; readonly rel: string }[] }
  readonly loader?: () => { readonly sidebarDefaultOpen: boolean }
  readonly shouldReload?: boolean
  readonly staleTime?: number
  readonly staticData?: { readonly namespaces: readonly string[] }
}

const preference = vi.hoisted(() => ({ open: true }))

const guard = vi.hoisted(() => ({ requireAdmin: vi.fn(() => Promise.resolve({ id: "admin-1", role: "admin" })) }))

const realtime = vi.hoisted(() => ({
  useRealtimeQuerySync: vi.fn<(options: { hub: string; subscriptions: readonly QueryKey[] }) => void>(),
}))

const loaderData: { current: { readonly sidebarDefaultOpen: boolean } } = { current: { sidebarDefaultOpen: true } }

const captured: { current: AdminRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    Outlet: (): JSX.Element => <div data-testid="outlet" />,
    createFileRoute: () => (options: AdminRouteDefinition) => {
      captured.current = options

      return { options, useLoaderData: () => loaderData.current }
    },
  }
})
vi.mock("~/src/integrations/better-auth/auth.routes", () => ({ requireAdmin: guard.requireAdmin }))
vi.mock("~/src/hooks/use-realtime-query-sync", () => ({ useRealtimeQuerySync: realtime.useRealtimeQuerySync }))
vi.mock("~/src/presentation/theme/sidebar-preference", async (importOriginal) => {
  const actual = await importOriginal<typeof SidebarPreference>()

  return { ...actual, getAdminSidebarDefaultOpen: () => preference.open }
})
vi.mock("~/src/presentation/components/custom/pages/admin/admin-sidebar", async () => {
  const { useSidebar } = await import("~/src/presentation/components/shadcn/sidebar")

  return {
    AdminSidebar: (): JSX.Element => <nav data-testid="admin-sidebar">{useSidebar().state}</nav>,
  }
})

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  ADMIN_REALTIME_QUERY_PREFIXES,
  REALTIME_INVALIDATION_HUB,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import adminCss from "~/src/presentation/styles/admin.css?url"

await import("~/src/routes/admin")

const route = captured.current

if (route === undefined) {
  throw new Error("the admin layout route did not register any options")
}

const renderLayout = () => {
  const AdminLayoutRoute = route.component
  if (AdminLayoutRoute === undefined) {
    throw new Error("the admin layout route registered no component")
  }

  return renderWithProviders(<AdminLayoutRoute />)
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  document.documentElement.classList.add("dark")
  loaderData.current = { sidebarDefaultOpen: true }
  preference.open = true
})

afterEach(() => {
  cleanup()
})

describe("admin layout", () => {
  it("renders the admin sidebar beside the routed page", () => {
    renderLayout()

    expect(screen.getByTestId("admin-sidebar")).toBeInTheDocument()
    expect(screen.getByRole("main")).toContainElement(screen.getByTestId("outlet"))
  })

  it("opens the sidebar when the stored preference says it was left open", () => {
    renderLayout()

    expect(screen.getByTestId("admin-sidebar")).toHaveTextContent("expanded")
  })

  it("keeps the sidebar collapsed when the stored preference says it was closed", () => {
    loaderData.current = { sidebarDefaultOpen: false }

    renderLayout()

    expect(screen.getByTestId("admin-sidebar")).toHaveTextContent("collapsed")
  })

  it("drops the storefront dark theme while the dashboard is on screen", () => {
    renderLayout()

    expect(document.documentElement).not.toHaveClass("dark")
  })

  it("subscribes the dashboard to every admin query the realtime hub can invalidate", () => {
    renderLayout()

    expect(realtime.useRealtimeQuerySync).toHaveBeenCalledWith({
      hub: REALTIME_INVALIDATION_HUB.ADMIN,
      subscriptions: ADMIN_REALTIME_QUERY_PREFIXES,
    })
  })
})

describe("admin layout route wiring", () => {
  it("refuses the dashboard to anyone the admin guard rejects", async () => {
    await expect(route.beforeLoad?.({ location: { href: "/admin/orders" } })).resolves.toStrictEqual({
      user: { id: "admin-1", role: "admin" },
    })
    expect(guard.requireAdmin).toHaveBeenCalledWith("/admin/orders")
  })

  it("carries the persisted sidebar preference into the layout", () => {
    preference.open = false

    expect(route.loader?.()).toStrictEqual({ sidebarDefaultOpen: false })
  })

  it("loads the dashboard stylesheet for the whole admin area", () => {
    expect(route.head?.().links).toStrictEqual([{ href: adminCss, rel: "stylesheet" }])
  })

  it("keeps the layout data for a minute and never reloads it mid-visit", () => {
    expect(route.staleTime).toBe(60_000)
    expect(route.shouldReload).toBe(false)
  })

  it("declares the message namespaces the dashboard needs", () => {
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.admin", "components.datagrid"] })
  })
})
