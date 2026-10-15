import { COURIER, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { heldCheckoutSessionId } from "../fixtures/checkout-draft"
import { waitForEmail } from "../fixtures/emails"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  STRIPE_ORIGINS,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  forwardCheckoutCompletion,
  retrieveCheckoutSessionPayment,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { stripeOutcomeEmail, uniqueEmail } from "../fixtures/unique"

const CONFIRMATION_URL = /\/en-US\/checkout\?(?=.*\bsuccess=true\b)(?=.*\bsession_id=cs_test_\w+)/u

const ORDER_NUMBER = /MRT-\d{4}-\d{5}/u

const SESSION_REPLACED = "This payment session is no longer active."

const BLIK_CODE = "123456"

const BLIK_CODE_REFUSED = "Your BLIK code is incorrect. Please check the code in your banking app and try again."

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

  test("a guest whose card number is incomplete cannot press pay, and pays on the same session once it is complete", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "stripe-incomplete-card"), SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)

    await checkoutPage.fillCard({ ...STRIPE_TEST_CARD, number: "4242 4242" })

    await expect(checkoutPage.payButton()).toBeDisabled()
    const sessionId = await heldCheckoutSessionId(page)
    await checkoutPage.paymentForm().locator("input[name='number']").fill(STRIPE_TEST_CARD.number)
    await checkoutPage.pay()
    await expect(page).toHaveURL(CONFIRMATION_URL)
    expect(new URL(page.url()).searchParams.get("session_id")).toBe(sessionId)
  })

  test("a guest whose BLIK code is refused sees Stripe's reason and keeps the same payment session", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(stripeOutcomeEmail(testInfo, "invalid_code"), SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)
    await checkoutPage.fillBlikCode(BLIK_CODE)
    const sessionId = await heldCheckoutSessionId(page)

    await checkoutPage.pay()

    await expect(checkoutPage.notification(BLIK_CODE_REFUSED)).toBeVisible()
    await expect(checkoutPage.notification(SESSION_REPLACED)).toHaveCount(0)
    expect(await heldCheckoutSessionId(page)).toBe(sessionId)
    await expect(checkoutPage.paymentForm().getByRole("textbox", { name: "BLIK code" })).toHaveValue("123 456")
    await expect(checkoutPage.payButton()).toBeEnabled()
    if (typeof sessionId !== "string") {
      throw new Error("The payment step holds no Checkout Session")
    }

    const session = await retrieveCheckoutSessionPayment(sessionId)
    expect(session.status).toBe("open")
    expect(session.payment_intent).toMatchObject({ last_payment_error: { decline_code: "code_invalid" }, status: "requires_payment_method" })
  })
})
