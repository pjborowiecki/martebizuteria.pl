import { type JSX, type ReactNode, useEffect, useMemo } from "react";

import { useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { LOCALES } from "~/src/constants/_constants/locales";

import { useAttributeFormLocaleControls } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls";
import { isCommittedAllowedValueRow } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale.utils";
import { useAttributeForm } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";
import { CatalogLocalePickerLayout } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-picker";

import type {
  ProductAttributeAllowedValue,
  ProductAttributeLocaleCode,
  ProductAttributeLocaleMap
} from "~/src/modules/product-attribute/product-attribute.types";
import { localeFillMap } from "~/src/modules/product-attribute/product-attribute.utils";

const ZERO_LENGTH = 0;
const EMPTY_ALLOWED_VALUES: ProductAttributeAllowedValue[] = [];

function allowedValueLocaleFillMap(allowedValues: readonly ProductAttributeAllowedValue[]): Record<ProductAttributeLocaleCode, boolean> {
  const committedRows = allowedValues.filter((entry) => isCommittedAllowedValueRow(entry));

  if (committedRows.length === ZERO_LENGTH) {
    return Object.fromEntries(LOCALES.map((locale) => [locale, true]));
  }

  return Object.fromEntries(LOCALES.map((locale) => [locale, committedRows.every((entry) => (entry.labels[locale] ?? "").trim() !== "")]));
}

function attributeFormLocaleFillMap(
  titles: ProductAttributeLocaleMap | undefined,
  allowedValues: readonly ProductAttributeAllowedValue[]
): Record<ProductAttributeLocaleCode, boolean> {
  const titleFills = localeFillMap(titles);
  const optionFills = allowedValueLocaleFillMap(allowedValues);

  return Object.fromEntries(LOCALES.map((locale) => [locale, titleFills[locale] && optionFills[locale]]));
}

export function AttributeFormLocaleLayout({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const tAttributes = useTranslations("pages.admin.catalog.attributes");
  const { control } = useAttributeForm();
  const { activeLocale, clearLocaleSubmitError, incompleteLocales, localeSubmitError, setActiveLocale } = useAttributeFormLocaleControls();
  const titles = useWatch({ control, name: "titles" }) as ProductAttributeLocaleMap | undefined;
  const allowedValues = (useWatch({ control, name: "allowedValues" }) ?? EMPTY_ALLOWED_VALUES) as ProductAttributeAllowedValue[];
  const fills = useMemo(() => attributeFormLocaleFillMap(titles, allowedValues), [allowedValues, titles]);

  useEffect(
    function clearLocaleSubmitErrorWhenAllLocalesFilled() {
      if (localeSubmitError && LOCALES.every((locale) => fills[locale])) {
        clearLocaleSubmitError();
      }
    },
    [clearLocaleSubmitError, fills, localeSubmitError]
  );

  return (
    <CatalogLocalePickerLayout
      activeLocale={activeLocale}
      filledCountHint={tAttributes("form.localePicker.filledCountHint")}
      fills={fills}
      incompleteLocales={incompleteLocales}
      onLocaleChange={setActiveLocale}
      showSubmitError={localeSubmitError && incompleteLocales.length > ZERO_LENGTH}
    >
      {children}
    </CatalogLocalePickerLayout>
  );
}
