import { type ComponentProps, type JSX } from "react"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

const Popover = ({ ...props }: Readonly<PopoverPrimitive.Root.Props>): JSX.Element => (
  <PopoverPrimitive.Root data-slot="popover" {...props} />
)

const PopoverTrigger = ({ ...props }: Readonly<PopoverPrimitive.Trigger.Props>): JSX.Element => (
  <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
)

const PopoverContent = ({
  className,
  align = "center",
  alignOffset = DEFAULT_ALIGN_OFFSET,
  side = "bottom",
  sideOffset = DEFAULT_SIDE_OFFSET,
  ...props
}: Readonly<PopoverContentProps>): JSX.Element => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Positioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} className="isolate z-50">
      <PopoverPrimitive.Popup
        data-slot="popover-content"
        className={cn(
          "z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>
)

const PopoverHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="popover-header" className={cn("flex flex-col gap-1 text-xs", className)} {...props} />
)

const PopoverTitle = ({ className, ...props }: Readonly<PopoverPrimitive.Title.Props>): JSX.Element => (
  <PopoverPrimitive.Title data-slot="popover-title" className={cn("text-sm font-medium", className)} {...props} />
)

const PopoverDescription = ({ className, ...props }: Readonly<PopoverPrimitive.Description.Props>): JSX.Element => (
  <PopoverPrimitive.Description
    data-slot="popover-description"
    className={cn("text-xs/relaxed text-muted-foreground", className)}
    {...props}
  />
)

const DEFAULT_ALIGN_OFFSET = 0

const DEFAULT_SIDE_OFFSET = 4

interface PopoverContentProps
  extends PopoverPrimitive.Popup.Props, Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> {}

export { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger }
