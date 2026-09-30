import { type JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"
import { cn } from "cn"

import { requireAdmin } from "~/src/integrations/better-auth/auth.routes"
import {
  ADMIN_REALTIME_QUERY_PREFIXES,
  REALTIME_INVALIDATION_HUB,
} from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"

import { useRealtimeQuerySync } from "~/src/hooks/use-realtime-query-sync"

import { getAdminSidebarDefaultOpen } from "~/src/presentation/theme/sidebar-preference"
import { useAdminLightTheme } from "~/src/presentation/theme/use-admin-light-theme"

import { SidebarInset, SidebarProvider } from "~/src/presentation/components/shadcn/sidebar"

import { ADMIN_LAYOUT_BG_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { AdminSidebar } from "~/src/presentation/components/custom/pages/admin/admin-sidebar"

import adminCss from "~/src/presentation/styles/admin.css?url"

const AdminLayoutRoute = (): JSX.Element => {
  const { sidebarDefaultOpen } = Route.useLoaderData()
  useAdminLightTheme()
  useRealtimeQuerySync({
    hub: REALTIME_INVALIDATION_HUB.ADMIN,
    subscriptions: ADMIN_REALTIME_QUERY_PREFIXES,
  })

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen} className={cn("min-h-svh", ADMIN_LAYOUT_BG_CLASS)}>
      <AdminSidebar />
      <SidebarInset className={cn("min-w-0", ADMIN_LAYOUT_BG_CLASS)}>
        <div data-admin-main className="flex h-svh min-w-0 flex-col overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

const ROUTE_STALE_MS = 60_000

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => ({
    user: await requireAdmin(),
  }),
  component: AdminLayoutRoute,
  head: () => ({
    links: [
      {
        href: adminCss,
        rel: "stylesheet",
      },
    ],
  }),
  loader: () => ({
    sidebarDefaultOpen: getAdminSidebarDefaultOpen(),
  }),
  shouldReload: false,
  staleTime: ROUTE_STALE_MS,
  staticData: {
    namespaces: ["pages.admin", "components.datagrid"],
  },
})
