import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

const inpost = vi.hoisted(() => ({
  cityInput: "",
  isLoading: false,
  points: undefined as readonly { name: string }[] | undefined,
  setCityInput: vi.fn<(value: string) => void>(),
}))

vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider", () => ({
  useInpost: () => inpost,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-sidebar-item", () => ({
  InpostSidebarItem: ({ point }: Readonly<{ point: { name: string } }>) => <li>{`locker ${point.name}`}</li>,
}))

import { InpostSidebar } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-sidebar"

const lockerPoint = (name: string): InpostPointParsed => ({
  address_details: { building_number: "12", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "",
  name,
})

const cityField = () => screen.getByPlaceholderText("Enter city name...")

beforeEach(() => {
  vi.clearAllMocks()
  inpost.cityInput = ""
  inpost.isLoading = false
  inpost.points = undefined
})

afterEach(cleanup)

describe("InpostSidebar city field", () => {
  it("shows the city the shopper has already typed", () => {
    inpost.cityInput = "Warszawa"
    renderWithProviders(<InpostSidebar />)

    expect(cityField()).toHaveValue("Warszawa")
  })

  it("reports each keystroke so the locker search can follow", async () => {
    inpost.cityInput = "Warsz"
    renderWithProviders(<InpostSidebar />)

    await userEvent.type(cityField(), "a")

    expect(inpost.setCityInput).toHaveBeenCalledWith("Warsza")
  })
})

describe("InpostSidebar guidance", () => {
  it("asks for more letters while the city is too short to search", () => {
    inpost.cityInput = "Wa"
    renderWithProviders(<InpostSidebar />)

    expect(screen.getByText("Enter at least 3 characters...")).toBeInTheDocument()
  })

  it("says nothing while the field is still empty", () => {
    renderWithProviders(<InpostSidebar />)

    expect(screen.queryByText("Enter at least 3 characters...")).toBeNull()
    expect(screen.queryByText("No parcel lockers found in this city.")).toBeNull()
  })

  it("announces the search while lockers are being fetched for a searchable city", () => {
    inpost.cityInput = "Warszawa"
    inpost.isLoading = true
    renderWithProviders(<InpostSidebar />)

    expect(screen.getByText("Searching for lockers...")).toBeInTheDocument()
  })

  it("stays quiet while a too short city is loading", () => {
    inpost.cityInput = "Wa"
    inpost.isLoading = true
    renderWithProviders(<InpostSidebar />)

    expect(screen.queryByText("Searching for lockers...")).toBeNull()
  })

  it("reports an empty result for a city with no lockers", () => {
    inpost.cityInput = "Warszawa"
    inpost.points = []
    renderWithProviders(<InpostSidebar />)

    expect(screen.getByText("No parcel lockers found in this city.")).toBeInTheDocument()
  })

  it("reports nothing before the first search has returned", () => {
    inpost.cityInput = "Warszawa"
    renderWithProviders(<InpostSidebar />)

    expect(screen.queryByText("No parcel lockers found in this city.")).toBeNull()
  })
})

describe("InpostSidebar results", () => {
  it("lists one row per locker the search found", () => {
    inpost.cityInput = "Warszawa"
    inpost.points = [lockerPoint("WAW01A"), lockerPoint("WAW02B")]
    renderWithProviders(<InpostSidebar />)

    expect(screen.getByText("locker WAW01A")).toBeInTheDocument()
    expect(screen.getByText("locker WAW02B")).toBeInTheDocument()
  })

  it("shows the results instead of the empty notice", () => {
    inpost.cityInput = "Warszawa"
    inpost.points = [lockerPoint("WAW01A")]
    renderWithProviders(<InpostSidebar />)

    expect(screen.queryByText("No parcel lockers found in this city.")).toBeNull()
  })

  it("keeps a scroll gesture over the list from reaching the map behind it", () => {
    inpost.cityInput = "Warszawa"
    inpost.points = [lockerPoint("WAW01A")]
    const { container } = renderWithProviders(<InpostSidebar />)
    const scroller = container.querySelector(".overscroll-contain")
    if (scroller === null) {
      throw new Error("the locker list has no scroll container")
    }

    const wheel = new Event("wheel", { bubbles: true, cancelable: true })
    const stopped = vi.spyOn(wheel, "stopPropagation")
    fireEvent(scroller, wheel)

    expect(stopped).toHaveBeenCalledTimes(1)
  })

  it("keeps a touch drag over the list from panning the map behind it", () => {
    inpost.cityInput = "Warszawa"
    inpost.points = [lockerPoint("WAW01A")]
    const { container } = renderWithProviders(<InpostSidebar />)
    const scroller = container.querySelector(".overscroll-contain")
    if (scroller === null) {
      throw new Error("the locker list has no scroll container")
    }

    const touchMove = new Event("touchmove", { bubbles: true, cancelable: true })
    const stopped = vi.spyOn(touchMove, "stopPropagation")
    fireEvent(scroller, touchMove)

    expect(stopped).toHaveBeenCalledTimes(1)
  })
})
