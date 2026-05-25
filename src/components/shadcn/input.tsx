import type { ComponentProps, JSX } from "react";

import { Input as InputPrimitive } from "@base-ui/react/input";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/src/lib/utils";

const inputVariants = cva(
  "w-full min-w-0 bg-transparent transition-[color,background-color,border-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0",
  {
    defaultVariants: {
      variant: "default"
    },
    variants: {
      variant: {
        account: "border-0 border-b border-border pb-2 text-[14px] placeholder:text-muted-foreground/40 focus-visible:border-foreground",
        "account-inline": "border-0 bg-transparent pb-0 text-[14px] outline-none",
        default:
          "min-h-11 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:bg-muted/60 dark:bg-input/30 dark:focus-visible:border-foreground dark:disabled:bg-input/80 dark:aria-invalid:border-destructive"
      }
    }
  }
);

interface InputProps extends ComponentProps<"input">, VariantProps<typeof inputVariants> {}

function Input({ className, type, variant = "default", ...props }: Readonly<InputProps>): JSX.Element {
  return <InputPrimitive type={type} data-slot="input" className={cn(inputVariants({ variant }), className)} {...props} />;
}

export { Input, inputVariants };
