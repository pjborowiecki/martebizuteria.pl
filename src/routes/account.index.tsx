import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/account/")({
  beforeLoad: () => {
    redirect({ throw: true, to: "/account/overview" })
  },
})
