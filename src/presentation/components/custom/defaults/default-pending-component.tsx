import { type JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.utils"

import { isAdminPathname } from "~/src/lib/admin-route"

import { DEFAULT_MESSAGES } from "~/src/presentation/components/custom/defaults/default-messages"
export const DefaultPendingComponent = (): JSX.Element => {
  const { pathname, publicHref } = useRouterState({
    select: (state) => state.location,
  })
  if (isAdminPathname(pathname)) {
    // Keep admin chrome visible; child routes use Suspense fallbacks for dynamic regions.
    return <div className="min-h-0" aria-hidden />
  }
  const locale = extractLocaleFromPath(new URL(publicHref, "http://localhost").pathname) ?? DEFAULT_LOCALE
  return <div className="min-h-svh w-full bg-background" aria-busy="true" aria-label={DEFAULT_MESSAGES[locale].loading} />
}
