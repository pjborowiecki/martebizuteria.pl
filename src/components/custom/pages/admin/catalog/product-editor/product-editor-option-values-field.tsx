import { type ChangeEvent, type JSX, useCallback } from "react";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { useCatalogActiveLocale } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-picker";
import {
  CatalogSheetActionColumn,
  CatalogSheetControlsActionRow
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout";
import {
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_FIELD_CLASS
} from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { createEmptyProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.utils";
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

const EMPTY_LENGTH = 0;
const MIN_VALUE_ROWS = 1;

type OptionValueDraft = ProductFormValues["options"][number]["values"][number];

interface ProductEditorOptionValuesFieldProps {
  readonly onValuesChange: (values: ProductFormValues["options"][number]["values"]) => void;
  readonly values: ProductFormValues["options"][number]["values"];
}

function resolveEditableValues(values: ProductFormValues["options"][number]["values"]): OptionValueDraft[] {
  if (values.length === EMPTY_LENGTH) {
    return [{ labels: createEmptyProductAttributeLocaleMap() }];
  }

  return values;
}

export function ProductEditorOptionValuesField({ onValuesChange, values }: Readonly<ProductEditorOptionValuesFieldProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.options");
  const tProducts = useTranslations("pages.admin.catalog.products");
  const tLocale = useTranslations("pages.admin.catalog.localePicker");
  const activeLocale = useCatalogActiveLocale();
  const rows = resolveEditableValues(values);

  const handleAddRow = useCallback(() => {
    const current = resolveEditableValues(values);
    onValuesChange([...current, { labels: createEmptyProductAttributeLocaleMap() }]);
  }, [onValuesChange, values]);

  const handleRemoveRow = useCallback(
    (index: number) => {
      const current = resolveEditableValues(values);
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      onValuesChange(next.length === EMPTY_LENGTH ? [{ labels: createEmptyProductAttributeLocaleMap() }] : next);
    },
    [onValuesChange, values]
  );

  const handleLabelChange = useCallback(
    (index: number, nextValue: string) => {
      const current = resolveEditableValues(values);
      const row = current[index];
      const next = [...current];
      next[index] = {
        id: row.id,
        labels: { ...row.labels, [activeLocale]: nextValue }
      };
      onValuesChange(next);
    },
    [activeLocale, onValuesChange, values]
  );

  return (
    <Field className={`${CATALOG_SHEET_FIELD_CLASS} md:col-span-2`}>
      <CatalogFormFieldLabel
        hint={tProducts("form.hints.optionValues", { locale: tLocale(`localeNames.${activeLocale}`) })}
        label={t(`optionValueLabel.${activeLocale}`)}
      />

      <div className="space-y-3">
        {rows.map((row, index) => (
          <OptionValueRow
            index={index}
            key={row.id ?? `option-value-${index}`}
            label={row.labels[activeLocale]}
            onLabelChange={handleLabelChange}
            onRemove={handleRemoveRow}
            showRemove={rows.length > MIN_VALUE_ROWS}
          />
        ))}

        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} onClick={handleAddRow} type="button" variant="outline">
          <Plus className="size-4" strokeWidth={1.5} />
          {t("addValue")}
        </Button>
      </div>
    </Field>
  );
}

function OptionValueRow({
  index,
  label,
  onLabelChange,
  onRemove,
  showRemove
}: Readonly<{
  index: number;
  label: string;
  onLabelChange: (index: number, nextValue: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.options");
  const activeLocale = useCatalogActiveLocale();

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onLabelChange(index, event.target.value);
    },
    [index, onLabelChange]
  );

  const handleRemoveClick = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);

  return (
    <div className="rounded-lg border border-border/80 bg-muted/10 p-3">
      <CatalogSheetControlsActionRow>
        <Field className={CATALOG_SHEET_FIELD_CLASS}>
          <Input
            maxLength={PRODUCT_COLUMN_LENGTH.optionValue}
            onChange={handleChange}
            placeholder={t(`optionValuePlaceholder.${activeLocale}`)}
            value={label}
            variant="sheet"
          />
        </Field>
        {showRemove && (
          <CatalogSheetActionColumn>
            <Button
              aria-label={t("removeValue")}
              className="size-10 shrink-0"
              onClick={handleRemoveClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </CatalogSheetActionColumn>
        )}
      </CatalogSheetControlsActionRow>
    </div>
  );
}
