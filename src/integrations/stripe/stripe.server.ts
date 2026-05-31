import { env } from "cloudflare:workers";
import StripeServer from "stripe";

import { CONSTANTS } from "~/src/constants";

export const stripe = new StripeServer(env.STRIPE_SECRET_KEY, {
  apiVersion: CONSTANTS.STRIPE_API_VERSION,
  appInfo: {
    name: CONSTANTS.APP_NAME
  },
  httpClient: StripeServer.createFetchHttpClient()
});
