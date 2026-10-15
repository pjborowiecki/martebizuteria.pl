import { type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test"

import { ORDER_NOTIFICATION_INBOX, TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { COURIER, INVOICED_COMPANY, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { INPOST_POINTS } from "../data/inpost"
import { STORAGE_STATE } from "../data/storage-state"
import { keepCheckoutDraft, lockerCheckoutDraft } from "../fixtures/checkout-draft"
import { acceptEmailsTo, linkIn, refuseEmailsTo, sentEmails, waitForEmail } from "../fixtures/emails"
import { placeOrder } from "../fixtures/orders"
import { SERVER_FUNCTIONS, waitForServerFunctionResponse } from "../fixtures/server-functions"
import {
  type CheckoutSession,
  completeCheckoutSession,
  disputeCheckoutPayment,
  expireCheckoutSession,
  waitForOpenCheckoutSession,
} from "../fixtures/stripe"
import { clientAddressFor, expect, isolateNetwork, muteRealtime, test } from "../fixtures/test"
import { uniqueCode, uniqueEmail } from "../fixtures/unique"
import { AdminOrderPage, BasePage, CheckoutPage, ProductPage } from "../pages"

const QUERY_INVALIDATION_CHANNEL = "marte-query-invalidation"

const INPOST_TRACKING_NUMBER = /6026772171316303\d{8}/u

const ORDER_EMAIL_RETRIES_SETTLED_MS = 30_000

const CONFIRMATION_SUBJECT = "Order confirmation — M'Arte"

interface DiscountAttempt {
  readonly code: string
  readonly summaryShows: string
}

interface GuestOrderInput {
  readonly browser: Browser
  readonly discount?: DiscountAttempt
  readonly handle: string
  readonly label: string
  readonly request: APIRequestContext
  readonly testInfo: TestInfo
}

const placeGuestOrder = async ({ browser, handle, label, request, testInfo }: GuestOrderInput): Promise<string> => {
  const shopper = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, label) },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(shopper)
  const email = uniqueEmail(testInfo, label)
  await placeOrder({ email, handle, page: await shopper.newPage(), request })
  await shopper.close()

  return email
}

const RESERVED_IN_CHECKOUT =
  "A customer is paying for one of these products right now, so it cannot be deleted. Archive the product to take it off sale, and delete it only once that payment has finished or expired."

const SLUG_TAKEN =
  "This URL slug is already used by another product. If it is not in the list, click Create product again — the previous attempt may have been rolled back."

const CODE_HELD_BY_OTHER_CHECKOUTS = "That code is reserved for orders awaiting payment. Try again later."

const LOCKER_UNCONFIRMED =
  "InPost could not be reached to confirm this parcel locker when the order was placed. Check that it exists before you send the parcel."

const LOCKER_ADDRESS_MISSING = "This order did not keep the locker's address. Look it up by its code in InPost's parcel manager."

const DISPUTE_BLOCKS_CANCEL =
  "This order has an open dispute. Cancelling would refund its payment, which the dispute now decides, so the order cannot be cancelled until the dispute closes."

const openGuestPayment = async ({ browser, discount, handle, label, request, testInfo }: GuestOrderInput): Promise<CheckoutSession> => {
  const shopper = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, label) },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(shopper)
  const shopperPage = await shopper.newPage()
  const productPage = new ProductPage(shopperPage)
  const checkoutPage = new CheckoutPage(shopperPage)
  const email = uniqueEmail(testInfo, label)
  await productPage.gotoProduct(handle)
  await productPage.addToCart()
  await checkoutPage.gotoCheckout()
  if (discount !== undefined) {
    await checkoutPage.applyDiscountCode(discount.code)
    await expect(checkoutPage.summary()).toContainText(discount.summaryShows)
  }

  await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
  await checkoutPage.fillAddress(SHIPPING_ADDRESS)
  await checkoutPage.chooseDelivery(COURIER.name)
  const session = await waitForOpenCheckoutSession(request, email)
  await expect(checkoutPage.paymentStep()).toBeVisible()
  await shopper.close()

  return session
}

const listenForInvalidationEchoes = (channelName: string): void => {
  const echoes: unknown[] = []
  Reflect.set(globalThis, "invalidationEchoes", echoes)
  new BroadcastChannel(channelName).addEventListener("message", ({ data }: MessageEvent<unknown>) => {
    echoes.push(data)
  })
}

const invalidationEchoes = (page: Page): Promise<unknown> => page.evaluate(() => Reflect.get(globalThis, "invalidationEchoes"))

test.describe("admin access", () => {
  test.use({ storageState: STORAGE_STATE.customer })

  test("a customer who opens the admin is sent to their own account", async ({ page }) => {
    await page.goto("/en-US/admin")

    await expect(page).toHaveURL(/\/en-US\/account\/overview$/u)
  })
})

test.describe("admin two-factor authentication", () => {
  test("an admin without two-factor authentication is sent to set it up instead of the admin panel", async ({ authPage, page }) => {
    await authPage.signIn(TEST_ACCOUNTS.adminWithoutTwoFactor.email, TEST_PASSWORD)

    await expect(page).toHaveURL(/\/en-US\/admin\/security$/u)
    await expect(page.getByRole("heading", { level: 1, name: "Sign-in security" })).toBeVisible()
    await expect(page.getByRole("button", { exact: true, name: "Enable" })).toBeVisible()
    await authPage.open("/en-US/admin/orders")
    await expect(page).toHaveURL(/\/en-US\/admin\/security$/u)
  })
})

test.describe("admin", () => {
  test.use({ storageState: STORAGE_STATE.admin })

  test("a coupon created in the admin takes 10% off a guest's order", async ({ browser, couponsPage, page, request }, testInfo) => {
    const code = uniqueCode("E2E")
    await couponsPage.gotoCoupons()
    await couponsPage.createPercentageCoupon(code, 10)
    const couponRow = page.getByRole("row").filter({ hasText: code })
    await expect(couponRow).toContainText("10%")
    await expect(couponRow).toContainText("Active")

    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const shopperPage = await shopper.newPage()
    const email = uniqueEmail(testInfo, "coupon")
    await placeOrder({ discountCode: code, email, handle: PRODUCTS.lapis.handle, page: shopperPage, request })
    await expect(shopperPage.getByRole("main")).toContainText(/Total\s*PLN\s361\.09/u)
    await shopper.close()

    await couponsPage.gotoCoupons()
    await expect(page.getByRole("row").filter({ hasText: code })).toContainText("1 used")
  })

  test("a coupon's last use stays with the checkout that holds it, and is refused to others, until its session expires", async ({
    browser,
    couponsPage,
    page,
    request,
  }, testInfo) => {
    const code = uniqueCode("LAST")
    await couponsPage.gotoCoupons()
    await couponsPage.createPercentageCoupon(code, 10, 1)
    const checkoutWithCode = { browser, discount: { code, summaryShows: code }, handle: PRODUCTS.lapis.handle, request, testInfo }

    const holder = await openGuestPayment({ ...checkoutWithCode, label: "holder" })
    const latecomer = await openGuestPayment({
      ...checkoutWithCode,
      discount: { code, summaryShows: CODE_HELD_BY_OTHER_CHECKOUTS },
      label: "latecomer",
    })

    expect(holder.metadata["discountCode"]).toBe(code)
    expect(latecomer.metadata["discountCode"]).toBe("")
    expect(latecomer.amount_total - holder.amount_total).toBe(3790)

    await expireCheckoutSession(request, holder.id)
    const successor = await openGuestPayment({ ...checkoutWithCode, label: "successor" })
    expect(successor.metadata["discountCode"]).toBe(code)
    expect(successor.amount_total).toBe(holder.amount_total)

    await completeCheckoutSession(request, successor.id)
    await couponsPage.gotoCoupons()
    await expect(page.getByRole("row").filter({ hasText: code })).toContainText("1 / 1")
  })

  test("shipping an order emails the shopper the tracking number", async ({ adminOrderPage, browser, page, request }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "ship")
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()

    await adminOrderPage.gotoOrderFor(email)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
    await adminOrderPage.startFulfillment()
    await adminOrderPage.action("Mark shipped").click()
    const dialog = page.getByRole("dialog", { name: "Mark order as shipped" })
    await dialog.getByRole("textbox", { name: "Tracking number" }).fill("00259007123456789012")
    await dialog.getByRole("button", { name: "Mark shipped" }).click()

    await expect(page.getByRole("main")).toContainText("Shipped")
    const shipped = await waitForEmail(request, email, "Your order has been shipped — M'Arte")
    expect(shipped.html).toContain("00259007123456789012")
    expect(linkIn(shipped, /\/auth\/sign-up/u).origin).toBe("http://127.0.0.1:3000")
  })

  test("an InPost shipment booked from the order gives its label and its tracking number to the shipping email", async ({
    adminOrderPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "inpost")
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()

    await adminOrderPage.gotoOrderFor(email)
    await adminOrderPage.action("Create shipment").click()
    const booking = page.getByRole("dialog", { name: "Create an InPost shipment" })
    await booking.getByRole("combobox", { name: "Parcel size" }).selectOption("medium")
    await booking.getByRole("spinbutton", { name: "Weight (kg)" }).fill("0.3")
    await booking.getByRole("button", { name: "Create shipment" }).click()
    await adminOrderPage.dismissNotification("InPost shipment created")
    await expect(page.getByRole("main")).toContainText("Created")

    await adminOrderPage.action("Refresh status").click()
    await expect(page.getByRole("main")).toContainText("Ready to send")
    const trackingNumber = (await page.getByRole("main").textContent())?.match(INPOST_TRACKING_NUMBER)?.[0]
    expect(trackingNumber).toBeDefined()

    const label = page.waitForEvent("download")
    await adminOrderPage.action("Download label").click()
    expect((await label).suggestedFilename()).toBe(`${orderNumber}-inpost.pdf`)

    await adminOrderPage.startFulfillment()
    await adminOrderPage.action("Mark shipped").click()
    await page.getByRole("dialog", { name: "Mark order as shipped" }).getByRole("button", { name: "Mark shipped" }).click()

    const shipped = await waitForEmail(request, email, "Your order has been shipped — M'Arte")
    expect(shipped.html).toContain(`inpost.pl/sledzenie-przesylek?number=${String(trackingNumber)}`)
  })

  test("cancelling a paid order emails the shopper the refund it issued", async ({ adminOrderPage, browser, page, request }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "cancel")
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()

    await adminOrderPage.gotoOrderFor(email)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
    await adminOrderPage.action("Cancel order").click()
    await page.getByRole("alertdialog", { name: "Cancel this order?" }).getByRole("button", { name: "Cancel order" }).click()

    await expect(page.getByRole("main")).toContainText("Cancelled")
    const cancelled = await waitForEmail(request, email, "Your order has been cancelled — M'Arte")
    expect(cancelled.html).toContain(orderNumber)
    expect(cancelled.html).toMatch(/PLN\s398\.99/u)
    expect(linkIn(cancelled, /\/auth\/sign-up/u).origin).toBe("http://127.0.0.1:3000")
  })

  test("an open dispute keeps a paid order from being cancelled and says why, in the list and on the order", async ({
    adminOrderPage,
    browser,
    context,
    page,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "dispute")
    const { sessionId } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()
    await disputeCheckoutPayment(request, sessionId)

    await muteRealtime(context)
    await adminOrderPage.open("/en-US/admin/orders")
    const searched = waitForServerFunctionResponse(page, SERVER_FUNCTIONS.getAdminOrdersPage)
    await page.getByRole("searchbox", { name: "Search orders…" }).fill(email)
    await searched
    await expect(page.getByRole("row")).toHaveCount(2)
    await adminOrderPage.orderRow(email).getByRole("button").last().click()
    const cancelItem = page.getByRole("menuitem", { name: "Cancel order" })
    await expect(cancelItem).toBeDisabled()
    await expect(cancelItem).toHaveAccessibleDescription(DISPUTE_BLOCKS_CANCEL)
    await expect(page.getByText(DISPUTE_BLOCKS_CANCEL)).toBeVisible()

    await adminOrderPage.gotoOrderFor(email)
    const cancel = adminOrderPage.action("Cancel order")
    await expect(cancel).toBeDisabled()
    await cancel.hover()
    await expect(page.getByText(DISPUTE_BLOCKS_CANCEL)).toBeVisible()
  })

  test("refunding a shipped order returns its piece to stock only when the admin says it came back", async ({
    adminOrderPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const email = await placeGuestOrder({ browser, handle: PRODUCTS.onyx.handle, label: "refund", request, testInfo })
    await adminOrderPage.gotoOrderFor(email)
    await adminOrderPage.startFulfillment()
    await adminOrderPage.action("Mark shipped").click()
    await page.getByRole("dialog", { name: "Mark order as shipped" }).getByRole("button", { name: "Mark shipped" }).click()
    await expect(adminOrderPage.action("Mark delivered")).toBeVisible()

    await adminOrderPage.action("Refund").click()
    const confirmation = page.getByRole("alertdialog", { name: "Refund this order?" })
    const cameBack = confirmation.getByRole("checkbox", { name: "The items came back to stock" })
    await expect(cameBack).not.toBeChecked()
    await cameBack.click()
    await confirmation.getByRole("button", { name: "Refund order" }).click()

    await expect(page.getByText("Refund submitted to Stripe. The order updates once Stripe confirms it.")).toBeVisible()
    await expect(page.getByRole("main")).toContainText("Items returned to stock")
  })

  test("a confirmation Resend kept refusing reaches the shopper once when the admin resends it from the order", async ({
    adminOrderPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "resend")
    await refuseEmailsTo(request, email)
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()

    await adminOrderPage.gotoOrderFor(email)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
    const activity = page.getByRole("main")
    await expect(activity.getByText("Email failed", { exact: true })).toBeVisible({ timeout: ORDER_EMAIL_RETRIES_SETTLED_MS })
    expect(await sentEmails(request, email)).toStrictEqual([])

    await acceptEmailsTo(request, email)
    await adminOrderPage.action("Resend email").click()
    await adminOrderPage.dismissNotification("Resend took the email. The order's Activity card records it.")

    const confirmation = await waitForEmail(request, email, CONFIRMATION_SUBJECT)
    expect(confirmation.html).toContain(orderNumber)
    await expect(activity.getByText("Email resend requested", { exact: true })).toBeVisible()
    await expect(adminOrderPage.action("Resend email")).toBeHidden()
    expect((await sentEmails(request, email)).filter(({ subject }) => subject === CONFIRMATION_SUBJECT)).toHaveLength(1)
  })

  test("a guest's order emails the shop a notice whose link opens the order in the admin", async ({
    adminOrderPage,
    browser,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "notice")
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: await shopper.newPage(), request })
    await shopper.close()

    const notice = await waitForEmail(request, ORDER_NOTIFICATION_INBOX, `Nowe zamówienie ${orderNumber} — M'Arte`)
    expect(notice.html).toContain(PRODUCTS.onyx.title)
    expect(notice.html).toContain(email)
    expect(notice.html).toContain(`${SHIPPING_ADDRESS.postalCode} ${SHIPPING_ADDRESS.city}`)
    expect(notice.html).toMatch(/398,99\szł/u)
    const adminLink = linkIn(notice, /\/admin\/orders\//u)
    expect(adminLink.origin).toBe("http://127.0.0.1:3000")

    await adminOrderPage.open(adminLink.pathname)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
  })

  test("a guest withdraws through the confirmation email's link, gets the statement back and the shop sees it on the order", async ({
    adminOrderPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const shopperPage = await shopper.newPage()
    const email = uniqueEmail(testInfo, "withdraw")
    const { orderNumber } = await placeOrder({ email, handle: PRODUCTS.onyx.handle, page: shopperPage, request })
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    const withdrawalLink = linkIn(confirmation, /\/withdraw-from-contract\?/u)
    expect(withdrawalLink.searchParams.get("order")).toBe(orderNumber)

    await new BasePage(shopperPage).open(`${withdrawalLink.pathname}${withdrawalLink.search}`)
    await expect(shopperPage.getByLabel(/Order number/u)).toHaveValue(orderNumber)
    await shopperPage.getByLabel(/Email address you ordered with/u).fill(email)
    await shopperPage.getByLabel(/Your full name/u).fill("Anna Kowalska")
    await shopperPage.getByRole("button", { name: "Confirm withdrawal" }).click()
    await expect(shopperPage.getByRole("heading", { name: "Thank you for your statement" })).toBeVisible()
    await shopper.close()

    const acknowledgement = await waitForEmail(request, email, `We have received your withdrawal from order ${orderNumber} — M'Arte`)
    expect(acknowledgement.html).toContain(`I withdraw from the contract of sale for the whole of order ${orderNumber}.`)
    const notice = await waitForEmail(request, ORDER_NOTIFICATION_INBOX, `Odstąpienie od umowy — zamówienie ${orderNumber} — M'Arte`)
    expect(notice.html).toContain("Anna Kowalska")
    expect(linkIn(notice, /\/admin\/orders\//u).origin).toBe("http://127.0.0.1:3000")

    await adminOrderPage.gotoOrderFor(email)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
    const main = page.getByRole("main")
    await expect(main.getByText("Withdrawal from the contract", { exact: true })).toBeVisible()
    await expect(main.getByText("The whole order")).toBeVisible()
    await expect(main.getByText("Withdrawal from the contract received")).toBeVisible()
    await expect(main.getByText(`Anna Kowalska · ${email}`)).toBeVisible()
  })

  test("a business buyer's company and NIP reach their emails, the orders export and the admin order summary", async ({
    adminOrderPage,
    browser,
    context,
    page,
    request,
  }, testInfo) => {
    await muteRealtime(context)
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "company")
    const { orderNumber } = await placeOrder({
      company: INVOICED_COMPANY,
      email,
      handle: PRODUCTS.onyx.handle,
      page: await shopper.newPage(),
      request,
    })
    await shopper.close()

    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain("Invoice for a company")
    expect(confirmation.html).toContain(INVOICED_COMPANY.companyName)
    expect(confirmation.html).toContain(`NIP ${INVOICED_COMPANY.storedNip}`)
    const notice = await waitForEmail(request, ORDER_NOTIFICATION_INBOX, `Nowe zamówienie ${orderNumber} — M'Arte`)
    expect(notice.html).toContain("Faktura na firmę")
    expect(notice.html).toContain(INVOICED_COMPANY.companyName)
    expect(notice.html).toContain(`NIP ${INVOICED_COMPANY.storedNip}`)

    await adminOrderPage.gotoOrderFor(email)
    await expect(adminOrderPage.heading()).toHaveText(orderNumber)
    const main = page.getByRole("main")
    await expect(main.getByText("Invoice for a company")).toBeVisible()
    await expect(main.getByText(INVOICED_COMPANY.companyName)).toBeVisible()
    await expect(main.getByText(`NIP ${INVOICED_COMPANY.storedNip}`)).toBeVisible()

    const summary = await adminOrderPage.openSummary()
    await expect(new BasePage(summary).heading()).toHaveText("Order summary")
    await expect(summary.getByRole("note")).toHaveText("This document is not a VAT invoice.")
    await expect(summary.getByText(orderNumber)).toBeVisible()
    await expect(summary.getByText(INVOICED_COMPANY.companyName)).toBeVisible()
    await expect(summary.getByText(`NIP ${INVOICED_COMPANY.storedNip}`)).toBeVisible()
    await expect(summary.getByRole("row", { name: PRODUCTS.onyx.title })).toBeVisible()
    await expect(summary.getByText(/^Including VAT 23%$/u)).toBeVisible()
    await summary.close()

    await adminOrderPage.searchOrdersFor(email)
    const csv = await adminOrderPage.exportOrders()
    expect(csv.split("\n")[0]).toBe("Order number,Customer,Email,Company,NIP,Date,Items,Total,Payment,Fulfillment,Status,Delivery")
    expect(csv).toContain(`"${email}","${INVOICED_COMPANY.companyName}","${INVOICED_COMPANY.storedNip}"`)
    const summaryFromList = await adminOrderPage.openSummaryFromRow(email)
    await expect(new BasePage(summaryFromList).heading()).toHaveText("Order summary")
  })

  test("an order whose parcel locker InPost could not confirm is taken and flagged for the admin to check", async ({
    adminOrderPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const email = uniqueEmail(testInfo, "unconfirmed")
    const shopperPage = await shopper.newPage()
    const productPage = new ProductPage(shopperPage)
    await productPage.gotoProduct(PRODUCTS.onyx.handle)
    await productPage.addToCart()
    await keepCheckoutDraft(shopperPage, lockerCheckoutDraft(email, INPOST_POINTS.unanswered))
    await new CheckoutPage(shopperPage).open("/en-US/checkout?step=4")
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_399)
    await completeCheckoutSession(request, session.id)
    await shopper.close()

    await adminOrderPage.gotoOrderFor(email)
    const main = page.getByRole("main")
    await expect(main.getByText(INPOST_POINTS.unanswered, { exact: true })).toHaveCount(2)
    await expect(main.getByText(LOCKER_ADDRESS_MISSING)).toBeVisible()
    await expect(main.getByText(LOCKER_UNCONFIRMED)).toBeVisible()
    await expect(main.getByText("Locker not confirmed", { exact: true })).toBeVisible()
  })

  test("an admin back on the order list sees the order a colleague shipped while they had it open", async ({
    adminOrderPage,
    browser,
    request,
  }, testInfo) => {
    const email = await placeGuestOrder({ browser, handle: PRODUCTS.onyx.handle, label: "revisit", request, testInfo })
    await adminOrderPage.open("/en-US/admin/orders")
    await expect(adminOrderPage.orderRow(email)).toContainText("Confirmed")
    await adminOrderPage.openOrderFor(email)

    const colleague = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "colleague") },
      storageState: STORAGE_STATE.admin,
    })
    await isolateNetwork(colleague)
    const colleaguePage = await colleague.newPage()
    const colleagueOrders = new AdminOrderPage(colleaguePage)
    await colleagueOrders.gotoOrderFor(email)
    await colleagueOrders.startFulfillment()
    await colleagueOrders.action("Mark shipped").click()
    await colleaguePage.getByRole("dialog", { name: "Mark order as shipped" }).getByRole("button", { name: "Mark shipped" }).click()
    await expect(adminOrderPage.action("Mark delivered")).toBeVisible()
    await colleague.close()
    await adminOrderPage.backToOrders()

    await expect(adminOrderPage.orderRow(email)).toContainText("Shipped")
  })

  test("an admin is told to archive a necklace a shopper is paying for instead of deleting it", async ({
    browser,
    page,
    request,
  }, testInfo) => {
    const session = await openGuestPayment({ browser, handle: PRODUCTS.onyx.handle, label: "paying", request, testInfo })
    await new BasePage(page).open("/en-US/admin/catalog/products")
    const row = page.getByRole("row").filter({ hasText: PRODUCTS.onyx.sku })

    await row.getByRole("button").last().click()
    await page.getByRole("menuitem", { name: "Delete product" }).click()
    await page.getByRole("alertdialog", { name: "Delete product?" }).getByRole("button", { name: "Delete" }).click()

    await expect(page.getByText(RESERVED_IN_CHECKOUT)).toBeVisible()
    await new BasePage(page).reload()
    await expect(row).toContainText(PRODUCTS.onyx.title)
    await expireCheckoutSession(request, session.id)
  })

  test("an admin editing a necklace a shopper is paying for sees the held piece under its stock and can still save it", async ({
    browser,
    page,
    request,
  }, testInfo) => {
    const session = await openGuestPayment({ browser, handle: PRODUCTS.lapis.handle, label: "held", request, testInfo })
    await new BasePage(page).open("/en-US/admin/catalog/products")
    await page.getByRole("row").filter({ hasText: PRODUCTS.lapis.sku }).getByText(PRODUCTS.lapis.title).click()
    const editor = page.getByRole("dialog", { name: "Edit product" })

    await expect(editor.getByText(/^\d+ in checkout$/u)).toBeVisible()
    await editor.getByRole("button", { name: "Save changes" }).click()

    await expect(page.getByText("Your changes have been saved.")).toBeVisible()
    await expireCheckoutSession(request, session.id)
  })

  test("an admin with two-factor authentication finds it on the security page and goes back to the panel", async ({ page }) => {
    await new BasePage(page).open("/en-US/admin/overview")
    await page.getByRole("link", { exact: true, name: "Security" }).click()

    await expect(page).toHaveURL(/\/en-US\/admin\/security$/u)
    await expect(page.getByText(/^Two-factor authentication is on\./u)).toBeVisible()
    await page.getByRole("link", { name: "Go to the admin panel" }).click()
    await expect(page).toHaveURL(/\/en-US\/admin\/overview$/u)
  })

  test("an admin who gives a necklace another necklace's URL slug is told the slug is taken", async ({ page }) => {
    const productsPage = new BasePage(page)
    await productsPage.open("/en-US/admin/catalog/products")
    await page.getByRole("row").filter({ hasText: PRODUCTS.lapis.sku }).getByText(PRODUCTS.lapis.title).click()
    const editor = page.getByRole("dialog", { name: "Edit product" })

    await editor.getByPlaceholder("minimalist-gold-hoop").fill(PRODUCTS.onyx.handle)
    await editor.getByRole("button", { name: "Save changes" }).click()

    await expect(editor.getByRole("alert")).toHaveText(SLUG_TAKEN)
    await expect(productsPage.notification(SLUG_TAKEN)).toBeVisible()
  })

  test("two admin tabs in one browser do not echo a catalogue event to each other", async ({
    browser,
    context,
    page,
    request,
  }, testInfo) => {
    await context.addInitScript(listenForInvalidationEchoes, QUERY_INVALIDATION_CHANNEL)
    const tabs = [page, await context.newPage()] as const
    await Promise.all(tabs.map((tab) => new BasePage(tab).open("/en-US/admin/catalog/products")))
    const productListRefetches = tabs.map((tab) => waitForServerFunctionResponse(tab, SERVER_FUNCTIONS.getAdminProducts))

    await placeGuestOrder({ browser, handle: PRODUCTS.lapis.handle, label: "catalogue", request, testInfo })
    await Promise.all(productListRefetches)

    expect(await Promise.all(tabs.map((tab) => invalidationEchoes(tab)))).toStrictEqual([[], []])
  })
})
