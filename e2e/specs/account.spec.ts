import { PRODUCTS } from "../data/catalog"
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
