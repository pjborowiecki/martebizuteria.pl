import type { JSX } from "react";

import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { isValidLocale } from "~/src/lib/utils";

import { Footer } from "~/src/components/custom/pages/landing-page/footer/footer";
import { Navigation } from "~/src/components/custom/pages/landing-page/navigation/components/navigation/navigation";
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
  return (
    <SmoothScroll>
      <Navigation />
      <Outlet />
      <Footer />
    </SmoothScroll>
  );
}
