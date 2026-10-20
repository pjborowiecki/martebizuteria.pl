import { type JSX, useRef } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ScrollTrigger } from "~/src/integrations/gsap/gsap.config"

import { useProductAnimations } from "~/src/presentation/components/custom/pages/product-page/hooks/use-product-animations"

const ON_SCREEN_TOP = 120

const BELOW_THE_FOLD_TOP = 2400

const ProductPage = (): JSX.Element => {
  const rootRef = useRef<HTMLElement>(null)
  useProductAnimations({ dependencies: ["serenity-necklace"], rootRef })

  return (
    <main ref={rootRef}>
      <nav className="reveal">Breadcrumb</nav>
      <div className="reveal">
        <img alt="Serenity necklace" src="https://images.test/products/serenity.webp" />
      </div>
      <aside className="reveal">
        <h1>Serenity necklace</h1>
      </aside>
      <section className="reveal below-the-fold">Related products</section>
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

const isHidden = (element: HTMLElement): boolean => element.style.visibility === "hidden" || element.style.opacity === "0"

const heroParts = (): HTMLElement[] => {
  const imageWrapper = screen.getByRole("img").parentElement
  if (imageWrapper === null) {
    throw new Error("expected the main image inside its reveal wrapper")
  }

  return [screen.getByText("Breadcrumb"), imageWrapper, screen.getByRole("complementary")]
}

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

describe("product page reveals with the real animation library", () => {
  it("keeps the breadcrumb, the main image and the buy box painted from the first frame", () => {
    render(<ProductPage />)

    for (const element of heroParts()) {
      expect(isHidden(element)).toBe(false)
      expect(element.style.transform).toBe("")
    }
  })

  it("hides the related products below the fold until they scroll into view", () => {
    render(<ProductPage />)

    expect(isHidden(screen.getByText("Related products"))).toBe(true)
  })
})
