import { type APIRequestContext } from "@playwright/test"

import { COURIER, IN_STORE_PICKUP, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { type CheckoutSession, completeCheckoutSession, expireCheckoutSession, waitForOpenCheckoutSession } from "../fixtures/stripe"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { type CheckoutPage } from "../pages/checkout-page"

const reachPayment = async (checkoutPage: CheckoutPage, request: APIRequestContext, email: string): Promise<CheckoutSession> => {
  await checkoutPage.gotoCheckout()
  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
  await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s398\.99/u)

  return waitForOpenCheckoutSession(request, email)
}

const switchToInStorePickup = async (checkoutPage: CheckoutPage): Promise<void> => {
  await checkoutPage.editStep("Delivery Method")
  await checkoutPage.chooseDelivery(IN_STORE_PICKUP.name)
  await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s379\.00/u)
}

test.describe("guest checkout", () => {
  test.beforeEach(async ({ cartPage, productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await expect(cartPage.cartLink()).toContainText("1")
  })

  test("a guest pays for a necklace and receives the order confirmation", async ({ cartPage, checkoutPage, page, request }, testInfo) => {
    const email = uniqueEmail(testInfo, "guest")
    await checkoutPage.gotoCheckout()

    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s398\.99/u)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_899)
    expect(session.return_url).toBe("http://127.0.0.1:3000/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}")
    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)

    await completeCheckoutSession(request, session.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)

    await expect(page.getByRole("heading", { name: "Order Confirmed" })).toBeVisible()
    await expect(page.getByRole("main")).toContainText(`If the confirmation email has not reached ${email} within a few minutes`)
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s398\.99/u)
    await expect(page.getByRole("main")).toContainText(`${SHIPPING_ADDRESS.postalCode} ${SHIPPING_ADDRESS.city}`)
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain(PRODUCTS.lapis.title)
    expect(linkIn(confirmation, /\/products\//u).origin).toBe("http://127.0.0.1:3000")
    expect(linkIn(confirmation, /\/auth\/sign-up/u).origin).toBe("http://127.0.0.1:3000")

    await cartPage.gotoCart()
    await expect(cartPage.heading()).toHaveText("Your cart is empty")
  })

  test("a guest who switches delivery on the payment step pays the replacement session and gets the order", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "edited")
    const first = await reachPayment(checkoutPage, request, email)

    await switchToInStorePickup(checkoutPage)
    const replacement = await waitForOpenCheckoutSession(request, email, first)

    expect(replacement.metadata["checkoutId"]).toBe(first.metadata["checkoutId"])
    expect(replacement.amount_total).toBe(37_900)
    await expireCheckoutSession(request, first.id)
    await completeCheckoutSession(request, replacement.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${replacement.id}`)
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s379\.00/u)
  })

  test("a guest whose payment session expired gets a fresh checkout and still receives the order", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "expired")
    const expired = await reachPayment(checkoutPage, request, email)
    await expireCheckoutSession(request, expired.id)

    await switchToInStorePickup(checkoutPage)
    const fresh = await waitForOpenCheckoutSession(request, email, expired)

    expect(fresh.metadata["checkoutId"]).not.toBe(expired.metadata["checkoutId"])
    expect(fresh.amount_total).toBe(37_900)
    await completeCheckoutSession(request, fresh.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${fresh.id}`)
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s379\.00/u)
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain(PRODUCTS.lapis.title)
  })

  test("the address step refuses a postal code that is not Polish", async ({ checkoutPage, page }, testInfo) => {
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "postal"), SHIPPING_ADDRESS.phone)

    await checkoutPage.fillAddress({ ...SHIPPING_ADDRESS, postalCode: "12345" })

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=2$/u)
    await expect(checkoutPage.field("Postal Code *")).toHaveAttribute("aria-invalid", "true")
  })
})
