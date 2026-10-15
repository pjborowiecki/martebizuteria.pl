import { COURIER, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { heldCheckoutSessionId, waitForHeldCheckoutSessionId } from "../fixtures/checkout-draft"
import { registerCustomer } from "../fixtures/customers"
import { sentEmails, waitForEmail } from "../fixtures/emails"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  ORDER_CONFIRMATION_SUBJECT,
  ORDER_NUMBER,
  STRIPE_ORIGINS,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  expectOrderPaidOnSession,
  forwardCheckoutCompletion,
  openGuestPaymentStep,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

test.describe("Stripe test mode", () => {
  test.skip(!HAS_STRIPE_TEST_MODE_KEYS, STRIPE_TEST_MODE_SKIP_REASON)
  test.use({ reachableOrigins: [STRIPE_ORIGINS] })

  test("a guest pays with Stripe's test card in the real payment form and sees the order before Stripe's event arrives", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "stripe-test-mode")
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, email)

    await checkoutPage.payWithCard(STRIPE_TEST_CARD)

    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s398\.99/u)
    const confirmation = await waitForEmail(request, email, ORDER_CONFIRMATION_SUBJECT)
    expect(confirmation.html).toContain(PRODUCTS.lapis.title)
    expect(confirmation.html).toContain("Credit or debit card")
    const session = await forwardCheckoutCompletion(request, sessionId)
    expect(session.amount_total).toBe(39_899)
    expect(session.payment_status).toBe("paid")
    await checkoutPage.reload()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    expect((await sentEmails(request, email)).filter(({ subject }) => subject === ORDER_CONFIRMATION_SUBJECT)).toHaveLength(1)
  })

  test("a signed-in shopper who types another e-mail at checkout is billed, recorded at Stripe and confirmed under that e-mail", async ({
    authPage,
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const customer = await registerCustomer({ authPage, page, request }, testInfo)
    const orderEmail = uniqueEmail(testInfo, "stripe-order-email")
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(customer.email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)
    await expect(checkoutPage.paymentStep()).toBeVisible()
    const accountEmailSessionId = await waitForHeldCheckoutSessionId(page)

    await checkoutPage.editStep("Contact Details")
    await checkoutPage.fillContact(orderEmail, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)
    await expect.poll(() => heldCheckoutSessionId(page)).not.toBe(accountEmailSessionId)
    const sessionId = await waitForHeldCheckoutSessionId(page)
    await checkoutPage.payWithCard(STRIPE_TEST_CARD)

    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    await expect(page.getByRole("main")).toContainText(`If the confirmation email has not reached ${orderEmail} within a few minutes`)
    await waitForEmail(request, orderEmail, ORDER_CONFIRMATION_SUBJECT)
    const session = await forwardCheckoutCompletion(request, sessionId)
    expect(session.customer).not.toBeNull()
    expect(session.customer_details?.email).toBe(orderEmail)
    expect((await sentEmails(request, customer.email)).map(({ subject }) => subject)).not.toContain(ORDER_CONFIRMATION_SUBJECT)
  })
})
