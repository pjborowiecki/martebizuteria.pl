import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";

import { CatalogFormSheetContent } from "~/src/components/custom/pages/admin/catalog/catalog-form-sheet-content";
import { BasicDetailsSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/basic-details-section";
import { MediaSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/media-section";
import { StatusSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/_sections/status-section";
import { CollectionFormLocaleLayout } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-locale-layout";
import {
  CollectionForm,
  CollectionFormProvider,
  type CollectionFormMode
} from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionSheetFooter } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-sheet-footer";
import { CatalogFormLocaleControlsProvider } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";

import type { Collection } from "~/src/modules/product-collection/product-collection.types";

interface CollectionSheetProps {
  readonly collection: Collection["adminListItem"] | undefined;
  readonly mode: CollectionFormMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

function CollectionSheetSections({ recordId }: Readonly<{ recordId?: string }>): JSX.Element {
  return (
    <>
      <BasicDetailsSection recordId={recordId} />
      <StatusSection />
      <MediaSection />
    </>
  );
}

function CollectionSheetFormBody({ recordId }: Readonly<{ recordId?: string }>): JSX.Element {
  return (
    <>
      <CollectionForm>
        <div className="px-6 py-6">
          <CollectionFormLocaleLayout>
            <div className="space-y-10">
              <CollectionSheetSections recordId={recordId} />
            </div>
          </CollectionFormLocaleLayout>
        </div>
      </CollectionForm>
      <CollectionSheetFooter />
    </>
  );
}

function CollectionSheetHeader({ description, title }: Readonly<{ description: string; title: string }>): JSX.Element {
  return (
    <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
      <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
      <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
    </SheetHeader>
  );
}

export function CollectionSheet({ collection, mode, onOpenChange, open }: CollectionSheetProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");

  const title = mode === "create" ? t("form.titleAdd") : t("form.titleEdit");
  const description = mode === "create" ? t("form.sheetDescription") : t("form.sheetDescriptionEdit");

  const handleDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <CatalogFormSheetContent>
        <CatalogFormLocaleControlsProvider>
          <CollectionFormProvider
            key={collection?.id ?? "create"}
            collection={collection}
            mode={mode}
            open={open}
            onDismiss={handleDismiss}
            onSuccess={handleSuccess}
          >
            <CollectionSheetHeader description={description} title={title} />
            <CollectionSheetFormBody recordId={collection?.id} />
          </CollectionFormProvider>
        </CatalogFormLocaleControlsProvider>
      </CatalogFormSheetContent>
    </Sheet>
  );
}
