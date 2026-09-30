import { type JSX } from "react"

import { cn } from "cn"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const NewArrivalsProductCardSkeleton = ({
  className,
}: Readonly<{
  className?: string
}>): JSX.Element => (
  <div className={cn("block", className)} aria-hidden="true">
    <Skeleton className="aspect-4/5 w-full rounded-none" />
    <div className="mt-4 space-y-1.5">
      <Skeleton className="h-5 w-4/5 rounded-none" />
      <Skeleton className="h-3 w-3/5 rounded-none" />
      <Skeleton className="mt-1 h-3 w-1/4 rounded-none" />
    </div>
  </div>
)
