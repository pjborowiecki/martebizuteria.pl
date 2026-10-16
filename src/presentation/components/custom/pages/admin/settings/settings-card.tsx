import { type JSX, type ReactNode } from "react"

import { Card } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const SettingsCard = ({ action, children, description, title }: Readonly<SettingsCardProps>): JSX.Element => (
  <Card className={ADMIN_CARD_CLASS}>
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 lg:px-5">
      <div className="min-w-0 space-y-1">
        <h2 className="text-[15px] leading-6 font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children !== undefined && <div className="divide-y divide-border/60 border-t border-border/60">{children}</div>}
  </Card>
)

export const SettingsRow = ({ action, children, label }: Readonly<SettingsRowProps>): JSX.Element => (
  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-5" data-slot="settings-row">
    <div className="min-w-0 flex-1 space-y-1">
      <p className="text-[13px] leading-5 font-medium text-foreground">{label}</p>
      {children !== undefined && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
    {action}
  </div>
)

interface SettingsCardProps {
  readonly action?: ReactNode
  readonly children?: ReactNode
  readonly description: ReactNode
  readonly title: string
}

interface SettingsRowProps {
  readonly action?: ReactNode
  readonly children?: ReactNode
  readonly label: string
}
