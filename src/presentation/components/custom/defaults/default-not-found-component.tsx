import { type JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.utils"

import { DEFAULT_MESSAGES } from "~/src/presentation/components/custom/defaults/default-messages"
export const DefaultNotFoundComponent = (): JSX.Element => {
  const locale = useRouterState({
    select: (state) => extractLocaleFromPath(new URL(state.location.publicHref, "http://localhost").pathname) ?? DEFAULT_LOCALE,
  })
  const messages = DEFAULT_MESSAGES[locale].notFound
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
      <h2 className="font-semibold">{messages.heading}</h2>
      <p className="text-sm text-muted-foreground">{messages.message}</p>
    </div>
  )
}
