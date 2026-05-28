import { useCallback, useMemo, type JSX } from "react";

import { Package } from "lucide-react";
import { useWatch } from "react-hook-form";

import type { InpostPointParsed } from "~/src/integrations/inpost/inpost.zod";

import { cn } from "~/src/lib/utils";

import { DialogClose } from "~/src/components/shadcn/dialog";

import { PointDetails } from "~/src/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-point-details";
import { useCheckoutForm } from "~/src/components/custom/checkout/components/checkout-form-provider";

export interface InpostSidebarItemProps {
  readonly point: InpostPointParsed;
}

export function InpostSidebarItem({ point }: InpostSidebarItemProps): JSX.Element {
  const { control, setValue } = useCheckoutForm();
  const selectedId = useWatch({ control, name: "lockerId" });
  const isSelected = selectedId === point.name;

  const handleSelect = useCallback(() => {
    // Persist the city alongside the locker so reopening the picker can restore
    // the search and re-highlight this point.
    setValue("lockerId", point.name);
    setValue("lockerCity", point.address_details.city);
  }, [setValue, point.name, point.address_details.city]);

  const renderButton = useMemo(
    () => (
      <button
        className={cn(
          "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none",
          isSelected && "bg-muted ring-1 ring-foreground/20"
        )}
        onClick={handleSelect}
        type="button"
      />
    ),
    [handleSelect, isSelected]
  );

  return (
    <DialogClose render={renderButton}>
      <Package className={cn("mt-0.5 size-4 shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
      <PointDetails point={point} />
    </DialogClose>
  );
}
