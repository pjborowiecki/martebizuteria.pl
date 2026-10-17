import { type Page } from "@playwright/test"

import { STORAGE_STATE } from "../data/storage-state"
import { registerCustomer } from "../fixtures/customers"
import { clientAddressFor, expect, isolateNetwork, test } from "../fixtures/test"
import { AuthPage, BasePage } from "../pages"

const TEAM_SETTINGS = "/en-US/admin/settings/team"

const NEW_ADMIN_NAME = "Zofia Nowak"

const memberRow = (page: Page, email: string) => page.locator("[data-slot=settings-row]").filter({ hasText: email })

const removeAccess = async (page: Page, email: string): Promise<void> => {
  await memberRow(page, email).getByRole("button", { name: `Remove admin access for ${NEW_ADMIN_NAME}` }).click()
  await page.getByRole("alertdialog", { name: `Remove admin access for ${NEW_ADMIN_NAME}?` }).getByRole("button", { name: "Remove access" }).click()
  await expect(new BasePage(page).notification(`${NEW_ADMIN_NAME} is no longer an admin.`)).toBeVisible()
  await expect(memberRow(page, email)).toHaveCount(0)
}

test.describe("team settings", { lock: "shop-wide" }, () => {
  test.use({ storageState: STORAGE_STATE.admin })

  const granted: { email?: string | undefined } = {}

  test.afterEach(async ({ page }) => {
    if (granted.email === undefined) {
      return
    }

    await new BasePage(page).open(TEAM_SETTINGS)
    if ((await memberRow(page, granted.email).count()) > 0) {
      await removeAccess(page, granted.email)
    }
    granted.email = undefined
  })

  test("an admin makes a customer an admin, who must set up two-factor authentication, then removes the access, which signs them out", async ({
    browser,
    page,
    request,
  }, testInfo) => {
    const newcomer = await browser.newContext({
      extraHTTPHeaders: { "cf-connecting-ip": clientAddressFor(testInfo, "newcomer") },
      storageState: { cookies: [], origins: [] },
    })
    await isolateNetwork(newcomer)
    const newcomerPage = await newcomer.newPage()
    const customer = await registerCustomer({ authPage: new AuthPage(newcomerPage), page: newcomerPage, request }, testInfo)
    granted.email = customer.email

    await new BasePage(page).open(TEAM_SETTINGS)
    await expect(memberRow(page, "admin@marte.example.test").getByText("You", { exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Add admin" }).click()
    const search = page.getByRole("dialog", { name: "Add an admin" })
    await search.getByLabel("Email address or name").fill(customer.email)
    await search.getByRole("button", { name: `Choose ${NEW_ADMIN_NAME}` }).click()
    const confirmation = page.getByRole("dialog", { name: `Make ${NEW_ADMIN_NAME} an admin?` })
    await expect(confirmation.getByText(`The account ${customer.email} will be able to:`)).toBeVisible()
    await expect(confirmation.getByText(/two-factor authentication has to be turned on/u)).toBeVisible()
    await confirmation.getByRole("button", { name: "Make admin" }).click()

    await expect(new BasePage(page).notification(`${NEW_ADMIN_NAME} is now an admin.`)).toBeVisible()
    await expect(memberRow(page, customer.email).getByText("Two-factor off")).toBeVisible()
    await newcomerPage.goto("/en-US/account/overview")
    await expect(newcomerPage).toHaveURL(/\/en-US\/admin\/security$/u)

    await removeAccess(page, customer.email)
    granted.email = undefined
    await newcomerPage.goto("/en-US/account/overview")
    await expect(newcomerPage).toHaveURL(/\/en-US\/auth\/sign-in/u)
    await newcomer.close()
  })
})
