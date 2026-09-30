import { type JSX } from "react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getDefaultComponentMessages } from "~/src/presentation/components/custom/defaults/default-messages"

export const DefaultNotFoundComponent = (): JSX.Element => {
  const messages = getDefaultComponentMessages(getCurrentLocale()).notFound

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
      <h2 className="font-semibold">{messages.heading}</h2>
      <p className="text-sm text-muted-foreground">{messages.message}</p>
    </div>
  )
}
