import { queryOptions } from "@tanstack/react-query"
import { createServerFn, createServerOnlyFn, getGlobalStartContext } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { getRequestSession } from "~/src/integrations/better-auth/auth.session"
import {
  DISPLAY_PREFERENCES_QUERY_KEY,
  type DisplayPreferenceState,
  type DisplayPreferences,
  detectDisplayPreferences,
  resolveDisplayPreferences,
  toSavedDisplayPreferences,
} from "~/src/integrations/use-intl/i18n.display"

const readDisplayPreferenceState = async (): Promise<DisplayPreferenceState> => {
  const { headers } = getRequest()
  const session = await getRequestSession()

  return {
    detected: detectDisplayPreferences({
      acceptLanguage: headers.get("accept-language"),
      cookieHeader: headers.get("cookie"),
      edgeTimeZone: getGlobalStartContext()?.edgeTimeZone,
    }),
    saved: toSavedDisplayPreferences(session?.user),
  }
}

export const getDisplayPreferences = createServerFn({ method: "GET" }).handler(readDisplayPreferenceState)

export const resolveRequestDisplayPreferences = createServerOnlyFn(async (): Promise<DisplayPreferences> =>
  resolveDisplayPreferences(await readDisplayPreferenceState()),
)

export const displayPreferencesQuery = queryOptions({
  queryFn: () => getDisplayPreferences(),
  queryKey: DISPLAY_PREFERENCES_QUERY_KEY,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
  staleTime: Infinity,
})
