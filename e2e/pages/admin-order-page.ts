import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class AdminOrderPage extends BasePage {
  async gotoOrderFor(email: string): Promise<void> {
    await this.open("/en-US/admin/orders")
    await this.page.getByRole("searchbox", { name: "Search orders…" }).fill(email)
    await this.page.getByRole("row").filter({ hasText: email }).first().getByRole("cell").nth(1).click()
    await this.page.waitForURL(/\/admin\/orders\/[\w-]+$/u)
    await this.waitForAppReady()
  }

  action(name: string): Locator {
    return this.page.getByRole("main").getByRole("button", { exact: true, name })
  }
}
