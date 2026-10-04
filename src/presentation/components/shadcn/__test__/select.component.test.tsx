import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { SmoothScroll } from "~/src/presentation/components/custom/smooth-scroll"

vi.mock("~/src/integrations/gsap/gsap.config", () => ({
  ScrollTrigger: {
    addEventListener: vi.fn(),
    refresh: vi.fn(),
    removeEventListener: vi.fn(),
    scrollerProxy: vi.fn(),
    update: vi.fn(),
  },
  gsap: {
    delayedCall: vi.fn(),
    registerPlugin: vi.fn(),
    ticker: { add: vi.fn(), lagSmoothing: vi.fn(), remove: vi.fn() },
  },
}))
vi.mock("~/src/hooks/use-lenis-router-scroll-sync", () => ({ useLenisRouterScrollSync: vi.fn() }))

const ZONES = Array.from({ length: 30 }, (_, index) => `zone-${index}`)

const WHEEL_DELTA_PX = 120

const isWheelLeftToTheBrowser = (target: Element): boolean => fireEvent.wheel(target, { deltaY: WHEEL_DELTA_PX })

const renderSelectOnSmoothPage = (selectProps: Readonly<{ defaultOpen: boolean; modal?: boolean }>): void => {
  render(
    <SmoothScroll>
      <main>
        <p>Page copy</p>
        <Select defaultValue="zone-0" {...selectProps}>
          <SelectTrigger aria-label="Zone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ZONES.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </main>
    </SmoothScroll>,
  )
}

const openSelectAndWaitForThePageLock = async (): Promise<void> => {
  renderSelectOnSmoothPage({ defaultOpen: true })
  await screen.findByRole("listbox")
  await waitFor(() => {
    expect(document.body.style.overflowY).toBe("hidden")
  })
}

afterEach(async () => {
  cleanup()
  await waitFor(() => {
    expect(document.body.style.overflowY).toBe("")
  })
})

describe("SelectContent on a page driven by Lenis", () => {
  it("leaves a wheel over the open list to the list, even when the select leaves the page unlocked", async () => {
    renderSelectOnSmoothPage({ defaultOpen: true, modal: false })

    expect(isWheelLeftToTheBrowser(await screen.findByRole("option", { name: "zone-10" }))).toBe(true)
  })

  it("keeps a wheel on the field that opened the list from scrolling the page", async () => {
    await openSelectAndWaitForThePageLock()

    expect(isWheelLeftToTheBrowser(screen.getByRole("combobox", { name: "Zone" }))).toBe(true)
  })

  it("keeps a wheel over the rest of the page from scrolling it while the list is open", async () => {
    await openSelectAndWaitForThePageLock()

    expect(isWheelLeftToTheBrowser(screen.getByText("Page copy"))).toBe(true)
  })

  it("still hands a wheel over the page to Lenis while the list is closed", () => {
    renderSelectOnSmoothPage({ defaultOpen: false })

    expect(isWheelLeftToTheBrowser(screen.getByText("Page copy"))).toBe(false)
  })
})
