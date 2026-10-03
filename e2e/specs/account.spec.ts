import { PRODUCTS } from "../data/catalog"
import { registerCustomer } from "../fixtures/customers"
import { placeOrder } from "../fixtures/orders"
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
})
