import { type JSX } from "react"

import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "~/src/routes"
const AdminCatalogIndexRoute = (): JSX.Element => <div />

export const Route = createFileRoute("/{-$locale}/admin/catalog/")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: `/{-$locale}${ROUTES.ADMIN_PRODUCTS}`,
    })
  },
  component: AdminCatalogIndexRoute,
})
