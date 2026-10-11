import { COURIER, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { waitForEmail } from "../fixtures/emails"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  STRIPE_ORIGINS,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  forwardCheckoutCompletion,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

const CONFIRMATION_URL = /\/en-US\/checkout\?(?=.*\bsuccess=true\b)(?=.*\bsession_id=cs_test_\w+)/u

const ORDER_NUMBER = /MRT-\d{4}-\d{5}/u

test.describe("Stripe test mode", () => {
  test.skip(!HAS_STRIPE_TEST_MODE_KEYS, STRIPE_TEST_MODE_SKIP_REASON)
  test.use({ reachableOrigins: [STRIPE_ORIGINS] })

  test("a guest pays with Stripe's test card in the real payment form and receives the order", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "stripe-test-mode")
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)

    await checkoutPage.payWithCard(STRIPE_TEST_CARD)

    await expect(page).toHaveURL(CONFIRMATION_URL)
    const sessionId = new URL(page.url()).searchParams.get("session_id")
    if (sessionId === null) {
      throw new Error("The confirmation address names no Checkout Session")
    }

    const session = await forwardCheckoutCompletion(request, sessionId)
    expect(session.amount_total).toBe(39_899)
    expect(session.payment_status).toBe("paid")
    await checkoutPage.reload()
    await expect(checkoutPage.confirmationHeading()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s398\.99/u)
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain(PRODUCTS.lapis.title)
  })
})
