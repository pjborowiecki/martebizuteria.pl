import { useEffect, useState } from "react"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import { getCartLineTotalCents } from "~/src/modules/cart/cart.pricing"

const MIN_QUANTITY = 1

const CART_PERSIST_VERSION = 2

export interface CartItem {
  readonly id: string
  readonly variantId: string
  readonly slug: string
  readonly title: string
  readonly variantTitle: string
  readonly image: string
  readonly price: string
  readonly rawPrice: number
  qty: number
}

interface CartActions {
  readonly addItem: (
    item: Omit<CartItem, "qty"> & {
      readonly qty?: number
    },
  ) => void
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
    typeof row.qty === "number"
  )
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
                      qty: item.qty + qty,
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
                qty,
              },
            ],
          }
        })
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
                  qty: Math.max(MIN_QUANTITY, qty),
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

        const items = Array.isArray(state.items) ? state.items.filter(isPersistedCartItem) : []

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
