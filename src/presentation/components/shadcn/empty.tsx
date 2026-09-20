import { type ComponentProps, type JSX } from "react"

import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"
const Empty = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("flex w-full flex-col items-center justify-center p-8 text-center", className)} data-slot="empty" {...props} />
)

const EmptyMedia = ({
  className,
  variant,
  ...props
}: Readonly<ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>>): JSX.Element => (
  <div
    className={cn(
      emptyMediaVariants({
        className,
        variant,
      }),
    )}
    data-slot="empty-icon"
    data-variant={variant}
    {...props}
  />
)

const EmptyTitle = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("mt-4 text-lg font-semibold text-foreground", className)} data-slot="empty-title" {...props} />
)

const EmptyDescription = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("mt-2 max-w-sm text-sm text-balance text-muted-foreground", className)} data-slot="empty-description" {...props} />
)

const EmptyAction = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("mt-6", className)} data-slot="empty-action" {...props} />
)

const emptyMediaVariants = cva("mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  defaultVariants: {
    variant: "default",
  },
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
    },
  },
})
export { Empty, EmptyAction, EmptyDescription, EmptyMedia, emptyMediaVariants, EmptyTitle }
