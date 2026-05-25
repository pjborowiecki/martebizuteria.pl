import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_QUANTITY = 1;
const INITIAL_COUNT = 0;

export interface CartItem {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly image: string;
  readonly material: string;
  readonly size: string;
  readonly price: string;
  qty: number;
}

interface CartActions {
  readonly addItem: (item: Omit<CartItem, "qty"> & { readonly qty?: number }) => void;
  readonly removeItem: (id: string) => void;
  readonly updateQuantity: (id: string, qty: number) => void;
  readonly clearCart: () => void;
  readonly itemCount: () => number;
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
