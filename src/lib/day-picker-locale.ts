import { type Locale as DayPickerLocale, enUS, pl } from "react-day-picker/locale"

import { type Locale } from "~/src/integrations/use-intl/i18n.types"
export const getDayPickerLocale = (locale: Locale): DayPickerLocale => DAY_PICKER_LOCALE_BY_APP_LOCALE[locale]

const DAY_PICKER_LOCALE_BY_APP_LOCALE: Record<Locale, DayPickerLocale> = {
  en: enUS,
  pl,
}
