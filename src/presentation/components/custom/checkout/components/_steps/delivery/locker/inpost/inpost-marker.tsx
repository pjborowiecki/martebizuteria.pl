import { type JSX, type MouseEvent, useCallback, useMemo } from "react"

import { cn } from "cn"
import { Package } from "lucide-react"
import { useWatch } from "react-hook-form"
import { Marker } from "react-map-gl/maplibre"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { DialogClose } from "~/src/presentation/components/shadcn/dialog"

import { useInpost } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
export const InpostMarker = ({ point }: InpostMarkerProps): JSX.Element => {
  const { control, setValue } = useCheckoutForm()
  const { setHoveredPointId } = useInpost()
  const selectedPointId = useWatch({
    control,
    name: "lockerId",
  })
  const isSelected = selectedPointId === point.name
  const handleClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation()
      setValue("lockerId", point.name)
    },
    [setValue, point.name],
  )
  const handleMouseEnter = useCallback(() => {
    setHoveredPointId(point.name)
  }, [setHoveredPointId, point.name])
  const handleMouseLeave = useCallback(() => {
    setHoveredPointId(undefined)
  }, [setHoveredPointId])
  const renderButton = useMemo(
    () => (
      <Button
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-full border-2 shadow-md transition-transform hover:scale-110",
          {
            "border-background bg-foreground text-background": !isSelected,
            "scale-110 border-primary bg-primary text-primary-foreground": isSelected,
          },
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        type="button"
        variant="outline"
      />
    ),
    [handleClick, handleMouseEnter, handleMouseLeave, isSelected],
  )
  return (
    <Marker anchor="bottom" latitude={point.location.latitude} longitude={point.location.longitude}>
      <DialogClose render={renderButton}>
        <Package className="size-4" strokeWidth={2} />
      </DialogClose>
    </Marker>
  )
}
export interface InpostMarkerProps {
  readonly point: InpostPointParsed
}
