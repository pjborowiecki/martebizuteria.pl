import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { Card } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const SettingsCard = ({ action, children, description, title }: Readonly<SettingsCardProps>): JSX.Element => (
  <Card className={cn("@container", ADMIN_CARD_CLASS)}>
    <div className="flex flex-col gap-3 px-4 py-4 lg:px-5 @xl:flex-row @xl:items-start @xl:justify-between @xl:gap-6">
      <div className="min-w-0 space-y-1">
        <h2 className="text-[14px] leading-6 font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
    {children !== undefined && <div className="divide-y divide-border/60 border-t border-border/60">{children}</div>}
  </Card>
)

export const SettingsRow = ({ action, children, label }: Readonly<SettingsRowProps>): JSX.Element => (
  <div
    className="flex flex-col gap-3 px-4 py-4 lg:px-5 @md:flex-row @md:items-center @md:justify-between @md:gap-6"
    data-slot="settings-row"
  >
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
