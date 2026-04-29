import type { ComponentProps, JSX } from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/src/lib/utils";

function Empty({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  return <div className={cn("flex w-full flex-col items-center justify-center p-8 text-center", className)} data-slot="empty" {...props} />;
}

const emptyMediaVariants = cva("mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
  defaultVariants: {
    variant: "default"
  },
  variants: {
    variant: {
      default: "bg-transparent",
      icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4"
    }
  }
});

function EmptyMedia({
  className,
  variant,
  ...props
}: Readonly<ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>>): JSX.Element {
  return <div className={cn(emptyMediaVariants({ className, variant }))} data-slot="empty-icon" data-variant={variant} {...props} />;
}

function EmptyTitle({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  return <div className={cn("mt-4 text-lg font-semibold text-foreground", className)} data-slot="empty-title" {...props} />;
}

function EmptyDescription({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  return (
    <div className={cn("mt-2 max-w-sm text-sm text-balance text-muted-foreground", className)} data-slot="empty-description" {...props} />
  );
}

function EmptyAction({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element {
  return <div className={cn("mt-6", className)} data-slot="empty-action" {...props} />;
}

export { Empty, EmptyAction, EmptyDescription, EmptyMedia, emptyMediaVariants, EmptyTitle };
