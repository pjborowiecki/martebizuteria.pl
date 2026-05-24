import { type JSX } from "react";

import { createFileRoute, redirect } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";

export const Route = createFileRoute("/{-$locale}/admin/catalog/")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: `/{-$locale}${CONSTANTS.ROUTES.ADMIN_PRODUCTS}`
    });
  },
  component: AdminCatalogIndexRoute
});

function AdminCatalogIndexRoute(): JSX.Element {
  return <div />;
}
