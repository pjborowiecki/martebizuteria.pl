import { type JSX } from "react"
import { renderToString } from "react-dom/server"

import { describe, expect, it, vi } from "vite-plus/test"

const gsapLoader = vi.hoisted(() => ({ loadGsap: vi.fn(() => new Promise<never>(() => {})) }))

vi.mock("~/src/integrations/gsap/gsap.loader", () => ({
  getLoadedGsap: () => {},
  loadGsap: gsapLoader.loadGsap,
  subscribeToGsap: () => () => {},
}))

import { useGsap } from "~/src/hooks/use-gsap"

const setup = vi.fn()

const AnimatedPage = (): JSX.Element => {
  useGsap(setup)

  return <p>animated page</p>
}

describe("useGsap on the server", () => {
  it("renders the page without asking for the library or running the setup, which only the browser does", () => {
    expect(renderToString(<AnimatedPage />)).toBe("<p>animated page</p>")
    expect(gsapLoader.loadGsap).not.toHaveBeenCalled()
    expect(setup).not.toHaveBeenCalled()
  })
})
