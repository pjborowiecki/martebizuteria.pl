import { type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test"

import { ORDER_NOTIFICATION_INBOX } from "../data/accounts"
import { COURIER, INVOICED_COMPANY, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { placeOrder } from "../fixtures/orders"
import { SERVER_FUNCTIONS, waitForServerFunctionResponse } from "../fixtures/server-functions"
import { type CheckoutSession, completeCheckoutSession, expireCheckoutSession, waitForOpenCheckoutSession } from "../fixtures/stripe"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueCode, uniqueEmail } from "../fixtures/unique"
import { AdminOrderPage, BasePage, CheckoutPage, ProductPage } from "../pages"

const QUERY_INVALIDATION_CHANNEL = "marte-query-invalidation"

interface GuestOrderInput {
  readonly browser: Browser
  readonly discountCode?: string
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

const openGuestPayment = async ({ browser, discountCode, handle, label, request, testInfo }: GuestOrderInput): Promise<CheckoutSession> => {
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
  if (discountCode !== undefined) {
    await checkoutPage.applyDiscountCode(discountCode)
    await expect(checkoutPage.summary()).toContainText(discountCode)
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

  test("a coupon's last use stays with the checkout that holds it until its session expires", async ({
    browser,
    couponsPage,
    page,
    request,
  }, testInfo) => {
    const code = uniqueCode("LAST")
    await couponsPage.gotoCoupons()
    await couponsPage.createPercentageCoupon(code, 10, 1)
    const checkoutWithCode = { browser, discountCode: code, handle: PRODUCTS.lapis.handle, request, testInfo }

    const holder = await openGuestPayment({ ...checkoutWithCode, label: "holder" })
    const latecomer = await openGuestPayment({ ...checkoutWithCode, label: "latecomer" })

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
    await adminOrderPage.action("Fulfill").click()
    await adminOrderPage.dismissNotification("Fulfillment started for this order.")
    await adminOrderPage.action("Mark shipped").click()
    const dialog = page.getByRole("dialog", { name: "Mark order as shipped" })
    await dialog.getByRole("textbox", { name: "Tracking number" }).fill("00259007123456789012")
    await dialog.getByRole("button", { name: "Mark shipped" }).click()

    await expect(page.getByRole("main")).toContainText("Shipped")
    const shipped = await waitForEmail(request, email, "Your order has been shipped — M'Arte")
    expect(shipped.html).toContain("00259007123456789012")
    expect(linkIn(shipped, /\/auth\/sign-up/u).origin).toBe("http://127.0.0.1:3000")
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

  test("a business buyer's company and NIP reach their confirmation, the shop's notice and the admin order", async ({
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
  })

  test("an admin back on the order list sees the order a colleague shipped while they had it open", async ({
    adminOrderPage,
    browser,
    request,
  }, testInfo) => {
    const email = await placeGuestOrder({ browser, handle: PRODUCTS.onyx.handle, label: "revisit", request, testInfo })
    await adminOrderPage.open("/en-US/admin/orders")
    await expect(adminOrderPage.orderRow(email)).toContainText("Unfulfilled")
    await adminOrderPage.openOrderFor(email)

    const colleague = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "colleague") },
      storageState: STORAGE_STATE.admin,
    })
    await isolateNetwork(colleague)
    const colleaguePage = await colleague.newPage()
    const colleagueOrders = new AdminOrderPage(colleaguePage)
    await colleagueOrders.gotoOrderFor(email)
    await colleagueOrders.action("Fulfill").click()
    await colleagueOrders.dismissNotification("Fulfillment started for this order.")
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
