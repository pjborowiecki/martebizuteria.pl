import { type ComponentProps, type JSX, useMemo } from "react"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { useTranslations } from "use-intl"

import { Button } from "~/src/presentation/components/shadcn/button"
const Sheet = ({ ...props }: Readonly<SheetPrimitive.Root.Props>): JSX.Element => <SheetPrimitive.Root data-slot="sheet" {...props} />

const SheetTrigger = ({ ...props }: Readonly<SheetPrimitive.Trigger.Props>): JSX.Element => (
  <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
)

const SheetClose = ({ ...props }: Readonly<SheetPrimitive.Close.Props>): JSX.Element => (
  <SheetPrimitive.Close data-slot="sheet-close" {...props} />
)

const SheetPortal = ({ ...props }: Readonly<SheetPrimitive.Portal.Props>): JSX.Element => (
  <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
)

const SheetOverlay = ({ className, ...props }: Readonly<SheetPrimitive.Backdrop.Props>): JSX.Element => (
  <SheetPrimitive.Backdrop
    data-slot="sheet-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/10 text-xs/relaxed transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
      className,
    )}
    {...props}
  />
)

const SheetContent = ({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: Readonly<SheetContentProps>): JSX.Element => {
  const t = useTranslations("components.shadcn.sheet")
  const closeButtonEl = useMemo(() => <Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />, [])
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col bg-popover bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-10 data-[side=bottom]:data-starting-style:translate-y-10 data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:-translate-x-10 data-[side=left]:data-starting-style:-translate-x-10 data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-10 data-[side=right]:data-starting-style:translate-x-10 data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-10 data-[side=top]:data-starting-style:-translate-y-10 data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close data-slot="sheet-close" render={closeButtonEl}>
            <XIcon />
            <span className="sr-only">{t("close")}</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}
const SheetHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="sheet-header" className={cn("flex flex-col gap-0.5 p-4", className)} {...props} />
)

const SheetFooter = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)

const SheetTitle = ({ className, ...props }: Readonly<SheetPrimitive.Title.Props>): JSX.Element => (
  <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-sm font-medium text-foreground", className)} {...props} />
)

const SheetDescription = ({ className, ...props }: Readonly<SheetPrimitive.Description.Props>): JSX.Element => (
  <SheetPrimitive.Description data-slot="sheet-description" className={cn("text-xs/relaxed text-muted-foreground", className)} {...props} />
)

interface SheetContentProps extends SheetPrimitive.Popup.Props {
  readonly side?: "top" | "right" | "bottom" | "left"
  readonly showCloseButton?: boolean
}
export { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger }
