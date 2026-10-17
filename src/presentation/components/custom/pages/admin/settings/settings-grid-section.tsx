import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { ADMIN_CATALOG_DATAGRID_PAGE_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const SettingsGridSection = ({ children, className, description, title }: Readonly<SettingsGridSectionProps>): JSX.Element => (
  <section className={cn("flex min-h-0 flex-col", className)}>
    <div className={cn(ADMIN_CATALOG_DATAGRID_PAGE_CLASS, "gap-3")}>
      <div className="space-y-0.5">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  </section>
)

interface SettingsGridSectionProps {
  readonly children: ReactNode
  readonly className?: string
  readonly description: string
  readonly title: string
}
