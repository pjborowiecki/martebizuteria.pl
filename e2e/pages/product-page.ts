import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class ProductPage extends BasePage {
  async gotoProduct(handle: string): Promise<void> {
    await this.open(`/en-US/products/${handle}`)
  }

  details(): Locator {
    return this.page.getByRole("complementary")
  }

  async addToCart(): Promise<void> {
    await this.details().getByRole("button", { name: "Add to cart" }).click()
    await this.details().getByRole("button", { name: "Added to Cart" }).waitFor()
  }

  wishlistButton(): Locator {
    return this.details().getByRole("button", { name: /Wishlist/u })
  }
}
