import { type JSX, useCallback, useMemo, useState } from "react"

import { MapPin } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import { useWatch } from "react-hook-form"
import Map from "react-map-gl/maplibre"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/src/presentation/components/shadcn/dialog"

import { MapUpdater } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-map-updater"
import { InpostMarker } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-marker"
import { HoveredPointPopup } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-popup"
import {
  InpostProvider,
  useInpost,
} from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider"
import { InpostSidebar } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-sidebar"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"

const InpostMapContent = (): JSX.Element => {
  const { setValue } = useCheckoutForm()
  const { points } = useInpost()
  const handleMapClick = useCallback(() => {
    setValue("lockerId", "")
  }, [setValue])

  return (
    <div className="relative z-0 flex-1 bg-muted/20">
      <Map
        attributionControl={false}
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={MAP_STYLE}
        maxBounds={MAX_BOUNDS}
        onClick={handleMapClick}
        style={MAP_CONTAINER_STYLE}
      >
        <MapUpdater />

        {points?.map((point) => (
          <InpostMarker key={point.name} point={point} />
        ))}

        <HoveredPointPopup />
      </Map>
    </div>
  )
}

export const InpostSelector = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)
  const t = useTranslations("pages.checkout.checkoutForm")
  const { control } = useCheckoutForm()
  const lockerCity = useWatch({
    control,
    name: "lockerCity",
  })

  const triggerRender = useMemo(
    () => (
      <Button className="w-full cursor-pointer gap-2 rounded-none border-border/50 py-6 tracking-widest uppercase" variant="secondary" />
    ),
    [],
  )

  return (
    <InpostProvider initialCity={lockerCity ?? ""}>
      <Dialog onOpenChange={setIsOpen} open={isOpen}>
        <DialogTrigger render={triggerRender}>
          <MapPin className="size-4" />
          {t("selectLocker")}
        </DialogTrigger>

        <DialogContent className="flex h-[80vh] w-[95vw] flex-row gap-0 overflow-hidden p-0 sm:max-w-5xl md:max-w-6xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("deliveryMethods.locker")}</DialogTitle>
            <DialogDescription>{t("deliverySubsteps.lockerText")}</DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 w-[350px] shrink-0 flex-col overflow-hidden border-r bg-background">
            <InpostSidebar />
          </div>

          <InpostMapContent />
        </DialogContent>
      </Dialog>
    </InpostProvider>
  )
}

const MAP_CENTER_LAT = 52.0693

const MAP_CENTER_LNG = 19.4803

const MAP_ZOOM_DEFAULT = 6

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"

const MAP_CONTAINER_STYLE = {
  height: "100%",
  width: "100%",
}

const INITIAL_VIEW_STATE = {
  latitude: MAP_CENTER_LAT,
  longitude: MAP_CENTER_LNG,
  zoom: MAP_ZOOM_DEFAULT,
}

const POLAND_MIN_LNG = 12

const POLAND_MIN_LAT = 47.5

const POLAND_MAX_LNG = 26.2

const POLAND_MAX_LAT = 56.4

const MAX_BOUNDS: [number, number, number, number] = [POLAND_MIN_LNG, POLAND_MIN_LAT, POLAND_MAX_LNG, POLAND_MAX_LAT]
