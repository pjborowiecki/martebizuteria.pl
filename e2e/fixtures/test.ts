import { type BrowserContext, type TestInfo, test as base } from "@playwright/test"

import { AccountPage, AdminOrderPage, AuthPage, CartPage, CheckoutPage, CouponsPage, ProductPage } from "../pages"

const LOCAL_ORIGIN = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?\//u
const TRANSLATION_ERROR = /MISSING_MESSAGE|INVALID_MESSAGE|FORMATTING_ERROR|INVALID_KEY/u
export const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
)

const IP_OCTET_COUNT = 3
const IP_OCTET_RANGE = 254

export const isolateNetwork = async (context: BrowserContext): Promise<void> => {
  await context.route(
    (url) => !LOCAL_ORIGIN.test(url.href),
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ body: TRANSPARENT_PNG, contentType: "image/png" })
        : route.abort("blockedbyclient"),
  )
}

export const clientAddressFor = (testInfo: TestInfo, client = "visitor"): string => {
  const seed = [...`${testInfo.testId}:${testInfo.project.name}:${String(testInfo.retry)}:${client}`].reduce(
    (hash, character) => Math.imul(hash ^ (character.codePointAt(0) ?? 0), 16_777_619) >>> 0,
    2_166_136_261,
  )
  const octets = Array.from({ length: IP_OCTET_COUNT }, (_, index) => ((seed >>> (index * 8)) % IP_OCTET_RANGE) + 1)

  return `10.${octets.join(".")}`
}

interface AppFixtures {
  accountPage: AccountPage
  adminOrderPage: AdminOrderPage
  authPage: AuthPage
  cartPage: CartPage
  checkoutPage: CheckoutPage
  checkTranslations: undefined
  couponsPage: CouponsPage
  isolatedNetwork: undefined
  productPage: ProductPage
}

export const test = base.extend<AppFixtures>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page))
  },
  adminOrderPage: async ({ page }, use) => {
    await use(new AdminOrderPage(page))
  },
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page))
  },
  checkTranslations: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on("console", (message) => {
        if (TRANSLATION_ERROR.test(message.text())) {
          errors.push(message.text())
        }
      })
      await use(undefined)
      base.expect(errors, "Every visited page must resolve and format its translations").toStrictEqual([])
    },
    { auto: true },
  ],
  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page))
  },
  couponsPage: async ({ page }, use) => {
    await use(new CouponsPage(page))
  },
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    await use({ ...extraHTTPHeaders, "cf-connecting-ip": clientAddressFor(testInfo) })
  },
  isolatedNetwork: [
    async ({ context }, use) => {
      await isolateNetwork(context)
      await use(undefined)
    },
    { auto: true },
  ],
  productPage: async ({ page }, use) => {
    await use(new ProductPage(page))
  },
})

export { expect } from "@playwright/test"
