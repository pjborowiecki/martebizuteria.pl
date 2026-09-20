import { type JSX, useMemo } from "react"

import { Popup } from "react-map-gl/maplibre"

import { useInpost } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider"
export const HoveredPointPopup = (): JSX.Element | undefined => {
  const { points, hoveredPointId } = useInpost()
  const hoveredPoint = useMemo(() => points?.find((point) => point.name === hoveredPointId), [points, hoveredPointId])
  if (!hoveredPoint) {
    return
  }
  return (
    <Popup
      anchor="top"
      closeButton={false}
      closeOnClick={false}
      latitude={hoveredPoint.location.latitude}
      longitude={hoveredPoint.location.longitude}
      maxWidth="320px"
      offset={POPUP_OFFSET}
    >
      <div className="flex flex-col gap-1.5 font-sans">
        <div className="flex items-start justify-between gap-4">
          <p className="m-0 leading-tight font-bold">{hoveredPoint.name}</p>
          {hoveredPoint.status === "Operating" && (
            <span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 uppercase">
              Aktywny
            </span>
          )}
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          {hoveredPoint.address_details.street}
          {hoveredPoint.address_details.building_number !== null && hoveredPoint.address_details.building_number !== ""
            ? ` ${hoveredPoint.address_details.building_number}`
            : ""}
          , {hoveredPoint.address_details.city}
        </p>

        {(hoveredPoint.opening_hours ?? hoveredPoint.location_type ?? hoveredPoint.payment_available) !== undefined && (
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground/80">
            {hoveredPoint.opening_hours !== undefined && (
              <span className="rounded-sm bg-muted/50 px-1.5 py-0.5">{hoveredPoint.opening_hours}</span>
            )}
            {hoveredPoint.location_type !== undefined && (
              <span className="rounded-sm bg-muted/50 px-1.5 py-0.5">{hoveredPoint.location_type}</span>
            )}
            {hoveredPoint.payment_available === true && <span className="rounded-sm bg-muted/50 px-1.5 py-0.5">Płatność kartą</span>}
          </div>
        )}

        {hoveredPoint.location_description !== "" && (
          <p className="mt-1 mb-0 text-[10px] leading-tight text-muted-foreground">{hoveredPoint.location_description}</p>
        )}
        <p className="mt-2 mb-0 text-[10px] font-medium text-primary">Kliknij, aby wybrać ten punkt</p>
      </div>
    </Popup>
  )
}
const POPUP_OFFSET = 10
