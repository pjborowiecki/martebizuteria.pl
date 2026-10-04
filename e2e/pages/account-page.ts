import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class AccountPage extends BasePage {
  async gotoSection(section: "addresses" | "orders" | "overview" | "payment" | "profile" | "wishlist"): Promise<void> {
    await this.open(`/en-US/account/${section}`)
  }

  navigation(): Locator {
    return this.page.getByRole("navigation", { name: "Your Account" })
  }

  signOutButton(): Locator {
    return this.page.getByRole("button", { name: "Sign Out" })
  }
}
