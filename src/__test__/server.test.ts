import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.types"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { timeServerWork } from "~/src/lib/server-timing"

import { TestExecutionContext } from "~/src/__test__/doubles/test-execution-context"
import { TestHTMLRewriter } from "~/src/__test__/doubles/test-html-rewriter"
import { ROUTES } from "~/src/routes"

interface StartRequestContext {
  readonly env: Env
  readonly nonce: string
  readonly passThroughOnException: () => void
  readonly waitUntil: (promise: Promise<unknown>) => void
}

interface LinkHeaderEntry {
  readonly hint: { readonly as?: string; readonly href: string; readonly rel: string }
}

interface StartRequestOptions {
  readonly context: StartRequestContext
  readonly responseLinkHeader: { readonly filter: (entry: LinkHeaderEntry) => boolean }
}

type RenderPage = (page: { readonly request: Request }) => Promise<Response>

const entry = vi.hoisted(() => ({
  fetch: vi.fn((_request: Request, _options: StartRequestOptions, _renderPage: RenderPage): Promise<Response> =>
    Promise.resolve(new Response("page")),
  ),
}))

const streamHandler = vi.hoisted(() => ({
  defaultStreamHandler: vi.fn((_page: { readonly request: Request }) => Promise.resolve(new Response("rendered"))),
}))

const realtime = vi.hoisted(() => ({ handleRealtimeInvalidationWebSocket: vi.fn(() => Promise.resolve(new Response("upgraded"))) }))

const queue = vi.hoisted(() => ({ processAuditLogQueueBatch: vi.fn(() => Promise.resolve()) }))

const newsletterQueue = vi.hoisted(() => ({ processNewsletterQueueBatch: vi.fn(() => Promise.resolve()) }))

const retention = vi.hoisted(() => ({ enforceRetentionPeriods: vi.fn((_now: Date) => Promise.resolve()) }))

const sitemap = vi.hoisted(() => ({
  listSitemapPages: vi.fn(() =>
    Promise.resolve([{ path: "/" }, { lastModified: new Date("2026-10-01T09:00:00.000Z"), path: "/products/lapis-lazuli-necklace" }]),
  ),
}))

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.marte.test" } }))
vi.mock("~/src/durable-objects/realtime-invalidation-hub", () => ({ RealtimeInvalidationHub: vi.fn() }))
vi.mock("@tanstack/react-start/server", () => ({
  createStartHandler: (renderPage: RenderPage) => (request: Request, options: StartRequestOptions) =>
    entry.fetch(request, options, renderPage),
  defaultStreamHandler: streamHandler.defaultStreamHandler,
}))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server", () => realtime)
vi.mock("~/src/modules/audit-log/use-cases/process-audit-log-queue.server", () => queue)
vi.mock("~/src/lib/sitemap", () => sitemap)
vi.mock("~/src/lib/retention", () => retention)
vi.mock("~/src/modules/newsletter-campaign/use-cases/process-newsletter-queue.server", () => newsletterQueue)

vi.stubGlobal("HTMLRewriter", TestHTMLRewriter)

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
  declare VITE_R2_URL: Env["VITE_R2_URL"]
  declare REALTIME_INVALIDATION_HUB: Env["REALTIME_INVALIDATION_HUB"]

  readonly APP_ENV = "development"
}

const env = new TestEnv()

const fetchRequest = async (request: Request) => {
  const context = new TestExecutionContext()
  const { fetch: handleFetch } = server

  if (handleFetch === undefined) {
    throw new Error("the worker registered no fetch handler")
  }

  const answer: unknown = await Reflect.apply(handleFetch, server, [request, env, context])

  if (!(answer instanceof Response)) {
    throw new Error("the worker did not answer the request with a response")
  }

  return { context, response: answer }
}

const fetchPath = (path: string, origin = "https://marte.test") => fetchRequest(new Request(`${origin}${path}`))

const lastStartOptions = (): StartRequestOptions => {
  const options = entry.fetch.mock.calls.at(-1)?.[1]

  if (options === undefined) {
    throw new Error("the worker never reached the application handler")
  }

  return options
}

beforeEach(() => {
  vi.clearAllMocks()
  TestHTMLRewriter.handlers.clear()
  TestHTMLRewriter.rewritten = undefined
  entry.fetch.mockImplementation(() => Promise.resolve(new Response("page")))
})

describe("worker canonical host", () => {
  it("sends a www visit to the bare shop domain, keeping its path, query and method", async () => {
    const { response } = await fetchPath("/en-US/products?sort=newest", "https://www.martebizuteria.pl")

    expect(response.status).toBe(308)
    expect(response.headers.get("Location")).toBe("https://martebizuteria.pl/en-US/products?sort=newest")
    expect(entry.fetch).not.toHaveBeenCalled()
    expect(realtime.handleRealtimeInvalidationWebSocket).not.toHaveBeenCalled()
  })

  it("serves the bare shop domain itself", async () => {
    const { response } = await fetchPath("/en-US", "https://martebizuteria.pl")

    expect(response.status).not.toBe(308)
    expect(entry.fetch).toHaveBeenCalledTimes(1)
  })
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
  it("passes the request to the application", async () => {
    await fetchPath("/about")

    expect(entry.fetch.mock.calls[0]?.[0].url).toBe("https://marte.test/about")
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

const htmlPage = (): Response => new Response("<html></html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })

const modulePreload = () => ({ remove: vi.fn(), setAttribute: vi.fn() })

const rewriteModulePreloads = async (links: readonly ReturnType<typeof modulePreload>[]): Promise<void> => {
  const handlers = TestHTMLRewriter.handlers.get('link[rel="modulepreload"]')

  if (handlers?.element === undefined) {
    throw new Error("the worker registered no module preload handler")
  }

  for (const link of links) {
    await Reflect.apply(handlers.element.bind(handlers), handlers, [link])
  }
}

describe("worker preload hints", () => {
  it.each([
    { hint: { as: "style", href: "/assets/globals.css", rel: "preload" }, kept: true },
    { hint: { as: "font", href: "/fonts/manrope-latin-wght-normal.woff2", rel: "preload" }, kept: true },
    { hint: { as: "script", href: "/assets/admin.js", rel: "modulepreload" }, kept: false },
    { hint: { href: "https://images.marte.test", rel: "preconnect" }, kept: false },
  ])("lists only stylesheets and fonts in the Link header, so $hint.href is kept: $kept", async ({ hint, kept }) => {
    await fetchPath("/about")

    expect(lastStartOptions().responseLinkHeader.filter({ hint })).toBe(kept)
  })

  it("keeps the first module preload, the client entry, at low priority and drops every route chunk after it", async () => {
    entry.fetch.mockImplementation(() => Promise.resolve(htmlPage()))
    const links = [modulePreload(), modulePreload(), modulePreload()]

    await fetchPath("/about")
    await rewriteModulePreloads(links)

    expect(links.map((link) => link.setAttribute.mock.calls)).toStrictEqual([[["fetchpriority", "low"]], [], []])
    expect(links.map((link) => link.remove.mock.calls.length)).toStrictEqual([0, 1, 1])
  })

  it("streams the rewritten page with the locale cookie and the security headers", async () => {
    const rewritten = new Response("<html>rewritten</html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })
    entry.fetch.mockImplementation(() => Promise.resolve(htmlPage()))
    TestHTMLRewriter.rewritten = rewritten

    const { response } = await fetchPath("/en-US/about")

    await expect(response.text()).resolves.toBe("<html>rewritten</html>")
    expect(response.headers.get("set-cookie")).toContain(`${I18N.COOKIE_NAME}=en-US`)
    expect(response.headers.get("x-frame-options")).toBe("DENY")
  })

  it("leaves a response that is not a page, such as a server function result, untouched", async () => {
    entry.fetch.mockImplementation(() => Promise.resolve(Response.json({ ok: true })))

    const { response } = await fetchPath("/_serverFn/abc")

    await expect(response.json()).resolves.toStrictEqual({ ok: true })
    expect(TestHTMLRewriter.handlers.size).toBe(0)
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

const renderedHtml = (): Response => new Response("<html>rendered</html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })

const PAGE_TIMING = /^d1;dur=\d+\.\d;desc="statements: 2", render;dur=\d+\.\d, total;dur=\d+\.\d$/u

const renderPageAfterTwoStatements = async (request: Request, _options: StartRequestOptions, renderPage: RenderPage): Promise<Response> => {
  await timeServerWork("d1", () => Promise.resolve())
  await timeServerWork("d1", () => Promise.resolve())

  return renderPage({ request })
}

describe("worker server timing", () => {
  beforeEach(() => {
    streamHandler.defaultStreamHandler.mockImplementation(() => Promise.resolve(renderedHtml()))
    entry.fetch.mockImplementation(renderPageAfterTwoStatements)
  })

  it("reports a page load's database time and statement count, its render and the whole request, and nothing else", async () => {
    const { response } = await fetchPath("/about")

    expect(response.headers.get("server-timing")).toMatch(PAGE_TIMING)
  })

  it("renders the page through the default stream handler", async () => {
    const { response } = await fetchPath("/about")

    await expect(response.text()).resolves.toBe("<html>rendered</html>")
    expect(streamHandler.defaultStreamHandler.mock.calls[0]?.[0].request.url).toBe("https://marte.test/about")
  })

  it("names no statement or table the request read", async () => {
    const { response } = await fetchPath("/about")

    expect(response.headers.get("server-timing")).not.toMatch(/select|insert|product|session|isolate|cache/u)
  })

  it("sends no timing with a server function call, even one answered with HTML", async () => {
    const { response } = await fetchRequest(new Request("https://marte.test/_serverFn/abc", { body: "{}", method: "POST" }))

    expect(response.headers.has("server-timing")).toBe(false)
  })

  it("sends no timing with a server function read", async () => {
    entry.fetch.mockImplementation(() => Promise.resolve(Response.json({ ok: true })))

    const { response } = await fetchPath("/_serverFn/abc")

    expect(response.headers.has("server-timing")).toBe(false)
  })

  it.each(["/api/auth/get-session", "/api/auth/reset-password/token"])("sends no timing with the auth API answer for %s", async (path) => {
    const { response } = await fetchPath(path)

    expect(response.headers.has("server-timing")).toBe(false)
  })

  it.each(["/robots.txt", "/sitemap.xml", "/pl-PL/about"])("sends no timing with %s, which is not a page", async (path) => {
    const { response } = await fetchPath(path)

    expect(response.headers.has("server-timing")).toBe(false)
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
    const batch = queueBatch("martebizuteria-audit-log-test")

    await drainBatch(batch)

    expect(queue.processAuditLogQueueBatch).toHaveBeenCalledWith(batch)
    expect(newsletterQueue.processNewsletterQueueBatch).not.toHaveBeenCalled()
  })

  it("sends a newsletter batch to the newsletter consumer and keeps it away from the audit log", async () => {
    const batch = queueBatch("martebizuteria-newsletter-test")

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
