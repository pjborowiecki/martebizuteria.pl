import type { JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import { redirectAuthenticated } from "~/src/integrations/better-auth/auth.guards";

import { AuthEditorial } from "~/src/components/custom/pages/auth/auth-editorial";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

export const Route = createFileRoute("/{-$locale}/auth")({
  beforeLoad: () => redirectAuthenticated(),
  component: AuthLayoutRoute
});

function AuthLayoutRoute(): JSX.Element {
  return (
    <>
      <Navigation />
      <div className="h-[calc(100svh-var(--nav-height,80px))]" />

      <div className="fixed inset-0 top-(--nav-height,80px) z-0 grid lg:grid-cols-2">
        <AuthEditorial />

        <div className="flex items-center justify-center overflow-y-auto px-6 py-16 sm:px-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md space-y-10">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
