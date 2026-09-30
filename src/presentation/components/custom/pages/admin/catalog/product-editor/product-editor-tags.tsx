import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback, useState } from "react"

import { cn } from "cn"
import { X } from "lucide-react"
import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import { useCatalogActiveLocale } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import {
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"

export const ProductEditorTags = ({ fillHeight = false }: Readonly<ProductEditorTagsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const activeLocale = useCatalogActiveLocale()
  const { control, getValues, setValue } = useFormContext<ProductFormValues>()
  const tags = useWatch({
    control,
    defaultValue: [],
    name: `tags.${activeLocale}`,
  })

  const [tagInput, setTagInput] = useState("")
  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase()
    if (trimmed === "") {
      return
    }

    const fieldName = `tags.${activeLocale}` as const
    const current = getValues(fieldName)
    if (!current.includes(trimmed)) {
      setValue(fieldName, [...current, trimmed], {
        shouldDirty: true,
      })
      setTagInput("")
    }
  }, [activeLocale, getValues, setValue, tagInput])

  const handleRemoveTag = useCallback(
    (tag: string) => {
      const fieldName = `tags.${activeLocale}` as const
      setValue(
        fieldName,
        getValues(fieldName).filter((entry) => entry !== tag),
        {
          shouldDirty: true,
        },
      )
    },
    [activeLocale, getValues, setValue],
  )

  return (
    <Card className={cn(fillHeight && "flex h-full flex-col")}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("tags.title")}</CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-4", fillHeight && "flex min-h-0 flex-1 flex-col")}>
        <TagAddField activeLocale={activeLocale} onAdd={handleAddTag} onChange={setTagInput} value={tagInput} />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagItem key={tag} onRemove={handleRemoveTag} tag={tag} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const TagAddField = ({ activeLocale, onAdd, onChange, value }: Readonly<TagAddFieldProps>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const tLocale = useTranslations("pages.admin.catalog.localePicker")
  const handleTagInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        onAdd()
      }
    },
    [onAdd],
  )

  const handleTagInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value)
    },
    [onChange],
  )

  return (
    <Field className={CATALOG_SHEET_FIELD_CLASS}>
      <CatalogFormFieldLabel
        counter={`${value.length}/${PRODUCT_COLUMN_LENGTH.tag}`}
        hint={t("form.hints.tagsLocale", {
          locale: tLocale(`localeNames.${activeLocale}`),
        })}
        label={t(`tags.fieldLabel.${activeLocale}`)}
      />
      <div className="flex items-end gap-2">
        <Input
          variant="sheet"
          className="min-w-0 flex-1"
          maxLength={PRODUCT_COLUMN_LENGTH.tag}
          onChange={handleTagInputChange}
          onKeyDown={handleTagInputKeyDown}
          placeholder={t("tags.placeholder")}
          type="text"
          value={value}
        />
        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} onClick={onAdd} type="button" variant="outline">
          {t("tags.add")}
        </Button>
      </div>
    </Field>
  )
}

const TagItem = ({
  onRemove,
  tag,
}: Readonly<{
  onRemove: (tag: string) => void
  tag: string
}>): JSX.Element => {
  const handleRemove = useCallback(() => {
    onRemove(tag)
  }, [onRemove, tag])

  return (
    <Badge className="gap-1 rounded-md pr-1 text-[11px] font-normal" variant="secondary">
      {tag}
      <button
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
        onClick={handleRemove}
        type="button"
      >
        <X className="size-2.5" strokeWidth={2} />
      </button>
    </Badge>
  )
}

interface ProductEditorTagsProps {
  readonly fillHeight?: boolean
}

interface TagAddFieldProps {
  readonly activeLocale: string
  readonly onAdd: () => void
  readonly onChange: (value: string) => void
  readonly value: string
}
