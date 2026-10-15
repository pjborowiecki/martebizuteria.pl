import { heldCheckoutSessionId } from "../fixtures/checkout-draft"
import {
  HAS_STRIPE_TEST_MODE_KEYS,
  STRIPE_DECLINED_CARDS,
  STRIPE_ORIGINS,
  STRIPE_TEST_CARD,
  STRIPE_TEST_MODE_SKIP_REASON,
  STRIPE_THREE_D_SECURE_CARD,
  expectOrderPaidOnSession,
  expectPaymentRefusedOnSession,
  openGuestPaymentStep,
  retrieveCheckoutSessionPayment,
} from "../fixtures/stripe-test-mode"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

const CARD_NUMBER_INCOMPLETE = "Your card number is incomplete."

const THREE_D_SECURE_REFUSED = "We are unable to authenticate your payment method. Please choose a different payment method and try again."

const THREE_D_SECURE_FAILED = { code: "payment_intent_authentication_failure" } as const

test.describe("Stripe test mode, cards", () => {
  test.skip(!HAS_STRIPE_TEST_MODE_KEYS, STRIPE_TEST_MODE_SKIP_REASON)
  test.use({ reachableOrigins: [STRIPE_ORIGINS] })

  for (const { card, error, message, reason } of STRIPE_DECLINED_CARDS) {
    test(`a guest whose card is declined for ${reason} sees Stripe's reason and pays the same session with another card`, async ({
      checkoutPage,
      page,
      productPage,
    }, testInfo) => {
      test.slow()
      const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-declined-card"))

      await checkoutPage.payWithCard(card)

      await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, { error, message })
      await checkoutPage.payWithCard(STRIPE_TEST_CARD)
      await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    })
  }

  test("a guest whose card number is incomplete sees Stripe's reason, cannot press pay, and pays on the same session once it is complete", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-incomplete-card"))

    await checkoutPage.fillCard({ ...STRIPE_TEST_CARD, number: "4242 4242" })

    await expect(checkoutPage.paymentForm().getByText(CARD_NUMBER_INCOMPLETE)).toBeVisible()
    await expect(checkoutPage.payButton()).toBeDisabled()
    expect(await heldCheckoutSessionId(page)).toBe(sessionId)
    await checkoutPage.paymentForm().locator("input[name='number']").fill(STRIPE_TEST_CARD.number)
    await checkoutPage.pay()
    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
  })

  test("a guest who reaches the pay button by keyboard and presses it before entering a card sees Stripe mark what is missing and pays on the same session once it is complete", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-empty-card"))
    await checkoutPage.paymentForm().getByRole("button", { exact: true, name: "Card" }).click()
    await expect(checkoutPage.payButton()).toHaveAttribute("aria-disabled", "true")

    await checkoutPage.payButton().press("Enter")

    await expect(checkoutPage.paymentForm().getByText(CARD_NUMBER_INCOMPLETE)).toBeVisible()
    expect(await heldCheckoutSessionId(page)).toBe(sessionId)
    expect(await retrieveCheckoutSessionPayment(sessionId)).toMatchObject({ payment_intent: null, status: "open" })
    await checkoutPage.payWithCard(STRIPE_TEST_CARD)
    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
  })

  test("a guest whose card asks for 3D Secure completes the challenge and gets the order", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-3ds-complete"))
    await checkoutPage.payWithCard(STRIPE_THREE_D_SECURE_CARD)

    await checkoutPage.answerThreeDSecure("Complete")

    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
    expect(await retrieveCheckoutSessionPayment(sessionId)).toMatchObject({
      payment_intent: {
        latest_charge: { payment_method_details: { card: { three_d_secure: { result: "authenticated" } } } },
        status: "succeeded",
      },
      payment_status: "paid",
    })
  })

  test("a guest who fails the 3D Secure challenge sees Stripe's reason and pays the same session with another card", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-3ds-fail"))
    await checkoutPage.payWithCard(STRIPE_THREE_D_SECURE_CARD)

    await checkoutPage.answerThreeDSecure("Fail")

    await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, {
      error: THREE_D_SECURE_FAILED,
      message: THREE_D_SECURE_REFUSED,
    })
    await checkoutPage.payWithCard(STRIPE_TEST_CARD)
    await expectOrderPaidOnSession({ checkoutPage, page }, sessionId)
  })

  test("a guest who closes the 3D Secure challenge sees Stripe's reason and keeps the session and basket", async ({
    checkoutPage,
    page,
    productPage,
  }, testInfo) => {
    test.slow()
    const sessionId = await openGuestPaymentStep({ checkoutPage, page, productPage }, uniqueEmail(testInfo, "stripe-3ds-cancel"))
    await checkoutPage.payWithCard(STRIPE_THREE_D_SECURE_CARD)

    await checkoutPage.cancelThreeDSecure()

    await expectPaymentRefusedOnSession({ checkoutPage, page }, sessionId, {
      error: THREE_D_SECURE_FAILED,
      message: THREE_D_SECURE_REFUSED,
    })
  })
})
