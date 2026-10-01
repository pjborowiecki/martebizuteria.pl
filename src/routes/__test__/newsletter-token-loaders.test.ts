import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface LoaderArgs {
  readonly context: { readonly locale: string; readonly queryClient: { readonly query: () => Promise<unknown> } }
  readonly deps: { readonly token?: string | undefined }
}

interface RouteDefinition {
  readonly loader?: (args: LoaderArgs) => Promise<{ email: string; result: string; title: string }>
  readonly loaderDeps?: (args: { search: { token?: string | undefined } }) => { token?: string | undefined }
}

const captured = vi.hoisted(() => new Map<string, RouteDefinition>())

const calls = vi.hoisted(() => ({
  confirm: vi.fn<(input: { data: { token: string } }) => Promise<{ email?: string; result: string }>>(),
  unsubscribe: vi.fn<(input: { data: { token: string } }) => Promise<{ email?: string; result: string }>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: (path: string) => (options: RouteDefinition) => {
    captured.set(path, options)

    return { options, useLoaderData: () => ({}) }
  },
}))
vi.mock("~/src/modules/newsletter/use-cases/confirm-newsletter-subscription", () => ({
  confirmNewsletterSubscription: calls.confirm,
}))
vi.mock("~/src/modules/newsletter/use-cases/unsubscribe-from-newsletter", () => ({
  unsubscribeFromNewsletter: calls.unsubscribe,
}))

const MESSAGES = {
  confirm: { metadata: { description: "Confirm description", title: "Confirm" } },
  unsubscribe: { metadata: { description: "Unsubscribe description", title: "Unsubscribe" } },
}

await import("~/src/routes/_storefront.newsletter.confirm")
await import("~/src/routes/_storefront.newsletter.unsubscribe")

const load = (path: string, token?: string) => {
  const loader = captured.get(path)?.loader
  if (loader === undefined) {
    throw new Error(`Missing loader for ${path}`)
  }

  return loader({ context: { locale: "en-US", queryClient: { query: () => Promise.resolve(MESSAGES) } }, deps: { token } })
}

beforeEach(() => {
  vi.clearAllMocks()
  calls.confirm.mockResolvedValue({ email: "anna@example.com", result: "ok" })
  calls.unsubscribe.mockResolvedValue({ email: "anna@example.com", result: "ok" })
})

describe("newsletter confirm loader", () => {
  it("spends the token from the link once, server-side, before the page renders", async () => {
    await expect(load("/_storefront/newsletter/confirm", "token-123")).resolves.toMatchObject({
      email: "anna@example.com",
      result: "ok",
    })
    expect(calls.confirm).toHaveBeenCalledExactlyOnceWith({ data: { token: "token-123" } })
  })

  it("treats a link with no token as invalid without calling the server", async () => {
    await expect(load("/_storefront/newsletter/confirm")).resolves.toMatchObject({ email: "", result: "invalid" })
    expect(calls.confirm).not.toHaveBeenCalled()
  })

  it("passes a spent link's outcome straight through", async () => {
    calls.confirm.mockResolvedValue({ email: "anna@example.com", result: "alreadyDone" })

    await expect(load("/_storefront/newsletter/confirm", "token-123")).resolves.toMatchObject({ result: "alreadyDone" })
  })

  it("titles the page from the message catalogue", async () => {
    await expect(load("/_storefront/newsletter/confirm", "token-123")).resolves.toMatchObject({
      description: "Confirm description",
      title: "M'Arte | Confirm",
    })
  })

  it("keys the loader on the token so a new link is spent on its own", () => {
    expect(captured.get("/_storefront/newsletter/confirm")?.loaderDeps?.({ search: { token: "token-9" } })).toStrictEqual({
      token: "token-9",
    })
  })
})

describe("newsletter unsubscribe loader", () => {
  it("removes the subscriber the token belongs to", async () => {
    await expect(load("/_storefront/newsletter/unsubscribe", "token-456")).resolves.toMatchObject({ result: "ok" })
    expect(calls.unsubscribe).toHaveBeenCalledExactlyOnceWith({ data: { token: "token-456" } })
  })

  it("treats a link with no token as invalid without calling the server", async () => {
    await expect(load("/_storefront/newsletter/unsubscribe")).resolves.toMatchObject({ result: "invalid" })
    expect(calls.unsubscribe).not.toHaveBeenCalled()
  })
})
