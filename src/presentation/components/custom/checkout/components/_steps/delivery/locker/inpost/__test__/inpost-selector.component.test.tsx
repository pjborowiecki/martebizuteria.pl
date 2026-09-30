import { type JSX, type ReactNode } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, type UseFormSetValue, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface LockerForm {
  lockerCity: string
  lockerId: string
}

const { fetchPointsByCity, form, mapClicks } = vi.hoisted(() => ({
  fetchPointsByCity: vi.fn<(city: string) => Promise<unknown[]>>(),
  form: {} as { control?: Control<LockerForm>; setValue?: UseFormSetValue<LockerForm> },
  mapClicks: { handler: undefined as (() => void) | undefined },
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({ control: form.control, setValue: form.setValue }),
}))
vi.mock("~/src/integrations/inpost/inpost.api", () => ({ fetchPointsByCity: (city: string) => fetchPointsByCity(city) }))
vi.mock("react-map-gl/maplibre", () => ({
  Marker: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: Readonly<{ children: ReactNode }>) => <div data-testid="popup">{children}</div>,
  default: ({ children, onClick }: Readonly<{ children: ReactNode; onClick: () => void }>) => {
    mapClicks.handler = onClick

    return (
      <div data-testid="map" onClick={onClick} role="presentation">
        {children}
      </div>
    )
  },
  useMap: () => ({ current: undefined }),
}))

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { InpostSelector } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-selector"

afterEach(cleanup)

const point = (name: string, city: string): InpostPointParsed => ({
  address_details: {
    building_number: "12",
    city,
    post_code: "00-001",
    province: "mazowieckie",
    street: "Kwiatowa",
  },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "",
  name,
})

const SelectorHarness = ({
  lockerCity = "",
  lockerId = "",
  hasSavedCity = true,
}: Readonly<{ lockerCity?: string; lockerId?: string; hasSavedCity?: boolean }>): JSX.Element => {
  const { control, setValue } = useForm<LockerForm>({ defaultValues: { ...(hasSavedCity ? { lockerCity } : {}), lockerId } })
  form.control = control
  form.setValue = setValue
  const selection = useWatch({ control })

  return (
    <div>
      <InpostSelector />
      <output data-testid="locker-id">{selection.lockerId}</output>
    </div>
  )
}

const open = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Select Parcel Locker" }))
}

beforeEach(() => {
  fetchPointsByCity.mockReset()
  fetchPointsByCity.mockResolvedValue([point("WAW01A", "Warszawa")])
  mapClicks.handler = undefined
})

describe("InpostSelector", () => {
  it("offers the locker picker behind a labelled trigger", () => {
    renderWithProviders(<SelectorHarness />)

    expect(screen.getByRole("button", { name: "Select Parcel Locker" })).toBeInTheDocument()
    expect(screen.queryByTestId("map")).not.toBeInTheDocument()
  })

  it("opens a dialog that names the parcel locker choice for screen readers", async () => {
    renderWithProviders(<SelectorHarness />)

    await open()

    expect(await screen.findByText("Parcel Locker")).toBeInTheDocument()
    expect(screen.getByText("Have your package delivered to a secure parcel locker (e.g. InPost Paczkomat).")).toBeInTheDocument()
  })

  it("shows the city search and the map side by side once opened", async () => {
    renderWithProviders(<SelectorHarness />)

    await open()

    expect(await screen.findByPlaceholderText("Enter city name...")).toBeInTheDocument()
    expect(screen.getByTestId("map")).toBeInTheDocument()
  })

  it("asks for a longer city name before searching", async () => {
    renderWithProviders(<SelectorHarness lockerCity="Wa" />)

    await open()

    expect(await screen.findByText("Enter at least 3 characters...")).toBeInTheDocument()
    expect(fetchPointsByCity).not.toHaveBeenCalled()
  })

  it("starts with a blank search when the checkout draft has no saved locker city", async () => {
    renderWithProviders(<SelectorHarness hasSavedCity={false} />)

    await open()

    expect(await screen.findByPlaceholderText("Enter city name...")).toHaveValue("")
    expect(fetchPointsByCity).not.toHaveBeenCalled()
  })

  it("seeds the search with the city already stored on the checkout form", async () => {
    renderWithProviders(<SelectorHarness lockerCity="Warszawa" />)

    await open()

    await waitFor(() => {
      expect(fetchPointsByCity).toHaveBeenCalledWith("Warszawa")
    })
    expect(await screen.findByPlaceholderText("Enter city name...")).toHaveValue("Warszawa")
  })

  it("plots one marker per locker returned for the city", async () => {
    fetchPointsByCity.mockResolvedValue([point("WAW01A", "Warszawa"), point("WAW02B", "Warszawa")])
    renderWithProviders(<SelectorHarness lockerCity="Warszawa" />)

    await open()

    await waitFor(() => {
      expect(screen.getAllByTestId("marker")).toHaveLength(2)
    })
  })

  it("reports that a city has no lockers", async () => {
    fetchPointsByCity.mockResolvedValue([])
    renderWithProviders(<SelectorHarness lockerCity="Warszawa" />)

    await open()

    expect(await screen.findByText("No parcel lockers found in this city.")).toBeInTheDocument()
    expect(screen.queryAllByTestId("marker")).toHaveLength(0)
  })

  it("clears the chosen locker when the customer clicks the bare map", async () => {
    renderWithProviders(<SelectorHarness lockerCity="Warszawa" lockerId="WAW01A" />)
    await open()
    await waitFor(() => {
      expect(screen.getByTestId("map")).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId("map"))

    expect(screen.getByTestId("locker-id")).toBeEmptyDOMElement()
  })
})
