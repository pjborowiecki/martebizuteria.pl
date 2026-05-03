import { create } from "zustand";
import { persist } from "zustand/middleware";

const MIN_QUANTITY = 1;

export interface CartItem {
  readonly id: string;
  readonly image: string;
  readonly material?: string;
  readonly materialKey?: string;
  readonly nameKey?: string;
  readonly price?: string;
  readonly priceKey?: string;
  readonly qty: number;
  readonly size?: string;
  readonly sizeKey?: string;
  readonly slug: string;
  readonly title?: string;
}

export interface CartState {
  readonly items: readonly CartItem[];
  readonly addItem: (item: CartItem) => void;
  readonly removeItem: (id: string) => void;
  readonly updateQuantity: (id: string, qty: number) => void;
  readonly clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem !== undefined) {
            return {
              items: state.items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + item.qty } : i))
            };
          }
          return { items: [...state.items, item] };
        });
      },
      clearCart: () => {
        set({ items: [] });
      },
      items: [
        {
          id: "1",
          image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
          materialKey: "items.item1.material",
          nameKey: "items.item1.name",
          priceKey: "items.item1.price",
          qty: 1,
          sizeKey: "items.item1.size",
          slug: "aura-hoop-i"
        },
        {
          id: "2",
          image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=600&q=80",
          materialKey: "items.item2.material",
          nameKey: "items.item2.name",
          priceKey: "items.item2.price",
          qty: 1,
          sizeKey: "items.item2.size",
          slug: "lune-drop"
        },
        {
          id: "3",
          image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=600&q=80",
          materialKey: "items.item3.material",
          nameKey: "items.item3.name",
          priceKey: "items.item3.price",
          qty: 2,
          sizeKey: "items.item3.size",
          slug: "contour-stud"
        }
      ],
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
      name: "marte-cart-storage"
    }
  )
);
