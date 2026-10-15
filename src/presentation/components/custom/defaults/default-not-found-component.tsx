import { type JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getDefaultComponentMessages } from "~/src/presentation/components/custom/defaults/default-messages"
import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"
import { isAdminPathname } from "~/src/presentation/components/custom/pages/admin/lib/admin-route"

import { ROUTES } from "~/src/routes"

export const DefaultNotFoundComponent = (): JSX.Element => {
  const messages = getDefaultComponentMessages(getCurrentLocale()).notFound
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (isAdminPathname(pathname)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
        <h2 className="font-semibold">{messages.heading}</h2>
        <p className="text-sm text-muted-foreground">{messages.message}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60svh] flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="font-serif text-3xl tracking-tight md:text-4xl">{messages.heading}</h1>
      <p className="max-w-sm text-sm/relaxed text-muted-foreground">{messages.message}</p>
      <LocalizedLink
        className="mt-4 inline-flex h-12 items-center justify-center border border-foreground/25 px-8 text-[11px] tracking-[0.2em] uppercase transition-colors hover:border-foreground/60"
        to={ROUTES.HOME}
      >
        {messages.cta}
      </LocalizedLink>
    </div>
  )
}
