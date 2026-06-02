import { type JSX, type ReactNode } from "react";

import { ArrowLeft, ChevronRight } from "lucide-react";

import { cn } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";
import { SidebarTrigger } from "~/src/components/shadcn/sidebar";

import { LocalizedLink, type LocalizedTo } from "~/src/components/custom/localized-link";
import { ADMIN_LAYOUT_BG_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";

interface AdminHeaderProps {
  readonly actions?: ReactNode;
  readonly backHref?: LocalizedTo;
  readonly breadcrumbs?: readonly { readonly href?: LocalizedTo; readonly label: string }[];
  readonly description?: string;
  readonly tabs?: ReactNode;
  readonly title: ReactNode;
}

const EMPTY_LENGTH = 0;

export function AdminHeader({ actions, backHref, breadcrumbs, description, tabs, title }: Readonly<AdminHeaderProps>): JSX.Element {
  return (
    <div className={cn("sticky top-0 z-20 flex flex-col", ADMIN_LAYOUT_BG_CLASS)}>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-sidebar-border bg-sidebar px-6 text-sidebar-foreground">
        {backHref === undefined ? (
          <SidebarTrigger className="-ml-1 shrink-0 transition-opacity hover:bg-transparent hover:opacity-70" />
        ) : (
          <LocalizedLink
            to={backHref}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            <ArrowLeft className="size-[18px]" strokeWidth={1.5} />
          </LocalizedLink>
        )}

        {backHref === undefined && <Separator orientation="vertical" className="mr-2 h-4 bg-sidebar-border" />}

        <div className="mr-auto flex items-center gap-1.5">
          {breadcrumbs !== undefined && breadcrumbs.length > EMPTY_LENGTH && (
            <nav className="hidden items-center gap-1.5 text-[13px] text-sidebar-foreground/50 sm:flex">
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

          <div className={description === undefined ? "" : "flex flex-col"}>
            {typeof title === "string" ? (
              <h1 className="text-[14px] font-semibold tracking-tight text-sidebar-foreground">{title}</h1>
            ) : (
              <div className="text-[14px] font-semibold tracking-tight text-sidebar-foreground">{title}</div>
            )}
            {description !== undefined && <p className="text-[13px] text-sidebar-foreground/70">{description}</p>}
          </div>
        </div>

        {actions !== undefined && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </header>
      {tabs !== undefined && tabs}
    </div>
  );
}
