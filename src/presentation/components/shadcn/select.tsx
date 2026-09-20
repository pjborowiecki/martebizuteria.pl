import { type ComponentProps, type JSX, useMemo } from "react"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { sheetSelectTriggerClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"
const SelectGroup = ({ className, ...props }: Readonly<SelectPrimitive.Group.Props>): JSX.Element => (
  <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />
)

const SelectValue = ({ className, ...props }: Readonly<SelectPrimitive.Value.Props>): JSX.Element => (
  <SelectPrimitive.Value data-slot="select-value" className={cn("flex flex-1 text-left", className)} {...props} />
)

const SelectTrigger = ({ className, size = "default", children, ...props }: Readonly<SelectTriggerProps>): JSX.Element => {
  const iconEl = useMemo(() => <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />, [])
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        selectTriggerVariants({
          size,
        }),
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon render={iconEl} />
    </SelectPrimitive.Trigger>
  )
}
const SelectContent = ({
  className,
  children,
  side = "bottom",
  sideOffset = DEFAULT_SIDE_OFFSET,
  align = "start",
  alignOffset = DEFAULT_ALIGN_OFFSET,
  alignItemWithTrigger = false,
  ...props
}: Readonly<SelectContentProps>): JSX.Element => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Positioner
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      alignItemWithTrigger={alignItemWithTrigger}
      className="isolate z-50"
    >
      <SelectPrimitive.Popup
        data-slot="select-content"
        data-align-trigger={alignItemWithTrigger}
        className={cn(
          "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-none border border-border bg-background text-popover-foreground shadow-md ring-0 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List>{children}</SelectPrimitive.List>
        <SelectScrollDownButton />
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  </SelectPrimitive.Portal>
)

const SelectLabel = ({ className, ...props }: Readonly<SelectPrimitive.GroupLabel.Props>): JSX.Element => (
  <SelectPrimitive.GroupLabel data-slot="select-label" className={cn("px-2 py-2 text-xs text-muted-foreground", className)} {...props} />
)

const SelectItem = ({ className, children, showIndicator = true, ...props }: Readonly<SelectItemProps>): JSX.Element => {
  const indicatorEl = useMemo(() => <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />, [])
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-none py-2 pl-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        showIndicator ? "pr-8" : "pr-3",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">{children}</SelectPrimitive.ItemText>
      {showIndicator && (
        <SelectPrimitive.ItemIndicator render={indicatorEl}>
          <CheckIcon className="pointer-events-none" />
        </SelectPrimitive.ItemIndicator>
      )}
    </SelectPrimitive.Item>
  )
}
const SelectSeparator = ({ className, ...props }: Readonly<SelectPrimitive.Separator.Props>): JSX.Element => (
  <SelectPrimitive.Separator
    data-slot="select-separator"
    className={cn("pointer-events-none -mx-1 h-px bg-border", className)}
    {...props}
  />
)

const SelectScrollUpButton = ({ className, ...props }: Readonly<ComponentProps<typeof SelectPrimitive.ScrollUpArrow>>): JSX.Element => (
  <SelectPrimitive.ScrollUpArrow
    data-slot="select-scroll-up-button"
    className={cn(
      "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <ChevronUpIcon />
  </SelectPrimitive.ScrollUpArrow>
)

const SelectScrollDownButton = ({ className, ...props }: Readonly<ComponentProps<typeof SelectPrimitive.ScrollDownArrow>>): JSX.Element => (
  <SelectPrimitive.ScrollDownArrow
    data-slot="select-scroll-down-button"
    className={cn(
      "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <ChevronDownIcon />
  </SelectPrimitive.ScrollDownArrow>
)

const DEFAULT_SIDE_OFFSET = 4
const DEFAULT_ALIGN_OFFSET = 0
const Select = SelectPrimitive.Root
const selectTriggerVariants = cva(
  "flex items-center justify-between gap-1.5 whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "default",
    },
    variants: {
      size: {
        default:
          "h-8 w-fit rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs focus-visible:border-ring data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4",
        sheet: sheetSelectTriggerClassName,
        sm: "h-7 w-fit rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-xs focus-visible:border-ring data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 [&_svg:not([class*='size-'])]:size-4",
      },
    },
  },
)
interface SelectTriggerProps extends SelectPrimitive.Trigger.Props, VariantProps<typeof selectTriggerVariants> {}
interface SelectContentProps
  extends
    SelectPrimitive.Popup.Props,
    Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"> {}
interface SelectItemProps extends SelectPrimitive.Item.Props {
  readonly showIndicator?: boolean
}
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
