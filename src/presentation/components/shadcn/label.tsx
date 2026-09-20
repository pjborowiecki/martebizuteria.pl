import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"
const Label = ({ className, ...props }: Readonly<ComponentProps<"label">>): JSX.Element => (
  <label
    data-slot="label"
    className={cn(
      "flex items-center gap-2 text-xs leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className,
    )}
    {...props}
  />
)

export { Label }
