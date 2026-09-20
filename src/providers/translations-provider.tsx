import { type ReactNode, useEffect } from "react"

import { useSuspenseQueries } from "@tanstack/react-query"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { type AbstractIntlMessages, IntlProvider } from "use-intl"

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from "~/src/integrations/use-intl/i18n.config"
import { type NamespaceEntry, buildMessageTree, getRouteNamespaces, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { useTimeZone } from "~/src/integrations/use-intl/i18n.timezone"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
import { extractLocaleFromPath } from "~/src/integrations/use-intl/i18n.utils"
export const TranslationsProvider = ({
  children,
  locale: propLocale,
}: Readonly<{
  children: ReactNode
  locale?: Locale
}>) => {
  const locale = useRouterState({
    select: (state) =>
      propLocale ?? extractLocaleFromPath(new URL(state.location.publicHref, "http://localhost").pathname) ?? DEFAULT_LOCALE,
  })
  useEffect(() => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${globalThis.location.protocol === "https:" ? "; Secure" : ""}`
  }, [locale])
  const namespaces = useMatches({
    select: getRouteNamespaces,
  })
  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) =>
      Object.assign(messagesQueryOptions(locale, namespace), {
        select: (data: AbstractIntlMessages): NamespaceEntry => [namespace, data],
      }),
    ),
  })
  const timeZone = useTimeZone()
  return (
    <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </IntlProvider>
  )
}
