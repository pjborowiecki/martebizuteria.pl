import { useEffect, useState } from "react"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { CART_LINE_QUANTITY_MAX } from "~/src/modules/cart/cart.constants"
import { type CartItem, type CartUnitPrice } from "~/src/modules/cart/cart.types"
import { getCartLineTotalCents, getCartLineUnitPriceCents } from "~/src/modules/cart/cart.utils"

const MIN_QUANTITY = 1

const CART_PERSIST_VERSION = 3

const toLineQuantity = (qty: number): number => Math.min(CART_LINE_QUANTITY_MAX, Math.max(MIN_QUANTITY, qty))

const withLineQuantityLimit = (item: CartItem): CartItem => ({ ...item, qty: toLineQuantity(item.qty) })

interface CartActions {
  readonly addItem: (
    item: Omit<CartItem, "qty"> & {
      readonly qty?: number
    },
  ) => void
  readonly applyCurrentPrices: (prices: readonly CartUnitPrice[]) => void
  readonly removeItem: (id: string) => void
  readonly updateQuantity: (id: string, qty: number) => void
  readonly clearCart: () => void
  readonly itemCount: () => number
  readonly cartTotal: () => number
}

export interface CartState extends CartActions {
  readonly items: CartItem[]
}

const isPersistedCartItem = (value: unknown): value is CartItem => {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const row = value as Partial<CartItem>

  return (
    typeof row.id === "string" &&
    typeof row.variantId === "string" &&
    row.variantId.length > 0 &&
    typeof row.slug === "string" &&
    typeof row.title === "string" &&
    typeof row.variantTitle === "string" &&
    typeof row.image === "string" &&
    typeof row.price === "string" &&
    typeof row.rawPrice === "number" &&
    (row.priceChanged === undefined || typeof row.priceChanged === "boolean") &&
    typeof row.qty === "number"
  )
}

const repriceItem = (item: CartItem, priceByVariantId: ReadonlyMap<string, number>): CartItem => {
  const unitPrice = priceByVariantId.get(item.variantId)
  if (unitPrice === undefined || unitPrice === getCartLineUnitPriceCents(item)) {
    return item
  }

  return { ...item, priceChanged: true, rawPrice: unitPrice }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      addItem: (incoming) => {
        const lineId = incoming.variantId
        const qty = incoming.qty ?? MIN_QUANTITY
        set((state) => {
          const existing = state.items.find((item) => item.id === lineId)
          if (existing !== undefined) {
            return {
              items: state.items.map((item) =>
                item.id === lineId
                  ? {
                      ...item,
                      qty: toLineQuantity(item.qty + qty),
                    }
                  : item,
              ),
            }
          }

          return {
            items: [
              ...state.items,
              {
                ...incoming,
                id: lineId,
                qty: toLineQuantity(qty),
              },
            ],
          }
        })
      },
      applyCurrentPrices: (prices) => {
        const priceByVariantId = new Map(prices.map((line) => [line.variantId, line.unitPrice]))
        const { items } = get()
        const repriced = items.map((item) => repriceItem(item, priceByVariantId))
        if (repriced.some((item, index) => item !== items[index])) {
          set({ items: repriced })
        }
      },
      cartTotal: () => get().items.reduce((total, item) => total + getCartLineTotalCents(item), 0),
      clearCart: () => {
        set({
          items: [],
        })
      },
      itemCount: () => get().items.reduce((count, item) => count + item.qty, 0),
      items: [],
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }))
      },
      updateQuantity: (id, qty) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  qty: toLineQuantity(qty),
                }
              : item,
          ),
        }))
      },
    }),
    {
      migrate: (persisted) => {
        if (typeof persisted !== "object" || persisted === null) {
          return {
            items: [],
          }
        }

        const state = persisted as {
          items?: unknown
        }

        const items = Array.isArray(state.items) ? state.items.filter(isPersistedCartItem).map((item) => withLineQuantityLimit(item)) : []

        return {
          items,
        }
      },
      name: "marte-cart",
      version: CART_PERSIST_VERSION,
    },
  ),
)

export const useCartHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState<boolean>(false)
  useEffect(() => {
    setHydrated(useCartStore.persist.hasHydrated())
    const unsubscribe = useCartStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })

    return unsubscribe
  }, [])

  return hydrated
}
