import { env } from "cloudflare:workers"

import { createFileRoute } from "@tanstack/react-router"

import { stripe } from "~/src/integrations/stripe/stripe.server"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { tryCatch } from "~/src/lib/try-catch"

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature")

        if (signature === null || !env.STRIPE_WEBHOOK_SECRET) {
          return new Response("Missing signature or webhook secret", { status: 400 })
        }

        const [body, bodyError] = await tryCatch(request.text())
        if (body === undefined) {
          console.error("[Stripe] Failed to read request body", bodyError)
          return new Response("Invalid request body", { status: 400 })
        }

        const [event, signatureError] = await tryCatch(stripe.webhooks.constructEventAsync(body, signature, env.STRIPE_WEBHOOK_SECRET))
        if (event === undefined) {
          console.error("[Stripe] Signature verification failed", signatureError)
          return new Response("Webhook Error: Invalid Signature", { status: 400 })
        }

        const handler = webhookHandlers[event.type]

        if (handler === undefined) {
          console.info(`[Stripe] Safely ignoring unhandled event: ${event.type}`)
          return Response.json({ received: true })
        }

        const [, handlerError] = await tryCatch(handler(event))
        if (handlerError !== undefined) {
          console.error(`[Stripe] Domain logic failed for ${event.type}:`, handlerError)
          return new Response("Internal Server Error", { status: 500 })
        }

        return Response.json({ received: true })
      },
    },
  },
})
