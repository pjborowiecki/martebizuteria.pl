import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react"

import { Copy, MailX, MoreHorizontal, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { suppressNextDataGridRowClick } from "~/src/presentation/components/custom/datagrid/lib/data-grid-row-click"
import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { useCatalogRowActionMenu } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu"
import {
  useEraseNewsletterSubscriber,
  useUnsubscribeNewsletterSubscriber,
} from "~/src/presentation/components/custom/pages/admin/marketing/subscribers/hooks/use-newsletter-subscriber-mutations"

export const NewsletterSubscribersRowActions = ({ subscriber }: Readonly<{ subscriber: Newsletter["adminListItem"] }>): JSX.Element => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const unsubscribeSubscriber = useUnsubscribeNewsletterSubscriber()
  const eraseSubscriber = useEraseNewsletterSubscriber()
  const [dialog, setDialog] = useState<SubscriberDialog>("unsubscribeDialog")
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen,
  )

  const { email, id, status } = subscriber
  const handleCopyEmail = useCallback(() => {
    void navigator.clipboard.writeText(email)
    toast.success(t("rowActions.copyEmailToast"))
  }, [email, t])

  const requestConfirm = useCallback(
    (nextDialog: SubscriberDialog) => () => {
      setDialog(nextDialog)
      closeMenuAndRequestDeleteConfirm()
    },
    [closeMenuAndRequestDeleteConfirm],
  )

  const handleConfirm = useCallback(() => {
    const confirmation = {
      onSuccess: () => {
        toast.success(t(`${dialog}.successTitle`), { description: t(`${dialog}.successDescription`, { email }) })
        handleConfirmOpenChange(false)
      },
    }
    if (dialog === "eraseDialog") {
      eraseSubscriber.mutate({ id }, confirmation)

      return
    }
    unsubscribeSubscriber.mutate({ id }, confirmation)
  }, [dialog, email, eraseSubscriber, handleConfirmOpenChange, id, t, unsubscribeSubscriber])

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      suppressNextDataGridRowClick()
      action()
    },
    [],
  )

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
    <>
      <DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyEmail)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("rowActions.copyEmail")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          {status !== NEWSLETTER_STATUS.UNSUBSCRIBED && (
            <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(requestConfirm("unsubscribeDialog"))}>
              <MailX className="size-4" strokeWidth={1.5} />
              {t("rowActions.unsubscribe")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(requestConfirm("eraseDialog"))} variant="destructive">
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("rowActions.erase")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CatalogDeleteConfirmDialog
        cancelLabel={t(`${dialog}.cancel`)}
        confirmLabel={t(`${dialog}.confirm`)}
        description={t(`${dialog}.description`, { email })}
        isPending={dialog === "eraseDialog" ? eraseSubscriber.isPending : unsubscribeSubscriber.isPending}
        onConfirm={handleConfirm}
        onOpenChange={handleConfirmOpenChange}
        open={confirmOpen}
        title={t(`${dialog}.title`)}
      />
    </>
  )
}

type SubscriberDialog = "eraseDialog" | "unsubscribeDialog"

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3"
