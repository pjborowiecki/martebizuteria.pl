import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

const auth = vi.hoisted(() => ({ authorized: vi.fn((permissions: unknown) => ({ permissions })) }))

const middlewareLists = vi.hoisted((): unknown[][] => [])

vi.mock("cloudflare:workers", () => ({ env: { RESEND_API_KEY: "re_test", RESEND_EMAIL_FROM: "hello@pjborowiecki.com" } }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => auth)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: () => unknown) => () => Promise.resolve(handler()),
      middleware: (list: unknown[]) => {
        middlewareLists.push(list)

        return builder
      },
    }

    return builder
  },
}))

const { getShopSender, getShopSenderQuery } = await import("~/src/integrations/resend/resend.shop-sender")

describe("getShopSender", () => {
  it("lets only an admin who manages the shop's settings read the sending address", () => {
    expect(middlewareLists).toStrictEqual([[{ permissions: { settings: ["manage"] } }]])
  })

  it("answers with the address the shop's e-mails are sent from, read live from the environment", async () => {
    await expect(getShopSender()).resolves.toStrictEqual({ address: "hello@pjborowiecki.com" })
  })

  it("serves the address through an admin query under its own key", async () => {
    const query = getShopSenderQuery()

    expect(query.queryKey).toStrictEqual(["admin", "resend", "shop-sender"])
    await expect(
      query.queryFn?.({
        client: new QueryClient(),
        meta: undefined,
        queryKey: query.queryKey,
        signal: new AbortController().signal,
      }),
    ).resolves.toStrictEqual({ address: "hello@pjborowiecki.com" })
  })
})
