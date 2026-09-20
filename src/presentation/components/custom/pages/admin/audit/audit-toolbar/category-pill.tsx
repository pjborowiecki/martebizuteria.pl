import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { type AuditLogCategoryFilter } from "~/src/modules/audit-log/audit-log.constants"
export const CategoryPill = ({ category, isActive, onSelect }: CategoryPillProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const handleClick = useCallback(() => {
    onSelect(category)
  }, [category, onSelect])
  return (
    <button
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        isActive ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={handleClick}
      type="button"
    >
      {t(`audit.categories.${category}`)}
    </button>
  )
}
interface CategoryPillProps {
  readonly category: AuditLogCategoryFilter
  readonly isActive: boolean
  readonly onSelect: (category: AuditLogCategoryFilter) => void
}
