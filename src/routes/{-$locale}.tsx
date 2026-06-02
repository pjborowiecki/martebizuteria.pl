import type { JSX } from "react";

import { createFileRoute, notFound, Outlet, useRouterState } from "@tanstack/react-router";

import { isAdminPathname } from "~/src/lib/admin-route";
import { isValidLocale } from "~/src/lib/utils";

import { SmoothScroll } from "~/src/components/custom/smooth-scroll";

export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params }) => {
    const { locale } = params;

    if (typeof locale === "string" && !isValidLocale(locale)) {
      notFound({ throw: true });
    }
  },
  component: MainLayout
});

function MainLayout(): JSX.Element {
  const isAdmin = useRouterState({
    select: (state) => isAdminPathname(state.location.pathname)
  });

  if (isAdmin) {
    return <Outlet />;
  }

  return (
    <SmoothScroll>
      <Outlet />
    </SmoothScroll>
  );
}
