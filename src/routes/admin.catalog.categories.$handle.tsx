import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/catalog/categories/$handle")({
  beforeLoad: () => {
    redirect({
      throw: true,
      to: "/admin/catalog/categories",
    })
  },
})
