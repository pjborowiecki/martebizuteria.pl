import { type FrameLocator, type Locator, expect } from "@playwright/test"

import { type InpostLocker } from "../data/inpost"
import { BasePage } from "./base-page"

interface ShippingAddress {
  readonly address1: string
  readonly city: string
  readonly firstName: string
  readonly lastName: string
  readonly postalCode: string
}

export interface InvoicedCompany {
  readonly companyName: string
  readonly nip: string
}

interface PaymentCard {
  readonly cvc: string
  readonly expiry: string
  readonly number: string
}

type ThreeDSecureAnswer = "Complete" | "Fail"

type TestPaymentAnswer = "Authorize test payment" | "Fail test payment"

const THREE_D_SECURE_TEST_PAGE_FRAME = "stripe-challenge-frame"

const THREE_D_SECURE_STEP_TIMEOUT_MS = 10_000

const THREE_D_SECURE_ANSWER_TIMEOUT_MS = 60_000

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

  paymentStep(): Locator {
    return this.page.getByText("Choose how you'd like to pay. All transactions are encrypted and securely processed by Stripe.")
  }

  awaitingBank(): Locator {
    return this.page.getByText("Waiting for your bank")
  }

  salesPausedHeading(): Locator {
    return this.page.getByRole("heading", { name: "Orders are paused" })
  }

  confirmationHeading(): Locator {
    return this.page.getByRole("heading", { name: "Order Confirmed" })
  }

  async fillContact(email: string, phone: string): Promise<void> {
    await this.field("Email *").fill(email)
    await this.field("Mobile Phone *").fill(phone)
    await this.nextButton("Address").click()
  }

  async fillAddress(address: ShippingAddress, company?: InvoicedCompany): Promise<void> {
    await this.field("First Name *").fill(address.firstName)
    await this.field("Last Name *").fill(address.lastName)
    await this.field("Address *").fill(address.address1)
    await this.field("Postal Code *").fill(address.postalCode)
    await this.field("City *").fill(address.city)
    if (company !== undefined) {
      await this.page.getByRole("checkbox", { name: "I want an invoice for a company" }).check()
      await this.field("Company Name *").fill(company.companyName)
      await this.field("Tax ID (NIP) *").fill(company.nip)
    }

    await this.nextButton("Delivery Method").click()
  }

  async editStep(title: string): Promise<void> {
    await this.page.getByRole("button", { name: title }).click()
  }

  async chooseDelivery(method: RegExp): Promise<void> {
    await this.page.getByRole("radio", { name: method }).check()
    await this.nextButton("Payment").click()
  }

  async chooseParcelLocker(locker: InpostLocker): Promise<void> {
    await this.page.getByRole("radio", { name: /^Parcel Locker/u }).check()
    await this.page.getByRole("button", { name: "Select Parcel Locker" }).click()
    const picker = this.page.getByRole("dialog", { name: "Parcel Locker" })
    await picker.getByPlaceholder("Enter city name...").fill(locker.address_details.city)
    await picker.getByRole("button", { exact: true, name: locker.name }).click()
    await picker.waitFor({ state: "hidden" })
    await this.nextButton("Payment").click()
  }

  paymentForm(): FrameLocator {
    return this.page.locator("iframe[title='Secure payment input frame'][src*='elements-inner-payment']").contentFrame()
  }

  payButton(): Locator {
    return this.page.getByRole("button", { name: /^Order & Pay/u })
  }

  async fillCard(card: PaymentCard): Promise<void> {
    const paymentForm = this.paymentForm()
    await paymentForm.getByRole("button", { exact: true, name: "Card" }).click()
    await paymentForm.locator("input[name='number']").fill(card.number)
    await paymentForm.locator("input[name='expiry']").fill(card.expiry)
    await paymentForm.locator("input[name='cvc']").fill(card.cvc)
  }

  async fillBlikCode(code: string): Promise<void> {
    const paymentForm = this.paymentForm()
    await paymentForm.getByRole("button", { exact: true, name: "BLIK" }).click()
    await paymentForm.getByRole("textbox", { name: "BLIK code" }).fill(code)
  }

  async pay(): Promise<void> {
    const payButton = this.payButton()
    await payButton.scrollIntoViewIfNeeded()
    await expect(this.page.locator("html")).not.toHaveClass(/lenis-smooth/u)
    await payButton.click()
  }

  async payWithCard(card: PaymentCard): Promise<void> {
    await this.fillCard(card)
    await this.pay()
  }

  threeDSecureChallenge(): FrameLocator {
    return this.page.locator("iframe[src*='three-ds-2-challenge']").contentFrame()
  }

  threeDSecureTestPage(): Locator {
    return this.threeDSecureChallenge().locator(`iframe[name='${THREE_D_SECURE_TEST_PAGE_FRAME}']`)
  }

  async answerThreeDSecure(answer: ThreeDSecureAnswer): Promise<void> {
    await this.pressInThreeDSecure(this.threeDSecureTestPage().contentFrame().getByRole("button", { exact: true, name: answer }))
  }

  async cancelThreeDSecure(): Promise<void> {
    await this.threeDSecureTestPage().contentFrame().getByRole("button", { exact: true, name: "Complete" }).waitFor()
    await this.pressInThreeDSecure(this.threeDSecureChallenge().getByRole("button", { name: "Cancel" }))
  }

  private async pressInThreeDSecure(button: Locator): Promise<void> {
    await expect(async () => {
      await this.threeDSecureTestPage().click({ timeout: THREE_D_SECURE_STEP_TIMEOUT_MS, trial: true })
      await button.click({ timeout: THREE_D_SECURE_STEP_TIMEOUT_MS })
      await expect(button).toBeHidden({ timeout: THREE_D_SECURE_STEP_TIMEOUT_MS })
    }).toPass({ timeout: THREE_D_SECURE_ANSWER_TIMEOUT_MS })
  }

  async payWithPrzelewy24(bank: string): Promise<void> {
    const paymentForm = this.paymentForm()
    await paymentForm.getByRole("button", { exact: true, name: "Przelewy24" }).click()
    await paymentForm.getByRole("combobox", { name: "Select bank" }).selectOption({ label: bank })
    await this.pay()
  }

  async answerTestPayment(answer: TestPaymentAnswer): Promise<void> {
    await this.page.getByRole("link", { name: answer }).click()
  }

  async applyDiscountCode(code: string): Promise<void> {
    await this.summary().getByRole("textbox", { name: "Discount code" }).fill(code)
    await this.summary().getByRole("button", { name: "Apply" }).click()
  }
}
