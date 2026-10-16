import { type JSX, type ReactNode } from "react"

import { cn } from "cn"
import { Mail, TriangleAlert } from "lucide-react"

const NOTE_ICONS = { email: Mail, warning: TriangleAlert } as const

export const AdminDialogNote = ({ children, kind }: Readonly<AdminDialogNoteProps>): JSX.Element => {
  const Icon = NOTE_ICONS[kind]

  return (
    <span
      className={cn(
        "mt-3 flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] leading-snug text-foreground",
        kind === "warning" ? "border-amber-500/40 bg-amber-500/10" : "border-border/70 bg-muted/50",
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-px size-4 shrink-0", kind === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}
        strokeWidth={1.75}
      />
      <span>{children}</span>
    </span>
  )
}

interface AdminDialogNoteProps {
  readonly children: ReactNode
  readonly kind: keyof typeof NOTE_ICONS
}
