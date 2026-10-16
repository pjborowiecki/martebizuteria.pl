import { type ComponentProps, type JSX, useMemo } from "react"

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"
import { cn } from "cn"

import {
  DIALOG_DESCRIPTION_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_HEADER_CLASS,
  DIALOG_OVERLAY_CLASS,
  DIALOG_SURFACE_CLASS,
  DIALOG_TITLE_CLASS,
  type DialogVariant,
} from "~/src/presentation/components/shadcn/_styles/dialog.styles"
import { Button } from "~/src/presentation/components/shadcn/button"

const AlertDialog = ({ ...props }: Readonly<AlertDialogPrimitive.Root.Props>): JSX.Element => (
  <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
)

const AlertDialogTrigger = ({ ...props }: Readonly<AlertDialogPrimitive.Trigger.Props>): JSX.Element => (
  <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
)

const AlertDialogPortal = ({ ...props }: Readonly<AlertDialogPrimitive.Portal.Props>): JSX.Element => (
  <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
)

const AlertDialogOverlay = ({ className, ...props }: Readonly<AlertDialogPrimitive.Backdrop.Props>): JSX.Element => (
  <AlertDialogPrimitive.Backdrop data-slot="alert-dialog-overlay" className={cn(DIALOG_OVERLAY_CLASS, className)} {...props} />
)

const AlertDialogContent = ({
  className,
  size = "default",
  variant = "default",
  ...props
}: Readonly<
  AlertDialogPrimitive.Popup.Props & {
    size?: "default" | "sm"
    variant?: DialogVariant
  }
>): JSX.Element => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Popup
      data-slot="alert-dialog-content"
      data-size={size}
      data-variant={variant}
      className={cn(DIALOG_SURFACE_CLASS, "data-[size=default]:sm:max-w-md data-[size=sm]:sm:max-w-xs", className)}
      {...props}
    />
  </AlertDialogPortal>
)

const AlertDialogHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="alert-dialog-header"
    className={cn(
      DIALOG_HEADER_CLASS,
      "sm:has-data-[slot=alert-dialog-media]:grid sm:has-data-[slot=alert-dialog-media]:grid-cols-[auto_minmax(0,1fr)] sm:has-data-[slot=alert-dialog-media]:gap-x-4 sm:has-data-[slot=alert-dialog-media]:gap-y-1.5",
      className,
    )}
    {...props}
  />
)

const AlertDialogFooter = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="alert-dialog-footer" className={cn(DIALOG_FOOTER_CLASS, className)} {...props} />
)

const AlertDialogMedia = ({
  className,
  tone = "default",
  ...props
}: Readonly<ComponentProps<"div"> & { tone?: "default" | "destructive" }>): JSX.Element => (
  <div
    aria-hidden
    data-slot="alert-dialog-media"
    data-tone={tone}
    className={cn(
      "mb-2 inline-flex size-10 items-center justify-center rounded-lg bg-muted text-foreground sm:row-span-2 sm:mb-0 *:[svg:not([class*='size-'])]:size-[18px]",
      "data-[tone=destructive]:bg-destructive/10 data-[tone=destructive]:text-destructive",
      className,
    )}
    {...props}
  />
)

const AlertDialogTitle = ({ className, ...props }: Readonly<ComponentProps<typeof AlertDialogPrimitive.Title>>): JSX.Element => (
  <AlertDialogPrimitive.Title data-slot="alert-dialog-title" className={cn(DIALOG_TITLE_CLASS, className)} {...props} />
)

const AlertDialogDescription = ({
  className,
  ...props
}: Readonly<ComponentProps<typeof AlertDialogPrimitive.Description>>): JSX.Element => (
  <AlertDialogPrimitive.Description data-slot="alert-dialog-description" className={cn(DIALOG_DESCRIPTION_CLASS, className)} {...props} />
)

const AlertDialogAction = ({ className, ...props }: Readonly<ComponentProps<typeof Button>>): JSX.Element => (
  <Button data-slot="alert-dialog-action" className={cn(className)} {...props} />
)

const AlertDialogCancel = ({
  className,
  variant = "outline",
  size = "default",
  ...props
}: Readonly<AlertDialogPrimitive.Close.Props & Pick<ComponentProps<typeof Button>, "variant" | "size">>): JSX.Element => {
  const renderButton = useMemo(() => <Button variant={variant} size={size} />, [variant, size])

  return <AlertDialogPrimitive.Close data-slot="alert-dialog-cancel" className={cn(className)} render={renderButton} {...props} />
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
}
