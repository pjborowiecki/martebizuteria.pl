import { type JSX, useCallback, useRef } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { useNavigationLogic } from "~/src/presentation/components/custom/pages/landing-page/navigation/hooks/use-navigation-logic"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

const gsapLoader = vi.hoisted(() => ({ loadGsap: vi.fn(() => new Promise<never>(() => {})) }))

vi.mock("~/src/integrations/gsap/gsap.loader", () => ({
  getLoadedGsap: () => {},
  loadGsap: gsapLoader.loadGsap,
  subscribeToGsap: () => () => {},
}))
vi.mock("~/src/integrations/lenis/lenis.scroll", () => ({ scrollToSectionById: () => {} }))

const noop = () => {}

const NavigationHarness = (): JSX.Element => {
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDialogElement>(null)
  const { dismissMenuForRouteNavigation, handleHover, menuOpen, mounted, setMenuOpen } = useNavigationLogic(containerRef, panelRef, noop)
  const openMenu = useCallback(() => {
    setMenuOpen(true)
  }, [setMenuOpen])
  const showSecondImage = useCallback(() => {
    handleHover(2)
  }, [handleHover])

  return (
    <div ref={containerRef}>
      <dialog ref={panelRef} />
      <p>{`mounted:${String(mounted)} open:${String(menuOpen)}`}</p>
      <button onClick={openMenu} type="button">
        open menu
      </button>
      <button onClick={dismissMenuForRouteNavigation} type="button">
        dismiss menu
      </button>
      <button onClick={showSecondImage} type="button">
        show second image
      </button>
    </div>
  )
}

const harnessState = () => screen.getByText(/^mounted:/u).textContent

beforeEach(() => {
  gsapLoader.loadGsap.mockClear()
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
})

afterEach(() => {
  cleanup()
})

describe("navigation before the animation library has loaded", () => {
  it("keeps the library unloaded while the menu stays closed", () => {
    renderWithProviders(<NavigationHarness />)

    expect(gsapLoader.loadGsap).not.toHaveBeenCalled()
  })

  it("loads the library as soon as the menu opens", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))

    expect(gsapLoader.loadGsap).toHaveBeenCalled()
    expect(harnessState()).toBe("mounted:false open:true")
  })

  it("lets a route change close a menu that never got to animate", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "open menu" }))
    await userEvent.click(screen.getByRole("button", { name: "dismiss menu" }))

    expect(harnessState()).toBe("mounted:false open:false")
  })

  it("asks for the library when the pointer reaches a menu image first", async () => {
    renderWithProviders(<NavigationHarness />)

    await userEvent.click(screen.getByRole("button", { name: "show second image" }))

    expect(gsapLoader.loadGsap).toHaveBeenCalledTimes(1)
  })
})
