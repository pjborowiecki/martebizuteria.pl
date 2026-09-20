import { type ComponentProps, type JSX } from "react"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "cn"
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react"
import { useTranslations } from "use-intl"
const Breadcrumb = ({
  className,
  ariaLabel,
  ...props
}: Readonly<
  ComponentProps<"nav"> & {
    ariaLabel?: string
  }
>): JSX.Element => {
  const t = useTranslations("components.shadcn.breadcrumb")
  return <nav aria-label={ariaLabel ?? t("navLabel")} data-slot="breadcrumb" className={cn(className)} {...props} />
}
const BreadcrumbList = ({ className, ...props }: Readonly<ComponentProps<"ol">>): JSX.Element => (
  <ol
    data-slot="breadcrumb-list"
    className={cn("flex flex-wrap items-center gap-1.5 text-xs wrap-break-word text-muted-foreground", className)}
    {...props}
  />
)

const BreadcrumbItem = ({ className, ...props }: Readonly<ComponentProps<"li">>): JSX.Element => (
  <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1", className)} {...props} />
)

const BreadcrumbLink = ({ className, render, ...props }: Readonly<useRender.ComponentProps<"a">>): JSX.Element =>
  useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn("transition-colors hover:text-foreground", className),
      },
      props,
    ),
    render,
    state: {
      slot: "breadcrumb-link",
    },
  })

const BreadcrumbPage = ({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element => (
  <span data-slot="breadcrumb-page" aria-current="page" className={cn("font-normal text-foreground", className)} {...props} />
)

const BreadcrumbSeparator = ({ children, className, ...props }: Readonly<ComponentProps<"li">>): JSX.Element => (
  <li data-slot="breadcrumb-separator" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
    {children ?? <ChevronRightIcon />}
  </li>
)

const BreadcrumbEllipsis = ({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element => {
  const t = useTranslations("components.shadcn.breadcrumb")
  return (
    <span data-slot="breadcrumb-ellipsis" className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)} {...props}>
      <MoreHorizontalIcon aria-hidden="true" focusable="false" />
      <span className="sr-only">{t("more")}</span>
    </span>
  )
}
export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator }
