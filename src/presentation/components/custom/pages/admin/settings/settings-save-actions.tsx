import { type JSX } from "react"

import { cn } from "cn"
import { Loader2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useFormatter } from "~/src/hooks/use-display-format"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ADMIN_HEADER_PRIMARY_BUTTON_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

const useSaveStatus = ({ isDirty, isPending, savedAt }: Readonly<Omit<SettingsSaveActionsProps, "formId">>): string => {
  const t = useTranslations("pages.admin.settings.save")
  const format = useFormatter()

  if (isPending) {
    return t("saving")
  }

  return isDirty ? t("unsaved") : t("saved", { date: format.dateTime(savedAt, { dateStyle: "medium", timeStyle: "short" }) })
}

export const SettingsSaveActions = ({ formId, isDirty, isPending, savedAt }: Readonly<SettingsSaveActionsProps>): JSX.Element => {
  const t = useTranslations("pages.admin.settings.save")
  const status = useSaveStatus({ isDirty, isPending, savedAt })

  return (
    <>
      <span aria-live="polite" className="hidden text-[13px] text-sidebar-foreground/60 md:inline">
        {status}
      </span>
      <Button
        className={cn(ADMIN_HEADER_PRIMARY_BUTTON_CLASS, "data-disabled:opacity-50")}
        disabled={!isDirty || isPending}
        focusableWhenDisabled
        form={formId}
        size="sm"
        type="submit"
      >
        {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
        {t("save")}
      </Button>
    </>
  )
}

interface SettingsSaveActionsProps {
  readonly formId: string
  readonly isDirty: boolean
  readonly isPending: boolean
  readonly savedAt: Date
}
