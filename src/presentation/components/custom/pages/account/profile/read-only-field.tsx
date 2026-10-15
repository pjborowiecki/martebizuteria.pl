import { type JSX, type ReactNode } from "react"

export const ReadOnlyField = ({
  action,
  hint,
  label,
  value,
}: Readonly<{
  action?: ReactNode
  hint?: ReactNode
  label: string
  value: string
}>): JSX.Element => (
  <div className="flex items-center gap-4 py-4">
    <div className="min-w-0 flex-1">
      <dl>
        <dt className="flex items-center gap-2 text-[11px] tracking-widest text-muted-foreground uppercase select-none">{label}</dt>
        <dd className="mt-1 min-h-[1.5em] text-[14px] wrap-anywhere text-foreground">{value}</dd>
      </dl>
      {hint}
    </div>
    {action}
  </div>
)
