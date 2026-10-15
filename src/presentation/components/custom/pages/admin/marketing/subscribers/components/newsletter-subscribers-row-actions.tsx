import { type JSX, type MouseEvent, useCallback, useMemo } from "react"

import { Copy, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

export const NewsletterSubscribersRowActions = ({ subscriber }: Readonly<{ subscriber: Newsletter["adminListItem"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const { email } = subscriber

  const handleCopyEmail = useCallback(() => {
    void navigator.clipboard.writeText(email)
    toast.success(t("rowActions.copyEmailToast"))
  }, [email, t])

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const trigger = useMemo(
    () => (
      <Button
        aria-label={t("columns.actions")}
        className="size-8"
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [stopRowClick, t],
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-52 p-1.5">
        <DropdownMenuItem className={ITEM_CLASS} onClick={handleCopyEmail}>
          <Copy className="size-4" strokeWidth={1.5} />
          {t("rowActions.copyEmail")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"
