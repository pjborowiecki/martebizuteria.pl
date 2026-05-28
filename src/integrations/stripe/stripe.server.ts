import { env } from "cloudflare:workers";
import StripeServer from "stripe";

import { CONSTANTS } from "~/src/constants";

export const stripe = new StripeServer(env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-04-22.dahlia",
  appInfo: {
    name: CONSTANTS.APP_NAME
  },
  httpClient: StripeServer.createFetchHttpClient()
});
