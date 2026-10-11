import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server"

import { scheduleBackgroundWork } from "~/src/lib/background"

import { TestExecutionContext } from "~/src/__test__/doubles/test-execution-context"
import { ROUTES } from "~/src/routes"

interface StartRequestContext {
  readonly env: Env
  readonly nonce: string
  readonly passThroughOnException: () => void
  readonly waitUntil: (promise: Promise<unknown>) => void
}

interface StartRequestOptions {
  readonly context: StartRequestContext
  readonly responseLinkHeader: boolean
}

const entry = vi.hoisted(() => ({
  fetch: vi.fn((_request: Request, _options: StartRequestOptions): Promise<Response> => Promise.resolve(new Response("page"))),
}))

const realtime = vi.hoisted(() => ({ handleRealtimeInvalidationWebSocket: vi.fn(() => Promise.resolve(new Response("upgraded"))) }))

const queue = vi.hoisted(() => ({ processAuditLogQueueBatch: vi.fn(() => Promise.resolve()) }))

const newsletterQueue = vi.hoisted(() => ({
  isNewsletterQueueBatch: vi.fn((batch: { readonly queue: string }) => batch.queue === "newsletter"),
  processNewsletterQueueBatch: vi.fn(() => Promise.resolve()),
}))

const retention = vi.hoisted(() => ({ enforceRetentionPeriods: vi.fn((_now: Date) => Promise.resolve()) }))

const sitemap = vi.hoisted(() => ({
  listSitemapPages: vi.fn(() =>
    Promise.resolve([{ path: "/" }, { lastModified: new Date("2026-10-01T09:00:00.000Z"), path: "/products/lapis-lazuli-necklace" }]),
  ),
}))

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.marte.test" } }))
vi.mock("~/src/durable-objects/realtime-invalidation-hub", () => ({ RealtimeInvalidationHub: vi.fn() }))
vi.mock("@tanstack/react-start/server-entry", () => ({ default: entry }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server", () => realtime)
vi.mock("~/src/modules/audit-log/audit-log.queue.server", () => queue)
vi.mock("~/src/lib/sitemap", () => sitemap)
vi.mock("~/src/lib/retention", () => retention)
vi.mock("~/src/modules/newsletter-campaign/newsletter-campaign.queue.server", () => newsletterQueue)

const { default: server } = await import("~/src/server")

class TestEnv implements Env {
  declare CACHE: Env["CACHE"]
  declare IMAGES: Env["IMAGES"]
  declare DB: Env["DB"]
  declare AUDIT_LOG_QUEUE: Env["AUDIT_LOG_QUEUE"]
  declare NEWSLETTER_QUEUE: Env["NEWSLETTER_QUEUE"]
  declare ASSETS: Env["ASSETS"]
  declare AUTH_GOOGLE_CLIENT_ID: Env["AUTH_GOOGLE_CLIENT_ID"]
  declare AUTH_GOOGLE_CLIENT_SECRET: Env["AUTH_GOOGLE_CLIENT_SECRET"]
  declare AUTH_SECRET: Env["AUTH_SECRET"]
  declare INPOST_API_TOKEN: Env["INPOST_API_TOKEN"]
  declare INPOST_ORGANIZATION_ID: Env["INPOST_ORGANIZATION_ID"]
  declare RESEND_API_KEY: Env["RESEND_API_KEY"]
  declare RESEND_EMAIL_FROM: Env["RESEND_EMAIL_FROM"]
  declare STRIPE_SECRET_KEY: Env["STRIPE_SECRET_KEY"]
  declare STRIPE_WEBHOOK_SECRET: Env["STRIPE_WEBHOOK_SECRET"]
  declare TURNSTILE_SECRET_KEY: Env["TURNSTILE_SECRET_KEY"]
  declare VITE_R2_URL: Env["VITE_R2_URL"]
  declare REALTIME_INVALIDATION_HUB: Env["REALTIME_INVALIDATION_HUB"]

  readonly APP_ENV = "development"
}

const env = new TestEnv()

const fetchPath = async (path: string, origin = "https://marte.test") => {
  const context = new TestExecutionContext()
  const { fetch: handleFetch } = server

  if (handleFetch === undefined) {
    throw new Error("the worker registered no fetch handler")
  }

  const answer: unknown = await Reflect.apply(handleFetch, server, [new Request(`${origin}${path}`), env, context])

  if (!(answer instanceof Response)) {
    throw new Error("the worker did not answer the request with a response")
  }

  return { context, response: answer }
}

const lastStartOptions = (): StartRequestOptions => {
  const options = entry.fetch.mock.calls.at(-1)?.[1]

  if (options === undefined) {
    throw new Error("the worker never reached the application handler")
  }

  return options
}

beforeEach(() => {
  vi.clearAllMocks()
  entry.fetch.mockImplementation(() => Promise.resolve(new Response("page")))
})

describe("worker sitemap", () => {
  it("serves the sitemap for the requested origin as cacheable xml", async () => {
    const { response } = await fetchPath("/sitemap.xml")
    const body = await response.text()

    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8")
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
    expect(body).toContain("<loc>https://marte.test/</loc>")
    expect(entry.fetch).not.toHaveBeenCalled()
  })

  it("lists the pages the database holds, dated by their last change", async () => {
    const { response } = await fetchPath("/sitemap.xml")
    const body = await response.text()

    expect(sitemap.listSitemapPages).toHaveBeenCalledTimes(1)
    expect(body).toContain("<loc>https://marte.test/en-US/products/lapis-lazuli-necklace</loc>")
    expect(body).toContain("<lastmod>2026-10-01T09:00:00.000Z</lastmod>")
  })
})

describe("worker robots.txt", () => {
  it("keeps every crawler out of a non-production deployment", async () => {
    const { response } = await fetchPath("/robots.txt")

    expect(response.headers.get("Content-Type")).toBe("text/plain; charset=utf-8")
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
    await expect(response.text()).resolves.toBe("User-agent: *\nDisallow: /\n")
    expect(entry.fetch).not.toHaveBeenCalled()
  })
})

describe("worker realtime endpoints", () => {
  it("hands the admin socket to the admin invalidation hub", async () => {
    const { response } = await fetchPath(ROUTES.API_REALTIME.ADMIN_WS)

    await expect(response.text()).resolves.toBe("upgraded")
    expect(realtime.handleRealtimeInvalidationWebSocket).toHaveBeenCalledTimes(1)
    expect(realtime.handleRealtimeInvalidationWebSocket.mock.calls[0]?.slice(1)).toStrictEqual([env, REALTIME_INVALIDATION_HUB.ADMIN])
  })

  it("hands the storefront socket to the storefront invalidation hub", async () => {
    await fetchPath(ROUTES.API_REALTIME.STOREFRONT_WS)

    expect(realtime.handleRealtimeInvalidationWebSocket.mock.calls[0]?.slice(1)).toStrictEqual([env, REALTIME_INVALIDATION_HUB.STOREFRONT])
  })

  it("never renders the application for a socket request", async () => {
    await fetchPath(ROUTES.API_REALTIME.ADMIN_WS)

    expect(entry.fetch).not.toHaveBeenCalled()
  })
})

describe("worker locale handling", () => {
  it("redirects a default locale prefix to the bare path before rendering", async () => {
    const { response } = await fetchPath("/pl-PL/about")

    expect(response.status).toBe(301)
    expect(response.headers.get("location")).toBe("https://marte.test/about")
    expect(entry.fetch).not.toHaveBeenCalled()
  })

  it("remembers the locale a visitor browsed in", async () => {
    const { response } = await fetchPath("/en-US/about")

    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=en-US`)
    expect(entry.fetch).toHaveBeenCalledTimes(1)
  })

  it("marks the locale cookie Secure for a visit over HTTPS", async () => {
    const { response } = await fetchPath("/en-US/about")

    expect(response.headers.get("set-cookie")).toContain("Secure")
  })

  it("keeps the locale cookie usable over plain HTTP, where browsers drop Secure cookies", async () => {
    const { response } = await fetchPath("/en-US/about", "http://127.0.0.1:3000")

    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=en-US`)
    expect(response.headers.get("set-cookie")).not.toContain("Secure")
  })

  it("keeps the rendered page intact while adding the locale cookie", async () => {
    entry.fetch.mockImplementation(() =>
      Promise.resolve(new Response('<html lang="en"></html>', { headers: { "content-type": "text/html" }, status: 201 })),
    )

    const { response } = await fetchPath("/en-US/about")

    expect(response.status).toBe(201)
    expect(response.headers.get("content-type")).toBe("text/html")
    await expect(response.text()).resolves.toBe('<html lang="en"></html>')
  })

  it("leaves the response untouched when the cookie already matches the path", async () => {
    const { response } = await fetchPath("/about")

    expect(response.headers.get("set-cookie")).toBeNull()
    await expect(response.text()).resolves.toBe("page")
  })
})

describe("worker request context", () => {
  it("passes the request and the link header preference to the application", async () => {
    await fetchPath("/about")

    expect(entry.fetch.mock.calls[0]?.[0].url).toBe("https://marte.test/about")
    expect(lastStartOptions().responseLinkHeader).toBe(true)
  })

  it("exposes the worker bindings to the application", async () => {
    await fetchPath("/about")

    expect(lastStartOptions().context.env).toBe(env)
  })

  it("lets the application keep work alive through the worker", async () => {
    const { context } = await fetchPath("/about")
    const pending = Promise.resolve("done")
    lastStartOptions().context.waitUntil(pending)

    expect(context.keptAlive).toStrictEqual([pending])
  })

  it("lets the application pass an exception through to the worker", async () => {
    const { context } = await fetchPath("/about")
    lastStartOptions().context.passThroughOnException()

    expect(context.passedThroughOnException).toBe(true)
  })

  it("keeps background work started while rendering alive until the worker finishes", async () => {
    entry.fetch.mockImplementation(() => {
      scheduleBackgroundWork(Promise.resolve("audit written"))

      return Promise.resolve(new Response("page"))
    })

    const { context } = await fetchPath("/about")

    expect(context.keptAlive).toHaveLength(1)
  })
})

describe("worker security headers", () => {
  it("allows the inline scripts carrying the nonce it handed the application, and no others", async () => {
    const { response } = await fetchPath("/about")
    const { nonce } = lastStartOptions().context

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/u)
    expect(response.headers.get("content-security-policy")).toContain(`script-src 'self' 'nonce-${nonce}' `)
  })

  it("draws a new nonce for every request", async () => {
    await fetchPath("/about")
    const { nonce: first } = lastStartOptions().context
    await fetchPath("/about")

    expect(lastStartOptions().context.nonce).not.toBe(first)
  })

  it("lets pages load images and video from the configured image host", async () => {
    const { response } = await fetchPath("/about")

    expect(response.headers.get("content-security-policy")).toContain("https://images.marte.test")
  })

  it.each(["/about", "/sitemap.xml", "/robots.txt", "/pl-PL/about"])("protects the response to %s", async (path) => {
    const { response } = await fetchPath(path)

    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'")
    expect(response.headers.get("x-frame-options")).toBe("DENY")
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin")
    expect(response.headers.get("permissions-policy")).toBe("camera=(), geolocation=(), microphone=()")
  })

  it("keeps the locale cookie next to the security headers", async () => {
    const { response } = await fetchPath("/en-US/about")

    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=en-US`)
    expect(response.headers.get("x-frame-options")).toBe("DENY")
  })

  it("never pins HTTPS for the development environment, even over HTTPS", async () => {
    const { response } = await fetchPath("/about")

    expect(response.headers.has("strict-transport-security")).toBe(false)
  })

  it("hands a WebSocket upgrade back exactly as the realtime hub answered it", async () => {
    const upgraded = new Response("upgraded")
    realtime.handleRealtimeInvalidationWebSocket.mockResolvedValueOnce(upgraded)

    const { response } = await fetchPath(ROUTES.API_REALTIME.STOREFRONT_WS)

    expect(response).toBe(upgraded)
    expect(response.headers.has("content-security-policy")).toBe(false)
  })
})

const queueBatch = (name: string): MessageBatch<AuditLogQueueMessage> => ({
  ackAll: () => {},
  messages: [],
  metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
  queue: name,
  retryAll: () => {},
})

const drainBatch = async (batch: MessageBatch<AuditLogQueueMessage>): Promise<void> => {
  const { queue: drainQueue } = server

  if (drainQueue === undefined) {
    throw new Error("the worker registered no queue consumer")
  }
  await Reflect.apply(drainQueue, server, [batch, env, new TestExecutionContext()])
}

describe("worker queues", () => {
  it("drains an audit log batch through the audit log consumer", async () => {
    const batch = queueBatch("audit-log")

    await drainBatch(batch)

    expect(queue.processAuditLogQueueBatch).toHaveBeenCalledWith(batch)
    expect(newsletterQueue.processNewsletterQueueBatch).not.toHaveBeenCalled()
  })

  it("sends a newsletter batch to the newsletter consumer and keeps it away from the audit log", async () => {
    const batch = queueBatch("newsletter")

    await drainBatch(batch)

    expect(newsletterQueue.processNewsletterQueueBatch).toHaveBeenCalledWith(batch)
    expect(queue.processAuditLogQueueBatch).not.toHaveBeenCalled()
  })
})

const runSchedule = async (scheduledTime: number): Promise<void> => {
  const controller: ScheduledController = { cron: "0 3 * * *", noRetry: () => {}, scheduledTime }
  const { scheduled } = server

  if (scheduled === undefined) {
    throw new Error("the worker registered no scheduled handler")
  }
  await Reflect.apply(scheduled, server, [controller, env, new TestExecutionContext()])
}

describe("worker scheduled clean-up", () => {
  it("enforces the retention periods as of the time the run was scheduled for", async () => {
    await runSchedule(Date.parse("2026-10-10T03:00:00.000Z"))

    expect(retention.enforceRetentionPeriods).toHaveBeenCalledExactlyOnceWith(new Date("2026-10-10T03:00:00.000Z"))
  })

  it("fails the run when the clean-up fails, so Cloudflare records the failed invocation", async () => {
    retention.enforceRetentionPeriods.mockRejectedValueOnce(new Error("D1 is unavailable"))

    await expect(runSchedule(Date.parse("2026-10-10T03:00:00.000Z"))).rejects.toThrow("D1 is unavailable")
  })
})
