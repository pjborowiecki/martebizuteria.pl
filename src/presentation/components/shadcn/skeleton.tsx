import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"
const Skeleton = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="skeleton" className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />
)

export { Skeleton }
