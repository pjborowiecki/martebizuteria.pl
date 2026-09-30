import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { PointDetails } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-point-details"

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

const spansOf = (container: HTMLElement): (string | null)[] => [...container.querySelectorAll("span")].map((span) => span.textContent)

afterEach(() => {
  cleanup()
})

describe("PointDetails", () => {
  it("shows the locker code and its street address", () => {
    const { container } = render(<PointDetails point={point()} />)

    expect(spansOf(container)).toStrictEqual(["WAW01A", "Kwiatowa 12, Warszawa"])
  })

  it("omits the building number when the locker has none", () => {
    const details = { building_number: null, city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" }
    const { container } = render(<PointDetails point={point({ address_details: details })} />)

    expect(spansOf(container)).toStrictEqual(["WAW01A", "Kwiatowa, Warszawa"])
  })

  it("omits an empty building number just like a missing one", () => {
    const details = { building_number: "", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" }
    const { container } = render(<PointDetails point={point({ address_details: details })} />)

    expect(spansOf(container)).toStrictEqual(["WAW01A", "Kwiatowa, Warszawa"])
  })

  it("adds the location hint as a third line when the API supplied one", () => {
    const { container } = render(<PointDetails point={point({ location_description: "przy wejściu do sklepu" })} />)

    expect(spansOf(container)).toStrictEqual(["WAW01A", "Kwiatowa 12, Warszawa", "przy wejściu do sklepu"])
  })

  it("renders no hint line at all for a blank location description", () => {
    const { container } = render(<PointDetails point={point()} />)

    expect(container.querySelectorAll("span")).toHaveLength(2)
  })
})
