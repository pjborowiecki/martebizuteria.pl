import { type Page } from "@playwright/test"

import { PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { BasePage, CheckoutPage, ProductPage } from "../pages"

const TEST_METHOD = { carrier: "Test Carrier", english: "Test courier", polish: "Kurier testowy", price: "24.50" } as const

const DELIVERY_SETTINGS = "/en-US/admin/settings/delivery"

const methodRow = (page: Page) =>
  page.locator("[data-slot=settings-row]").filter({ has: page.getByRole("button", { name: "Edit" }), hasText: TEST_METHOD.english })

const freeDeliverySwitch = (page: Page) => page.getByRole("switch", { name: "Offer free delivery" })

const turnOffFreeDelivery = async (page: Page): Promise<void> => {
  await freeDeliverySwitch(page).click()
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(new BasePage(page).notification("Free delivery saved.")).toBeVisible()
}

const archiveTestMethod = async (page: Page): Promise<void> => {
  await methodRow(page).getByRole("button", { name: "Edit" }).click()
  await page.getByRole("dialog", { name: `Edit ${TEST_METHOD.english}` }).getByRole("button", { name: "Archive" }).click()
  await page.getByRole("alertdialog", { name: `Archive ${TEST_METHOD.english}?` }).getByRole("button", { name: "Archive" }).click()
  await expect(methodRow(page)).toHaveCount(0)
}

test.describe("delivery settings", { lock: "shop-wide" }, () => {
  test.use({ storageState: STORAGE_STATE.admin })

  test.afterEach(async ({ page }) => {
    await new BasePage(page).open(DELIVERY_SETTINGS)
    if ((await methodRow(page).count()) > 0) {
      await archiveTestMethod(page)
    }
    if ((await freeDeliverySwitch(page).getAttribute("aria-checked")) === "true") {
      await turnOffFreeDelivery(page)
    }
  })

  test("an admin adds a courier method with a new carrier, a shopper picks it at its price, and archiving it takes it out of the checkout", async ({
    browser,
    page,
  }, testInfo) => {
    const settings = new BasePage(page)
    await settings.open(DELIVERY_SETTINGS)
    await page.getByRole("button", { name: "Add method" }).click()
    const dialog = page.getByRole("dialog", { name: "Add a delivery method" })
    await dialog.getByLabel("Carrier", { exact: true }).click()
    await page.getByRole("option", { name: "New carrier" }).click()
    await dialog.getByLabel("Carrier name").fill(TEST_METHOD.carrier)
    await dialog.getByLabel("Name in Polish").fill(TEST_METHOD.polish)
    await dialog.getByLabel("Name in English").fill(TEST_METHOD.english)
    await dialog.getByLabel("Price").fill(TEST_METHOD.price)
    await dialog.getByRole("button", { name: "Add method" }).click()

    await expect(settings.notification("Delivery method added.")).toBeVisible()
    await expect(methodRow(page)).toContainText(`Courier · ${TEST_METHOD.carrier}`)

    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const shopperPage = await shopper.newPage()
    const productPage = new ProductPage(shopperPage)
    const checkoutPage = new CheckoutPage(shopperPage)
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "delivery"), SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await shopperPage.getByRole("radio", { name: /^Courier/u }).check()
    const testCourier = shopperPage.getByRole("radio", { name: new RegExp(TEST_METHOD.english, "u") })
    await testCourier.check()

    await expect(checkoutPage.summary()).toContainText(`PLN ${TEST_METHOD.price}`)

    await archiveTestMethod(page)

    await expect(testCourier).toHaveCount(0)
    await shopper.close()
  })

  test("an admin offers free delivery above a threshold, and a shopper's basket that reaches it is delivered for free", async ({
    browser,
    page,
  }, testInfo) => {
    const settings = new BasePage(page)
    await settings.open(DELIVERY_SETTINGS)
    await freeDeliverySwitch(page).click()
    await page.getByLabel("Free delivery from").fill("1")
    await page.getByRole("button", { name: "Save", exact: true }).click()

    await expect(settings.notification("Free delivery saved.")).toBeVisible()

    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const shopperPage = await shopper.newPage()
    const productPage = new ProductPage(shopperPage)
    const checkoutPage = new CheckoutPage(shopperPage)
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "free-delivery"), SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    const courier = shopperPage.getByRole("radio", { name: /^Courier/u })

    await expect(courier).toHaveAccessibleName(/Free/u)

    await courier.check()
    const inpostCourier = shopperPage.getByRole("radio", { name: /InPost courier/u })
    await expect(inpostCourier).toHaveAccessibleName(/Free/u)
    await inpostCourier.check()

    await expect(checkoutPage.summary()).toContainText("Free")

    await turnOffFreeDelivery(page)
    await shopper.close()
  })
})
