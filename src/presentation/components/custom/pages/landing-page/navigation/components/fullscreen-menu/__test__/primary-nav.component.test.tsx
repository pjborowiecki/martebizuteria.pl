import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const state = vi.hoisted((): { primary: readonly PrimaryItem[] | undefined } => ({ primary: undefined }))

const spies = vi.hoisted(() => ({
  dismissMenuForRouteNavigation: vi.fn(),
  handleHover: vi.fn(),
  handleNavigateToHash: vi.fn(),
}))

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-provider", () => ({
  useNavigation: () => spies,
}))
vi.mock(import("~/src/presentation/components/custom/pages/landing-page/navigation/constants"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    get PRIMARY() {
      return state.primary ?? actual.PRIMARY
    },
  }
})

import { PrimaryNav } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/primary-nav"
import { PRIMARY, type PrimaryItem } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

const menuLink = (position: number): HTMLElement => {
  const link = screen.getAllByRole("link")[position]
  if (link === undefined) {
    throw new Error(`the overlay menu rendered no link at position ${String(position)}`)
  }

  return link
}

beforeEach(() => {
  vi.clearAllMocks()
  state.primary = undefined
})

afterEach(cleanup)

describe("PrimaryNav", () => {
  it("names the overlay navigation for screen readers", () => {
    renderWithProviders(<PrimaryNav />)

    expect(screen.getByRole("navigation", { name: "Site navigation" })).toBeInTheDocument()
  })

  it("lists every primary destination as a link", () => {
    renderWithProviders(<PrimaryNav />)

    expect(screen.getAllByRole("link")).toHaveLength(PRIMARY.length)
  })

  it("numbers the destinations from one, padded to two digits", () => {
    renderWithProviders(<PrimaryNav />)

    expect(screen.getByText("01")).toBeInTheDocument()
    expect(screen.getByText("06")).toBeInTheDocument()
  })

  it("labels the destinations with the translated menu copy", () => {
    renderWithProviders(<PrimaryNav />)

    expect(menuLink(0)).toHaveTextContent("New arrivals")
    expect(menuLink(3)).toHaveTextContent("Collections")
    expect(menuLink(4)).toHaveTextContent("Products")
    expect(menuLink(5)).toHaveTextContent("Brand")
  })

  it("sets the alloy destinations apart with their italic suffixes", () => {
    renderWithProviders(<PrimaryNav />)

    expect(menuLink(1)).toHaveTextContent("Silver")
    expect(screen.getByText("925")).toHaveClass("italic")
    expect(menuLink(2)).toHaveTextContent("Gold")
    expect(screen.getByText("585")).toHaveClass("italic")
  })

  it("points each destination at its localized route", () => {
    renderWithProviders(<PrimaryNav />)

    expect(menuLink(0)).toHaveAttribute("href", "/collections/nowosci")
    expect(menuLink(1)).toHaveAttribute("href", "/collections/srebro-925")
    expect(menuLink(2)).toHaveAttribute("href", "/collections/zloto-585")
    expect(menuLink(3)).toHaveAttribute("href", "/collections")
    expect(menuLink(4)).toHaveAttribute("href", "/products")
    expect(menuLink(5)).toHaveAttribute("href", "/about")
  })

  it("closes the overlay when the shopper follows a destination", async () => {
    renderWithProviders(<PrimaryNav />)

    await userEvent.click(menuLink(5))

    expect(spies.dismissMenuForRouteNavigation).toHaveBeenCalled()
    expect(spies.handleNavigateToHash).not.toHaveBeenCalled()
  })

  it("reports which destination the pointer entered", async () => {
    renderWithProviders(<PrimaryNav />)

    await userEvent.hover(menuLink(2))

    expect(spies.handleHover).toHaveBeenCalledWith(2)
  })
})

describe("PrimaryNav for a destination on the landing page itself", () => {
  beforeEach(() => {
    state.primary = [{ hash: "#manifesto", image: "", labelKey: "menu.primary.brand", step: 1 }]
  })

  it("offers a button rather than a link, because the page does not change", () => {
    renderWithProviders(<PrimaryNav />)

    expect(screen.getByRole("button")).toHaveTextContent("Brand")
    expect(screen.queryByRole("link")).toBeNull()
  })

  it("scrolls to the section instead of navigating away", async () => {
    renderWithProviders(<PrimaryNav />)

    await userEvent.click(screen.getByRole("button"))

    expect(spies.handleNavigateToHash).toHaveBeenCalledWith("#manifesto")
    expect(spies.dismissMenuForRouteNavigation).not.toHaveBeenCalled()
  })

  it("reports the hover on the section link too", async () => {
    renderWithProviders(<PrimaryNav />)

    await userEvent.hover(screen.getByRole("button"))

    expect(spies.handleHover).toHaveBeenCalledWith(0)
  })
})
