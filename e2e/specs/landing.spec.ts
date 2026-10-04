import { type Locator, type Page } from "@playwright/test"

import { TRANSPARENT_PNG, expect, test } from "../fixtures/test"

const WIDE_SCREEN = { height: 900, width: 1440 }
const IMAGE_LATENCY_MS = 350
const WHEEL_STEPS = 120
const WHEEL_STEP_PX = 60
const WHEEL_TOTAL_PX = WHEEL_STEPS * WHEEL_STEP_PX
const PAGE_DOWN_PRESSES = 7
const FLINGS = 6
const SWIPE_PX = 500
const SWIPE_SPEED_PX_PER_S = 2500
const FLING_SPREAD_PX = 100
const SETTLE_POLL = { intervals: [300] }
const PANEL_ALIGNMENT_TOLERANCE_PX = 1

const delayEveryImage = async (page: Page): Promise<void> => {
  await page.route(
    () => true,
    async (route) => {
      if (route.request().resourceType() !== "image") {
        await route.fallback()

        return
      }
      await new Promise((resolve) => {
        setTimeout(resolve, IMAGE_LATENCY_MS)
      })
      await route.fulfill({ body: TRANSPARENT_PNG, contentType: "image/png" })
    },
  )
}

const pageScroll = (page: Page): Promise<number> => page.evaluate(() => scrollY)

const settledPageScroll = (page: Page): (() => Promise<number>) => {
  let previous = Number.NaN

  return async () => {
    const current = await pageScroll(page)
    const settled = current === previous ? current : Number.NaN
    previous = current

    return settled
  }
}

const stillPageScroll = async (page: Page): Promise<number> => {
  await expect.poll(settledPageScroll(page), SETTLE_POLL).not.toBeNaN()

  return pageScroll(page)
}

const nextFrame = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          resolve()
        })
      }),
  )

const scrollToCategories = async (page: Page): Promise<number> => {
  await page.locator("#kolekcje").evaluate((section) => {
    section.scrollIntoView({ behavior: "instant", block: "start" })
  })

  return stillPageScroll(page)
}

const categoryLinks = (page: Page): Locator => page.locator("#kolekcje").getByRole("link")

const pressTabToNextLink = (page: Page, browserName: string): Promise<void> =>
  page.keyboard.press(browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab")

const panelLeftEdge = (link: Locator): Promise<number> =>
  link.locator("xpath=ancestor::article").evaluate((panel) => panel.getBoundingClientRect().left)

const focusLastControlIn = (section: Locator): Promise<void> =>
  section.evaluate((element) => {
    for (const control of [...element.querySelectorAll<HTMLElement>("a[href], button")].toReversed()) {
      control.focus()
      if (document.activeElement === control) {
        return
      }
    }
  })

const sectionScrollLeft = (page: Page): Promise<number> => page.locator("#kolekcje").evaluate((section) => section.scrollLeft)

test.describe("the categories on a wide screen", () => {
  test.use({ viewport: WIDE_SCREEN })

  test("a long wheel scroll runs on through the categories while their pictures load", async ({ page, productPage }) => {
    await delayEveryImage(page)
    await productPage.open("/en-US")
    const startY = await scrollToCategories(page)
    expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight - scrollY)).toBeGreaterThan(WHEEL_TOTAL_PX)

    await page.mouse.move(WIDE_SCREEN.width / 2, WIDE_SCREEN.height / 2)
    for (let step = 0; step < WHEEL_STEPS; step += 1) {
      await page.mouse.wheel(0, WHEEL_STEP_PX)
      await nextFrame(page)
    }

    const settled = settledPageScroll(page)
    await expect.poll(async () => (await settled()) - startY, SETTLE_POLL).toBe(WHEEL_TOTAL_PX)
  })

  test("PageDown runs on through the categories while their pictures load", async ({ browserName, page, productPage }) => {
    test.skip(browserName !== "chromium", "WebKit drops a PageDown pressed while the previous one is still scrolling")
    await delayEveryImage(page)
    await productPage.open("/en-US")
    const topY = await pageScroll(page)
    await page.keyboard.press("PageDown")
    const pageStep = (await stillPageScroll(page)) - topY
    const startY = await scrollToCategories(page)

    for (let press = 0; press < PAGE_DOWN_PRESSES; press += 1) {
      await page.keyboard.press("PageDown")
    }

    const settled = settledPageScroll(page)
    expect(pageStep).toBeGreaterThan(0)
    await expect.poll(async () => (await settled()) - startY, SETTLE_POLL).toBe(PAGE_DOWN_PRESSES * pageStep)
  })

  test("Tab slides the next category into view without scrolling the section sideways", async ({ browserName, page, productPage }) => {
    await productPage.open("/en-US")
    await categoryLinks(page).first().focus()

    await pressTabToNextLink(page, browserName)

    const focusedLink = categoryLinks(page).nth(1)
    await expect(focusedLink).toBeFocused()
    await expect(focusedLink).toBeInViewport({ ratio: 1 })
    expect(await sectionScrollLeft(page)).toBe(0)
    expect(Math.abs(await panelLeftEdge(focusedLink))).toBeLessThanOrEqual(PANEL_ALIGNMENT_TOLERANCE_PX)
  })

  test("Tab from the new arrivals slides the first category in before the section has pinned", async ({ browserName, page, productPage }) => {
    await productPage.open("/en-US")
    const lastArrival = page.locator("#nowosci a[href]").last()
    await lastArrival.evaluate((card) => {
      card.scrollIntoView({ behavior: "instant", block: "center" })
    })
    await expect(lastArrival).toBeVisible()
    await focusLastControlIn(page.locator("#nowosci"))
    expect(await page.locator("#nowosci").evaluate((section) => section.contains(document.activeElement))).toBe(true)
    expect(await page.locator("#kolekcje").evaluate((section) => section.getBoundingClientRect().top)).toBeGreaterThan(0)

    await pressTabToNextLink(page, browserName)

    const focusedLink = categoryLinks(page).first()
    await expect(focusedLink).toBeFocused()
    await expect(focusedLink).toBeInViewport({ ratio: 1 })
    expect(await sectionScrollLeft(page)).toBe(0)
    expect(Math.abs(await panelLeftEdge(focusedLink))).toBeLessThanOrEqual(PANEL_ALIGNMENT_TOLERANCE_PX)
  })

  test("Tab after a click on a category's picture slides the next category into view", async ({ browserName, page, productPage }) => {
    await productPage.open("/en-US")
    await categoryLinks(page).first().focus()
    await pressTabToNextLink(page, browserName)
    await expect(categoryLinks(page).nth(1)).toBeInViewport({ ratio: 1 })

    await page.locator("#kolekcje article").nth(2).getByRole("img").click()
    await pressTabToNextLink(page, browserName)

    const focusedLink = categoryLinks(page).nth(2)
    await expect(focusedLink).toBeFocused()
    await expect(focusedLink).toBeInViewport({ ratio: 1 })
    expect(await sectionScrollLeft(page)).toBe(0)
    expect(Math.abs(await panelLeftEdge(focusedLink))).toBeLessThanOrEqual(PANEL_ALIGNMENT_TOLERANCE_PX)
  })
})

test.describe("the categories under a finger on a wide screen", () => {
  test.use({ hasTouch: true, viewport: WIDE_SCREEN })
  test.skip(({ browserName }) => browserName !== "chromium", "only Chromium can play a touch fling")

  test("every fling glides on through the categories as far as it does above them while their pictures load", async ({ page, productPage }) => {
    await delayEveryImage(page)
    await productPage.open("/en-US")
    const touchscreen = await page.context().newCDPSession(page)
    const fling = async (): Promise<number> => {
      const startY = await pageScroll(page)
      await touchscreen.send("Input.synthesizeScrollGesture", {
        gestureSourceType: "touch",
        preventFling: false,
        speed: SWIPE_SPEED_PX_PER_S,
        x: WIDE_SCREEN.width / 2,
        y: WIDE_SCREEN.height - SWIPE_PX / 2,
        yDistance: -SWIPE_PX,
      })

      return (await stillPageScroll(page)) - startY
    }
    const flingAboveCategories = await fling()
    await scrollToCategories(page)

    const flingsThroughCategories: number[] = []
    for (let index = 0; index < FLINGS; index += 1) {
      flingsThroughCategories.push(await fling())
    }

    expect(flingAboveCategories).toBeGreaterThan(SWIPE_PX + FLING_SPREAD_PX)
    expect(Math.min(...flingsThroughCategories)).toBeGreaterThan(flingAboveCategories - FLING_SPREAD_PX)
  })
})
