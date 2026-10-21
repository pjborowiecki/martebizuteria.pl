import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"
import { handleRealtimeInvalidationWebSocket } from "~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"

import { HTTP_STATUS, bareDomainUrl } from "~/src/modules/_core/constants/api"
import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.types"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { isNewsletterQueueBatch } from "~/src/modules/newsletter-campaign/newsletter-campaign.utils"

import { executionContextStorage } from "~/src/lib/background"
import { serializeCookie } from "~/src/lib/cookie"
import { createContentSecurityPolicyNonce, withSecurityHeaders } from "~/src/lib/security-headers"
import { generateRobotsTxt, generateSitemapXml } from "~/src/lib/seo"
import { collectServerTimings, formatServerTimingHeader, timeServerWork } from "~/src/lib/server-timing"

import { ROUTES } from "~/src/routes"

const sitemapResponse = async (origin: string): Promise<Response> => {
  const { listSitemapPages } = await import("~/src/lib/sitemap")

  return new Response(generateSitemapXml(origin, await listSitemapPages()), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  })
}

const robotsResponse = (origin: string, appEnv: string): Response =>
  new Response(generateRobotsTxt(origin, appEnv), {
    headers: {
      "Cache-Control": "public, max-age=86400",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })

export { RealtimeInvalidationHub } from "~/src/durable-objects/realtime-invalidation-hub"

export type WorkerQueueMessage = AuditLogQueueMessage | NewsletterCampaign["queueMessage"]

const isAuditLogQueueBatch = (batch: MessageBatch<WorkerQueueMessage>): batch is MessageBatch<AuditLogQueueMessage> =>
  !isNewsletterQueueBatch(batch)

export interface RequestContext {
  edgeTimeZone: string | undefined
  env: Env
  nonce: string
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

const renderPage = createStartHandler((page) => timeServerWork("render", () => Promise.resolve(defaultStreamHandler(page))))

const isHtml = (response: Response): boolean => response.headers.get("Content-Type")?.startsWith("text/html") === true

const isPageLoad = (request: Request, response: Response): boolean => {
  if (request.method !== "GET") {
    return false
  }

  const { pathname } = new URL(request.url)
  if (pathname.startsWith("/api/")) {
    return false
  }

  return isHtml(response)
}

const keepOnlyEntryModulePreload = (page: Response): Response => {
  let entryKept = false

  return new HTMLRewriter()
    .on('link[rel="modulepreload"]', {
      element: (link) => {
        if (entryKept) {
          link.remove()
          return
        }

        link.setAttribute("fetchpriority", "low")
        entryKept = true
      },
    })
    .transform(page)
}

const respond = async (request: Request, context: RequestContext): Promise<Response> => {
  const { origin, pathname, protocol } = new URL(request.url)
  if (pathname === "/sitemap.xml") {
    return sitemapResponse(origin)
  }

  if (pathname === "/robots.txt") {
    return robotsResponse(origin, context.env.APP_ENV)
  }

  const { redirect, setCookie } = resolveLocale(request)
  if (redirect) {
    return redirect
  }

  const rendered = await executionContextStorage.run(
    {
      waitUntil: context.waitUntil,
    },
    () =>
      renderPage(request, {
        context,
        responseLinkHeader: {
          filter: ({ hint }) => hint.as === "style" || hint.as === "font",
        },
      }),
  )
  const response = isHtml(rendered) ? keepOnlyEntryModulePreload(rendered) : rendered

  if (!setCookie) {
    return response
  }

  const newResponse = new Response(response.body, response)
  newResponse.headers.append("Set-Cookie", serializeCookie({ ...setCookie, options: { secure: protocol === "https:" } }))

  return newResponse
}

const server: ExportedHandler<Env, WorkerQueueMessage> = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const bareDomain = bareDomainUrl(url)
    if (bareDomain !== undefined) {
      return Response.redirect(bareDomain, HTTP_STATUS.PERMANENT_REDIRECT)
    }

    const { pathname, protocol } = url
    if (pathname === ROUTES.API_REALTIME.ADMIN_WS) {
      return handleRealtimeInvalidationWebSocket(request, env, REALTIME_INVALIDATION_HUB.ADMIN)
    }

    if (pathname === ROUTES.API_REALTIME.STOREFRONT_WS) {
      return handleRealtimeInvalidationWebSocket(request, env, REALTIME_INVALIDATION_HUB.STOREFRONT)
    }

    const nonce = createContentSecurityPolicyNonce()
    const context: RequestContext = {
      edgeTimeZone: request.cf?.timezone,
      env,
      nonce,
      passThroughOnException: ctx.passThroughOnException.bind(ctx),
      waitUntil: ctx.waitUntil.bind(ctx),
    }

    const startedAt = performance.now()
    const { result, timings } = await collectServerTimings(() => respond(request, context))
    const response = withSecurityHeaders(result, { appEnv: env.APP_ENV, nonce, protocol })
    if (!isPageLoad(request, response)) {
      return response
    }

    const requestDuration = performance.now() - startedAt
    response.headers.set("Server-Timing", formatServerTimingHeader(timings, requestDuration))

    return response
  },
  async queue(batch: MessageBatch<WorkerQueueMessage>, _env: Env, _ctx: ExecutionContext): Promise<void> {
    if (isNewsletterQueueBatch(batch)) {
      const { processNewsletterQueueBatch } = await import("~/src/modules/newsletter-campaign/use-cases/process-newsletter-queue.server")
      await processNewsletterQueueBatch(batch)
    }

    if (isAuditLogQueueBatch(batch)) {
      const { processAuditLogQueueBatch } = await import("~/src/modules/audit-log/use-cases/process-audit-log-queue.server")
      await processAuditLogQueueBatch(batch)
    }
  },
  async scheduled(controller: ScheduledController, _env: Env, _ctx: ExecutionContext): Promise<void> {
    const { enforceRetentionPeriods } = await import("~/src/lib/retention")
    await enforceRetentionPeriods(new Date(controller.scheduledTime))
  },
}

export default server
