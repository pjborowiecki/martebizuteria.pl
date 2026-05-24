import { type JSX, Suspense } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SidebarInset, SidebarProvider } from "~/src/components/shadcn/sidebar";

import { AdminSidebar } from "~/src/components/custom/pages/admin/admin-sidebar";

export const Route = createFileRoute("/{-$locale}/admin")({
  component: AdminLayoutRoute
});

function AdminSidebarFallback(): JSX.Element {
  return <div className="hidden h-svh w-64 shrink-0 animate-pulse border-r border-sidebar-border bg-sidebar lg:block" aria-hidden />;
}

function AdminMainFallback(): JSX.Element {
  return (
    <div className="flex min-h-svh flex-1 animate-pulse flex-col gap-6 bg-secondary/30 p-8" aria-hidden>
      <div className="h-9 max-w-lg rounded-md bg-muted" />
      <div className="h-48 rounded-xl bg-muted/45" />
    </div>
  );
}

const ADMIN_SIDEBAR_FALLBACK = <AdminSidebarFallback />;
const ADMIN_MAIN_FALLBACK = <AdminMainFallback />;

function AdminLayoutRoute(): JSX.Element {
  return (
    <SidebarProvider>
      <Suspense fallback={ADMIN_SIDEBAR_FALLBACK}>
        <AdminSidebar />
      </Suspense>
      <SidebarInset className="bg-secondary/30">
        <Suspense fallback={ADMIN_MAIN_FALLBACK}>
          <div className="flex min-h-svh flex-col">
            <Outlet />
          </div>
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
}
