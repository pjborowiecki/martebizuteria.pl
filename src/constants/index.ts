import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";
import { STATIC_PAGES } from "~/src/constants/_constants/pages";
import { ROUTES } from "~/src/constants/_constants/routes";
import { SOCIALS } from "~/src/constants/_constants/socials";
import { DEFAULT_TIMEZONE, TIME_ZONES } from "~/src/constants/_constants/timezone";

const DELIVERY_METHOD = {
  COURIER: "courier",
  IN_STORE: "in_store",
  LOCKER: "locker"
} as const;

const DELIVERY_METHODS = [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.LOCKER, DELIVERY_METHOD.IN_STORE] as const;

const PAYMENT_METHOD = {
  BANK_TRANSFER: "bank_transfer",
  BLIK: "blik",
  CARD: "card"
} as const;

const PAYMENT_METHODS = [PAYMENT_METHOD.CARD, PAYMENT_METHOD.BLIK, PAYMENT_METHOD.BANK_TRANSFER] as const;

export const CONSTANTS = {
  APP_GITHUB_OWNER: "pjborowiecki",
  APP_GITHUB_REPO: "martebizuteria.pl_tanstack_start",
  APP_NAME: "M'Arte",
  DEFAULT_APP_URL: "http://localhost:3000",
  DEFAULT_DELIVERY_METHOD: DELIVERY_METHOD.COURIER,
  DEFAULT_LOCALE,
  DEFAULT_PAYMENT_METHOD: PAYMENT_METHOD.CARD,
  DEFAULT_TIMEZONE,
  DELIVERY_METHOD,
  DELIVERY_METHODS,
  LOCALES,
  LOCALE_COOKIE_NAME: "marte_locale",
  PAYMENT_METHOD,
  PAYMENT_METHODS,
  ROUTES,
  SOCIALS,
  STATIC_PAGES,
  TIME_ZONES
} as const;
