import { type JSX } from "react"

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"

import { AuthEditorial } from "~/src/presentation/components/custom/pages/auth/auth-editorial"
import { Navigation } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation"

const AuthLayoutRoute = (): JSX.Element => (
  <>
    <Navigation />
    <div className="h-[calc(100svh-var(--nav-height,80px))]" />

    <div className="fixed inset-0 top-(--nav-height,80px) z-0 grid lg:grid-cols-2">
      <AuthEditorial />

      <div className="flex items-center justify-center overflow-y-auto px-6 py-16 sm:px-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md space-y-10">
          <Outlet />
        </div>
      </div>
    </div>
  </>
)

export const Route = createFileRoute("/auth")({
  beforeLoad: redirectIfSignedIn,
  component: AuthLayoutRoute,
  staticData: {
    namespaces: ["pages.auth.errors", "pages.auth.validations", "pages.auth.oauth"],
  },
})
