import { type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test"

import { PRODUCTS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { placeOrder } from "../fixtures/orders"
import { SERVER_FUNCTIONS, waitForServerFunctionResponse } from "../fixtures/server-functions"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueCode, uniqueEmail } from "../fixtures/unique"
import { AdminOrderPage, BasePage } from "../pages"

const QUERY_INVALIDATION_CHANNEL = "marte-query-invalidation"

interface GuestOrderInput {
  readonly browser: Browser
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
