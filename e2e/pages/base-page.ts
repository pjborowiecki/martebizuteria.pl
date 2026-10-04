import { type Locator, type Page } from "@playwright/test"

const APP_READY_TIMEOUT_MS = 30_000

export class BasePage {
  protected readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "domcontentloaded" })
    await this.waitForAppReady()
  }

  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: "domcontentloaded" })
    await this.waitForAppReady()
  }

  async waitForAppReady(): Promise<void> {
    await this.page.waitForFunction(
      () => {
        const router: unknown = Reflect.get(globalThis, "$_TSR")

        return document.readyState === "complete" && (typeof router !== "object" || router === null || Reflect.get(router, "hydrated") === true)
      },
      undefined,
      { timeout: APP_READY_TIMEOUT_MS },
    )
  }

  heading(): Locator {
    return this.page.getByRole("heading", { level: 1 })
  }

  notification(text: string | RegExp): Locator {
    return this.page.getByRole("region", { name: /Notifications/u }).getByText(text)
  }

  async dismissNotification(text: string): Promise<void> {
    const toast = this.page.getByRole("region", { name: /Notifications/u }).getByRole("listitem").filter({ hasText: text })
    await toast.getByRole("button", { name: "Close toast" }).click()
    await toast.waitFor({ state: "detached" })
  }

  cartLink(): Locator {
    return this.page.getByRole("banner").getByRole("link", { name: "Cart" })
  }
}
