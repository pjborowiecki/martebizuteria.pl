import { type Page } from "@playwright/test"

import { PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { BasePage, CheckoutPage, ProductPage } from "../pages"

const TEST_METHOD = { carrier: "Test Carrier", english: "Test courier", polish: "Kurier testowy", price: "24.50" } as const

const DELIVERY_SETTINGS = "/en-US/admin/settings/delivery"

const methodRow = (page: Page) => page.getByRole("row").filter({ hasText: TEST_METHOD.english }).filter({ hasNotText: "Archived" })

const FREE_DELIVERY_OFF = "Every order pays for delivery"

const saveFreeDelivery = async (page: Page, status: "Not offered" | "Offered", threshold?: string): Promise<void> => {
  await page.getByRole("button", { exact: true, name: "Free delivery" }).click()
  const sheet = page.getByRole("dialog", { name: "Free delivery" })
  await sheet.getByRole("combobox", { name: "Free delivery" }).click()
  await page.getByRole("option", { exact: true, name: status }).click()
  if (threshold !== undefined) {
    await sheet.getByLabel("Free delivery from").fill(threshold)
  }
  await sheet.getByRole("button", { exact: true, name: "Save" }).click()
  await expect(new BasePage(page).notification("Free delivery saved.")).toBeVisible()
}

const archiveTestMethod = async (page: Page): Promise<void> => {
  await methodRow(page).getByRole("button", { name: `Actions for ${TEST_METHOD.english}` }).click()
  await page.getByRole("menuitem", { name: "Archive method" }).click()
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
    if ((await page.getByText(FREE_DELIVERY_OFF).count()) === 0) {
      await saveFreeDelivery(page, "Not offered")
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
    await dialog.getByRole("combobox", { name: "Carrier" }).click()
    await page.getByRole("option", { name: "New carrier" }).click()
    await dialog.getByLabel("Carrier name").fill(TEST_METHOD.carrier)
    await dialog.getByLabel("Name in Polish").fill(TEST_METHOD.polish)
    await dialog.getByLabel("Name in English").fill(TEST_METHOD.english)
    await dialog.getByLabel("Price").fill(TEST_METHOD.price)
    await dialog.getByRole("button", { name: "Add method" }).click()

    await expect(settings.notification("Delivery method added.")).toBeVisible()
    await expect(methodRow(page)).toContainText(TEST_METHOD.carrier)
    await expect(methodRow(page)).toContainText(`PLN ${TEST_METHOD.price}`)
    await expect(methodRow(page)).toContainText("Offered")

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
    await saveFreeDelivery(page, "Offered", "1")

    await expect(page.getByText("PLN 1.00", { exact: true })).toBeVisible()

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

    await saveFreeDelivery(page, "Not offered")
    await expect(page.getByText(FREE_DELIVERY_OFF)).toBeVisible()
    await shopper.close()
  })
})
