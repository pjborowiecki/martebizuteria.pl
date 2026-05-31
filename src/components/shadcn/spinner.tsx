import type { ComponentProps, JSX } from "react";

import { Loader2Icon } from "lucide-react";

import { cn } from "~/src/lib/utils";

function Spinner({ className, ...props }: Readonly<ComponentProps<"svg">>): JSX.Element {
  return (
    <output aria-label="Loading" className="inline-flex">
      <Loader2Icon className={cn("size-4 animate-spin", className)} {...props} />
    </output>
  );
}

export { Spinner };
