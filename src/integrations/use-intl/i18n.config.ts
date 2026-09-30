const COOKIE_NAME = "marte_locale"

const SUPPORTED_LOCALES = ["pl-PL", "en-US"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const DEFAULT_LOCALE: SupportedLocale = "pl-PL"

const DEFAULT_TIMEZONE = "Europe/Warsaw"

const TIME_ZONES = ["UTC", "America/New_York", "Europe/Warsaw"] as const

export const I18N = {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  SUPPORTED_LOCALES,
  TIME_ZONES,
} as const
