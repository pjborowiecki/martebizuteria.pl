const COOKIE_NAME = "marte_locale"

const SUPPORTED_LOCALES = ["pl-PL", "en-US"] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const DEFAULT_LOCALE: SupportedLocale = "pl-PL"

const DEFAULT_TIMEZONE = "Europe/Warsaw"

export const I18N = {
  COOKIE_NAME,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  SUPPORTED_LOCALES,
} as const
