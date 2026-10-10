import { readFile } from "node:fs/promises"

import { type Locator, type Page, expect } from "@playwright/test"

import { BasePage } from "./base-page"

export class AdminOrderPage extends BasePage {
  async gotoOrderFor(email: string): Promise<void> {
    await this.searchOrdersFor(email)
    await this.openOrderFor(email)
  }

  async searchOrdersFor(email: string): Promise<void> {
    await this.open("/en-US/admin/orders")
    await this.page.getByRole("searchbox", { name: "Search orders…" }).fill(email)
    await expect(this.orderRow(email)).toBeVisible()
    await expect(
      this.page
        .getByRole("row")
        .filter({ has: this.page.getByRole("cell") })
        .filter({ hasNotText: email }),
    ).toHaveCount(0)
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

  async exportOrders(): Promise<string> {
    const download = this.page.waitForEvent("download")
    await this.page.getByRole("button", { name: "Export" }).click()

    return readFile(await (await download).path(), "utf8")
  }

  async openSummaryFromRow(email: string): Promise<Page> {
    await this.orderRow(email).getByRole("button").last().click()

    return this.openSummaryTab(this.page.getByRole("menuitem", { name: "Print order summary" }))
  }

  async openSummary(): Promise<Page> {
    return this.openSummaryTab(this.page.getByRole("main").getByRole("link", { name: "Print summary" }))
  }

  orderRow(email: string): Locator {
    return this.page.getByRole("row").filter({ hasText: email }).first()
  }

  action(name: string): Locator {
    return this.page.getByRole("main").getByRole("button", { exact: true, name })
  }

  private async openSummaryTab(opener: Locator): Promise<Page> {
    const tab = this.page.context().waitForEvent("page")
    await opener.click()
    const summary = await tab
    await summary.waitForURL(/\/en-US\/admin\/orders\/[\w-]+\/summary$/u)
    await new BasePage(summary).waitForAppReady()

    return summary
  }
}
