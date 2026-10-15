import { type Page } from "@playwright/test"

export const themeColour = (page: Page, token: string): Promise<string> =>
  page.evaluate((name) => {
    const probe = document.createElement("span")
    probe.style.color = `var(${name})`
    document.body.append(probe)
    const { color } = getComputedStyle(probe)
    probe.remove()

    return color
  }, token)
