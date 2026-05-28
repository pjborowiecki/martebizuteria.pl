import { useEffect, useState } from "react";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_QUANTITY = 1;
const INITIAL_COUNT = 0;
const FALLBACK_PRICE = 0;
const CENTS_IN_ZLOTY = 100;

export interface CartItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly image: string;
  readonly material: string;
  readonly size: string;
  readonly price: string;
  readonly rawPrice: number;
  qty: number;
}

interface CartActions {
  readonly addItem: (item: Omit<CartItem, "qty"> & { readonly qty?: number }) => void;
  readonly removeItem: (id: string) => void;
  readonly updateQuantity: (id: string, qty: number) => void;
  readonly clearCart: () => void;
  readonly itemCount: () => number;
  readonly cartTotal: () => number;
}

export interface CartState extends CartActions {
  readonly items: CartItem[];
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      addItem: (incoming) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === incoming.id);
          const qty = incoming.qty ?? MIN_QUANTITY;

          if (existing !== undefined) {
            return {
              items: state.items.map((i) => (i.id === incoming.id ? { ...i, qty: i.qty + qty } : i))
            };
          }

          return {
            items: [...state.items, { ...incoming, qty }]
          };
        });
      },

      cartTotal: () =>
        get().items.reduce((total, item) => {
          let p = item.rawPrice;
          if (p === undefined) {
            const parsed = Number.parseFloat((item.price ?? "0").replaceAll(/[^0-9,.]/gu, "").replaceAll(",", "."));
            p = Number.isNaN(parsed) ? FALLBACK_PRICE : parsed * CENTS_IN_ZLOTY;
          }
          return total + p * item.qty;
        }, INITIAL_COUNT),

      clearCart: () => {
        set({ items: [] });
      },

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, INITIAL_COUNT),

      items: [],

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id)
        }));
      },

      updateQuantity: (id, qty) => {
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, qty: Math.max(MIN_QUANTITY, qty) } : i))
        }));
      }
    }),
    {
      name: "marte-cart"
    }
  )
);

/**
 * Tracks whether the persisted cart has finished rehydrating from storage.
 *
 * On the server (and the first client paint) the store always starts empty, so
 * any consumer that branches on cart contents — e.g. the empty-cart checkout
 * guard — must wait for hydration before acting, otherwise a returning shopper
 * with a full cart would be wrongly treated as empty.
 */
export function useCartHydrated(): boolean {
  // MUST start `false` — never seed from `hasHydrated()`. `persist` rehydrates
  // from localStorage synchronously at module load, so on the client
  // `hasHydrated()` is already `true`. But the cart `items` are read through
  // zustand's `useSyncExternalStore`, which returns the *server* snapshot
  // (empty cart) on the first hydration render to match SSR. Seeding `true`
  // here would make a consumer observe `hydrated === true` while `items` is
  // still empty for one render — the empty-cart guard would then bounce a
  // shopper with a full cart to /cart. Starting `false` keeps this render in
  // lockstep with the server (skeleton) and the effect flips it once mounted,
  // by which point the live store snapshot (with items) is in effect.
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    // Reflect a rehydration that already finished before this effect ran, then
    // subscribe for the async-storage case. `?? true` so a missing middleware
    // (defensive) never leaves a client consumer stuck on the skeleton.
    setHydrated(useCartStore.persist?.hasHydrated() ?? true);
    const unsubscribe = useCartStore.persist?.onFinishHydration(() => {
      setHydrated(true);
    });
    return unsubscribe;
  }, []);

  return hydrated;
}
