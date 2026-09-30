import { type JSX } from "react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

export const CheckoutFormSkeleton = (): JSX.Element => (
  <div className="space-y-6">
    <Skeleton className="h-12 w-2/3 rounded-none" />
    <Skeleton className="h-32 w-full rounded-none" />
    <Skeleton className="h-32 w-full rounded-none" />
  </div>
)
