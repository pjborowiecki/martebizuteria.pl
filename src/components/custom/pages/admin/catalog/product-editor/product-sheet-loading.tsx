import type { JSX, ReactNode } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent, CardHeader } from "~/src/components/shadcn/card";
import { SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";
import { Skeleton } from "~/src/components/shadcn/skeleton";

import { CATALOG_SHEET_CARD_CONTENT_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";

function CatalogSheetFieldSkeleton({ className }: Readonly<{ className?: string }>): JSX.Element {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function CatalogSheetCardSkeleton({
  children,
  className,
  titleWidth = "w-28"
}: Readonly<{ children: ReactNode; className?: string; titleWidth?: string }>): JSX.Element {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className={cn("h-5", titleWidth)} />
      </CardHeader>
      <CardContent className={CATALOG_SHEET_CARD_CONTENT_CLASS}>{children}</CardContent>
    </Card>
  );
}

function ProductSheetLocalePickerSkeleton(): JSX.Element {
  return (
    <div className="space-y-2 border-b border-border pb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-52 max-w-full" />
      </div>
    </div>
  );
}

function ProductSheetBasicSectionSkeleton(): JSX.Element {
  return (
    <CatalogSheetCardSkeleton className="flex h-full flex-col" titleWidth="w-24">
      <div className="grid grid-cols-2 gap-5">
        <CatalogSheetFieldSkeleton />
        <CatalogSheetFieldSkeleton />
      </div>
      <CatalogSheetFieldSkeleton />
      <CatalogSheetFieldSkeleton />
      <div className="flex min-h-0 flex-1 flex-col space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="min-h-[168px] w-full flex-1" />
      </div>
    </CatalogSheetCardSkeleton>
  );
}

function ProductSheetSidebarSectionSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <CatalogSheetCardSkeleton titleWidth="w-20">
        <CatalogSheetFieldSkeleton />
      </CatalogSheetCardSkeleton>

      <CatalogSheetCardSkeleton titleWidth="w-36">
        <CatalogSheetFieldSkeleton />
        <CatalogSheetFieldSkeleton />
        <CatalogSheetFieldSkeleton />
      </CatalogSheetCardSkeleton>

      <CatalogSheetCardSkeleton titleWidth="w-28">
        <CatalogSheetFieldSkeleton />
      </CatalogSheetCardSkeleton>

      <CatalogSheetCardSkeleton titleWidth="w-24">
        <div className="grid grid-cols-2 gap-5">
          <CatalogSheetFieldSkeleton />
          <CatalogSheetFieldSkeleton />
        </div>
      </CatalogSheetCardSkeleton>
    </div>
  );
}

function ProductSheetMediaSectionSkeleton(): JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Skeleton className="size-4 shrink-0" />
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="aspect-[4/3] min-h-[200px] w-full" />
        <Skeleton className="h-3 w-40" />
      </CardContent>
    </Card>
  );
}

function ProductSheetTagsSectionSkeleton(): JSX.Element {
  return (
    <CatalogSheetCardSkeleton className="flex h-full flex-col" titleWidth="w-20">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-28" />
        <div className="flex items-end gap-2">
          <Skeleton className="h-10 min-w-0 flex-1" />
          <Skeleton className="h-10 w-[9.5rem] shrink-0" />
        </div>
      </div>
    </CatalogSheetCardSkeleton>
  );
}

function ProductSheetAttributesSectionSkeleton(): JSX.Element {
  return (
    <CatalogSheetCardSkeleton titleWidth="w-32">
      <div className="flex flex-wrap items-end gap-2">
        <Skeleton className="h-10 w-48 shrink-0" />
        <Skeleton className="h-10 min-w-[8rem] flex-1" />
        <Skeleton className="h-10 w-[9.5rem] shrink-0" />
      </div>
    </CatalogSheetCardSkeleton>
  );
}

export function ProductSheetFormSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <ProductSheetLocalePickerSkeleton />

      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        <ProductSheetBasicSectionSkeleton />
        <ProductSheetSidebarSectionSkeleton />
      </div>

      <div className="grid gap-6 md:grid-cols-2 md:items-stretch">
        <ProductSheetMediaSectionSkeleton />
        <ProductSheetTagsSectionSkeleton />
      </div>

      <ProductSheetAttributesSectionSkeleton />
    </div>
  );
}

function ProductSheetFooterSkeleton(): JSX.Element {
  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-row justify-end gap-3">
        <Skeleton className="h-10 w-[88px]" />
        <Skeleton className="h-10 w-[140px]" />
      </div>
    </div>
  );
}

interface ProductSheetLoadingProps {
  readonly description: string;
  readonly title: string;
}

/** Mirrors {@link ProductSheetShell} layout while product detail loads. */
export function ProductSheetLoading({ description, title }: Readonly<ProductSheetLoadingProps>): JSX.Element {
  const t = useTranslations("common");

  return (
    <>
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
        <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
        <SheetDescription className="max-w-lg text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
      </SheetHeader>
      <div aria-busy="true" aria-label={t("loading")} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <ProductSheetFormSkeleton />
      </div>
      <ProductSheetFooterSkeleton />
    </>
  );
}
