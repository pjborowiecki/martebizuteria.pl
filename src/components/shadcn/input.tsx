import type { ComponentProps, JSX } from "react";

import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "~/src/lib/utils";

function Input({ className, type, ...props }: Readonly<ComponentProps<"input">>): JSX.Element {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm transition-[color,background-color,border-color] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0 dark:bg-input/30 dark:focus-visible:border-foreground dark:disabled:bg-input/80 dark:aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
