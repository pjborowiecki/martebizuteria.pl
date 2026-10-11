import { PRODUCTS, SHIPPING_ADDRESS } from "../data/catalog"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { completeCheckoutSession, waitForOpenCheckoutSession } from "../fixtures/stripe"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

const POLISH_TITLE = "Naszyjnik Lapis Lazuli"

const POLISH_TOTAL = /Razem\s*398,99\s*zł/u

test.describe("locales", () => {
  test("the store speaks Polish by default", async ({ page, productPage }) => {
    await productPage.open("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    await expect(productPage.heading()).toHaveText(/^Prawdziwa sztuka,\s*bez kompromisów$/u)
  })

  test("the same product reads in Polish without a prefix and in English under /en-US", async ({ page, productPage }) => {
    await productPage.open(`/products/${PRODUCTS.lapis.handle}`)
    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    await expect(productPage.heading()).toHaveText(POLISH_TITLE)

    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US")
    await expect(productPage.heading()).toHaveText(PRODUCTS.lapis.title)
  })

  test("a guest checks out in Polish without a prefix and receives the order confirmation in Polish", async ({
    checkoutPage,
    page,
    productPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "polish")
    await productPage.open(`/products/${PRODUCTS.lapis.handle}`)
    await productPage.details().getByRole("button", { name: "Dodaj do koszyka" }).click()
    await productPage.details().getByRole("button", { name: "Dodano" }).waitFor()

    await checkoutPage.open("/checkout")
    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    await checkoutPage.field("E-mail *").fill(email)
    await checkoutPage.field("Numer telefonu komórkowego *").fill(SHIPPING_ADDRESS.phone)
    await checkoutPage.nextButton("Adres").click()
    await checkoutPage.field("Imię *").fill(SHIPPING_ADDRESS.firstName)
    await checkoutPage.field("Nazwisko *").fill(SHIPPING_ADDRESS.lastName)
    await checkoutPage.field("Adres *").fill(SHIPPING_ADDRESS.address1)
    await checkoutPage.field("Kod pocztowy *").fill(SHIPPING_ADDRESS.postalCode)
    await checkoutPage.field("Miasto *").fill(SHIPPING_ADDRESS.city)
    await checkoutPage.nextButton("Sposób dostawy").click()
    await page.getByRole("radio", { name: /^Kurier/u }).check()
    await checkoutPage.nextButton("Płatność").click()

    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:3000\/checkout\?step=4$/u)
    await expect(checkoutPage.summary()).toContainText(POLISH_TOTAL)
    const session = await waitForOpenCheckoutSession(request, email)
    expect(session.amount_total).toBe(39_899)
    expect(session.metadata["locale"]).toBe("pl-PL")
    expect(session.return_url).toBe("http://127.0.0.1:3000/checkout?success=true&session_id={CHECKOUT_SESSION_ID}")

    await completeCheckoutSession(request, session.id)
    await checkoutPage.open(`/checkout?success=true&session_id=${session.id}`)

    await expect(page.getByRole("heading", { name: "Zamówienie potwierdzone" })).toBeVisible()
    await expect(page.getByRole("main")).toContainText(/MRT-\d{4}-\d{5}/u)
    await expect(page.getByRole("main")).toContainText(POLISH_TITLE)
    await expect(page.getByRole("main")).toContainText(POLISH_TOTAL)
    await expect(page.getByRole("main")).toContainText(`nie dotrze na adres ${email}`)
    const confirmation = await waitForEmail(request, email, "Potwierdzenie zamówienia — M'Arte")
    expect(confirmation.html).toContain(POLISH_TITLE)
    expect(linkIn(confirmation, /\/products\//u).href).toBe(`http://127.0.0.1:3000/products/${PRODUCTS.lapis.handle}`)
  })
})
