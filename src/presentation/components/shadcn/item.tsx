import { type ComponentProps, type JSX } from "react"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"

import { Separator } from "~/src/presentation/components/shadcn/separator"
const ItemGroup = ({ className, ...props }: Readonly<ComponentProps<"ul">>): JSX.Element => (
  <ul
    data-slot="item-group"
    className={cn("group/item-group flex w-full list-none flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2", className)}
    {...props}
  />
)

const ItemSeparator = ({ className, ...props }: Readonly<ComponentProps<typeof Separator>>): JSX.Element => (
  <li aria-hidden className="list-none">
    <Separator data-slot="item-separator" orientation="horizontal" className={cn("my-2", className)} {...props} />
  </li>
)

const Item = ({ className, variant = "default", size = "default", render, ...props }: Readonly<ItemProps>): JSX.Element => {
  const itemClassName = cn(
    itemVariants({
      className,
      size,
      variant,
    }),
  )
  return useRender({
    defaultTagName: "li",
    props: mergeProps<"li">(
      {
        className: itemClassName,
      },
      props,
    ),
    render,
    state: {
      size,
      slot: "item",
      variant,
    },
  })
}

const ItemMedia = ({
  className,
  variant = "default",
  ...props
}: Readonly<ComponentProps<"div"> & VariantProps<typeof itemMediaVariants>>): JSX.Element => (
  <div
    data-slot="item-media"
    data-variant={variant}
    className={cn(
      itemMediaVariants({
        className,
        variant,
      }),
    )}
    {...props}
  />
)

const ItemContent = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="item-content"
    className={cn("flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none", className)}
    {...props}
  />
)

const ItemTitle = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    data-slot="item-title"
    className={cn("line-clamp-1 flex w-fit items-center gap-2 text-xs font-medium underline-offset-4", className)}
    {...props}
  />
)

const ItemDescription = ({ className, ...props }: Readonly<ComponentProps<"p">>): JSX.Element => (
  <p
    data-slot="item-description"
    className={cn(
      "line-clamp-2 text-left text-xs/relaxed font-normal text-muted-foreground group-data-[size=xs]/item:text-xs/relaxed [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
      className,
    )}
    {...props}
  />
)

const ItemActions = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="item-actions" className={cn("flex items-center gap-2", className)} {...props} />
)

const ItemHeader = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="item-header" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />
)

const ItemFooter = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div data-slot="item-footer" className={cn("flex basis-full items-center justify-between gap-2", className)} {...props} />
)

const itemVariants = cva(
  "group/item flex w-full flex-wrap items-center rounded-lg border text-xs transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "gap-2.5 px-3 py-2.5",
        sm: "gap-2.5 px-3 py-2.5",
        xs: "gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0",
      },
      variant: {
        default: "border-transparent",
        muted: "border-transparent bg-muted/50",
        outline: "border-border",
      },
    },
  },
)
interface ItemProps extends useRender.ComponentProps<"li">, VariantProps<typeof itemVariants> {}
const itemMediaVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-transparent",
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image:
          "size-10 overflow-hidden rounded-lg group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover",
      },
    },
  },
)
export { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemGroup, ItemHeader, ItemMedia, ItemSeparator, ItemTitle }
