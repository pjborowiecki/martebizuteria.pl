import { readCookie } from "~/src/lib/cookie"

export const FALLBACK_FORMAT_LOCALE = "en-US"

export const FALLBACK_TIME_ZONE = "UTC"

export const TIME_ZONE_COOKIE_NAME = "marte_time_zone"

export const DISPLAY_PREFERENCES_QUERY_KEY = ["i18n", "displayPreferences"] as const

export const FORMAT_LOCALES = [
  "en-US",
  "en-GB",
  "pl-PL",
  "de-DE",
  "fr-FR",
  "es-ES",
  "it-IT",
  "nl-NL",
  "pt-PT",
  "cs-CZ",
  "sk-SK",
  "uk-UA",
  "lt-LT",
  "sv-SE",
  "da-DK",
  "nb-NO",
  "fi-FI",
  "ja-JP",
] as const

export const FORMAT_LOCALE_MAX_LENGTH = 35

export const TIME_ZONE_MAX_LENGTH = 64

const ACCEPT_LANGUAGE_ENTRY_SEPARATOR = ","

const ACCEPT_LANGUAGE_WEIGHT_SEPARATOR = ";"

export const isTimeZone = (value: string | null | undefined): value is string => {
  if (value === null || value === undefined || value === "" || value.length > TIME_ZONE_MAX_LENGTH) {
    return false
  }

  try {
    return new Intl.DateTimeFormat(FALLBACK_FORMAT_LOCALE, { timeZone: value }).resolvedOptions().timeZone !== ""
  } catch {
    return false
  }
}

export const readBrowserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone

export const toFormatLocale = (value: string | null | undefined): string | undefined => {
  if (value === null || value === undefined || value === "" || value.length > FORMAT_LOCALE_MAX_LENGTH) {
    return undefined
  }

  try {
    const [supported] = Intl.DateTimeFormat.supportedLocalesOf(Intl.getCanonicalLocales(value))

    return supported
  } catch {
    return undefined
  }
}

export const formatLocaleFromAcceptLanguage = (header: string | null | undefined): string | undefined =>
  header
    ?.split(ACCEPT_LANGUAGE_ENTRY_SEPARATOR)
    .map((entry) => toFormatLocale(entry.split(ACCEPT_LANGUAGE_WEIGHT_SEPARATOR)[0]?.trim()))
    .find((locale) => locale !== undefined)

export const detectDisplayPreferences = ({ acceptLanguage, cookieHeader, edgeTimeZone }: DisplayPreferenceSignals): DisplayPreferences => ({
  formatLocale: formatLocaleFromAcceptLanguage(acceptLanguage) ?? FALLBACK_FORMAT_LOCALE,
  timeZone:
    [readCookie({ header: cookieHeader, name: TIME_ZONE_COOKIE_NAME }), edgeTimeZone].find((zone) => isTimeZone(zone)) ??
    FALLBACK_TIME_ZONE,
})

export const toSavedDisplayPreferences = (
  user: Readonly<{ formatLocale?: string | null | undefined; timezone?: string | null | undefined }> | undefined,
): SavedDisplayPreferences => ({
  formatLocale: toFormatLocale(user?.formatLocale),
  timeZone: isTimeZone(user?.timezone) ? user.timezone : undefined,
})

export const resolveDisplayPreferences = ({ detected, saved }: DisplayPreferenceState): DisplayPreferences => ({
  formatLocale: saved.formatLocale ?? detected.formatLocale,
  timeZone: saved.timeZone ?? detected.timeZone,
})

export interface DisplayPreferences {
  readonly formatLocale: string
  readonly timeZone: string
}

export interface SavedDisplayPreferences {
  readonly formatLocale: string | undefined
  readonly timeZone: string | undefined
}

export interface DisplayPreferenceState {
  readonly detected: DisplayPreferences
  readonly saved: SavedDisplayPreferences
}

export interface DisplayPreferenceSignals {
  readonly acceptLanguage: string | null | undefined
  readonly cookieHeader: string | null | undefined
  readonly edgeTimeZone: string | undefined
}
