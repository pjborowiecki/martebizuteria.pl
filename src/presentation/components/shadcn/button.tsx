import { type JSX } from "react"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"

const Button = ({
  className,
  size = "default",
  variant = "default",
  ...props
}: Readonly<ButtonPrimitive.Props & VariantProps<typeof buttonVariants>>): JSX.Element => (
  <ButtonPrimitive
    className={cn(
      buttonVariants({
        className,
        size,
        variant,
      }),
    )}
    data-slot="button"
    {...props}
  />
)

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer appearance-none items-center justify-center rounded-lg border-0 text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        account: "h-10 gap-2 px-8 text-[11px] tracking-[0.15em] uppercase",
        "account-sm": "h-9 gap-1.5 px-6 text-[11px] tracking-[0.15em] uppercase",
        default: "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-lg": "size-9",
        "icon-sm": "size-7",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 gap-1 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xl: "h-12 gap-2 px-6 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 md:h-14 md:text-base",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        account: "bg-foreground text-background hover:bg-foreground/90",
        "account-destructive": "border border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/5",
        "account-ghost":
          "relative h-auto p-0 text-[11px] tracking-[0.15em] text-muted-foreground uppercase after:absolute after:inset-x-0 after:-inset-y-1 hover:text-foreground",
        "account-outline": "border border-border bg-transparent text-foreground hover:bg-muted",
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
    },
  },
)

export { Button, buttonVariants }
