import { type JSX } from "react";

import { Loader2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";

import {
  PRODUCT_ATTRIBUTE_FORM_ID,
  useAttributeForm
} from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";

/** Sticky footer: cancel + primary submit for the property sheet. */
export function AttributeSheetFooter(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { dismiss, isPending, mode } = useAttributeForm();

  const submitLabel = mode === "create" ? t("form.create") : t("form.save");

  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-4">
      <div className="flex flex-row justify-end gap-3">
        <Button type="button" variant="outline" size="default" className="min-w-[88px]" disabled={isPending} onClick={dismiss}>
          {t("form.cancel")}
        </Button>
        <Button type="submit" form={PRODUCT_ATTRIBUTE_FORM_ID} disabled={isPending} className="min-w-[140px] gap-2">
          {isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
