import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { isValidLocale } from "~/src/lib/utils";

export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params }) => {
    const { locale } = params;

    if (typeof locale === "string" && !isValidLocale(locale)) {
      notFound({ throw: true });
    }
  },
  component: MainLayout
});

function MainLayout() {
  return <Outlet />;
}
