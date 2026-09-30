import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/admin/overview" })
  },
})
