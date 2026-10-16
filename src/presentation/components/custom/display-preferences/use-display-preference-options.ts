import { useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { FORMAT_LOCALES } from "~/src/integrations/use-intl/i18n.display"
import { displayPreferencesQuery } from "~/src/integrations/use-intl/i18n.display-preferences"

import { TIMEZONES } from "~/src/modules/_core/constants/timezone"

export const AUTOMATIC_PREFERENCE = "automatic"

const SAMPLE_INSTANT = Date.parse("2026-12-31T18:30:00Z")

const SAMPLE_NUMBER = 1234.5

const withSaved = (options: readonly PreferenceOption[], saved: string | undefined, label: (value: string) => string) =>
  saved === undefined || options.some((option) => option.value === saved) ? options : [...options, { label: label(saved), value: saved }]

export const describeFormatSample = (formatLocale: string): string =>
  `${new Intl.DateTimeFormat(formatLocale, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(SAMPLE_INSTANT)} · ${new Intl.NumberFormat(formatLocale).format(SAMPLE_NUMBER)}`

export const useDisplayPreferenceOptions = (): DisplayPreferenceOptions => {
  const t = useTranslations("components.custom.displayPreferences")
  const locale = useLocale()
  const {
    data: { detected, saved },
  } = useSuspenseQuery(displayPreferencesQuery)

  return useMemo(() => {
    const languageNames = new Intl.DisplayNames([locale], { type: "language" })
    const describeFormatLocale = (formatLocale: string) => [languageNames.of(formatLocale), describeFormatSample(formatLocale)].join(" — ")
    const formatLocaleOptions = FORMAT_LOCALES.map((formatLocale) => ({ label: describeFormatLocale(formatLocale), value: formatLocale }))
    const timeZoneOptions = TIMEZONES.map(({ iana }) => ({ label: iana, value: iana }))

    return {
      formatLocale: {
        options: [
          { label: t("automatic", { value: describeFormatLocale(detected.formatLocale) }), value: AUTOMATIC_PREFERENCE },
          ...withSaved(formatLocaleOptions, saved.formatLocale, describeFormatLocale),
        ],
        value: saved.formatLocale ?? AUTOMATIC_PREFERENCE,
      },
      timeZone: {
        options: [
          { label: t("automatic", { value: detected.timeZone }), value: AUTOMATIC_PREFERENCE },
          ...withSaved(timeZoneOptions, saved.timeZone, (zone) => zone),
        ],
        value: saved.timeZone ?? AUTOMATIC_PREFERENCE,
      },
    }
  }, [detected, locale, saved, t])
}

export interface PreferenceOption {
  readonly label: string
  readonly value: string
}

export interface PreferenceChoice {
  readonly options: readonly PreferenceOption[]
  readonly value: string
}

interface DisplayPreferenceOptions {
  readonly formatLocale: PreferenceChoice
  readonly timeZone: PreferenceChoice
}
