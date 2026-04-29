import { type ComponentProps, type JSX, useMemo } from "react";

import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";

interface PaginationProps extends ComponentProps<"nav"> {
  readonly ariaLabel?: string;
}

function Pagination({ className, ariaLabel, ...props }: Readonly<PaginationProps>): JSX.Element {
  const t = useTranslations("components.shadcn.pagination");

  return (
    <nav
      aria-label={ariaLabel ?? t("navLabel")}
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

function PaginationContent({ className, ...props }: Readonly<ComponentProps<"ul">>): JSX.Element {
  return <ul data-slot="pagination-content" className={cn("flex items-center gap-0.5", className)} {...props} />;
}

function PaginationItem({ ...props }: Readonly<ComponentProps<"li">>): JSX.Element {
  return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ComponentProps<typeof Button>, "size"> &
  ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", ...props }: Readonly<PaginationLinkProps>): JSX.Element {
  const active = isActive === true;

  let variant: "outline" | "ghost" = "ghost";
  if (active) {
    variant = "outline";
  }

  let ariaCurrent: "page" | undefined = undefined;
  if (active) {
    ariaCurrent = "page";
  }

  const renderEl = useMemo(
    () => <a aria-current={ariaCurrent} data-active={active} data-slot="pagination-link" {...props} />,
    [ariaCurrent, active, props]
  );

  return <Button className={cn(className)} nativeButton={false} render={renderEl} size={size} variant={variant} />;
}

interface PaginationPreviousProps extends ComponentProps<typeof PaginationLink> {
  readonly ariaLabel?: string;
  readonly text?: string;
}

function PaginationPrevious({ className, text, ariaLabel, ...props }: Readonly<PaginationPreviousProps>): JSX.Element {
  const t = useTranslations("components.shadcn.pagination");

  return (
    <PaginationLink aria-label={ariaLabel ?? t("goToPreviousPage")} size="default" className={cn("pl-1.5!", className)} {...props}>
      <ChevronLeftIcon data-icon="inline-start" />
      <span className="hidden sm:block">{text ?? t("previousPage")}</span>
    </PaginationLink>
  );
}

interface PaginationNextProps extends ComponentProps<typeof PaginationLink> {
  readonly ariaLabel?: string;
  readonly text?: string;
}

function PaginationNext({ className, text, ariaLabel, ...props }: Readonly<PaginationNextProps>): JSX.Element {
  const t = useTranslations("components.shadcn.pagination");

  return (
    <PaginationLink aria-label={ariaLabel ?? t("goToNextPage")} size="default" className={cn("pr-1.5!", className)} {...props}>
      <span className="hidden sm:block">{text ?? t("nextPage")}</span>
      <ChevronRightIcon data-icon="inline-end" />
    </PaginationLink>
  );
}

interface PaginationEllipsisProps extends ComponentProps<"span"> {
  readonly srLabel?: string;
}

function PaginationEllipsis({ className, srLabel, ...props }: Readonly<PaginationEllipsisProps>): JSX.Element {
  const t = useTranslations("components.shadcn.pagination");

  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn("flex size-8 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      <MoreHorizontalIcon />
      <span className="sr-only">{srLabel ?? t("morePages")}</span>
    </span>
  );
}

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious };
