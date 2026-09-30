import { type JSX } from "react"

import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"

export const ReadOnlyField = ({
  label,
  value,
}: Readonly<{
  label: string
  value: string
}>): JSX.Element => (
  <div className="flex items-center gap-4 py-4">
    <div className="min-w-0 flex-1">
      <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{label}</Label>
      <Input
        variant="account-inline"
        type="email"
        value={value}
        readOnly
        className="pointer-events-none mt-1 block cursor-default text-foreground"
      />
    </div>
  </div>
)
