import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { registerCustomer } from "../fixtures/customers"
import { linkIn, waitForEmail } from "../fixtures/emails"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"
import { AuthPage } from "../pages"

const RESET_PASSWORD = "MarteResetPassword456!"

const SIGN_UP_PASSWORD = "MarteNewCustomer123!"

const BOT_CHECK_FAILED = "We could not finish the check that keeps bots out. Please try again."

test.describe("authentication", () => {
  test("a new customer signs up, confirms the email and lands in their account", async ({ authPage, page, request }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(customer.firstName)
  })

  test("a sign-up whose bot check token was tampered with creates no account until the check passes", async ({
    authPage,
    page,
    request,
  }, testInfo) => {
    const customer = { email: uniqueEmail(testInfo, "forged-sign-up"), firstName: "Zofia", lastName: "Nowak", password: SIGN_UP_PASSWORD }
    await page.route(
      "**/api/auth/sign-up/email",
      (route) => route.continue({ headers: { ...route.request().headers(), "x-turnstile-token": "forged-token" } }),
      { times: 1 },
    )

    await authPage.signUp(customer)

    await expect(authPage.notification(BOT_CHECK_FAILED)).toBeVisible()
    await expect(page).toHaveURL(/\/en-US\/auth\/sign-up$/u)

    await page.getByRole("button", { exact: true, name: "Create account" }).click()

    await expect(page).toHaveURL(/\/en-US\/auth\/sign-in$/u)
    await waitForEmail(request, customer.email, "Welcome to M'Arte — confirm your email")
  })

  test("a wrong password keeps the visitor signed out", async ({ authPage, page }) => {
    await authPage.signIn(TEST_ACCOUNTS.customer.email, "NotThePassword123!")

    await expect(page.getByRole("region", { name: /Notifications/u })).toContainText(/invalid|incorrect/iu)
    await expect(page).toHaveURL(/\/en-US\/auth\/sign-in/u)
  })

  test("a protected page sends visitors to sign in and back to it afterwards", async ({ authPage, page }) => {
    await page.goto("/en-US/account/orders")
    await expect(page).toHaveURL(/\/en-US\/auth\/sign-in\?redirect=%2Fen-US%2Faccount%2Forders/u)
    await authPage.waitForAppReady()

    await authPage.emailField().fill(TEST_ACCOUNTS.customer.email)
    await authPage.passwordField().fill(TEST_PASSWORD)
    await page.getByRole("button", { exact: true, name: "Sign in" }).click()

    await expect(page).toHaveURL(/\/en-US\/account\/orders/u)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Orders")
  })

  test("signing out ends the session", async ({ accountPage, authPage, page, request }, testInfo) => {
    await registerCustomer({ authPage, page, request }, testInfo)

    await accountPage.signOutButton().click()
    await expect(page).not.toHaveURL(/\/account\//u)

    await page.goto("/en-US/account/overview")
    await expect(page).toHaveURL(/\/en-US\/auth\/sign-in/u)
  })

  test("a password reset signs out the browser that stayed signed in and emails the customer about it", async ({
    authPage,
    browser,
    page,
    request,
  }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)
    const resetBrowser = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "reset") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(resetBrowser)
    const resetPage = new AuthPage(await resetBrowser.newPage())

    await resetPage.requestPasswordReset(customer.email)
    const resetEmail = await waitForEmail(request, customer.email, "Password reset — M'Arte")
    await resetPage.open(linkIn(resetEmail, /reset-password/u).href)
    await resetPage.setNewPassword(RESET_PASSWORD)
    await expect(resetPage.notification("Password updated")).toBeVisible()
    await resetBrowser.close()

    const notice = await waitForEmail(request, customer.email, "Your M'Arte password has been changed")
    expect(linkIn(notice, /\/auth\/sign-in/u).pathname).toBe("/en-US/auth/sign-in")

    await authPage.open("/en-US/account/overview")
    await expect(page).toHaveURL(/\/en-US\/auth\/sign-in/u)

    await authPage.signIn(customer.email, RESET_PASSWORD)
    await expect(page).toHaveURL(/\/en-US\/account\/overview/u)
  })
})
