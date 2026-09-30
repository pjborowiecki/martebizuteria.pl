import { type JSX } from "react"

import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "~/src/routes"

const AdminCatalogIndexRoute = (): JSX.Element => <div />

export const Route = createFileRoute("/admin/catalog/")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: ROUTES.ADMIN_PRODUCTS,
    })
  },
  component: AdminCatalogIndexRoute,
})
