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

const TIMEZONE_LIST_MAX_HEIGHT_PX = 320
const LIST_WHEEL_PX = 600
const BESIDE_LIST_PX = 40
const LIST_SWIPE_PX = 400

interface OpenTimezoneList {
  readonly box: Readonly<{ height: number; width: number; x: number; y: number }>
  readonly list: Locator
}

const timezoneField = (page: Page): Locator => page.getByRole("combobox", { name: "Timezone" })

const settledTimezoneList = async (page: Page): Promise<OpenTimezoneList> => {
  const list = page.locator('[data-slot="select-content"]')
  await expect(page.getByRole("option", { name: "Europe/Warsaw" })).toBeInViewport()
  await list.evaluate(async (element) => {
    await Promise.all(element.getAnimations().map((animation) => animation.finished))
  })
  const box = await list.boundingBox()
  if (box === null) {
    throw new Error("expected the timezone list to be on screen")
  }

  return { box, list }
}

const openTimezoneList = async (page: Page): Promise<OpenTimezoneList> => {
  await timezoneField(page).click()

  return settledTimezoneList(page)
}

const recordWheelsLeftToTheBrowser = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const leftToTheBrowser: boolean[] = []
    Reflect.set(globalThis, "wheelsLeftToTheBrowser", leftToTheBrowser)
    addEventListener("wheel", (event) => {
      leftToTheBrowser.push(!event.defaultPrevented)
    })
  })
}

const wheelsLeftToTheBrowser = (page: Page): Promise<unknown> => page.evaluate(() => Reflect.get(globalThis, "wheelsLeftToTheBrowser"))

const pageScroll = (page: Page): Promise<number> => page.evaluate(() => scrollY)

const listScroll = (list: Locator): Promise<number> => list.evaluate((element) => element.scrollTop)

test.describe("the timezone list on the profile page", () => {
  test.use({ storageState: STORAGE_STATE.customer })

  test("opens as a short panel on the customer's zone and scrolls on its own", async ({ accountPage, page }) => {
    await accountPage.gotoSection("profile")
    const { box, list } = await openTimezoneList(page)
    const viewportHeight = await page.evaluate(() => innerHeight)

    expect(box.height).toBeLessThanOrEqual(TIMEZONE_LIST_MAX_HEIGHT_PX)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(viewportHeight)
    expect(await list.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true)
  })

  test("the wheel scrolls the open list and leaves the page where it is", async ({ accountPage, page }) => {
    await accountPage.gotoSection("profile")
    const { box, list } = await openTimezoneList(page)
    const pageScrollAtOpen = await pageScroll(page)
    const listScrollAtOpen = await listScroll(list)
    await recordWheelsLeftToTheBrowser(page)

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, -LIST_WHEEL_PX)
    await page.mouse.move(box.x - BESIDE_LIST_PX, box.y + box.height / 2)
    await page.mouse.wheel(0, LIST_WHEEL_PX)

    await expect.poll(() => listScroll(list)).toBeLessThan(listScrollAtOpen)
    await expect.poll(() => wheelsLeftToTheBrowser(page)).toStrictEqual([true, true])
    expect(await pageScroll(page)).toBe(pageScrollAtOpen)
    await expect(page.getByRole("listbox")).toBeVisible()
  })

  test("a wheel on the field that opened the list, or on the header, leaves the page and the list where they are", async ({ accountPage, page }) => {
    await accountPage.gotoSection("profile")
    const { list } = await openTimezoneList(page)
    const pageScrollAtOpen = await pageScroll(page)
    const sideAtOpen = await list.getAttribute("data-side")
    await recordWheelsLeftToTheBrowser(page)

    await page.mouse.wheel(0, LIST_WHEEL_PX)
    await page.getByRole("banner").hover()
    await page.mouse.wheel(0, LIST_WHEEL_PX)

    await expect.poll(() => wheelsLeftToTheBrowser(page)).toStrictEqual([true, true])
    expect(await pageScroll(page)).toBe(pageScrollAtOpen)
    expect(await list.getAttribute("data-side")).toBe(sideAtOpen)
    await expect(page.getByRole("listbox")).toBeVisible()
  })

  test("the keyboard opens the list on the customer's zone and keeps the highlighted zone in view", async ({ accountPage, page }) => {
    await accountPage.gotoSection("profile")
    await timezoneField(page).focus()
    const pageScrollBeforeOpen = await pageScroll(page)

    await page.keyboard.press("Enter")
    await settledTimezoneList(page)
    await expect(page.getByRole("option", { name: "Europe/Warsaw" })).toHaveAttribute("data-highlighted")
    for (const { key, zone } of [
      { key: "Home", zone: "Africa/Abidjan" },
      { key: "End", zone: "UTC" },
      { key: "ArrowUp", zone: "Pacific/Honolulu" },
    ]) {
      await page.keyboard.press(key)
      const option = page.getByRole("option", { name: zone })
      await expect(option).toHaveAttribute("data-highlighted")
      await expect(option).toBeInViewport()
    }
    await page.keyboard.press("Escape")

    await expect(timezoneField(page)).toContainText("Europe/Warsaw")
    expect(await pageScroll(page)).toBe(pageScrollBeforeOpen)
  })
})

test.describe("the timezone list on a touch screen", () => {
  test.use({ hasTouch: true, storageState: STORAGE_STATE.customer })
  test.skip(({ browserName }) => browserName !== "chromium", "only Chromium can play a touch scroll gesture")

  test("a swipe scrolls the open list and stops at its end without moving the page", async ({ accountPage, page }) => {
    await accountPage.gotoSection("profile")
    await timezoneField(page).tap()
    const { box, list } = await settledTimezoneList(page)
    const pageScrollAtOpen = await pageScroll(page)
    const listScrollAtOpen = await listScroll(list)
    const touchscreen = await page.context().newCDPSession(page)
    const swipeUpOverList = async (): Promise<void> => {
      await touchscreen.send("Input.synthesizeScrollGesture", {
        gestureSourceType: "touch",
        x: box.x + box.width / 2,
        y: box.y + box.height / 2,
        yDistance: -LIST_SWIPE_PX,
      })
    }

    expect(box.height).toBeLessThanOrEqual(TIMEZONE_LIST_MAX_HEIGHT_PX)
    await swipeUpOverList()
    await expect.poll(() => listScroll(list)).toBeGreaterThan(listScrollAtOpen)
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    await swipeUpOverList()

    expect(await pageScroll(page)).toBe(pageScrollAtOpen)
    await expect(page.getByRole("listbox")).toBeVisible()
  })
})
