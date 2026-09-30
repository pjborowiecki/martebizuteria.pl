import { type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

interface PopupProps {
  readonly anchor: string
  readonly latitude: number
  readonly longitude: number
  readonly maxWidth: string
  readonly offset: number
}

const { inpost, popupProps } = vi.hoisted(() => ({
  inpost: { hoveredPointId: undefined as string | undefined, points: undefined as unknown[] | undefined },
  popupProps: [] as PopupProps[],
}))

vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider", () => ({
  useInpost: () => ({ hoveredPointId: inpost.hoveredPointId, points: inpost.points }),
}))
vi.mock("react-map-gl/maplibre", () => ({
  Popup: ({ anchor, children, latitude, longitude, maxWidth, offset }: Readonly<PopupProps & { children: ReactNode }>) => {
    popupProps.push({ anchor, latitude, longitude, maxWidth, offset })

    return <div data-testid="popup">{children}</div>
  },
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { HoveredPointPopup } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-popup"

const point = (overrides: Partial<InpostPointParsed> = {}): InpostPointParsed => ({
  address_details: {
    building_number: "12",
    city: "Warszawa",
    post_code: "00-001",
    province: "mazowieckie",
    street: "Kwiatowa",
  },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "",
  name: "WAW01A",
  ...overrides,
})

const hover = (overrides: Partial<InpostPointParsed> = {}) => {
  inpost.points = [point(overrides)]
  inpost.hoveredPointId = "WAW01A"

  return renderWithProviders(<HoveredPointPopup />)
}

beforeEach(() => {
  popupProps.length = 0
  inpost.points = undefined
  inpost.hoveredPointId = undefined
})

afterEach(() => {
  cleanup()
})

describe("HoveredPointPopup visibility", () => {
  it("renders nothing while no locker is hovered", () => {
    inpost.points = [point()]

    const { container } = renderWithProviders(<HoveredPointPopup />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing before the lockers have loaded", () => {
    inpost.hoveredPointId = "WAW01A"

    const { container } = renderWithProviders(<HoveredPointPopup />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing when the hovered id matches no locker", () => {
    inpost.points = [point()]
    inpost.hoveredPointId = "WAW99Z"

    const { container } = renderWithProviders(<HoveredPointPopup />)

    expect(container).toBeEmptyDOMElement()
  })

  it("anchors the popup above the hovered locker's coordinates", () => {
    hover()

    expect(popupProps).toStrictEqual([{ anchor: "top", latitude: 52.23, longitude: 21.01, maxWidth: "320px", offset: 10 }])
  })
})

describe("HoveredPointPopup contents", () => {
  it("names the locker and spells out its street address", () => {
    hover()

    expect(screen.getByText("WAW01A")).toBeInTheDocument()
    expect(screen.getByText("Kwiatowa 12, Warszawa")).toBeInTheDocument()
  })

  it("drops the building number when the locker has none", () => {
    hover({
      address_details: { building_number: null, city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" },
    })

    expect(screen.getByText("Kwiatowa, Warszawa")).toBeInTheDocument()
  })

  it("treats an empty building number like a missing one", () => {
    hover({ address_details: { building_number: "", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" } })

    expect(screen.getByText("Kwiatowa, Warszawa")).toBeInTheDocument()
  })

  it("always invites the shopper to pick the locker", () => {
    hover()

    expect(screen.getByText("Click to choose this point")).toBeInTheDocument()
  })

  it("marks an operating locker as active", () => {
    hover({ status: "Operating" })

    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("leaves a locker that is not operating unmarked", () => {
    hover({ status: "Nonoperating" })

    expect(screen.queryByText("Active")).not.toBeInTheDocument()
  })

  it("shows the opening hours and the locker type as chips", () => {
    hover({ location_type: "Parking", opening_hours: "24/7" })

    expect(screen.getByText("24/7")).toBeInTheDocument()
    expect(screen.getByText("Parking")).toBeInTheDocument()
  })

  it("mentions card payment only where it is available", () => {
    hover({ payment_available: true })

    expect(screen.getByText("Card payment")).toBeInTheDocument()
  })

  it("stays silent about card payment where it is not available", () => {
    hover({ payment_available: false })

    expect(screen.queryByText("Card payment")).not.toBeInTheDocument()
  })

  it("shows no chips at all for a locker with no extra details", () => {
    const { container } = hover()

    expect(container.querySelectorAll("span")).toHaveLength(0)
  })

  it("adds the location hint when the API supplied one", () => {
    hover({ location_description: "przy wejściu do sklepu" })

    expect(screen.getByText("przy wejściu do sklepu")).toBeInTheDocument()
  })
})
