import { PRODUCTS } from "../data/catalog"
import { expect, test } from "../fixtures/test"

const PUBLIC_PAGES = [
  { heading: "All Products", path: "/en-US/products" },
  { heading: PRODUCTS.lapis.title, path: `/en-US/products/${PRODUCTS.lapis.handle}` },
  { heading: "Your cart is empty", path: "/en-US/cart" },
  { heading: "Terms of Service", path: "/en-US/terms-of-service" },
  { heading: "Welcome back", path: "/en-US/auth/sign-in" },
  { heading: "Stay with us a little longer", path: "/en-US/auth/sign-up" },
] as const

const CONTENT_PAGES = [
  { path: "/en-US/privacy-policy", title: "Privacy policy" },
  { path: "/en-US/exchanges-and-returns", title: "Exchanges and returns" },
] as const

test.describe("smoke", () => {
  test("the home page introduces the store and links into the catalog", async ({ page, productPage }) => {
    await productPage.open("/en-US")

    await expect(productPage.heading()).toBeVisible()
    await expect(page.getByRole("banner").getByRole("link", { name: "Cart" })).toBeVisible()
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/en-US/privacy-policy")
  })

  for (const { heading, path } of PUBLIC_PAGES) {
    test(`${path} renders its page`, async ({ page, productPage }) => {
      const response = await page.goto(path)
      await productPage.waitForAppReady()

      expect(response?.status()).toBe(200)
      await expect(productPage.heading()).toHaveText(heading)
    })
  }

  for (const { path, title } of CONTENT_PAGES) {
    test(`${path} shows the published page in its main landmark`, async ({ page, productPage }) => {
      const response = await page.goto(path)
      await productPage.waitForAppReady()

      expect(response?.status()).toBe(200)
      const article = page.getByRole("main").getByRole("article")
      await expect(article.getByRole("heading", { level: 1 })).toHaveText(title)
      await expect(article.getByText(/^Last updated /u)).toBeVisible()
      await expect(article.getByRole("heading", { level: 2 }).first()).toBeVisible()
    })
  }

  test("keeps every environment but production out of search engines while serving the sitemap", async ({ request }) => {
    const robots = await request.get("/robots.txt")
    const sitemap = await request.get("/sitemap.xml")

    expect(robots.status()).toBe(200)
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n")
    expect(sitemap.status()).toBe(200)
    expect(await sitemap.text()).toContain('<xhtml:link rel="alternate" hreflang="en-US" href="http://127.0.0.1:3000/en-US"/>')
  })
})
