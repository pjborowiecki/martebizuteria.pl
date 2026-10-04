import { type Page } from "@playwright/test"

const TOUCH_MOVES = 10
const MS_PER_SECOND = 1000

interface Swipe {
  distancePx: number
  speedPxPerS: number
  x: number
  y: number
}

export const swipeUp = async (page: Page, { distancePx, speedPxPerS, x, y }: Swipe): Promise<void> => {
  const touchscreen = await page.context().newCDPSession(page)
  const startedAt = Date.now() / MS_PER_SECOND
  const touchAt = (move: number): Readonly<{ timestamp: number; touchPoints: { x: number; y: number }[] }> => ({
    timestamp: startedAt + (distancePx * move) / TOUCH_MOVES / speedPxPerS,
    touchPoints: [{ x, y: y - (distancePx * move) / TOUCH_MOVES }],
  })

  await touchscreen.send("Input.dispatchTouchEvent", { type: "touchStart", ...touchAt(0) })
  for (let move = 1; move <= TOUCH_MOVES; move += 1) {
    await touchscreen.send("Input.dispatchTouchEvent", { type: "touchMove", ...touchAt(move) })
  }
  await touchscreen.send("Input.dispatchTouchEvent", { timestamp: touchAt(TOUCH_MOVES).timestamp, touchPoints: [], type: "touchEnd" })
  await touchscreen.detach()
}
