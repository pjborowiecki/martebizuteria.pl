import type { ComponentProps, JSX } from "react";

import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

function Breadcrumb({ className, ariaLabel, ...props }: Readonly<ComponentProps<"nav"> & { ariaLabel?: string }>): JSX.Element {
  const t = useTranslations("components.shadcn.breadcrumb");

  return <nav aria-label={ariaLabel ?? t("navLabel")} data-slot="breadcrumb" className={cn(className)} {...props} />;
}

function BreadcrumbList({ className, ...props }: Readonly<ComponentProps<"ol">>): JSX.Element {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn("flex flex-wrap items-center gap-1.5 text-xs wrap-break-word text-muted-foreground", className)}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: Readonly<ComponentProps<"li">>): JSX.Element {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1", className)} {...props} />;
}

function BreadcrumbLink({ className, render, ...props }: Readonly<useRender.ComponentProps<"a">>): JSX.Element {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn("transition-colors hover:text-foreground", className)
      },
      props
    ),
    render,
    state: {
      slot: "breadcrumb-link"
    }
  });
}

function BreadcrumbPage({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element {
  return <span data-slot="breadcrumb-page" aria-current="page" className={cn("font-normal text-foreground", className)} {...props} />;
}

function BreadcrumbSeparator({ children, className, ...props }: Readonly<ComponentProps<"li">>): JSX.Element {
  return (
    <li data-slot="breadcrumb-separator" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>
      {children ?? <ChevronRightIcon />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: Readonly<ComponentProps<"span">>): JSX.Element {
  const t = useTranslations("components.shadcn.breadcrumb");

  return (
    <span data-slot="breadcrumb-ellipsis" className={cn("flex size-5 items-center justify-center [&>svg]:size-4", className)} {...props}>
      <MoreHorizontalIcon aria-hidden="true" focusable="false" />
      <span className="sr-only">{t("more")}</span>
    </span>
  );
}

export { Breadcrumb, BreadcrumbEllipsis, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
