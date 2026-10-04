import { type Stripe, type StripeElementLocale, loadStripe } from "@stripe/stripe-js"
import { queryOptions } from "@tanstack/react-query"

import { STRIPE_QUERY_KEYS } from "~/src/integrations/stripe/stripe.constants"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

const isAppLocale = (value: string): value is SupportedLocale => I18N.SUPPORTED_LOCALES.some((candidate) => candidate === value)

const STRIPE_LOCALES = {
  "en-US": "en",
  "pl-PL": "pl",
} as const satisfies Record<SupportedLocale, StripeElementLocale>

export const toStripeLocale = (locale: string): StripeElementLocale => (isAppLocale(locale) ? STRIPE_LOCALES[locale] : "auto")

export const getStripe = (locale?: string): Promise<Stripe | null> => {
  if (stripeRef.current === undefined) {
    if (publishableKey === undefined || publishableKey === "") {
      console.warn("VITE_STRIPE_PUBLISHABLE_KEY is missing. Stripe will not initialize.")
    }

    const elementsLocale = locale === undefined ? undefined : toStripeLocale(locale)
    stripeRef.current = loadStripe(
      publishableKey ?? "",
      elementsLocale === undefined
        ? undefined
        : {
            locale: elementsLocale,
          },
    ).catch((error: unknown) => {
      stripeRef.current = undefined
      throw error
    })
  }

  return stripeRef.current
}

export const stripeJsQuery = (locale: string) =>
  queryOptions({
    queryFn: () => getStripe(locale),
    queryKey: [...STRIPE_QUERY_KEYS.JS, locale],
    retry: false,
    staleTime: "static",
  })

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

const stripeRef: {
  current: Promise<Stripe | null> | undefined
} = { current: undefined }
