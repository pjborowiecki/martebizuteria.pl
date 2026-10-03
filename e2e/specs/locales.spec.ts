import { PRODUCTS } from "../data/catalog"
import { expect, test } from "../fixtures/test"

test.describe("locales", () => {
  test("the store speaks Polish by default", async ({ page, productPage }) => {
    await productPage.open("/")

    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    await expect(productPage.heading()).toHaveText(/^Prawdziwa sztuka,\s*bez kompromisów$/u)
  })

  test("the same product reads in Polish without a prefix and in English under /en-US", async ({ page, productPage }) => {
    await productPage.open(`/products/${PRODUCTS.lapis.handle}`)
    await expect(page.locator("html")).toHaveAttribute("lang", "pl-PL")
    await expect(productPage.heading()).toHaveText("Naszyjnik Lapis Lazuli")

    await productPage.gotoProduct(PRODUCTS.lapis.handle)
    await expect(page.locator("html")).toHaveAttribute("lang", "en-US")
    await expect(productPage.heading()).toHaveText(PRODUCTS.lapis.title)
  })
})
