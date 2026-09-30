import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { CartItem } from "~/src/modules/cart/cart.store"

const STORAGE_KEY = "marte-cart"

const line = (overrides: Partial<CartItem> = {}): Omit<CartItem, "qty"> => ({
  id: "variant-1",
  image: "products/ring.jpg",
  price: "120,00 zł",
  rawPrice: 12_000,
  slug: "srebrny-pierscionek",
  title: "Silver ring",
  variantId: "variant-1",
  variantTitle: "Size S",
  ...overrides,
})

const entries = new Map<string, string>()

const storage: Storage = {
  clear: () => {
    entries.clear()
  },
  getItem: (key: string) => entries.get(key) ?? null,
  key: (index: number) => [...entries.keys()][index] ?? null,
  get length() {
    return entries.size
  },
  removeItem: (key: string) => {
    entries.delete(key)
  },
  setItem: (key: string, value: string) => {
    entries.set(key, value)
  },
}

vi.stubGlobal("window", { localStorage: storage })

const { useCartStore } = await import("~/src/modules/cart/cart.store")

const rehydrate = async (stored: unknown): Promise<void> => {
  storage.setItem(STORAGE_KEY, JSON.stringify(stored))
  await useCartStore.persist.rehydrate()
}

const resetCart = (): void => {
  entries.clear()
  useCartStore.setState({ items: [] })
}

beforeEach(resetCart)

describe("addItem", () => {
  it("adds a line with a default quantity of one", () => {
    useCartStore.getState().addItem(line())

    expect(useCartStore.getState().items).toStrictEqual([{ ...line(), qty: 1 }])
  })

  it("honours an explicit quantity", () => {
    useCartStore.getState().addItem({ ...line(), qty: 3 })

    expect(useCartStore.getState().items[0]?.qty).toBe(3)
  })

  it("keys the line on the variant so the same variant accumulates", () => {
    useCartStore.getState().addItem({ ...line(), qty: 2 })
    useCartStore.getState().addItem({ ...line(), qty: 3 })

    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCartStore.getState().items[0]?.qty).toBe(5)
  })

  it("keeps two variants of the same product as separate lines", () => {
    useCartStore.getState().addItem(line())
    useCartStore.getState().addItem(line({ id: "variant-2", variantId: "variant-2", variantTitle: "Size L" }))

    expect(useCartStore.getState().items.map((item) => item.variantId)).toStrictEqual(["variant-1", "variant-2"])
  })

  it("ignores the caller's line id and uses the variant id", () => {
    useCartStore.getState().addItem(line({ id: "something-else" }))

    expect(useCartStore.getState().items[0]?.id).toBe("variant-1")
  })

  it("keeps the first line's display copy when the same variant is added again", () => {
    useCartStore.getState().addItem(line())
    useCartStore.getState().addItem(line({ price: "999,00 zł", rawPrice: 99_900 }))

    expect(useCartStore.getState().items[0]?.rawPrice).toBe(12_000)
  })
})

describe("updateQuantity", () => {
  beforeEach(() => {
    useCartStore.getState().addItem({ ...line(), qty: 2 })
  })

  it("sets the quantity of the addressed line", () => {
    useCartStore.getState().updateQuantity("variant-1", 5)

    expect(useCartStore.getState().items[0]?.qty).toBe(5)
  })

  it.each([[0], [-3]])("never drops the quantity below one when asked for %i", (qty) => {
    useCartStore.getState().updateQuantity("variant-1", qty)

    expect(useCartStore.getState().items[0]?.qty).toBe(1)
  })

  it("leaves the cart alone when the line is not there", () => {
    useCartStore.getState().updateQuantity("variant-9", 5)

    expect(useCartStore.getState().items[0]?.qty).toBe(2)
  })
})

describe("removeItem and clearCart", () => {
  beforeEach(() => {
    useCartStore.getState().addItem(line())
    useCartStore.getState().addItem(line({ id: "variant-2", variantId: "variant-2" }))
  })

  it("removes only the addressed line", () => {
    useCartStore.getState().removeItem("variant-1")

    expect(useCartStore.getState().items.map((item) => item.variantId)).toStrictEqual(["variant-2"])
  })

  it("leaves the cart alone when the line is not there", () => {
    useCartStore.getState().removeItem("variant-9")

    expect(useCartStore.getState().items).toHaveLength(2)
  })

  it("empties the whole cart", () => {
    useCartStore.getState().clearCart()

    expect(useCartStore.getState().items).toStrictEqual([])
  })
})

describe("itemCount", () => {
  it("sums the quantities rather than counting the lines", () => {
    useCartStore.getState().addItem({ ...line(), qty: 2 })
    useCartStore.getState().addItem({ ...line({ id: "variant-2", variantId: "variant-2" }), qty: 3 })

    expect(useCartStore.getState().itemCount()).toBe(5)
  })

  it("is zero for an empty cart", () => {
    expect(useCartStore.getState().itemCount()).toBe(0)
  })
})

describe("cartTotal", () => {
  it("sums the line totals in minor units", () => {
    useCartStore.getState().addItem({ ...line(), qty: 2 })
    useCartStore.getState().addItem({ ...line({ id: "variant-2", rawPrice: 5000, variantId: "variant-2" }), qty: 1 })

    expect(useCartStore.getState().cartTotal()).toBe(29_000)
  })

  it("is zero for an empty cart", () => {
    expect(useCartStore.getState().cartTotal()).toBe(0)
  })

  it("re-parses the display price when the stored minor amount is below the payment floor", () => {
    useCartStore.getState().addItem({ ...line({ price: "12.50", rawPrice: 1 }), qty: 2 })

    expect(useCartStore.getState().cartTotal()).toBe(2500)
  })
})

describe("rehydrating a persisted cart", () => {
  it("restores a well formed persisted line", async () => {
    await rehydrate({ state: { items: [{ ...line(), qty: 2 }] }, version: 1 })

    expect(useCartStore.getState().items).toStrictEqual([{ ...line(), qty: 2 }])
  })

  it("drops a persisted line that is missing a variant id", async () => {
    await rehydrate({ state: { items: [{ ...line(), qty: 2, variantId: "" }] }, version: 1 })

    expect(useCartStore.getState().items).toStrictEqual([])
  })

  it.each([[{ items: "not a list" }], [{}], [null], ["a string"]])("recovers from the persisted state %j", async (state) => {
    await rehydrate({ state, version: 1 })

    expect(useCartStore.getState().items).toStrictEqual([])
  })

  it("drops lines whose fields have the wrong type and keeps the rest", async () => {
    await rehydrate({
      state: {
        items: [
          { ...line(), qty: "2" },
          { ...line({ id: "variant-2", variantId: "variant-2" }), qty: 1 },
        ],
      },
      version: 1,
    })

    expect(useCartStore.getState().items.map((item) => item.variantId)).toStrictEqual(["variant-2"])
  })

  it("drops persisted entries that are not objects at all", async () => {
    await rehydrate({ state: { items: [null, "variant-1", 42] }, version: 1 })

    expect(useCartStore.getState().items).toStrictEqual([])
  })

  it("drops a persisted line whose price is not a string", async () => {
    await rehydrate({ state: { items: [{ ...line(), price: 12_000, qty: 1 }] }, version: 1 })

    expect(useCartStore.getState().items).toStrictEqual([])
  })
})

it("preserves unrelated lines when adding more of an existing variant", () => {
  useCartStore.getState().addItem(line())
  useCartStore.getState().addItem({ ...line({ id: "variant-2", variantId: "variant-2" }), qty: 3 })
  useCartStore.getState().addItem({ ...line(), qty: 2 })
  expect(useCartStore.getState().items.map((item) => ({ id: item.id, qty: item.qty }))).toStrictEqual([
    { id: "variant-1", qty: 3 },
    { id: "variant-2", qty: 3 },
  ])
})
