import { linkIn, waitForEmail } from "../fixtures/emails"
import { expect, test } from "../fixtures/test"
import { uniqueEmail } from "../fixtures/unique"

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
})
