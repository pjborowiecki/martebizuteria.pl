import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { REALTIME_INVALIDATION_HUB } from "~/src/integrations/realtime-invalidation/realtime-invalidation.subscriptions"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { type AuditLogQueueMessage } from "~/src/modules/audit-log/audit-log.queue.server"

import { scheduleBackgroundWork } from "~/src/lib/background"

import { TestExecutionContext } from "~/src/__test__/doubles/test-execution-context"
import { ROUTES } from "~/src/routes"

interface StartRequestContext {
  readonly env: Env
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

vi.mock("~/src/durable-objects/realtime-invalidation-hub", () => ({ RealtimeInvalidationHub: vi.fn() }))
vi.mock("@tanstack/react-start/server-entry", () => ({ default: entry }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.ws.server", () => realtime)
vi.mock("~/src/modules/audit-log/audit-log.queue.server", () => queue)

const { default: server } = await import("~/src/server")

class TestEnv implements Env {
  declare CACHE: Env["CACHE"]
  declare IMAGES: Env["IMAGES"]
  declare DB: Env["DB"]
  declare AUDIT_LOG_QUEUE: Env["AUDIT_LOG_QUEUE"]
  declare AUTH_GITHUB_CLIENT_ID: Env["AUTH_GITHUB_CLIENT_ID"]
  declare AUTH_GITHUB_CLIENT_SECRET: Env["AUTH_GITHUB_CLIENT_SECRET"]
  declare AUTH_GOOGLE_CLIENT_ID: Env["AUTH_GOOGLE_CLIENT_ID"]
  declare AUTH_GOOGLE_CLIENT_SECRET: Env["AUTH_GOOGLE_CLIENT_SECRET"]
  declare AUTH_SECRET: Env["AUTH_SECRET"]
  declare RESEND_API_KEY: Env["RESEND_API_KEY"]
  declare RESEND_EMAIL_FROM: Env["RESEND_EMAIL_FROM"]
  declare STRIPE_SECRET_KEY: Env["STRIPE_SECRET_KEY"]
  declare STRIPE_WEBHOOK_SECRET: Env["STRIPE_WEBHOOK_SECRET"]
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

describe("worker audit log queue", () => {
  it("drains the batch through the audit log consumer", async () => {
    const batch: MessageBatch<AuditLogQueueMessage> = {
      ackAll: () => {},
      messages: [],
      metadata: { metrics: { backlogBytes: 0, backlogCount: 0 } },
      queue: "audit-log",
      retryAll: () => {},
    }

    const { queue: drainQueue } = server

    if (drainQueue === undefined) {
      throw new Error("the worker registered no queue consumer")
    }
    await Reflect.apply(drainQueue, server, [batch, env, new TestExecutionContext()])

    expect(queue.processAuditLogQueueBatch).toHaveBeenCalledWith(batch)
  })
})
