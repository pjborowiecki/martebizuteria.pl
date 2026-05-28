import { useMemo, type JSX } from "react";

import { useWatch } from "react-hook-form";
import { useMap } from "react-map-gl/maplibre";

import { useInpost } from "~/src/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";

const MAP_PADDING = 50;
const MAP_FITBOUNDS_DURATION = 1000;
const MIN_POINTS_LENGTH = 0;
const SELECTED_ZOOM = 14;

export function MapUpdater(): JSX.Element {
  const { points } = useInpost();
  const { current: map } = useMap();
  const { control } = useCheckoutForm();
  const selectedId = useWatch({ control, name: "lockerId" });

  useMemo(() => {
    if (!map || !points || points.length <= MIN_POINTS_LENGTH) {
      return;
    }

    // If a locker is already chosen (e.g. reopening the picker), centre on it so
    // the shopper sees their selection rather than the whole city.
    const hasSelection = selectedId !== undefined && selectedId !== "";
    const selected = hasSelection ? points.find((p) => p.name === selectedId) : undefined;
    if (selected) {
      map.flyTo({
        center: [selected.location.longitude, selected.location.latitude],
        duration: MAP_FITBOUNDS_DURATION,
        zoom: SELECTED_ZOOM
      });
      return;
    }

    const lats = points.map((p) => p.location.latitude);
    const lngs = points.map((p) => p.location.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat]
      ],
      { duration: MAP_FITBOUNDS_DURATION, padding: MAP_PADDING }
    );
  }, [map, points, selectedId]);

  return <noscript />;
}
