import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback, useEffect, useState } from "react"

import { X } from "lucide-react"
import { useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { ADMIN_CUSTOMER_FORM_FIELD_MAX } from "~/src/modules/user/user.constants"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Field } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"
import {
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_FIELD_CLASS,
} from "~/src/presentation/components/custom/pages/admin/catalog/form/lib/catalog-form.styles"
import { useCustomerForm } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-provider"
export const CustomerTagsField = (): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const tDetail = useTranslations("pages.admin.customerDetail")
  const { control, customer, getValues, isPending, registerCommitPendingTag, setValue } = useCustomerForm()
  const customTags = useWatch({
    control,
    defaultValue: [],
    name: "customTags",
  })
  const [draft, setDraft] = useState("")
  const commitDraft = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed === "") {
      return
    }
    const parts = trimmed
      .split(TAG_SEPARATOR_PATTERN)
      .map((part) => part.trim())
      .filter((part) => part !== "")
    if (parts.length === 0) {
      return
    }
    const current = getValues("customTags")
    const next = [...current]
    for (const part of parts) {
      if (next.length >= ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT) {
        break
      }
      if (!next.includes(part)) {
        next.push(part)
      }
    }
    if (next.length !== current.length) {
      setValue("customTags", next, {
        shouldDirty: true,
        shouldValidate: true,
      })
    }
    setDraft("")
  }, [draft, getValues, setValue])
  useEffect(() => {
    registerCommitPendingTag(commitDraft)
  }, [commitDraft, registerCommitPendingTag])
  const handleAddClick = useCallback(() => {
    commitDraft()
  }, [commitDraft])
  const handleDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value)
  }, [])
  const handleDraftKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        commitDraft()
      }
    },
    [commitDraft],
  )
  const handleRemoveTag = useCallback(
    (tag: string) => {
      const current = getValues("customTags")
      setValue(
        "customTags",
        current.filter((value) => value !== tag),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      )
    },
    [getValues, setValue],
  )
  const atTagLimit = customTags.length >= ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT
  return (
    <div className="space-y-4">
      {customer.tags.length > 0 && (
        <Field className={CATALOG_SHEET_FIELD_CLASS}>
          <CatalogFormFieldLabel hint={t("hints.systemTags")} label={t("systemTags")} />
          <div className="flex flex-wrap gap-1.5">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tDetail(`tags.values.${tag}`)}
              </Badge>
            ))}
          </div>
        </Field>
      )}

      <Field className={CATALOG_SHEET_FIELD_CLASS}>
        <CatalogFormFieldLabel
          counter={`${customTags.length}/${ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAGS_COUNT}`}
          hint={t("hints.customTags")}
          label={t("customTags")}
        />
        <div className="flex items-end gap-2">
          <Input
            variant="sheet"
            className="min-w-0 flex-1"
            value={draft}
            placeholder={t("customTagsPlaceholder")}
            disabled={isPending || atTagLimit}
            maxLength={ADMIN_CUSTOMER_FORM_FIELD_MAX.CUSTOM_TAG}
            type="text"
            onChange={handleDraftChange}
            onKeyDown={handleDraftKeyDown}
          />
          <Button
            className={CATALOG_SHEET_ACTION_BUTTON_CLASS}
            disabled={isPending || atTagLimit || draft.trim() === ""}
            type="button"
            variant="outline"
            onClick={handleAddClick}
          >
            {t("addTag")}
          </Button>
        </div>
      </Field>

      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {customTags.map((tag) => (
            <CustomerCustomTagBadge key={tag} disabled={isPending} tag={tag} onRemove={handleRemoveTag} />
          ))}
        </div>
      )}
    </div>
  )
}
const CustomerCustomTagBadge = ({
  disabled,
  onRemove,
  tag,
}: Readonly<{
  disabled: boolean
  onRemove: (tag: string) => void
  tag: string
}>): JSX.Element => {
  const t = useTranslations("pages.admin.customerDetail.form")
  const handleRemoveClick = useCallback(() => {
    onRemove(tag)
  }, [onRemove, tag])
  return (
    <Badge variant="outline" className="gap-1 rounded-md pr-1 text-[11px] font-normal">
      {tag}
      <button
        type="button"
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
        aria-label={t("removeTag", {
          tag,
        })}
        disabled={disabled}
        onClick={handleRemoveClick}
      >
        <X className="size-2.5" strokeWidth={2} />
      </button>
    </Badge>
  )
}
const TAG_SEPARATOR_PATTERN = /[,;]/u
