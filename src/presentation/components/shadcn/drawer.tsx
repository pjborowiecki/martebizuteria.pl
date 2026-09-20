import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"
import { Drawer as DrawerPrimitive } from "vaul"
const Drawer = ({ ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Root>>): JSX.Element => (
  <DrawerPrimitive.Root data-slot="drawer" {...props} />
)

const DrawerTrigger = ({ ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Trigger>>): JSX.Element => (
  <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
)

const DrawerPortal = ({ ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Portal>>): JSX.Element => (
  <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
)

const DrawerClose = ({ ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Close>>): JSX.Element => (
  <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
)

const DrawerOverlay = ({ className, ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Overlay>>): JSX.Element => (
  <DrawerPrimitive.Overlay
    data-slot="drawer-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
      className,
    )}
    {...props}
  />
)

const DrawerContent = ({ className, children, ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Content>>): JSX.Element => (
  <DrawerPortal data-slot="drawer-portal">
    <DrawerOverlay />
    <DrawerPrimitive.Content
      data-slot="drawer-content"
      className={cn(
        "group/drawer-content fixed z-50 flex h-auto flex-col bg-popover text-xs/relaxed text-popover-foreground data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-lg data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-lg data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
)

const DrawerHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="drawer-header"
    className={cn(
      "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left",
      className,
    )}
    {...props}
  />
)

const DrawerFooter = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="drawer-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)

const DrawerTitle = ({ className, ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Title>>): JSX.Element => (
  <DrawerPrimitive.Title data-slot="drawer-title" className={cn("text-sm font-medium text-foreground", className)} {...props} />
)

const DrawerDescription = ({ className, ...props }: Readonly<ComponentProps<typeof DrawerPrimitive.Description>>): JSX.Element => (
  <DrawerPrimitive.Description
    data-slot="drawer-description"
    className={cn("text-xs/relaxed text-muted-foreground", className)}
    {...props}
  />
)

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
}
