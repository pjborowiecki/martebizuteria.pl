import { createFileRoute, redirect } from "@tanstack/react-router"

import { ROUTES } from "~/src/routes"

export const Route = createFileRoute("/admin/settings/")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: ROUTES.ADMIN_SETTINGS_ACCOUNT,
    })
  },
})
