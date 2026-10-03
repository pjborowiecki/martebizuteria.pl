import { type APIRequestContext, type Page } from "@playwright/test"

import { COURIER, SHIPPING_ADDRESS } from "../data/catalog"
import { CheckoutPage, ProductPage } from "../pages"
import { completeCheckoutSession, waitForOpenCheckoutSession } from "./stripe"
import { expect } from "./test"

const ORDER_NUMBER = /MRT-\d{4}-\d{5}/u

export interface PlacedOrder {
  readonly orderNumber: string
  readonly sessionId: string
}

interface PlaceOrderInput {
  readonly discountCode?: string
  readonly email: string
  readonly handle: string
  readonly page: Page
  readonly request: APIRequestContext
}

export const placeOrder = async ({ discountCode, email, handle, page, request }: PlaceOrderInput): Promise<PlacedOrder> => {
  const productPage = new ProductPage(page)
  const checkoutPage = new CheckoutPage(page)
  await productPage.gotoProduct(handle)
  await productPage.addToCart()
  await checkoutPage.gotoCheckout()
  if (discountCode !== undefined) {
    await checkoutPage.applyDiscountCode(discountCode)
    await expect(checkoutPage.summary()).toContainText(discountCode)
  }

  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
  const session = await waitForOpenCheckoutSession(request, email)
  await completeCheckoutSession(request, session.id)
  await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)
  await expect(page.getByRole("heading", { name: "Order Confirmed" })).toBeVisible()
  const orderNumber = (await page.getByRole("main").textContent())?.match(ORDER_NUMBER)?.[0]
  if (orderNumber === undefined) {
    throw new Error("The confirmation page shows no order number")
  }

  return { orderNumber, sessionId: session.id }
}
