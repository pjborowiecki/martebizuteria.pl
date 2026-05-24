import type { JSX, ReactNode } from "react";

import { cn } from "~/src/lib/utils";

export const INPUT_CLASSES =
  "h-10 w-full rounded-md border-0 bg-secondary/40 px-3.5 text-sm ring-1 ring-border/50 transition-all placeholder:text-muted-foreground/40 hover:ring-border/80 focus:bg-background focus:ring-2 focus:ring-foreground/20 focus:outline-none";

export const SELECT_CLASSES = cn(INPUT_CLASSES, "cursor-pointer appearance-none");

export const LABEL_CLASSES = "block text-[13px] font-medium text-foreground/80";

export function SectionLabel({ children, className }: Readonly<{ children: ReactNode; className?: string }>): JSX.Element {
  return <h2 className={cn("mb-3 text-[13px] font-semibold tracking-wider text-foreground/50 uppercase", className)}>{children}</h2>;
}

export function SectionDivider(): JSX.Element {
  return <div className="my-6 border-t border-border/20" />;
}
