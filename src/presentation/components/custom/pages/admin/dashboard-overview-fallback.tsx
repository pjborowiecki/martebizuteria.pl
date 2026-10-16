import { type JSX } from "react"

import { cn } from "cn"

import { Card, CardContent, CardHeader } from "~/src/presentation/components/shadcn/card"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import {
  ADMIN_CARD_CONTENT_CLASS,
  ADMIN_DASHBOARD_CONTENT_CARD_CLASS,
  ADMIN_DASHBOARD_STAT_GRID_CLASS,
} from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"

const StatCardSkeleton = (): JSX.Element => (
  <Card className={ADMIN_DASHBOARD_CONTENT_CARD_CLASS}>
    <CardContent className={cn("space-y-3", ADMIN_CARD_CONTENT_CLASS)}>
      <Skeleton className="h-4 w-28 max-w-full" />
      <Skeleton className="h-8 w-32 max-w-full" />
      <Skeleton className="h-5 w-24 max-w-full" />
    </CardContent>
  </Card>
)

export const DashboardOverviewFallback = (): JSX.Element => (
  <div className="space-y-4 lg:space-y-6">
    <div className={ADMIN_DASHBOARD_STAT_GRID_CLASS}>
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>

    <div className="grid gap-4 lg:gap-5 xl:grid-cols-4">
      <Card className="border-border/40 shadow-none xl:col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
      <div className="space-y-4 lg:space-y-5">
        <Card className={ADMIN_DASHBOARD_CONTENT_CARD_CLASS}>
          <CardContent className={cn("space-y-2", ADMIN_CARD_CONTENT_CLASS)}>
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-8 w-28" />
          </CardContent>
        </Card>
        <Card className="border-border/40 shadow-none">
          <CardContent>
            <Skeleton className="h-[148px] w-full" />
          </CardContent>
        </Card>
        <Card className={ADMIN_DASHBOARD_CONTENT_CARD_CLASS}>
          <CardContent className={cn("space-y-2", ADMIN_CARD_CONTENT_CLASS)}>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-36" />
          </CardContent>
        </Card>
      </div>
    </div>

    <div className="grid gap-4 lg:gap-5 xl:grid-cols-4">
      <Card className="border-border/40 shadow-none xl:col-span-3">
        <CardContent className="p-6">
          <Skeleton className="h-[220px] w-full" />
        </CardContent>
      </Card>
      <Card className="border-border/40 shadow-none">
        <CardContent className="space-y-4 p-5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  </div>
)
