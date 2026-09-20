import { type JSX } from "react"

import { Avatar, AvatarFallback } from "~/src/presentation/components/shadcn/avatar"
export const AuditActorCell = ({ initials, name, roleColor }: AuditActorCellProps): JSX.Element => (
  <div className="flex h-9 min-w-0 items-center gap-1.5">
    <Avatar className="size-4 rounded after:rounded">
      <AvatarFallback className={`rounded text-[6px] font-medium ${roleColor}`}>{initials}</AvatarFallback>
    </Avatar>
    <span className="truncate text-[11px] text-muted-foreground">{name}</span>
  </div>
)

interface AuditActorCellProps {
  readonly initials: string
  readonly name: string
  readonly roleColor: string
}
