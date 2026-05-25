import type { JSX } from "react";

import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Footer } from "~/src/components/custom/pages/landing-page/footer/footer";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";

export const Route = createFileRoute("/{-$locale}/_storefront")({
  component: StorefrontLayout
});

function StorefrontLayout(): JSX.Element {
  return (
    <div>
      <Navigation />
      <Outlet />
      <Footer />
    </div>
  );
}
