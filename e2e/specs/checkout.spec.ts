import { type APIRequestContext, type Browser, type Page, type Request, type TestInfo } from "@playwright/test"

import { COURIER, IN_STORE_PICKUP, PARCEL_LOCKER, PRODUCTS, SHIPPING_ADDRESS, WITHDRAWN_DELIVERY_METHOD } from "../data/catalog"
import { INPOST_LOCKERS, INPOST_POINTS } from "../data/inpost"
import { previewAutofill } from "../fixtures/autofill"
import { rememberPriceWhenAdded } from "../fixtures/cart"
import { keepCheckoutDraft, lockerCheckoutDraft } from "../fixtures/checkout-draft"
import { registerCustomer } from "../fixtures/customers"
import { linkIn, waitForEmail } from "../fixtures/emails"
import {
  SERVER_FUNCTIONS,
  recordServerFunctionRequests,
  rewriteNextServerFunctionRequest,
  runBeforeServerFunction,
} from "../fixtures/server-functions"
import {
  type CheckoutSession,
  type SignedStripeEvent,
  awaitBlikApproval,
  completeCheckoutSession,
  completeCheckoutSessionBeforeItsWebhook,
  declineBlikApproval,
  deliverStripeEvent,
  expireCheckoutSession,
  openCheckoutSessions,
  waitForOpenCheckoutSession,
} from "../fixtures/stripe"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { themeColour } from "../fixtures/theme"
import { uniqueEmail } from "../fixtures/unique"
import { CheckoutPage } from "../pages/checkout-page"
import { ProductPage } from "../pages/product-page"

const STRIPE_MINIMUM_SESSION_SECONDS = 1800

const ORDER_NUMBER = /MRT-\d{4}-\d{5}/u

const CHECKOUT_HOLD_SECONDS = 1920

const PRICE_WHEN_ADDED = 29_900

const PAYMENT_NOT_COMPLETED = "Your payment was not completed. Choose a payment method to try again."

const DELIVERY_METHOD_UNAVAILABLE = "The delivery method you chose is no longer available. Please choose another one."

const LOCKER_REQUIRED = "Please choose a parcel locker for this delivery method."

const LOCKER_NOT_FOUND = "InPost does not list the parcel locker you chose. Please choose another one."

const DELIVERY_STEP_URL = /\/en-US\/checkout\?step=3$/u

const TOO_MANY_OPEN_CHECKOUTS =
  "Several payments started for this email address or from your connection have not been paid yet. Finish one of them, or try again in about half an hour, once they have expired."

const OPEN_CHECKOUTS_PER_EMAIL = 3

const fillCheckoutUpToPayment = async (checkoutPage: CheckoutPage, email: string): Promise<void> => {
  await checkoutPage.gotoCheckout()
  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
  await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s398\.99/u)
}

const reachPayment = async (checkoutPage: CheckoutPage, request: APIRequestContext, email: string): Promise<CheckoutSession> => {
  await fillCheckoutUpToPayment(checkoutPage, email)

  return waitForOpenCheckoutSession(request, email)
}

const expectOnlyOpenSession = async (request: APIRequestContext, email: string, session: CheckoutSession): Promise<void> => {
  expect((await openCheckoutSessions(request, email)).map(({ id }) => id)).toStrictEqual([session.id])
}

const reachPaymentForm = async (checkoutPage: CheckoutPage, request: APIRequestContext, email: string): Promise<CheckoutSession> => {
  const session = await reachPayment(checkoutPage, request, email)
  await expect(checkoutPage.paymentStep()).toBeVisible()

  return session
}

const recordPaymentSessionRequests = (page: Page): readonly (readonly Request[])[] => [
  recordServerFunctionRequests(page, SERVER_FUNCTIONS.createCheckoutSession),
  recordServerFunctionRequests(page, SERVER_FUNCTIONS.updateCheckoutSession),
  recordServerFunctionRequests(page, SERVER_FUNCTIONS.checkCartAvailability),
]

const confirmationUrl = (session: CheckoutSession): RegExp =>
  new RegExp(`/en-US/checkout\\?(?=.*\\bsuccess=true\\b)(?=.*\\bsession_id=${session.id}\\b)`, "u")

const chooseCourierAsGuest = async (checkoutPage: CheckoutPage, email: string): Promise<void> => {
  await checkoutPage.gotoCheckout()
  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
}

interface OtherBrowser {
  readonly checkoutPage: CheckoutPage
  readonly close: () => Promise<void>
}

const checkOutInAnotherBrowser = async (browser: Browser, testInfo: TestInfo, shopper: string, email: string): Promise<OtherBrowser> => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, shopper) },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(context)
  const page = await context.newPage()
  const productPage = new ProductPage(page)
  const checkoutPage = new CheckoutPage(page)
  await productPage.gotoProduct(PRODUCTS.lapis.handle)
  await productPage.addToCart()
  await chooseCourierAsGuest(checkoutPage, email)

  return { checkoutPage, close: () => context.close() }
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
    expect(session.expires_at - session.created).toBeGreaterThan(STRIPE_MINIMUM_SESSION_SECONDS)
    expect(session.expires_at - session.created).toBeLessThanOrEqual(CHECKOUT_HOLD_SECONDS)
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

  test("a guest who picks a parcel locker on the map pays and receives the order for that locker", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "locker")
    const locker = INPOST_LOCKERS.marszalkowska
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)

    await checkoutPage.chooseParcelLocker(locker)

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    await expect(page.getByRole("main")).toContainText(`Paczkomat InPost ${locker.name}`)
    await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s393\.99/u)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_399)

    await completeCheckoutSession(request, session.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)

    await expect(checkoutPage.confirmationHeading()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(page.getByRole("main")).toContainText(/Paczkomat InPost\s*PLN\s14\.99/u)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s393\.99/u)
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain("Destination parcel locker")
    expect(confirmation.html).toContain(locker.name)
    expect(confirmation.html).toContain(`${locker.address_details.street} ${locker.address_details.building_number}`)
  })

  test("a guest whose cart remembers an older price is shown the price Stripe charges", async ({ checkoutPage, page, request }, testInfo) => {
    const email = uniqueEmail(testInfo, "repriced")
    await rememberPriceWhenAdded(page, PRICE_WHEN_ADDED)

    const session = await reachPayment(checkoutPage, request, email)

    expect(session.amount_total).toBe(39_899)
    await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s398\.99/u)
    await expect(checkoutPage.summary()).toContainText("1 x PLN 379.00")
    await expect(checkoutPage.summary().getByText("The price has changed since you added this piece to your cart.")).toBeVisible()
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

  test("a guest who reloads the payment step and comes back from the cart keeps one checkout and one open session", async ({
    cartPage,
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "returning")
    const first = await reachPayment(checkoutPage, request, email)

    await checkoutPage.reload()
    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    const afterReload = await waitForOpenCheckoutSession(request, email, first)
    expect(afterReload.metadata["checkoutId"]).toBe(first.metadata["checkoutId"])
    await expectOnlyOpenSession(request, email, afterReload)

    await cartPage.gotoCart()
    await fillCheckoutUpToPayment(checkoutPage, email)
    const afterCart = await waitForOpenCheckoutSession(request, email, afterReload)
    expect(afterCart.metadata["checkoutId"]).toBe(first.metadata["checkoutId"])
    await expectOnlyOpenSession(request, email, afterCart)

    await completeCheckoutSession(request, afterCart.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${afterCart.id}`)
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
  })

  test("a second tab continues the checkout the first tab opened instead of holding the stock twice", async ({
    checkoutPage,
    context,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "second-tab")
    const first = await reachPayment(checkoutPage, request, email)

    const secondTab = new CheckoutPage(await context.newPage())
    await fillCheckoutUpToPayment(secondTab, email)
    const continued = await waitForOpenCheckoutSession(request, email, first)

    expect(continued.metadata["checkoutId"]).toBe(first.metadata["checkoutId"])
    await expectOnlyOpenSession(request, email, continued)
  })

  test("a guest who approves the payment in the banking app comes back to the payment step without another stock check", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "banking-app")
    const availabilityChecks = recordServerFunctionRequests(page, SERVER_FUNCTIONS.checkCartAvailability)
    const session = await reachPayment(checkoutPage, request, email)
    await expect.poll(() => availabilityChecks.some((check) => check.postData()?.includes(session.id) === true)).toBe(true)
    await Promise.all(availabilityChecks.map((check) => check.response()))
    const checksBeforeLeaving = availabilityChecks.length

    await checkoutPage.leaveTab()
    await completeCheckoutSession(request, session.id)
    await checkoutPage.returnToTab()

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    expect(availabilityChecks).toHaveLength(checksBeforeLeaving)
  })

  test("a guest whose tab reloads after paying sees the order confirmation instead of a second payment form", async ({
    cartPage,
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "reloaded-after-paying")
    const session = await reachPaymentForm(checkoutPage, request, email)
    await completeCheckoutSession(request, session.id)
    const paymentSessionRequests = recordPaymentSessionRequests(page)

    await checkoutPage.reload()

    await expect(page).toHaveURL(confirmationUrl(session))
    await expect(checkoutPage.confirmationHeading()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(checkoutPage.paymentStep()).toBeHidden()
    expect(paymentSessionRequests.flat()).toHaveLength(0)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])
    await cartPage.gotoCart()
    await expect(cartPage.heading()).toHaveText("Your cart is empty")
  })

  test("a guest whose tab reloads after paying, before Stripe's webhook arrives, sees the order once it is recorded", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "reloaded-before-webhook")
    const session = await reachPaymentForm(checkoutPage, request, email)
    const paid = await completeCheckoutSessionBeforeItsWebhook(request, session.id)
    const paymentSessionRequests = recordPaymentSessionRequests(page)

    await checkoutPage.reload()
    await expect(page).toHaveURL(confirmationUrl(session))
    await deliverStripeEvent(request, paid)

    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(checkoutPage.paymentStep()).toBeHidden()
    expect(paymentSessionRequests.flat()).toHaveLength(0)
  })

  test("a second tab opened after paying shows the order confirmation instead of a payment form", async ({
    checkoutPage,
    context,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "second-tab-after-paying")
    const session = await reachPaymentForm(checkoutPage, request, email)
    await completeCheckoutSession(request, session.id)
    const secondTab = await context.newPage()
    const paymentSessionRequests = recordPaymentSessionRequests(secondTab)

    await new CheckoutPage(secondTab).gotoCheckout()

    await expect(secondTab).toHaveURL(confirmationUrl(session))
    await expect(secondTab.getByRole("main")).toContainText(ORDER_NUMBER)
    expect(paymentSessionRequests.flat()).toHaveLength(0)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])
  })

  test("a guest whose payment completes while the reloaded checkout continues it sees the order instead of a second payment form", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "paid-during-update")
    const session = await reachPaymentForm(checkoutPage, request, email)
    const paid = Promise.withResolvers<SignedStripeEvent>()
    await runBeforeServerFunction(page, SERVER_FUNCTIONS.updateCheckoutSession, async () => {
      paid.resolve(await completeCheckoutSessionBeforeItsWebhook(request, session.id))
    })
    const freshCheckouts = recordServerFunctionRequests(page, SERVER_FUNCTIONS.createCheckoutSession)

    await checkoutPage.reload()

    await expect(page).toHaveURL(confirmationUrl(session))
    await deliverStripeEvent(request, await paid.promise)
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(checkoutPage.paymentStep()).toBeHidden()
    expect(freshCheckouts).toHaveLength(0)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])
  })

  test("a guest whose tab reloads while the banking app still asks to approve BLIK keeps the payment and sees the order once the bank approves", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "blik-awaiting-approval")
    const session = await reachPaymentForm(checkoutPage, request, email)
    await awaitBlikApproval(request, session.id)
    const freshCheckouts = recordServerFunctionRequests(page, SERVER_FUNCTIONS.createCheckoutSession)

    await checkoutPage.reload()

    await expect(checkoutPage.awaitingBank()).toBeVisible()
    await expect(checkoutPage.paymentStep()).toBeHidden()
    await expectOnlyOpenSession(request, email, session)
    await checkoutPage.leaveTab()
    await completeCheckoutSession(request, session.id)
    await checkoutPage.returnToTab()

    await expect(page).toHaveURL(confirmationUrl(session))
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    expect(freshCheckouts).toHaveLength(0)
  })

  test("a guest whose bank declines the BLIK payment the reloaded tab waited for goes back to the payment step with the basket held", async ({
    checkoutPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "blik-declined")
    const session = await reachPaymentForm(checkoutPage, request, email)
    await awaitBlikApproval(request, session.id)
    await checkoutPage.reload()
    await expect(checkoutPage.awaitingBank()).toBeVisible()

    await checkoutPage.leaveTab()
    await declineBlikApproval(request, session.id)
    await checkoutPage.returnToTab()

    await expect(checkoutPage.notification(PAYMENT_NOT_COMPLETED)).toBeVisible()
    await expect(checkoutPage.paymentStep()).toBeVisible()
    await expect(checkoutPage.awaitingBank()).toBeHidden()
    const continued = await waitForOpenCheckoutSession(request, email, session)
    expect(continued.metadata["checkoutId"]).toBe(session.metadata["checkoutId"])
    await expectOnlyOpenSession(request, email, continued)
  })

  test("a guest who paid in the banking app and later checks out another basket gets a fresh checkout, not the old confirmation", async ({
    cartPage,
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "paid-and-left")
    const paidSession = await reachPaymentForm(checkoutPage, request, email)
    await completeCheckoutSession(request, paidSession.id)
    await productPage.gotoProduct(PRODUCTS.onyx.handle)
    await productPage.addToCart()

    await checkoutPage.gotoCheckout()

    await expect(checkoutPage.field("Email *")).toBeVisible()
    await expect(checkoutPage.summary()).toContainText(PRODUCTS.lapis.title)
    await expect(checkoutPage.summary()).toContainText(PRODUCTS.onyx.title)
    await expect(checkoutPage.confirmationHeading()).toBeHidden()
    await expect(page).not.toHaveURL(/success=true/u)
    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)
    const fresh = await waitForOpenCheckoutSession(request, email)
    expect(fresh.metadata["checkoutId"]).not.toBe(paidSession.metadata["checkoutId"])
    expect(fresh.amount_total).toBe(77_799)
    await cartPage.gotoCart()
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s758\.00/u)
  })

  test("a guest who reopens an old order confirmation sees the order and keeps the basket filled since", async ({
    cartPage,
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "reopened-confirmation")
    const session = await reachPaymentForm(checkoutPage, request, email)
    await completeCheckoutSession(request, session.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await productPage.gotoProduct(PRODUCTS.onyx.handle)
    await expect(cartPage.cartLink()).toContainText("0")
    await productPage.addToCart()
    await expect(cartPage.cartLink()).toContainText("1")

    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)

    await expect(checkoutPage.confirmationHeading()).toBeVisible()
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    await cartPage.gotoCart()
    await expect(page.getByRole("main")).toContainText(PRODUCTS.onyx.title)
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s379\.00/u)
  })

  test("a guest who comes back from the bank without paying returns to the payment step with the basket kept", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "abandoned-redirect")
    const session = await reachPaymentForm(checkoutPage, request, email)

    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    await expect(checkoutPage.notification(PAYMENT_NOT_COMPLETED)).toBeVisible()
    await expect(checkoutPage.confirmationHeading()).toBeHidden()
    await expect(checkoutPage.summary()).toContainText(PRODUCTS.lapis.title)
    const continued = await waitForOpenCheckoutSession(request, email, session)
    expect(continued.metadata["checkoutId"]).toBe(session.metadata["checkoutId"])
    await expectOnlyOpenSession(request, email, continued)
  })

  test("a shopper hovering an autofill suggestion after an empty first try reads it under floated labels, without the old errors or red underlines", async ({
    browserName,
    checkoutPage,
    page,
  }) => {
    test.skip(browserName !== "chromium", "Only Chromium lets a test put a field in the autofill state")
    const email = page.locator("#email")
    const phone = page.locator("#phone")
    const emailError = page.getByText("Please enter a valid email address", { exact: true })
    const phoneError = page.getByText("Phone number is required", { exact: true })
    const phoneLabel = page.locator("label[for=phone]")
    await checkoutPage.gotoCheckout()
    await checkoutPage.nextButton("Address").click()
    await expect(phoneError).toBeVisible()
    await expect(email).toBeFocused()
    await expect(page.locator("label[for=email]")).toHaveCSS("top", "0px")
    await expect(phoneLabel).toHaveCSS("top", "26px")
    await expect(email).toHaveCSS("border-bottom-color", await themeColour(page, "--destructive"))

    const preview = await previewAutofill(page, ["#email", "#phone"])

    await expect(emailError).toBeHidden()
    await expect(phoneError).toBeHidden()
    await expect(phoneLabel).toHaveCSS("top", "0px")
    await expect(email).toHaveCSS("border-bottom-color", await themeColour(page, "--foreground"))
    await expect(phone).toHaveCSS("border-bottom-color", await themeColour(page, "--border"))

    await preview.detach()

    await expect(phoneError).toBeVisible()
    await expect(phoneLabel).toHaveCSS("top", "26px")
    await expect(email).toHaveCSS("border-bottom-color", await themeColour(page, "--destructive"))
  })

  test("the address step refuses a postal code that is not Polish", async ({ checkoutPage, page }, testInfo) => {
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "postal"), SHIPPING_ADDRESS.phone)

    await checkoutPage.fillAddress({ ...SHIPPING_ADDRESS, postalCode: "12345" })

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=2$/u)
    await expect(checkoutPage.field("Postal Code *")).toHaveAttribute("aria-invalid", "true")
  })

  test("the address step refuses a company NIP whose check digit is wrong", async ({ checkoutPage, page }, testInfo) => {
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "nip"), SHIPPING_ADDRESS.phone)

    await checkoutPage.fillAddress(SHIPPING_ADDRESS, { companyName: "Pracownia Złotnicza sp. z o.o.", nip: "526-000-12-45" })

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=2$/u)
    await expect(checkoutPage.field("Tax ID (NIP) *")).toHaveAttribute("aria-invalid", "true")
    await expect(page.getByText("Please enter a valid 10-digit Polish tax ID (NIP)")).toBeVisible()
  })

  test("a guest whose saved checkout names a delivery method the shop withdrew is sent back to choose another, with nothing held", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "withdrawn-delivery")
    await keepCheckoutDraft(page, {
      ...SHIPPING_ADDRESS,
      countryCode: "PL",
      deliveryMethod: WITHDRAWN_DELIVERY_METHOD.id,
      deliveryMethodType: "courier",
      email,
      sameAsShipping: true,
    })

    await checkoutPage.open("/en-US/checkout?step=4")

    await expect(checkoutPage.notification(DELIVERY_METHOD_UNAVAILABLE)).toBeVisible()
    await expect(page).toHaveURL(DELIVERY_STEP_URL)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])

    await checkoutPage.chooseDelivery(IN_STORE_PICKUP.name)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(37_900)
  })

  test("a guest whose saved checkout names a parcel locker InPost lists pays the locker price", async ({ checkoutPage, page, request }, testInfo) => {
    const email = uniqueEmail(testInfo, "listed-locker")
    await keepCheckoutDraft(page, lockerCheckoutDraft(email, INPOST_POINTS.listed))

    await checkoutPage.open("/en-US/checkout?step=4")

    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_399)
  })

  test("a guest whose saved checkout names a parcel locker InPost does not list is sent back to choose another, with nothing held", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "unlisted-locker")
    await keepCheckoutDraft(page, lockerCheckoutDraft(email, INPOST_POINTS.unlisted))

    await checkoutPage.open("/en-US/checkout?step=4")

    await expect(checkoutPage.notification(LOCKER_NOT_FOUND)).toBeVisible()
    await expect(page).toHaveURL(DELIVERY_STEP_URL)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])

    await checkoutPage.chooseDelivery(COURIER.name)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_899)
  })

  test("a request that turns the courier into the parcel locker without a locker opens no payment", async ({
    checkoutPage,
    page,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "locker-without-locker")
    await rewriteNextServerFunctionRequest(page, SERVER_FUNCTIONS.createCheckoutSession, (body) =>
      body.replaceAll(COURIER.id, PARCEL_LOCKER.id),
    )
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)

    await checkoutPage.chooseDelivery(COURIER.name)

    await expect(checkoutPage.notification(LOCKER_REQUIRED)).toBeVisible()
    await expect(page).toHaveURL(DELIVERY_STEP_URL)
    expect(await openCheckoutSessions(request, email)).toStrictEqual([])

    await checkoutPage.chooseDelivery(COURIER.name)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_899)
  })
})

test.describe("checkout abuse limits", () => {
  test.beforeEach(async ({ cartPage, productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await expect(cartPage.cartLink()).toContainText("1")
  })

  test("a further unpaid checkout for an email that already has three open is refused and holds nothing", async ({
    browser,
    checkoutPage,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "open-checkout-cap")
    await reachPaymentForm(checkoutPage, request, email)
    for (const shopper of ["second-browser", "third-browser"]) {
      const otherBrowser = await checkOutInAnotherBrowser(browser, testInfo, shopper, email)
      await expect(otherBrowser.checkoutPage.paymentStep()).toBeVisible()
      await otherBrowser.close()
    }
    await expect.poll(async () => (await openCheckoutSessions(request, email)).length).toBe(OPEN_CHECKOUTS_PER_EMAIL)

    const refusedBrowser = await checkOutInAnotherBrowser(browser, testInfo, "fourth-browser", email)

    await expect(refusedBrowser.checkoutPage.notification(TOO_MANY_OPEN_CHECKOUTS)).toBeVisible()
    await expect(refusedBrowser.checkoutPage.paymentStep()).toBeHidden()
    expect(await openCheckoutSessions(request, email)).toHaveLength(OPEN_CHECKOUTS_PER_EMAIL)
    await refusedBrowser.close()
  })
})

test.describe("a guest who signs in during checkout", () => {
  test("pays the checkout they started as a guest and finds the order in their account", async ({
    accountPage,
    authPage,
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)
    await page.context().clearCookies()
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    const guestSession = await reachPayment(checkoutPage, request, customer.email)
    expect(guestSession.metadata["userId"]).toBe("")

    await authPage.signIn(customer.email, customer.password)
    await expect(page).toHaveURL(/\/en-US\/account\/overview$/u)
    await expect(accountPage.navigation()).toBeVisible()
    await fillCheckoutUpToPayment(checkoutPage, customer.email)
    const accountSession = await waitForOpenCheckoutSession(request, customer.email, guestSession)

    expect(accountSession.metadata["checkoutId"]).toBe(guestSession.metadata["checkoutId"])
    expect(accountSession.metadata["userId"]).not.toBe("")
    await expectOnlyOpenSession(request, customer.email, accountSession)

    await completeCheckoutSession(request, accountSession.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${accountSession.id}`)
    await expect(page.getByRole("main")).toContainText(ORDER_NUMBER)
    const orderNumber = (await page.getByRole("main").textContent())?.match(ORDER_NUMBER)?.[0]
    if (orderNumber === undefined) {
      throw new Error("The confirmation page shows no order number")
    }

    await accountPage.gotoSection("orders")
    await expect(page.getByRole("main").getByRole("button", { name: new RegExp(`^${PRODUCTS.lapis.title} ${orderNumber} `, "u") })).toBeVisible()
  })
})

test.describe("a signed-in customer paying by redirect", () => {
  test("whose bank returns them to a browser where they are not signed in sees the order, not a failed payment", async ({
    authPage,
    browser,
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    const session = await reachPayment(checkoutPage, request, customer.email)
    expect(session.metadata["userId"]).not.toBe("")
    const paid = await completeCheckoutSessionBeforeItsWebhook(request, session.id)
    const bankBrowser = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "bank-browser") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(bankBrowser)
    const returnedPage = await bankBrowser.newPage()
    const returnedTab = new CheckoutPage(returnedPage)

    await returnedTab.open(`/en-US/checkout?success=true&session_id=${session.id}`)
    await deliverStripeEvent(request, paid)

    await expect(returnedTab.confirmationHeading()).toBeVisible()
    await expect(returnedPage.getByRole("main")).toContainText(ORDER_NUMBER)
    await expect(returnedPage).toHaveURL(confirmationUrl(session))
    await expect(returnedTab.notification(PAYMENT_NOT_COMPLETED)).toBeHidden()
    await bankBrowser.close()
  })
})
