import { type JSX, type ReactNode } from "react"

import { cn } from "cn"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"
import { SidebarTrigger } from "~/src/presentation/components/shadcn/sidebar"

import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { ADMIN_LAYOUT_BG_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const AdminHeader = ({ actions, backHref, breadcrumbs, description, tabs, title }: Readonly<AdminHeaderProps>): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div className={cn("flex shrink-0 flex-col lg:sticky lg:top-0 lg:z-20", ADMIN_LAYOUT_BG_CLASS)}>
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-sidebar-border bg-sidebar px-4 py-2 text-sidebar-foreground sm:min-h-16 sm:gap-x-4 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        {backHref === undefined ? (
          <SidebarTrigger className="-ml-1 shrink-0 transition-opacity hover:bg-transparent hover:opacity-70 pointer-coarse:size-10" />
        ) : (
          <LocalizedLink
            aria-label={t("a11y.back")}
            to={backHref}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground pointer-coarse:size-10"
          >
            <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
          </LocalizedLink>
        )}

        {backHref === undefined && <Separator orientation="vertical" className="mr-2 h-4 bg-sidebar-border data-vertical:self-center" />}

        <div className="mr-auto flex items-center gap-1.5 max-lg:min-w-0 max-lg:flex-auto">
          {breadcrumbs !== undefined && breadcrumbs.length > 0 && (
            <nav className="hidden items-center gap-1.5 text-[13px] text-sidebar-foreground/50 lg:flex">
              {breadcrumbs.map((bc) => (
                <div key={bc.label} className="flex items-center gap-1.5">
                  {bc.href === undefined ? (
                    <span>{bc.label}</span>
                  ) : (
                    <LocalizedLink to={bc.href} className="transition-colors hover:text-sidebar-foreground">
                      {bc.label}
                    </LocalizedLink>
                  )}
                  <ChevronRight className="size-3" strokeWidth={1.5} />
                </div>
              ))}
            </nav>
          )}

          <div className={cn("max-lg:min-w-0", description !== undefined && "flex flex-col")}>
            {typeof title === "string" ? (
              <h1 className="text-[14px] font-semibold tracking-tight text-sidebar-foreground max-lg:truncate">{title}</h1>
            ) : (
              <div className="text-[14px] font-semibold tracking-tight text-sidebar-foreground max-lg:truncate">{title}</div>
            )}
            {description !== undefined && (
              <p className="text-[13px] text-sidebar-foreground/70 max-lg:truncate max-sm:hidden">{description}</p>
            )}
          </div>
        </div>

        {actions !== undefined && (
          <div className="ml-auto flex flex-wrap items-center gap-2 max-lg:justify-end lg:flex-nowrap">{actions}</div>
        )}
      </header>
      {tabs !== undefined && tabs}
    </div>
  )
}

interface AdminHeaderProps {
  readonly actions?: ReactNode
  readonly backHref?: LocalizedTo
  readonly breadcrumbs?: readonly {
    readonly href?: LocalizedTo
    readonly label: string
  }[]
  readonly description?: string
  readonly tabs?: ReactNode
  readonly title: ReactNode
}
