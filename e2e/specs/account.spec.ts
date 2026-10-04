import { type Locator, type Page } from "@playwright/test"

import { PRODUCTS } from "../data/catalog"
import { STORAGE_STATE } from "../data/storage-state"
import { registerCustomer } from "../fixtures/customers"
import { placeOrder } from "../fixtures/orders"
import { confirmCardSetupIntent, waitForCardSetupIntent } from "../fixtures/stripe"
import { expect, test } from "../fixtures/test"

test.describe("customer account", () => {
  test("a saved piece shows up in the wishlist and can be removed again", async ({ accountPage, authPage, page, productPage, request }, testInfo) => {
    await registerCustomer({ authPage, page, request }, testInfo)
    await productPage.gotoProduct(PRODUCTS.onyx.handle)

    await productPage.wishlistButton().click()
    await expect(productPage.details().getByRole("button", { name: "Remove from Wishlist" })).toBeVisible()

    await accountPage.gotoSection("wishlist")
    const savedPiece = page.getByRole("main").getByRole("listitem").filter({ hasText: PRODUCTS.onyx.title })
    await expect(savedPiece).toBeVisible()

    await savedPiece.getByRole("button", { name: "Remove" }).click()
    await expect(savedPiece).toHaveCount(0)
  })

  test("a paid order appears in the customer's order history", async ({ accountPage, authPage, page, request }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)

    const { orderNumber } = await placeOrder({ email: customer.email, handle: PRODUCTS.lapis.handle, page, request })

    await accountPage.gotoSection("orders")
    const order = page.getByRole("main").getByRole("button", { name: new RegExp(`^${PRODUCTS.lapis.title} ${orderNumber} `, "u") })
    await expect(order).toContainText(/PLN\s398\.99/u)
    await expect(order).toContainText("Processing")
  })

  test("a card added from the wallet is listed and can be removed again", async ({ accountPage, authPage, page, request }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)
    await accountPage.gotoSection("payment")
    await expect(accountPage.navigation().getByRole("link", { name: "Payment Methods" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Saved Cards (0)" })).toBeVisible()

    await page.getByRole("button", { name: "Add Card" }).click()
    const setupIntentId = await waitForCardSetupIntent(request, customer.email)
    await confirmCardSetupIntent(request, setupIntentId)
    await accountPage.reload()

    await expect(page.getByRole("heading", { name: "Saved Cards (1)" })).toBeVisible()
    await expect(page.getByText(/visa •••• 4242/iu)).toBeVisible()

    await page.getByRole("button", { name: "Remove card" }).click()
    await expect(accountPage.notification("Card removed")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Saved Cards (0)" })).toBeVisible()
  })
})

const PRESS_MS = 250
const PRESS_FROM_TOP_PX = 4
const PRESS_ABOVE_LABEL_PX = -2
const WHEEL_PX = 30

const pointBelowTopEdge = async (control: Locator, offsetPx: number): Promise<Readonly<{ x: number; y: number }>> => {
  const box = await control.boundingBox()
  if (box === null) {
    throw new Error("expected the control to be on screen")
  }

  return { x: box.x + box.width / 2, y: box.y + offsetPx }
}

const openAddressForm = async (page: Page): Promise<Readonly<{ cancel: Locator; drawer: Locator }>> => {
  await page.getByRole("button", { exact: true, name: "Add New" }).click()
  const form = page.locator("form").filter({ has: page.getByRole("button", { exact: true, name: "Save Address" }) })
  const drawer = form.locator("..")
  await expect.poll(() => drawer.evaluate((element) => element.scrollHeight - element.clientHeight)).toBe(0)

  return { cancel: form.getByRole("button", { exact: true, name: "Cancel" }), drawer }
}

const recordScrollMovedWhileHeld = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    addEventListener(
      "pointerdown",
      () => {
        const scrollAtPress = scrollY
        addEventListener(
          "pointerup",
          () => {
            Reflect.set(globalThis, "scrollMovedWhileHeld", scrollY - scrollAtPress)
          },
          { capture: true, once: true },
        )
      },
      { capture: true, once: true },
    )
  })
}

test.describe("account forms close on the first press", () => {
  test.use({ storageState: STORAGE_STATE.customer })

  test("Cancel closes the address form with one press while the page is still gliding", async ({ accountPage, page }) => {
    await accountPage.gotoSection("addresses")
    const { cancel, drawer } = await openAddressForm(page)
    await cancel.hover()
    const press = await pointBelowTopEdge(cancel, PRESS_FROM_TOP_PX)
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeGreaterThanOrEqual(WHEEL_PX)
    await recordScrollMovedWhileHeld(page)

    await page.mouse.wheel(0, WHEEL_PX)
    await page.mouse.click(press.x, press.y, { delay: PRESS_MS })

    await expect(drawer).toBeHidden()
    expect(await page.evaluate(() => Reflect.get(globalThis, "scrollMovedWhileHeld"))).toBe(0)
  })

  test("Cancel in the address form takes a press just above its label", async ({ accountPage, page }) => {
    await accountPage.gotoSection("addresses")
    const { cancel, drawer } = await openAddressForm(page)
    await cancel.hover()
    const press = await pointBelowTopEdge(cancel, PRESS_ABOVE_LABEL_PX)

    await page.mouse.click(press.x, press.y, { delay: PRESS_MS })

    await expect(drawer).toBeHidden()
  })

  for (const { dialogName, field, opener } of [
    { dialogName: "Change your password", field: "Current password", opener: "Update" },
    { dialogName: "Change your email address", field: "New email address", opener: "Change" },
  ]) {
    test(`Cancel closes "${dialogName}" with one press straight from its empty field`, async ({ accountPage, page }) => {
      await accountPage.gotoSection("profile")
      await page.getByRole("button", { exact: true, name: opener }).click()
      const dialog = page.getByRole("dialog", { name: dialogName })
      const cancel = dialog.getByRole("button", { exact: true, name: "Cancel" })
      await expect(dialog.getByLabel(field)).toBeFocused()
      await cancel.hover()
      const press = await pointBelowTopEdge(cancel, PRESS_FROM_TOP_PX)

      await page.mouse.click(press.x, press.y, { delay: PRESS_MS })

      await expect(dialog).toBeHidden()
    })
  }
})
