import { type APIRequestContext, type Page, type TestInfo } from "@playwright/test"

import { type AuthPage } from "../pages"
import { linkIn, waitForEmail } from "./emails"
import { expect } from "./test"
import { uniqueEmail } from "./unique"

const NEW_CUSTOMER_PASSWORD = "MarteNewCustomer123!"

export interface RegisteredCustomer {
  readonly email: string
  readonly firstName: string
  readonly password: string
}

export const registerCustomer = async (
  { authPage, page, request }: Readonly<{ authPage: AuthPage; page: Page; request: APIRequestContext }>,
  testInfo: TestInfo,
): Promise<RegisteredCustomer> => {
  const customer = { email: uniqueEmail(testInfo, "customer"), firstName: "Zofia", lastName: "Nowak", password: NEW_CUSTOMER_PASSWORD }
  await authPage.signUp(customer)
  const verification = await waitForEmail(request, customer.email, "Welcome to M'Arte — confirm your email")

  await page.goto(linkIn(verification, /verify-email/u).href)
  await expect(page).toHaveURL(/\/en-US\/account\/overview/u)
  await authPage.waitForAppReady()

  return customer
}
