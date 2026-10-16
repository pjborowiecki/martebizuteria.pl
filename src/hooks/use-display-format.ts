import { createContext, useContext, useMemo } from "react"

import { createFormatter } from "use-intl"
import { useLocale, useTimeZone } from "use-intl/react"

import { type DisplayPreferences, FALLBACK_TIME_ZONE } from "~/src/integrations/use-intl/i18n.display"

export const DisplayPreferencesContext = createContext<DisplayPreferences | undefined>(undefined)

export const useDisplayPreferences = (): DisplayPreferences => {
  const preferences = useContext(DisplayPreferencesContext)
  const locale = useLocale()
  const timeZone = useTimeZone()

  return preferences ?? { formatLocale: locale, timeZone: timeZone ?? FALLBACK_TIME_ZONE }
}

export const useFormatLocale = (): string => useDisplayPreferences().formatLocale

export const useDisplayTimeZone = (): string => useDisplayPreferences().timeZone

export const useFormatter = (): DisplayFormatter => {
  const { formatLocale, timeZone } = useDisplayPreferences()

  return useMemo(() => createFormatter({ locale: formatLocale, timeZone }), [formatLocale, timeZone])
}

export type DisplayFormatter = ReturnType<typeof createFormatter>
