import type { JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "~/src/components/custom/pages/landing-page/footer/footer";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

export const Route = createFileRoute("/{-$locale}/_storefront")({
  component: StorefrontLayout
});

function StorefrontLayout(): JSX.Element {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navigation />
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
