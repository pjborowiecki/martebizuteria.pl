import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";

import { BasicDetailsSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/_sections/basic-details-section";
import { MediaSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/_sections/media-section";
import { ParentCategorySection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/_sections/parent-category-section";
import { StatusSection } from "~/src/components/custom/pages/admin/catalog/categories/add-category/_sections/status-section";
import {
  CategoryForm,
  CategoryFormProvider,
  type CategoryFormMode
} from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-form-provider";
import { CategorySheetFooter } from "~/src/components/custom/pages/admin/catalog/categories/add-category/category-sheet-footer";

import type { Category } from "~/src/modules/category/category.types";

interface CategorySheetProps {
  readonly category: Category["adminListItem"] | undefined;
  readonly mode: CategoryFormMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function CategorySheet({ category, mode, onOpenChange, open }: CategorySheetProps): JSX.Element {
  const t = useTranslations("admin");

  const title = mode === "create" ? t("categories.form.titleAdd") : t("categories.form.titleEdit");
  const description = mode === "create" ? t("categories.form.sheetDescription") : t("categories.form.sheetDescriptionEdit");

  const handleDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full flex-col gap-0 border-l border-border bg-background p-0 text-foreground shadow-none data-[side=right]:sm:max-w-lg"
      >
        <CategoryFormProvider
          key={category?.id ?? "create"}
          category={category}
          mode={mode}
          open={open}
          onDismiss={handleDismiss}
          onSuccess={handleSuccess}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
            <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
            <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
          </SheetHeader>

          <CategoryForm>
            <div className="space-y-10 px-6 py-6">
              <BasicDetailsSection recordId={category?.id} />
              <ParentCategorySection />
              <StatusSection />
              <MediaSection />
            </div>
          </CategoryForm>

          <CategorySheetFooter />
        </CategoryFormProvider>
      </SheetContent>
    </Sheet>
  );
}
