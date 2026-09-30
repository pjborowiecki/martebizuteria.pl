import { type Locale as DayPickerLocale, enUS, pl } from "react-day-picker/locale"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const getDayPickerLocale = (locale: SupportedLocale): DayPickerLocale => DAY_PICKER_LOCALE_BY_APP_LOCALE[locale]

const DAY_PICKER_LOCALE_BY_APP_LOCALE: Record<SupportedLocale, DayPickerLocale> = {
  "en-US": enUS,
  "pl-PL": pl,
}
