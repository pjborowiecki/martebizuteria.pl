import { type Page } from "@playwright/test"

import { readPdf } from "~/src/platform/testing/lib/pdf"

import { STORAGE_STATE } from "../data/storage-state"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { BasePage } from "../pages"

const STORE_SETTINGS = "/en-US/admin/settings/store"

const PUBLISHED = { phone: "+48 663 150 820", street: "ul. Wąska 11" } as const

const CHANGED = { phone: "+48 600 700 800", street: "ul. Testowa 7" } as const

const saveSellerDetails = async (page: Page, { phone, street }: Readonly<{ phone: string; street: string }>): Promise<void> => {
  await page.getByLabel("Street and number").fill(street)
  await page.getByLabel("Contact phone").fill(phone)
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(new BasePage(page).notification("Seller details saved.")).toBeVisible()
}

test.describe("store details settings", { lock: "shop-wide" }, () => {
  test.use({ storageState: STORAGE_STATE.admin })

  test.afterEach(async ({ page }) => {
    await new BasePage(page).open(STORE_SETTINGS)
    if ((await page.getByLabel("Street and number").inputValue()) !== PUBLISHED.street) {
      await saveSellerDetails(page, PUBLISHED)
    }
  })

  test("an admin changes the seller's street and phone, and the footer of an open storefront tab shows them without a reload", async ({
    browser,
    page,
  }, testInfo) => {
    const shopper = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "shopper") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(shopper)
    const shopperPage = await shopper.newPage()
    await new BasePage(shopperPage).open("/en-US/about")
    const footer = shopperPage.getByRole("contentinfo")
    await expect(footer).toContainText(PUBLISHED.street)

    await new BasePage(page).open(STORE_SETTINGS)
    await page.getByLabel("NIP").fill("8681772647")
    await page.getByRole("button", { name: "Save", exact: true }).click()
    await expect(page.getByText("This NIP is not valid. Check its 10 digits.")).toBeVisible()
    await page.getByLabel("NIP").fill("8681772646")
    await saveSellerDetails(page, CHANGED)

    await expect(footer).toContainText(CHANGED.street)
    await expect(footer.getByRole("link", { name: CHANGED.phone })).toHaveAttribute("href", "tel:+48600700800")
    await expect(footer).not.toContainText(PUBLISHED.street)
    await shopper.close()
  })

  test("the terms of service write out the seller's details saved in Settings, with a working phone link", async ({ page }) => {
    await new BasePage(page).open(STORE_SETTINGS)
    await saveSellerDetails(page, CHANGED)

    await new BasePage(page).open("/en-US/terms-of-service")
    const terms = page.getByRole("article")

    await expect(terms).toContainText(CHANGED.street)
    await expect(terms.getByRole("link", { name: CHANGED.phone })).toHaveAttribute("href", "tel:+48600700800")
  })

  test("the withdrawal and complaint forms are made from the seller details saved in Settings, and a saved change replaces a cached copy", async ({
    page,
    request,
  }) => {
    const published = await request.get("/forms/formularz_zwrotu.pdf")
    const etag = String(published.headers()["etag"])

    expect(published.headers()).toMatchObject({
      "content-disposition": 'inline; filename="formularz_zwrotu.pdf"',
      "content-type": "application/pdf",
    })
    expect((await readPdf(await published.body())).lines.join(" ")).toContain(`${PUBLISHED.street},`)
    expect((await request.get("/forms/formularz_zwrotu.pdf", { headers: { "if-none-match": etag } })).status()).toBe(304)

    await new BasePage(page).open(STORE_SETTINGS)
    await saveSellerDetails(page, CHANGED)

    const changed = await request.get("/forms/formularz_zwrotu.pdf", { headers: { "if-none-match": etag } })
    const complaint = await request.get("/forms/formularz_reklamacji.pdf")

    expect(changed.status()).toBe(200)
    expect(changed.headers()["etag"]).not.toBe(etag)
    expect((await readPdf(await changed.body())).lines.join(" ")).toContain(`${CHANGED.street},`)
    expect(complaint.headers()["content-disposition"]).toBe('inline; filename="formularz_reklamacji.pdf"')
    expect((await readPdf(await complaint.body())).lines.join(" ")).toContain(`${CHANGED.street},`)
  })
})
