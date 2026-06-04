import { type JSX, useCallback, useEffect, useMemo } from "react";

import { SlidersHorizontal } from "lucide-react";
import { useController, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { AttributeAllowedValuesField } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-allowed-values-field";
import { AttributeUnitField } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/_sections/attribute-unit-field";
import { useAttributeForm } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";
import { AttributeFormSection } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-section";
import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";

import {
  PRODUCT_ATTRIBUTE_TYPES,
  PRODUCT_ATTRIBUTE_TYPE,
  productAttributeTypeUsesAllowedValues
} from "~/src/modules/product-attribute/product-attribute.constants";

export function ValueSettingsSection(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.attributes");
  const { control, isPending, setValue } = useAttributeForm();
  const selectedType = useWatch({ control, name: "type" });

  const { field: typeField, fieldState: typeFieldState } = useController({ control, name: "type" });
  const typeOptions = useMemo(
    () =>
      PRODUCT_ATTRIBUTE_TYPES.map((type) => ({
        label: t(`types.${type}`),
        value: type
      })),
    [t]
  );

  const isNumberType = selectedType === PRODUCT_ATTRIBUTE_TYPE.NUMBER;
  const showAllowedValues = productAttributeTypeUsesAllowedValues(selectedType);

  const handleTypeChange = useCallback(
    (value: string | null) => {
      if (value !== null) {
        typeField.onChange(value);
      }
    },
    [typeField]
  );

  useEffect(
    function clearAllowedValuesWhenTypeChanges() {
      if (!productAttributeTypeUsesAllowedValues(selectedType)) {
        setValue("allowedValues", [], { shouldDirty: true });
      }
    },
    [selectedType, setValue]
  );

  return (
    <AttributeFormSection icon={SlidersHorizontal} title={t("form.sectionValue")}>
      <Field className="gap-2" data-invalid={typeFieldState.invalid}>
        <CatalogFormFieldLabel hint={t("form.hints.type")} label={t("form.type")} required />
        <Select disabled={isPending} items={typeOptions} onValueChange={handleTypeChange} value={typeField.value}>
          <SelectTrigger aria-invalid={typeFieldState.invalid} aria-label={t("form.type")} size="sheet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <CatalogFormFieldError fieldState={typeFieldState} />
      </Field>

      {showAllowedValues && <AttributeAllowedValuesField />}

      {isNumberType && <AttributeUnitField disabled={isPending} />}
    </AttributeFormSection>
  );
}
