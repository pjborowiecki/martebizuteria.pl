import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class AdminOrderPage extends BasePage {
  async gotoOrderFor(email: string): Promise<void> {
    await this.open("/en-US/admin/orders")
    await this.page.getByRole("searchbox", { name: "Search orders…" }).fill(email)
    await this.openOrderFor(email)
  }

  async openOrderFor(email: string): Promise<void> {
    await this.orderRow(email).getByRole("cell").nth(1).click()
    await this.page.waitForURL(/\/admin\/orders\/[\w-]+$/u)
    await this.waitForAppReady()
  }

  async backToOrders(): Promise<void> {
    await this.page.getByRole("main").getByRole("link", { exact: true, name: "Orders" }).click()
    await this.page.waitForURL(/\/admin\/orders$/u)
  }

  orderRow(email: string): Locator {
    return this.page.getByRole("row").filter({ hasText: email }).first()
  }

  action(name: string): Locator {
    return this.page.getByRole("main").getByRole("button", { exact: true, name })
  }
}
