import { type JSX, useCallback, useMemo } from "react"

import { cn } from "cn"
import { Package } from "lucide-react"
import { useWatch } from "react-hook-form"

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { DialogClose } from "~/src/presentation/components/shadcn/dialog"

import { PointDetails } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-point-details"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"

export const InpostSidebarItem = ({ point }: InpostSidebarItemProps): JSX.Element => {
  const { control, setValue } = useCheckoutForm()
  const selectedId = useWatch({
    control,
    name: "lockerId",
  })

  const isSelected = selectedId === point.name
  const handleSelect = useCallback(() => {
    setValue("lockerId", point.name)
    setValue("lockerCity", point.address_details.city)
  }, [setValue, point.name, point.address_details.city])

  const renderButton = useMemo(
    () => (
      <button
        aria-label={point.name}
        className={cn(
          "flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-muted focus:bg-muted focus:outline-none",
          isSelected && "bg-muted ring-1 ring-foreground/20",
        )}
        onClick={handleSelect}
        type="button"
      />
    ),
    [handleSelect, isSelected, point.name],
  )

  return (
    <DialogClose render={renderButton}>
      <Package className={cn("mt-0.5 size-4 shrink-0", isSelected ? "text-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
      <PointDetails point={point} />
    </DialogClose>
  )
}

interface InpostSidebarItemProps {
  readonly point: InpostPointParsed
}
