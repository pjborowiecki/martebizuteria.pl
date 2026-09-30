import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface AuthRouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly GET: (context: { readonly request: Request }) => Promise<Response>
      readonly POST: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const captured: { current: AuthRouteDefinition | undefined } = { current: undefined }

const handleAuthRequestWithAudit = vi.fn<(request: Request) => Promise<Response>>()

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: AuthRouteDefinition) => {
    captured.current = options

    return options
  },
}))
vi.mock("~/src/modules/audit-log/audit-log.auth.server", () => ({ handleAuthRequestWithAudit }))

await import("~/src/routes/api/auth.$")

const route = captured.current

if (route === undefined) {
  throw new Error("the auth catch-all route did not register handlers")
}

const getHandler = route.server.handlers.GET

const postHandler = route.server.handlers.POST

beforeEach(() => {
  vi.clearAllMocks()
  handleAuthRequestWithAudit.mockResolvedValue(new Response("ok", { status: 200 }))
})

describe("auth catch-all route", () => {
  it("hands a GET request straight to the audited auth handler", async () => {
    const request = new Request("https://store.test/api/auth/get-session")

    const response = await getHandler({ request })

    expect(handleAuthRequestWithAudit).toHaveBeenCalledWith(request)
    await expect(response.text()).resolves.toBe("ok")
  })

  it("hands a POST request straight to the audited auth handler", async () => {
    const request = new Request("https://store.test/api/auth/sign-in/email", { body: "{}", method: "POST" })

    await postHandler({ request })

    expect(handleAuthRequestWithAudit).toHaveBeenCalledWith(request)
  })

  it("returns whatever response the auth handler produced without rewriting the status", async () => {
    handleAuthRequestWithAudit.mockResolvedValue(new Response("nope", { status: 401 }))

    const response = await postHandler({ request: new Request("https://store.test/api/auth/sign-in/email", { method: "POST" }) })

    expect(response.status).toBe(401)
  })

  it("lets a failure from the auth handler propagate instead of swallowing it", async () => {
    handleAuthRequestWithAudit.mockRejectedValue(new Error("auth storage unavailable"))

    await expect(getHandler({ request: new Request("https://store.test/api/auth/get-session") })).rejects.toThrow(
      "auth storage unavailable",
    )
  })
})
