import { type JSX } from "react"

export const TotalsRow = ({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>): JSX.Element => (
  <div className="flex justify-between text-[13px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
)
