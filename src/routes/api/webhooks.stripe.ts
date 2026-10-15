import { env } from "cloudflare:workers"

import { createFileRoute } from "@tanstack/react-router"
import type StripeType from "stripe"

import { foreignStripeDeployment, stripeDeploymentOf } from "~/src/integrations/stripe/stripe.deployment"
import { requiredStripeMode } from "~/src/integrations/stripe/stripe.keys"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { webhookHandlers } from "~/src/integrations/stripe/stripe.webhooks"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { sendIncidentAlert } from "~/src/lib/incident-alert.server"

const verifiedStripeEvent = async (request: Request, signature: string, secret: string): Promise<StripeType.Event | undefined> => {
  try {
    return await stripe.webhooks.constructEventAsync(await request.text(), signature, secret)
  } catch (error) {
    console.error("[Stripe] Signature verification failed", error)

    return undefined
  }
}

const isFromTheOtherStripeMode = (event: StripeType.Event): boolean => {
  const eventMode = event.livemode ? "live" : "test"
  const acceptedMode = requiredStripeMode(env.APP_ENV)
  if (eventMode === acceptedMode) {
    return false
  }

  console.error(`[Stripe] Ignoring ${eventMode} event ${event.id} (${event.type}): ${env.APP_ENV} accepts only ${acceptedMode} events`)

  return true
}

const isFromAnotherDeployment = (event: StripeType.Event): boolean => {
  const deployment = foreignStripeDeployment(event.data.object, env.APP_ENV)
  if (deployment === undefined) {
    return false
  }

  console.info(
    `[Stripe] Ignoring event ${event.id} (${event.type}): its checkout belongs to ${deployment}, while ${env.APP_ENV} keeps its checkouts in ${stripeDeploymentOf(env.APP_ENV)}`,
  )

  return true
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      GET: () => new Response("Method Not Allowed", { headers: { Allow: "POST" }, status: HTTP_STATUS.METHOD_NOT_ALLOWED }),
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature")

        if (signature === null || !env.STRIPE_WEBHOOK_SECRET) {
          return new Response("Missing signature or webhook secret", { status: HTTP_STATUS.BAD_REQUEST })
        }

        const event = await verifiedStripeEvent(request, signature, env.STRIPE_WEBHOOK_SECRET)

        if (event === undefined) {
          return new Response("Webhook Error: Invalid Signature", { status: HTTP_STATUS.BAD_REQUEST })
        }

        if (isFromTheOtherStripeMode(event) || (!event.livemode && isFromAnotherDeployment(event))) {
          return Response.json({ received: true })
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
          scheduleBackgroundWork(
            sendIncidentAlert({
              detail: `${event.type}: ${error instanceof Error ? error.message : String(error)}`,
              kind: "stripeWebhookFailed",
              reference: event.id,
            }),
          )

          return new Response("Internal Server Error", { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })
        }

        return Response.json({ received: true })
      },
    },
  },
})
