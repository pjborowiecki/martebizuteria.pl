import { type ComponentProps, type JSX } from "react"

import { cn } from "cn"
import { Loader2Icon } from "lucide-react"
const Spinner = ({ className, ...props }: Readonly<ComponentProps<"svg">>): JSX.Element => (
  <output aria-label="Loading" className="inline-flex">
    <Loader2Icon className={cn("size-4 animate-spin", className)} {...props} />
  </output>
)

export { Spinner }
