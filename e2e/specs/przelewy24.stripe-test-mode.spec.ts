import { PRODUCTS } from "../data/catalog"
import { heldCheckoutSessionId, waitForHeldCheckoutSessionId } from "../fixtures/checkout-draft"
import { sentEmails, waitForEmail } from "../fixtures/emails"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  ORDER_CONFIRMATION_SUBJECT,
  ORDER_NUMBER,
  PAYMENT_STEP_URL,
  STRIPE_ORIGINS,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  expectOrderPaidOnSession,
  forwardCheckoutCompletion,
  openGuestPaymentStep,
  retrieveCheckoutSessionPayment,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

const TEST_BANK = "mBank"

const STRIPE_TEST_PAYMENT_PAGE = /^https:\/\/payments\.stripe\.com\/payment_methods\/test_payment\?/u

const PAYMENT_NOT_COMPLETED = "Your payment was not completed. Choose a payment method to try again."

test.describe("Stripe test mode, Przelewy24", () => {
  test.skip(!HAS_STRIPE_TEST_MODE_KEYS, STRIPE_TEST_MODE_SKIP_REASON)
  test.use({ reachableOrigins: [STRIPE_ORIGINS] })

  test("a guest who authorises the Przelewy24 test payment comes back to the order and a confirmation naming Przelewy24", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "stripe-p24")
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, email)
    await checkoutPage.payWithPrzelewy24(TEST_BANK)
    await expect(page).toHaveURL(STRIPE_TEST_PAYMENT_PAGE)

    await checkoutPage.answerTestPayment("Authorize test payment")

    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    expect((await waitForEmail(request, email, ORDER_CONFIRMATION_SUBJECT)).html).toContain("Przelewy24")
    const session = await forwardCheckoutCompletion(request, sessionId)
    expect(session.amount_total).toBe(39_899)
    expect(session.payment_status).toBe("paid")
    await checkoutPage.reload()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    expect((await sentEmails(request, email)).filter(({ subject }) => subject === ORDER_CONFIRMATION_SUBJECT)).toHaveLength(1)
  })

  test("a guest who fails the Przelewy24 test payment comes back to the payment step with the basket and pays the checkout's next session by card", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "stripe-p24-fail")
    const returnedSessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, email)
    await checkoutPage.payWithPrzelewy24(TEST_BANK)
    await expect(page).toHaveURL(STRIPE_TEST_PAYMENT_PAGE)

    await checkoutPage.answerTestPayment("Fail test payment")

    await expect(page).toHaveURL(PAYMENT_STEP_URL)
    await expect(checkoutPage.notification(PAYMENT_NOT_COMPLETED)).toBeVisible()
    await expect(checkoutPage.confirmationHeading()).toBeHidden()
    await expect(checkoutPage.summary()).toContainText(PRODUCTS.lapis.title)
    await expect(checkoutPage.payButton()).toBeVisible()
    await expect.poll(() => heldCheckoutSessionId(page)).not.toBe(returnedSessionId)
    const nextSessionId = await waitForHeldCheckoutSessionId(page)
    const returned = await retrieveCheckoutSessionPayment(returnedSessionId)
    expect(returned).toMatchObject({ metadata: { checkoutId: expect.any(String) }, status: "expired" })
    const next = await retrieveCheckoutSessionPayment(nextSessionId)
    expect(next).toMatchObject({ metadata: { checkoutId: returned.metadata?.["checkoutId"] }, status: "open" })
    await checkoutPage.payWithCard(STRIPE_TEST_CARD)
    await expectOrderPaidOnSession({ checkoutPage, page }, nextSessionId)
    await waitForEmail(request, email, ORDER_CONFIRMATION_SUBJECT)
    expect((await sentEmails(request, email)).filter(({ subject }) => subject === ORDER_CONFIRMATION_SUBJECT)).toHaveLength(1)
  })
})
