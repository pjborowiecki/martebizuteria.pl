import { PRODUCTS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { AccountPage, BasePage, CartPage, CheckoutPage, ProductPage } from "../pages"

const CHECKOUT_CLOSED = "Orders are paused for now, so checkout is closed. Your cart will wait here until we reopen."

test.describe("pausing sales", { lock: "shop-wide" }, () => {
  test.use({ storageState: STORAGE_STATE.admin })

  test.afterEach(async ({ adminDashboardPage }) => {
    await adminDashboardPage.gotoDashboard()
    await adminDashboardPage.setSalesPaused(false)
  })

  test("a customer sees the notice on every shop page and a closed checkout until the owner reopens sales", async ({
    adminDashboardPage,
    browser,
  }, testInfo) => {
    const customer = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "customer") },
      storageState: STORAGE_STATE.customer,
    })
    await isolateNetwork(customer)
    const customerPage = await customer.newPage()
    const shop = new BasePage(customerPage)
    const productPage = new ProductPage(customerPage)
    const accountPage = new AccountPage(customerPage)
    const cartPage = new CartPage(customerPage)
    const checkoutPage = new CheckoutPage(customerPage)
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await expect(shop.salesPausedNotice()).toHaveCount(0)

    await adminDashboardPage.gotoDashboard()
    await adminDashboardPage.setSalesPaused(true)

    await expect(shop.salesPausedNotice()).toBeVisible()
    await accountPage.gotoSection("overview")
    await expect(accountPage.navigation()).toBeVisible()
    await expect(shop.salesPausedNotice()).toBeVisible()
    await shop.open("/en-US/docs")
    await expect(shop.heading()).toHaveText("Documentation")
    await expect(shop.salesPausedNotice()).toBeVisible()
    await checkoutPage.gotoCheckout()
    await expect(checkoutPage.salesPausedHeading()).toBeVisible()
    await cartPage.gotoCart()
    await expect(shop.salesPausedNotice()).toBeVisible()
    await expect(cartPage.summary()).toContainText(CHECKOUT_CLOSED)
    await expect(cartPage.summary().getByRole("link", { name: "Proceed to Checkout" })).toHaveCount(0)

    await adminDashboardPage.setSalesPaused(false)

    await expect(shop.salesPausedNotice()).toHaveCount(0)
    await cartPage.proceedToCheckout()
    await expect(checkoutPage.field("Email *")).toBeVisible()
    await accountPage.gotoSection("overview")
    await expect(accountPage.navigation()).toBeVisible()
    await expect(shop.salesPausedNotice()).toHaveCount(0)
    await shop.open("/en-US/docs")
    await expect(shop.heading()).toHaveText("Documentation")
    await expect(shop.salesPausedNotice()).toHaveCount(0)
    await customer.close()
  })
})
