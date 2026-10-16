import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { LocalizedLink, type LocalizedTo } from "~/src/presentation/components/custom/localized-link"
import { ADMIN_LAYOUT_BG_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

export const AdminHeaderTabs = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <div
    className={cn(
      "scrollbar-hide flex h-12 w-full items-center gap-6 overflow-x-auto border-b border-border/40 px-4 sm:px-6",
      ADMIN_LAYOUT_BG_CLASS,
    )}
  >
    {children}
  </div>
)

export const AdminHeaderTabLink = ({ href, isActive, label }: Readonly<AdminHeaderTabLinkProps>): JSX.Element => (
  <LocalizedLink
    to={href}
    className={cn(
      "relative flex h-full items-center text-[13px] whitespace-nowrap transition-colors",
      isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
    )}
  >
    {label}
    {isActive && <span className="absolute right-0 bottom-0 left-0 h-[2px] rounded-t-full bg-foreground" />}
  </LocalizedLink>
)

interface AdminHeaderTabLinkProps {
  readonly href: LocalizedTo
  readonly isActive: boolean
  readonly label: string
}
