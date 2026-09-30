import { type JSX, useEffect } from "react"

import { useWatch } from "react-hook-form"
import { useMap } from "react-map-gl/maplibre"

import { useInpost } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"

export const MapUpdater = (): JSX.Element => {
  const { points } = useInpost()
  const { current: map } = useMap()
  const { control } = useCheckoutForm()
  const selectedId = useWatch({
    control,
    name: "lockerId",
  })
  useEffect(() => {
    if (!map || !points || points.length <= MIN_POINTS_LENGTH) {
      return
    }

    const hasSelection = selectedId !== undefined && selectedId !== ""
    const selected = hasSelection ? points.find((point) => point.name === selectedId) : undefined
    if (selected) {
      map.flyTo({
        center: [selected.location.longitude, selected.location.latitude],
        duration: MAP_FITBOUNDS_DURATION,
        zoom: SELECTED_ZOOM,
      })

      return
    }

    const lats = points.map((point) => point.location.latitude)
    const lngs = points.map((point) => point.location.longitude)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      {
        duration: MAP_FITBOUNDS_DURATION,
        padding: MAP_PADDING,
      },
    )
  }, [map, points, selectedId])

  return <noscript />
}

const MAP_PADDING = 50

const MAP_FITBOUNDS_DURATION = 1000

const MIN_POINTS_LENGTH = 0

const SELECTED_ZOOM = 14
