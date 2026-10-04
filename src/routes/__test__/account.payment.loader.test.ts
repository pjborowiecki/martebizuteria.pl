import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface QueryRequest {
  readonly queryFn?: () => Promise<unknown>
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface PaymentRouteDefinition {
  readonly loader?: (
    args: Readonly<{ context: { locale: string; queryClient: { query: (options: QueryRequest) => Promise<unknown> } } }>,
  ) => Promise<unknown>
}

const captured: { current: PaymentRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: PaymentRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/modules/payment/use-cases/delete-saved-payment-method", () => ({
  deleteSavedPaymentMethodMutation: { mutationFn: vi.fn() },
}))
vi.mock("~/src/modules/payment/use-cases/create-card-setup-intent", () => ({
  createCardSetupIntentMutation: { mutationFn: vi.fn() },
}))
vi.mock("~/src/modules/payment/use-cases/list-saved-payment-methods", async () => {
  const { PAYMENT_METHOD_QUERY_KEYS } = await import("~/src/modules/payment/payment.constants")

  return { listSavedPaymentMethodsQuery: () => ({ queryFn: () => Promise.resolve([]), queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED }) }
})

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"

await import("~/src/routes/account.payment")

const route = captured.current

if (route?.loader === undefined) {
  throw new Error("the payment route registered no loader")
}

const { loader } = route

const query = vi.fn<(options: QueryRequest) => Promise<unknown>>()

const isMessagesRequest = (options: QueryRequest): boolean => options.queryKey[0] === "messages"

const load = (locale = "en-US") => loader({ context: { locale, queryClient: { query } } })

beforeEach(() => {
  query
    .mockReset()
    .mockImplementation((options) =>
      options.queryKey[2] === "pages.account" && options.queryFn !== undefined
        ? options.queryFn()
        : Promise.resolve({ description: "Your account", title: "Account" }),
    )
})

describe("the payment route loader", () => {
  it("warms the saved cards and treats them as already fresh", async () => {
    await load()

    const pageQueries = query.mock.calls.map(([options]) => options).filter((options) => !isMessagesRequest(options))

    expect(pageQueries).toStrictEqual([expect.objectContaining({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED, staleTime: "static" })])
  })

  it.each([
    ["en-US", "Payment Methods | M'Arte"],
    ["pl-PL", "Metody płatności | M'Arte"],
  ])("titles the %s page with the shipped name of the payment methods section", async (locale, title) => {
    await expect(load(locale)).resolves.toStrictEqual({ description: "Your account", title })
  })

  it("lets a failed wallet read reach the route error boundary", async () => {
    const failure = new Error("Stripe unavailable")
    query.mockRejectedValueOnce(failure)

    await expect(load()).rejects.toBe(failure)
  })
})
