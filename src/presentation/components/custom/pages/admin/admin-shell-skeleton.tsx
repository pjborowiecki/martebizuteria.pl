import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { ADMIN_LAYOUT_BG_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

export const AdminShellSkeleton = ({ children }: Readonly<AdminShellSkeletonProps>): JSX.Element => (
  <div className={cn("flex min-h-svh w-full", ADMIN_LAYOUT_BG_CLASS)} aria-busy="true" aria-label="Loading">
    <div className="hidden h-svh w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block" aria-hidden />
    <div className="flex min-h-svh min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-sidebar-border bg-sidebar px-6" aria-hidden>
        <Skeleton className="size-8 shrink-0 rounded-md bg-sidebar-accent/80" />
        <Skeleton className="h-4 w-40 max-w-[40%] rounded-md bg-sidebar-accent/80" />
      </header>
      <main className="flex-1 p-8">{children}</main>
    </div>
  </div>
)

export const CollectionsPageSkeleton = (): JSX.Element => (
  <AdminShellSkeleton>
    <div className="space-y-5">
      <div className="space-y-1" aria-hidden>
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from(
          {
            length: STAT_CARD_COUNT,
          },
          (_, index) => (
            <div key={`stat-skeleton-${String(index)}`} className="overflow-hidden rounded-lg border border-border/20 bg-card p-5">
              <p className="text-[13px] text-muted-foreground">
                <span className="invisible">—</span>
              </p>
              <Skeleton className="mt-2 h-8 w-16" />
            </div>
          ),
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-9 w-72 max-w-full" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
        <div className="border-b border-border/60 bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-full max-w-3xl" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from(
            {
              length: TABLE_ROW_COUNT,
            },
            (_, index) => (
              <div key={`row-skeleton-${String(index)}`} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="size-4 shrink-0 rounded-sm" />
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <Skeleton className="h-4 max-w-xs flex-1" />
                <Skeleton className="hidden h-4 w-20 sm:block" />
                <Skeleton className="hidden h-4 w-12 md:block" />
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  </AdminShellSkeleton>
)

const STAT_CARD_COUNT = 4
const TABLE_ROW_COUNT = 6
interface AdminShellSkeletonProps {
  readonly children?: ReactNode
}
