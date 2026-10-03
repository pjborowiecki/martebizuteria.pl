import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

export class CouponsPage extends BasePage {
  async gotoCoupons(): Promise<void> {
    await this.open("/en-US/admin/coupons")
  }

  dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Create coupon" })
  }

  async createPercentageCoupon(code: string, percentOff: number): Promise<void> {
    await this.page.getByRole("button", { name: "Create coupon" }).click()
    await this.dialog().getByRole("textbox", { name: "Code" }).fill(code)
    await this.dialog().getByRole("spinbutton", { name: "Percent off" }).fill(String(percentOff))
    await this.dialog().getByRole("button", { name: "Save coupon" }).click()
    await this.dialog().waitFor({ state: "hidden" })
  }
}
