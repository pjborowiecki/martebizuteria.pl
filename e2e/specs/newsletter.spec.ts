import { type APIRequestContext, type Browser, type Page, type TestInfo } from "@playwright/test"

import { TEST_ACCOUNTS } from "../data/accounts"
import { STORAGE_STATE } from "../data/storage-state"
import { linkIn, sentEmails, waitForEmail } from "../fixtures/emails"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { ProductPage } from "../pages"

const CONFIRM_SUBJECT = "Confirm your M'Arte subscription"

const CONFIRMATIONS_PER_ADDRESS_HOURLY = 3

const ONE_CLICK_UNSUBSCRIBE = "List-Unsubscribe=One-Click"

const LIST_UNSUBSCRIBE = /^<http:\/\/127\.0\.0\.1:3000\/api\/newsletter\/unsubscribe\?token=[^>]+>$/u

const subscribe = async (page: Page, email: string): Promise<void> => {
  const productPage = new ProductPage(page)
  await productPage.open("/en-US")
  const emailField = page.getByRole("textbox", { name: "Email address" })
  await productPage.scrollUntilVisible(emailField)

  await emailField.fill(email)
  await page.getByRole("button", { name: "Join us" }).click()
  await expect(page.getByText(/check your inbox and confirm your subscription/u)).toBeVisible()
}

const joinFromAnotherBrowser = async (browser: Browser, testInfo: TestInfo, visitor: string, email: string): Promise<void> => {
  const context = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, visitor) },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(context)
  await subscribe(await context.newPage(), email)
  await context.close()
}

const subscribeAndConfirm = async (browser: Browser, request: APIRequestContext, testInfo: TestInfo): Promise<string> => {
  const visitor = await browser.newContext({
    extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "subscriber") },
    storageState: { cookies: [], origins: [] },
  })
  await isolateNetwork(visitor)
  const page = await visitor.newPage()
  const email = uniqueEmail(testInfo, "campaign")
  await subscribe(page, email)
  const confirmation = await waitForEmail(request, email, CONFIRM_SUBJECT)
  const productPage = new ProductPage(page)
  await productPage.open(linkIn(confirmation, /\/newsletter\/confirm\?token=/u).href)
  await expect(productPage.heading()).toHaveText("You are on the list")
  await visitor.close()

  return email
}

const writeLetter = async (page: Page, language: string, letter: Readonly<{ body: string; subject: string }>): Promise<void> => {
  await page.getByRole("tab", { name: language }).click()
  await page.getByRole("textbox", { name: "Subject" }).fill(letter.subject)
  await page.getByRole("textbox", { name: "Letter" }).fill(letter.body)
}

test.describe("newsletter", () => {
  test("a visitor subscribes on the home page and confirms from the email on the address they used", async ({
    page,
    productPage,
    request,
  }, testInfo) => {
    const email = uniqueEmail(testInfo, "newsletter")
    await subscribe(page, email)

    const confirmation = await waitForEmail(request, email, CONFIRM_SUBJECT)
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

test.describe("newsletter campaigns", () => {
  test.use({ storageState: STORAGE_STATE.admin })

  test("the owner tests a newsletter, sends it once, and a subscriber gets it in their language with a one-click unsubscribe", async ({
    browser,
    page,
    productPage,
    request,
  }, testInfo) => {
    const subscriber = await subscribeAndConfirm(browser, request, testInfo)
    const tag = crypto.randomUUID().slice(0, 8)
    const polish = { body: "Nowe pierścionki czekają w pracowni.", subject: `Jesienne projekty ${tag}` }
    const english = { body: "New rings are waiting in the atelier.", subject: `Autumn pieces ${tag}` }

    await productPage.open("/en-US/admin/marketing/new")
    await writeLetter(page, "Polish", polish)
    await writeLetter(page, "English", english)
    await page.getByRole("button", { name: "Send test to me" }).click()
    await page.mouse.move(0, 0)
    const testSent = page.getByText("Test sent", { exact: true })
    await expect(testSent).toBeVisible()
    await expect(testSent).toBeHidden()

    const [polishTest, englishTest] = await Promise.all([
      waitForEmail(request, TEST_ACCOUNTS.admin.email, polish.subject),
      waitForEmail(request, TEST_ACCOUNTS.admin.email, english.subject),
    ])
    expect(polishTest.html).toContain(polish.body)
    expect(englishTest.html).toContain(english.body)
    expect(englishTest.headers?.["List-Unsubscribe"]).toBeUndefined()

    await page.getByRole("button", { name: "Send to subscribers" }).click()
    await page.getByRole("alertdialog", { name: "Send this newsletter?" }).getByRole("button", { name: "Send now" }).click()
    await expect(page).toHaveURL(/\/en-US\/admin\/marketing$/u)
    await expect(page.getByRole("row").filter({ hasText: english.subject })).toBeVisible()

    const letter = await waitForEmail(request, subscriber, english.subject)
    expect(letter.html).toContain(english.body)
    expect(letter.html).toContain("Pyciak Mariusz Firma Jubilerska")
    expect(letter.html).toContain('href="mailto:kontakt@martebizuteria.pl"')
    expect(letter.headers?.["List-Unsubscribe-Post"]).toBe(ONE_CLICK_UNSUBSCRIBE)
    const listUnsubscribe = String(letter.headers?.["List-Unsubscribe"])
    expect(listUnsubscribe).toMatch(LIST_UNSUBSCRIBE)
    const unsubscribeLink = linkIn(letter, /\/newsletter\/unsubscribe\?token=/u)
    expect(unsubscribeLink.pathname).toBe("/en-US/newsletter/unsubscribe")

    const oneClick = await request.post(listUnsubscribe.slice(1, -1), {
      data: ONE_CLICK_UNSUBSCRIBE,
      headers: { "content-type": "application/x-www-form-urlencoded" },
    })
    expect(oneClick.ok()).toBe(true)

    await productPage.open(unsubscribeLink.href)
    await expect(productPage.heading()).toHaveText("Already unsubscribed")

    await productPage.open("/en-US/admin/marketing")
    await expect(page.getByRole("row").filter({ hasText: english.subject })).toContainText("Sent")
  })
})
