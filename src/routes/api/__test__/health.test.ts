import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: () => Promise<Response>
    }
  }
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const { cacheGet, env, first, imagesHead, prepare } = vi.hoisted(() => {
  const firstRow = vi.fn<() => Promise<unknown>>()
  const prepareStatement = vi.fn(() => ({ first: firstRow }))
  const get = vi.fn<(key: string) => Promise<string | null>>()
  const head = vi.fn<(key: string) => Promise<object | null>>()

  return {
    cacheGet: get,
    env: { CACHE: { get }, DB: { prepare: prepareStatement }, IMAGES: { head } },
    first: firstRow,
    imagesHead: head,
    prepare: prepareStatement,
  }
})

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return options
  },
}))

await import("~/src/routes/api/health")

const route = captured.current

if (route === undefined) {
  throw new Error("the health route did not register a handler")
}

const getHealth = route.server.handlers.GET

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

beforeEach(() => {
  vi.clearAllMocks()
  first.mockResolvedValue({ 1: 1 })
  cacheGet.mockResolvedValue(null)
  imagesHead.mockResolvedValue(null)
})

describe("health route", () => {
  it("answers 200 with every check ok when D1, KV and R2 all answer", async () => {
    const response = await getHealth()

    expect(response.status).toBe(HTTP_STATUS.OK)
    await expect(response.json()).resolves.toStrictEqual({ checks: { d1: "ok", kv: "ok", r2: "ok" }, status: "ok" })
  })

  it("reads each binding once with a query and lookups that touch no data", async () => {
    await getHealth()

    expect(prepare).toHaveBeenCalledExactlyOnceWith("SELECT 1")
    expect(first).toHaveBeenCalledOnce()
    expect(cacheGet).toHaveBeenCalledExactlyOnceWith("health-check")
    expect(imagesHead).toHaveBeenCalledExactlyOnceWith("health-check")
  })

  it("tells caches and proxies never to store the answer", async () => {
    const response = await getHealth()

    expect(response.headers.get("Cache-Control")).toBe("no-store")
  })

  it.each([
    ["d1", () => first.mockRejectedValue(new Error("D1_ERROR: Network connection lost to internal-host-7"))],
    ["kv", () => cacheGet.mockRejectedValue(new Error("KV GET failed on internal-host-7"))],
    ["r2", () => imagesHead.mockRejectedValue(new Error("R2 HEAD failed on internal-host-7"))],
  ] as const)("answers 503 naming %s as failing without revealing why", async (failing, fail) => {
    fail()

    const response = await getHealth()
    const body = await response.text()

    expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE)
    expect(JSON.parse(body)).toStrictEqual({
      checks: { d1: "ok", kv: "ok", r2: "ok", [failing]: "error" },
      status: "error",
    })
    expect(body).not.toContain("internal-host")
  })

  it("logs the binding that did not answer with its error", async () => {
    const lost = new Error("D1_ERROR: Network connection lost.")
    first.mockRejectedValue(lost)

    await getHealth()

    expect(consoleError).toHaveBeenCalledExactlyOnceWith("[Health] D1 did not answer:", lost)
  })
})
