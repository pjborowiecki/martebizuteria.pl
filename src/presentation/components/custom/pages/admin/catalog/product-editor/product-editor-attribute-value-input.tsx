import { type ChangeEvent, type JSX, useCallback, useMemo } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { PRODUCT_ATTRIBUTE_TYPE, type ProductAttributeType } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import {
  parseMultiselectStoredValue,
  resolveAllowedValueLabel,
  stringifyMultiselectStoredValue,
} from "~/src/modules/product-attribute/product-attribute.utils"

import { Input } from "~/src/presentation/components/shadcn/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { CatalogEntityMultiSelect } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-entity-multi-select"
import { catalogFieldStringValue } from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.utils"

export const ProductEditorAttributeValueInput = ({
  definition,
  disabled = false,
  onChange,
  value,
}: Readonly<ProductEditorAttributeValueInputProps>): JSX.Element => {
  const locale = useLocale()
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const rawValue = catalogFieldStringValue(value)
  const type = definition?.type ?? PRODUCT_ATTRIBUTE_TYPE.TEXT
  if (type === PRODUCT_ATTRIBUTE_TYPE.BOOLEAN) {
    return <BooleanValueInput disabled={disabled} onChange={onChange} t={t} value={rawValue} />
  }

  const allowedValues = definition?.allowedValues
  if (type === PRODUCT_ATTRIBUTE_TYPE.SELECT && allowedValues !== null && allowedValues !== undefined) {
    return <SelectValueInput allowedValues={allowedValues} disabled={disabled} locale={locale} onChange={onChange} value={rawValue} />
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT && allowedValues !== null && allowedValues !== undefined) {
    return <MultiselectValueInput allowedValues={allowedValues} disabled={disabled} locale={locale} onChange={onChange} value={rawValue} />
  }

  if (type === PRODUCT_ATTRIBUTE_TYPE.NUMBER) {
    return (
      <NumberValueInput
        disabled={disabled}
        onChange={onChange}
        placeholder={t("valuePlaceholder")}
        unit={definition?.unit}
        value={rawValue}
      />
    )
  }

  return <TextValueInput disabled={disabled} inputMode="text" onChange={onChange} placeholder={t("valuePlaceholder")} value={rawValue} />
}

const TextValueInput = ({
  disabled,
  inputMode,
  onChange,
  placeholder,
  value,
}: Readonly<{
  disabled: boolean
  inputMode: "decimal" | "text"
  onChange: (value: string) => void
  placeholder: string
  value: string
}>): JSX.Element => {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    },
    [onChange],
  )

  return (
    <Input
      variant="sheet"
      className="w-full min-w-0"
      disabled={disabled}
      inputMode={inputMode}
      maxLength={ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value}
      onChange={handleChange}
      placeholder={placeholder}
      type="text"
      value={value}
    />
  )
}

const NumberValueInput = ({
  disabled,
  onChange,
  placeholder,
  unit,
  value,
}: Readonly<{
  disabled: boolean
  onChange: (value: string) => void
  placeholder: string
  unit?: string | null | undefined
  value: string
}>): JSX.Element => {
  const trimmedUnit = unit?.trim() ?? ""
  const hasUnit = trimmedUnit !== ""
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    },
    [onChange],
  )

  if (!hasUnit) {
    return <TextValueInput disabled={disabled} inputMode="decimal" onChange={onChange} placeholder={placeholder} value={value} />
  }

  return (
    <InputGroup variant="sheet">
      <InputGroupInput
        disabled={disabled}
        inputMode="decimal"
        maxLength={ATTRIBUTE_ON_PRODUCT_COLUMN_LENGTH.value}
        onChange={handleChange}
        placeholder={placeholder}
        type="text"
        value={value}
      />
      <InputGroupAddon align="inline-end" className="border-l border-border pl-3 text-[13px] font-normal text-muted-foreground">
        {trimmedUnit}
      </InputGroupAddon>
    </InputGroup>
  )
}

const BooleanValueInput = ({
  disabled,
  onChange,
  t,
  value,
}: Readonly<{
  disabled: boolean
  onChange: (value: string) => void
  t: (key: string) => string
  value: string
}>): JSX.Element => {
  const items = useMemo(
    () => [
      {
        label: t("booleanYes"),
        value: "true",
      },
      {
        label: t("booleanNo"),
        value: "false",
      },
    ],
    [t],
  )

  const selectValue = value === "true" || value === "false" ? value : ""
  const handleChange = useCallback(
    (next: string | null) => {
      if (next !== null) {
        onChange(next)
      }
    },
    [onChange],
  )

  return (
    <Select disabled={disabled} items={items} onValueChange={handleChange} value={selectValue}>
      <SelectTrigger size="sheet">
        <SelectValue placeholder={t("selectBoolean")} />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const SelectValueInput = ({
  allowedValues,
  disabled,
  locale,
  onChange,
  value,
}: Readonly<{
  allowedValues: readonly ProductAttribute["allowedValue"][]
  disabled: boolean
  locale: string
  onChange: (value: string) => void
  value: string
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const items = useMemo(
    () =>
      allowedValues.map((entry) => ({
        label: resolveAllowedValueLabel(entry, locale),
        value: entry.value,
      })),
    [allowedValues, locale],
  )

  const handleChange = useCallback(
    (next: string | null) => {
      if (next !== null) {
        onChange(next)
      }
    },
    [onChange],
  )

  return (
    <Select disabled={disabled} items={items} onValueChange={handleChange} value={value}>
      <SelectTrigger size="sheet">
        <SelectValue placeholder={t("selectAllowedValue")} />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const MultiselectValueInput = ({
  allowedValues,
  disabled,
  locale,
  onChange,
  value,
}: Readonly<{
  allowedValues: readonly ProductAttribute["allowedValue"][]
  disabled: boolean
  locale: string
  onChange: (value: string) => void
  value: string
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.attributes")
  const options = useMemo(
    () =>
      allowedValues.map((entry) => ({
        id: entry.value,
        label: resolveAllowedValueLabel(entry, locale),
      })),
    [allowedValues, locale],
  )

  const selectedIds = useMemo(() => parseMultiselectStoredValue(value), [value])
  const handleChange = useCallback(
    (ids: readonly string[]) => {
      onChange(stringifyMultiselectStoredValue(ids))
    },
    [onChange],
  )

  return (
    <CatalogEntityMultiSelect
      ariaLabel={t("value")}
      disabled={disabled}
      onChange={handleChange}
      options={options}
      placeholder={t("selectAllowedValue")}
      selectedIds={selectedIds}
      showSelectedBadges={false}
    />
  )
}

export interface ProductEditorAttributeDefinition {
  readonly allowedValues: readonly ProductAttribute["allowedValue"][] | null
  readonly type: ProductAttributeType
  readonly unit?: string | null
}

interface ProductEditorAttributeValueInputProps {
  readonly definition: ProductEditorAttributeDefinition | undefined
  readonly disabled?: boolean
  readonly onChange: (value: string) => void
  readonly value: string
}
