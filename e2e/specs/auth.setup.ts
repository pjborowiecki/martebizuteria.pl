import { TEST_ACCOUNTS, TEST_PASSWORD, type TestAccountRole } from "../data/accounts"
import { STORAGE_STATE } from "../data/storage-state"
import { expect, test as setup } from "../fixtures/test"

const LANDING_PAGE: Readonly<Record<TestAccountRole, RegExp>> = {
  admin: /\/en-US\/admin(?:\/overview)?$/u,
  customer: /\/en-US\/account\/overview$/u,
}

for (const role of ["admin", "customer"] as const) {
  setup(`signs in as the seeded ${role}`, async ({ authPage, page }) => {
    await authPage.signIn(TEST_ACCOUNTS[role].email, TEST_PASSWORD)

    await expect(page).toHaveURL(LANDING_PAGE[role])
    await page.context().storageState({ path: STORAGE_STATE[role] })
  })
}
