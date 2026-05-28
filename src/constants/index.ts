import { DELIVERY_METHOD, DELIVERY_METHODS } from "~/src/constants/_constants/delivery";
import { DEFAULT_LOCALE, LOCALES } from "~/src/constants/_constants/locales";
import { STATIC_PAGES } from "~/src/constants/_constants/pages";
import { ACTIONS, RESOURCES, ROLES } from "~/src/constants/_constants/permissions";
import { ROUTES } from "~/src/constants/_constants/routes";
import { SOCIALS } from "~/src/constants/_constants/socials";
import { CHECKOUT_PAYMENT_METHOD_ORDER, STRIPE_CURRENCY, STRIPE_WEBHOOK_EVENTS } from "~/src/constants/_constants/stripe";
import { DEFAULT_TIMEZONE, TIME_ZONES } from "~/src/constants/_constants/timezone";

export const CONSTANTS = {
  ACTIONS,
  APP_GITHUB_OWNER: "pjborowiecki",
  APP_GITHUB_REPO: "martebizuteria.pl_tanstack_start",
  APP_NAME: "M'Arte",
  CHECKOUT_PAYMENT_METHOD_ORDER,
  DEFAULT_APP_URL: "http://localhost:3000",
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  DELIVERY_METHOD,
  DELIVERY_METHODS,
  LOCALES,
  LOCALE_COOKIE_NAME: "marte_locale",
  RESOURCES,
  ROLES,
  ROUTES,
  SOCIALS,
  STATIC_PAGES,
  STRIPE_CURRENCY,
  STRIPE_WEBHOOK_EVENTS,
  TIME_ZONES
} as const;
