import { STORE_CURRENCY_CODE, SUPPORTED_CURRENCY_CODES } from "~/src/constants/_constants/currency";
import { DELIVERY_METHOD, DELIVERY_METHODS } from "~/src/constants/_constants/delivery";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, LOCALES } from "~/src/constants/_constants/locales";
import { STATIC_PAGES } from "~/src/constants/_constants/pages";
import { ACTIONS, ADMIN_PANEL_ROLES, DEFAULT_ROLE, RESOURCES, ROLES } from "~/src/constants/_constants/permissions";
import { QUERY_KEYS } from "~/src/constants/_constants/query-keys";
import { ROUTES } from "~/src/constants/_constants/routes";
import { SOCIALS } from "~/src/constants/_constants/socials";
import {
  CHECKOUT_PAYMENT_METHOD_ORDER,
  STRIPE_CURRENCY,
  STRIPE_API_VERSION,
  STRIPE_WEBHOOK_EVENTS
} from "~/src/constants/_constants/stripe";
import { DEFAULT_TIMEZONE, TIME_ZONES } from "~/src/constants/_constants/timezone";

import {
  COLLECTION_STATUS,
  COLLECTION_STATUSES,
  DEFAULT_COLLECTION_STATUS
} from "~/src/modules/product-collection/product-collection.constants";

export const CONSTANTS = {
  ACTIONS,
  ADMIN_PANEL_ROLES,
  APP_GITHUB_OWNER: "pjborowiecki",
  APP_GITHUB_REPO: "martebizuteria.pl",
  APP_NAME: "M'Arte",
  CHECKOUT_PAYMENT_METHOD_ORDER,
  COLLECTION_STATUS,
  COLLECTION_STATUSES,
  DEFAULT_APP_URL: "http://localhost:3000",
  DEFAULT_COLLECTION_STATUS,
  DEFAULT_LOCALE,
  DEFAULT_R2_PUBLIC_URL: "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev",
  DEFAULT_ROLE,
  DEFAULT_TIMEZONE,
  DELIVERY_METHOD,
  DELIVERY_METHODS,
  LOCALES,
  LOCALE_COOKIE_NAME,
  QUERY_KEYS,
  RESOURCES,
  ROLES,
  ROUTES,
  SOCIALS,
  STATIC_PAGES,
  STORE_CURRENCY_CODE,
  STRIPE_API_VERSION,
  STRIPE_CURRENCY,
  STRIPE_WEBHOOK_EVENTS,
  SUPPORTED_CURRENCY_CODES,
  TIME_ZONES
} as const;
