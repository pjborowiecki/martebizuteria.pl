import { PRODUCTS } from "../data/catalog"
import { expect, test } from "../fixtures/test"

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

  test("the cart is still there after a reload", async ({ cartPage, page }) => {
    await cartPage.gotoCart()
    await page.reload()
    await cartPage.waitForAppReady()

    await expect(page.getByRole("main").getByRole("link", { name: PRODUCTS.lapis.title }).first()).toBeVisible()
    await expect(cartPage.cartLink()).toContainText("1")
  })

  test("proceeding to checkout starts with the contact details", async ({ cartPage, page }) => {
    await cartPage.gotoCart()

    await cartPage.proceedToCheckout()

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=1$/u)
    await expect(page.getByRole("textbox", { exact: true, name: "Email *" })).toBeVisible()
  })
})
