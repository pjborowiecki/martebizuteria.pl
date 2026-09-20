import { type ComponentProps, type JSX } from "react"

import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"
const Alert = ({ className, variant, ...props }: Readonly<ComponentProps<"div"> & VariantProps<typeof alertVariants>>): JSX.Element => (
  <div
    className={cn(
      alertVariants({
        variant,
      }),
      className,
    )}
    data-slot="alert"
    role="alert"
    {...props}
  />
)

const AlertTitle = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn(
      "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
      className,
    )}
    data-slot="alert-title"
    {...props}
  />
)

const AlertDescription = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn(
      "text-xs/relaxed text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-2",
      className,
    )}
    data-slot="alert-description"
    {...props}
  />
)

const AlertAction = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn("absolute top-[calc(--spacing(1.25))] right-[calc(--spacing(1.25))]", className)}
    data-slot="alert-action"
    {...props}
  />
)

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-xs has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive: "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
      },
    },
  },
)
export { Alert, AlertAction, AlertDescription, AlertTitle }
