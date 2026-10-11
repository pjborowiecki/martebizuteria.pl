import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  LIVE_SITE_CHECK_ATTEMPTS,
  LIVE_SITE_CHECK_RETRY_DELAY_MS,
  LIVE_SITE_CHECK_TIMEOUT_MS,
  verifyDeployment,
} from "~/src/lib/deployment"

const PRODUCTION_ORIGIN = "https://martebizuteria.pjborowiecki.workers.dev"

const PREVIEW_ORIGIN = "https://martebizuteria-preview.pjborowiecki.workers.dev"

const HTML = "text/html; charset=utf-8"

const PLAIN_TEXT = "text/plain; charset=utf-8"

const JSON_BODY = "application/json"

const EVERY_RETRY_MS = (LIVE_SITE_CHECK_ATTEMPTS - 1) * LIVE_SITE_CHECK_RETRY_DELAY_MS

type Answer = () => Promise<Response>

const page =
  (status: number, contentType?: string): Answer =>
  () =>
    Promise.resolve(
      contentType === undefined
        ? new Response(null, { status })
        : new Response("body", { headers: { "content-type": contentType }, status }),
    )

const WORKING_SHOP: Readonly<Record<string, Answer>> = {
  "/": page(200, HTML),
  "/api/health": page(200, JSON_BODY),
  "/api/webhooks/stripe": page(405, PLAIN_TEXT),
  "/products": page(200, HTML),
  "/robots.txt": page(200, PLAIN_TEXT),
}

const fetchMock = vi.fn<(input: URL, init: RequestInit) => Promise<Response>>()

const serve = (overrides: Readonly<Record<string, Answer>> = {}): void => {
  const answers = { ...WORKING_SHOP, ...overrides }
  fetchMock.mockImplementation((url) => {
    const answer = answers[url.pathname]
    if (answer === undefined) {
      return Promise.reject(new Error(`unexpected request to ${url.href}`))
    }

    return answer()
  })
}

const requestsFor = (path: string): number => fetchMock.mock.calls.filter(([url]) => url.pathname === path).length

const productionRefusal = (...problems: readonly string[]): Error =>
  new Error([`The production Worker at ${PRODUCTION_ORIGIN} is deployed but does not answer like the shop:`, ...problems].join("\n"))

const expectProductionRefusal = async (expected: Error | string): Promise<void> => {
  const failure = expect(verifyDeployment("production")).rejects.toThrow(expected)
  await vi.advanceTimersByTimeAsync(EVERY_RETRY_MS)

  await failure
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("verifyDeployment on a working shop", () => {
  it.each([
    ["production", PRODUCTION_ORIGIN],
    ["preview", PREVIEW_ORIGIN],
  ] as const)("asks the %s Worker on its workers.dev host for the five pages", async (environment, origin) => {
    serve()

    await expect(verifyDeployment(environment)).resolves.toBe(
      `The ${environment} Worker at ${origin} answered /, /products, /robots.txt, /api/webhooks/stripe, /api/health as expected.`,
    )
    expect(fetchMock.mock.calls.map(([url]) => url.href).toSorted()).toStrictEqual([
      `${origin}/`,
      `${origin}/api/health`,
      `${origin}/api/webhooks/stripe`,
      `${origin}/products`,
      `${origin}/robots.txt`,
    ])
  })

  it("asks once per page, without following a redirect, and stops waiting on a page that hangs", async () => {
    serve()
    const timeout = vi.spyOn(AbortSignal, "timeout")

    await verifyDeployment("production")

    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(fetchMock.mock.calls.every(([, init]) => init.redirect === "manual" && init.signal instanceof AbortSignal)).toBe(true)
    expect(timeout).toHaveBeenCalledWith(LIVE_SITE_CHECK_TIMEOUT_MS)
  })
})

describe("verifyDeployment on a shop that answers wrongly", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it("refuses a webhook route that renders a page instead of refusing GET", async () => {
    serve({ "/api/webhooks/stripe": page(200, HTML) })

    await expectProductionRefusal(
      productionRefusal(`GET ${PRODUCTION_ORIGIN}/api/webhooks/stripe answered 200 ${HTML} instead of 405 text/plain.`),
    )
  })

  it("refuses a home page that redirects, naming the status alone when there is no content type", async () => {
    serve({ "/": page(302) })

    const failure = expect(verifyDeployment("preview")).rejects.toThrow(
      new Error(
        [
          `The preview Worker at ${PREVIEW_ORIGIN} is deployed but does not answer like the shop:`,
          `GET ${PREVIEW_ORIGIN}/ answered 302 instead of 200 text/html.`,
        ].join("\n"),
      ),
    )
    await vi.advanceTimersByTimeAsync(EVERY_RETRY_MS)

    await failure
  })

  it("refuses a page that answers 200 with no content type", async () => {
    serve({ "/products": page(200) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/products answered 200 instead of 200 text/html.`)
  })

  it("refuses a health check that reports a binding down", async () => {
    serve({ "/api/health": page(503, JSON_BODY) })

    await expectProductionRefusal(
      productionRefusal(`GET ${PRODUCTION_ORIGIN}/api/health answered 503 ${JSON_BODY} instead of 200 application/json.`),
    )
  })

  it("refuses a robots.txt served as a page", async () => {
    serve({ "/robots.txt": page(200, HTML) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/robots.txt answered 200 ${HTML} instead of 200 text/plain.`)
  })

  it("reports a page that does not answer at all", async () => {
    serve({ "/": () => Promise.reject(new TypeError("fetch failed")) })

    await expectProductionRefusal(`GET ${PRODUCTION_ORIGIN}/ did not answer: TypeError: fetch failed`)
  })

  it("lists every page that failed, in the order it checks them, and only those", async () => {
    serve({ "/": page(500, HTML), "/robots.txt": page(404, HTML) })

    await expectProductionRefusal(
      productionRefusal(
        `GET ${PRODUCTION_ORIGIN}/ answered 500 ${HTML} instead of 200 text/html.`,
        `GET ${PRODUCTION_ORIGIN}/robots.txt answered 404 ${HTML} instead of 200 text/plain.`,
      ),
    )
  })

  it(`asks a failing page ${String(LIVE_SITE_CHECK_ATTEMPTS)} times before giving up, and every other page once`, async () => {
    serve({ "/api/webhooks/stripe": page(200, HTML) })

    await expectProductionRefusal("/api/webhooks/stripe answered 200")

    expect(requestsFor("/api/webhooks/stripe")).toBe(LIVE_SITE_CHECK_ATTEMPTS)
    expect(requestsFor("/")).toBe(1)
    expect(requestsFor("/products")).toBe(1)
    expect(requestsFor("/robots.txt")).toBe(1)
    expect(requestsFor("/api/health")).toBe(1)
  })

  it("waits before asking again, so a version still spreading across Cloudflare can take over", async () => {
    const webhook = vi.fn<Answer>().mockImplementationOnce(page(200, HTML)).mockImplementation(page(405, PLAIN_TEXT))
    serve({ "/api/webhooks/stripe": webhook })

    const verifying = verifyDeployment("production")
    await vi.advanceTimersByTimeAsync(LIVE_SITE_CHECK_RETRY_DELAY_MS - 1)

    expect(webhook).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)

    await expect(verifying).resolves.toContain("as expected")
    expect(webhook).toHaveBeenCalledTimes(2)
  })
})
