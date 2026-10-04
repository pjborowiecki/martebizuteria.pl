import { type JSX } from "react"

import { Globe } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"

export const LoginHistoryItem = ({
  entry,
}: Readonly<{
  entry: CustomerAccount["loginHistoryItem"]
}>): JSX.Element => {
  const t = useTranslations("pages.account.sessions")
  const format = useFormatter()

  return (
    <div className="flex items-center gap-5 py-4">
      <div className="flex size-8 shrink-0 items-center justify-center">
        <Globe className="size-3.5 text-muted-foreground/40" strokeWidth={1.2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={entry.status === "failed" ? "text-[13px] text-destructive" : "text-[13px]"}>{t(`loginTitle.${entry.status}`)}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {entry.ipAddress === undefined ? t("unknownLocation") : t("loginFrom", { ip: entry.ipAddress })}
        </p>
      </div>
      <p className="shrink-0 text-right text-[11px] text-muted-foreground tabular-nums">
        {format.dateTime(entry.createdAt, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  )
}
