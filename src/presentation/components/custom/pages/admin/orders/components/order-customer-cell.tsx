import { type JSX } from "react"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"

export const OrderCustomerCell = ({ customer, customerId, email, initials }: Readonly<OrderCustomerCellProps>): JSX.Element => (
  <div className="flex items-center gap-3">
    <Avatar size="lg" className="rounded-md after:rounded-md">
      <AvatarFallback className="rounded-md bg-secondary text-[13px] font-medium">{initials}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <p className="truncate text-sm font-medium">{customer}</p>
      <p className="truncate text-xs text-muted-foreground">
        {customerId === "" ? (
          email
        ) : (
          <>
            <span className="font-mono">{customerId}</span>
            <span className="mx-1.5 text-muted-foreground/30">·</span>
            {email}
          </>
        )}
      </p>
    </div>
  </div>
)

interface OrderCustomerCellProps {
  readonly customer: string
  readonly customerId: string
  readonly email: string
  readonly initials: string
}
