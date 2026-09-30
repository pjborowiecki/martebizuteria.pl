import { type JSX } from "react"

import { cleanup, render, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { scrollToSectionById } = vi.hoisted(() => ({
  scrollToSectionById: vi.fn<(id: string, offset: number) => HTMLElement | undefined>(),
}))

vi.mock("~/src/integrations/lenis/lenis.scroll", () => ({ scrollToSectionById, scrollToSectionElement: vi.fn() }))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { HEADER_OFFSET_PX } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-constants"
import {
  NavigationProvider,
  useNavigation,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider"
import { useNavigationStore } from "~/src/presentation/components/custom/pages/landing-page/navigation/store/navigation-store"

const NavigationProbe = ({ hash }: Readonly<{ hash: string }>): JSX.Element => {
  const { handleClose, handleNavigateToHash, menuOpen } = useNavigation()

  return (
    <div>
      <span>{menuOpen ? "menu open" : "menu closed"}</span>
      <button
        type="button"
        onClick={() => {
          handleNavigateToHash(hash)
        }}
      >
        navigate
      </button>
      <button type="button" onClick={handleClose}>
        close
      </button>
    </div>
  )
}

const renderProvider = (hash: string) =>
  renderWithProviders(
    <NavigationProvider>
      <NavigationProbe hash={hash} />
    </NavigationProvider>,
  )

const navigateWith = async (hash: string) => {
  const rendered = renderProvider(hash)
  const navigate = vi.spyOn(rendered.router, "navigate").mockResolvedValue(undefined)

  await userEvent.click(screen.getByRole("button", { name: "navigate" }))

  return navigate
}

beforeEach(() => {
  vi.clearAllMocks()
  useNavigationStore.setState({ menuOpen: false, pendingHash: undefined, scrolled: false, searchOpen: false })
  scrollToSectionById.mockReturnValue(document.createElement("section"))
})

afterEach(() => {
  cleanup()
})

describe("NavigationProvider hash navigation", () => {
  it("scrolls to the section the hash names, leaving the header visible", async () => {
    await navigateWith("#atelier")

    expect(scrollToSectionById).toHaveBeenCalledWith("atelier", HEADER_OFFSET_PX)
  })

  it("accepts a hash that carries no leading marker", async () => {
    await navigateWith("atelier")

    expect(scrollToSectionById).toHaveBeenCalledWith("atelier", HEADER_OFFSET_PX)
  })

  it("navigates home with the hash when the section is not on the current page", async () => {
    scrollToSectionById.mockReturnValue(undefined)

    const navigate = await navigateWith("#atelier")

    expect(navigate).toHaveBeenCalledWith({ hash: "atelier", to: "/" })
  })

  it("defers the scroll until the menu has closed while the menu is open", async () => {
    useNavigationStore.setState({ menuOpen: true })

    await navigateWith("#atelier")

    expect(scrollToSectionById).not.toHaveBeenCalled()
    expect(useNavigationStore.getState().pendingHash).toBe("atelier")
    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })
})

describe("NavigationProvider route navigation", () => {
  it("routes to a static page instead of scrolling", async () => {
    const navigate = await navigateWith("/about")

    expect(navigate).toHaveBeenCalledWith({ to: "/about" })
    expect(scrollToSectionById).not.toHaveBeenCalled()
  })

  it("routes to the home page for a path it does not know", async () => {
    const navigate = await navigateWith("/nowhere")

    expect(navigate).toHaveBeenCalledWith({ to: "/" })
  })

  it("carries the parameters of a parametric path", async () => {
    const navigate = await navigateWith("/products/bransoletka-aurora")

    expect(navigate).toHaveBeenCalledWith({ params: { handle: "bransoletka-aurora" }, to: "/products/$handle" })
  })

  it("closes the menu before leaving the page", async () => {
    useNavigationStore.setState({ menuOpen: true })

    await navigateWith("/about")

    expect(useNavigationStore.getState().menuOpen).toBe(false)
  })
})

describe("NavigationProvider menu", () => {
  it("closes an open menu", async () => {
    useNavigationStore.setState({ menuOpen: true })
    renderProvider("#atelier")

    expect(screen.getByText("menu open")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "close" }))

    expect(screen.getByText("menu closed")).toBeInTheDocument()
  })
})

describe("useNavigation", () => {
  it("refuses to be used outside the provider", () => {
    const failed = vi.fn()

    try {
      render(<NavigationProbe hash="#atelier" />)
    } catch (error: unknown) {
      failed(error instanceof Error ? error.message : String(error))
    }

    expect(failed).toHaveBeenCalledWith("useNavigation must be used within NavigationProvider")
  })
})
