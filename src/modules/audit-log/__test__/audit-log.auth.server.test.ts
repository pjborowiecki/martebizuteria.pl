import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ROUTES } from "~/src/routes"

const stubs = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  handler: vi.fn<(request: Request) => Promise<Response>>(),
  recordAuthLoginFailedAudit: vi.fn(),
  recordAuthLogoutAudit: vi.fn(),
  resolveAuthAuditActor: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { handler: stubs.handler } }))

vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))

vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthLoginFailedAudit: stubs.recordAuthLoginFailedAudit,
  recordAuthLogoutAudit: stubs.recordAuthLogoutAudit,
  resolveAuthAuditActor: stubs.resolveAuthAuditActor,
}))

const { handleAuthRequestWithAudit } = await import("~/src/modules/audit-log/audit-log.auth.server")

const CLIENT_IP = "203.0.113.7"

const FAILED = 400

const authRequest = (path: string, body?: unknown): Request =>
  new Request(`https://marte.test/api/auth${path}`, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers: { "cf-connecting-ip": CLIENT_IP, "content-type": "application/json" },
    method: "POST",
  })

beforeEach(() => {
  vi.resetAllMocks()
  stubs.handler.mockResolvedValue(new Response(null, { status: 200 }))
  stubs.resolveAuthAuditActor.mockReturnValue("customer-actor")
})

describe("audited auth handler", () => {
  it("records the attempted email when a password sign-in is refused", async () => {
    stubs.handler.mockResolvedValue(new Response(null, { status: FAILED }))

    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_IN_EMAIL, { email: "shopper@marte.test" }))

    expect(stubs.recordAuthLoginFailedAudit).toHaveBeenCalledWith("shopper@marte.test", {
      detail: "shopper@marte.test",
      ip: CLIENT_IP,
      metadata: { email: "shopper@marte.test" },
    })
  })

  it("leaves a successful sign-in unaudited here, since the session hook owns it", async () => {
    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_IN_EMAIL, { email: "shopper@marte.test" }))

    expect(stubs.recordAuthLoginFailedAudit).not.toHaveBeenCalled()
  })

  it.each([[{ password: "no-email" }], [{ email: "" }], [{ email: 42 }]])(
    "records nothing when the body carries no email (%j)",
    async (body) => {
      stubs.handler.mockResolvedValue(new Response(null, { status: FAILED }))

      await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_IN_EMAIL, body))

      expect(stubs.recordAuthLoginFailedAudit).not.toHaveBeenCalled()
    },
  )

  it("records nothing when the body is not readable as JSON", async () => {
    stubs.handler.mockResolvedValue(new Response(null, { status: FAILED }))

    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_IN_EMAIL))

    expect(stubs.recordAuthLoginFailedAudit).not.toHaveBeenCalled()
  })

  it("records the sign-out against the session that was still live before it", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "shopper@marte.test", id: "usr_1" } })

    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_OUT))

    expect(stubs.recordAuthLogoutAudit).toHaveBeenCalledWith("customer-actor", { ip: CLIENT_IP, resourceId: "usr_1" })
  })

  it("records nothing when the sign-out itself fails", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "shopper@marte.test", id: "usr_1" } })
    stubs.handler.mockResolvedValue(new Response(null, { status: FAILED }))

    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_OUT))

    expect(stubs.recordAuthLogoutAudit).not.toHaveBeenCalled()
  })

  it("records nothing when an anonymous caller signs out", async () => {
    stubs.getRequestSession.mockResolvedValue(null)

    await handleAuthRequestWithAudit(authRequest(ROUTES.API_AUTH.SIGN_OUT))

    expect(stubs.recordAuthLogoutAudit).not.toHaveBeenCalled()
  })

  it("passes an unrelated auth route through without reading its body or session", async () => {
    const response = new Response(null, { status: 200 })
    stubs.handler.mockResolvedValue(response)
    const request = authRequest(ROUTES.API_AUTH.RESET_PASSWORD, { token: "abc" })

    await expect(handleAuthRequestWithAudit(request)).resolves.toBe(response)
    expect(stubs.getRequestSession).not.toHaveBeenCalled()
    expect(stubs.recordAuthLoginFailedAudit).not.toHaveBeenCalled()
    expect(stubs.recordAuthLogoutAudit).not.toHaveBeenCalled()
  })

  it("handles a request that is not under the auth API prefix", async () => {
    const request = new Request("https://marte.test/healthz", { method: "POST" })

    await handleAuthRequestWithAudit(request)

    expect(stubs.handler).toHaveBeenCalledWith(request)
  })
})
