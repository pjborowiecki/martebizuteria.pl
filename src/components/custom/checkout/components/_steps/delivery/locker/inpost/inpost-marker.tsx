import { useCallback, useMemo, type JSX } from "react";

import { Package } from "lucide-react";
import { useWatch } from "react-hook-form";
import { Marker } from "react-map-gl/maplibre";

import type { InpostPointParsed } from "~/src/integrations/inpost/inpost.zod";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { DialogClose } from "~/src/components/shadcn/dialog";

import { useInpost } from "~/src/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-provider";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";

export interface InpostMarkerProps {
  readonly point: InpostPointParsed;
}

export function InpostMarker({ point }: InpostMarkerProps): JSX.Element {
  const { control, setValue } = useCheckoutForm();
  const { setHoveredPointId } = useInpost();
  const selectedPointId = useWatch({ control, name: "lockerId" });

  const isSelected = selectedPointId === point.name;

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setValue("lockerId", point.name);
    },
    [setValue, point.name]
  );

  const handleMouseEnter = useCallback(() => {
    setHoveredPointId(point.name);
  }, [setHoveredPointId, point.name]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPointId(undefined);
  }, [setHoveredPointId]);

  const renderButton = useMemo(
    () => (
      <Button
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-full border-2 shadow-md transition-transform hover:scale-110",
          {
            "border-background bg-foreground text-background": !isSelected,
            "scale-110 border-primary bg-primary text-primary-foreground": isSelected
          }
        )}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        type="button"
        variant="outline"
      />
    ),
    [handleClick, handleMouseEnter, handleMouseLeave, isSelected]
  );

  return (
    <Marker anchor="bottom" latitude={point.location.latitude} longitude={point.location.longitude}>
      <DialogClose render={renderButton}>
        <Package className="size-4" strokeWidth={2} />
      </DialogClose>
    </Marker>
  );
}
