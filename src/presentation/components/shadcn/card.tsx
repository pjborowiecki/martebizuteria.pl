import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"

const Card = ({
  className,
  size = "default",
  ...props
}: Readonly<
  ComponentProps<"div"> & {
    size?: "default" | "sm"
  }
>): JSX.Element => (
  <div
    data-slot="card"
    data-size={size}
    className={cn(
      "group/card flex flex-col gap-4 overflow-hidden rounded-lg border border-border/40 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent py-4 text-xs/relaxed text-card-foreground has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0 data-[size=sm]:gap-2 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-none *:[img:last-child]:rounded-none",
      className,
    )}
    {...props}
  />
)

const CardHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="card-header"
    className={cn(
      "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-lg px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
      className,
    )}
    {...props}
  />
)

const CardTitle = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="card-title" className={cn("text-sm font-medium group-data-[size=sm]/card:text-sm", className)} {...props} />
)

const CardDescription = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="card-description" className={cn("text-xs/relaxed text-muted-foreground", className)} {...props} />
)

const CardAction = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="card-action" className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} {...props} />
)

const CardContent = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="card-content" className={cn("px-4 group-data-[size=sm]/card:px-3", className)} {...props} />
)

const CardFooter = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="card-footer"
    className={cn("flex items-center rounded-lg border-t p-4 group-data-[size=sm]/card:p-3", className)}
    {...props}
  />
)

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
