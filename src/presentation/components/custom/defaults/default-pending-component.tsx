import { type JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getDefaultComponentMessages } from "~/src/presentation/components/custom/defaults/default-messages"
import { isAdminPathname } from "~/src/presentation/components/custom/pages/admin/lib/admin-route"

export const DefaultPendingComponent = (): JSX.Element => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (isAdminPathname(pathname)) {
    return <div className="min-h-0" aria-hidden />
  }

  return (
    <div className="min-h-svh w-full bg-background" aria-busy="true" aria-label={getDefaultComponentMessages(getCurrentLocale()).loading} />
  )
}
