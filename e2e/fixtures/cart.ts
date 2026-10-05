import { type Page } from "@playwright/test"

const CART_STORAGE_KEY = "marte-cart"

interface StoredCart {
  readonly state: { readonly items: { rawPrice: number }[] }
}

export const rememberPriceWhenAdded = async (page: Page, rawPrice: number): Promise<void> => {
  await page.evaluate(
    ({ key, price }) => {
      const raw = localStorage.getItem(key)
      if (raw === null) {
        throw new Error("The browser holds no cart to reprice")
      }

      const stored = JSON.parse(raw) as StoredCart
      for (const item of stored.state.items) {
        item.rawPrice = price
      }
      localStorage.setItem(key, JSON.stringify(stored))
    },
    { key: CART_STORAGE_KEY, price: rawPrice },
  )
}
