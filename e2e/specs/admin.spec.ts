import { PRODUCTS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { placeOrder } from "../fixtures/orders"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueCode, uniqueEmail } from "../fixtures/unique"

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
})
