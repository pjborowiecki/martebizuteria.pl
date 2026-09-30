import { type JSX } from "react"

import { cleanup } from "@testing-library/react"
import { type Control, useForm } from "react-hook-form"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface LockerForm {
  lockerId: string
}

interface MapStub {
  readonly fitBounds: ReturnType<typeof vi.fn>
  readonly flyTo: ReturnType<typeof vi.fn>
}

const harness = vi.hoisted(() => ({
  form: {} as { control?: Control<LockerForm> },
  map: undefined as unknown,
  points: undefined as unknown,
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({ control: harness.form.control }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider", () => ({
  useInpost: () => ({ points: harness.points }),
}))
vi.mock("react-map-gl/maplibre", () => ({
  useMap: () => ({ current: harness.map }),
}))

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { MapUpdater } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-map-updater"

const point = (name: string, latitude: number, longitude: number): InpostPointParsed => ({
  address_details: { building_number: "12", city: "Warszawa", post_code: "00-001", province: "mazowieckie", street: "Kwiatowa" },
  location: { latitude, longitude },
  location_description: "",
  name,
})

const WARSAW = point("WAW01A", 52.23, 21.01)

const KRAKOW = point("KRA02B", 50.06, 19.94)

const GDANSK = point("GDA03C", 54.35, 18.65)

const MapHarness = ({ lockerId = "" }: Readonly<{ lockerId?: string }>): JSX.Element => {
  const { control } = useForm<LockerForm>({ defaultValues: { lockerId } })
  harness.form.control = control

  return <MapUpdater />
}

const createMapStub = (): MapStub => ({ fitBounds: vi.fn(), flyTo: vi.fn() })

beforeEach(() => {
  cleanup()
  harness.map = undefined
  harness.points = undefined
})

describe("MapUpdater without anything to show", () => {
  it("renders nothing visible", () => {
    const { container } = renderWithProviders(<MapHarness />)

    expect(container.querySelector("noscript")).not.toBeNull()
  })

  it("leaves the map alone while it has not loaded yet", () => {
    harness.points = [WARSAW, KRAKOW]
    renderWithProviders(<MapHarness />)

    expect(harness.map).toBeUndefined()
  })

  it("leaves the map alone while the points are still loading", () => {
    const map = createMapStub()
    harness.map = map
    renderWithProviders(<MapHarness />)

    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it("leaves the map alone when the search found no lockers", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = []
    renderWithProviders(<MapHarness />)

    expect(map.fitBounds).not.toHaveBeenCalled()
  })
})

describe("MapUpdater framing the results", () => {
  it("fits the map around every locker the search returned", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = [WARSAW, KRAKOW, GDANSK]
    renderWithProviders(<MapHarness />)

    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [18.65, 50.06],
        [21.01, 54.35],
      ],
      { duration: 1000, padding: 50 },
    )
    expect(map.flyTo).not.toHaveBeenCalled()
  })

  it("still fits the bounds around a single locker", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = [WARSAW]
    renderWithProviders(<MapHarness />)

    expect(map.fitBounds).toHaveBeenCalledWith(
      [
        [21.01, 52.23],
        [21.01, 52.23],
      ],
      { duration: 1000, padding: 50 },
    )
  })

  it("falls back to the bounds when the chosen locker is not in the results", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = [WARSAW, KRAKOW]
    renderWithProviders(<MapHarness lockerId="POZ99Z" />)

    expect(map.fitBounds).toHaveBeenCalledTimes(1)
    expect(map.flyTo).not.toHaveBeenCalled()
  })
})

describe("MapUpdater following the selection", () => {
  it("flies to the locker the shopper picked", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = [WARSAW, KRAKOW]
    renderWithProviders(<MapHarness lockerId="KRA02B" />)

    expect(map.flyTo).toHaveBeenCalledWith({ center: [19.94, 50.06], duration: 1000, zoom: 14 })
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it("treats an empty selection as no selection at all", () => {
    const map = createMapStub()
    harness.map = map
    harness.points = [WARSAW, KRAKOW]
    renderWithProviders(<MapHarness lockerId="" />)

    expect(map.flyTo).not.toHaveBeenCalled()
    expect(map.fitBounds).toHaveBeenCalledTimes(1)
  })
})
