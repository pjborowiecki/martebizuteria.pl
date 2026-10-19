import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { type Newsletter } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"

interface RouteDefinition {
  readonly server: {
    readonly handlers: {
      readonly POST: (context: { readonly request: Request }) => Promise<Response>
    }
  }
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

const { unsubscribeByToken } = vi.hoisted(() => ({ unsubscribeByToken: vi.fn<(token: string) => Promise<Newsletter["tokenResult"]>>() }))

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return options
  },
}))
vi.mock("~/src/modules/newsletter-subscriber/use-cases/unsubscribe-subscriber.server", () => ({ unsubscribeByToken }))

await import("~/src/routes/api/newsletter.unsubscribe")

const route = captured.current

if (route === undefined) {
  throw new Error("the one-click unsubscribe route did not register a handler")
}

const { POST: postUnsubscribe } = route.server.handlers

const TOKEN = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const oneClick = (query: string): Request =>
  new Request(`https://martebizuteria.pl/api/newsletter/unsubscribe${query}`, {
    body: "List-Unsubscribe=One-Click",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })

beforeEach(() => {
  unsubscribeByToken.mockReset()
  unsubscribeByToken.mockResolvedValue({ email: "anna@example.test", result: NEWSLETTER_TOKEN_RESULT.OK })
})

describe("one-click newsletter unsubscribe route", () => {
  it("unsubscribes the subscriber the token names, without a session", async () => {
    const response = await postUnsubscribe({ request: oneClick(`?token=${TOKEN}`) })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toStrictEqual({ unsubscribed: true })
    expect(unsubscribeByToken).toHaveBeenCalledWith(TOKEN)
  })

  it("answers a repeated one-click as done", async () => {
    unsubscribeByToken.mockResolvedValue({ email: "anna@example.test", result: NEWSLETTER_TOKEN_RESULT.ALREADY_DONE })

    const response = await postUnsubscribe({ request: oneClick(`?token=${TOKEN}`) })

    expect(response.status).toBe(200)
  })

  it("answers not found for a token no subscriber holds", async () => {
    unsubscribeByToken.mockResolvedValue({ email: undefined, result: NEWSLETTER_TOKEN_RESULT.INVALID })

    const response = await postUnsubscribe({ request: oneClick(`?token=${TOKEN}`) })

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it.each(["", "?token=short"])("refuses %j without looking anything up", async (query) => {
    const response = await postUnsubscribe({ request: oneClick(query) })

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
    expect(unsubscribeByToken).not.toHaveBeenCalled()
  })
})
