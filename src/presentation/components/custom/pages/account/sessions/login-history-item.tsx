import { type JSX } from "react"

import { Globe } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { useFormatter } from "~/src/hooks/use-display-format"

export const LoginHistoryItem = ({
  entry,
}: Readonly<{
  entry: AuditLog["customerLoginHistoryItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const format = useFormatter()

  return (
    <div className="flex items-center gap-4 py-4 sm:gap-5">
      <div className="flex size-8 shrink-0 items-center justify-center">
        <Globe className="size-3.5 text-muted-foreground/40" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-5">
        <div className="sm:min-w-0 sm:flex-1">
          <p className={entry.status === "failed" ? "text-[13px] text-destructive" : "text-[13px]"}>{t(`loginTitle.${entry.status}`)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {entry.ipAddress === undefined ? t("unknownLocation") : t("loginFrom", { ip: entry.ipAddress })}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums sm:mt-0 sm:shrink-0 sm:text-right">
          {format.dateTime(entry.createdAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
    </div>
  )
}
