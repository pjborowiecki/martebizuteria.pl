import { env } from "cloudflare:workers"

import StripeServer from "stripe"

import { STRIPE_API_VERSION } from "~/src/integrations/stripe/stripe.constants"

import { APP_NAME } from "~/src/presentation/branding/app"

export const stripe = new StripeServer(env.STRIPE_SECRET_KEY, {
  apiVersion: STRIPE_API_VERSION,
  appInfo: {
    name: APP_NAME,
  },
  httpClient: StripeServer.createFetchHttpClient(),
})
