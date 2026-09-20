import { type JSX } from "react"

import { Outlet, createFileRoute, notFound, useRouterState } from "@tanstack/react-router"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { isValidLocale } from "~/src/integrations/use-intl/i18n.utils"

import { isAdminPathname } from "~/src/lib/admin-route"

import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"
const MainLayout = (): JSX.Element => {
  const isAdmin = useRouterState({
    select: (state) => isAdminPathname(state.location.pathname),
  })
  if (isAdmin) {
    return <Outlet />
  }
  return (
    <SmoothScroll>
      <Outlet />
    </SmoothScroll>
  )
}
export const Route = createFileRoute("/{-$locale}")({
  beforeLoad: ({ params }) => {
    const { locale } = params
    if (typeof locale === "string" && !isValidLocale(locale)) {
      notFound({
        throw: true,
      })
    }
  },
  component: MainLayout,
  params: {
    stringify: (params) => ({
      locale: params.locale === DEFAULT_LOCALE ? undefined : params.locale,
    }),
  },
})
