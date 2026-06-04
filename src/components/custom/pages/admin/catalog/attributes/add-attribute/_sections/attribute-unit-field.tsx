import { type ChangeEvent, type JSX, useCallback, useEffect, useMemo, useState } from "react";

import { useController } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { useAttributeForm } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";
import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { catalogFieldStringValue } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.utils";

import {
  PRODUCT_ATTRIBUTE_COLUMN_LENGTH,
  PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE,
  PRODUCT_ATTRIBUTE_UNIT_PRESETS
} from "~/src/modules/product-attribute/product-attribute.constants";
import {
  isProductAttributeUnitPreset,
  resolveProductAttributeUnitSelectValue
} from "~/src/modules/product-attribute/product-attribute.utils";

const EMPTY_UNIT = "";

interface AttributeUnitFieldProps {
  readonly disabled: boolean;
}

export function AttributeUnitField({ disabled }: Readonly<AttributeUnitFieldProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { control } = useAttributeForm();
  const { field, fieldState } = useController({ control, name: "unit" });

  const unitValue = catalogFieldStringValue(field.value);
  const [customMode, setCustomMode] = useState(() => unitValue !== EMPTY_UNIT && !isProductAttributeUnitPreset(unitValue));

  useEffect(
    function syncCustomModeFromUnit() {
      setCustomMode(unitValue !== EMPTY_UNIT && !isProductAttributeUnitPreset(unitValue));
    },
    [unitValue]
  );

  const selectValue = resolveProductAttributeUnitSelectValue(unitValue);
  const showCustomInput = customMode || selectValue === PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE;

  const selectItems = useMemo(
    () => [
      { label: t("form.unitNone"), value: EMPTY_UNIT },
      ...PRODUCT_ATTRIBUTE_UNIT_PRESETS.map((preset) => ({ label: preset, value: preset })),
      { label: t("form.unitCustom"), value: PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE }
    ],
    [t]
  );

  const handleSelectChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }

      if (value === PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE) {
        setCustomMode(true);
        return;
      }

      setCustomMode(false);
      field.onChange(value);
    },
    [field]
  );

  const handleCustomInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event.target.value);
      setCustomMode(true);
    },
    [field]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel hint={t("form.hints.unit")} label={t("form.unit")} />
      <Select
        disabled={disabled}
        items={selectItems}
        onValueChange={handleSelectChange}
        value={showCustomInput ? PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE : selectValue}
      >
        <SelectTrigger aria-invalid={fieldState.invalid} aria-label={t("form.unit")} size="sheet">
          <SelectValue placeholder={t("form.unitSelectPlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {selectItems.map((option) => (
            <SelectItem key={option.value === EMPTY_UNIT ? "none" : option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showCustomInput && (
        <Input
          aria-invalid={fieldState.invalid}
          variant="sheet"
          className="w-full min-w-0"
          disabled={disabled}
          maxLength={PRODUCT_ATTRIBUTE_COLUMN_LENGTH.unit}
          onChange={handleCustomInputChange}
          placeholder={t("form.unitCustomPlaceholder")}
          value={unitValue}
        />
      )}
      <CatalogFormFieldError fieldState={fieldState} />
    </Field>
  );
}
