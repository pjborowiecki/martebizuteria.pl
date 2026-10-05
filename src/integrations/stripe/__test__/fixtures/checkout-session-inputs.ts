import { createCheckoutSessionInputSchema, updateCheckoutSessionInputSchema } from "~/src/integrations/stripe/stripe.actions.schemas"

export const CHECKOUT_VALUES = {
  address1: "ul. Mokotowska 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "dpd-courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
}

export const CART_ITEM = {
  id: "line-1",
  image: "products/bracelet.jpg",
  price: "249,00 zł",
  qty: 2,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
}

export const HELD_LINES = [{ qty: 1, variantId: "variant-old" }]

interface CatalogueInventory {
  id: string
  quantityAvailable: number
  version: number
}

export interface CatalogueVariant {
  id: string
  inventory: CatalogueInventory | null
  price: number
  title: string
}

export const catalogueProduct = (variants: CatalogueVariant[]) => ({ handle: CART_ITEM.slug, id: "product-1", variants })

export const availableVariant = (): CatalogueVariant => ({
  id: CART_ITEM.variantId,
  inventory: { id: "inventory-1", quantityAvailable: 5, version: 7 },
  price: 24_900,
  title: "Rozmiar M (katalog)",
})

export const createInput = (values: Record<string, unknown> = {}, items: Record<string, unknown>[] = [CART_ITEM]) =>
  createCheckoutSessionInputSchema.parse({ checkoutValues: { ...CHECKOUT_VALUES, ...values }, items })

export const updateInput = (values: Record<string, unknown> = {}, items: Record<string, unknown>[] = [CART_ITEM]) =>
  updateCheckoutSessionInputSchema.parse({
    checkoutValues: { ...CHECKOUT_VALUES, ...values },
    items,
    sessionId: "cs_old",
  })

export const pendingContext = (overrides: Record<string, unknown> = {}) => ({
  checkoutId: "checkout-1",
  checkoutStatus: "pending",
  email: "anna@example.com",
  paymentStatus: "pending",
  userId: "user-1",
  ...overrides,
})

export const requestOn = (origin: string): Request =>
  new Request(`${origin}/_serverFn/checkout`, { headers: { origin: "https://store.test", referer: "https://store.test/cart" } })
