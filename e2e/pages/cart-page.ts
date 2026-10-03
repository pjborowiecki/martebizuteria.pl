import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class CartPage extends BasePage {
  async gotoCart(): Promise<void> {
    await this.open("/en-US/cart")
  }

  summary(): Locator {
    return this.page.getByRole("complementary")
  }

  quantity(): Locator {
    return this.page.getByRole("main").getByText(/^\d+$/u).first()
  }

  increaseButton(): Locator {
    return this.page.getByRole("main").getByRole("button", { name: "Increase quantity" })
  }

  decreaseButton(): Locator {
    return this.page.getByRole("main").getByRole("button", { name: "Decrease quantity" })
  }

  removeButton(): Locator {
    return this.page.getByRole("main").getByRole("button", { name: "Remove item" })
  }

  async proceedToCheckout(): Promise<void> {
    await this.summary().getByRole("link", { name: "Proceed to Checkout" }).click()
  }
}
