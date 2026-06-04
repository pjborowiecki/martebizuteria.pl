import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";

import { BasicDetailsSection } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/basic-details-section";
import { ValueSettingsSection } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/value-settings-section";
import { AttributeFormLocaleControlsProvider } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls";
import { AttributeFormLocaleLayout } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-layout";
import {
  AttributeForm,
  AttributeFormProvider,
  type AttributeFormMode
} from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";
import { AttributeSheetFooter } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet-footer";
import { CatalogFormSheetContent } from "~/src/components/custom/pages/admin/catalog/catalog-form-sheet-content";

import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";

interface AttributeSheetProps {
  readonly attribute: ProductAttribute["adminListItem"] | undefined;
  readonly mode: AttributeFormMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
}

function AttributeSheetSections({ recordId }: Readonly<{ recordId: string | undefined }>): JSX.Element {
  return (
    <>
      <BasicDetailsSection recordId={recordId} />
      <ValueSettingsSection />
    </>
  );
}

function AttributeSheetFormBody({ recordId }: Readonly<{ recordId: string | undefined }>): JSX.Element {
  return (
    <>
      <AttributeForm>
        <div className="px-6 py-6">
          <AttributeFormLocaleLayout>
            <div className="space-y-10">
              <AttributeSheetSections recordId={recordId} />
            </div>
          </AttributeFormLocaleLayout>
        </div>
      </AttributeForm>
      <AttributeSheetFooter />
    </>
  );
}

function AttributeSheetHeader({ description, title }: Readonly<{ description: string; title: string }>): JSX.Element {
  return (
    <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
      <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
      <SheetDescription className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
    </SheetHeader>
  );
}

export function AttributeSheet({ attribute, mode, onOpenChange, open }: AttributeSheetProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");

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
        <AttributeFormLocaleControlsProvider>
          <AttributeFormProvider
            key={attribute?.id ?? "create"}
            attribute={attribute}
            mode={mode}
            open={open}
            onDismiss={handleDismiss}
            onSuccess={handleSuccess}
          >
            <AttributeSheetHeader description={description} title={title} />
            <AttributeSheetFormBody recordId={attribute?.id} />
          </AttributeFormProvider>
        </AttributeFormLocaleControlsProvider>
      </CatalogFormSheetContent>
    </Sheet>
  );
}
