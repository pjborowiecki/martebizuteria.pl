import { type JSX, type ReactNode, useEffect, useMemo } from "react"

import { useQueryClient, useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query"
import { useMatches, useRouterState } from "@tanstack/react-router"
import { type AbstractIntlMessages } from "use-intl"
import { IntlProvider } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { TIME_ZONE_COOKIE_NAME, isTimeZone, readBrowserTimeZone, resolveDisplayPreferences } from "~/src/integrations/use-intl/i18n.display"
import { displayPreferencesQuery } from "~/src/integrations/use-intl/i18n.display-preferences"
import { type NamespaceEntry, buildMessageTree, getRouteNamespaces, messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { DisplayPreferencesContext } from "~/src/hooks/use-display-format"

import { readCookie, serializeCookie } from "~/src/lib/cookie"

const useBrowserTimeZone = (detectedTimeZone: string): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    const browserTimeZone = readBrowserTimeZone()
    if (!isTimeZone(browserTimeZone)) {
      return
    }

    if (readCookie({ header: document.cookie, name: TIME_ZONE_COOKIE_NAME }) !== browserTimeZone) {
      document.cookie = serializeCookie({
        name: TIME_ZONE_COOKIE_NAME,
        options: { secure: globalThis.location.protocol === "https:" },
        value: browserTimeZone,
      })
    }

    if (detectedTimeZone !== browserTimeZone) {
      queryClient.setQueryData(
        displayPreferencesQuery.queryKey,
        (state) => state && { ...state, detected: { ...state.detected, timeZone: browserTimeZone } },
      )
    }
  }, [detectedTimeZone, queryClient])
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

  const { data: preferenceState } = useSuspenseQuery(displayPreferencesQuery)
  const displayPreferences = useMemo(() => resolveDisplayPreferences(preferenceState), [preferenceState])
  useBrowserTimeZone(preferenceState.detected.timeZone)

  const messages = useSuspenseQueries({
    combine: (results) => buildMessageTree(results.map((result) => result.data)),
    queries: namespaces.map((namespace) =>
      Object.assign(messagesQueryOptions({ locale, namespace }), {
        select: (data: AbstractIntlMessages): NamespaceEntry => [namespace, data],
      }),
    ),
  })

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={displayPreferences.timeZone}>
      <DisplayPreferencesContext value={displayPreferences}>{children}</DisplayPreferencesContext>
    </IntlProvider>
  )
}
