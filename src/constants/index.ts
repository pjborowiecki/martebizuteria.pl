import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";
import { STATIC_PAGES } from "~/src/constants/_constants/pages";
import { ROUTES } from "~/src/constants/_constants/routes";
import { SOCIALS } from "~/src/constants/_constants/socials";
import { DEFAULT_TIMEZONE, TIME_ZONES } from "~/src/constants/_constants/timezone";

export const CONSTANTS = {
  APP_GITHUB_OWNER: "pjborowiecki",
  APP_GITHUB_REPO: "martebizuteria.pl_tanstack_start",
  APP_NAME: "M'Arte",
  DEFAULT_APP_URL: "http://localhost:3000",
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  LOCALES,
  LOCALE_COOKIE_NAME: "marte_locale",
  ROUTES,
  SOCIALS,
  STATIC_PAGES,
  TIME_ZONES
} as const;
