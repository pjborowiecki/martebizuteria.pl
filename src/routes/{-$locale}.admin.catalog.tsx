import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/{-$locale}/admin/catalog")({
  component: () => <Outlet />,
  staticData: { namespaces: ["pages.admin.catalog", "pages.admin.catalog.localePicker"] },
})
