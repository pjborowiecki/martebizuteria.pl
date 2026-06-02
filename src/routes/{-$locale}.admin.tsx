import { type JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import { requireAdmin } from "~/src/integrations/better-auth/auth.guards";

import { cn } from "~/src/lib/utils";

import { SidebarInset, SidebarProvider } from "~/src/components/shadcn/sidebar";

import { ADMIN_LAYOUT_BG_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";
import { AdminSidebar } from "~/src/components/custom/pages/admin/admin-sidebar";

import { useAdminLightTheme } from "~/src/hooks/use-admin-light-theme";

const ROUTE_STALE_MS = 60_000;

export const Route = createFileRoute("/{-$locale}/admin")({
  beforeLoad: async () => ({ user: await requireAdmin() }),
  component: AdminLayoutRoute,
  shouldReload: false,
  staleTime: ROUTE_STALE_MS
});

function AdminLayoutRoute(): JSX.Element {
  useAdminLightTheme();

  return (
    <SidebarProvider className={cn("min-h-svh", ADMIN_LAYOUT_BG_CLASS)}>
      <AdminSidebar />
      <SidebarInset className={cn("min-w-0", ADMIN_LAYOUT_BG_CLASS)}>
        <div data-admin-main className="flex min-h-svh min-w-0 flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
