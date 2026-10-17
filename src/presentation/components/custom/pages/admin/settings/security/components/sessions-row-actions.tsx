import { type JSX, type MouseEvent, useCallback, useMemo } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { revokeCustomerSessionMutation } from "~/src/modules/customer-account/use-cases/revoke-customer-session"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

export const SessionsRowActions = ({ session }: Readonly<{ session: CustomerAccount["session"] }>): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const tSessions = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const revoke = useMutation({
    ...revokeCustomerSessionMutation,
    onError: () => {
      toast.error(tSessions("revokeError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.SESSIONS })
      toast.success(tSessions("revokeSuccess"))
    },
  })

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation()
  }, [])

  const trigger = useMemo(
    () => (
      <Button
        aria-label={t("rowActions.menu", { device: session.device })}
        className="size-8"
        onClick={stopRowClick}
        onPointerDown={stopRowClick}
        size="icon"
        variant="ghost"
      >
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [session.device, stopRowClick, t],
  )

  if (session.isCurrent) {
    return undefined
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-52 p-1.5">
        <DropdownMenuItem
          className="gap-3 px-3 py-2.5 text-[13px]"
          disabled={revoke.isPending}
          onClick={() => {
            revoke.mutate({ sessionId: session.id })
          }}
          variant="destructive"
        >
          <LogOut className="size-4" strokeWidth={1.5} />
          {t("rowActions.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
