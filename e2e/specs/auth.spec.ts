import { TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { registerCustomer } from "../fixtures/customers"
import { expect, test } from "../fixtures/test"

test.describe("authentication", () => {
  test("a new customer signs up, confirms the email and lands in their account", async ({ authPage, page, request }, testInfo) => {
    const customer = await registerCustomer({ authPage, page, request }, testInfo)

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(customer.firstName)
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
})
