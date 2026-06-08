import type { JSX } from "react";

import { SlidersHorizontalIcon } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "~/src/components/shadcn/sheet";

const NO_ACTIVE_FILTERS = 0;

const FILTER_TRIGGER_BUTTON = (
  <Button
    className="h-12 w-full justify-between rounded-none border border-border/60 bg-background px-4 text-[11px] tracking-[0.2em] uppercase"
    type="button"
    variant="outline"
  />
);

interface ProductsCatalogMobileFiltersProps {
  readonly activeFilterCount: number;
  readonly children: JSX.Element;
  readonly onClose: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function ProductsCatalogMobileFilters({
  activeFilterCount,
  children,
  onClose,
  onOpenChange,
  open
}: Readonly<ProductsCatalogMobileFiltersProps>): JSX.Element {
  const tFilters = useTranslations("pages.products.filters");
  const showActiveFilterBadge = activeFilterCount > NO_ACTIVE_FILTERS;

  return (
    <div className="mb-6 lg:hidden">
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetTrigger render={FILTER_TRIGGER_BUTTON}>
          <span className="inline-flex items-center gap-2.5">
            <SlidersHorizontalIcon className="size-4" />
            {tFilters("openPanel")}
          </span>
          {showActiveFilterBadge && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] tracking-normal text-background tabular-nums">
              {activeFilterCount}
            </span>
          )}
        </SheetTrigger>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md" showCloseButton side="left">
          <SheetHeader className="border-b border-border/40 px-6 py-5">
            <SheetTitle className="font-serif text-2xl font-normal tracking-tight">{tFilters("title")}</SheetTitle>
            <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{tFilters("eyebrow")}</p>
          </SheetHeader>
          <div className="px-6 py-6">{children}</div>
          <SheetFooter className="border-t border-border/40 px-6 py-4">
            <Button
              className="h-12 w-full rounded-none bg-foreground text-[11px] tracking-[0.22em] text-background uppercase hover:bg-foreground/90"
              onClick={onClose}
              type="button"
            >
              {tFilters("closePanel")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
