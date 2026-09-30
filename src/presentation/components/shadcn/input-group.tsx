import { type ComponentProps, type JSX, createContext, useContext } from "react"

import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input, type inputVariants } from "~/src/presentation/components/shadcn/input"
import { sheetInputGroupClassName } from "~/src/presentation/components/shadcn/sheet-control.styles"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

const InputGroup = ({ className, variant: variantProp = "default", ...props }: Readonly<InputGroupProps>): JSX.Element => {
  const variant: InputGroupVariant = variantProp ?? "default"

  return (
    <InputGroupVariantContext.Provider value={variant}>
      <div
        className={cn(
          inputGroupVariants({
            variant,
          }),
          className,
        )}
        data-slot="input-group"
        data-variant={variant}
        {...props}
      />
    </InputGroupVariantContext.Provider>
  )
}

const InputGroupAddon = ({
  align = "inline-start",
  className,
  ...props
}: Readonly<ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>>): JSX.Element => (
  <div
    className={cn(
      inputGroupAddonVariants({
        align,
      }),
      className,
    )}
    data-align={align}
    data-slot="input-group-addon"
    {...props}
  />
)

const InputGroupButton = ({
  className,
  size = "xs",
  type = "button",
  variant = "ghost",
  ...props
}: Readonly<InputGroupButtonProps>): JSX.Element => (
  <Button
    className={cn(
      inputGroupButtonVariants({
        size,
      }),
      className,
    )}
    data-size={size}
    type={type}
    variant={variant}
    {...props}
  />
)

const InputGroupText = ({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element => (
  <span
    className={cn(
      "flex items-center gap-2 text-xs text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
)

const InputGroupInput = ({ className, variant, ...props }: Readonly<InputGroupInputProps>): JSX.Element => {
  const groupVariant = useContext(InputGroupVariantContext)
  const resolvedVariant = variant ?? (groupVariant === "sheet" ? "sheet-inset" : "default")

  return (
    <Input
      className={cn(
        resolvedVariant === "default" &&
          "flex-1 rounded-none border-none bg-transparent shadow-none ring-0 focus-visible:border-none focus-visible:ring-0 disabled:bg-transparent aria-invalid:border-none aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      data-slot="input-group-control"
      variant={resolvedVariant}
      {...props}
    />
  )
}

const InputGroupTextarea = ({ className, ...props }: Readonly<ComponentProps<"textarea">>): JSX.Element => (
  <Textarea
    className={cn(
      "flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
      className,
    )}
    data-slot="input-group-control"
    {...props}
  />
)

const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 transition-[color,background-color,border-color] outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:cursor-not-allowed has-disabled:opacity-60 has-[[data-slot][aria-invalid=true]]:border-destructive has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:has-[[data-slot][aria-invalid=true]]:border-destructive has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "min-h-11 items-center rounded-none border-0 border-b border-border bg-background focus-within:border-foreground focus-within:ring-0 has-disabled:bg-muted/60 dark:bg-input/30 dark:has-disabled:bg-input/80",
        sheet: sheetInputGroupClassName,
      },
    },
  },
)

type InputGroupVariant = NonNullable<VariantProps<typeof inputGroupVariants>["variant"]>

const InputGroupVariantContext = createContext<InputGroupVariant>("default")

interface InputGroupProps extends ComponentProps<"div">, VariantProps<typeof inputGroupVariants> {}

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-2.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 group-data-[variant=sheet]/input-group:h-full group-data-[variant=sheet]/input-group:py-0 [&>kbd]:rounded-lg [&>svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      align: "inline-start",
    },
    variants: {
      align: {
        "block-end": "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
        "block-start": "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "inline-end": "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
        "inline-start": "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
      },
    },
  },
)

const inputGroupButtonVariants = cva("flex items-center gap-2 text-xs shadow-none", {
  defaultVariants: {
    size: "xs",
  },
  variants: {
    size: {
      "icon-sm": "size-7 p-0 has-[>svg]:p-0",
      "icon-xs": "size-6 rounded-lg p-0 has-[>svg]:p-0",
      sm: "gap-1",
      xs: "h-6 gap-1 rounded-lg px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
    },
  },
})

interface InputGroupButtonProps
  extends Omit<ComponentProps<typeof Button>, "size" | "type">, VariantProps<typeof inputGroupButtonVariants> {
  readonly type?: "button" | "reset" | "submit"
}

interface InputGroupInputProps extends ComponentProps<"input"> {
  readonly variant?: NonNullable<VariantProps<typeof inputVariants>["variant"]>
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea }
