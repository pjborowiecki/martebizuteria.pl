import { type JSX, type ReactNode } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, type UseFormSetValue, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface LockerForm {
  lockerId: string
}

const { form, markerProps, setHoveredPointId } = vi.hoisted(() => ({
  form: {} as { control?: Control<LockerForm>; setValue?: UseFormSetValue<LockerForm> },
  markerProps: [] as { anchor: string; latitude: number; longitude: number }[],
  setHoveredPointId: vi.fn<(value: string | undefined) => void>(),
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({ control: form.control, setValue: form.setValue }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider", () => ({
  useInpost: () => ({ setHoveredPointId }),
}))
vi.mock("react-map-gl/maplibre", () => ({
  Marker: ({
    anchor,
    children,
    latitude,
    longitude,
  }: Readonly<{ anchor: string; children: ReactNode; latitude: number; longitude: number }>) => {
    markerProps.push({ anchor, latitude, longitude })

    return <div data-testid="marker">{children}</div>
  },
}))

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { Dialog } from "~/src/presentation/components/shadcn/dialog"

import { InpostMarker } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-marker"

afterEach(cleanup)

const point: InpostPointParsed = {
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
}

const MarkerHarness = ({ lockerId = "" }: Readonly<{ lockerId?: string }>): JSX.Element => {
  const { control, setValue } = useForm<LockerForm>({ defaultValues: { lockerId } })
  form.control = control
  form.setValue = setValue
  const selection = useWatch({ control })

  return (
    <div
      onClick={() => {
        outerClicks.count += 1
      }}
      role="presentation"
    >
      <Dialog defaultOpen>
        <InpostMarker point={point} />
      </Dialog>
      <output data-testid="locker-id">{selection.lockerId}</output>
    </div>
  )
}

const outerClicks = { count: 0 }

beforeEach(() => {
  markerProps.length = 0
  outerClicks.count = 0
  setHoveredPointId.mockReset()
})

describe("InpostMarker", () => {
  it("anchors the marker at the locker coordinates", () => {
    renderWithProviders(<MarkerHarness />)

    expect(markerProps.at(0)).toStrictEqual({ anchor: "bottom", latitude: 52.23, longitude: 21.01 })
  })

  it("stores the locker and keeps the click away from the map", async () => {
    renderWithProviders(<MarkerHarness />)

    await userEvent.click(screen.getByRole("button"))

    expect(screen.getByTestId("locker-id")).toHaveTextContent("WAW01A")
    expect(outerClicks.count).toBe(0)
  })

  it("reports the hovered locker to the map and clears it on leave", async () => {
    renderWithProviders(<MarkerHarness />)

    await userEvent.hover(screen.getByRole("button"))

    expect(setHoveredPointId).toHaveBeenLastCalledWith("WAW01A")

    await userEvent.unhover(screen.getByRole("button"))

    expect(setHoveredPointId).toHaveBeenLastCalledWith(undefined)
  })

  it("draws an unselected locker in the neutral palette", () => {
    renderWithProviders(<MarkerHarness />)

    expect(screen.getByRole("button")).toHaveClass("bg-foreground")
  })

  it("draws the stored locker in the primary palette", () => {
    renderWithProviders(<MarkerHarness lockerId="WAW01A" />)

    const button = screen.getByRole("button")

    expect(button).toHaveClass("bg-primary")
    expect(button).not.toHaveClass("bg-foreground")
  })
})
