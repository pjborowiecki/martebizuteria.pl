import { type Locator, expect } from "@playwright/test"

import { BasePage } from "./base-page"

export class AdminDashboardPage extends BasePage {
  async gotoDashboard(): Promise<void> {
    await this.open("/en-US/admin/overview")
  }

  salesSwitch(): Locator {
    return this.page.getByRole("switch", { name: "Pause sales" })
  }

  async setSalesPaused(paused: boolean): Promise<void> {
    if ((await this.salesSwitch().isChecked()) !== paused) {
      await this.salesSwitch().click()
    }
    await expect(this.salesSwitch()).toBeChecked({ checked: paused })
  }
}
