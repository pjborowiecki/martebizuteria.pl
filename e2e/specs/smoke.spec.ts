import { MENU_SHOWCASE, PRODUCTS } from "../data/catalog"
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

  test("keeps every environment but production out of search engines while serving the sitemap", async ({ request }) => {
    const robots = await request.get("/robots.txt")
    const sitemap = await request.get("/sitemap.xml")

    expect(robots.status()).toBe(200)
    expect(await robots.text()).toBe("User-agent: *\nDisallow: /\n")
    expect(sitemap.status()).toBe(200)
    expect(await sitemap.text()).toContain('<xhtml:link rel="alternate" hreflang="en-US" href="http://127.0.0.1:3000/en-US"/>')
  })
})
