import { type JSX, useRef } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ScrollTrigger } from "~/src/integrations/gsap/gsap.config"

import { useLandingAnimations } from "~/src/hooks/use-landing-animations"

const ON_SCREEN_TOP = 120

const BELOW_THE_FOLD_TOP = 2400

const LandingPage = (): JSX.Element => {
  const rootRef = useRef<HTMLDivElement>(null)
  useLandingAnimations({ rootRef })

  return (
    <main ref={rootRef} data-landing-page>
      <h1 className="reveal">Jewelry with a story</h1>
      <hr className="line-reveal" />
      <h2 className="reveal below-the-fold">New arrivals</h2>
      <hr className="line-reveal below-the-fold" />
    </main>
  )
}

const stubMotionPreference = (): void => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: query === "(prefers-reduced-motion: no-preference)",
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }))
}

const lines = (): HTMLElement[] => screen.getAllByRole("separator")

beforeEach(() => {
  stubMotionPreference()
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function placeOnPage(this: Element) {
    return new DOMRect(0, this.classList.contains("below-the-fold") ? BELOW_THE_FOLD_TOP : ON_SCREEN_TOP, 400, 300)
  })
})

afterEach(() => {
  cleanup()
  for (const trigger of ScrollTrigger.getAll()) {
    trigger.kill()
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("landing reveals with the real animation library", () => {
  it("leaves the copy and the rule on the first screen exactly as the server painted them", () => {
    render(<LandingPage />)

    const heading = screen.getByRole("heading", { level: 1 })
    const [firstLine] = lines()

    expect(heading.getAttribute("style")).toBeNull()
    expect(firstLine?.getAttribute("style")).toBeNull()
  })

  it("hides the copy below the fold and collapses its rule until they scroll into view", () => {
    render(<LandingPage />)

    const [, lowerLine] = lines()

    expect(screen.getByText("New arrivals").style.visibility).toBe("hidden")
    expect(lowerLine?.style.transform).toContain("scale(0, 1)")
  })
})
