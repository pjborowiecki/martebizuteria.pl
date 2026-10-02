import { type JSX } from "react"

import { cn } from "cn"
import { ExternalLink, Loader2 } from "lucide-react"
import { type Control, useFormState, useWatch } from "react-hook-form"
import { useFormatter, useTranslations } from "use-intl/react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { CONTENT_PAGE_PATHS, type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"

import {
  ADMIN_HEADER_PRIMARY_BUTTON_CLASS,
  ADMIN_HEADER_SECONDARY_BUTTON_CLASS,
} from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"
import { CONTENT_PAGE_FORM_ID } from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"

export const ContentPageEditorActions = ({ control, handle, isPending, locale }: Readonly<ContentPageEditorActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.content.editor")
  const format = useFormatter()
  const { isDirty } = useFormState({ control })
  const savedAt = useWatch({ control, name: "expectedUpdatedAt" })
  const statusLabel = isDirty
    ? t("status.unsaved")
    : t("status.saved", { date: format.dateTime(savedAt, { dateStyle: "medium", timeStyle: "short" }) })

  return (
    <>
      <span aria-live="polite" className="hidden text-[13px] text-sidebar-foreground/60 md:inline">
        {isPending ? t("status.saving") : statusLabel}
      </span>
      <a
        className={cn(buttonVariants({ size: "sm", variant: "outline" }), ADMIN_HEADER_SECONDARY_BUTTON_CLASS)}
        href={localizePathname({ locale, pathname: CONTENT_PAGE_PATHS[handle] })}
        rel="noopener noreferrer"
        target="_blank"
      >
        <ExternalLink className="size-3.5" strokeWidth={1.5} />
        {t("actions.view")}
      </a>
      <Button
        className={cn(ADMIN_HEADER_PRIMARY_BUTTON_CLASS, "data-disabled:opacity-50")}
        disabled={!isDirty || isPending}
        focusableWhenDisabled
        form={CONTENT_PAGE_FORM_ID}
        size="sm"
        type="submit"
      >
        {isPending && <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />}
        {t("actions.save")}
      </Button>
    </>
  )
}

interface ContentPageEditorActionsProps {
  readonly control: Control<ContentPage["formValues"]>
  readonly handle: ContentPageHandle
  readonly isPending: boolean
  readonly locale: SupportedLocale
}
