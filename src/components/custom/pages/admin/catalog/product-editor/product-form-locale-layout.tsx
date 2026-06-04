import { type JSX, type ReactNode, useEffect, useMemo } from "react";

import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { useCatalogFormLocaleControls } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";
import { CatalogLocalePickerLayout } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-picker";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { localeFillMap } from "~/src/modules/product-attribute/product-attribute.utils";

const ZERO_LENGTH = 0;

export function ProductFormLocaleLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");
  const { control } = useFormContext<ProductFormValues>();
  const { activeLocale, clearLocaleSubmitError, incompleteLocales, localeSubmitError, setActiveLocale } = useCatalogFormLocaleControls();
  const titles = useWatch({ control, name: "titles" });
  const fills = useMemo(() => localeFillMap(titles), [titles]);

  useEffect(
    function clearLocaleSubmitErrorWhenTitlesFilled() {
      if (localeSubmitError && fills.pl && fills.en) {
        clearLocaleSubmitError();
      }
    },
    [clearLocaleSubmitError, fills.en, fills.pl, localeSubmitError]
  );

  return (
    <CatalogLocalePickerLayout
      activeLocale={activeLocale}
      filledCountHint={t("form.localePicker.filledCountHint")}
      fills={fills}
      incompleteLocales={incompleteLocales}
      onLocaleChange={setActiveLocale}
      showSubmitError={localeSubmitError && incompleteLocales.length > ZERO_LENGTH}
    >
      {children}
    </CatalogLocalePickerLayout>
  );
}
