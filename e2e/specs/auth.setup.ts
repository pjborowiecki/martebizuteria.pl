import { ADMIN_TOTP_SECRET, TEST_ACCOUNTS, TEST_PASSWORD } from "../data/accounts"
import { STORAGE_STATE } from "../data/storage-state"
import { expect, test as setup } from "../fixtures/test"
import { currentTotpCode } from "../fixtures/totp"

setup("signs in as the seeded admin with a password and a two-factor code", async ({ authPage, page }) => {
  await authPage.signIn(TEST_ACCOUNTS.admin.email, TEST_PASSWORD)
  await authPage.enterTwoFactorCode(currentTotpCode(ADMIN_TOTP_SECRET))

  await expect(page).toHaveURL(/\/en-US\/admin(?:\/overview)?$/u)
  await page.context().storageState({ path: STORAGE_STATE.admin })
})

setup("signs in as the seeded customer", async ({ authPage, page }) => {
  await authPage.signIn(TEST_ACCOUNTS.customer.email, TEST_PASSWORD)

  await expect(page).toHaveURL(/\/en-US\/account\/overview$/u)
  await page.context().storageState({ path: STORAGE_STATE.customer })
})
