import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import {
  InpostProvider,
  useInpost,
} from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider"

const fetchPointsByCity = vi.fn<(city: string) => Promise<InpostPointParsed[]>>()

vi.mock("~/src/integrations/inpost/inpost.api", () => ({ fetchPointsByCity: (city: string) => fetchPointsByCity(city) }))

const lockerPoint = (name: string): InpostPointParsed => ({
  address_details: {
    building_number: "12",
    city: "Warszawa",
    post_code: "00-001",
    province: "mazowieckie",
    street: "Kwiatowa",
  },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "",
  name,
})

const InpostProbe = (): JSX.Element => {
  const { cityInput, hoveredPointId, isLoading, points, setCityInput, setHoveredPointId } = useInpost()

  return (
    <div>
      <output data-testid="city">{cityInput}</output>
      <output data-testid="hovered">{hoveredPointId ?? "none"}</output>
      <output data-testid="loading">{isLoading ? "loading" : "idle"}</output>
      <output data-testid="points">{points?.map((point) => point.name).join(",") ?? "none"}</output>
      <button
        onClick={() => {
          setCityInput("Warszawa")
        }}
        type="button"
      >
        search
      </button>
      <button
        onClick={() => {
          setHoveredPointId("WAW01A")
        }}
        type="button"
      >
        hover
      </button>
    </div>
  )
}

beforeEach(() => {
  fetchPointsByCity.mockReset()
  fetchPointsByCity.mockResolvedValue([lockerPoint("WAW01A"), lockerPoint("WAW02B")])
})

afterEach(() => {
  cleanup()
})

describe("useInpost", () => {
  it("refuses to be used outside the provider", () => {
    expect(() => renderWithProviders(<InpostProbe />)).toThrow("useInpost must be used within a InpostProvider")
  })
})

describe("InpostProvider", () => {
  it("starts with an empty city and no lockers when no initial city is given", () => {
    renderWithProviders(
      <InpostProvider>
        <InpostProbe />
      </InpostProvider>,
    )

    expect(screen.getByTestId("city")).toHaveTextContent("")
    expect(screen.getByTestId("points")).toHaveTextContent("none")
    expect(fetchPointsByCity).not.toHaveBeenCalled()
  })

  it("does not look up lockers for a city name shorter than three characters", () => {
    renderWithProviders(
      <InpostProvider initialCity="Wa">
        <InpostProbe />
      </InpostProvider>,
    )

    expect(screen.getByTestId("city")).toHaveTextContent("Wa")
    expect(fetchPointsByCity).not.toHaveBeenCalled()
  })

  it("looks up the lockers of the initial city and exposes them", async () => {
    renderWithProviders(
      <InpostProvider initialCity="Warszawa">
        <InpostProbe />
      </InpostProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId("points")).toHaveTextContent("WAW01A,WAW02B")
    })
    expect(fetchPointsByCity).toHaveBeenCalledWith("Warszawa")
  })

  it("trims the initial city before searching for it", async () => {
    renderWithProviders(
      <InpostProvider initialCity="  Warszawa  ">
        <InpostProbe />
      </InpostProvider>,
    )

    await waitFor(() => {
      expect(fetchPointsByCity).toHaveBeenCalledWith("Warszawa")
    })
  })

  it("reflects a typed city immediately and searches for it once the input settles", async () => {
    renderWithProviders(
      <InpostProvider>
        <InpostProbe />
      </InpostProvider>,
    )

    await userEvent.click(screen.getByRole("button", { name: "search" }))

    expect(screen.getByTestId("city")).toHaveTextContent("Warszawa")
    expect(fetchPointsByCity).not.toHaveBeenCalled()

    await waitFor(
      () => {
        expect(fetchPointsByCity).toHaveBeenCalledWith("Warszawa")
      },
      { timeout: 2000 },
    )
  })

  it("remembers which locker the map is hovering over", async () => {
    renderWithProviders(
      <InpostProvider>
        <InpostProbe />
      </InpostProvider>,
    )

    expect(screen.getByTestId("hovered")).toHaveTextContent("none")

    await userEvent.click(screen.getByRole("button", { name: "hover" }))

    expect(screen.getByTestId("hovered")).toHaveTextContent("WAW01A")
  })
})
