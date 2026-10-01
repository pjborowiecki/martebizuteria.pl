import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

export const OrderNoteBlock = ({ note }: Readonly<{ note?: string | undefined }>): JSX.Element | undefined => {
  const t = useTranslations("pages.account.orderDetail")

  if (note === undefined || note.trim() === "") {
    return undefined
  }

  return (
    <div className="mt-10">
      <h3 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("note")}</h3>
      <Separator className="mt-3 mb-4" />
      <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{note}</p>
    </div>
  )
}
