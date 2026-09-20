import { type JSX, useCallback } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl"

import { type AuditLogSeverity, SEVERITY_DOT_COLORS } from "~/src/modules/audit-log/audit-log.constants"
export const SeverityPill = ({ isActive, onToggle, severity }: SeverityPillProps): JSX.Element => {
  const t = useTranslations("pages.admin")
  const handleClick = useCallback(() => {
    onToggle(severity)
  }, [onToggle, severity])
  return (
    <button
      className={cn(
        "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
        isActive ? SEVERITY_ACTIVE_STYLES[severity] : "text-muted-foreground/60 hover:text-muted-foreground",
      )}
      onClick={handleClick}
      type="button"
    >
      <span className={`size-1.5 rounded-full ${SEVERITY_DOT_COLORS[severity]}`} />
      {t(`audit.severity.${severity}`)}
    </button>
  )
}
const SEVERITY_ACTIVE_STYLES: Record<AuditLogSeverity, string> = {
  error: "bg-red-500/10 text-red-500 font-medium",
  info: "bg-blue-500/10 text-blue-600 font-medium",
  success: "bg-emerald-500/10 text-emerald-600 font-medium",
  warning: "bg-amber-500/10 text-amber-600 font-medium",
}
interface SeverityPillProps {
  readonly isActive: boolean
  readonly onToggle: (severity: AuditLogSeverity) => void
  readonly severity: AuditLogSeverity
}
