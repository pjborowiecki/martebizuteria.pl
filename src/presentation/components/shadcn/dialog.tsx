import { type ComponentProps, type JSX, type ReactNode, useMemo } from "react"

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"
import { XIcon } from "lucide-react"
import { useTranslations } from "use-intl/react"

import {
  DIALOG_CLOSE_CLASS,
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_HEADER_CLASS,
  DIALOG_OVERLAY_CLASS,
  DIALOG_SURFACE_CLASS,
  DIALOG_TITLE_CLASS,
  type DialogVariant,
} from "~/src/presentation/components/shadcn/_styles/dialog.styles"
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
  <DialogPrimitive.Backdrop className={cn(DIALOG_OVERLAY_CLASS, className)} data-slot="dialog-overlay" {...props} />
)

const DialogContent = ({
  children,
  className,
  showCloseButton = true,
  variant = "default",
  ...props
}: Readonly<DialogContentProps>): JSX.Element => {
  const t = useTranslations("components.shadcn.dialog")
  const closeButtonRender = useMemo(() => <Button className={DIALOG_CLOSE_CLASS} size="icon-sm" variant="ghost" />, [])
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
        className={cn(DIALOG_SURFACE_CLASS, "max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md", className)}
        data-slot="dialog-content"
        data-variant={variant}
        {...props}
      >
        {children}
        {closeButtonNode}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

const DialogHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn(DIALOG_HEADER_CLASS, className)} data-slot="dialog-header" {...props} />
)

const DialogFooter = ({ children, className, showCloseButton = false, ...props }: Readonly<DialogFooterProps>): JSX.Element => {
  const t = useTranslations("components.shadcn.dialog")

  const closeButtonRender = useMemo(() => <Button variant="outline" />, [])
  let closeButtonNode: ReactNode = undefined
  if (showCloseButton) {
    closeButtonNode = <DialogPrimitive.Close render={closeButtonRender}>{t("close")}</DialogPrimitive.Close>
  }

  return (
    <div className={cn(DIALOG_FOOTER_CLASS, className)} data-slot="dialog-footer" {...props}>
      {children}
      {closeButtonNode}
    </div>
  )
}

const DialogTitle = ({ className, ...props }: Readonly<DialogPrimitive.Title.Props>): JSX.Element => (
  <DialogPrimitive.Title className={cn(DIALOG_TITLE_CLASS, "pr-8", className)} data-slot="dialog-title" {...props} />
)

const DialogDescription = ({ className, ...props }: Readonly<DialogPrimitive.Description.Props>): JSX.Element => (
  <DialogPrimitive.Description className={cn(DIALOG_DESCRIPTION_CLASS, className)} data-slot="dialog-description" {...props} />
)

interface DialogContentProps extends DialogPrimitive.Popup.Props {
  readonly showCloseButton?: boolean
  readonly variant?: DialogVariant
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
