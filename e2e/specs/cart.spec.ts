import { MENU_SHOWCASE, PRODUCTS } from "../data/catalog"
import { rememberPriceWhenAdded } from "../fixtures/cart"
import { SERVER_FUNCTIONS, recordServerFunctionCalls } from "../fixtures/server-functions"
import { expect, muteRealtime, test } from "../fixtures/test"

const CART_PAGE_SERVER_FUNCTIONS = new Set<string>([SERVER_FUNCTIONS.checkCartAvailability, SERVER_FUNCTIONS.getCurrentSession])

const PRICE_WHEN_ADDED = 29_900

const PRICE_CHANGED_NOTE = "The price has changed since you added this piece to your cart."

const LINE_QUANTITY_MAX = 10

const QUANTITY_LIMIT_NOTE = "You can order up to 10 of one piece. For a larger order, please contact us."

test.describe("cart", () => {
  test.beforeEach(async ({ productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
  })

  test("changing the quantity updates the total and removing the piece empties the cart", async ({ cartPage }) => {
    await cartPage.gotoCart()
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s379\.00/u)

    await cartPage.increaseButton().click()
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s758\.00/u)
    await expect(cartPage.cartLink()).toContainText("2")

    await cartPage.decreaseButton().click()
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s379\.00/u)

    await cartPage.removeButton().click()
    await expect(cartPage.heading()).toHaveText("Your cart is empty")
    await expect(cartPage.cartLink()).toContainText("0")
  })

  test("a piece stops at the most one order may hold and the cart says how to order more", async ({ cartPage, page }) => {
    await cartPage.gotoCart()

    for (let quantity = 2; quantity <= LINE_QUANTITY_MAX; quantity += 1) {
      await cartPage.increaseButton().click()
      await expect(cartPage.cartLink()).toContainText(String(quantity))
    }

    await expect(cartPage.increaseButton()).toBeDisabled()
    await expect(page.getByRole("main").getByText(QUANTITY_LIMIT_NOTE)).toBeVisible()
    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s3,790\.00/u)
  })

  test("a piece the shop repriced after it was added shows the price it sells for now and says so", async ({ cartPage, page }) => {
    await rememberPriceWhenAdded(page, PRICE_WHEN_ADDED)

    await cartPage.gotoCart()

    await expect(cartPage.summary()).toContainText(/Total\s*PLN\s379\.00/u)
    await expect(page.getByRole("main").getByText(PRICE_CHANGED_NOTE)).toBeVisible()
    await expect(page.getByRole("main")).not.toContainText("PLN 299.00")
  })

  test("the cart is still there after a reload", async ({ cartPage, page }) => {
    await cartPage.gotoCart()
    await cartPage.reload()

    await expect(page.getByRole("main").getByRole("link", { name: PRODUCTS.lapis.title }).first()).toBeVisible()
    await expect(cartPage.cartLink()).toContainText("1")
  })

  test("a full load of the cart shows the menu collections the page brought instead of asking for them again", async ({
    cartPage,
    context,
    page,
  }) => {
    await muteRealtime(context)
    await page.setViewportSize(MENU_SHOWCASE.viewport)
    const serverFunctionCallsFrom = recordServerFunctionCalls(page)

    await cartPage.gotoCart()
    await expect(cartPage.summary().getByRole("link", { name: "Proceed to Checkout" })).toBeVisible()

    const calls = await serverFunctionCallsFrom("/en-US/cart")
    expect(calls).toContain(SERVER_FUNCTIONS.checkCartAvailability)
    expect(calls).not.toContain(SERVER_FUNCTIONS.getCollections)
    expect(calls.filter((id) => !CART_PAGE_SERVER_FUNCTIONS.has(id))).toStrictEqual([])
    await expect(cartPage.menuShowcaseImage(0)).toHaveCount(0)

    await cartPage.openMenu()
    await expect(cartPage.menuShowcaseImage(0)).toHaveAttribute("src", MENU_SHOWCASE.newArrivalsImage)
    expect(await serverFunctionCallsFrom("/en-US/cart")).not.toContain(SERVER_FUNCTIONS.getCollections)
  })

  test("proceeding to checkout starts with the contact details", async ({ cartPage, page }) => {
    await cartPage.gotoCart()

    await cartPage.proceedToCheckout()

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=1$/u)
    await expect(page.getByRole("textbox", { exact: true, name: "Email *" })).toBeVisible()
  })
})
