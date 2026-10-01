import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

export const SessionCurrentBadge = (): JSX.Element => {
  const t = useTranslations("pages.account.sessions")

  return (
    <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase">
      <span className="size-1.5 rounded-full bg-green-500" />
      {t("current")}
    </span>
  )
}
