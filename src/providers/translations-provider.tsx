import { type JSX, type ReactNode, useEffect } from "react"

import { useSuspenseQueries } from "@tanstack/react-query"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { type AbstractIntlMessages } from "use-intl"
import { IntlProvider } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { type NamespaceEntry, buildMessageTree, getRouteNamespaces, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { serializeCookie } from "~/src/lib/cookie"

export const TranslationsProvider = ({
  children,
  locale: propLocale,
}: Readonly<{
  children: ReactNode
  locale?: SupportedLocale
}>): JSX.Element => {
  const locale = useRouterState({
    select: () => propLocale ?? getCurrentLocale(),
  })

  useEffect(() => {
    document.cookie = serializeCookie({ name: I18N.COOKIE_NAME, value: locale })
  }, [locale])

  const namespaces = useMatches({
    select: getRouteNamespaces,
  })

  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) =>
      Object.assign(messagesQueryOptions({ locale, namespace }), {
        select: (data: AbstractIntlMessages): NamespaceEntry => [namespace, data],
      }),
    ),
  })

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={I18N.DEFAULT_TIMEZONE}>
      {children}
    </IntlProvider>
  )
}
