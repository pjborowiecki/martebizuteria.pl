import type { ComponentProps, JSX } from "react";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";

const buttonGroupVariants = cva(
  "flex w-fit items-stretch overflow-hidden rounded-lg *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-none [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    defaultVariants: {
      orientation: "horizontal"
    },
    variants: {
      orientation: {
        horizontal: "*:data-slot:rounded-r-none [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0",
        vertical: "flex-col *:data-slot:rounded-b-none [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0"
      }
    }
  }
);

function ButtonGroup({
  className,
  orientation,
  ...props
}: Readonly<ComponentProps<"fieldset"> & VariantProps<typeof buttonGroupVariants>>): JSX.Element {
  return (
    <fieldset
      className={cn("m-0 min-w-0 border-0 p-0", buttonGroupVariants({ orientation }), className)}
      data-orientation={orientation}
      data-slot="button-group"
      {...props}
    />
  );
}

function ButtonGroupText({ className, render, ...props }: Readonly<useRender.ComponentProps<"div">>): JSX.Element {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "flex items-center gap-2 rounded-lg border bg-muted px-2.5 text-xs font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          className
        )
      },
      props
    ),
    render,
    state: {
      slot: "button-group-text"
    }
  });
}

function ButtonGroupSeparator({ className, orientation = "vertical", ...props }: Readonly<ComponentProps<typeof Separator>>): JSX.Element {
  return (
    <Separator
      className={cn(
        "relative self-stretch bg-input data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto",
        className
      )}
      data-slot="button-group-separator"
      orientation={orientation}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
