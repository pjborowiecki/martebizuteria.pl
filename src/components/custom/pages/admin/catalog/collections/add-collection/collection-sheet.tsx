import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";

import { BasicDetailsSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/basic-details-section";
import { MediaSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/media-section";
import { StatusSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/status-section";
import {
  CollectionForm,
  CollectionFormProvider,
  type CollectionFormMode
} from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionSheetFooter } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet-footer";

import type { Collection } from "~/src/modules/collection/collection.types";

interface CollectionSheetProps {
  readonly collection: Collection["adminListItem"] | undefined;
  readonly mode: CollectionFormMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

export function CollectionSheet({ collection, mode, onOpenChange, open }: CollectionSheetProps): JSX.Element {
  const t = useTranslations("admin");

  const title = mode === "create" ? t("collections.form.titleAdd") : t("collections.form.titleEdit");
  const description = mode === "create" ? t("collections.form.sheetDescription") : t("collections.form.sheetDescriptionEdit");

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
        <CollectionFormProvider
          key={collection?.id ?? "create"}
          collection={collection}
          mode={mode}
          open={open}
          onDismiss={handleDismiss}
          onSuccess={handleSuccess}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
            <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
            <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
          </SheetHeader>

          <CollectionForm>
            <div className="space-y-10 px-6 py-6">
              <BasicDetailsSection recordId={collection?.id} />
              <StatusSection />
              <MediaSection />
            </div>
          </CollectionForm>

          <CollectionSheetFooter />
        </CollectionFormProvider>
      </SheetContent>
    </Sheet>
  );
}
