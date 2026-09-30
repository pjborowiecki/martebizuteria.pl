import { type ComponentProps, type JSX, type ReactNode, useMemo } from "react"

import { type VariantProps, cva } from "class-variance-authority"
import { cn } from "cn"

import { Label } from "~/src/presentation/components/shadcn/label"
import { Separator } from "~/src/presentation/components/shadcn/separator"

const FieldSet = ({ className, ...props }: Readonly<ComponentProps<"fieldset">>): JSX.Element => (
  <fieldset
    className={cn("flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", className)}
    data-slot="field-set"
    {...props}
  />
)

const FieldLegend = ({ className, variant = "legend", ...props }: Readonly<FieldLegendProps>): JSX.Element => (
  <legend
    className={cn("mb-2.5 font-medium data-[variant=label]:text-xs data-[variant=legend]:text-sm", className)}
    data-slot="field-legend"
    data-variant={variant}
    {...props}
  />
)

const FieldGroup = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn(
      "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
      className,
    )}
    data-slot="field-group"
    {...props}
  />
)

const Field = ({ className, orientation = "vertical", ...props }: Readonly<FieldProps>): JSX.Element => (
  <div
    className={cn(
      fieldVariants({
        orientation,
      }),
      className,
    )}
    data-orientation={orientation}
    data-slot="field"
    {...props}
  />
)

const FieldContent = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div className={cn("group/field-content flex flex-1 flex-col gap-0.5 leading-snug", className)} data-slot="field-content" {...props} />
)

const FieldLabel = ({ className, ...props }: Readonly<ComponentProps<typeof Label>>): JSX.Element => (
  <Label
    className={cn(
      "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border *:data-[slot=field]:p-2 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
      "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
      className,
    )}
    data-slot="field-label"
    {...props}
  />
)

const FieldTitle = ({ className, ...props }: Readonly<ComponentProps<"div">>): JSX.Element => (
  <div
    className={cn("flex w-fit items-center gap-2 text-xs/relaxed leading-snug group-data-[disabled=true]/field:opacity-50", className)}
    data-slot="field-label"
    {...props}
  />
)

const FieldDescription = ({ className, ...props }: Readonly<ComponentProps<"p">>): JSX.Element => (
  <p
    className={cn(
      "text-left text-xs/relaxed leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
      "last:mt-0 nth-last-2:-mt-1",
      "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
      className,
    )}
    data-slot="field-description"
    {...props}
  />
)

const FieldSeparator = ({ children, className, ...props }: Readonly<FieldSeparatorProps>): JSX.Element => {
  const hasChildren = children !== undefined && children !== null && children !== false && children !== ""
  let childNode: ReactNode = false
  if (hasChildren) {
    childNode = (
      <span className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground" data-slot="field-separator-content">
        {children}
      </span>
    )
  }

  return (
    <div
      className={cn("relative -my-2 h-5 text-xs group-data-[variant=outline]/field-group:-mb-2", className)}
      data-content={hasChildren}
      data-slot="field-separator"
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {childNode}
    </div>
  )
}

const getValidErrors = (
  errors?: readonly (FieldErrorItem | undefined)[],
): readonly (FieldErrorItem & {
  message: string
})[] => {
  if (errors === undefined) {
    return []
  }

  const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()]

  return uniqueErrors.filter(
    (
      error,
    ): error is FieldErrorItem & {
      message: string
    } => error?.message !== undefined && error.message !== "",
  )
}

const getFieldErrorContent = (
  children: ReactNode,
  validErrors: readonly (FieldErrorItem & {
    message: string
  })[],
): ReactNode => {
  const hasChildren = children !== undefined && children !== null && children !== false && children !== ""
  if (hasChildren) {
    return children
  }

  const [firstError, ...otherErrors] = validErrors
  if (firstError === undefined) {
    return false
  }

  if (otherErrors.length === 0) {
    return firstError.message
  }

  return (
    <ul className="ml-4 flex list-disc flex-col gap-1">
      {validErrors.map((error) => (
        <li key={error.message}>{error.message}</li>
      ))}
    </ul>
  )
}

const FieldError = ({ children, className, errors, ...props }: Readonly<FieldErrorProps>): JSX.Element | false => {
  const validErrors = useMemo(() => getValidErrors(errors), [errors])
  const content = useMemo(() => getFieldErrorContent(children, validErrors), [children, validErrors])
  if (content === false) {
    return false
  }

  return (
    <div className={cn("text-xs font-normal text-destructive", className)} data-slot="field-error" role="alert" {...props}>
      {content}
    </div>
  )
}

interface FieldLegendProps extends ComponentProps<"legend"> {
  readonly variant?: "label" | "legend"
}

const fieldVariants = cva("group/field flex w-full gap-2 data-[invalid=true]:text-destructive", {
  defaultVariants: {
    orientation: "vertical",
  },
  variants: {
    orientation: {
      horizontal:
        "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
    },
  },
})

interface FieldProps extends ComponentProps<"div">, VariantProps<typeof fieldVariants> {}

interface FieldSeparatorProps extends ComponentProps<"div"> {
  readonly children?: ReactNode
}

interface FieldErrorItem {
  readonly message?: string
}

interface FieldErrorProps extends ComponentProps<"div"> {
  readonly errors?: readonly (FieldErrorItem | undefined)[]
}

export { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet, FieldTitle }
