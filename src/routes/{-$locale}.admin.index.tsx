import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/{-$locale}/admin/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/{-$locale}/admin/overview" })
  },
})
