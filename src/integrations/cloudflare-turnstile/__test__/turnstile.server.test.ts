import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const workerEnv = vi.hoisted(() => ({ TURNSTILE_SECRET_KEY: "0x4AAAAAAAwidget-secret" }))

vi.mock("cloudflare:workers", () => ({ env: workerEnv }))

import { TURNSTILE_SITEVERIFY_URL, TURNSTILE_TESTING_KEYS } from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import { passesTurnstile, verifyTurnstileToken } from "~/src/integrations/cloudflare-turnstile/turnstile.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const WIDGET_SECRET_KEY = "0x4AAAAAAAwidget-secret"

const CHECK = { action: "checkout", hostname: "martebizuteria.pl", remoteIp: "203.0.113.7", token: "token-1" } as const

const BOT_CHECK_REFUSAL = { code: ERROR_CODES.FORBIDDEN, message: "BOT_CHECK_FAILED" }

const fetchMock = vi.fn<(input: string, init: RequestInit) => Promise<Response>>()

const answer = (verdict: Record<string, unknown>, status = 200): void => {
  fetchMock.mockResolvedValue(Response.json(verdict, { status }))
}

const sentForm = (): URLSearchParams => {
  const body = fetchMock.mock.lastCall?.[1].body

  return body instanceof URLSearchParams ? body : new URLSearchParams()
}

beforeEach(() => {
  workerEnv.TURNSTILE_SECRET_KEY = WIDGET_SECRET_KEY
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("verifyTurnstileToken", () => {
  it("passes a token Cloudflare confirms was issued for this action on this host", async () => {
    answer({ action: "checkout", "error-codes": [], hostname: "martebizuteria.pl", success: true })

    await expect(verifyTurnstileToken(CHECK)).resolves.toBeUndefined()
  })

  it("posts the token, the secret and the visitor's IP to siteverify with a time limit", async () => {
    answer({ action: "checkout", hostname: "martebizuteria.pl", success: true })

    await verifyTurnstileToken(CHECK)

    expect(fetchMock.mock.lastCall?.[0]).toBe(TURNSTILE_SITEVERIFY_URL)
    expect(fetchMock.mock.lastCall?.[1].method).toBe("POST")
    expect(fetchMock.mock.lastCall?.[1].signal).toBeInstanceOf(AbortSignal)
    expect(Object.fromEntries(sentForm())).toStrictEqual({ remoteip: "203.0.113.7", response: "token-1", secret: WIDGET_SECRET_KEY })
  })

  it("leaves the IP out when the request carried none", async () => {
    answer({ action: "checkout", hostname: "martebizuteria.pl", success: true })

    await verifyTurnstileToken({ ...CHECK, remoteIp: undefined })

    expect(sentForm().has("remoteip")).toBe(false)
  })

  it("refuses a token Cloudflare rejects", async () => {
    answer({ "error-codes": ["timeout-or-duplicate"], success: false })

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
  })

  it.each([
    ["another action", { action: "newsletter", hostname: "martebizuteria.pl", success: true }],
    ["another host", { action: "checkout", hostname: "evil.example", success: true }],
    ["no action or host", { success: true }],
  ])("refuses a token issued for %s", async (_label, verdict) => {
    answer(verdict)

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
  })

  it("refuses the token and logs why when siteverify fails, so a bot is never let through by an outage", async () => {
    answer({ success: true }, 500)

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
    expect(console.error).toHaveBeenCalledWith("Turnstile siteverify could not check a token", expect.any(Error))
  })

  it("refuses the token when siteverify cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("network down"))

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
  })

  it("refuses the token when siteverify answers something that is not a verdict", async () => {
    answer({ unexpected: true })

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
  })
})

describe("verifyTurnstileToken with Cloudflare's testing secret", () => {
  it("passes the testing token, whose verdict names Cloudflare's placeholder action and host", async () => {
    workerEnv.TURNSTILE_SECRET_KEY = TURNSTILE_TESTING_KEYS.ALWAYS_PASSES_SECRET_KEY
    answer({ action: "test", hostname: "localhost", success: true })

    await expect(verifyTurnstileToken({ ...CHECK, token: TURNSTILE_TESTING_KEYS.DUMMY_TOKEN })).resolves.toBeUndefined()
  })

  it("still refuses a token the testing secret rejects", async () => {
    workerEnv.TURNSTILE_SECRET_KEY = TURNSTILE_TESTING_KEYS.ALWAYS_PASSES_SECRET_KEY
    answer({ "error-codes": ["invalid-input-response"], success: false })

    await expect(verifyTurnstileToken(CHECK)).rejects.toMatchObject(BOT_CHECK_REFUSAL)
  })
})

describe("passesTurnstile", () => {
  it("answers true for a token Cloudflare confirms was issued for this action on this host", async () => {
    answer({ action: "checkout", hostname: "martebizuteria.pl", success: true })

    await expect(passesTurnstile(CHECK)).resolves.toBe(true)
  })

  it.each([
    ["a token Cloudflare rejects", { "error-codes": ["timeout-or-duplicate"], success: false }],
    ["a token issued for another action", { action: "sign-up", hostname: "martebizuteria.pl", success: true }],
  ])("answers false, without throwing, for %s", async (_label, verdict) => {
    answer(verdict)

    await expect(passesTurnstile(CHECK)).resolves.toBe(false)
  })
})
