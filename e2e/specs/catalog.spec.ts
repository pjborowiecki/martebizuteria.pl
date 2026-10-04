import { CATEGORIES, PRODUCTS } from "../data/catalog"
import { SERVER_FUNCTIONS, recordServerFunctionCalls } from "../fixtures/server-functions"
import { expect, muteRealtime, test } from "../fixtures/test"

const NECKLACES_PATH = `/en-US/categories/${CATEGORIES.necklaces.handle}`

test.describe("catalog", () => {
  test("filtering by category narrows the listing and clearing it brings everything back", async ({ page, productPage }) => {
    await productPage.open("/en-US/products")
    const filters = page.getByRole("complementary")
    const productLinks = page.getByRole("main").getByRole("link", { name: /Necklace/u })
    await expect(productLinks).toHaveCount(2)

    await filters.getByRole("button", { exact: true, name: "Earrings" }).click()
    await expect(productLinks).toHaveCount(0)

    await filters.getByRole("button", { exact: true, name: "All categories" }).click()
    await expect(productLinks).toHaveCount(2)
  })

  test("sorting a category asks the server for the products alone, because the page already holds the category", async ({
    context,
    page,
    productPage,
  }) => {
    await muteRealtime(context)
    await productPage.open(NECKLACES_PATH)
    await expect(productPage.heading()).toHaveText(CATEGORIES.necklaces.title)
    const serverFunctionCallsFrom = recordServerFunctionCalls(page)
    const productsPage = page.waitForResponse((response) => response.url().includes(SERVER_FUNCTIONS.getStorefrontProductsPage))

    await page.getByRole("complementary").getByRole("button", { exact: true, name: "Price: low to high" }).click()
    await productsPage

    await expect(page).toHaveURL(`${NECKLACES_PATH}?sort=price_asc`)
    expect(await serverFunctionCallsFrom(NECKLACES_PATH)).toStrictEqual([SERVER_FUNCTIONS.getStorefrontProductsPage])
  })

  test("search finds a necklace by name and opens it", async ({ page, productPage }) => {
    await productPage.open("/en-US")
    await page.getByRole("banner").getByRole("button", { name: "Search" }).click()
    const search = page.getByRole("dialog", { name: "Search" })

    await search.getByRole("searchbox").fill("onyx")

    await expect(search.getByRole("status")).toHaveText("1 result")
    await search.getByRole("link", { name: new RegExp(PRODUCTS.onyx.title, "u") }).click()
    await expect(page).toHaveURL(`/en-US/products/${PRODUCTS.onyx.handle}`)
    await expect(productPage.heading()).toHaveText(PRODUCTS.onyx.title)
  })

  test("a product page shows what the piece costs and adds it to the cart", async ({ productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)

    await expect(productPage.heading()).toHaveText(PRODUCTS.lapis.title)
    await expect(productPage.details()).toContainText(`SKU: ${PRODUCTS.lapis.sku}`)
    await expect(productPage.details()).toContainText(PRODUCTS.lapis.price)

    await productPage.addToCart()
    await expect(productPage.cartLink()).toContainText("1")
  })
})
