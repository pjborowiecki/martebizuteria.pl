import type { ComponentProps, JSX } from "react";

import { cn } from "~/src/lib/utils";

function Textarea({ className, ...props }: Readonly<ComponentProps<"textarea">>): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm transition-[color,background-color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0 dark:bg-input/30 dark:focus-visible:border-foreground dark:disabled:bg-input/80 dark:aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
