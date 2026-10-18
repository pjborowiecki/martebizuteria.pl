import { CATEGORIES, MENU_SHOWCASE, PRODUCTS } from "../data/catalog"
import { expect, test } from "../fixtures/test"

const PUBLIC_PAGES = [
  { heading: "All Products", path: "/en-US/products" },
  { heading: PRODUCTS.lapis.title, path: `/en-US/products/${PRODUCTS.lapis.handle}` },
  { heading: "Your cart is empty", path: "/en-US/cart" },
  { heading: "Welcome back", path: "/en-US/auth/sign-in" },
  { heading: "Stay with us a little longer", path: "/en-US/auth/sign-up" },
] as const

const PAGES_UNDER_POLICY = ["/en-US", `/en-US/products/${PRODUCTS.lapis.handle}`, "/en-US/auth/sign-in", "/en-US/docs"] as const

const ZOD_EVAL_PROBE = "eval"

interface PolicyViolation {
  readonly blockedURI: string
  readonly effectiveDirective: string
}

const recordPolicyViolations = (): void => {
  const violations: PolicyViolation[] = []
  Reflect.set(globalThis, "policyViolations", violations)
  document.addEventListener("securitypolicyviolation", ({ blockedURI, effectiveDirective }) => {
    violations.push({ blockedURI, effectiveDirective })
  })
}

const CONTENT_PAGES = [
  { path: "/en-US/privacy-policy", title: "Privacy policy" },
  { path: "/en-US/exchanges-and-returns", title: "Exchanges and returns" },
  { path: "/en-US/terms-of-service", title: "Terms of Service" },
  { path: "/en-US/faq", title: "Frequently asked questions" },
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

  test("/en-US/about tells the brand story published in Content, without a last updated date, above the seller's details", async ({
    page,
    productPage,
  }) => {
    const response = await page.goto("/en-US/about")
    await productPage.waitForAppReady()

    expect(response?.status()).toBe(200)
    const main = page.getByRole("main")
    await expect(main.getByRole("heading", { level: 1 })).toHaveText("About M'Arte")
    await expect(main.getByText("M'ARTE is jewellery made in Bochnia, in a goldsmith's workshop that has been working since 1978.")).toBeVisible()
    await expect(main.getByText(/^We also believe the best pieces come about when they can be fitted to a person\./u)).toBeVisible()
    await expect(main.getByText(/^Last updated /u)).toHaveCount(0)
    await expect(main.getByRole("region", { name: "Contact details" })).toBeVisible()
  })

  for (const path of PAGES_UNDER_POLICY) {
    test(`${path} hydrates under its content security policy without the browser refusing a script, style or request`, async ({
      page,
      productPage,
    }) => {
      await page.addInitScript(recordPolicyViolations)
      const response = await page.goto(path)
      await productPage.waitForAppReady()

      const nonce = await page.locator('meta[property="csp-nonce"]').getAttribute("content")
      const violations: PolicyViolation[] = await page.evaluate(() => Reflect.get(globalThis, "policyViolations"))

      expect(nonce).not.toBeNull()
      expect(response?.headers()["content-security-policy"]).toContain(`'nonce-${String(nonce)}'`)
      expect(violations.filter(({ blockedURI }) => blockedURI !== ZOD_EVAL_PROBE)).toStrictEqual([])
    })
  }

  test("answers pages and static files with headers that refuse framing and content sniffing, and leaves HTTPS pinning to deployments", async ({
    request,
  }) => {
    const page = await request.get("/en-US")
    const favicon = await request.get("/favicon.svg")

    expect(page.headers()["x-frame-options"]).toBe("DENY")
    expect(page.headers()["x-content-type-options"]).toBe("nosniff")
    expect(page.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(page.headers()["permissions-policy"]).toBe("camera=(), geolocation=(), microphone=()")
    expect(page.headers()["content-security-policy"]).toContain("frame-ancestors 'none'")
    expect(page.headers()["strict-transport-security"]).toBeUndefined()
    expect(favicon.headers()["x-content-type-options"]).toBe("nosniff")
    expect(favicon.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin")
  })

  test("the footer's contact link scrolls the about page to the seller's details", async ({ page, productPage }) => {
    await productPage.open("/cart")

    await page.getByRole("contentinfo").getByRole("link", { name: "Dane kontaktowe" }).click()

    await expect(page).toHaveURL(/\/about#contact$/u)
    const contact = page.getByRole("main").getByRole("region", { name: "Dane kontaktowe" })
    await expect(contact.getByRole("heading", { level: 2 })).toBeInViewport()
    await expect(contact.getByText(/\s\d{2}-\d{3}\s\S+\sPolska$/u)).toBeVisible()
    await expect(contact.getByText(/^NIP: \d{10}\sREGON: \d{9}$/u)).toBeVisible()
    await expect(contact.getByRole("link", { name: /@/u })).toHaveAttribute("href", /^mailto:\S+@\S+$/u)
    await expect(contact.getByRole("link", { name: /^\+48[\d ]+$/u })).toHaveAttribute("href", /^tel:\+48\d{9}$/u)
  })

  test("the footer's jewellery care link opens the FAQ with its care advice", async ({ page, productPage }) => {
    await productPage.open("/en-US/cart")

    await page.getByRole("contentinfo").getByRole("link", { name: "How to care for jewelry" }).click()

    await expect(page).toHaveURL(/\/en-US\/faq$/u)
    const article = page.getByRole("main").getByRole("article")
    await expect(article.getByRole("heading", { level: 2, name: "Jewellery care" })).toBeVisible()
    await expect(article.getByRole("heading", { level: 3, name: "How do I care for silver jewellery?" })).toBeVisible()
  })

  test("the blog stays hidden until it has articles", async ({ page, productPage, request }) => {
    for (const path of ["/en-US/blog", "/blog", "/blog/rytual-pielegnacji-bizuterii"]) {
      expect((await request.get(path)).status()).toBe(404)
    }
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/blog")

    await productPage.open("/en-US")

    await expect(page.getByRole("heading", { name: "Details matter" })).toHaveCount(0)
    await expect(page.locator('a[href*="/blog"]')).toHaveCount(0)
  })

  test("the menu's contact link scrolls the about page to the seller's details", async ({ page, productPage }) => {
    await page.setViewportSize(MENU_SHOWCASE.viewport)
    await productPage.open("/en-US/cart")
    await productPage.openMenu()

    await page.getByRole("link", { name: "Contact", exact: true }).click()

    await expect(page).toHaveURL(/\/en-US\/about#contact$/u)
    const contact = page.getByRole("main").getByRole("region", { name: "Contact details" })
    await expect(contact.getByRole("heading", { level: 2 })).toBeInViewport()
    await expect(contact.getByText(/^NIP \(tax identification number\): \d{10}\sREGON \(business statistics number\): \d{9}$/u)).toBeVisible()
  })

  test("a product page names the shop as the manufacturer with a postal and an email address", async ({ productPage }) => {
    await productPage.open(`/products/${PRODUCTS.lapis.handle}`)

    await productPage.details().getByRole("button", { name: "Producent" }).click()

    const manufacturer = productPage.details().getByRole("region", { name: "Producent" })
    await expect(manufacturer.getByRole("term")).toHaveText(["Nazwa i adres pocztowy", "Adres e-mail"])
    await expect(manufacturer.getByText(/\s\d{2}-\d{3}\s\S+\sPolska$/u)).toBeVisible()
    await expect(manufacturer.getByRole("link", { name: /@/u })).toHaveAttribute("href", /^mailto:\S+@\S+$/u)
  })

  test("keeps every environment but production out of search engines while serving the sitemap", async ({ request }) => {
    const robots = await request.get("/robots.txt")
    const sitemap = await request.get("/sitemap.xml")

    expect(robots.status()).toBe(200)
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n")
    expect(sitemap.status()).toBe(200)
    expect(await sitemap.text()).toContain('<xhtml:link rel="alternate" hreflang="en-US" href="http://127.0.0.1:3000/en-US"/>')
  })

  test("lists the catalogue, the About page, the legal pages, the FAQ and the withdrawal form in the sitemap in both languages and leaves the blog out", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text()

    expect(sitemap).toContain(`<loc>http://127.0.0.1:3000/products/${PRODUCTS.lapis.handle}</loc>`)
    expect(sitemap).toContain(`<loc>http://127.0.0.1:3000/en-US/products/${PRODUCTS.lapis.handle}</loc>`)
    expect(sitemap).toContain(`<loc>http://127.0.0.1:3000/en-US/categories/${CATEGORIES.necklaces.handle}</loc>`)
    expect(sitemap).toContain("<loc>http://127.0.0.1:3000/en-US/terms-of-service</loc>")
    expect(sitemap).toContain("<loc>http://127.0.0.1:3000/privacy-policy</loc>")
    expect(sitemap).toContain("<loc>http://127.0.0.1:3000/faq</loc>")
    expect(sitemap).toContain("<loc>http://127.0.0.1:3000/withdraw-from-contract</loc>")
    expect(sitemap.match(/<loc>http:\/\/127\.0\.0\.1:3000\/faq<\/loc>/gu)).toHaveLength(1)
    expect(sitemap.match(/<loc>http:\/\/127\.0\.0\.1:3000\/about<\/loc>/gu)).toHaveLength(1)
    expect(sitemap).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z<\/lastmod>/u)
    expect(sitemap).not.toContain("/blog")
  })

  test("describes a product to search engines and to social cards", async ({ page, productPage }) => {
    await productPage.gotoProduct(PRODUCTS.lapis.handle)

    const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents()

    expect(jsonLd.map((text) => JSON.parse(text))).toMatchObject([
      {
        "@graph": [
          {
            "@type": "Product",
            name: PRODUCTS.lapis.title,
            offers: [{ availability: "https://schema.org/InStock", price: "379.00", priceCurrency: "PLN", sku: PRODUCTS.lapis.sku }],
          },
          { "@type": "BreadcrumbList" },
        ],
      },
    ])
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/cdn-cgi\/image\/width=1200,height=630,[^/]+\/products\/[\da-f]{64}\.webp$/u,
    )
  })

  test("reports the database, the cache and the image storage healthy to an uptime monitor", async ({ request }) => {
    const health = await request.get("/api/health")

    expect(health.status()).toBe(200)
    expect(health.headers()["cache-control"]).toBe("no-store")
    expect(await health.json()).toStrictEqual({ checks: { d1: "ok", kv: "ok", r2: "ok" }, status: "ok" })
  })
})
