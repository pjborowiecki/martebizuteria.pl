import type { JSX } from "react";

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";

import { AuthEditorial } from "~/src/components/custom/pages/auth/auth-editorial";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

import { sessionQueries } from "~/src/modules/session/session.queries";

export const Route = createFileRoute("/{-$locale}/auth")({
  beforeLoad: async () => {
    const session = await sessionQueries.getSessionFn();

    if (session?.user) {
      const isAdmin = session.user.role === CONSTANTS.ROLES.ADMIN || session.user.role === CONSTANTS.ROLES.MANAGER;

      redirect({
        throw: true,
        to: `/{-$locale}${isAdmin ? CONSTANTS.ROUTES.ADMIN : CONSTANTS.ROUTES.ACCOUNT}`
      });
    }
  },
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
