import { type ChangeEvent, type JSX, useCallback } from "react";

import { useController } from "react-hook-form";

import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { useAttributeForm } from "~/src/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider";
import { CatalogFormFieldError } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-error";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import type { CatalogLocaleFieldsCopy } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-fields";
import { useCatalogActiveLocale } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-locale-picker";
import { catalogFieldStringValue } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.utils";

import type { ProductAttributeLocaleCode } from "~/src/modules/product-attribute/product-attribute.types";

const TITLE_MAX_LENGTH = 255;

interface AttributeTitleLocaleFieldsProps {
  readonly copy: CatalogLocaleFieldsCopy;
  readonly disabled: boolean;
  readonly onDefaultLocaleChange?: (value: string) => void;
  readonly required: boolean;
  readonly translateValidation: (key: string) => string;
  readonly validationKeySet: ReadonlySet<string>;
}

export function AttributeTitleLocaleFields({
  copy,
  disabled,
  onDefaultLocaleChange,
  required,
  translateValidation,
  validationKeySet
}: Readonly<AttributeTitleLocaleFieldsProps>): JSX.Element {
  const activeLocale = useCatalogActiveLocale();

  return (
    <AttributeTitleLocaleField
      copy={copy}
      disabled={disabled}
      locale={activeLocale}
      onDefaultLocaleChange={onDefaultLocaleChange}
      required={required}
      translateValidation={translateValidation}
      validationKeySet={validationKeySet}
    />
  );
}

function AttributeTitleLocaleField({
  copy,
  disabled,
  locale,
  onDefaultLocaleChange,
  required,
  translateValidation,
  validationKeySet
}: Readonly<{
  copy: CatalogLocaleFieldsCopy;
  disabled: boolean;
  locale: ProductAttributeLocaleCode;
  onDefaultLocaleChange?: (value: string) => void;
  required: boolean;
  translateValidation: (key: string) => string;
  validationKeySet: ReadonlySet<string>;
}>): JSX.Element {
  const { control } = useAttributeForm();
  const { field, fieldState } = useController({
    control,
    name: `titles.${locale}`
  });
  const value = catalogFieldStringValue(field.value);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      field.onChange(event);
      if (locale === DEFAULT_LOCALE) {
        onDefaultLocaleChange?.(event.target.value);
      }
    },
    [field, locale, onDefaultLocaleChange]
  );

  return (
    <Field className="gap-2" data-invalid={fieldState.invalid}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${TITLE_MAX_LENGTH}`}
        hint={copy.hint(locale)}
        label={copy.label(locale)}
        required={required}
      />
      <Input
        {...field}
        aria-invalid={fieldState.invalid}
        variant="sheet"
        disabled={disabled}
        maxLength={TITLE_MAX_LENGTH}
        onChange={handleChange}
        placeholder={copy.placeholder(locale)}
        value={value}
      />
      <CatalogFormFieldError fieldState={fieldState} translate={translateValidation} validationKeySet={validationKeySet} />
    </Field>
  );
}
