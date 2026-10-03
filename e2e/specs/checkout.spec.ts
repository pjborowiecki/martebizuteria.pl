import { COURIER, PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { waitForEmail } from "../fixtures/emails"
import { completeCheckoutSession, waitForOpenCheckoutSession } from "../fixtures/stripe"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

test.describe("guest checkout", () => {
  test.beforeEach(async ({ cartPage, productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await productPage.addToCart()
    await expect(cartPage.cartLink()).toContainText("1")
  })

  test("a guest pays for a necklace and receives the order confirmation", async ({ cartPage, checkoutPage, page, request }, testInfo) => {
    const email = uniqueEmail(testInfo, "guest")
    await checkoutPage.gotoCheckout()

    await checkoutPage.fillContact(email, SHIPPING_ADDRESS.phone)
    await checkoutPage.fillAddress(SHIPPING_ADDRESS)
    await checkoutPage.chooseDelivery(COURIER.name)

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)
    await expect(checkoutPage.summary()).toContainText(/Total\s*PLN\s398\.99/u)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_899)
    expect(session.return_url).toBe("http://127.0.0.1:3000/en-US/checkout?success=true&session_id={CHECKOUT_SESSION_ID}")
    await expect(page).toHaveURL(/\/en-US\/checkout\?step=4$/u)

    await completeCheckoutSession(request, session.id)
    await checkoutPage.open(`/en-US/checkout?success=true&session_id=${session.id}`)

    await expect(page.getByRole("heading", { name: "Order Confirmed" })).toBeVisible()
    await expect(page.getByRole("main")).toContainText(`A confirmation is on its way to ${email}`)
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
    await expect(page.getByRole("main")).toContainText(/Total\s*PLN\s398\.99/u)
    await expect(page.getByRole("main")).toContainText(`${SHIPPING_ADDRESS.postalCode} ${SHIPPING_ADDRESS.city}`)
    const confirmation = await waitForEmail(request, email, "Order confirmation — M'Arte")
    expect(confirmation.html).toContain(PRODUCTS.lapis.title)

    await cartPage.gotoCart()
    await expect(cartPage.heading()).toHaveText("Your cart is empty")
  })

  test("the address step refuses a postal code that is not Polish", async ({ checkoutPage, page }, testInfo) => {
    await checkoutPage.gotoCheckout()
    await checkoutPage.fillContact(uniqueEmail(testInfo, "postal"), SHIPPING_ADDRESS.phone)

    await checkoutPage.fillAddress({ ...SHIPPING_ADDRESS, postalCode: "12345" })

    await expect(page).toHaveURL(/\/en-US\/checkout\?step=2$/u)
    await expect(checkoutPage.field("Postal Code *")).toHaveAttribute("aria-invalid", "true")
  })
})
