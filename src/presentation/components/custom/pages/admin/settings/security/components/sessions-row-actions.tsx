import { type JSX, type MouseEvent, useCallback, useMemo } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOut, MoreHorizontal } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { type Session } from "~/src/modules/session/session.types"
import { revokeCustomerSessionMutation } from "~/src/modules/session/use-cases/revoke-customer-session"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

export const SessionsRowActions = ({ session }: Readonly<{ session: Session["customerSession"] }>): JSX.Element | undefined => {
  const t = useTranslations("pages.admin.settings.security.sessions")
  const tSessions = useTranslations("pages.account.sessions")
  const queryClient = useQueryClient()
  const revoke = useMutation({
    ...revokeCustomerSessionMutation,
    onError: () => {
      toast.error(tSessions("revokeError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CUSTOMER.SESSIONS })
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
