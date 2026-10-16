import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/settings")({
  component: () => <Outlet />,
  staticData: {
    namespaces: ["pages.admin.settings", "pages.account", "pages.auth.errors", "pages.auth.validations"],
  },
})
