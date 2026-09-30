import { env } from "cloudflare:workers"

import { createFileRoute } from "@tanstack/react-router"
import type StripeType from "stripe"

import { stripe } from "~/src/integrations/stripe/stripe.server"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

const verifiedStripeEvent = async (request: Request, signature: string, secret: string): Promise<StripeType.Event | undefined> => {
  try {
    return await stripe.webhooks.constructEventAsync(await request.text(), signature, secret)
  } catch (error) {
    console.error("[Stripe] Signature verification failed", error)

    return undefined
  }
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature")

        if (signature === null || !env.STRIPE_WEBHOOK_SECRET) {
          return new Response("Missing signature or webhook secret", { status: HTTP_STATUS.BAD_REQUEST })
        }

        const event = await verifiedStripeEvent(request, signature, env.STRIPE_WEBHOOK_SECRET)

        if (event === undefined) {
          return new Response("Webhook Error: Invalid Signature", { status: HTTP_STATUS.BAD_REQUEST })
        }

        const handler = webhookHandlers[event.type]

        if (handler === undefined) {
          console.info(`[Stripe] Safely ignoring unhandled event: ${event.type}`)

          return Response.json({ received: true })
        }

        try {
          await handler(event)
        } catch (error) {
          console.error(`[Stripe] Domain logic failed for ${event.type}:`, error)

          return new Response("Internal Server Error", { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })
        }

        return Response.json({ received: true })
      },
    },
  },
})
