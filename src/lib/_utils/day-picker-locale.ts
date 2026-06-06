import { enUS, pl, type Locale as DayPickerLocale } from "react-day-picker/locale";

import type { Locale } from "~/src/constants/types";

const DAY_PICKER_LOCALE_BY_APP_LOCALE: Record<Locale, DayPickerLocale> = {
  en: enUS,
  pl
};

export function getDayPickerLocale(locale: Locale): DayPickerLocale {
  return DAY_PICKER_LOCALE_BY_APP_LOCALE[locale];
}
