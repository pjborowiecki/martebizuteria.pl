import { type Browser, type TestInfo } from "@playwright/test"

import { linkIn, sentEmails, waitForEmail } from "../fixtures/emails"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { ProductPage } from "../pages"

const CONFIRM_SUBJECT = "Confirm your M'Arte subscription"

const CONFIRMATIONS_PER_ADDRESS_HOURLY = 3

const joinFromAnotherBrowser = async (browser: Browser, testInfo: TestInfo, visitor: string, email: string): Promise<void> => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, visitor) },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(context)
  const page = await context.newPage()
  const productPage = new ProductPage(page)
  await productPage.open("/en-US")
  const emailField = page.getByRole("textbox", { name: "Email address" })
  await productPage.scrollUntilVisible(emailField)

  await emailField.fill(email)
  await page.getByRole("button", { name: "Join us" }).click()

  await expect(page.getByText(/check your inbox and confirm your subscription/u)).toBeVisible()
  await context.close()
}

test.describe("newsletter", () => {
  test("a visitor subscribes on the home page and confirms from the email on the address they used", async ({
    page,
    productPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "newsletter")
    await productPage.open("/en-US")
    const emailField = page.getByRole("textbox", { name: "Email address" })
    await productPage.scrollUntilVisible(emailField)

    await emailField.fill(email)
    await page.getByRole("button", { name: "Join us" }).click()
    await expect(page.getByText(/check your inbox and confirm your subscription/u)).toBeVisible()

    const confirmation = await waitForEmail(request, email, "Confirm your M'Arte subscription")
    const confirmLink = linkIn(confirmation, /\/newsletter\/confirm\?token=/u)
    expect(confirmLink.origin).toBe("http://127.0.0.1:3000")
    expect(confirmLink.pathname).toBe("/en-US/newsletter/confirm")

    await productPage.open(confirmLink.href)

    await expect(productPage.heading()).toHaveText("You are on the list")
    await expect(page.getByRole("main")).toContainText(email)
  })

  test("asking again and again for the confirmation stops the emails after three an hour, with the same answer every time", async ({
    browser,
    request,
  }, testInfo) => {
    test.slow()
    const email = uniqueEmail(testInfo, "newsletter-repeat")

    for (const visitor of ["first", "second", "third", "fourth"]) {
      await joinFromAnotherBrowser(browser, testInfo, visitor, email)
    }

    const confirmations = (await sentEmails(request, email)).filter((sent) => sent.subject === CONFIRM_SUBJECT)
    expect(confirmations).toHaveLength(CONFIRMATIONS_PER_ADDRESS_HOURLY)
  })
})
