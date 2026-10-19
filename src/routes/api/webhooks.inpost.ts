import { env } from "cloudflare:workers"

import { createFileRoute } from "@tanstack/react-router"

import { INPOST_WEBHOOK_RATE_LIMIT } from "~/src/integrations/inpost/inpost.constants"
import { isInpostShipxConfigured } from "~/src/integrations/inpost/inpost.shipx.server"
import { inpostWebhookEventSchema } from "~/src/integrations/inpost/inpost.zod"
import { scheduleAdminOrdersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { tryParseJsonRecord } from "~/src/modules/_core/utils/json"
import { getOrderByInpostShipmentId } from "~/src/modules/order/order.accessors"
import { announceOrderShipment } from "~/src/modules/order/use-cases/announce-order-shipment.server"
import { syncOrderInpostShipment } from "~/src/modules/order/use-cases/sync-order-inpost-shipment.server"
import { RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { clientAddress, withinRateLimit } from "~/src/lib/rate-limit"
import { resolveDeploymentOrigin } from "~/src/lib/request"

const parseShopEvent = (body: string) => {
  const event = inpostWebhookEventSchema.safeParse(tryParseJsonRecord(body)).data

  return event !== undefined && isInpostShipxConfigured() && String(event.organization_id) === env.INPOST_ORGANIZATION_ID.trim()
    ? event
    : undefined
}

export const Route = createFileRoute("/api/webhooks/inpost")({
  server: {
    handlers: {
      GET: () => Response.json({ ready: true }),
      POST: async ({ request }) => {
        const admitted = await withinRateLimit({
          key: `inpost-webhook:${clientAddress(request.headers)}`,
          limit: INPOST_WEBHOOK_RATE_LIMIT,
          windowSeconds: RATE_LIMIT_WINDOW_SECONDS.REQUEST,
        })
        if (!admitted) {
          return new Response("Too Many Requests", { status: HTTP_STATUS.TOO_MANY_REQUESTS })
        }

        const event = parseShopEvent(await request.text())
        if (event === undefined) {
          return new Response("Not an InPost event for this shop", { status: HTTP_STATUS.BAD_REQUEST })
        }

        const shipmentId = String(event.payload.shipment_id)
        const shipmentOrder = await getOrderByInpostShipmentId(shipmentId)
        if (shipmentOrder === undefined) {
          console.info(`[InPost] Safely ignoring ${event.event} for shipment ${shipmentId}, which no order holds`)

          return Response.json({ received: true })
        }

        try {
          await syncOrderInpostShipment(shipmentOrder.id, shipmentId)
        } catch (error) {
          console.error(`[InPost] Shipment ${shipmentId} could not be read back from ShipX after ${event.event}:`, error)

          return new Response("Internal Server Error", { status: HTTP_STATUS.INTERNAL_SERVER_ERROR })
        }

        scheduleAdminOrdersInvalidation()
        scheduleBackgroundWork(announceOrderShipment(shipmentOrder.id, resolveDeploymentOrigin(request.url)))

        return Response.json({ received: true })
      },
    },
  },
})
