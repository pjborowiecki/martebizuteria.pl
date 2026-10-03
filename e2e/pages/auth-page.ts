import { type Locator } from "@playwright/test"

import { BasePage } from "./base-page"

interface NewAccount {
  readonly email: string
  readonly firstName: string
  readonly lastName: string
  readonly password: string
}

export class AuthPage extends BasePage {
  emailField(): Locator {
    return this.page.getByRole("textbox", { exact: true, name: "Email address *" })
  }

  passwordField(): Locator {
    return this.page.getByRole("textbox", { exact: true, name: "Password *" })
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.open("/en-US/auth/sign-in")
    await this.emailField().fill(email)
    await this.passwordField().fill(password)
    await this.page.getByRole("button", { exact: true, name: "Sign in" }).click()
  }

  async signUp(account: NewAccount): Promise<void> {
    await this.open("/en-US/auth/sign-up")
    await this.page.getByRole("textbox", { exact: true, name: "First name *" }).fill(account.firstName)
    await this.page.getByRole("textbox", { exact: true, name: "Last name *" }).fill(account.lastName)
    await this.emailField().fill(account.email)
    await this.passwordField().fill(account.password)
    await this.page.getByRole("textbox", { exact: true, name: "Confirm password *" }).fill(account.password)
    await this.page.getByRole("button", { exact: true, name: "Create account" }).click()
  }
}
