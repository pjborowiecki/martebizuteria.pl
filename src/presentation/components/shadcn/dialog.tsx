import { type ComponentProps, type JSX, type ReactNode, useMemo } from "react"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

const Dialog = ({ ...props }: Readonly<DialogPrimitive.Root.Props>): JSX.Element => <DialogPrimitive.Root data-slot="dialog" {...props} />

const DialogTrigger = ({ ...props }: Readonly<DialogPrimitive.Trigger.Props>): JSX.Element => (
  <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
)

const DialogPortal = ({ ...props }: Readonly<DialogPrimitive.Portal.Props>): JSX.Element => (
  <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
)

const DialogClose = ({ ...props }: Readonly<DialogPrimitive.Close.Props>): JSX.Element => (
  <DialogPrimitive.Close data-slot="dialog-close" {...props} />
)

const DialogOverlay = ({ className, ...props }: Readonly<DialogPrimitive.Backdrop.Props>): JSX.Element => (
  <DialogPrimitive.Backdrop
    className={cn(
      "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
      className,
    )}
    data-slot="dialog-overlay"
    {...props}
  />
)

const DialogContent = ({ children, className, showCloseButton = true, ...props }: Readonly<DialogContentProps>): JSX.Element => {
  const t = useTranslations("components.shadcn.dialog")
  const closeButtonRender = useMemo(() => <Button className="absolute top-2 right-2" size="icon-sm" variant="ghost" />, [])
  let closeButtonNode: ReactNode = undefined
  if (showCloseButton) {
    closeButtonNode = (
      <DialogPrimitive.Close data-slot="dialog-close" render={closeButtonRender}>
        <XIcon />
        <span className="sr-only">{t("close")}</span>
      </DialogPrimitive.Close>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-popover p-4 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        data-slot="dialog-content"
        {...props}
      >
        {children}
        {closeButtonNode}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

const DialogHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("flex flex-col gap-1 text-left", className)} data-slot="dialog-header" {...props} />
)

const DialogFooter = ({ children, className, showCloseButton = false, ...props }: Readonly<DialogFooterProps>): JSX.Element => {
  const t = useTranslations("components.shadcn.dialog")

  const closeButtonRender = useMemo(() => <Button variant="outline" />, [])
  let closeButtonNode: ReactNode = undefined
  if (showCloseButton) {
    closeButtonNode = <DialogPrimitive.Close render={closeButtonRender}>{t("close")}</DialogPrimitive.Close>
  }

  return (
    <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} data-slot="dialog-footer" {...props}>
      {children}
      {closeButtonNode}
    </div>
  )
}

const DialogTitle = ({ className, ...props }: Readonly<DialogPrimitive.Title.Props>): JSX.Element => (
  <DialogPrimitive.Title className={cn("text-sm font-medium", className)} data-slot="dialog-title" {...props} />
)

const DialogDescription = ({ className, ...props }: Readonly<DialogPrimitive.Description.Props>): JSX.Element => (
  <DialogPrimitive.Description
    className={cn("text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className)}
    data-slot="dialog-description"
    {...props}
  />
)

interface DialogContentProps extends DialogPrimitive.Popup.Props {
  readonly showCloseButton?: boolean
}

interface DialogFooterProps extends ComponentProps<"div"> {
  readonly showCloseButton?: boolean
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
