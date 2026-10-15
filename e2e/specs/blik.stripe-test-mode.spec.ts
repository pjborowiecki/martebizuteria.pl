import { sentEmails, waitForEmail } from "../fixtures/emails"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  ORDER_CONFIRMATION_SUBJECT,
  ORDER_NUMBER,
  STRIPE_ORIGINS,
  STRIPE_TEST_BLIK_CODE,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  expectOrderPaidOnSession,
  expectPaymentRefusedOnSession,
  forwardCheckoutCompletion,
  openGuestPaymentStep,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { stripeOutcomeEmail, uniqueEmail } from "../fixtures/unique"

const BLIK_CODE_REFUSED = "Your BLIK code is incorrect. Please check the code in your banking app and try again."

const BLIK_DECLINED = "Your payment method was declined by the payment method provider."

const BLIK_TIMED_OUT = "The payment failed due to a timeout."

const NEW_BLIK_CODE = "Generate a new BLIK code in your banking app and enter it to try again."

test.describe("Stripe test mode, BLIK", () => {
  test.skip(!HAS_STRIPE_TEST_MODE_KEYS, STRIPE_TEST_MODE_SKIP_REASON)
  test.use({ reachableOrigins: [STRIPE_ORIGINS] })

  test("a guest who pays with a BLIK code the sandbox approves gets the order and a confirmation naming BLIK", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "stripe-blik")
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, email)
    await checkoutPage.fillBlikCode(STRIPE_TEST_BLIK_CODE)

    await checkoutPage.pay()

    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s398\.99/u)
    expect((await waitForEmail(request, email, ORDER_CONFIRMATION_SUBJECT)).html).toContain("BLIK")
    const session = await forwardCheckoutCompletion(request, sessionId)
    expect(session.amount_total).toBe(39_899)
    expect(session.payment_status).toBe("paid")
    await checkoutPage.reload()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    expect((await sentEmails(request, email)).filter(({ subject }) => subject === ORDER_CONFIRMATION_SUBJECT)).toHaveLength(1)
  })

  test("a guest whose BLIK code is refused sees Stripe's reason at once and keeps the same payment session and code", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, stripeOutcomeEmail(testInfo, "invalid_code"))
    await checkoutPage.fillBlikCode(STRIPE_TEST_BLIK_CODE)

    await checkoutPage.pay()

    await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, {
      error: { code: "payment_method_invalid_parameter", decline_code: "code_invalid" },
      message: BLIK_CODE_REFUSED,
    })
    await expect(checkoutPage.notification(NEW_BLIK_CODE)).toBeVisible()
    await expect(checkoutPage.paymentForm().getByRole("textbox", { name: "BLIK code" })).toHaveValue("123 456")
  })

  test("a guest whose bank declines the BLIK payment sees Stripe's reason and is asked for a new code, keeps the session and basket, and pays the same session by card", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, stripeOutcomeEmail(testInfo, "customer_declined"))
    await checkoutPage.fillBlikCode(STRIPE_TEST_BLIK_CODE)

    await checkoutPage.pay()

    await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, {
      error: { code: "payment_method_provider_decline", decline_code: "customer_declined" },
      message: BLIK_DECLINED,
    })
    await expect(checkoutPage.notification(NEW_BLIK_CODE)).toBeVisible()
    await checkoutPage.payWithCard(STRIPE_TEST_CARD)
    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
  })

  test("a guest who never approves BLIK in the banking app sees Stripe's reason once it times out, is asked for a new code and keeps the session and basket", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, stripeOutcomeEmail(testInfo, "customer_timeout"))
    await checkoutPage.fillBlikCode(STRIPE_TEST_BLIK_CODE)

    await checkoutPage.pay()

    await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, {
      error: { code: "payment_method_provider_timeout", decline_code: "generic_decline" },
      message: BLIK_TIMED_OUT,
    })
    await expect(checkoutPage.notification(NEW_BLIK_CODE)).toBeVisible()
  })
})
