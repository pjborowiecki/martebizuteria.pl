import { type JSX, type ReactNode, useId } from "react"

import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

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
}>): JSX.Element => {
  const fieldId = useId()

  return (
    <div className="flex items-center gap-4 py-4">
      <div className="min-w-0 flex-1">
        <Label className="text-[11px] tracking-widest text-muted-foreground uppercase" htmlFor={fieldId}>
          {label}
        </Label>
        <Input
          className="pointer-events-none mt-1 block cursor-default text-foreground"
          id={fieldId}
          readOnly
          type="email"
          value={value}
          variant="account-inline"
        />
        {hint}
      </div>
      {action}
    </div>
  )
}
