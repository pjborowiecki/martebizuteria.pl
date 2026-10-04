import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"

interface CheckoutPageDeps {
  readonly success: boolean | undefined
}

interface RouteDefinition {
  readonly loader?: (args: { readonly context: { readonly queryClient: QueryClient }; readonly deps: CheckoutPageDeps }) => Promise<void>
  readonly loaderDeps?: (args: { readonly search: { readonly step: number; readonly success?: boolean | undefined } }) => CheckoutPageDeps
}

const captured = vi.hoisted((): { current: RouteDefinition | undefined } => ({ current: undefined }))

const delivery = vi.hoisted(() => ({ fetchMethods: vi.fn<() => Promise<unknown[]>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  createFileRoute: () => (options: RouteDefinition) => {
    captured.current = options

    return { options }
  },
}))
vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", async () => {
  const { DELIVERY_METHOD_QUERY_KEYS: keys } = await import("~/src/modules/delivery-method/delivery-method.constants")

  return { listDeliveryMethodsQuery: () => ({ queryFn: delivery.fetchMethods, queryKey: keys.ALL }) }
})
vi.mock("~/src/hooks/use-cart-availability", () => ({ useCartAvailability: vi.fn() }))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form.client", () => ({ CheckoutForm: () => null }))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-skeleton", () => ({ CheckoutFormSkeleton: () => null }))
vi.mock("~/src/presentation/components/custom/checkout/components/checkout-success", () => ({ CheckoutSuccess: () => null }))

await import("~/src/routes/checkout.index")

const route = captured.current

if (route === undefined) {
  throw new Error("the checkout page route did not register any options")
}

const COURIER_METHOD = { id: "dm-courier", name: "Kurier InPost", price: 1999, type: "courier" }

const load = (queryClient: QueryClient, success?: boolean): Promise<void> | undefined =>
  route.loader?.({ context: { queryClient }, deps: { success } })

beforeEach(() => {
  delivery.fetchMethods.mockReset().mockResolvedValue([COURIER_METHOD])
})

describe("checkout page loader dependencies", () => {
  it("reloads only when the payment outcome changes, not on every step", () => {
    expect(route.loaderDeps?.({ search: { step: 3, success: undefined } })).toStrictEqual({ success: undefined })
    expect(route.loaderDeps?.({ search: { step: 1, success: true } })).toStrictEqual({ success: true })
  })
})

describe("checkout page delivery methods", () => {
  it("leaves the delivery methods in the cache for the checkout form", async () => {
    const queryClient = new QueryClient()

    await load(queryClient)

    expect(delivery.fetchMethods).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(DELIVERY_METHOD_QUERY_KEYS.ALL)).toStrictEqual([COURIER_METHOD])
  })

  it("keeps the loaded methods without asking again on the next visit", async () => {
    const queryClient = new QueryClient()

    await load(queryClient)
    await load(queryClient)

    expect(delivery.fetchMethods).toHaveBeenCalledOnce()
  })

  it("does not ask for delivery methods on the confirmation shown after payment", async () => {
    const queryClient = new QueryClient()

    await load(queryClient, true)

    expect(delivery.fetchMethods).not.toHaveBeenCalled()
    expect(queryClient.getQueryState(DELIVERY_METHOD_QUERY_KEYS.ALL)).toBeUndefined()
  })

  it("still opens the checkout when the delivery methods cannot be loaded, leaving the form to ask again", async () => {
    delivery.fetchMethods.mockRejectedValue(new Error("D1 unavailable"))
    const queryClient = new QueryClient()

    await expect(load(queryClient)).resolves.toBeUndefined()
    expect(queryClient.getQueryState(DELIVERY_METHOD_QUERY_KEYS.ALL)).toMatchObject({ data: undefined, status: "error" })
  })
})
