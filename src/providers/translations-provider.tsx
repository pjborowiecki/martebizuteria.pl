import { type JSX, type ReactNode, useEffect } from "react"

import { useQuery, useSuspenseQueries } from "@tanstack/react-query"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { type AbstractIntlMessages } from "use-intl"
import { IntlProvider } from "use-intl/react"

import { type getCurrentSession, getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { type NamespaceEntry, buildMessageTree, getRouteNamespaces, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { serializeCookie } from "~/src/lib/cookie"

type CurrentSession = Awaited<ReturnType<typeof getCurrentSession>>

const selectTimeZone = (session: CurrentSession): string | undefined => {
  const timezone = session?.user.timezone

  return timezone === null || timezone === undefined || timezone === "" ? undefined : timezone
}

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
    document.cookie = serializeCookie({
      name: I18N.COOKIE_NAME,
      options: { secure: globalThis.location.protocol === "https:" },
      value: locale,
    })
  }, [locale])

  const namespaces = useMatches({
    select: getRouteNamespaces,
  })

  const timeZone = useQuery({ ...getCurrentSessionQuery, select: selectTimeZone }).data ?? I18N.DEFAULT_TIMEZONE
  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) =>
      Object.assign(messagesQueryOptions({ locale, namespace }), {
        select: (data: AbstractIntlMessages): NamespaceEntry => [namespace, data],
      }),
    ),
  })

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </IntlProvider>
  )
}
