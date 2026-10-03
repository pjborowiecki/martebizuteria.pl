import handler from "@tanstack/react-start/server-entry"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"
import { handleRealtimeInvalidationWebSocket } from "~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"

import { type AuditLogQueueMessage, processAuditLogQueueBatch } from "~/src/modules/audit-log/audit-log.queue.server"

import { executionContextStorage } from "~/src/lib/background"
import { serializeCookie } from "~/src/lib/cookie"
import { generateRobotsTxt, generateSitemapXml } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const sitemapResponse = (origin: string): Response =>
  new Response(generateSitemapXml(origin), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  })

const robotsResponse = (origin: string, appEnv: string): Response =>
  new Response(generateRobotsTxt(origin, appEnv), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })

export { RealtimeInvalidationHub } from "~/src/durable-objects/realtime-invalidation-hub"

export interface RequestContext {
  env: Env
  passThroughOnException: () => void
  waitUntil: (promise: Readonly<Promise<unknown>>) => void
}

declare module "@tanstack/react-start" {
  interface Register {
    server: {
      requestContext: RequestContext
    }
  }
}

const server: ExportedHandler<Env, AuditLogQueueMessage> = {
  async fetch(request, env, ctx) {
    const { origin, pathname, protocol } = new URL(request.url)
    if (pathname === "/sitemap.xml") {
      return sitemapResponse(origin)
    }

    if (pathname === "/robots.txt") {
      return robotsResponse(origin, env.APP_ENV)
    }

    if (pathname === ROUTES.API_REALTIME.ADMIN_WS) {
      return handleRealtimeInvalidationWebSocket(request, env, REALTIME_INVALIDATION_HUB.ADMIN)
    }

    if (pathname === ROUTES.API_REALTIME.STOREFRONT_WS) {
      return handleRealtimeInvalidationWebSocket(request, env, REALTIME_INVALIDATION_HUB.STOREFRONT)
    }

    const { redirect, setCookie } = resolveLocale(request)
    if (redirect) {
      return redirect
    }

    const waitUntil = ctx.waitUntil.bind(ctx)
    const response = await executionContextStorage.run(
      {
        waitUntil,
      },
      () =>
        handler.fetch(request, {
          context: {
            env,
            passThroughOnException: ctx.passThroughOnException.bind(ctx),
            waitUntil,
          },
          responseLinkHeader: true,
        }),
    )

    if (!setCookie) {
      return response
    }

    const newResponse = new Response(response.body, response)
    newResponse.headers.append("Set-Cookie", serializeCookie({ ...setCookie, options: { secure: protocol === "https:" } }))

    return newResponse
  },
  async queue(batch: MessageBatch<AuditLogQueueMessage>, _env: Env, _ctx: ExecutionContext): Promise<void> {
    await processAuditLogQueueBatch(batch)
  },
}

export default server
