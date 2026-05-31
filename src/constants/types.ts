import type { CONSTANTS } from "~/src/constants";

export type Locale = (typeof CONSTANTS.LOCALES)[number];
export type DefaultLocale = typeof CONSTANTS.DEFAULT_LOCALE;

export type TimeZone = (typeof CONSTANTS.TIME_ZONES)[number];
export type DefaultTimeZone = typeof CONSTANTS.DEFAULT_TIMEZONE;

export type Role = (typeof CONSTANTS.ROLES)[keyof typeof CONSTANTS.ROLES];
