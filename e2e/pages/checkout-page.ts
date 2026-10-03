import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

interface ShippingAddress {
  readonly address1: string
  readonly city: string
  readonly firstName: string
  readonly lastName: string
  readonly postalCode: string
}

export class CheckoutPage extends BasePage {
  async gotoCheckout(): Promise<void> {
    await this.open("/en-US/checkout")
  }

  field(label: string): Locator {
    return this.page.getByRole("textbox", { exact: true, name: label })
  }

  nextButton(label: string): Locator {
    return this.page.getByRole("button", { exact: true, name: label })
  }

  summary(): Locator {
    return this.page.getByRole("complementary")
  }

  async fillContact(email: string, phone: string): Promise<void> {
    await this.field("Email *").fill(email)
    await this.field("Mobile Phone *").fill(phone)
    await this.nextButton("Address").click()
  }

  async fillAddress(address: ShippingAddress): Promise<void> {
    await this.field("First Name *").fill(address.firstName)
    await this.field("Last Name *").fill(address.lastName)
    await this.field("Address *").fill(address.address1)
    await this.field("Postal Code *").fill(address.postalCode)
    await this.field("City *").fill(address.city)
    await this.nextButton("Delivery Method").click()
  }

  async chooseDelivery(method: RegExp): Promise<void> {
    await this.page.getByRole("radio", { name: method }).check()
    await this.nextButton("Payment").click()
  }

  async applyDiscountCode(code: string): Promise<void> {
    await this.summary().getByRole("textbox", { name: "Discount code" }).fill(code)
    await this.summary().getByRole("button", { name: "Apply" }).click()
  }
}
