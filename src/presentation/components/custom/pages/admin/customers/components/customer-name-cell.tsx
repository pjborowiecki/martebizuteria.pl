import { type JSX } from "react"

import { type User } from "~/src/modules/user/user.types"
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"

export const CustomerNameCell = ({
  customer,
}: Readonly<{
  customer: User["adminCustomerListItem"]
}>): JSX.Element => (
  <div className="flex h-9 min-w-0 items-center gap-3">
    <Avatar className="size-9 shrink-0 rounded-lg after:rounded-lg">
      <AvatarFallback className="rounded-lg bg-secondary text-[11px] font-medium">
        {resolveAdminCustomerInitials(customer.name)}
      </AvatarFallback>
    </Avatar>
    <div className="flex h-9 min-w-0 flex-col justify-center gap-1">
      <span className="truncate text-xs leading-none font-medium">{customer.name}</span>
      <span className="truncate text-[10px] leading-none text-muted-foreground">{customer.email}</span>
    </div>
  </div>
)
